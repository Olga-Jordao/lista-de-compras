import { db } from './db'
import { conteudoEmKgOuL, subidaDePreco, type Subida } from './precos'
import { arredondar } from './numeros'
import type { Artigo, Base, Compra, LinhaCompra, Lista, NomeTabela, Orcamento, Produto, Seccao, Unidade } from './tipos'

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
export async function acrescentarArtigo(
  listaId: string,
  produto: Produto,
  pedido?: { quantidade: number; unidade: Unidade },
): Promise<Artigo> {
  const daLista = (await db.artigos.where('listaId').equals(listaId).toArray()).filter((a) => !a.apagado)
  const existente = daLista.find((a) => a.produtoId === produto.id)
  if (existente) return existente
  const ordem = Math.max(-1, ...daLista.map((a) => a.ordem)) + 1
  const a = await gravar<Artigo>('artigos', {
    id: novoId(),
    listaId,
    produtoId: produto.id,
    quantidade: pedido?.quantidade ?? 1,
    unidade: pedido?.unidade ?? produto.unidade,
    naoCompradoDesde: null,
    fechosSemComprar: 0,
    precoUnitario: null,
    totalManual: null,
    pesoTotal: null,
    precoKg: null,
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

/** "Repetir a lista": põe vários produtos na lista de uma vez, com a quantidade escolhida. */
export async function acrescentarVarios(
  listaId: string,
  itens: { produtoId: string; quantidade: number; unidade: Unidade }[],
): Promise<number> {
  let postos = 0
  for (const item of itens) {
    const produto = await db.produtos.get(item.produtoId)
    if (!produto || produto.apagado) continue
    const daLista = (await db.artigos.where('listaId').equals(listaId).toArray()).filter((a) => !a.apagado)
    if (daLista.some((a) => a.produtoId === produto.id)) continue
    await acrescentarArtigo(listaId, produto, { quantidade: item.quantidade, unidade: item.unidade })
    postos++
  }
  return postos
}

/** Apaga uma compra do histórico (deixa de contar para o orçamento). */
export async function apagarCompra(id: string): Promise<void> {
  await alterar<Compra>('compras', id, { apagado: true })
  avisar()
}

// ---------- Orçamento ----------

export const ID_ORCAMENTO = 'orcamento'

export async function guardarOrcamento(mudancas: Partial<Orcamento>): Promise<void> {
  const atual = await db.definicoes.get(ID_ORCAMENTO)
  await gravar<Orcamento>('definicoes', {
    id: ID_ORCAMENTO,
    nome: 'Alimentação e casa',
    valor: null,
    diaInicio: 1,
    conviteDispensado: false,
    atualizadoEm: 0,
    apagado: false,
    sujo: 1,
    ...atual,
    ...mudancas,
  })
  avisar()
}

export async function alterarArtigo(id: string, mudancas: Partial<Artigo>): Promise<void> {
  await alterar<Artigo>('artigos', id, mudancas)
  avisar()
}

/**
 * Mete ou tira do carrinho. Ao meter sem nada escrito um produto de preço fixo por
 * unidade (sem peso), aceita o último preço. Ao peso não: fica como estimativa
 * até se escrever o que diz a etiqueta.
 */
export async function alternarCarrinho(artigo: Artigo, produto: Produto | undefined): Promise<void> {
  const mudancas: Partial<Artigo> = { noCarrinho: !artigo.noCarrinho }
  if (!artigo.noCarrinho) {
    mudancas.porComprar = false
    const nadaEscrito =
      artigo.precoUnitario == null && artigo.totalManual == null && (artigo.precoKg ?? null) == null && !artigo.pesoTotal
    const precoFixo = (artigo.unidade === 'un' || artigo.unidade === 'dz') && !produto?.conteudo
    if (nadaEscrito && precoFixo && produto?.ultimoPreco != null && artigo.unidade === produto.unidade) {
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

/** Total da linha, contando com a estimativa quando ainda não há valores da etiqueta. */
export function totalArtigo(artigo: Artigo, produto: Produto | undefined): number {
  return contasArtigo(artigo, produto).total
}

type PesoKgL = { valor: number; unidade: 'kg' | 'L' }

export interface ContasArtigo {
  /** Há total (escrito, calculado ou estimado)? */
  temPreco: boolean
  /** O total é uma estimativa da última compra, não o que diz a etiqueta. */
  sugerido: boolean
  total: number
  /** Peso de tudo, em kg ou L: o da balança, o pedido (ao kg) ou quantidade × peso de cada um. */
  peso: PesoKgL | null
  /** O peso vem do peso de cada um guardado no produto (embalagem ou média da última vez). */
  pesoDeCadaUm: boolean
  /** Preço por unidade pedida (por un ou dz); nos pedidos ao kg ou ao L é igual ao preço ao quilo. */
  unitario: number | null
  /** Preço ao kg ou ao L. */
  aoQuilo: PesoKgL | null
  subida: Subida | null
  /** Os valores escritos não batem certo entre si: quanto devia dar o total. */
  incoerente: { totalEsperado: number } | null
}

export type CamposArtigo = Pick<Artigo, 'quantidade' | 'unidade' | 'precoUnitario' | 'totalManual' | 'pesoTotal' | 'precoKg'>

/**
 * Todas as contas de um artigo, iguais na lista, no painel e no fecho da compra.
 * Na loja escreve-se o que a etiqueta diz (peso, preço/kg, preço por unidade,
 * total), normalmente dois deles; o resto calcula-se. Sem nada escrito, estima-se
 * com o preço ao quilo e o peso médio da última compra.
 */
export function contasArtigo(artigo: CamposArtigo, produto: Produto | undefined): ContasArtigo {
  const q = artigo.quantidade
  const u = artigo.unidade
  const aoPesoPedido = u === 'kg' || u === 'L'
  const pesoEscrito = conteudoEmKgOuL(artigo.pesoTotal ?? null)
  const cadaUm = u === 'un' ? conteudoEmKgOuL(produto?.conteudo ?? null) : null
  const precoKg = artigo.precoKg ?? null
  const precoUn = artigo.precoUnitario
  const totalEscrito = artigo.totalManual

  let peso: PesoKgL | null =
    pesoEscrito ??
    (aoPesoPedido && q > 0 ? { valor: q, unidade: u } : cadaUm && q > 0 ? { valor: cadaUm.valor * q, unidade: cadaUm.unidade } : null)
  const pesoDeCadaUm = !pesoEscrito && !aoPesoPedido && peso != null

  // Total: o escrito; senão peso × preço/kg; senão quantidade × preço por unidade.
  let total: number | null = null
  if (totalEscrito != null) total = totalEscrito
  else if (precoKg != null && peso) total = precoKg * peso.valor
  else if (precoUn != null) total = q * precoUn
  else if (precoKg != null && aoPesoPedido) total = q * precoKg
  const escrito = total != null

  // Etiqueta com preço/kg e total mas sem peso: o peso real é total ÷ preço/kg.
  if (!pesoEscrito && totalEscrito != null && precoKg != null && precoKg > 0) {
    peso = { valor: totalEscrito / precoKg, unidade: peso?.unidade ?? (u === 'L' ? 'L' : 'kg') }
  }

  // Sem nada escrito: estimativa a partir da última compra.
  if (total == null && produto) {
    const ref = produto.ultimoPrecoRef
    if (ref != null && peso) total = ref * peso.valor
    else if (produto.unidade === u && produto.ultimoPreco != null) total = q * produto.ultimoPreco
  }
  const totalFinal = total == null ? null : arredondar(total)

  let aoQuilo: PesoKgL | null = null
  if (precoKg != null) aoQuilo = { valor: precoKg, unidade: peso?.unidade ?? (u === 'L' ? 'L' : 'kg') }
  else if (totalFinal != null && peso && peso.valor > 0) aoQuilo = { valor: totalFinal / peso.valor, unidade: peso.unidade }

  // Ao kg ou ao L, o preço "por unidade pedida" é o próprio preço ao quilo.
  const unitario = aoPesoPedido ? (aoQuilo?.valor ?? null) : totalFinal != null && q > 0 ? totalFinal / q : null

  // Coerência: quando se escreveram valores a mais, confirmam-se uns aos outros.
  let incoerente: ContasArtigo['incoerente'] = null
  if (totalEscrito != null) {
    const esperados: number[] = []
    if (precoKg != null && pesoEscrito) esperados.push(precoKg * pesoEscrito.valor)
    if (precoUn != null && !aoPesoPedido) esperados.push(q * precoUn)
    const longe = esperados.find((e) => Math.abs(e - totalEscrito) > Math.max(0.05, totalEscrito * 0.02))
    if (longe != null) incoerente = { totalEsperado: arredondar(longe) }
  }

  const subida = !escrito || !produto ? null : subidaDePreco(produto, unitario, u, aoQuilo)
  return {
    temPreco: totalFinal != null,
    sugerido: !escrito && totalFinal != null,
    total: totalFinal ?? 0,
    peso,
    pesoDeCadaUm,
    unitario,
    aoQuilo,
    subida,
    incoerente,
  }
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
      const { unitario: efetivo, total, aoQuilo: ref, sugerido } = contasArtigo(a, produto)
      linhas.push({
        produtoId: produto.id,
        nome: produto.nome,
        seccaoId: produto.seccaoId,
        seccaoNome: seccoes.get(produto.seccaoId)?.nome ?? '',
        quantidade: a.quantidade,
        unidade: a.unidade,
        precoUnitario: efetivo == null ? null : arredondar(efetivo, 4),
        total,
        precoRef: ref ? arredondar(ref.valor, 4) : null,
        refUnidade: ref?.unidade ?? null,
        lojaId: null,
      })
      // O que se pagou passa a ser a referência do produto (as estimativas não contam).
      if (sugerido) continue
      const mudancas: Partial<Produto> = { ultimoPrecoData: agora }
      if (efetivo != null && a.unidade === produto.unidade) mudancas.ultimoPreco = arredondar(efetivo, 4)
      if (ref) mudancas.ultimoPrecoRef = arredondar(ref.valor, 4)
      // Pedido à unidade e pesado na balança: fica a média de cada um (6 espetadas,
      // 1,730 kg → 288 g), para estimar da próxima vez.
      const pesoBalanca = conteudoEmKgOuL(a.pesoTotal ?? null)
      if (a.unidade === 'un' && pesoBalanca && a.quantidade > 0) {
        const g = Math.round((pesoBalanca.valor / a.quantidade) * 1000)
        mudancas.conteudo = { quantidade: g, unidade: pesoBalanca.unidade === 'L' ? 'ml' : 'g' }
      }
      if (mudancas.ultimoPreco != null || mudancas.ultimoPrecoRef != null) {
        await gravar<Produto>('produtos', { ...produto, ...mudancas })
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

    // O que se comprou sai da lista (fica guardado na compra); o que não se comprou
    // fica, e conta quantas vezes se fechou sem o comprar.
    for (const a of artigos) {
      if (a.noCarrinho) {
        await gravar<Artigo>('artigos', { ...a, apagado: true })
      } else {
        await gravar<Artigo>('artigos', {
          ...a,
          naoCompradoDesde: a.naoCompradoDesde ?? agora,
          fechosSemComprar: (a.fechosSemComprar ?? 0) + 1,
        })
      }
    }
  })
  avisar()
  return compra
}
