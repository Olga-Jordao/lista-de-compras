import { useMemo, useState } from 'react'
import { FolhaProduto } from '../componentes/FolhaProduto'
import { euros } from '../lib/numeros'
import { precoReferencia } from '../lib/precos'
import type { Lista, Produto } from '../lib/tipos'
import { normalizar, useArtigos, useProdutos, useSeccoes } from '../lib/usar'

export function EcraCatalogo({
  listas,
  listaId,
  aoEscolherLista,
  aoPorNaLista,
}: {
  listas: Lista[]
  listaId: string | null
  aoEscolherLista: (id: string) => void
  /** Põe o produto na lista escolhida e abre-o lá, para escrever a quantidade. */
  aoPorNaLista: (p: Produto) => void
}) {
  const seccoes = useSeccoes()
  const produtos = useProdutos()
  const artigos = useArtigos(listaId)
  const [procura, setProcura] = useState('')
  const [aberto, setAberto] = useState<Produto | 'novo' | null>(null)

  const lista = listas.find((l) => l.id === listaId)
  const naLista = useMemo(() => new Set(artigos.map((a) => a.produtoId)), [artigos])
  const termo = normalizar(procura)
  const grupos = useMemo(() => {
    const filtrados = termo ? produtos.filter((p) => normalizar(p.nome).includes(termo)) : produtos
    return seccoes
      .map((s) => ({ seccao: s, produtos: filtrados.filter((p) => p.seccaoId === s.id) }))
      .filter((g) => g.produtos.length > 0)
  }, [produtos, seccoes, termo])

  return (
    <>
      <h1 className="titulo-ecra">Catálogo</h1>
      <div className="conteudo">
        <p className="nota">
          Todos os teus produtos, com o último preço que pagaste. Toca no nome para o editar; toca em «+ Lista» para o
          pôr na lista e escrever a quantidade.
        </p>

        {listas.length > 1 && (
          <>
            <span className="bloco-rotulo">«+ Lista» põe na lista:</span>
            <div className="fichas" style={{ margin: '0 0 12px' }}>
              {listas.map((l) => (
                <button key={l.id} className={'ficha' + (l.id === listaId ? ' ativa' : '')} onClick={() => aoEscolherLista(l.id)}>
                  {l.nome}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="linha-campos" style={{ marginBottom: 8 }}>
          <input className="campo" placeholder="Procurar…" value={procura} onChange={(e) => setProcura(e.target.value)} />
          <button className="botao principal" style={{ flex: 'none' }} onClick={() => setAberto('novo')}>
            + Novo
          </button>
        </div>

        {produtos.length === 0 && (
          <p className="vazio-lista">Ainda está vazio. Os produtos que escreves na lista ficam aqui guardados.</p>
        )}

        {grupos.map(({ seccao, produtos: daSeccao }) => (
          <section className="grupo" key={seccao.id}>
            <div className="grupo-titulo">
              <span>{seccao.nome}</span>
            </div>
            <div className="cartao">
              {daSeccao.map((p) => {
                const ref = precoReferencia(p.ultimoPreco, p.unidade, p.conteudo)
                const jaEsta = naLista.has(p.id)
                return (
                  <div key={p.id} className="artigo">
                    <button className="artigo-corpo" style={{ paddingLeft: 14 }} onClick={() => setAberto(p)}>
                      <div className="artigo-nome">{p.nome}</div>
                      <div className="artigo-detalhe">
                        {[
                          p.ultimoPreco != null ? `${euros(p.ultimoPreco)}/${p.unidade}` : `compra-se ao ${p.unidade}`,
                          p.conteudo ? `${String(p.conteudo.quantidade).replace('.', ',')} ${p.conteudo.unidade}` : null,
                          ref && p.unidade === 'un' ? `${euros(ref.valor)}/${ref.unidade}` : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </div>
                    </button>
                    <button
                      className={'artigo-preco' + (jaEsta ? '' : ' vazio')}
                      onClick={() => aoPorNaLista(p)}
                      aria-label={jaEsta ? `${p.nome} já está na lista ${lista?.nome ?? ''}` : `Pôr ${p.nome} na lista ${lista?.nome ?? ''}`}
                    >
                      {jaEsta ? 'Na lista ✓' : '+ Lista'}
                    </button>
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      {aberto && (
        <FolhaProduto
          produto={aberto === 'novo' ? null : aberto}
          nomeInicial={aberto === 'novo' ? procura : ''}
          seccoes={seccoes}
          textoCriar={lista ? `Guardar e pôr na lista ${lista.nome}` : 'Guardar no catálogo'}
          textoSoCatalogo={lista ? 'Só guardar no catálogo' : undefined}
          aoFechar={() => setAberto(null)}
          aoCriar={lista ? aoPorNaLista : undefined}
        />
      )}
    </>
  )
}
