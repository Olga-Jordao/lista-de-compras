import { useState } from 'react'
import { fecharCompra } from '../lib/acoes'
import { arredondar, euros, lerNumero } from '../lib/numeros'
import { useAviso } from './AvisoRapido'
import { Folha, Segmentos } from './Folha'

const MOTIVOS = ['Pontos', 'Cupão', 'Promoção', 'Outro']

export function FolhaFechar({
  listaId,
  listaNome,
  noCarrinho,
  totalCarrinho,
  ficam,
  semPreco,
  aoFechar,
}: {
  listaId: string
  listaNome: string
  noCarrinho: number
  totalCarrinho: number
  ficam: number
  semPreco: number
  aoFechar: () => void
}) {
  const aviso = useAviso()
  const [modo, setModo] = useState<'loja' | 'online'>('loja')
  const [pago, setPago] = useState('')
  const [motivo, setMotivo] = useState<string | null>(null)
  const pagoNum = lerNumero(pago)
  const poupanca = pagoNum != null ? arredondar(totalCarrinho - pagoNum) : 0

  async function fechar() {
    const diferente = pagoNum != null && pagoNum !== totalCarrinho
    await fecharCompra({
      listaId,
      modo,
      totalPago: diferente ? pagoNum : null,
      motivoDesconto: diferente && poupanca > 0 ? motivo : null,
    })
    aviso('Compra fechada e guardada')
    aoFechar()
  }

  return (
    <Folha titulo={`Fechar compra · ${listaNome}`} aoFechar={aoFechar}>
      <div className="caixa-info">
        <div className="resumo-linha">
          <span>No carrinho</span>
          <span>
            {noCarrinho} {noCarrinho === 1 ? 'artigo' : 'artigos'}
          </span>
        </div>
        <div className="resumo-linha grande">
          <span>Total</span>
          <span>{euros(totalCarrinho)}</span>
        </div>
      </div>

      {semPreco > 0 && (
        <p className="caixa-aviso" style={{ marginTop: 12 }}>
          {semPreco === 1 ? '1 artigo no carrinho não tem preço' : `${semPreco} artigos no carrinho não têm preço`} e conta
          como 0 €.
        </p>
      )}

      <div className="bloco">
        <span className="bloco-rotulo">Onde foi?</span>
        <Segmentos
          opcoes={[
            { valor: 'loja', rotulo: 'Na loja' },
            { valor: 'online', rotulo: 'Online' },
          ]}
          valor={modo}
          aoMudar={setModo}
        />
      </div>

      <div className="bloco">
        <label className="bloco-rotulo" htmlFor="pago">
          Quanto pagaste na caixa? (opcional)
        </label>
        <input
          id="pago"
          className="campo numero"
          inputMode="decimal"
          placeholder={euros(totalCarrinho)}
          value={pago}
          onChange={(e) => setPago(e.target.value)}
        />
        {poupanca > 0 && (
          <>
            <p className="caixa-info" style={{ marginTop: 8, fontWeight: 600 }}>
              Poupaste {euros(poupanca)}. De onde veio?
            </p>
            <div className="grelha-seccoes" style={{ marginTop: 8 }}>
              {MOTIVOS.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={'botao' + (motivo === m ? ' ativo' : '')}
                  onClick={() => setMotivo(motivo === m ? null : m)}
                >
                  {m}
                </button>
              ))}
            </div>
          </>
        )}
        {poupanca < 0 && <p className="caixa-aviso" style={{ marginTop: 8 }}>Pagaste mais {euros(-poupanca)} do que o carrinho. Confirma os preços.</p>}
      </div>

      <p className="nota">
        Os artigos que ficam sempre na lista desmarcam-se para a próxima vez, e os de «só desta vez» saem.
        {ficam > 0 && ` ${ficam === 1 ? 'O artigo que não compraste fica' : `Os ${ficam} artigos que não compraste ficam`} na lista, assinalado${ficam === 1 ? '' : 's'}.`}
      </p>

      <div className="botoes-folha">
        <button className="botao principal largo" onClick={fechar}>
          Fechar compra
        </button>
      </div>
    </Folha>
  )
}
