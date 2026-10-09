import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { sincronizar } from '../lib/sync'
import { useEstadoSync, useNumeroCompras } from '../lib/usar'

// Entrada com email e palavra-passe, uma vez em cada aparelho. (O código por email
// não serve: no plano gratuito o Supabase não deixa mudar o texto do email.)
export function EcraConta() {
  const estado = useEstadoSync()
  const compras = useNumeroCompras()
  const [email, setEmail] = useState<string | null>(null)
  const [emailEscrito, setEmailEscrito] = useState('')
  const [palavraPasse, setPalavraPasse] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [aEnviar, setAEnviar] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user.email ?? null))
    const { data } = supabase.auth.onAuthStateChange((_e, sessao) => setEmail(sessao?.user.email ?? null))
    return () => data.subscription.unsubscribe()
  }, [])

  const podeEnviar = !aEnviar && emailEscrito.includes('@') && palavraPasse.length >= 6

  async function entrar() {
    setErro(null)
    setInfo(null)
    setAEnviar(true)
    const { error } = await supabase.auth.signInWithPassword({ email: emailEscrito.trim(), password: palavraPasse })
    setAEnviar(false)
    if (error) return setErro(traduzir(error.message))
    setPalavraPasse('')
  }

  async function criarConta() {
    setErro(null)
    setInfo(null)
    setAEnviar(true)
    const { data, error } = await supabase.auth.signUp({
      email: emailEscrito.trim(),
      password: palavraPasse,
      options: { emailRedirectTo: 'https://olga-jordao.github.io/lista-de-compras/' },
    })
    setAEnviar(false)
    if (error) return setErro(traduzir(error.message))
    if (!data.session) {
      setInfo('Conta criada. Vai ao teu email, carrega no link do Supabase para confirmar e depois volta aqui e carrega em «Entrar».')
    }
    setPalavraPasse('')
  }

  async function sair() {
    if (!confirm('Sair neste aparelho? A lista continua guardada aqui, mas deixa de sincronizar até voltares a entrar.')) return
    await supabase.auth.signOut()
  }

  const textoEstado =
    estado.tipo === 'ok'
      ? `Sincronizado às ${new Date(estado.quando).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`
      : estado.tipo === 'a-sincronizar'
        ? 'A sincronizar…'
        : estado.tipo === 'sem-rede'
          ? 'Sem rede. As alterações ficam guardadas e seguem quando a rede voltar.'
          : estado.tipo === 'erro'
            ? `Não foi possível sincronizar: ${estado.mensagem}`
            : 'Não sincroniza enquanto não entrares.'

  return (
    <>
      <h1 className="titulo-ecra">Sincronizar</h1>
      <div className="conteudo">
        {email ? (
          <>
            <div className="caixa-info">
              <div>
                Entraste como <strong>{email}</strong>.
              </div>
              <div className="estado-sync">{textoEstado}</div>
            </div>
            <div className="botoes-folha">
              <button className="botao principal largo" onClick={() => void sincronizar()}>
                Sincronizar agora
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="nota">
              Entra com o teu email e palavra-passe para o computador e o telemóvel terem a mesma lista. Só é preciso
              fazer isto uma vez em cada aparelho. Sem entrar, a lista funciona na mesma, mas fica só neste aparelho.
            </p>
            <div className="bloco">
              <label className="bloco-rotulo" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                className="campo"
                type="email"
                inputMode="email"
                autoComplete="username"
                value={emailEscrito}
                onChange={(e) => setEmailEscrito(e.target.value)}
              />
            </div>
            <div className="bloco">
              <label className="bloco-rotulo" htmlFor="palavra-passe">
                Palavra-passe (pelo menos 6 caracteres)
              </label>
              <input
                id="palavra-passe"
                className="campo"
                type="password"
                autoComplete="current-password"
                value={palavraPasse}
                onChange={(e) => setPalavraPasse(e.target.value)}
              />
            </div>
            <div className="botoes-folha">
              <button className="botao principal largo" disabled={!podeEnviar} onClick={entrar}>
                {aEnviar ? 'Um momento…' : 'Entrar'}
              </button>
              <button className="botao largo" disabled={!podeEnviar} onClick={criarConta}>
                É a primeira vez: criar conta
              </button>
            </div>
            {erro && (
              <p className="caixa-aviso" style={{ marginTop: 12 }}>
                {erro}
              </p>
            )}
            {info && (
              <p className="caixa-info" style={{ marginTop: 12 }}>
                {info}
              </p>
            )}
          </>
        )}

        <div className="bloco" style={{ marginTop: 28 }}>
          <span className="bloco-rotulo">Pôr no ecrã principal do iPhone</span>
          <p className="nota">
            No Chrome, toca no botão de partilhar (o quadrado com a seta) e escolhe «Adicionar ao ecrã principal». A
            aplicação passa a abrir como as outras e funciona sem rede.
          </p>
        </div>

        <p className="nota">Compras fechadas guardadas: {compras}</p>

        {email && (
          <button className="botao perigo pequeno" style={{ marginTop: 40, padding: 0 }} onClick={sair}>
            Terminar sessão neste aparelho
          </button>
        )}
      </div>
    </>
  )
}

function traduzir(mensagem: string): string {
  if (/invalid login credentials/i.test(mensagem)) return 'O email ou a palavra-passe não estão certos. Se é a primeira vez, carrega em «criar conta».'
  if (/email not confirmed/i.test(mensagem)) return 'Ainda falta confirmar a conta: carrega no link que o Supabase te mandou por email.'
  if (/already registered|already exists/i.test(mensagem)) return 'Já existe uma conta com este email. Carrega em «Entrar».'
  if (/signups not allowed|signup is disabled/i.test(mensagem)) return 'Não é possível criar contas novas. Carrega em «Entrar».'
  if (/rate limit|too many|seconds/i.test(mensagem)) return 'Foram várias tentativas seguidas. Espera um minuto e tenta outra vez.'
  if (/password/i.test(mensagem)) return 'A palavra-passe tem de ter pelo menos 6 caracteres.'
  if (/email/i.test(mensagem)) return 'Confirma se o email está bem escrito.'
  return mensagem
}
