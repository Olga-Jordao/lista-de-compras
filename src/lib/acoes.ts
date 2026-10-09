import { db } from './db'
import { precoReferencia, precoUnitarioEfetivo, totalLinha } from './precos'
import { arredondar } from './numeros'
import type { Artigo, Base, Compra, LinhaCompra, Lista, NomeTabela, Produto, Seccao, Unidade } from './tipos'

// Todas as alterações passam por aqui: marcam o registo como "sujo" (por enviar) e
// avisam a sincronização.

export const alteracoes = new EventTarget()

function novoId(): string {
  return crypto.randomUUID()
}

function carimbo(anterior?: number): number {
  return Math.max(Date.now(), (anterior ?? 0) + 1)
}

function avisar() {
  alteracoes.dispatchEvent(new Event('alterado'))
}

async function gravar<T extends Base>(tabela: NomeTabela, registo: T): Promise<T> {
  const t = db.tabela(tabela)
  const atual = (await t.get(registo.id)) as T | undefined
  const final = { ...registo, atualizadoEm: carimbo(atual?.atualizadoEm), sujo: 1 as const }
  await t.put(final)
  return final
}

async function alterar<T extends Base>(tabela: NomeTabela, id: string, mudancas: Partial<T>): Promise<void> {
  const atual = (await db.tabela(tabela).get(id)) as T | undefined
  if (!atual) return
  await gravar(tabela, { ...atual, ...mudancas })
}

// ---------- Produtos ----------

export async function criarProduto(nome: string, seccaoId: string, unidade: Unidade): Promise<Produto> {
  const p = await gravar<Produto>('produtos', {
    id: novoId(),
    nome: nome.trim(),
    seccaoId,
    unidade,
    conteudo: null,
    ultimoPreco: null,
    ultimoPrecoRef: null,
    ultimoPrecoData: null,
    ultimaLojaId: null,
    atualizadoEm: 0,
    apagado: false,
    sujo: 1,
  })
  avisar()
  return p
}

export async function alterarProduto(id: string, mudancas: Partial<Produto>): Promise<void> {
  await alterar<Produto>('produtos', id, mudancas)
  avisar()
}

/** Apaga o produto do catálogo e tira-o de todas as listas. */
export async function apagarProduto(id: string): Promise<void> {
  await db.transaction('rw', db.produtos, db.artigos, async () => {
    await alterar<Produto>('produtos', id, { apagado: true })
    const artigos = await db.artigos.where('produtoId').equals(id).toArray()
    for (const a of artigos) if (!a.apagado) await alterar<Artigo>('artigos', a.id, { apagado: true })
  })
  avisar()
}

// ---------- Secções ----------

export async function reordenarSeccoes(idsPorOrdem: string[]): Promise<void> {
  await db.transaction('rw', db.seccoes, async () => {
    for (const [i, id] of idsPorOrdem.entries()) {
      const s = await db.seccoes.get(id)
      if (s && s.ordem !== i) await gravar<Seccao>('seccoes', { ...s, ordem: i })
    }
  })
  avisar()
}

// ---------- Listas ----------

export async function criarLista(nome: string): Promise<Lista> {
  const todas = await db.listas.toArray()
  const ordem = Math.max(-1, ...todas.map((l) => l.ordem)) + 1
  const l = await gravar<Lista>('listas', {
    id: novoId(),
    nome: nome.trim(),
    ordem,
    atualizadoEm: 0,
    apagado: false,
    sujo: 1,
  })
  avisar()
  return l
}

export async function renomearLista(id: string, nome: string): Promise<void> {
  await alterar<Lista>('listas', id, { nome: nome.trim() })
  avisar()
}

export async function apagarLista(id: string): Promise<void> {
  await db.transaction('rw', db.listas, db.artigos, async () => {
    await alterar<Lista>('listas', id, { apagado: true })
    const artigos = await db.artigos.where('listaId').equals(id).toArray()
    for (const a of artigos) if (!a.apagado) await alterar<Artigo>('artigos', a.id, { apagado: true })
  })
  avisar()
}

// ---------- Artigos ----------

/** Põe um produto na lista. Se já lá estiver, devolve o artigo que existe. */
export async function acrescentarArtigo(listaId: string, produto: Produto): Promise<Artigo> {
  const daLista = (await db.artigos.where('listaId').equals(listaId).toArray()).filter((a) => !a.apagado)
  const existente = daLista.find((a) => a.produtoId === produto.id)
  if (existente) return existente
  const ordem = Math.max(-1, ...daLista.map((a) => a.ordem)) + 1
  const a = await gravar<Artigo>('artigos', {
    id: novoId(),
    listaId,
    produtoId: produto.id,
    quantidade: 1,
    unidade: produto.unidade,
    precoUnitario: null,
    totalManual: null,
    noCarrinho: false,
    fixo: true,
    porComprar: false,
    origem: 'manual',
    refeicaoId: null,
    ordem,
    atualizadoEm: 0,
    apagado: false,
    sujo: 1,
  })
  avisar()
  return a
}

export async function alterarArtigo(id: string, mudancas: Partial<Artigo>): Promise<void> {
  await alterar<Artigo>('artigos', id, mudancas)
  avisar()
}

/**
 * Mete ou tira do carrinho. Ao meter sem preço escrito, aceita o último preço
 * como sugestão, para o total do carrinho bater certo.
 */
