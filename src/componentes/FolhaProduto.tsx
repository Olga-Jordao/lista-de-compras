import { useState } from 'react'
import { alterarProduto, apagarProduto, criarProduto } from '../lib/acoes'
import { euros, lerNumero, paraCampo } from '../lib/numeros'
import { precoReferencia } from '../lib/precos'
import type { Produto, Seccao, Unidade, UnidadeConteudo } from '../lib/tipos'
import { useAviso } from './AvisoRapido'
import { Folha, Segmentos } from './Folha'

const UNIDADES: { valor: Unidade; rotulo: string }[] = [
  { valor: 'un', rotulo: 'Unidade' },
  { valor: 'dz', rotulo: 'Dúzia' },
  { valor: 'kg', rotulo: 'kg' },
  { valor: 'L', rotulo: 'Litro' },
]

const UNIDADES_CONTEUDO: { valor: UnidadeConteudo; rotulo: string }[] = [
  { valor: 'g', rotulo: 'g' },
  { valor: 'kg', rotulo: 'kg' },
  { valor: 'ml', rotulo: 'ml' },
  { valor: 'L', rotulo: 'L' },
]

/**
 * Criar um produto novo (com o nome já escrito) ou editar um do catálogo.
 * Ao criar, devolve o produto em aoCriar para o pôr logo na lista.
 */
export function FolhaProduto({
  produto,
  nomeInicial = '',
  seccoes,
  textoCriar = 'Guardar no catálogo',
  textoSoCatalogo,
  aoFechar,
  aoCriar,
}: {
  produto: Produto | null
  nomeInicial?: string
  seccoes: Seccao[]
  textoCriar?: string
  /** Se existir, mostra um segundo botão que só guarda no catálogo, sem chamar aoCriar. */
  textoSoCatalogo?: string
  aoFechar: () => void
  aoCriar?: (p: Produto) => void
}) {
  const aviso = useAviso()
  const [nome, setNome] = useState(produto?.nome ?? nomeInicial)
  const [seccaoId, setSeccaoId] = useState<string | null>(produto?.seccaoId ?? null)
  const [unidade, setUnidade] = useState<Unidade>(produto?.unidade ?? 'un')
  const [conteudoQtd, setConteudoQtd] = useState(paraCampo(produto?.conteudo?.quantidade))
  const [conteudoUn, setConteudoUn] = useState<UnidadeConteudo>(produto?.conteudo?.unidade ?? 'g')
  const [ultimoPreco, setUltimoPreco] = useState(paraCampo(produto?.ultimoPreco))

  const conteudoNum = lerNumero(conteudoQtd)
  const conteudo = unidade === 'un' && conteudoNum ? { quantidade: conteudoNum, unidade: conteudoUn } : null
  const precoNum = lerNumero(ultimoPreco)
  const ref = precoReferencia(precoNum, unidade, conteudo)
  const podeGuardar = nome.trim() !== '' && seccaoId != null

  async function guardar(chamarAoCriar = true) {
    if (!podeGuardar || !seccaoId) return
    if (produto) {
      await alterarProduto(produto.id, {
        nome: nome.trim(),
        seccaoId,
        unidade,
        conteudo,
        ultimoPreco: precoNum,
        ultimoPrecoRef: ref ? ref.valor : null,
      })
      aviso('Produto guardado')
      aoFechar()
    } else {
      const novo = await criarProduto(nome, seccaoId, unidade)
      if (conteudo) await alterarProduto(novo.id, { conteudo })
      if (chamarAoCriar && aoCriar) aoCriar({ ...novo, conteudo })
      else aviso(`${novo.nome} guardado no catálogo`)
      aoFechar()
    }
  }

  async function apagar() {
    if (!produto) return
    if (!confirm(`Apagar «${produto.nome}» do catálogo? Sai também de todas as listas.`)) return
    await apagarProduto(produto.id)
    aviso('Produto apagado')
    aoFechar()
  }

  return (
    <Folha titulo={produto ? 'Editar produto' : 'Produto novo'} aoFechar={aoFechar}>
      <div className="bloco">
        <label className="bloco-rotulo" htmlFor="nome-produto">
          Nome
        </label>
        <input id="nome-produto" className="campo" value={nome} onChange={(e) => setNome(e.target.value)} />
      </div>

      <div className="bloco">
        <span className="bloco-rotulo">Secção</span>
        <div className="grelha-seccoes">
          {seccoes.map((s) => (
            <button
              key={s.id}
              type="button"
              className={'botao' + (seccaoId === s.id ? ' ativo' : '')}
              onClick={() => setSeccaoId(s.id)}
            >
              {s.nome}
            </button>
          ))}
        </div>
      </div>

      <div className="bloco">
        <span className="bloco-rotulo">Compra-se à</span>
        <Segmentos opcoes={UNIDADES} valor={unidade} aoMudar={setUnidade} />
      </div>

      {unidade === 'un' && (
        <div className="bloco">
          <label className="bloco-rotulo" htmlFor="conteudo-produto">
            Peso de cada embalagem ou unidade (opcional)
          </label>
          <div className="linha-campos">
            <input
              id="conteudo-produto"
              className="campo numero"
              inputMode="decimal"
              placeholder="ex.: 75"
              value={conteudoQtd}
              onChange={(e) => setConteudoQtd(e.target.value)}
            />
            <Segmentos opcoes={UNIDADES_CONTEUDO} valor={conteudoUn} aoMudar={setConteudoUn} />
          </div>
        </div>
      )}

      {produto && (
        <div className="bloco">
          <label className="bloco-rotulo" htmlFor="ultimo-preco">
            Último preço por {unidade} (€)
          </label>
          <input
            id="ultimo-preco"
            className="campo numero"
            inputMode="decimal"
            value={ultimoPreco}
            onChange={(e) => setUltimoPreco(e.target.value)}
          />
          {ref && unidade === 'un' && (
            <p className="nota">
              Ao {ref.unidade === 'kg' ? 'quilo' : 'litro'}: {euros(ref.valor)}/{ref.unidade}
            </p>
          )}
          <p className="nota">
            Atualiza-se sozinho quando fechas uma compra. A quantidade a comprar põe-se na Lista.
          </p>
        </div>
      )}

      <div className="botoes-folha">
        <button className="botao principal largo" disabled={!podeGuardar} onClick={() => guardar()}>
          {produto ? 'Guardar' : textoCriar}
        </button>
        {!produto && textoSoCatalogo && (
          <button className="botao largo" disabled={!podeGuardar} onClick={() => guardar(false)}>
            {textoSoCatalogo}
          </button>
        )}
        {!podeGuardar && <p className="nota">Escolhe a secção para guardar.</p>}
        {produto && (
          <button className="botao perigo largo" onClick={apagar}>
            Apagar do catálogo
          </button>
        )}
      </div>
    </Folha>
  )
}
