import { useEffect, type ReactNode } from 'react'

/** Painel que sobe de baixo, para editar sem sair do ecrã. */
export function Folha({ titulo, aoFechar, children }: { titulo: ReactNode; aoFechar: () => void; children: ReactNode }) {
  useEffect(() => {
    const antes = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = antes
    }
  }, [])

  return (
    <div className="fundo-folha" onClick={aoFechar}>
      <div className="folha" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="folha-cabeca">
          <h2 className="folha-titulo">{titulo}</h2>
          <button className="botao pequeno" onClick={aoFechar}>
            Fechar
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Segmentos<T extends string>({
  opcoes,
  valor,
  aoMudar,
}: {
  opcoes: { valor: T; rotulo: string }[]
  valor: T
  aoMudar: (v: T) => void
}) {
  return (
    <div className="segmentos" role="radiogroup">
      {opcoes.map((o) => (
        <button
          key={o.valor}
          type="button"
          role="radio"
          aria-checked={valor === o.valor}
          className={'segmento' + (valor === o.valor ? ' ativo' : '')}
          onClick={() => aoMudar(o.valor)}
        >
          {o.rotulo}
        </button>
      ))}
    </div>
  )
}
