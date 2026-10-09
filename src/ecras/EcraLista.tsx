import { DndContext, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useEffect, useMemo, useState } from 'react'
import { useAviso } from '../componentes/AvisoRapido'
import { FolhaArtigo } from '../componentes/FolhaArtigo'
import { FolhaFechar } from '../componentes/FolhaFechar'
import { FolhaProduto } from '../componentes/FolhaProduto'
import { IconePega, IconeVisto } from '../componentes/Icones'
import {
  acrescentarArtigo,
  alternarCarrinho,
  apagarLista,
  criarLista,
  precoParaArtigo,
  renomearLista,
  reordenarArtigos,
  totalArtigo,
} from '../lib/acoes'
import { arredondar, euros, numero } from '../lib/numeros'
import { precoReferencia, subidaDePreco } from '../lib/precos'
import type { Artigo, Lista, Produto, Seccao } from '../lib/tipos'
import { normalizar, useArtigos, useProdutos, useSeccoes } from '../lib/usar'

type FolhaAberta =
  | { tipo: 'artigo'; artigoId: string; foco: 'quantidade' | 'preco' }
  | { tipo: 'produto-novo'; nome: string }
  | { tipo: 'editar-produto'; produtoId: string }
  | { tipo: 'fechar' }

export function EcraLista({
  listas,
  listaId,
  aoEscolherLista,
  artigoAAbrir,
  aoAbrirArtigo,
}: {
  listas: Lista[]
  listaId: string | null
  aoEscolherLista: (id: string) => void
  /** Artigo acabado de pôr na lista a partir do catálogo, para abrir já na quantidade. */
  artigoAAbrir: string | null
  aoAbrirArtigo: () => void
}) {
  const aviso = useAviso()
  const seccoes = useSeccoes()
  const produtos = useProdutos()
  const artigos = useArtigos(listaId)
  const [folha, setFolha] = useState<FolhaAberta | null>(null)

  useEffect(() => {
    if (!artigoAAbrir) return
    setFolha({ tipo: 'artigo', artigoId: artigoAAbrir, foco: 'quantidade' })
    aoAbrirArtigo()
  }, [artigoAAbrir, aoAbrirArtigo])
  const [ordenar, setOrdenar] = useState(false)
  const [esconderRiscados, setEsconderRiscados] = useState(false)

  const lista = listas.find((l) => l.id === listaId) ?? null
  const mapaProdutos = useMemo(() => new Map(produtos.map((p) => [p.id, p])), [produtos])

  const contas = useMemo(() => {
    let carrinho = 0
    let todos = 0
    let noCarrinho = 0
    let semPreco = 0
    for (const a of artigos) {
      const p = mapaProdutos.get(a.produtoId)
      const t = totalArtigo(a, p)
      todos += t
      if (a.noCarrinho) {
        carrinho += t
        noCarrinho++
        if (precoParaArtigo(a, p).preco == null && a.totalManual == null) semPreco++
      }
    }
    return { carrinho: arredondar(carrinho), todos: arredondar(todos), noCarrinho, semPreco }
  }, [artigos, mapaProdutos])

  const grupos = useMemo(() => {
    const porSeccao = new Map<string, Artigo[]>()
    for (const a of artigos) {
      const p = mapaProdutos.get(a.produtoId)
      if (!p) continue
      if (esconderRiscados && !ordenar && a.noCarrinho) continue
      porSeccao.set(p.seccaoId, [...(porSeccao.get(p.seccaoId) ?? []), a])
    }
    const conhecidas = seccoes.filter((s) => porSeccao.has(s.id)).map((s) => ({ seccao: s, artigos: porSeccao.get(s.id)! }))
    // Produtos cuja secção já não existe vão para o fim.
    const orfaos = [...porSeccao.entries()]
      .filter(([id]) => !seccoes.some((s) => s.id === id))
      .flatMap(([, a]) => a)
    if (orfaos.length) conhecidas.push({ seccao: { id: '-', nome: 'Sem secção' } as Seccao, artigos: orfaos })
    return conhecidas
  }, [artigos, mapaProdutos, seccoes, esconderRiscados, ordenar])

  async function novaLista() {
    const nome = prompt('Nome da nova lista')
    if (!nome?.trim()) return
    const l = await criarLista(nome)
    aoEscolherLista(l.id)
  }

  async function mudarNomeLista() {
    if (!lista) return
    const nome = prompt('Novo nome da lista', lista.nome)
    if (nome?.trim()) await renomearLista(lista.id, nome)
  }

  async function apagarEstaLista() {
    if (!lista) return
    if (!confirm(`Apagar a lista «${lista.nome}» e os artigos que tem? As compras já fechadas ficam guardadas.`)) return
    await apagarLista(lista.id)
    const outra = listas.find((l) => l.id !== lista.id)
    if (outra) aoEscolherLista(outra.id)
  }

  async function ordenarDentroDaSeccao(seccaoArtigos: Artigo[], e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return
    const de = seccaoArtigos.findIndex((a) => a.id === e.active.id)
    const para = seccaoArtigos.findIndex((a) => a.id === e.over!.id)
    const novaSeccao = arrayMove(seccaoArtigos, de, para)
    // Mantém a ordem das outras secções e reescreve toda a lista.
    const ids = artigos.map((a) => a.id)
    const posicoes = seccaoArtigos.map((a) => ids.indexOf(a.id)).sort((x, y) => x - y)
    posicoes.forEach((pos, i) => (ids[pos] = novaSeccao[i].id))
    await reordenarArtigos(ids)
  }

  const artigoAberto = folha?.tipo === 'artigo' ? artigos.find((a) => a.id === folha.artigoId) : undefined
  const produtoAberto = artigoAberto ? mapaProdutos.get(artigoAberto.produtoId) : undefined

  return (
    <>
      <header className="topo">
        <div className="fichas">
          {listas.map((l) => (
            <button key={l.id} className={'ficha' + (l.id === listaId ? ' ativa' : '')} onClick={() => aoEscolherLista(l.id)}>
              {l.nome}
            </button>
          ))}
          <button className="ficha" onClick={novaLista} aria-label="Nova lista">
            + Lista
          </button>
        </div>
        <div className="totais">
          <div className="total-carrinho">
            <div className="rotulo">No carrinho</div>
            <div className="valor">{euros(contas.carrinho)}</div>
            <div className="total-lista">
              Lista toda: {euros(contas.todos)} · {contas.noCarrinho} de {artigos.length}
            </div>
          </div>
          <div className="acoes-topo">
            <button className={'botao pequeno' + (ordenar ? ' principal' : '')} onClick={() => setOrdenar(!ordenar)}>
              {ordenar ? 'Feito' : 'Ordenar'}
            </button>
          </div>
        </div>
      </header>

      <div className="conteudo">
        {lista && !ordenar && (
          <Acrescentar
            produtos={produtos}
            artigos={artigos}
            aoEscolher={async (p) => {
              const a = await acrescentarArtigo(lista.id, p)
              aviso(`${p.nome} na lista`)
              setFolha({ tipo: 'artigo', artigoId: a.id, foco: 'quantidade' })
            }}
            aoCriar={(nome) => setFolha({ tipo: 'produto-novo', nome })}
          />
        )}

        {contas.noCarrinho > 0 && !ordenar && (
          <button className="botao pequeno" onClick={() => setEsconderRiscados(!esconderRiscados)}>
            {esconderRiscados ? 'Mostrar o que já está no carrinho' : 'Esconder o que já está no carrinho'}
          </button>
        )}

        {artigos.length === 0 && (
          <p className="vazio-lista">
            A lista está vazia. Escreve um produto em cima para o acrescentar.
          </p>
        )}

        {grupos.map(({ seccao, artigos: daSeccao }) => (
          <section className="grupo" key={seccao.id}>
            <div className="grupo-titulo">
              <span>{seccao.nome}</span>
              <span>{euros(daSeccao.reduce((s, a) => s + totalArtigo(a, mapaProdutos.get(a.produtoId)), 0))}</span>
            </div>
            <GrupoArtigos
              artigos={daSeccao}
              produtos={mapaProdutos}
              ordenar={ordenar}
              aoOrdenar={(e) => ordenarDentroDaSeccao(daSeccao, e)}
              aoTocarVisto={(a) => alternarCarrinho(a, mapaProdutos.get(a.produtoId))}
              aoAbrir={(a, foco) => setFolha({ tipo: 'artigo', artigoId: a.id, foco })}
            />
          </section>
        ))}

        {lista && !ordenar && (
          <div style={{ display: 'flex', gap: 8, marginTop: 28, flexWrap: 'wrap' }}>
            <button className="botao pequeno" onClick={mudarNomeLista}>
              Mudar nome da lista
            </button>
            <button className="botao pequeno perigo" onClick={apagarEstaLista}>
              Apagar lista
            </button>
          </div>
        )}
      </div>

      {contas.noCarrinho > 0 && !ordenar && (
        <div className="botao-fixo">
          <button className="botao principal" onClick={() => setFolha({ tipo: 'fechar' })}>
            Fechar compra · {euros(contas.carrinho)}
          </button>
        </div>
      )}

      {folha?.tipo === 'artigo' && artigoAberto && produtoAberto && (
        <FolhaArtigo
          key={artigoAberto.id}
          artigo={artigoAberto}
          produto={produtoAberto}
          foco={folha.foco}
          aoFechar={() => setFolha(null)}
          aoEditarProduto={() => setFolha({ tipo: 'editar-produto', produtoId: produtoAberto.id })}
        />
      )}

      {folha?.tipo === 'produto-novo' && lista && (
        <FolhaProduto
          produto={null}
          nomeInicial={folha.nome}
          seccoes={seccoes}
          textoCriar="Acrescentar à lista"
          aoFechar={() => setFolha(null)}
          aoCriar={async (p) => {
            const a = await acrescentarArtigo(lista.id, p)
            aviso(`${p.nome} no catálogo e na lista`)
            setFolha({ tipo: 'artigo', artigoId: a.id, foco: 'quantidade' })
          }}
        />
      )}

      {folha?.tipo === 'editar-produto' && mapaProdutos.get(folha.produtoId) && (
        <FolhaProduto produto={mapaProdutos.get(folha.produtoId)!} seccoes={seccoes} aoFechar={() => setFolha(null)} />
      )}

      {folha?.tipo === 'fechar' && lista && (
        <FolhaFechar
          listaId={lista.id}
          listaNome={lista.nome}
          noCarrinho={contas.noCarrinho}
          totalCarrinho={contas.carrinho}
          ficam={artigos.filter((a) => !a.noCarrinho).length}
          semPreco={contas.semPreco}
          aoFechar={() => setFolha(null)}
        />
      )}
    </>
  )
}

