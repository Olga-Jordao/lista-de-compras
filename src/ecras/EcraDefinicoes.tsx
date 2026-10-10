import { useState } from 'react'
import { BotaoTema } from '../componentes/BotaoTema'
import { Segmentos } from '../componentes/Folha'
import { FolhaOrcamento } from '../componentes/Orcamento'
import { euros } from '../lib/numeros'
import { periodoAtual, textoPeriodo } from '../lib/orcamento'
import { mudarTema, useTema, type Tema } from '../lib/tema'
import { useOrcamento } from '../lib/usar'
import { EcraConta } from './EcraConta'
import { EcraSeccoes } from './EcraSeccoes'

export function EcraDefinicoes() {
  const tema = useTema()
  const orcamento = useOrcamento()
  const [editar, setEditar] = useState(false)
  const definido = orcamento?.valor != null

  return (
    <>
      <div className="cabeca-ecra">
        <h1 className="titulo-ecra">Definições</h1>
        <BotaoTema />
      </div>
      <div className="conteudo">
        <h2 className="seccao-definicoes">Aparência</h2>
        <Segmentos<Tema>
          opcoes={[
            { valor: 'escuro', rotulo: 'Escuro' },
            { valor: 'claro', rotulo: 'Claro' },
            { valor: 'auto', rotulo: 'Automático' },
          ]}
          valor={tema}
          aoMudar={mudarTema}
        />

        <h2 className="seccao-definicoes">Orçamento do mês</h2>
        <button className="caixa-orcamento" onClick={() => setEditar(true)}>
          {definido ? (
            <>
              <div className="orcamento-linha">
                <span style={{ fontWeight: 700 }}>{orcamento!.nome}</span>
                <span style={{ fontWeight: 700 }}>{euros(orcamento!.valor!)}</span>
              </div>
              <div className="contagem">Este mês: {textoPeriodo(periodoAtual(orcamento!.diaInicio))}</div>
            </>
          ) : (
            <div className="texto-destaque">Define o teu orçamento mensal para as compras da casa e alimentação</div>
          )}
        </button>

        <h2 className="seccao-definicoes">Secções, pela ordem da loja</h2>
        <EcraSeccoes />

        <h2 className="seccao-definicoes">Sincronizar</h2>
        <EcraConta />
      </div>

      {editar && <FolhaOrcamento orcamento={orcamento ?? null} aoFechar={() => setEditar(false)} />}
    </>
  )
}
