import { describe, expect, it } from 'vitest'
import { periodoAtual, resumoPeriodo, textoPeriodo } from './orcamento'
import { artigosParaRepetir } from './repetir'
import type { Compra, LinhaCompra } from './tipos'

function compra(data: string, listaId: string, linhas: Partial<LinhaCompra>[], totalPago: number | null = null): Compra {
  const ls = linhas.map((l, i) => ({
    produtoId: `p${i}`,
    nome: `Produto ${i}`,
    seccaoId: 's',
    seccaoNome: 'Secção',
    quantidade: 1,
    unidade: 'un' as const,
    precoUnitario: 1,
    total: 1,
    precoRef: null,
    refUnidade: null,
    lojaId: null,
    ...l,
  }))
  return {
    id: data + listaId,
    listaId,
    listaNome: listaId,
    data,
    modo: 'loja',
    totalCarrinho: ls.reduce((s, l) => s + l.total, 0),
    totalPago,
    motivoDesconto: null,
    linhas: ls,
    atualizadoEm: 0,
    apagado: false,
    sujo: 0,
  }
}

describe('o mês do orçamento começa no dia 8', () => {
  it('a 10 de outubro, o mês vai de 8 de outubro a 7 de novembro', () => {
    const p = periodoAtual(8, new Date(2026, 9, 10))
    expect(p.inicio).toEqual(new Date(2026, 9, 8))
    expect(p.fim).toEqual(new Date(2026, 10, 8))
    expect(textoPeriodo(p)).toBe('de 8 de outubro a 7 de novembro')
  })

  it('a 5 de outubro ainda é o mês de setembro (8 set a 7 out)', () => {
    const p = periodoAtual(8, new Date(2026, 9, 5))
    expect(p.inicio).toEqual(new Date(2026, 8, 8))
  })

  it('em janeiro antes do dia 8, o mês começou em dezembro', () => {
    expect(periodoAtual(8, new Date(2027, 0, 3)).inicio).toEqual(new Date(2026, 11, 8))
  })

  it('soma o que se pagou na caixa e o que se poupou, só dentro do mês', () => {
    const p = periodoAtual(8, new Date(2026, 9, 20))
    const r = resumoPeriodo(
      [
        compra('2026-10-10T10:00:00', 'm', [{ total: 85.53 }]),
        compra('2026-10-15T10:00:00', 's', [{ total: 30 }], 27.5),
        compra('2026-10-07T10:00:00', 'm', [{ total: 50 }]),
      ],
      p,
    )
    expect(r.compras).toHaveLength(2)
    expect(r.gasto).toBe(113.03)
    expect(r.poupado).toBe(2.5)
  })
})

describe('repetir a lista', () => {
  it('junta as idas recentes da lista, sem repetidos, com a quantidade mais recente', () => {
    const compras = [
      compra('2026-10-01T10:00:00', 'frescos', [{ produtoId: 'kiwi', quantidade: 6 }]),
      compra('2026-10-08T10:00:00', 'frescos', [{ produtoId: 'kiwi', quantidade: 8 }, { produtoId: 'pao', quantidade: 2 }]),
      compra('2026-10-10T10:00:00', 'frescos', [{ produtoId: 'espetadas', quantidade: 6 }]),
      compra('2026-10-10T11:00:00', 'mes', [{ produtoId: 'atum', quantidade: 6 }]),
      compra('2026-09-01T10:00:00', 'frescos', [{ produtoId: 'antigo', quantidade: 1 }]),
    ]
    const r = artigosParaRepetir(compras, 'frescos', 14)
    expect(r.map((i) => i.produtoId).sort()).toEqual(['espetadas', 'kiwi', 'pao'])
    expect(r.find((i) => i.produtoId === 'kiwi')?.quantidade).toBe(8)
  })
})
