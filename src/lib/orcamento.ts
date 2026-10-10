import { arredondar } from './numeros'
import type { Compra } from './tipos'

// O "mês" do orçamento pode começar noutro dia que não o 1: com o dia 8, outubro
// vai de 8 de outubro a 7 de novembro, e no dia 8 de novembro recomeça.

export interface Periodo {
  /** Primeiro dia, às 00:00. */
  inicio: Date
  /** Primeiro dia do período seguinte, às 00:00 (não incluído). */
  fim: Date
}

export function periodoAtual(diaInicio: number, hoje = new Date()): Periodo {
  const dia = Math.min(Math.max(Math.round(diaInicio) || 1, 1), 28)
  let ano = hoje.getFullYear()
  let mes = hoje.getMonth()
  if (hoje.getDate() < dia) {
    mes -= 1
    if (mes < 0) {
      mes = 11
      ano -= 1
    }
  }
  return { inicio: new Date(ano, mes, dia), fim: new Date(ano, mes + 1, dia) }
}

const diaMes = new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'long' })
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const diaMesCurto = { format: (d: Date) => `${d.getDate()} ${MESES[d.getMonth()]}` }

/** "de 8 de outubro a 7 de novembro" */
export function textoPeriodo(p: Periodo): string {
  const ultimo = new Date(p.fim.getFullYear(), p.fim.getMonth(), p.fim.getDate() - 1)
  return `de ${diaMes.format(p.inicio)} a ${diaMes.format(ultimo)}`
}

/** "8 out – 7 nov" */
export function textoPeriodoCurto(p: Periodo): string {
  const ultimo = new Date(p.fim.getFullYear(), p.fim.getMonth(), p.fim.getDate() - 1)
  return `${diaMesCurto.format(p.inicio)} – ${diaMesCurto.format(ultimo)}`
}

export interface ResumoPeriodo {
  /** Compras fechadas no período. */
  compras: Compra[]
  /** O que se pagou (valor da caixa quando foi escrito; senão o total do carrinho). */
  gasto: number
  /** Diferença entre o carrinho e a caixa: pontos, cupões, promoções. */
  poupado: number
}

export function resumoPeriodo(compras: Compra[], p: Periodo): ResumoPeriodo {
  const doPeriodo = compras.filter((c) => {
    if (c.apagado) return false
    const d = new Date(c.data)
    return d >= p.inicio && d < p.fim
  })
  let gasto = 0
  let poupado = 0
  for (const c of doPeriodo) {
    const pago = c.totalPago ?? c.totalCarrinho
    gasto += pago
    if (c.totalPago != null && c.totalPago < c.totalCarrinho) poupado += c.totalCarrinho - c.totalPago
  }
  return { compras: doPeriodo, gasto: arredondar(gasto), poupado: arredondar(poupado) }
}
