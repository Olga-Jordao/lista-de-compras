import { describe, expect, it } from 'vitest'
import { euros, lerNumero } from './numeros'
import { medidaDaLinha, precoAoQuilo, precoReferencia, subidaDePreco, totalLinha } from './precos'

const produto = { ultimoPreco: null, ultimoPrecoRef: null, unidade: 'un' as const }

describe('números à portuguesa', () => {
  it('lê vírgula e ponto decimais', () => {
    expect(lerNumero('1,2')).toBe(1.2)
    expect(lerNumero('0.99')).toBe(0.99)
    expect(lerNumero(' 4,00 € ')).toBe(4)
    expect(lerNumero('')).toBeNull()
    expect(lerNumero('abc')).toBeNull()
  })

  it('mostra euros com vírgula', () => {
    expect(euros(17.82).replace(/\s/g, ' ')).toBe('17,82 €')
  })
})

describe('preços', () => {
  it('calcula o total da linha (bebida de aveia, 18 L a 0,99 €)', () => {
    expect(totalLinha({ quantidade: 18, precoUnitario: 0.99, totalManual: null })).toBe(17.82)
  })

  it('ovos à dúzia: meia dúzia, dúzia e dúzia e meia', () => {
    expect(totalLinha({ quantidade: 1, precoUnitario: 3, totalManual: null })).toBe(3)
    expect(totalLinha({ quantidade: 0.5, precoUnitario: 3, totalManual: null })).toBe(1.5)
    expect(totalLinha({ quantidade: 1.5, precoUnitario: 3, totalManual: null })).toBe(4.5)
    expect(precoReferencia(3, 'dz', { quantidade: 12, unidade: 'g' })).toBeNull()
  })

  it('o total da etiqueta ganha ao preço unitário', () => {
    expect(totalLinha({ quantidade: 1.13, precoUnitario: 9.99, totalManual: 11.29 })).toBe(11.29)
  })

  it('faz a conta ao litro e ao quilo', () => {
    const pasta = precoReferencia(4, 'un', { quantidade: 75, unidade: 'ml' })
    expect(pasta?.unidade).toBe('L')
    expect(pasta?.valor).toBeCloseTo(53.33, 2)
    expect(precoReferencia(5, 'un', { quantidade: 500, unidade: 'g' })).toEqual({ valor: 10, unidade: 'kg' })
    expect(precoReferencia(2.49, 'kg', null)).toEqual({ valor: 2.49, unidade: 'kg' })
    expect(precoReferencia(4, 'un', null)).toBeNull()
  })

  it('avisa quando o preço sobe e diz quanto', () => {
    const s = subidaDePreco({ ...produto, ultimoPreco: 0.9 }, 0.99, 'un', null)
    expect(s).toEqual({ diferenca: 0.09, percentagem: 10, base: 'unidade' })
    expect(subidaDePreco({ ...produto, ultimoPreco: 0.99 }, 0.99, 'un', null)).toBeNull()
    expect(subidaDePreco({ ...produto, ultimoPreco: 1.2 }, 0.99, 'un', null)).toBeNull()
  })

  it('apanha a embalagem que encolheu e manteve o preço', () => {
    // Antes: 100 ml a 4,00 € = 40 €/L. Agora: 75 ml a 4,00 € = 53,33 €/L.
    const agora = precoAoQuilo(4, medidaDaLinha(1, 'un', { quantidade: 75, unidade: 'ml' }, null))
    const s = subidaDePreco({ ultimoPreco: 4, ultimoPrecoRef: 40, unidade: 'un' }, 4, 'un', agora)
    expect(s?.base).toBe('L')
    expect(s?.diferenca).toBeCloseTo(13.33, 2)
  })
})

describe('preço ao quilo a partir do que se pagou', () => {
  it('carne do talho: escrevo o peso e o total, a aplicação dá o quilo', () => {
    // 1,8 kg por 18,45 € → 10,25 €/kg
    const r = precoAoQuilo(18.45, medidaDaLinha(1.8, 'kg', null, null))
    expect(r?.unidade).toBe('kg')
    expect(r?.valor).toBeCloseTo(10.25, 2)
  })

  it('pão pesado tudo junto: 2 bolas, 166 g, 0,88 € → 5,30 €/kg', () => {
    const r = precoAoQuilo(0.88, medidaDaLinha(2, 'un', null, { quantidade: 166, unidade: 'g' }))
    expect(r?.valor).toBeCloseTo(5.3, 2)
  })

  it('atum: cada lata tem 120 g, 6 latas por 10,74 € → 14,92 €/kg', () => {
    const r = precoAoQuilo(10.74, medidaDaLinha(6, 'un', { quantidade: 120, unidade: 'g' }, null))
    expect(r?.valor).toBeCloseTo(14.92, 2)
  })

  it('sem peso não há preço ao quilo', () => {
    expect(medidaDaLinha(2, 'un', null, null)).toBeNull()
    expect(medidaDaLinha(1, 'dz', null, null)).toBeNull()
  })
})
