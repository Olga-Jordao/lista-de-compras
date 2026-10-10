import { useMemo, useState } from 'react'
import { acrescentarVarios } from '../lib/acoes'
import { euros, lerNumero, paraCampo } from '../lib/numeros'
import type { ParaRepetir } from '../lib/repetir'
import { useSeccoes } from '../lib/usar'
import { useAviso } from './AvisoRapido'
import { Folha } from './Folha'
import { IconeVisto } from './Icones'

/**
 * Escolher, de compras anteriores, o que volta para a lista: todos marcados à
 * partida, cada um com a quantidade da última vez, que se pode mudar.
 */
export function FolhaRepetir({
  titulo,
  subtitulo,
  listaId,
  listaNome,
  itens,
  jaNaLista,
  aoFechar,
}: {
  titulo: string
  subtitulo?: string
  listaId: string
  listaNome: string
  itens: ParaRepetir[]
  jaNaLista: Set<string>
  aoFechar: () => void
}) {
  const aviso = useAviso()
  const seccoes = useSeccoes()
  const disponiveis = itens.filter((i) => !jaNaLista.has(i.produtoId))
  const [escolhidos, setEscolhidos] = useState<Set<string>>(() => new Set(disponiveis.map((i) => i.produtoId)))
  const [quantidades, setQuantidades] = useState<Record<string, string>>(() =>
    Object.fromEntries(itens.map((i) => [i.produtoId, paraCampo(i.quantidade)])),
  )

  const grupos = useMemo(() => {
    const ordem = new Map(seccoes.map((s, i) => [s.id, i]))
    const porSeccao = new Map<string, ParaRepetir[]>()
    for (const i of itens) porSeccao.set(i.seccaoId, [...(porSeccao.get(i.seccaoId) ?? []), i])
    return [...porSeccao.entries()]
      .sort(([a], [b]) => (ordem.get(a) ?? 99) - (ordem.get(b) ?? 99))
      .map(([id, lista]) => ({ nome: seccoes.find((s) => s.id === id)?.nome ?? lista[0].seccaoNome, itens: lista }))
  }, [itens, seccoes])

  const todos = disponiveis.length > 0 && escolhidos.size === disponiveis.length

  function alternar(id: string) {
    setEscolhidos((e) => {
      const n = new Set(e)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  async function por() {
    const lista = itens
      .filter((i) => escolhidos.has(i.produtoId))
      .map((i) => ({ produtoId: i.produtoId, quantidade: lerNumero(quantidades[i.produtoId] ?? '') || i.quantidade, unidade: i.unidade }))
    const n = await acrescentarVarios(listaId, lista)
    aviso(n === 1 ? `1 artigo na lista ${listaNome}` : `${n} artigos na lista ${listaNome}`)
    aoFechar()
  }

  return (
    <Folha titulo={titulo} aoFechar={aoFechar}>
      {subtitulo && <p className="nota">{subtitulo}</p>}
      {disponiveis.length > 0 && (
        <div className="orcamento-linha" style={{ margin: '4px 2px 8px' }}>
          <button
            className="botao pequeno"
            onClick={() => setEscolhidos(todos ? new Set() : new Set(disponiveis.map((i) => i.produtoId)))}
          >
            {todos ? 'Tirar todos' : 'Escolher todos'}
          </button>
          <span className="contagem">{escolhidos.size} escolhidos</span>
        </div>
      )}

      {grupos.map((g) => (
        <section className="grupo" key={g.nome} style={{ marginTop: 12 }}>
          <div className="grupo-titulo">
            <span>{g.nome}</span>
            <span>quantidade</span>
          </div>
          <div className="cartao">
            {g.itens.map((i) => {
              const ja = jaNaLista.has(i.produtoId)
              const on = escolhidos.has(i.produtoId)
              const precos = [
                i.precoRef != null ? `${euros(i.precoRef)}/${i.refUnidade ?? 'kg'}` : null,
                i.precoUnitario != null && i.unidade !== 'kg' && i.unidade !== 'L' ? `${euros(i.precoUnitario)}/${i.unidade}` : null,
              ]
                .filter(Boolean)
                .join(' · ')
              return (
                <div className="linha-repetir" key={i.produtoId}>
                  <button
                    className={'caixa-escolha' + (on ? ' on' : '')}
                    disabled={ja}
                    onClick={() => alternar(i.produtoId)}
                    aria-label={on ? `Não pôr ${i.nome}` : `Pôr ${i.nome}`}
                  >
                    {on && <IconeVisto />}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="artigo-nome" style={{ color: ja || !on ? 'var(--suave)' : undefined }}>
                      {i.nome}
                    </div>
                    <div className="artigo-detalhe">{ja ? 'já está na lista' : precos}</div>
                  </div>
                  {!ja && (
                    <>
                      <input
                        className="campo numero"
                        inputMode="decimal"
                        aria-label={`Quantidade de ${i.nome}`}
                        value={quantidades[i.produtoId] ?? ''}
                        onChange={(e) => setQuantidades((q) => ({ ...q, [i.produtoId]: e.target.value }))}
                        onFocus={(e) => e.target.select()}
                      />
                      <span className="contagem" style={{ width: 22 }}>
                        {i.unidade}
                      </span>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      ))}

      <div className="botoes-folha">
        <button className="botao principal largo" disabled={escolhidos.size === 0} onClick={por}>
          {escolhidos.size === 1 ? `Pôr 1 artigo na lista ${listaNome}` : `Pôr ${escolhidos.size} artigos na lista ${listaNome}`}
        </button>
      </div>
    </Folha>
  )
}
