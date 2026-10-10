import { useEffect, useRef, useState } from 'react'
import { alterarArtigo, alterarProduto, apagarArtigo, contasArtigo } from '../lib/acoes'
import { arredondar, euros, lerNumero, paraCampo } from '../lib/numeros'
import type { Artigo, Produto, Unidade, UnidadeConteudo } from '../lib/tipos'
import { useAviso } from './AvisoRapido'
import { Folha, Segmentos } from './Folha'

const UNIDADES: { valor: Unidade; rotulo: string }[] = [
  { valor: 'un', rotulo: 'un' },
  { valor: 'dz', rotulo: 'dz' },
  { valor: 'kg', rotulo: 'kg' },
  { valor: 'L', rotulo: 'L' },
]

const UNIDADES_PESO: { valor: UnidadeConteudo; rotulo: string }[] = [
  { valor: 'g', rotulo: 'g' },
  { valor: 'kg', rotulo: 'kg' },
  { valor: 'ml', rotulo: 'ml' },
  { valor: 'L', rotulo: 'L' },
]

const selecionarTudo = (e: React.FocusEvent<HTMLInputElement>) => e.target.select()

/**
 * Painel de um artigo da lista. O preço escreve-se de uma de duas formas, a que
 * estiver à mão: o preço por unidade (prateleira) ou o total pago (etiqueta, talão).
 * A outra calcula-se, e o preço ao quilo sai do total e do peso.
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
  const [quantidade, setQuantidade] = useState(paraCampo(artigo.quantidade))
  const [unidade, setUnidade] = useState<Unidade>(artigo.unidade)
  const [editado, setEditado] = useState<'preco' | 'total' | null>(
    artigo.totalManual != null ? 'total' : artigo.precoUnitario != null ? 'preco' : null,
  )
  const [precoTxt, setPrecoTxt] = useState(paraCampo(artigo.precoUnitario))
  const [totalTxt, setTotalTxt] = useState(paraCampo(artigo.totalManual))
  const pesoInicial = artigo.pesoTotal ?? produto.conteudo
  const [pesoModo, setPesoModo] = useState<'cada' | 'junto'>(artigo.pesoTotal ? 'junto' : 'cada')
  const [pesoTxt, setPesoTxt] = useState(paraCampo(pesoInicial?.quantidade))
  const [pesoUn, setPesoUn] = useState<UnidadeConteudo>(pesoInicial?.unidade ?? 'g')
  const [fixo, setFixo] = useState(artigo.fixo)

  const refQuantidade = useRef<HTMLInputElement>(null)
  const refPreco = useRef<HTMLInputElement>(null)
  const refTotal = useRef<HTMLInputElement>(null)
  useEffect(() => {
    // Ao peso (kg, L), na loja tem-se o total da etiqueta; à unidade, o preço da prateleira.
    const alvo = foco === 'quantidade' ? refQuantidade : artigo.unidade === 'kg' || artigo.unidade === 'L' ? refTotal : refPreco
    alvo.current?.focus()
  }, [foco, artigo.unidade])

  const q = lerNumero(quantidade) ?? 0
  const pesoNum = lerNumero(pesoTxt)
  const peso = unidade === 'un' && pesoNum ? { quantidade: pesoNum, unidade: pesoUn } : null

  // O artigo tal como está no painel, para as contas em tempo real.
  const rascunho: Pick<Artigo, 'quantidade' | 'unidade' | 'precoUnitario' | 'totalManual' | 'pesoTotal'> = {
    quantidade: q,
    unidade,
    precoUnitario: editado === 'preco' ? lerNumero(precoTxt) : editado === null ? artigo.precoUnitario : null,
    totalManual: editado === 'total' ? lerNumero(totalTxt) : null,
    pesoTotal: pesoModo === 'junto' ? peso : null,
  }
  const produtoRascunho = pesoModo === 'cada' && unidade === 'un' ? { ...produto, conteudo: peso } : produto
  const contas = contasArtigo(rascunho, produtoRascunho)

  const valorPreco =
    editado === 'preco' ? precoTxt : contas.unitario != null ? paraCampo(arredondar(contas.unitario, 2)) : ''
  const valorTotal = editado === 'total' ? totalTxt : contas.temPreco ? paraCampo(contas.total) : ''
  const nomeUnidade = { un: 'unidade', dz: 'dúzia', kg: 'kg', L: 'litro' }[unidade]

  async function guardar(meterNoCarrinho: boolean) {
    const mudancas: Partial<Artigo> = { unidade, fixo, pesoTotal: rascunho.pesoTotal }
    if (q > 0) mudancas.quantidade = q
    if (editado === 'total') {
      mudancas.totalManual = rascunho.totalManual
      mudancas.precoUnitario = null
    } else if (editado === 'preco') {
      mudancas.precoUnitario = rascunho.precoUnitario
      mudancas.totalManual = null
    } else if (meterNoCarrinho && contas.sugerido) {
      // Aceita a sugestão do último preço.
      mudancas.precoUnitario = contas.unitario
    }
    if (meterNoCarrinho) {
      mudancas.noCarrinho = true
      mudancas.porComprar = false
    }
    await alterarArtigo(artigo.id, mudancas)

    if (unidade === 'un' && pesoModo === 'cada') {
      const antes = produto.conteudo
      if (peso?.quantidade !== antes?.quantidade || peso?.unidade !== antes?.unidade) {
        await alterarProduto(produto.id, { conteudo: peso })
      }
    }
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
          {unidade === 'kg' || unidade === 'L' ? 'Quantidade (na loja, o peso da etiqueta)' : 'Quantidade a comprar'}
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
        <div className="linha-campos">
          <div>
            <label className="bloco-rotulo" htmlFor="preco">
              Preço por {nomeUnidade}
            </label>
            <input
              id="preco"
              ref={refPreco}
              className={'campo numero' + (editado === 'preco' ? '' : ' calculado')}
              inputMode="decimal"
              placeholder="0,00"
              value={valorPreco}
              onChange={(e) => {
                setEditado('preco')
                setPrecoTxt(e.target.value)
              }}
              onFocus={selecionarTudo}
            />
          </div>
          <div>
            <label className="bloco-rotulo" htmlFor="total">
              Total pago
            </label>
            <input
              id="total"
              ref={refTotal}
              className={'campo numero' + (editado === 'total' ? '' : ' calculado')}
              inputMode="decimal"
              placeholder="0,00"
              value={valorTotal}
              onChange={(e) => {
                setEditado('total')
                setTotalTxt(e.target.value)
              }}
              onFocus={selecionarTudo}
            />
          </div>
        </div>
        <p className="nota">
          {contas.sugerido
            ? 'Preço sugerido da última compra. Se mudou, escreve o novo num dos campos.'
            : 'Escreve o que tiveres à mão; o outro é calculado.'}
        </p>
      </div>

      {unidade === 'un' && (
        <div className="bloco">
          <span className="bloco-rotulo">Peso ou volume (para o preço ao quilo)</span>
          <Segmentos
            opcoes={[
              { valor: 'cada', rotulo: 'Cada um pesa' },
              { valor: 'junto', rotulo: 'Pesou tudo junto' },
            ]}
            valor={pesoModo}
            aoMudar={setPesoModo}
          />
          <div className="linha-campos" style={{ marginTop: 8 }}>
            <input
              id="peso"
              aria-label="Peso ou volume"
              className="campo numero"
              inputMode="decimal"
              placeholder={pesoModo === 'cada' ? 'ex.: 120' : 'ex.: 166'}
              value={pesoTxt}
              onChange={(e) => setPesoTxt(e.target.value)}
              onFocus={selecionarTudo}
            />
            <Segmentos opcoes={UNIDADES_PESO} valor={pesoUn} aoMudar={setPesoUn} />
          </div>
          <p className="nota">
            {pesoModo === 'cada'
              ? 'O que vem escrito na embalagem (nos enlatados, o peso escorrido). Fica guardado no produto.'
              : 'O peso da balança para tudo o que levas (o pão, por exemplo). Vale só para esta compra.'}
          </p>
        </div>
      )}

      <div className="caixa-info">
        <div className="resumo-linha grande">
          <span>Total</span>
          <span>{euros(contas.total)}</span>
        </div>
        {contas.aoQuilo && (
          <div className="resumo-linha">
            <span>Ao {contas.aoQuilo.unidade === 'kg' ? 'quilo' : 'litro'}</span>
            <span>
              {euros(contas.aoQuilo.valor)}/{contas.aoQuilo.unidade}
            </span>
          </div>
        )}
        {produto.ultimoPreco != null && (
          <div className="resumo-linha" style={{ fontSize: 14 }}>
            <span>Da última vez</span>
            <span>
              {euros(produto.ultimoPreco)}/{produto.unidade}
              {produto.ultimoPrecoRef != null && produto.unidade === 'un'
                ? ` · ${euros(produto.ultimoPrecoRef)}/${produto.conteudo?.unidade === 'ml' || produto.conteudo?.unidade === 'L' ? 'L' : 'kg'}`
                : ''}
            </span>
          </div>
        )}
      </div>
      {contas.subida && (
        <div className="caixa-aviso" style={{ marginTop: 8 }}>
          {contas.subida.base === 'unidade'
            ? `Subiu ${euros(contas.subida.diferenca)} (+${contas.subida.percentagem} %) desde a última compra`
            : `Ao ${contas.subida.base === 'kg' ? 'quilo' : 'litro'}, subiu ${euros(contas.subida.diferenca)} (+${contas.subida.percentagem} %) desde a última compra`}
        </div>
      )}

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
