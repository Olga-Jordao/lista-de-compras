import { arredondar } from './numeros'
import type { Artigo, Produto, Unidade, UnidadeConteudo } from './tipos'

/** Total da linha: o total da etiqueta, se existir; senão quantidade × preço unitário. */
export function totalLinha(a: Pick<Artigo, 'quantidade' | 'precoUnitario' | 'totalManual'>): number {
  if (a.totalManual != null) return arredondar(a.totalManual)
  if (a.precoUnitario == null) return 0
  return arredondar(a.quantidade * a.precoUnitario)
}

/** Preço unitário efetivo: o escrito, ou o que resulta do total da etiqueta. */
export function precoUnitarioEfetivo(
  a: Pick<Artigo, 'quantidade' | 'precoUnitario' | 'totalManual'>,
): number | null {
  if (a.totalManual != null) return a.quantidade > 0 ? a.totalManual / a.quantidade : null
  return a.precoUnitario
}

/** Conteúdo da embalagem convertido para kg ou L. */
export function conteudoEmKgOuL(
  conteudo: { quantidade: number; unidade: UnidadeConteudo } | null,
): { valor: number; unidade: 'kg' | 'L' } | null {
  if (!conteudo || !(conteudo.quantidade > 0)) return null
  switch (conteudo.unidade) {
    case 'g':
      return { valor: conteudo.quantidade / 1000, unidade: 'kg' }
    case 'kg':
      return { valor: conteudo.quantidade, unidade: 'kg' }
    case 'ml':
      return { valor: conteudo.quantidade / 1000, unidade: 'L' }
    case 'L':
      return { valor: conteudo.quantidade, unidade: 'L' }
  }
}

/**
 * Preço ao kg ou ao litro. Para produtos ao kg ou ao L é o próprio preço unitário;
 * para produtos à unidade só se sabe quando o conteúdo da embalagem está preenchido.
 */
export function precoReferencia(
  precoUnitario: number | null,
  unidade: Unidade,
  conteudo: Produto['conteudo'],
): { valor: number; unidade: 'kg' | 'L' } | null {
  if (precoUnitario == null) return null
  if (unidade === 'kg' || unidade === 'L') return { valor: precoUnitario, unidade }
  const c = conteudoEmKgOuL(conteudo)
  if (!c) return null
  return { valor: precoUnitario / c.valor, unidade: c.unidade }
}

export interface Subida {
  /** Diferença em euros (por unidade, ou por kg/L quando compara referências). */
  diferenca: number
  percentagem: number
  /** 'unidade' = comparou o preço unitário; 'kg' ou 'L' = comparou ao kg ou ao litro. */
  base: 'unidade' | 'kg' | 'L'
}

/**
 * Compara o preço novo com o da última compra. Quando há preço ao kg/L dos dois
 * lados, compara esse (apanha a embalagem que encolheu); senão, o preço unitário.
 * Devolve null se não subiu.
 */
export function subidaDePreco(
  produto: Pick<Produto, 'ultimoPreco' | 'ultimoPrecoRef' | 'unidade' | 'conteudo'>,
  precoNovo: number | null,
  unidadeArtigo: Unidade,
): Subida | null {
  if (precoNovo == null) return null
  const refNova = precoReferencia(precoNovo, unidadeArtigo, produto.conteudo)
  if (refNova && produto.ultimoPrecoRef != null && unidadeArtigo === produto.unidade) {
    return comparar(produto.ultimoPrecoRef, refNova.valor, refNova.unidade)
  }
  if (produto.ultimoPreco != null && unidadeArtigo === produto.unidade) {
    return comparar(produto.ultimoPreco, precoNovo, 'unidade')
  }
  return null
}

function comparar(antes: number, depois: number, base: Subida['base']): Subida | null {
  const diferenca = arredondar(depois - antes)
  if (diferenca <= 0 || antes <= 0) return null
  return { diferenca, percentagem: Math.round((diferenca / antes) * 100), base }
}
