import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { acrescentarArtigo, alterarArtigo, alternarCarrinho, contasArtigo, criarProduto, fecharCompra, totalArtigo } from './acoes'
import { db } from './db'
import { idSeccaoInicial, prepararDadosIniciais } from './inicial'
import { mostrarNaoComprado } from './repetir'
import { aplicar } from './sync'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
  await prepararDadosIniciais(db)
})

const MERCEARIA = idSeccaoInicial('Mercearia')

describe('lista e fecho de compra', () => {
  it('começa com as 13 secções e as duas listas', async () => {
    expect(await db.seccoes.count()).toBe(13)
    expect((await db.listas.toArray()).map((l) => l.nome).sort()).toEqual(['Compras do mês', 'Frescos da semana'])
  })

  it('não repete um produto que já está na lista', async () => {
    const leite = await criarProduto('Leite', MERCEARIA, 'L')
    const a = await acrescentarArtigo('lista-mensal', leite)
    const b = await acrescentarArtigo('lista-mensal', leite)
    expect(b.id).toBe(a.id)
  })

  it('fecha a compra: guarda, atualiza o último preço, esvazia o que se comprou e deixa o resto', async () => {
    const aveia = await criarProduto('Bebida de aveia', MERCEARIA, 'L')
    const pilhas = await criarProduto('Pilhas', MERCEARIA, 'un')
    const arroz = await criarProduto('Arroz', MERCEARIA, 'un')

    const aAveia = await acrescentarArtigo('lista-mensal', aveia)
    await alterarArtigo(aAveia.id, { quantidade: 18, precoUnitario: 0.99, noCarrinho: true })
    const aPilhas = await acrescentarArtigo('lista-mensal', pilhas)
    await alterarArtigo(aPilhas.id, { precoUnitario: 5, noCarrinho: true })
    const aArroz = await acrescentarArtigo('lista-mensal', arroz)

    const compra = await fecharCompra({ listaId: 'lista-mensal', modo: 'loja', totalPago: 20, motivoDesconto: 'Pontos' })
    expect(compra?.totalCarrinho).toBe(22.82)
    expect(compra?.totalPago).toBe(20)
    expect(compra?.linhas).toHaveLength(2)

    expect((await db.produtos.get(aveia.id))?.ultimoPreco).toBe(0.99)
    expect((await db.artigos.get(aAveia.id))?.apagado).toBe(true)
    expect((await db.artigos.get(aPilhas.id))?.apagado).toBe(true)
    const arrozDepois = (await db.artigos.get(aArroz.id))!
    expect(arrozDepois.apagado).toBe(false)
    expect(arrozDepois.fechosSemComprar).toBe(1)
    // A meio da semana ainda não diz "Não comprado".
    expect(mostrarNaoComprado(arrozDepois)).toBe(false)

    // Fecha-se outra compra sem o arroz: agora já diz.
    const a2 = await acrescentarArtigo('lista-mensal', aveia)
    await alterarArtigo(a2.id, { precoUnitario: 1, noCarrinho: true })
    await fecharCompra({ listaId: 'lista-mensal', modo: 'loja', totalPago: null, motivoDesconto: null })
    expect(mostrarNaoComprado((await db.artigos.get(aArroz.id))!)).toBe(true)
  })

  it('ao voltar a pôr na lista, o último preço aparece como estimativa e é aceite ao pôr no carrinho', async () => {
    const ovos = await criarProduto('Ovos', MERCEARIA, 'un')
    const a = await acrescentarArtigo('lista-semanal', ovos)
    await alterarArtigo(a.id, { quantidade: 2, precoUnitario: 2.5, noCarrinho: true })
    await fecharCompra({ listaId: 'lista-semanal', modo: 'loja', totalPago: null, motivoDesconto: null })

    const produto = (await db.produtos.get(ovos.id))!
    const outra = await acrescentarArtigo('lista-semanal', produto, { quantidade: 2, unidade: 'un' })
    expect(outra.id).not.toBe(a.id)
    expect(totalArtigo(outra, produto)).toBe(5)
    await alternarCarrinho(outra, produto)
    expect((await db.artigos.get(outra.id))?.precoUnitario).toBe(2.5)
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
    expect((await db.artigos.get(a.id))?.apagado).toBe(true)
  })
})

