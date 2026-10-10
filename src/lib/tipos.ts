// Todos os registos têm id, data da última alteração (ms) e apagado. É isto que
// permite sincronizar entre aparelhos: ganha sempre a alteração mais recente, e
// nada se apaga de verdade, só se marca como apagado.
export interface Base {
  id: string
  atualizadoEm: number
  apagado: boolean
  /** 1 = alterado neste aparelho e ainda por enviar ao Supabase. */
  sujo: 0 | 1
}

export type Unidade = 'un' | 'dz' | 'kg' | 'L'
export type UnidadeConteudo = 'g' | 'kg' | 'ml' | 'L'

export interface Seccao extends Base {
  nome: string
  ordem: number
}

export interface Produto extends Base {
  nome: string
  seccaoId: string
  unidade: Unidade
  /** Quanto leva a embalagem, só para produtos comprados à unidade. */
  conteudo: { quantidade: number; unidade: UnidadeConteudo } | null
  /** Preço unitário na última compra fechada. */
  ultimoPreco: number | null
  /** Preço ao kg ou ao L na última compra fechada, quando se sabia o conteúdo. */
  ultimoPrecoRef: number | null
  ultimoPrecoData: string | null
  /** Fase B: loja onde foi comprado da última vez. */
  ultimaLojaId: string | null
}

export interface Lista extends Base {
  nome: string
  ordem: number
}

export type Origem = 'manual' | 'refeicao'

export interface Artigo extends Base {
  listaId: string
  produtoId: string
  quantidade: number
  unidade: Unidade
  /** Preço por unidade escrito na loja (ou a sugestão aceite). */
  precoUnitario: number | null
  /** Total pago (etiqueta, talão), em alternativa ao preço unitário. */
  totalManual: number | null
  /**
   * O peso que a balança deu para tudo (6 espetadas = 1,730 kg; 2 kg pedidos =
   * 2,050 kg). Pode faltar em registos antigos.
   */
  pesoTotal?: { quantidade: number; unidade: UnidadeConteudo } | null
  /** Preço ao quilo (ou ao litro) escrito da etiqueta. Pode faltar em registos antigos. */
  precoKg?: number | null
  noCarrinho: boolean
  /** Fixo fica na lista depois de fechar a compra; só desta vez sai. */
  fixo: boolean
  /** Ficou por comprar na última compra fechada. */
  porComprar: boolean
  origem: Origem
  /** Fase C: refeição de onde veio, quando a origem é 'refeicao'. */
  refeicaoId: string | null
  ordem: number
}

export interface LinhaCompra {
  produtoId: string
  nome: string
  seccaoId: string
  seccaoNome: string
  quantidade: number
  unidade: Unidade
  precoUnitario: number | null
  total: number
  /** Preço ao kg ou ao L, quando se sabia. */
  precoRef: number | null
  refUnidade: 'kg' | 'L' | null
  /** Fase B: loja onde foi comprado. */
  lojaId: string | null
}

export interface Compra extends Base {
  listaId: string
  listaNome: string
  /** Data e hora do fecho, em ISO. */
  data: string
  modo: 'loja' | 'online'
  totalCarrinho: number
  /** O que se pagou na caixa, se for diferente do total do carrinho. */
  totalPago: number | null
  motivoDesconto: string | null
  linhas: LinhaCompra[]
}

export type NomeTabela = 'seccoes' | 'produtos' | 'listas' | 'artigos' | 'compras'
export const TABELAS: NomeTabela[] = ['seccoes', 'produtos', 'listas', 'artigos', 'compras']
