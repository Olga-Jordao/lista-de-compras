import { describe, expect, it } from 'vitest'
import { euros, lerNumero } from './numeros'
import { precoReferencia, subidaDePreco, totalLinha } from './precos'

const produto = { ultimoPreco: null, ultimoPrecoRef: null, unidade: 'un' as const, conteudo: null }

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
    const s = subidaDePreco({ ...produto, ultimoPreco: 0.9 }, 0.99, 'un')
    expect(s).toEqual({ diferenca: 0.09, percentagem: 10, base: 'unidade' })
    expect(subidaDePreco({ ...produto, ultimoPreco: 0.99 }, 0.99, 'un')).toBeNull()
    expect(subidaDePreco({ ...produto, ultimoPreco: 1.2 }, 0.99, 'un')).toBeNull()
  })

  it('apanha a embalagem que encolheu e manteve o preço', () => {
    // Antes: 100 ml a 4,00 € = 40 €/L. Agora: 75 ml a 4,00 € = 53,33 €/L.
    const s = subidaDePreco(
      { ultimoPreco: 4, ultimoPrecoRef: 40, unidade: 'un', conteudo: { quantidade: 75, unidade: 'ml' } },
      4,
      'un',
    )
    expect(s?.base).toBe('L')
    expect(s?.diferenca).toBeCloseTo(13.33, 2)
  })
})
