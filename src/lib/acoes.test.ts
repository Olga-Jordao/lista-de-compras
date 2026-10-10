import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { acrescentarArtigo, alterarArtigo, alternarCarrinho, contasArtigo, criarProduto, fecharCompra, totalArtigo } from './acoes'
import { db } from './db'
import { idSeccaoInicial, prepararDadosIniciais } from './inicial'
import { aplicar } from './sync'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
  await prepararDadosIniciais(db)
})

const MERCEARIA = idSeccaoInicial('Mercearia')

describe('lista e fecho de compra', () => {
  it('começa com as 13 secções e as duas listas', async () => {
    expect(await db.seccoes.count()).toBe(13)
    expect((await db.listas.toArray()).map((l) => l.nome).sort()).toEqual(['Mensal', 'Semanal de frescos'])
  })

  it('não repete um produto que já está na lista', async () => {
    const leite = await criarProduto('Leite', MERCEARIA, 'L')
    const a = await acrescentarArtigo('lista-mensal', leite)
    const b = await acrescentarArtigo('lista-mensal', leite)
    expect(b.id).toBe(a.id)
  })

  it('fecha a compra: guarda, atualiza o último preço, desmarca fixos, tira os de uma vez e assinala os que ficaram', async () => {
    const aveia = await criarProduto('Bebida de aveia', MERCEARIA, 'L')
    const pilhas = await criarProduto('Pilhas', MERCEARIA, 'un')
    const arroz = await criarProduto('Arroz', MERCEARIA, 'un')

    const aAveia = await acrescentarArtigo('lista-mensal', aveia)
    await alterarArtigo(aAveia.id, { quantidade: 18, precoUnitario: 0.99, noCarrinho: true })
    const aPilhas = await acrescentarArtigo('lista-mensal', pilhas)
    await alterarArtigo(aPilhas.id, { precoUnitario: 5, noCarrinho: true, fixo: false })
    const aArroz = await acrescentarArtigo('lista-mensal', arroz)

    const compra = await fecharCompra({ listaId: 'lista-mensal', modo: 'loja', totalPago: 20, motivoDesconto: 'Pontos' })
    expect(compra?.totalCarrinho).toBe(22.82)
    expect(compra?.totalPago).toBe(20)
    expect(compra?.linhas).toHaveLength(2)

    expect((await db.produtos.get(aveia.id))?.ultimoPreco).toBe(0.99)
    const aveiaDepois = await db.artigos.get(aAveia.id)
    expect(aveiaDepois?.noCarrinho).toBe(false)
    expect(aveiaDepois?.precoUnitario).toBeNull()
    expect((await db.artigos.get(aPilhas.id))?.apagado).toBe(true)
    expect((await db.artigos.get(aArroz.id))?.porComprar).toBe(true)
  })

  it('o último preço aparece como sugestão e é aceite ao pôr no carrinho', async () => {
    const ovos = await criarProduto('Ovos', MERCEARIA, 'un')
    const a = await acrescentarArtigo('lista-semanal', ovos)
    await alterarArtigo(a.id, { quantidade: 2, precoUnitario: 2.5, noCarrinho: true })
    await fecharCompra({ listaId: 'lista-semanal', modo: 'loja', totalPago: null, motivoDesconto: null })

    const artigo = (await db.artigos.get(a.id))!
    const produto = (await db.produtos.get(ovos.id))!
    expect(totalArtigo(artigo, produto)).toBe(5)
    await alternarCarrinho(artigo, produto)
    expect((await db.artigos.get(a.id))?.precoUnitario).toBe(2.5)
  })
})

describe('total pago em vez de preço por kg', () => {
  it('ao fechar, o último preço por kg sai do peso e do total pago', async () => {
    const talho = idSeccaoInicial('Talho')
    const carne = await criarProduto('Carne picada mista', talho, 'kg')
    const a = await acrescentarArtigo('lista-semanal', carne)
    await alterarArtigo(a.id, { quantidade: 1.8, totalManual: 18.45, noCarrinho: true })
    const compra = await fecharCompra({ listaId: 'lista-semanal', modo: 'loja', totalPago: null, motivoDesconto: null })
    expect(compra?.linhas[0].total).toBe(18.45)
    expect(compra?.linhas[0].precoRef).toBeCloseTo(10.25, 2)
    expect((await db.produtos.get(carne.id))?.ultimoPreco).toBeCloseTo(10.25, 2)
  })

  it('pão pesado tudo junto guarda o preço ao quilo da compra', async () => {
    const padaria = idSeccaoInicial('Padaria')
    const pao = await criarProduto('Pão', padaria, 'un')
    const a = await acrescentarArtigo('lista-semanal', pao)
    await alterarArtigo(a.id, { quantidade: 2, totalManual: 0.88, pesoTotal: { quantidade: 166, unidade: 'g' }, noCarrinho: true })
    const artigo = (await db.artigos.get(a.id))!
    expect(contasArtigo(artigo, pao).aoQuilo?.valor).toBeCloseTo(5.3, 2)
    const compra = await fecharCompra({ listaId: 'lista-semanal', modo: 'loja', totalPago: null, motivoDesconto: null })
    expect(compra?.linhas[0].precoUnitario).toBe(0.44)
    expect(compra?.linhas[0].precoRef).toBeCloseTo(5.3, 2)
    expect((await db.artigos.get(a.id))?.pesoTotal).toBeNull()
  })
})

describe('sincronização', () => {
  it('a alteração mais recente ganha e a mais antiga é ignorada', async () => {
    const p = await criarProduto('Café', MERCEARIA, 'un')
    const local = (await db.produtos.get(p.id))!
    await aplicar([
      { id: p.id, tabela: 'produtos', dados: { ...local, nome: 'Café antigo' }, atualizado_em: local.atualizadoEm - 10, apagado: false, servidor_em: '' },
    ])
    expect((await db.produtos.get(p.id))?.nome).toBe('Café')
    await aplicar([
      { id: p.id, tabela: 'produtos', dados: { ...local, nome: 'Café moído' }, atualizado_em: local.atualizadoEm + 10, apagado: false, servidor_em: '' },
    ])
    const depois = (await db.produtos.get(p.id))!
    expect(depois.nome).toBe('Café moído')
    expect(depois.sujo).toBe(0)
  })
})
