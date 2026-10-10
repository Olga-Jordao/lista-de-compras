import { useMemo, useState } from 'react'
import { BotaoTema } from '../componentes/BotaoTema'
import { FolhaRepetir } from '../componentes/FolhaRepetir'
import { FolhaOrcamento } from '../componentes/Orcamento'
import { apagarCompra } from '../lib/acoes'
import { arredondar, euros, numero } from '../lib/numeros'
import { periodoAtual, resumoPeriodo, textoPeriodoCurto } from '../lib/orcamento'
import type { Compra, Lista } from '../lib/tipos'
import { useArtigos, useCompras, useOrcamento, useSeccoes } from '../lib/usar'

const dataLonga = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^./, (l) => l.toUpperCase())

export function EcraCompras({ listas }: { listas: Lista[] }) {
  const compras = useCompras()
  const orcamento = useOrcamento()
  const [aberta, setAberta] = useState<string | null>(null)
  const [editarOrcamento, setEditarOrcamento] = useState(false)
  const [repetir, setRepetir] = useState<Compra | null>(null)

  const definido = orcamento?.valor != null
  const periodo = periodoAtual(definido ? orcamento!.diaInicio : 1)
  const resumo = resumoPeriodo(compras, periodo)
  const falta = definido ? arredondar(orcamento!.valor! - resumo.gasto) : 0

  return (
    <>
      <div className="cabeca-ecra">
        <h1 className="titulo-ecra">Compras</h1>
        <BotaoTema />
      </div>
      <div className="conteudo">
        <button className="caixa-orcamento" onClick={() => setEditarOrcamento(true)}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            {definido ? orcamento!.nome : 'Este mês'} · {textoPeriodoCurto(periodo)}
          </div>
          {definido && (
            <div className="linha-simples">
              <span className="contagem">Orçamento</span>
              <span>{euros(orcamento!.valor!)}</span>
            </div>
          )}
          <div className="linha-simples">
            <span className="contagem">
              Gasto ({resumo.compras.length} {resumo.compras.length === 1 ? 'compra' : 'compras'})
            </span>
            <span>{euros(resumo.gasto)}</span>
          </div>
          <div className="linha-simples">
            <span className="contagem">Poupado em descontos</span>
            <span className="texto-destaque">{euros(resumo.poupado)}</span>
          </div>
          {definido ? (
            <div className="linha-simples" style={{ fontSize: 17, fontWeight: 700, borderTop: '1px solid var(--linha)', marginTop: 6, paddingTop: 6 }}>
              <span>{falta < 0 ? 'Passaste' : 'Faltam'}</span>
              <span>{euros(Math.abs(falta))}</span>
            </div>
          ) : (
            <div className="texto-destaque" style={{ marginTop: 6 }}>
              Define o teu orçamento mensal para as compras da casa e alimentação
            </div>
          )}
        </button>

        {compras.length === 0 && (
          <p className="vazio-lista">Ainda não fechaste nenhuma compra. Quando fechares, aparece aqui com a data.</p>
        )}

        {compras.map((c) => (
          <CartaoCompra
            key={c.id}
            compra={c}
            aberta={aberta === c.id}
            aoTocar={() => setAberta(aberta === c.id ? null : c.id)}
            aoRepetir={() => setRepetir(c)}
          />
        ))}
      </div>

      {editarOrcamento && <FolhaOrcamento orcamento={orcamento ?? null} aoFechar={() => setEditarOrcamento(false)} />}
      {repetir && <RepetirCompra compra={repetir} listas={listas} aoFechar={() => setRepetir(null)} />}
    </>
  )
}

function CartaoCompra({
  compra,
  aberta,
  aoTocar,
  aoRepetir,
}: {
  compra: Compra
  aberta: boolean
  aoTocar: () => void
  aoRepetir: () => void
}) {
  const seccoes = useSeccoes()
  const pago = compra.totalPago ?? compra.totalCarrinho
  const poupado = compra.totalPago != null ? arredondar(compra.totalCarrinho - compra.totalPago) : 0

  const grupos = useMemo(() => {
    const ordem = new Map(seccoes.map((s, i) => [s.id, i]))
    const porSeccao = new Map<string, Compra['linhas']>()
    for (const l of compra.linhas) porSeccao.set(l.seccaoId, [...(porSeccao.get(l.seccaoId) ?? []), l])
    return [...porSeccao.entries()]
      .sort(([a], [b]) => (ordem.get(a) ?? 99) - (ordem.get(b) ?? 99))
      .map(([id, linhas]) => ({
        nome: seccoes.find((s) => s.id === id)?.nome ?? linhas[0].seccaoNome,
        total: arredondar(linhas.reduce((s, l) => s + l.total, 0)),
        linhas,
      }))
  }, [compra, seccoes])

  async function apagar() {
    if (!confirm(`Apagar a compra de ${dataLonga(compra.data)}? Deixa de contar para o orçamento.`)) return
    await apagarCompra(compra.id)
  }

  return (
    <div className="compra-cartao">
      <button style={{ all: 'unset', display: 'block', width: '100%', cursor: 'pointer' }} onClick={aoTocar} aria-expanded={aberta}>
        <div className="orcamento-linha">
          <span style={{ fontWeight: 700 }}>{dataLonga(compra.data)}</span>
          <span style={{ fontWeight: 700, fontSize: 17 }}>{euros(pago)}</span>
        </div>
        <div className="contagem">
          {compra.listaNome} · {compra.modo === 'online' ? 'online' : 'na loja'} · {compra.linhas.length}{' '}
          {compra.linhas.length === 1 ? 'artigo' : 'artigos'}
          {poupado > 0 ? ` · poupaste ${euros(poupado)}` : ''}
        </div>
      </button>

      {aberta && (
        <div style={{ marginTop: 8, borderTop: '1px solid var(--linha)', paddingTop: 4 }}>
          {grupos.map((g) => (
            <div key={g.nome}>
              <div className="grupo-titulo" style={{ marginTop: 10, padding: '0 0 4px' }}>
                <span>{g.nome}</span>
                <span>{euros(g.total)}</span>
              </div>
              {g.linhas.map((l) => (
                <div className="linha-simples" key={l.produtoId}>
                  <span>
                    {l.nome} · {numero(l.quantidade)} {l.unidade}
                  </span>
                  <span>{euros(l.total)}</span>
                </div>
              ))}
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="botao principal pequeno" style={{ flex: 1 }} onClick={aoRepetir}>
              Repetir esta lista
            </button>
            <button className="botao perigo pequeno" onClick={apagar}>
              Apagar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/** Repetir uma compra do histórico: vai para a lista de onde veio (ou a primeira, se já não existir). */
function RepetirCompra({ compra, listas, aoFechar }: { compra: Compra; listas: Lista[]; aoFechar: () => void }) {
  const lista = listas.find((l) => l.id === compra.listaId) ?? listas[0]
  const artigos = useArtigos(lista?.id ?? null)
  if (!lista) return null
  return (
    <FolhaRepetir
      titulo="Repetir esta lista"
      subtitulo={`Da compra de ${dataLonga(compra.data)}.`}
      listaId={lista.id}
      listaNome={lista.nome}
      itens={compra.linhas.map((l) => ({ ...l, data: compra.data }))}
      jaNaLista={new Set(artigos.map((a) => a.produtoId))}
      aoFechar={aoFechar}
    />
  )
}
