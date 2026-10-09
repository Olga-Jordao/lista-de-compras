import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

const Contexto = createContext<(texto: string) => void>(() => {})

/** Mensagem curta que aparece por cima da barra e desaparece sozinha. */
export function FornecedorAvisos({ children }: { children: ReactNode }) {
  const [texto, setTexto] = useState<string | null>(null)
  const espera = useRef<ReturnType<typeof setTimeout>>(undefined)
  const mostrar = useCallback((t: string) => {
    setTexto(t)
    clearTimeout(espera.current)
    espera.current = setTimeout(() => setTexto(null), 2600)
  }, [])
  return (
    <Contexto.Provider value={mostrar}>
      {children}
      {texto && (
        <div className="aviso-rapido" role="status">
          {texto}
        </div>
      )}
    </Contexto.Provider>
  )
}

export function useAviso() {
  return useContext(Contexto)
}
