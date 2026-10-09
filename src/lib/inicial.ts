import type { BaseDados } from './db'
import type { Lista, Seccao } from './tipos'

// Secções e listas com que a aplicação começa. Os ids são fixos e a data de
// alteração é 0, para que o computador e o telemóvel criem exatamente os mesmos
// registos e qualquer alteração feita num deles ganhe sempre a estes.
export const SECCOES_INICIAIS = [
  'Mercearia',
  'Laticínios e ovos',
  'Congelados',
  'Bebidas',
  'Talho',
  'Charcutaria',
  'Peixaria',
  'Fruta e legumes',
  'Padaria',
  'Produtos de limpeza',
  'Higiene pessoal',
  'Casa e diversos',
  'Animais',
]

const LISTAS_INICIAIS = [
  { id: 'lista-mensal', nome: 'Mensal' },
  { id: 'lista-semanal', nome: 'Semanal de frescos' },
]

export function idSeccaoInicial(nome: string): string {
  return 'seccao-' + nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]+/g, '-')
}

export async function prepararDadosIniciais(db: BaseDados): Promise<void> {
  const feito = await db.meta.get('inicial')
  if (feito) return
  await db.transaction('rw', db.seccoes, db.listas, db.meta, async () => {
    const seccoes: Seccao[] = SECCOES_INICIAIS.map((nome, i) => ({
      id: idSeccaoInicial(nome),
      nome,
      ordem: i,
      atualizadoEm: 0,
      apagado: false,
      sujo: 1,
    }))
    const listas: Lista[] = LISTAS_INICIAIS.map((l, i) => ({
      ...l,
      ordem: i,
      atualizadoEm: 0,
      apagado: false,
      sujo: 1,
    }))
    // Só acrescenta o que ainda não existe (pode já ter vindo do Supabase).
    for (const s of seccoes) if (!(await db.seccoes.get(s.id))) await db.seccoes.put(s)
    for (const l of listas) if (!(await db.listas.get(l.id))) await db.listas.put(l)
    await db.meta.put({ chave: 'inicial', valor: true })
  })
}
