import { useState } from 'react'
import {
  acrescentarLinhaCompra,
  alterarLinhaCompra,
  alterarPagoNaCaixa,
  pesoDaLinha,
  tirarLinhaCompra,
  type ValoresLinha,
} from '../lib/acoes'
import { arredondar, euros, lerNumero, paraCampo, paraCampoEuros } from '../lib/numeros'
import type { Compra, LinhaCompra, Produto, Unidade } from '../lib/tipos'
import { normalizar, useProdutos } from '../lib/usar'
import { useAviso } from './AvisoRapido'
import { Folha, Segmentos } from './Folha'

const UNIDADES: { valor: Unidade; rotulo: string }[] = [
  { valor: 'un', rotulo: 'un' },
  { valor: 'dz', rotulo: 'dz' },
  { valor: 'kg', rotulo: 'kg' },
  { valor: 'L', rotulo: 'L' },
]

const MOTIVOS = ['Pontos', 'Cupão', 'Promoção', 'Outro']

const selecionarTudo = (e: React.FocusEvent<HTMLInputElement>) => e.target.select()

/**
 * Corrigir um artigo de uma compra já fechada, ou acrescentar um que ficou por marcar.
 * Com `linha` null, começa por escolher o produto do catálogo.
 */
export function FolhaLinhaCompra({ compra, linha, aoFechar }: { compra: Compra; linha: LinhaCompra | null; aoFechar: () => void }) {
  const aviso = useAviso()
  const produtos = useProdutos()
  const [produto, setProduto] = useState<Produto | null>(null)
  const [procura, setProcura] = useState('')
  const nome = linha?.nome ?? produto?.nome ?? ''

  const pesoInicial = linha ? pesoDaLinha(linha) : null
  const [unidade, setUnidade] = useState<Unidade>(linha?.unidade ?? 'un')
  const [quantidade, setQuantidade] = useState(paraCampo(linha?.quantidade ?? 1))
  const [peso, setPeso] = useState(
    pesoInicial && !(linha && (linha.unidade === 'kg' || linha.unidade === 'L')) ? paraCampo(arredondar(pesoInicial.valor, 3)) : '',
  )
  const [gratis, setGratis] = useState(linha?.tipoPoupanca === 'gratis')
  const [valor, setValor] = useState(
    linha ? paraCampoEuros(linha.tipoPoupanca === 'gratis' ? (linha.poupanca ?? 0) : linha.total) : '',
  )
  const [normal, setNormal] = useState(paraCampo(linha?.precoNormal))

  const q = lerNumero(quantidade) ?? 0
  const v = lerNumero(valor)
  const p = lerNumero(peso)
  const aoPeso = unidade === 'kg' || unidade === 'L'
  const valores: ValoresLinha | null =
    q > 0 && v != null
      ? {
          quantidade: q,
          peso: !aoPeso && p ? { valor: p, unidade: 'kg' } : null,
          valor: v,
          precoNormal: gratis ? null : lerNumero(normal),
          gratis,
        }
      : null

  async function guardar() {
    if (!valores) return
    if (linha) await alterarLinhaCompra(compra.id, linha.produtoId, valores)
    else if (produto) await acrescentarLinhaCompra(compra.id, produto, unidade, valores)
    aviso('Compra corrigida')
    aoFechar()
  }

  async function tirar() {
    if (!linha) return
    if (!confirm(`Tirar «${linha.nome}» desta compra?`)) return
    await tirarLinhaCompra(compra.id, linha.produtoId)
    aviso(`${linha.nome} saiu da compra`)
    aoFechar()
  }

  // Acrescentar: primeiro escolhe-se o produto.
  if (!linha && !produto) {
    const termo = normalizar(procura)
    const naCompra = new Set(compra.linhas.map((l) => l.produtoId))
    const encontrados = produtos.filter((x) => !naCompra.has(x.id) && (!termo || normalizar(x.nome).includes(termo))).slice(0, 12)
    return (
      <Folha titulo="Acrescentar à compra" aoFechar={aoFechar}>
        <input className="campo" placeholder="Procurar no catálogo…" value={procura} onChange={(e) => setProcura(e.target.value)} />
        <div className="sugestoes">
          {encontrados.map((x) => (
            <button
              key={x.id}
              className="sugestao"
              onClick={() => {
                setProduto(x)
                setUnidade(x.unidade)
              }}
            >
              <span>{x.nome}</span>
              <span className="extra">{x.ultimoPreco != null ? `${euros(x.ultimoPreco)}/${x.unidade}` : ''}</span>
            </button>
          ))}
          {encontrados.length === 0 && <p className="nota" style={{ padding: '0 14px' }}>Não está no catálogo. Cria-o primeiro no Catálogo.</p>}
        </div>
      </Folha>
    )
  }

  return (
    <Folha titulo={nome} aoFechar={aoFechar}>
      <div className="bloco">
        <label className="rotulo-forte" htmlFor="linha-q">
          Quantidade
        </label>
        <div className="linha-campos">
          <input id="linha-q" className="campo numero grande" inputMode="decimal" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} onFocus={selecionarTudo} />
          {linha ? (
            <span className="contagem" style={{ alignSelf: 'center' }}>
              {unidade}
            </span>
          ) : (
            <Segmentos opcoes={UNIDADES} valor={unidade} aoMudar={setUnidade} />
          )}
        </div>
      </div>

      <div className="caixa-compra">
        <button type="button" className={'botao pequeno chip-gratis' + (gratis ? ' ativo' : '')} aria-pressed={gratis} onClick={() => setGratis(!gratis)}>
          {gratis ? '✓ ' : ''}Grátis (pontos ou cupão)
        </button>
        <div className="grelha-campos" style={{ marginTop: 10 }}>
          {!aoPeso && (
            <div>
              <label className="bloco-rotulo" htmlFor="linha-peso">
                Peso de tudo, em kg (opcional)
              </label>
              <input id="linha-peso" className="campo numero pequeno" inputMode="decimal" placeholder="—" value={peso} onChange={(e) => setPeso(e.target.value)} onFocus={selecionarTudo} />
            </div>
          )}
          <div>
            <label className="rotulo-forte" htmlFor="linha-valor">
              {gratis ? 'Valor na prateleira' : 'Total pago'}
            </label>
            <input id="linha-valor" className="campo numero grande" inputMode="decimal" placeholder="0,00" value={valor} onChange={(e) => setValor(e.target.value)} onFocus={selecionarTudo} />
          </div>
          {!gratis && (
            <div>
              <label className="bloco-rotulo" htmlFor="linha-normal">
                Preço normal/{unidade} (sem promoção)
              </label>
              <input id="linha-normal" className="campo numero pequeno" inputMode="decimal" placeholder="—" value={normal} onChange={(e) => setNormal(e.target.value)} onFocus={selecionarTudo} />
            </div>
          )}
        </div>
      </div>

      <div className="botoes-folha">
        <button className="botao principal largo" disabled={!valores} onClick={guardar}>
          {linha ? 'Guardar' : 'Acrescentar à compra'}
        </button>
        {linha && (
          <button className="botao perigo largo" onClick={tirar}>
            Tirar desta compra
          </button>
        )}
      </div>
    </Folha>
  )
}

