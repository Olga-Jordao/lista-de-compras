import { useEffect, useRef, useState } from 'react'
import { alterarArtigo, alterarProduto, apagarArtigo, contasArtigo, type CamposArtigo } from '../lib/acoes'
import { arredondar, euros, lerNumero, numero, paraCampo, paraCampoEuros } from '../lib/numeros'
import type { Artigo, Produto, Unidade, UnidadeConteudo } from '../lib/tipos'
import { useAviso } from './AvisoRapido'
import { Folha, Segmentos } from './Folha'

const UNIDADES: { valor: Unidade; rotulo: string }[] = [
  { valor: 'un', rotulo: 'un' },
  { valor: 'dz', rotulo: 'dz' },
  { valor: 'kg', rotulo: 'kg' },
  { valor: 'L', rotulo: 'L' },
]

type Campo = 'peso' | 'precoKg' | 'precoUn' | 'total'

// Secções onde o que se pede à unidade se pesa na balança (o peso é "de tudo").
const SECCOES_AO_PESO = new Set(['seccao-talho', 'seccao-peixaria', 'seccao-fruta-e-legumes', 'seccao-padaria', 'seccao-charcutaria'])

const selecionarTudo = (e: React.FocusEvent<HTMLInputElement>) => e.target.select()

/**
 * Painel de um artigo. Em cima, o que se pediu (6 un, 2 kg). Em baixo, o que diz a
 * etiqueta ou a prateleira: peso, preço/kg, preço por unidade e total. Escreve-se
 * o que houver (normalmente dois) e o resto calcula-se.
 */