export async function alternarCarrinho(artigo: Artigo, produto: Produto | undefined): Promise<void> {
  const mudancas: Partial<Artigo> = { noCarrinho: !artigo.noCarrinho }
  if (!artigo.noCarrinho) {
    mudancas.porComprar = false
    if (artigo.precoUnitario == null && artigo.totalManual == null && produto?.ultimoPreco != null && artigo.unidade === produto.unidade) {
      mudancas.precoUnitario = produto.ultimoPreco
    }
  }
  await alterarArtigo(artigo.id, mudancas)
}

export async function apagarArtigo(id: string): Promise<void> {
  await alterar<Artigo>('artigos', id, { apagado: true })
  avisar()
}

export async function reordenarArtigos(idsPorOrdem: string[]): Promise<void> {
  await db.transaction('rw', db.artigos, async () => {
    for (const [i, id] of idsPorOrdem.entries()) {
      const a = await db.artigos.get(id)
      if (a && a.ordem !== i) await gravar<Artigo>('artigos', { ...a, ordem: i })
    }
  })
  avisar()
}

// ---------- Fechar a compra ----------

/** Preço a usar para um artigo: o escrito ou, se não houver, a sugestão do último preço. */
export function precoParaArtigo(artigo: Artigo, produto: Produto | undefined): { preco: number | null; sugerido: boolean } {
  if (artigo.precoUnitario != null || artigo.totalManual != null) {
    return { preco: artigo.precoUnitario, sugerido: false }
  }
  if (produto?.ultimoPreco != null && artigo.unidade === produto.unidade) {
    return { preco: produto.ultimoPreco, sugerido: true }
  }
  return { preco: null, sugerido: false }
}

/** Total da linha contando com a sugestão de preço. */
export function totalArtigo(artigo: Artigo, produto: Produto | undefined): number {
  const { preco } = precoParaArtigo(artigo, produto)
  return totalLinha({ quantidade: artigo.quantidade, precoUnitario: preco, totalManual: artigo.totalManual })
}

export interface DadosFecho {
  listaId: string
  modo: 'loja' | 'online'
  totalPago: number | null
  motivoDesconto: string | null
}

export async function fecharCompra(dados: DadosFecho): Promise<Compra | null> {
  let compra: Compra | null = null
  await db.transaction('rw', [db.listas, db.artigos, db.produtos, db.seccoes, db.compras], async () => {
    const lista = await db.listas.get(dados.listaId)
    if (!lista) return
    const artigos = (await db.artigos.where('listaId').equals(dados.listaId).toArray()).filter((a) => !a.apagado)
    const comprados = artigos.filter((a) => a.noCarrinho)
    if (comprados.length === 0) return

    const produtos = new Map((await db.produtos.toArray()).map((p) => [p.id, p]))
    const seccoes = new Map((await db.seccoes.toArray()).map((s) => [s.id, s]))
    const agora = new Date().toISOString()

    const linhas: LinhaCompra[] = []
    for (const a of comprados) {
      const produto = produtos.get(a.produtoId)
      if (!produto) continue
      const { preco } = precoParaArtigo(a, produto)
      const efetivo = precoUnitarioEfetivo({ quantidade: a.quantidade, precoUnitario: preco, totalManual: a.totalManual })
      const ref = precoReferencia(efetivo, a.unidade, produto.conteudo)
      linhas.push({
        produtoId: produto.id,
        nome: produto.nome,
        seccaoId: produto.seccaoId,
        seccaoNome: seccoes.get(produto.seccaoId)?.nome ?? '',
        quantidade: a.quantidade,
        unidade: a.unidade,
        precoUnitario: efetivo == null ? null : arredondar(efetivo, 4),
        total: totalLinha({ quantidade: a.quantidade, precoUnitario: preco, totalManual: a.totalManual }),
        precoRef: ref ? arredondar(ref.valor, 4) : null,
        refUnidade: ref?.unidade ?? null,
        lojaId: null,
      })
      // O preço pago passa a ser o "último preço" do produto.
      if (efetivo != null && a.unidade === produto.unidade) {
        await gravar<Produto>('produtos', {
          ...produto,
          ultimoPreco: arredondar(efetivo, 4),
          ultimoPrecoRef: ref ? arredondar(ref.valor, 4) : null,
          ultimoPrecoData: agora,
        })
      }
    }

    const totalCarrinho = arredondar(linhas.reduce((s, l) => s + l.total, 0))
    compra = await gravar<Compra>('compras', {
      id: novoId(),
      listaId: lista.id,
      listaNome: lista.nome,
      data: agora,
      modo: dados.modo,
      totalCarrinho,
      totalPago: dados.totalPago,
      motivoDesconto: dados.motivoDesconto,
      linhas,
      atualizadoEm: 0,
      apagado: false,
      sujo: 1,
    })

    for (const a of artigos) {
      if (a.noCarrinho && !a.fixo) {
        await gravar<Artigo>('artigos', { ...a, apagado: true })
      } else if (a.noCarrinho) {
        await gravar<Artigo>('artigos', { ...a, noCarrinho: false, porComprar: false, precoUnitario: null, totalManual: null })
      } else {
        await gravar<Artigo>('artigos', { ...a, porComprar: true })
      }
    }
  })
  avisar()
  return compra
}
