import { useEffect, useRef, useState } from 'react'
import { alterarArtigo, apagarArtigo, contasArtigo, type CamposArtigo } from '../lib/acoes'
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
  const pesoNum = temPeso ? valor('peso') : null
  const rascunho: CamposArtigo = {
    quantidade: q,
    unidade,
    pesoTotal: pesoNum != null ? { quantidade: pesoNum, unidade: pesoUn } : null,
    precoKg: temPeso ? valor('precoKg') : null,
    precoUnitario: temPrecoUn ? valor('precoUn') : null,
    totalManual: valor('total'),
  }
  const contas = contasArtigo(rascunho, produto)

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
    total: escritos.total ? textos.total : contas.temPreco ? paraCampoEuros(contas.total) : '',
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
      ? `Cada um: ${contas.peso.unidade === 'kg' ? `${Math.round((contas.peso.valor / q) * 1000)} g` : `${Math.round((contas.peso.valor / q) * 1000)} ml`}${contas.temPreco ? ` · ${euros(contas.total / q)}` : ''}`
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
        <div className="grelha-campos">
          {temPeso && (
            <div>
              <label className="rotulo-forte" htmlFor="campo-peso">
                Peso
              </label>
              <div className="campo-com-unidade">
                <input
                  id="campo-peso"
                  ref={refPrimeiro}
                  className={'campo numero grande' + (escritos.peso ? '' : ' calculado')}
                  inputMode="decimal"
                  placeholder="—"
                  value={mostrado.peso}
                  onChange={(e) => escrever('peso', e.target.value)}
                  onFocus={selecionarTudo}
                />
                <button
                  type="button"
                  className="botao pequeno"
                  aria-label="Mudar a unidade do peso"
                  onClick={() => {
                    const nova = ({ g: 'kg', kg: 'g', ml: 'L', L: 'ml' } as const)[pesoUn]
                    // Converte o que já está escrito: 625 g passa a 0,625 kg.
                    const n = lerNumero(textos.peso)
                    if (escritos.peso && n != null) {
                      const fator = nova === 'g' || nova === 'ml' ? 1000 : 1 / 1000
                      setTextos((t) => ({ ...t, peso: paraCampo(arredondar(n * fator, 3)) }))
                    }
                    setPesoUn(nova)
                  }}
                >
                  {pesoUn}
                </button>
              </div>
            </div>
          )}
          {campo('total', 'Total pago', { grande: true, primeiro: !temPeso })}
        </div>
        <div className="grelha-campos" style={{ marginTop: 10 }}>
          {temPeso && campo('precoKg', `Preço/${ref}`)}
          {temPrecoUn && campo('precoUn', `Preço/${unidade}`)}
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
