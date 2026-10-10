import { useState } from 'react'
import { guardarOrcamento } from '../lib/acoes'
import { arredondar, euros, lerNumero, paraCampo } from '../lib/numeros'
import { periodoAtual, resumoPeriodo, textoPeriodo, textoPeriodoCurto } from '../lib/orcamento'
import type { Orcamento } from '../lib/tipos'
import { useCompras, useOrcamento } from '../lib/usar'
import { useAviso } from './AvisoRapido'
import { Folha } from './Folha'

/**
 * Topo da lista: o convite para definir o orçamento ou, depois de definido, quanto
 * falta no mês e quanto fica depois do carrinho (ou da lista, em casa).
 */
export function CaixaOrcamento({ carrinho, lista }: { carrinho: number; lista: number }) {
  const orcamento = useOrcamento()
  const compras = useCompras()
  const [aberta, setAberta] = useState(false)

  if (orcamento === undefined) return null
  const definido = orcamento?.valor != null
  if (!definido && orcamento?.conviteDispensado) return null

  let conteudo
  if (!definido) {
    conteudo = (
      <div className="convite">
        <div className="convite-texto">Define o teu orçamento mensal para as compras da casa e alimentação</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="botao principal pequeno" style={{ flex: 1 }} onClick={() => setAberta(true)}>
            Definir
          </button>
          <button className="botao pequeno" onClick={() => guardarOrcamento({ conviteDispensado: true })}>
            Agora não
          </button>
        </div>
      </div>
    )
  } else {
    const periodo = periodoAtual(orcamento!.diaInicio)
    const { gasto } = resumoPeriodo(compras, periodo)
    const valor = orcamento!.valor!
    const falta = arredondar(valor - gasto)
    const depois = arredondar(falta - (carrinho > 0 ? carrinho : lista))
    const pct = (x: number) => `${Math.max(0, Math.min(100, (x / valor) * 100))}%`
    conteudo = (
      <button className={'caixa-orcamento' + (falta < 0 ? ' passou' : '')} onClick={() => setAberta(true)}>
        <div className="orcamento-linha contagem" style={{ fontSize: 13 }}>
          <span>
            {orcamento!.nome} · {textoPeriodoCurto(periodo)}
          </span>
          <span>{euros(valor)}</span>
        </div>
        <div className="orcamento-linha">
          <span>{falta < 0 ? 'Passaste' : 'Faltam'}</span>
          <span className="orcamento-falta">{euros(Math.abs(falta))}</span>
        </div>
        <div className="barra-orcamento" aria-hidden="true">
          <div className="gasto" style={{ width: pct(gasto) }} />
          <div className="carrinho" style={{ width: pct(carrinho > 0 ? carrinho : 0) }} />
        </div>
        {carrinho > 0 ? (
          <div className="texto-destaque">
            {depois < 0 ? `Com este carrinho passas ${euros(-depois)}` : `Depois deste carrinho ficam ${euros(depois)}`}
          </div>
        ) : lista > 0 ? (
          <div className="texto-destaque">
            {depois < 0 ? `Com esta lista passas ≈ ${euros(-depois)}` : `Com esta lista ficam ≈ ${euros(depois)}`}
          </div>
        ) : null}
      </button>
    )
  }

  return (
    <>
      {conteudo}
      {aberta && <FolhaOrcamento orcamento={orcamento} aoFechar={() => setAberta(false)} />}
    </>
  )
}

export function FolhaOrcamento({ orcamento, aoFechar }: { orcamento: Orcamento | null; aoFechar: () => void }) {
  const aviso = useAviso()
  const [nome, setNome] = useState(orcamento?.nome ?? 'Alimentação e casa')
  const [valor, setValor] = useState(paraCampo(orcamento?.valor))
  const [dia, setDia] = useState(String(orcamento?.diaInicio ?? 1))
  const diaNum = Math.min(Math.max(Math.round(lerNumero(dia) ?? 1), 1), 28)
  const valorNum = lerNumero(valor)

  async function guardar() {
    if (valorNum == null || valorNum <= 0) return
    await guardarOrcamento({ nome: nome.trim() || 'Alimentação e casa', valor: valorNum, diaInicio: diaNum, conviteDispensado: false })
    aviso('Orçamento guardado')
    aoFechar()
  }

  async function tirar() {
    if (!confirm('Deixar de usar o orçamento do mês?')) return
    await guardarOrcamento({ valor: null, conviteDispensado: true })
    aoFechar()
  }

  return (
    <Folha titulo="Orçamento do mês" aoFechar={aoFechar}>
      <div className="bloco">
        <label className="bloco-rotulo" htmlFor="orc-nome">
          Nome
        </label>
        <input id="orc-nome" className="campo" value={nome} onChange={(e) => setNome(e.target.value)} />
      </div>
      <div className="bloco">
        <label className="rotulo-forte" htmlFor="orc-valor">
          Valor por mês (€)
        </label>
        <input
          id="orc-valor"
          className="campo numero grande"
          inputMode="decimal"
          placeholder="300,00"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
        />
      </div>
      <div className="bloco">
        <label className="bloco-rotulo" htmlFor="orc-dia">
          O teu mês começa no dia
        </label>
        <input id="orc-dia" className="campo numero" inputMode="numeric" value={dia} onChange={(e) => setDia(e.target.value)} />
        <p className="texto-destaque" style={{ marginTop: 6 }}>
          Este mês: {textoPeriodo(periodoAtual(diaNum))}
        </p>
      </div>
      <div className="botoes-folha">
        <button className="botao principal largo" disabled={valorNum == null || valorNum <= 0} onClick={guardar}>
          Guardar
        </button>
        {orcamento?.valor != null && (
          <button className="botao perigo largo" onClick={tirar}>
            Deixar de usar orçamento
          </button>
        )}
      </div>
    </Folha>
  )
}
