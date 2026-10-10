import { mudarTema, temaEfetivo, useTema } from '../lib/tema'
import { IconeLua, IconeSol } from './Icones'

/** Sol no escuro (passa a claro), lua no claro (passa a escuro). */
export function BotaoTema() {
  const tema = useTema()
  const escuro = temaEfetivo(tema) === 'escuro'
  return (
    <button
      className="botao-tema"
      onClick={() => mudarTema(escuro ? 'claro' : 'escuro')}
      aria-label={escuro ? 'Mudar para fundo claro' : 'Mudar para fundo escuro'}
    >
      {escuro ? <IconeSol /> : <IconeLua />}
    </button>
  )
}
