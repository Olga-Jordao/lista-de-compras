import { useEffect, useRef, useState } from 'react'
import { alterarArtigo, alterarProduto, apagarArtigo } from '../lib/acoes'
import { euros, lerNumero, numero, paraCampo } from '../lib/numeros'
import { precoReferencia, subidaDePreco, totalLinha } from '../lib/precos'
import type { Artigo, Produto, Unidade, UnidadeConteudo } from '../lib/tipos'
import { useAviso } from './AvisoRapido'
import { Folha, Segmentos } from './Folha'

const UNIDADES: { valor: Unidade; rotulo: string }[] = [
  { valor: 'un', rotulo: 'un' },
  { valor: 'dz', rotulo: 'dz' },
  { valor: 'kg', rotulo: 'kg' },
  { valor: 'L', rotulo: 'L' },
]

const UNIDADES_CONTEUDO: { valor: UnidadeConteudo; rotulo: string }[] = [
  { valor: 'g', rotulo: 'g' },
  { valor: 'kg', rotulo: 'kg' },
  { valor: 'ml', rotulo: 'ml' },
  { valor: 'L', rotulo: 'L' },
]

const selecionarTudo = (e: React.FocusEvent<HTMLInputElement>) => e.target.select()

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
  const [quantidade, setQuantidade] = useState(paraCampo(artigo.quantidade))
  const [unidade, setUnidade] = useState<Unidade>(artigo.unidade)
  const [modoPreco, setModoPreco] = useState<'unitario' | 'etiqueta'>(artigo.totalManual != null ? 'etiqueta' : 'unitario')
  const sugestao = produto.ultimoPreco != null && artigo.unidade === produto.unidade ? produto.ultimoPreco : null
  const [preco, setPreco] = useState(paraCampo(artigo.precoUnitario ?? sugestao))
  const [precoTocado, setPrecoTocado] = useState(false)
  const [etiqueta, setEtiqueta] = useState(paraCampo(artigo.totalManual))
  const [conteudoQtd, setConteudoQtd] = useState(paraCampo(produto.conteudo?.quantidade))
  const [conteudoUn, setConteudoUn] = useState<UnidadeConteudo>(produto.conteudo?.unidade ?? 'g')
  const [fixo, setFixo] = useState(artigo.fixo)

  const refQuantidade = useRef<HTMLInputElement>(null)
  const refPreco = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const alvo = foco === 'preco' ? refPreco : refQuantidade
    alvo.current?.focus()
  }, [foco])

  const q = lerNumero(quantidade) ?? 0
  const precoNum = lerNumero(preco)
  const etiquetaNum = lerNumero(etiqueta)
  const conteudoNum = lerNumero(conteudoQtd)
  const conteudo = unidade === 'un' && conteudoNum ? { quantidade: conteudoNum, unidade: conteudoUn } : null

  const total =
    modoPreco === 'etiqueta'
      ? totalLinha({ quantidade: q, precoUnitario: null, totalManual: etiquetaNum })
      : totalLinha({ quantidade: q, precoUnitario: precoNum, totalManual: null })
  const efetivo = modoPreco === 'etiqueta' ? (etiquetaNum != null && q > 0 ? etiquetaNum / q : null) : precoNum
  const ref = precoReferencia(efetivo, unidade, conteudo)
  const subida = subidaDePreco({ ...produto, conteudo }, efetivo, unidade)

  async function guardar(meterNoCarrinho: boolean) {
    const mudancas: Partial<Artigo> = { unidade, fixo }
    if (q > 0) mudancas.quantidade = q
    if (modoPreco === 'etiqueta') {
      mudancas.totalManual = etiquetaNum
      mudancas.precoUnitario = null
    } else {
      mudancas.totalManual = null
      if (precoTocado || (meterNoCarrinho && artigo.precoUnitario == null)) mudancas.precoUnitario = precoNum
    }
    if (meterNoCarrinho) {
      mudancas.noCarrinho = true
      mudancas.porComprar = false
    }
    await alterarArtigo(artigo.id, mudancas)

    const conteudoAntes = produto.conteudo
    const mudouConteudo =
      unidade === 'un' &&
      (conteudo?.quantidade !== conteudoAntes?.quantidade || (conteudo && conteudo.unidade !== conteudoAntes?.unidade))
    if (mudouConteudo) await alterarProduto(produto.id, { conteudo })
    if (meterNoCarrinho) aviso(`${produto.nome} no carrinho`)
    aoFechar()
  }

  async function tirar() {
    await apagarArtigo(artigo.id)
    aviso(`${produto.nome} saiu da lista`)
    aoFechar()
  }

  return (
    <Folha titulo={produto.nome} aoFechar={aoFechar}>
      <div className="bloco">
        <label className="bloco-rotulo" htmlFor="quantidade">
          Quantidade a comprar
        </label>
        <div className="linha-campos">
          <input
            id="quantidade"
            ref={refQuantidade}
            className="campo numero"
            inputMode="decimal"
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            onFocus={selecionarTudo}
          />
          <Segmentos opcoes={UNIDADES} valor={unidade} aoMudar={setUnidade} />
        </div>
      </div>

      <div className="bloco">
        <Segmentos
          opcoes={[
            { valor: 'unitario', rotulo: `Preço por ${unidade}` },
            { valor: 'etiqueta', rotulo: 'Total da etiqueta' },
          ]}
          valor={modoPreco}
          aoMudar={setModoPreco}
        />
      </div>

      <div className="bloco">
        {modoPreco === 'unitario' ? (
          <>
            <label className="bloco-rotulo" htmlFor="preco">
              Preço por {unidade} (€)
            </label>
            <input
              id="preco"
              ref={refPreco}
              className="campo numero"
              inputMode="decimal"
              placeholder="0,00"
              value={preco}
              onChange={(e) => {
                setPreco(e.target.value)
                setPrecoTocado(true)
              }}
              onFocus={selecionarTudo}
            />
          </>
        ) : (
          <>
            <label className="bloco-rotulo" htmlFor="etiqueta">
              Total que diz a etiqueta (€)
            </label>
            <input
              id="etiqueta"
              ref={refPreco}
              className="campo numero"
              inputMode="decimal"
              placeholder="0,00"
              value={etiqueta}
              onChange={(e) => setEtiqueta(e.target.value)}
              onFocus={selecionarTudo}
            />
            <p className="nota">Acerta também a quantidade com o peso da etiqueta, para o preço ao quilo ficar certo.</p>
          </>
        )}
        {produto.ultimoPreco != null && (
          <p className="nota">
            Da última vez: {euros(produto.ultimoPreco)}/{produto.unidade}
            {produto.ultimoPrecoRef != null && produto.unidade === 'un' && produto.conteudo
              ? ` (${euros(produto.ultimoPrecoRef)}/${produto.conteudo.unidade === 'g' || produto.conteudo.unidade === 'kg' ? 'kg' : 'L'})`
              : ''}
            {produto.ultimoPrecoData ? `, a ${new Date(produto.ultimoPrecoData).toLocaleDateString('pt-PT')}` : ''}
          </p>
        )}
        {subida && (
          <div className="caixa-aviso">
            {subida.base === 'unidade'
              ? `Subiu ${euros(subida.diferenca)} (+${subida.percentagem} %) desde a última compra`
              : `Ao ${subida.base === 'kg' ? 'quilo' : 'litro'}, subiu ${euros(subida.diferenca)} (+${subida.percentagem} %) desde a última compra`}
          </div>
        )}
      </div>

      {unidade === 'un' && (
        <div className="bloco">
          <label className="bloco-rotulo" htmlFor="conteudo">
            Quanto leva a embalagem (para o preço ao kg ou ao L)
          </label>
          <div className="linha-campos">
            <input
              id="conteudo"
              className="campo numero"
              inputMode="decimal"
              placeholder="ex.: 500"
              value={conteudoQtd}
              onChange={(e) => setConteudoQtd(e.target.value)}
              onFocus={selecionarTudo}
            />
            <Segmentos opcoes={UNIDADES_CONTEUDO} valor={conteudoUn} aoMudar={setConteudoUn} />
          </div>
        </div>
      )}

      <div className="caixa-info">
        <div className="resumo-linha grande">
          <span>Total</span>
          <span>{euros(total)}</span>
        </div>
        {ref && unidade === 'un' && (
          <div className="resumo-linha">
            <span>Ao {ref.unidade === 'kg' ? 'quilo' : 'litro'}</span>
            <span>
              {euros(ref.valor)}/{ref.unidade}
            </span>
          </div>
        )}
        {modoPreco === 'etiqueta' && ref && unidade !== 'un' && q > 0 && (
          <div className="resumo-linha">
            <span>
              {numero(q)} {unidade} a
            </span>
            <span>
              {euros(ref.valor)}/{ref.unidade}
            </span>
          </div>
        )}
      </div>

      <div className="bloco">
        <Segmentos
          opcoes={[
            { valor: 'fixo', rotulo: 'Fica sempre na lista' },
            { valor: 'uma', rotulo: 'Só desta vez' },
          ]}
          valor={fixo ? 'fixo' : 'uma'}
          aoMudar={(v) => setFixo(v === 'fixo')}
        />
      </div>

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
          Mudar nome ou secção do produto
        </button>
        <button className="botao perigo largo" onClick={tirar}>
          Tirar da lista
        </button>
      </div>
    </Folha>
  )
}