// ---------- Campo de acrescentar, com pesquisa no catálogo ----------

function Acrescentar({
  produtos,
  artigos,
  aoEscolher,
  aoCriar,
}: {
  produtos: Produto[]
  artigos: Artigo[]
  aoEscolher: (p: Produto) => void
  aoCriar: (nome: string) => void
}) {
  const [texto, setTexto] = useState('')
  const termo = normalizar(texto)
  const naLista = new Set(artigos.map((a) => a.produtoId))
  const encontrados = termo
    ? produtos
        .filter((p) => normalizar(p.nome).includes(termo))
        .sort((a, b) => Number(normalizar(b.nome).startsWith(termo)) - Number(normalizar(a.nome).startsWith(termo)))
        .slice(0, 8)
    : []
  const existeIgual = produtos.some((p) => normalizar(p.nome) === termo)

  const escolher = (p: Produto) => {
    setTexto('')
    aoEscolher(p)
  }

  return (
    <div className="acrescentar">
      <input
        className="campo"
        placeholder="Acrescentar produto…"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        enterKeyHint="done"
        onKeyDown={(e) => {
          if (e.key !== 'Enter' || !termo) return
          if (encontrados[0] && normalizar(encontrados[0].nome) === termo) escolher(encontrados[0])
          else if (!existeIgual) {
            aoCriar(texto.trim())
            setTexto('')
          }
        }}
      />
      {termo && (
        <div className="sugestoes">
          {encontrados.map((p) => (
            <button key={p.id} className="sugestao" onClick={() => escolher(p)}>
              <span>{p.nome}</span>
              <span className="extra">{naLista.has(p.id) ? 'já está na lista' : p.ultimoPreco != null ? `${euros(p.ultimoPreco)}/${p.unidade}` : ''}</span>
            </button>
          ))}
          {!existeIgual && (
            <button
              className="sugestao criar"
              onClick={() => {
                aoCriar(texto.trim())
                setTexto('')
              }}
            >
              + Criar «{texto.trim()}»
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ---------- Artigos de uma secção ----------

function GrupoArtigos({
  artigos,
  produtos,
  ordenar,
  aoOrdenar,
  aoTocarVisto,
  aoAbrir,
}: {
  artigos: Artigo[]
  produtos: Map<string, Produto>
  ordenar: boolean
  aoOrdenar: (e: DragEndEvent) => void
  aoTocarVisto: (a: Artigo) => void
  aoAbrir: (a: Artigo, foco: 'quantidade' | 'preco') => void
}) {
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
  )
  return (
    <div className="cartao">
      <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={aoOrdenar}>
        <SortableContext items={artigos.map((a) => a.id)} strategy={verticalListSortingStrategy}>
          {artigos.map((a) => (
            <LinhaArtigo
              key={a.id}
              artigo={a}
              produto={produtos.get(a.produtoId)!}
              ordenar={ordenar}
              aoTocarVisto={() => aoTocarVisto(a)}
              aoAbrir={(foco) => aoAbrir(a, foco)}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  )
}

function LinhaArtigo({
  artigo,
  produto,
  ordenar,
  aoTocarVisto,
  aoAbrir,
}: {
  artigo: Artigo
  produto: Produto
  ordenar: boolean
  aoTocarVisto: () => void
  aoAbrir: (foco: 'quantidade' | 'preco') => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: artigo.id,
    disabled: !ordenar,
  })
  const estilo = { transform: CSS.Transform.toString(transform), transition }

  const { preco, sugerido } = precoParaArtigo(artigo, produto)
  const total = totalArtigo(artigo, produto)
  const temPreco = preco != null || artigo.totalManual != null
  const efetivo = artigo.totalManual != null ? (artigo.quantidade > 0 ? artigo.totalManual / artigo.quantidade : null) : preco
  const ref = precoReferencia(efetivo, artigo.unidade, produto.conteudo)
  const subida = sugerido ? null : subidaDePreco(produto, efetivo, artigo.unidade)

  const detalhe = [
    `${numero(artigo.quantidade)} ${artigo.unidade}`,
    artigo.totalManual != null ? 'etiqueta' : preco != null ? `${euros(preco)}/${artigo.unidade}` : null,
    ref && artigo.unidade === 'un' ? `${euros(ref.valor)}/${ref.unidade}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div
      ref={setNodeRef}
      style={estilo}
      className={'artigo' + (artigo.noCarrinho ? ' no-carrinho' : '') + (isDragging ? ' a-arrastar' : '')}
    >
      {ordenar ? (
        <button className="pega" {...attributes} {...listeners} aria-label={`Arrastar ${produto.nome}`}>
          <IconePega />
        </button>
      ) : (
        <button
          className="artigo-visto"
          onClick={aoTocarVisto}
          aria-label={artigo.noCarrinho ? `Tirar ${produto.nome} do carrinho` : `Pôr ${produto.nome} no carrinho`}
        >
          <span className="circulo">{artigo.noCarrinho && <IconeVisto />}</span>
        </button>
      )}
      <button className="artigo-corpo" onClick={() => !ordenar && aoAbrir('quantidade')}>
        <div className="artigo-nome">{produto.nome}</div>
        <div className="artigo-detalhe">{detalhe}</div>
        {(artigo.porComprar || !artigo.fixo || subida || artigo.origem === 'refeicao') && (
          <div className="etiquetas">
            {subida && (
              <span className="etiqueta aviso">
                ↑ {euros(subida.diferenca)}
                {subida.base !== 'unidade' ? `/${subida.base}` : ''} (+{subida.percentagem} %)
              </span>
            )}
            {artigo.porComprar && <span className="etiqueta pendente">ficou da última vez</span>}
            {!artigo.fixo && <span className="etiqueta">só desta vez</span>}
            {artigo.origem === 'refeicao' && <span className="etiqueta">refeição</span>}
          </div>
        )}
      </button>
      {!ordenar && (
        <button className={'artigo-preco' + (temPreco ? '' : ' vazio')} onClick={() => aoAbrir('preco')}>
          {temPreco ? (
            <>
              {euros(total)}
              {sugerido && <span className="sugerido">sugerido</span>}
            </>
          ) : (
            'Preço'
          )}
        </button>
      )}
    </div>
  )
}
