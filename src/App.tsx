import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { acrescentarArtigo } from './lib/acoes'
import type { Produto } from './lib/tipos'
import { IconeCatalogo, IconeCompras, IconeDefinicoes, IconeLista } from './componentes/Icones'
import { EcraCatalogo } from './ecras/EcraCatalogo'
import { EcraCompras } from './ecras/EcraCompras'
import { EcraDefinicoes } from './ecras/EcraDefinicoes'
import { EcraLista } from './ecras/EcraLista'
import { useEstadoSync, useListas } from './lib/usar'

type Separador = 'lista' | 'catalogo' | 'compras' | 'definicoes'

// Preferências deste aparelho (não são sincronizadas).
function lerLocal(chave: string): string | null {
  try {
    return localStorage.getItem(chave)
  } catch {
    return null
  }
}

function gravarLocal(chave: string, valor: string) {
  try {
    localStorage.setItem(chave, valor)
  } catch {
    // Sem armazenamento: não faz mal, só não se lembra da escolha.
  }
}

export function App() {
  const listas = useListas()
  const estado = useEstadoSync()
  const [separador, setSeparador] = useState<Separador>('lista')
  const [listaId, setListaId] = useState<string | null>(() => lerLocal('lista-escolhida'))

  // Se a lista escolhida deixou de existir, passa para a primeira.
  useEffect(() => {
    if (listas.length > 0 && !listas.some((l) => l.id === listaId)) setListaId(listas[0].id)
  }, [listas, listaId])

  const escolherLista = (id: string) => {
    setListaId(id)
    gravarLocal('lista-escolhida', id)
  }

  // Do catálogo para a lista: põe o produto na lista e abre-o para a quantidade.
  const [artigoAAbrir, setArtigoAAbrir] = useState<string | null>(null)
  const limparArtigoAAbrir = useCallback(() => setArtigoAAbrir(null), [])
  async function porNaLista(p: Produto) {
    if (!listaId) return
    const a = await acrescentarArtigo(listaId, p)
    setArtigoAAbrir(a.id)
    setSeparador('lista')
  }

  return (
    <div className="app">
      {separador === 'lista' && (
        <EcraLista
          listas={listas}
          listaId={listaId}
          aoEscolherLista={escolherLista}
          artigoAAbrir={artigoAAbrir}
          aoAbrirArtigo={limparArtigoAAbrir}
        />
      )}
      {separador === 'catalogo' && (
        <EcraCatalogo listas={listas} listaId={listaId} aoEscolherLista={escolherLista} aoPorNaLista={porNaLista} />
      )}
      {separador === 'compras' && <EcraCompras listas={listas} />}
      {separador === 'definicoes' && <EcraDefinicoes />}

      <nav className="separadores">
        <div className="separadores-dentro">
          <BotaoSeparador ativo={separador === 'lista'} aoTocar={() => setSeparador('lista')} icone={<IconeLista />} rotulo="Lista" />
          <BotaoSeparador ativo={separador === 'catalogo'} aoTocar={() => setSeparador('catalogo')} icone={<IconeCatalogo />} rotulo="Catálogo" />
          <BotaoSeparador ativo={separador === 'compras'} aoTocar={() => setSeparador('compras')} icone={<IconeCompras />} rotulo="Compras" />
          <BotaoSeparador
            ativo={separador === 'definicoes'}
            aoTocar={() => setSeparador('definicoes')}
            icone={<IconeDefinicoes />}
            rotulo="Definições"
            aviso={estado.tipo === 'sem-sessao' || estado.tipo === 'erro'}
          />
        </div>
      </nav>
    </div>
  )
}

function BotaoSeparador({
  ativo,
  aoTocar,
  icone,
  rotulo,
  aviso,
}: {
  ativo: boolean
  aoTocar: () => void
  icone: ReactNode
  rotulo: string
  aviso?: boolean
}) {
  return (
    <button className={'separador' + (ativo ? ' ativo' : '')} onClick={aoTocar} aria-current={ativo ? 'page' : undefined}>
      {icone}
      {rotulo}
      {aviso && <span className="ponto-aviso" />}
    </button>
  )
}
