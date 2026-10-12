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

// ---------- Corrigir compras fechadas ----------

export interface ValoresLinha {
  quantidade: number
  /** Peso ou volume de tudo, em kg ou L (opcional). */
  peso: { valor: number; unidade: 'kg' | 'L' } | null
  /** O que se pagou; se for grátis, o valor na prateleira. */
  valor: number
  precoNormal: number | null
  gratis: boolean
}

/** Refaz as contas de uma linha de compra a partir do que se corrigiu. */
export function calcularLinha<L extends Pick<LinhaCompra, 'unidade'>>(base: L, v: ValoresLinha): L & Partial<LinhaCompra> {
  const aoPeso = base.unidade === 'kg' || base.unidade === 'L'
  const q = v.quantidade
  const peso = v.peso ?? (aoPeso && q > 0 ? { valor: q, unidade: base.unidade as 'kg' | 'L' } : null)
  const prateleira = v.valor
  const ref = peso && peso.valor > 0 ? { valor: prateleira / peso.valor, unidade: peso.unidade } : null
  const unitario = aoPeso ? (ref?.valor ?? null) : q > 0 ? prateleira / q : null
  let poupanca = 0
  let tipoPoupanca: LinhaCompra['tipoPoupanca'] = null
  if (v.gratis) {
    poupanca = arredondar(prateleira)
    tipoPoupanca = 'gratis'
  } else if (v.precoNormal != null) {
    const normal = aoPeso ? v.precoNormal * (peso?.valor ?? q) : v.precoNormal * q
    if (normal - prateleira > 0.004) {
      poupanca = arredondar(normal - prateleira)
      tipoPoupanca = 'promocao'
    }
  }
  return {
    ...base,
    quantidade: q,
    total: v.gratis ? 0 : arredondar(v.valor),
    precoUnitario: unitario == null ? null : arredondar(unitario, 4),
    precoRef: ref ? arredondar(ref.valor, 4) : null,
    refUnidade: ref?.unidade ?? null,
    peso: peso ? { valor: arredondar(peso.valor, 4), unidade: peso.unidade } : null,
    poupanca,
    tipoPoupanca,
    precoNormal: v.precoNormal,
  }
}

/** Peso de tudo numa linha antiga: o guardado ou, se não houver, total ÷ preço ao quilo. */
export function pesoDaLinha(l: LinhaCompra): { valor: number; unidade: 'kg' | 'L' } | null {
  if (l.peso) return l.peso
  if (l.precoRef && l.precoRef > 0 && l.total > 0) return { valor: l.total / l.precoRef, unidade: l.refUnidade ?? 'kg' }
  if ((l.unidade === 'kg' || l.unidade === 'L') && l.quantidade > 0) return { valor: l.quantidade, unidade: l.unidade }
  return null
}

async function gravarLinhas(compra: Compra, linhas: LinhaCompra[]): Promise<void> {
  await gravar<Compra>('compras', { ...compra, linhas, totalCarrinho: arredondar(linhas.reduce((s, l) => s + l.total, 0)) })
}

/** O "último preço" de um produto volta a ser o da compra mais recente onde aparece. */
async function recalcularUltimoPreco(produtoId: string): Promise<void> {
  const produto = await db.produtos.get(produtoId)
  if (!produto) return
  const compras = (await db.compras.toArray()).filter((c) => !c.apagado).sort((a, b) => b.data.localeCompare(a.data))
  for (const c of compras) {
    const l = c.linhas.find((x) => x.produtoId === produtoId)
    if (!l) continue
    const peso = pesoDaLinha(l)
    const aoPeso = l.unidade === 'kg' || l.unidade === 'L'
    const unitario = l.precoNormal ?? l.precoUnitario
    const ref =
      l.precoNormal != null
        ? aoPeso
          ? l.precoNormal
          : peso && peso.valor > 0
            ? (l.precoNormal * l.quantidade) / peso.valor
            : null
        : l.precoRef
    const mudancas: Partial<Produto> = { ultimoPrecoData: c.data }
    if (unitario != null && l.unidade === produto.unidade) mudancas.ultimoPreco = arredondar(unitario, 4)
    if (ref != null) mudancas.ultimoPrecoRef = arredondar(ref, 4)
    await gravar<Produto>('produtos', { ...produto, ...mudancas })
    return
  }
}

export async function alterarLinhaCompra(compraId: string, produtoId: string, valores: ValoresLinha): Promise<void> {
  await db.transaction('rw', db.compras, db.produtos, async () => {
    const compra = await db.compras.get(compraId)
    if (!compra) return
    const linhas = compra.linhas.map((l) => (l.produtoId === produtoId ? (calcularLinha(l, valores) as LinhaCompra) : l))
    await gravarLinhas(compra, linhas)
    await recalcularUltimoPreco(produtoId)
  })
  avisar()
}

export async function tirarLinhaCompra(compraId: string, produtoId: string): Promise<void> {
  await db.transaction('rw', db.compras, db.produtos, async () => {
    const compra = await db.compras.get(compraId)
    if (!compra) return
    await gravarLinhas(
      compra,
      compra.linhas.filter((l) => l.produtoId !== produtoId),
    )
    await recalcularUltimoPreco(produtoId)
  })
  avisar()
}