export function FolhaArtigo({
  artigo,
  produto,
  foco,
  aoFechar,
  aoEditarProduto,
}: {
  artigo: Artigo
  produto: Produto
  foco: 'quantidade' | 'preco'
  aoFechar: () => void
  aoEditarProduto: () => void
}) {
  const aviso = useAviso()
  const aoPesoInicial = artigo.unidade === 'kg' || artigo.unidade === 'L'
  // Registos antigos ao kg guardavam o preço/kg em precoUnitario.
  const precoKgInicial = artigo.precoKg ?? (aoPesoInicial ? artigo.precoUnitario : null)
  const precoUnInicial = aoPesoInicial ? null : artigo.precoUnitario

  const [quantidade, setQuantidade] = useState(paraCampo(artigo.quantidade))
  const [unidade, setUnidade] = useState<Unidade>(artigo.unidade)
  const [textos, setTextos] = useState<Record<Campo, string>>({
    peso: paraCampo(artigo.pesoTotal?.quantidade),
    precoKg: paraCampo(precoKgInicial),
    precoUn: paraCampo(precoUnInicial),
    total: paraCampo(artigo.totalManual),
  })
  const [escritos, setEscritos] = useState<Record<Campo, boolean>>({
    peso: artigo.pesoTotal != null,
    precoKg: precoKgInicial != null,
    precoUn: precoUnInicial != null,
    total: artigo.totalManual != null,
  })
  const [pesoUn, setPesoUn] = useState<UnidadeConteudo>(
    artigo.pesoTotal?.unidade ?? (artigo.unidade === 'L' ? 'L' : 'kg'),
  )
  // Peso "de cada" (embalagem: fica no produto) ou "de tudo" (balança: só desta compra).
  const [pesoModo, setPesoModo] = useState<'tudo' | 'cada'>(
    artigo.pesoTotal || SECCOES_AO_PESO.has(produto.seccaoId) ? 'tudo' : 'cada',
  )
  const [cadaTxt, setCadaTxt] = useState(paraCampo(produto.conteudo?.quantidade))
  const [cadaUn, setCadaUn] = useState<UnidadeConteudo>(produto.conteudo?.unidade ?? 'g')
  const [gratis, setGratis] = useState(artigo.gratis ?? false)
  const [normalTxt, setNormalTxt] = useState(paraCampo(artigo.precoNormal))

  const refQuantidade = useRef<HTMLInputElement>(null)
  const refPrimeiro = useRef<HTMLInputElement>(null)
  useEffect(() => {
    ;(foco === 'quantidade' ? refQuantidade : refPrimeiro).current?.focus()
  }, [foco])

  const q = lerNumero(quantidade) ?? 0
  const aoPeso = unidade === 'kg' || unidade === 'L'
  const temPeso = unidade !== 'dz'
  const temPrecoUn = unidade === 'un' || unidade === 'dz'
  const emLitros = pesoUn === 'ml' || pesoUn === 'L'
  const ref = emLitros || unidade === 'L' ? 'L' : 'kg'

  const valor = (c: Campo) => (escritos[c] ? lerNumero(textos[c]) : null)
  const deCada = unidade === 'un' && pesoModo === 'cada'
  const pesoNum = temPeso && !deCada ? valor('peso') : null
  const cadaNum = lerNumero(cadaTxt)
  const conteudo = deCada ? (cadaNum ? { quantidade: cadaNum, unidade: cadaUn } : null) : produto.conteudo
  const precoNormal = gratis ? null : lerNumero(normalTxt)
  const rascunho: CamposArtigo = {
    quantidade: q,
    unidade,
    pesoTotal: pesoNum != null ? { quantidade: pesoNum, unidade: pesoUn } : null,
    precoKg: temPeso ? valor('precoKg') : null,
    precoUnitario: temPrecoUn ? valor('precoUn') : null,
    totalManual: valor('total'),
    precoNormal,
    gratis,
  }
  const contas = contasArtigo(rascunho, { ...produto, conteudo })

  // O que aparece em cada campo: o que se escreveu, ou o valor calculado (a cinzento).
  const pesoCalculado = contas.peso
    ? pesoUn === 'g' || pesoUn === 'ml'
      ? String(Math.round(contas.peso.valor * 1000))
      : paraCampo(arredondar(contas.peso.valor, 3))
    : ''
  const mostrado: Record<Campo, string> = {
    peso: escritos.peso ? textos.peso : pesoCalculado,
    precoKg: escritos.precoKg ? textos.precoKg : contas.aoQuilo ? paraCampoEuros(contas.aoQuilo.valor) : '',
    precoUn: escritos.precoUn ? textos.precoUn : contas.unitario != null ? paraCampoEuros(contas.unitario) : '',
    total: escritos.total ? textos.total : contas.temPreco ? paraCampoEuros(contas.valorPrateleira) : '',
  }

  function escrever(c: Campo, texto: string) {
    setTextos((t) => ({ ...t, [c]: texto }))
    setEscritos((e) => ({ ...e, [c]: texto.trim() !== '' }))
  }

  function campo(c: Campo, rotulo: string, opcoes: { primeiro?: boolean; grande?: boolean } = {}) {
    return (
      <div>
        <label className={opcoes.grande ? 'rotulo-forte' : 'bloco-rotulo'} htmlFor={`campo-${c}`}>
          {rotulo}
        </label>
        <input
          id={`campo-${c}`}
          ref={opcoes.primeiro ? refPrimeiro : undefined}
          className={'campo numero' + (opcoes.grande ? ' grande' : ' pequeno') + (escritos[c] ? '' : ' calculado')}
          inputMode="decimal"
          placeholder="—"
          value={mostrado[c]}
          onChange={(e) => escrever(c, e.target.value)}
          onFocus={selecionarTudo}
        />
      </div>
    )
  }

  async function guardar(meterNoCarrinho: boolean) {
    const mudancas: Partial<Artigo> = {
      unidade,
      pesoTotal: rascunho.pesoTotal,
      precoKg: rascunho.precoKg,
      precoUnitario: rascunho.precoUnitario,
      totalManual: rascunho.totalManual,
      precoNormal,
      gratis,
    }
    // Peso de cada embalagem: fica guardado no produto.
    if (deCada && (conteudo?.quantidade !== produto.conteudo?.quantidade || conteudo?.unidade !== produto.conteudo?.unidade)) {
      await alterarProduto(produto.id, { conteudo })
    }
    if (q > 0) mudancas.quantidade = q
    // Produto de preço fixo por unidade, sem nada escrito: aceita o último preço.
    const nadaEscrito = !Object.values(escritos).some(Boolean)
    if (meterNoCarrinho && nadaEscrito && temPrecoUn && !produto.conteudo && produto.unidade === unidade && produto.ultimoPreco != null) {
      mudancas.precoUnitario = produto.ultimoPreco
    }
    if (meterNoCarrinho) {
      mudancas.noCarrinho = true
      mudancas.porComprar = false
    }
    await alterarArtigo(artigo.id, mudancas)
    if (meterNoCarrinho) aviso(`${produto.nome} no carrinho`)
    aoFechar()
  }

  async function tirar() {
    await apagarArtigo(artigo.id)
    aviso(`${produto.nome} saiu da lista`)
    aoFechar()
  }

  const porCada =
    unidade === 'un' && contas.peso && q > 0 && !aoPeso
      ? `Cada um: ${contas.peso.unidade === 'kg' ? `${Math.round((contas.peso.valor / q) * 1000)} g` : `${Math.round((contas.peso.valor / q) * 1000)} ml`}${contas.temPreco ? ` · ${euros(contas.valorPrateleira / q)}` : ''}`
      : null

  return (
    <Folha titulo={produto.nome} aoFechar={aoFechar}>
      <div className="bloco">
        <label className="rotulo-forte" htmlFor="quantidade">
          Quantidade pedida
        </label>
        <div className="linha-campos">
          <input
            id="quantidade"
            ref={refQuantidade}
            className="campo numero grande"
            inputMode="decimal"
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            onFocus={selecionarTudo}
          />
          <Segmentos opcoes={UNIDADES} valor={unidade} aoMudar={setUnidade} />
        </div>
        {contas.sugerido && (
          <p className="nota">
            Estimativa pela última compra:{' '}
            {contas.peso && !aoPeso ? `≈ ${numero(arredondar(contas.peso.valor, 2))} ${contas.peso.unidade}, ` : ''}≈{' '}
            {euros(contas.total)}
          </p>
        )}
      </div>

      <div className="caixa-compra">
        <div className="caixa-compra-titulo">NA COMPRA</div>
        <button
          type="button"
          className={'botao pequeno chip-gratis' + (gratis ? ' ativo' : '')}
          aria-pressed={gratis}
          onClick={() => setGratis(!gratis)}
        >
          {gratis ? '✓ ' : ''}Grátis (pontos ou cupão)
        </button>
        <div className="grelha-campos" style={{ marginTop: 10 }}>
          {temPeso && (
            <div>
              <div className="rotulo-com-escolha">
                <label className="rotulo-forte" htmlFor="campo-peso" style={{ margin: 0 }}>
                  Peso
                </label>
                {unidade === 'un' && (
                  <div className="segmentos-pequenos">
                    <Segmentos
                      opcoes={[
                        { valor: 'tudo', rotulo: 'de tudo' },
                        { valor: 'cada', rotulo: 'de cada' },
                      ]}
                      valor={pesoModo}
                      aoMudar={setPesoModo}
                    />
                  </div>
                )}
              </div>
              <div className="campo-com-unidade">
                <input
                  id="campo-peso"
                  ref={refPrimeiro}
                  className={'campo numero grande' + (deCada || escritos.peso ? '' : ' calculado')}
                  inputMode="decimal"
                  placeholder="—"
                  value={deCada ? cadaTxt : mostrado.peso}
                  onChange={(e) => (deCada ? setCadaTxt(e.target.value) : escrever('peso', e.target.value))}
                  onFocus={selecionarTudo}
                />
                <button
                  type="button"
                  className="botao pequeno"
                  aria-label="Mudar a unidade do peso"
                  onClick={() => {
                    // Converte o que já está escrito: 625 g passa a 0,625 kg.
                    const trocar = { g: 'kg', kg: 'g', ml: 'L', L: 'ml' } as const
                    const converter = (texto: string, nova: UnidadeConteudo) => {
                      const n = lerNumero(texto)
                      if (n == null) return texto
                      return paraCampo(arredondar(n * (nova === 'g' || nova === 'ml' ? 1000 : 1 / 1000), 3))
                    }
                    if (deCada) {
                      const nova = trocar[cadaUn]
                      setCadaTxt((t) => converter(t, nova))
                      setCadaUn(nova)
                    } else {
                      const nova = trocar[pesoUn]
                      if (escritos.peso) setTextos((t) => ({ ...t, peso: converter(t.peso, nova) }))
                      setPesoUn(nova)
                    }
                  }}
                >
                  {deCada ? cadaUn : pesoUn}
                </button>
              </div>
              {deCada && cadaNum != null && q > 0 && (
                <div className="contagem" style={{ fontSize: 12, marginTop: 4 }}>
                  {numero(q)} × {numero(cadaNum)} {cadaUn} = {numero(arredondar(q * cadaNum, 3))} {cadaUn}
                </div>
              )}
            </div>
          )}
          {campo('total', gratis ? 'Valor na prateleira' : 'Total pago', { grande: true, primeiro: !temPeso })}
        </div>
        <div className="grelha-campos" style={{ marginTop: 10 }}>
          {temPeso && campo('precoKg', `Preço/${ref}`)}
          {temPrecoUn && campo('precoUn', `Preço/${unidade}`)}
          {!gratis && (
            <div>
              <label className="bloco-rotulo" htmlFor="campo-normal">
                Preço normal/{unidade} (sem promoção)
              </label>
              <input
                id="campo-normal"
                className="campo numero pequeno"
                inputMode="decimal"
                placeholder="—"
                value={normalTxt}
                onChange={(e) => setNormalTxt(e.target.value)}
                onFocus={selecionarTudo}
              />
            </div>
          )}
        </div>
      </div>

      <div className="caixa-info">
        <div className="resumo-linha grande">
          <span>Total{contas.sugerido ? ' (estimado)' : ''}</span>
          <span>{contas.temPreco ? euros(contas.total) : '—'}</span>
        </div>
        {contas.aoQuilo && (
          <div className="resumo-linha">
            <span>Ao {contas.aoQuilo.unidade === 'kg' ? 'quilo' : 'litro'}</span>
            <span>
              {euros(contas.aoQuilo.valor)}/{contas.aoQuilo.unidade}
            </span>
          </div>
        )}
        {contas.poupanca > 0 && (
          <div className="resumo-linha texto-destaque" style={{ fontSize: 15 }}>
            <span>{contas.tipoPoupanca === 'gratis' ? 'Poupaste com pontos ou cupão' : 'Poupaste na promoção'}</span>
            <span>{euros(contas.poupanca)}</span>
          </div>
        )}
        {porCada && (
          <div className="resumo-linha">
            <span>{porCada}</span>
          </div>
        )}
        {produto.ultimoPrecoRef != null || produto.ultimoPreco != null ? (
          <div className="resumo-linha" style={{ fontSize: 14 }}>
            <span>Da última vez</span>
            <span>
              {produto.ultimoPrecoRef != null
                ? `${euros(produto.ultimoPrecoRef)}/${produto.conteudo?.unidade === 'ml' || produto.unidade === 'L' ? 'L' : 'kg'}`
                : `${euros(produto.ultimoPreco!)}/${produto.unidade}`}
            </span>
          </div>
        ) : null}
      </div>

      {contas.incoerente && (
        <div className="caixa-aviso" style={{ marginTop: 8 }}>
          Os valores não batem certo: pelas contas, o total devia ser {euros(contas.incoerente.totalEsperado)}. Confirma o
          peso e o total.
        </div>
      )}
      {contas.subida && (
        <div className="caixa-aviso" style={{ marginTop: 8 }}>
          {contas.subida.base === 'unidade'
            ? `Subiu ${euros(contas.subida.diferenca)} (+${contas.subida.percentagem} %) desde a última compra`
            : `Ao ${contas.subida.base === 'kg' ? 'quilo' : 'litro'}, subiu ${euros(contas.subida.diferenca)} (+${contas.subida.percentagem} %) desde a última compra`}
        </div>
      )}

      <div className="botoes-folha">
        {!artigo.noCarrinho && (
          <button className="botao principal largo" onClick={() => guardar(true)}>
            Guardar e pôr no carrinho
          </button>
        )}
        <button className={'botao largo' + (artigo.noCarrinho ? ' principal' : '')} onClick={() => guardar(false)}>
          Guardar
        </button>
        <button className="botao pequeno largo" onClick={aoEditarProduto}>
          Editar produto (nome, secção, peso da embalagem)
        </button>
        <button className="botao perigo largo" onClick={tirar}>
          Tirar da lista
        </button>
      </div>
    </Folha>
  )
}
