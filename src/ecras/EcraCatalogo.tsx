import { useMemo, useState } from 'react'
import { FolhaProduto } from '../componentes/FolhaProduto'
import { euros } from '../lib/numeros'
import { precoReferencia } from '../lib/precos'
import type { Produto } from '../lib/tipos'
import { normalizar, useProdutos, useSeccoes } from '../lib/usar'

export function EcraCatalogo() {
  const seccoes = useSeccoes()
  const produtos = useProdutos()
  const [procura, setProcura] = useState('')
  const [aberto, setAberto] = useState<Produto | 'novo' | null>(null)

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
          {produtos.length === 0
            ? 'Ainda está vazio. Os produtos que escreves na lista ficam aqui guardados.'
            : `${produtos.length} ${produtos.length === 1 ? 'produto' : 'produtos'}. Toca num para o editar ou apagar.`}
        </p>
        <div className="linha-campos" style={{ marginBottom: 8 }}>
          <input className="campo" placeholder="Procurar…" value={procura} onChange={(e) => setProcura(e.target.value)} />
          <button className="botao principal" style={{ flex: 'none' }} onClick={() => setAberto('novo')}>
            + Novo
          </button>
        </div>

        {grupos.map(({ seccao, produtos: daSeccao }) => (
          <section className="grupo" key={seccao.id}>
            <div className="grupo-titulo">
              <span>{seccao.nome}</span>
            </div>
            <div className="cartao">
              {daSeccao.map((p) => {
                const ref = precoReferencia(p.ultimoPreco, p.unidade, p.conteudo)
                return (
                  <button key={p.id} className="linha-catalogo" onClick={() => setAberto(p)}>
                    <span>
                      <strong>{p.nome}</strong>
                      {p.conteudo && (
                        <span className="artigo-detalhe">
                          {' '}
                          · {String(p.conteudo.quantidade).replace('.', ',')} {p.conteudo.unidade}
                        </span>
                      )}
                    </span>
                    <span className="direita">
                      {p.ultimoPreco != null ? `${euros(p.ultimoPreco)}/${p.unidade}` : p.unidade}
                      {ref && p.unidade === 'un' && (
                        <>
                          <br />
                          {euros(ref.valor)}/{ref.unidade}
                        </>
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      {aberto && (
        <FolhaProduto produto={aberto === 'novo' ? null : aberto} nomeInicial={aberto === 'novo' ? procura : ''} seccoes={seccoes} aoFechar={() => setAberto(null)} />
      )}
    </>
  )
}