/**
 * Acrescenta a uma compra fechada um artigo que se esqueceu de marcar. Se estava na
 * lista dessa compra por comprar, sai da lista.
 */
export async function acrescentarLinhaCompra(
  compraId: string,
  produto: Produto,
  unidade: Unidade,
  valores: ValoresLinha,
): Promise<void> {
  await db.transaction('rw', [db.compras, db.produtos, db.seccoes, db.artigos], async () => {
    const compra = await db.compras.get(compraId)
    if (!compra) return
    const seccao = await db.seccoes.get(produto.seccaoId)
    const base: LinhaCompra = {
      produtoId: produto.id,
      nome: produto.nome,
      seccaoId: produto.seccaoId,
      seccaoNome: seccao?.nome ?? '',
      quantidade: valores.quantidade,
      unidade,
      precoUnitario: null,
      total: 0,
      precoRef: null,
      refUnidade: null,
      lojaId: null,
    }
    const linha = calcularLinha(base, valores) as LinhaCompra
    await gravarLinhas(compra, [...compra.linhas.filter((l) => l.produtoId !== produto.id), linha])
    await recalcularUltimoPreco(produto.id)
    const naLista = (await db.artigos.where('listaId').equals(compra.listaId).toArray()).filter(
      (a) => !a.apagado && !a.noCarrinho && a.produtoId === produto.id,
    )
    for (const a of naLista) await gravar<Artigo>('artigos', { ...a, apagado: true })
  })
  avisar()
}

/** O que se pagou na caixa (com cupões, pontos, vales), escrito agora ou mais tarde. */
export async function alterarPagoNaCaixa(compraId: string, totalPago: number | null, motivo: string | null): Promise<void> {
  await alterar<Compra>('compras', compraId, { totalPago, motivoDesconto: motivo })
  avisar()
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
  /** O que custaria pelo preço da prateleira (igual ao total, exceto quando é grátis). */
  valorPrateleira: number
  /** Poupança neste artigo: promoção (preço normal − pago) ou o valor do que veio grátis. */
  poupanca: number
  tipoPoupanca: 'promocao' | 'gratis' | null
  /** Preço normal ao kg ou ao L, quando há preço normal e peso. */
  normalRef: PesoKgL | null
}

export type CamposArtigo = Pick<Artigo, 'quantidade' | 'unidade' | 'precoUnitario' | 'totalManual' | 'pesoTotal' | 'precoKg'> &
  Partial<Pick<Artigo, 'precoNormal' | 'gratis'>>

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

  // Promoção e grátis. O total acima é o valor "de prateleira"; o que se paga pode ser
  // menos (grátis com pontos: nada).
  const precoNormal = artigo.precoNormal ?? null
  let poupanca = 0
  let tipoPoupanca: ContasArtigo['tipoPoupanca'] = null
  let normalRef: PesoKgL | null = null
  if (precoNormal != null) {
    normalRef = aoPesoPedido
      ? { valor: precoNormal, unidade: u }
      : peso && peso.valor > 0
        ? { valor: (precoNormal * q) / peso.valor, unidade: peso.unidade }
        : null
  }
  if (artigo.gratis) {
    poupanca = totalFinal ?? 0
    tipoPoupanca = 'gratis'
  } else if (precoNormal != null && totalFinal != null) {
    const valorNormal = aoPesoPedido ? precoNormal * (peso?.valor ?? q) : precoNormal * q
    if (valorNormal - totalFinal > 0.004) {
      poupanca = arredondar(valorNormal - totalFinal)
      tipoPoupanca = 'promocao'
    }
  }

  // O aviso de subida compara preços normais: com promoção, o preço normal escrito.
  const subida =
    !escrito || !produto
      ? null
      : precoNormal != null
        ? subidaDePreco(produto, precoNormal, u, normalRef)
        : subidaDePreco(produto, unitario, u, aoQuilo)
  return {
    temPreco: totalFinal != null,
    sugerido: !escrito && totalFinal != null,
    total: artigo.gratis ? 0 : (totalFinal ?? 0),
    valorPrateleira: totalFinal ?? 0,
    poupanca,
    tipoPoupanca,
    normalRef,
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
      const c = contasArtigo(a, produto)
      const { unitario: efetivo, total, aoQuilo: ref, sugerido } = c
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
        peso: c.peso ? { valor: arredondar(c.peso.valor, 4), unidade: c.peso.unidade } : null,
        poupanca: c.poupanca,
        tipoPoupanca: c.tipoPoupanca,
        precoNormal: a.precoNormal ?? null,
      })
      // O preço pago (ou o normal, se estava em promoção) passa a ser a referência do
      // produto. As estimativas não contam.
      if (sugerido) continue
      const mudancas: Partial<Produto> = { ultimoPrecoData: agora }
      const unitarioRef = a.precoNormal ?? efetivo
      const refRef = a.precoNormal != null ? c.normalRef : ref
      if (unitarioRef != null && a.unidade === produto.unidade) mudancas.ultimoPreco = arredondar(unitarioRef, 4)
      if (refRef) mudancas.ultimoPrecoRef = arredondar(refRef.valor, 4)
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
