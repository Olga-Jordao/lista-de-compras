import { useSyncExternalStore } from 'react'

// Aparência escolhida neste aparelho: escuro (por omissão), claro ou automático
// (segue o telemóvel). Não se sincroniza: cada aparelho tem a sua.

export type Tema = 'escuro' | 'claro' | 'auto'

const CHAVE = 'tema'
const ouvintes = new Set<() => void>()
const sistemaEscuro = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null

function lerGuardado(): Tema {
  try {
    const t = localStorage.getItem(CHAVE)
    return t === 'claro' || t === 'auto' ? t : 'escuro'
  } catch {
    return 'escuro'
  }
}

let atual: Tema = lerGuardado()

/** O que se vê de facto: com "auto", depende do telemóvel. */
export function temaEfetivo(t: Tema = atual): 'escuro' | 'claro' {
  if (t === 'auto') return sistemaEscuro?.matches ? 'escuro' : 'claro'
  return t
}

export function aplicarTema(): void {
  const efetivo = temaEfetivo()
  document.documentElement.dataset.tema = efetivo
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', efetivo === 'escuro' ? '#06152e' : '#fffefa')
}

export function mudarTema(t: Tema): void {
  atual = t
  try {
    localStorage.setItem(CHAVE, t)
  } catch {
    // Sem armazenamento: vale até fechar a aplicação.
  }
  aplicarTema()
  ouvintes.forEach((f) => f())
}

sistemaEscuro?.addEventListener('change', () => {
  if (atual === 'auto') {
    aplicarTema()
    ouvintes.forEach((f) => f())
  }
})

export function useTema(): Tema {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f)
      return () => ouvintes.delete(f)
    },
    () => atual,
  )
}