describe('pedir à unidade ou ao peso, pagar ao quilo', () => {
  const talho = idSeccaoInicial('Talho')

  it('6 espetadas: balança 1,730 kg a 10,99 €/kg dá 19,01 € e cada uma ≈ 288 g', async () => {
    const espetadas = await criarProduto('Espetadas de frango', talho, 'un')
    const a = await acrescentarArtigo('lista-semanal', espetadas)
    await alterarArtigo(a.id, { quantidade: 6, pesoTotal: { quantidade: 1.73, unidade: 'kg' }, precoKg: 10.99, noCarrinho: true })
    const c = contasArtigo((await db.artigos.get(a.id))!, espetadas)
    expect(c.total).toBe(19.01)
    expect(c.aoQuilo?.valor).toBe(10.99)
    expect(c.unitario).toBeCloseTo(3.17, 2)

    await fecharCompra({ listaId: 'lista-semanal', modo: 'loja', totalPago: null, motivoDesconto: null })
    const depois = (await db.produtos.get(espetadas.id))!
    expect(depois.ultimoPrecoRef).toBe(10.99)
    expect(depois.conteudo).toEqual({ quantidade: 288, unidade: 'g' })

    // Da próxima vez, em casa: "6 espetadas" já dá uma estimativa.
    const proxima = await acrescentarArtigo('lista-semanal', depois, { quantidade: 6, unidade: 'un' })
    const estimativa = contasArtigo(proxima, depois)
    expect(estimativa.sugerido).toBe(true)
    expect(estimativa.total).toBeCloseTo(18.99, 1)
  })

  it('fígado: pedi 2 kg, a balança deu 2,050 kg a 2,00 €/kg → 4,10 €', () => {
    const c = contasArtigo(
      { quantidade: 2, unidade: 'kg', pesoTotal: { quantidade: 2.05, unidade: 'kg' }, precoKg: 2, precoUnitario: null, totalManual: null },
      undefined,
    )
    expect(c.total).toBe(4.1)
    expect(c.aoQuilo?.valor).toBe(2)
  })

  it('hambúrgueres: 4 un, 625 g e total 9,37 € dão 14,99 €/kg', () => {
    const c = contasArtigo(
      { quantidade: 4, unidade: 'un', pesoTotal: { quantidade: 625, unidade: 'g' }, totalManual: 9.37, precoKg: null, precoUnitario: null },
      undefined,
    )
    expect(c.aoQuilo?.valor).toBeCloseTo(14.99, 2)
    expect(c.incoerente).toBeNull()
  })

  it('avisa quando os três valores não batem certo (bifes: 1,80 kg × 19,99 € ≠ 21,59 €)', () => {
    const c = contasArtigo(
      { quantidade: 4, unidade: 'un', pesoTotal: { quantidade: 1.8, unidade: 'kg' }, precoKg: 19.99, totalManual: 21.59, precoUnitario: null },
      undefined,
    )
    expect(c.incoerente?.totalEsperado).toBe(35.98)
    const certo = contasArtigo(
      { quantidade: 4, unidade: 'un', pesoTotal: { quantidade: 1.08, unidade: 'kg' }, precoKg: 19.99, totalManual: 21.59, precoUnitario: null },
      undefined,
    )
    expect(certo.incoerente).toBeNull()
  })

  it('kiwis: 8 un, só com preço/kg e total, a aplicação descobre o peso', () => {
    const c = contasArtigo(
      { quantidade: 8, unidade: 'un', precoKg: 5.76, totalManual: 11.52, pesoTotal: null, precoUnitario: null },
      undefined,
    )
    expect(c.peso?.valor).toBeCloseTo(2, 3)
    expect(c.unitario).toBeCloseTo(1.44, 2)
  })

  it('cápsulas de café: 6 caixas a 3,75 €, caixa de 100 g → 37,50 €/kg', () => {
    const cafe = { conteudo: { quantidade: 100, unidade: 'g' as const }, ultimoPreco: null, ultimoPrecoRef: null, unidade: 'un' as const }
    const c = contasArtigo(
      { quantidade: 6, unidade: 'un', precoUnitario: 3.75, totalManual: null, pesoTotal: null, precoKg: null },
      cafe as never,
    )
    expect(c.total).toBe(22.5)
    expect(c.aoQuilo?.valor).toBeCloseTo(37.5, 2)
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
