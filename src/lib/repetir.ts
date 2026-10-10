import type { Artigo, Compra, LinhaCompra } from './tipos'

const UM_DIA = 24 * 60 * 60 * 1000

export interface ParaRepetir extends LinhaCompra {
  /** Data da compra mais recente em que se levou este produto. */
  data: string
}

/**
 * Tudo o que se comprou numa lista nas últimas idas, junto e sem repetidos: as
 * compras dessa lista nos `periodoDias` antes da mais recente (os frescos de uma
 * semana vêm de várias idas: talho, frutaria, padaria). Cada produto aparece uma
 * vez, com a quantidade da compra mais recente.
 */
export function artigosParaRepetir(compras: Compra[], listaId: string, periodoDias = 31): ParaRepetir[] {
  const daLista = compras
    .filter((c) => !c.apagado && c.listaId === listaId)
    .sort((a, b) => b.data.localeCompare(a.data))
  if (daLista.length === 0) return []
  const desde = new Date(daLista[0].data).getTime() - periodoDias * UM_DIA
  const porProduto = new Map<string, ParaRepetir>()
  for (const c of daLista) {
    if (new Date(c.data).getTime() < desde) break
    for (const l of c.linhas) {
      if (!porProduto.has(l.produtoId)) porProduto.set(l.produtoId, { ...l, data: c.data })
    }
  }
  return [...porProduto.values()]
}

/** Data da compra mais recente de uma lista, ou null se ainda não houve nenhuma. */
export function ultimaCompraDaLista(compras: Compra[], listaId: string): Compra | null {
  let ultima: Compra | null = null
  for (const c of compras) {
    if (c.apagado || c.listaId !== listaId) continue
    if (!ultima || c.data > ultima.data) ultima = c
  }
  return ultima
}

/**
 * "Não comprado" só aparece quando já não é por estar a meio da semana: depois de
 * fechar duas compras sem o comprar, ou passada uma semana desde que ficou.
 */
export function mostrarNaoComprado(artigo: Pick<Artigo, 'naoCompradoDesde' | 'fechosSemComprar'>, hoje = new Date()): boolean {
  if (!artigo.naoCompradoDesde) return false
  if ((artigo.fechosSemComprar ?? 0) >= 2) return true
  return hoje.getTime() - new Date(artigo.naoCompradoDesde).getTime() >= 7 * UM_DIA
}
