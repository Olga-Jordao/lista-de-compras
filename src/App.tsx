import { useEffect, useState, type ReactNode } from 'react'
import { IconeCatalogo, IconeConta, IconeLista, IconeSeccoes } from './componentes/Icones'
import { EcraCatalogo } from './ecras/EcraCatalogo'
import { EcraConta } from './ecras/EcraConta'
import { EcraLista } from './ecras/EcraLista'
import { EcraSeccoes } from './ecras/EcraSeccoes'
import { useEstadoSync, useListas } from './lib/usar'

type Separador = 'lista' | 'catalogo' | 'seccoes' | 'conta'

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

  return (
    <div className="app">
      {separador === 'lista' && <EcraLista listas={listas} listaId={listaId} aoEscolherLista={escolherLista} />}
      {separador === 'catalogo' && <EcraCatalogo />}
      {separador === 'seccoes' && <EcraSeccoes />}
      {separador === 'conta' && <EcraConta />}

      <nav className="separadores">
        <div className="separadores-dentro">
          <BotaoSeparador ativo={separador === 'lista'} aoTocar={() => setSeparador('lista')} icone={<IconeLista />} rotulo="Lista" />
          <BotaoSeparador ativo={separador === 'catalogo'} aoTocar={() => setSeparador('catalogo')} icone={<IconeCatalogo />} rotulo="Catálogo" />
          <BotaoSeparador ativo={separador === 'seccoes'} aoTocar={() => setSeparador('seccoes')} icone={<IconeSeccoes />} rotulo="Secções" />
          <BotaoSeparador
            ativo={separador === 'conta'}
            aoTocar={() => setSeparador('conta')}
            icone={<IconeConta />}
            rotulo="Sincronizar"
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
