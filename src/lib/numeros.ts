// Números à portuguesa: vírgula decimal, euros no fim.

const formatoEuros = new Intl.NumberFormat('pt-PT', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const formatoNumero = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 3 })

export function euros(valor: number): string {
  return formatoEuros.format(arredondar(valor))
}

export function numero(valor: number): string {
  return formatoNumero.format(valor)
}

/** Para pôr um número num campo de texto: 1.5 → "1,5", sem separador de milhares. */
export function paraCampo(valor: number | null | undefined): string {
  if (valor == null) return ''
  return String(valor).replace('.', ',')
}

/** Para mostrar euros num campo: 4.1 → "4,10". */
export function paraCampoEuros(valor: number | null | undefined): string {
  if (valor == null) return ''
  return arredondar(valor).toFixed(2).replace('.', ',')
}

/** Lê o que se escreve num campo: aceita "1,2", "1.2", " 0,99 € ". Vazio ou inválido → null. */
export function lerNumero(texto: string): number | null {
  const limpo = texto.replace(/[€\s]/g, '').replace(',', '.')
  if (limpo === '' || limpo === '.') return null
  if (!/^\d*\.?\d*$/.test(limpo)) return null
  const n = Number(limpo)
  return Number.isFinite(n) ? n : null
}

export function arredondar(valor: number, casas = 2): number {
  const f = 10 ** casas
  return Math.round((valor + Number.EPSILON) * f) / f
}