/** O que se pagou na caixa, escrito na hora ou mais tarde (com o talão na mão). */
export function FolhaCaixa({ compra, aoFechar }: { compra: Compra; aoFechar: () => void }) {
  const aviso = useAviso()
  const [pago, setPago] = useState(paraCampo(compra.totalPago))
  const [motivo, setMotivo] = useState<string | null>(compra.motivoDesconto)
  const pagoNum = lerNumero(pago)
  const diferenca = pagoNum != null ? arredondar(compra.totalCarrinho - pagoNum) : 0

  async function guardar() {
    const diferente = pagoNum != null && pagoNum !== compra.totalCarrinho
    await alterarPagoNaCaixa(compra.id, diferente ? pagoNum : null, diferente && diferenca > 0 ? motivo : null)
    aviso('Valor pago guardado')
    aoFechar()
  }

  return (
    <Folha titulo="Pago na caixa" aoFechar={aoFechar}>
      <div className="caixa-info">
        <div className="resumo-linha">
          <span>Total do carrinho</span>
          <span>{euros(compra.totalCarrinho)}</span>
        </div>
      </div>
      <div className="bloco">
        <label className="rotulo-forte" htmlFor="caixa-pago">
          Quanto pagaste na caixa?
        </label>
        <input
          id="caixa-pago"
          className="campo numero grande"
          inputMode="decimal"
          placeholder={paraCampoEuros(compra.totalCarrinho)}
          value={pago}
          onChange={(e) => setPago(e.target.value)}
          onFocus={selecionarTudo}
        />
        {diferenca > 0 && (
          <>
            <p className="caixa-info" style={{ marginTop: 8, fontWeight: 600 }}>
              Poupaste {euros(diferenca)}. De onde veio?
            </p>
            <div className="grelha-seccoes" style={{ marginTop: 8 }}>
              {MOTIVOS.map((m) => (
                <button key={m} type="button" className={'botao' + (motivo === m ? ' ativo' : '')} onClick={() => setMotivo(motivo === m ? null : m)}>
                  {m}
                </button>
              ))}
            </div>
          </>
        )}
        {diferenca < 0 && (
          <p className="caixa-aviso" style={{ marginTop: 8 }}>
            Pagaste mais {euros(-diferenca)} do que o carrinho. Confirma os preços dos artigos.
          </p>
        )}
      </div>
      <div className="botoes-folha">
        <button className="botao principal largo" onClick={guardar}>
          Guardar
        </button>
      </div>
    </Folha>
  )
}
