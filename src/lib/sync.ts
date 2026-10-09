import { alteracoes } from './acoes'
import { db } from './db'
import { supabase } from './supabase'
import { TABELAS, type Base, type NomeTabela } from './tipos'

// Sincronização com o Supabase. A aplicação trabalha sempre com os dados do
// aparelho; daqui a pouco, quando houver rede e sessão iniciada, envia o que mudou
// cá e traz o que mudou no outro aparelho. Ganha sempre a alteração mais recente.

export type EstadoSync =
  | { tipo: 'sem-sessao' }
  | { tipo: 'sem-rede' }
  | { tipo: 'a-sincronizar' }
  | { tipo: 'ok'; quando: number }
  | { tipo: 'erro'; mensagem: string }

let estado: EstadoSync = { tipo: 'sem-sessao' }
const ouvintes = new Set<() => void>()

export function estadoSync(): EstadoSync {
  return estado
}

export function ouvirSync(f: () => void): () => void {
  ouvintes.add(f)
  return () => ouvintes.delete(f)
}

function mudarEstado(novo: EstadoSync) {
  estado = novo
  ouvintes.forEach((f) => f())
}

interface LinhaRemota {
  id: string
  tabela: string
  dados: Record<string, unknown>
  atualizado_em: number
  apagado: boolean
  servidor_em: string
}

const TAMANHO_LOTE = 500

async function enviar(userId: string): Promise<void> {
  for (const nome of TABELAS) {
    const t = db.tabela(nome)
    const sujos = (await t.where('sujo').equals(1).toArray()) as Base[]
    for (let i = 0; i < sujos.length; i += TAMANHO_LOTE) {
      const lote = sujos.slice(i, i + TAMANHO_LOTE)
      const linhas = lote.map(({ sujo: _s, ...dados }) => ({
        user_id: userId,
        id: dados.id,
        tabela: nome,
        dados,
        atualizado_em: dados.atualizadoEm,
        apagado: dados.apagado,
      }))
      const { error } = await supabase.from('registos').upsert(linhas, { onConflict: 'user_id,id' })
      if (error) throw new Error(error.message)
      // Só limpa a marca se o registo não voltou a mudar entretanto.
      await db.transaction('rw', t, async () => {
        for (const r of lote) {
          const atual = (await t.get(r.id)) as Base | undefined
          if (atual && atual.atualizadoEm === r.atualizadoEm) await t.update(r.id, { sujo: 0 })
        }
      })
    }
  }
}

async function receber(): Promise<void> {
  const cursor = (await db.meta.get('cursor'))?.valor as string | undefined
  // Volta 5 segundos atrás, por segurança: aplicar o mesmo registo duas vezes não faz mal.
  let desde = cursor ? new Date(Date.parse(cursor) - 5000).toISOString() : '1970-01-01T00:00:00Z'
  let maisRecente = cursor
  for (;;) {
    const { data, error } = await supabase
      .from('registos')
      .select('id, tabela, dados, atualizado_em, apagado, servidor_em')
      .gt('servidor_em', desde)
      .order('servidor_em', { ascending: true })
      .limit(1000)
    if (error) throw new Error(error.message)
    const linhas = (data ?? []) as LinhaRemota[]
    await aplicar(linhas)
    if (linhas.length > 0) {
      desde = linhas[linhas.length - 1].servidor_em
      maisRecente = desde
    }
    if (linhas.length < 1000) break
  }
  if (maisRecente) await db.meta.put({ chave: 'cursor', valor: maisRecente })
}

export async function aplicar(linhas: LinhaRemota[]): Promise<void> {
  const porTabela = new Map<NomeTabela, LinhaRemota[]>()
  for (const l of linhas) {
    if (!TABELAS.includes(l.tabela as NomeTabela)) continue
    const nome = l.tabela as NomeTabela
    porTabela.set(nome, [...(porTabela.get(nome) ?? []), l])
  }
  for (const [nome, doTipo] of porTabela) {
    const t = db.tabela(nome)
    await db.transaction('rw', t, async () => {
      for (const r of doTipo) {
        const local = (await t.get(r.id)) as Base | undefined
        const remotoGanha =
          !local ||
          r.atualizado_em > local.atualizadoEm ||
          (r.atualizado_em === local.atualizadoEm && local.sujo === 0)
        if (remotoGanha) {
          await t.put({ ...r.dados, id: r.id, atualizadoEm: r.atualizado_em, apagado: r.apagado, sujo: 0 })
        }
      }
    })
  }
}

let aCorrer = false
let repetir = false

export async function sincronizar(): Promise<void> {
  if (aCorrer) {
    repetir = true
    return
  }
  const { data } = await supabase.auth.getSession()
  const sessao = data.session
  if (!sessao) return mudarEstado({ tipo: 'sem-sessao' })
  if (!navigator.onLine) return mudarEstado({ tipo: 'sem-rede' })
  aCorrer = true
  mudarEstado({ tipo: 'a-sincronizar' })
  try {
    await enviar(sessao.user.id)
    await receber()
    mudarEstado({ tipo: 'ok', quando: Date.now() })
  } catch (e) {
    mudarEstado(navigator.onLine ? { tipo: 'erro', mensagem: String((e as Error).message ?? e) } : { tipo: 'sem-rede' })
  } finally {
    aCorrer = false
    if (repetir) {
      repetir = false
      void sincronizar()
    }
  }
}

/** Liga a sincronização automática: ao abrir, ao voltar a rede, ao mudar algo e de 30 em 30 s. */
export function iniciarSync(): void {
  let espera: ReturnType<typeof setTimeout> | undefined
  const emBreve = () => {
    clearTimeout(espera)
    espera = setTimeout(() => void sincronizar(), 1500)
  }
  alteracoes.addEventListener('alterado', emBreve)
  window.addEventListener('online', () => void sincronizar())
  window.addEventListener('offline', () => mudarEstado({ tipo: 'sem-rede' }))
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void sincronizar()
  })
  setInterval(() => {
    if (document.visibilityState === 'visible') void sincronizar()
  }, 30_000)
  supabase.auth.onAuthStateChange((evento) => {
    // Fora do próprio aviso, como pede o Supabase, para não bloquear a sessão.
    if (evento === 'SIGNED_IN') setTimeout(() => void sincronizar(), 0)
    if (evento === 'SIGNED_OUT') mudarEstado({ tipo: 'sem-sessao' })
  })
  void sincronizar()
}
