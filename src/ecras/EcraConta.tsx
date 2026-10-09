import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { sincronizar } from '../lib/sync'
import { useEstadoSync, useNumeroCompras } from '../lib/usar'

export function EcraConta() {
  const estado = useEstadoSync()
  const compras = useNumeroCompras()
  const [email, setEmail] = useState<string | null>(null)
  const [passo, setPasso] = useState<'email' | 'codigo'>('email')
  const [emailEscrito, setEmailEscrito] = useState('')
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [aEnviar, setAEnviar] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user.email ?? null))
    const { data } = supabase.auth.onAuthStateChange((_e, sessao) => setEmail(sessao?.user.email ?? null))
    return () => data.subscription.unsubscribe()
  }, [])

  async function pedirCodigo() {
    setErro(null)
    setAEnviar(true)
    const { error } = await supabase.auth.signInWithOtp({ email: emailEscrito.trim(), options: { shouldCreateUser: true } })
    setAEnviar(false)
    if (error) return setErro(traduzir(error.message))
    setPasso('codigo')
  }

  async function confirmarCodigo() {
    setErro(null)
    setAEnviar(true)
    const { error } = await supabase.auth.verifyOtp({ email: emailEscrito.trim(), token: codigo.trim(), type: 'email' })
    setAEnviar(false)
    if (error) return setErro(traduzir(error.message))
    setCodigo('')
    setPasso('email')
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
              <button className="botao perigo largo" onClick={sair}>
                Sair neste aparelho
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="nota">
              Entra com o teu email para o computador e o telemóvel terem a mesma lista. Só é preciso fazer isto uma vez em
              cada aparelho. Sem entrar, a lista funciona na mesma, mas fica só neste aparelho.
            </p>
            {passo === 'email' ? (
              <div className="bloco">
                <label className="bloco-rotulo" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  className="campo"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={emailEscrito}
                  onChange={(e) => setEmailEscrito(e.target.value)}
                />
                <div className="botoes-folha">
                  <button className="botao principal largo" disabled={aEnviar || !emailEscrito.includes('@')} onClick={pedirCodigo}>
                    {aEnviar ? 'A enviar…' : 'Enviar código'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bloco">
                <label className="bloco-rotulo" htmlFor="codigo">
                  Código que recebeste em {emailEscrito}
                </label>
                <input
                  id="codigo"
                  className="campo numero"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                />
                <div className="botoes-folha">
                  <button className="botao principal largo" disabled={aEnviar || codigo.trim().length < 6} onClick={confirmarCodigo}>
                    {aEnviar ? 'A confirmar…' : 'Entrar'}
                  </button>
                  <button className="botao pequeno largo" onClick={() => setPasso('email')}>
                    Mudar email ou pedir outro código
                  </button>
                </div>
              </div>
            )}
            {erro && <p className="caixa-aviso">{erro}</p>}
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
      </div>
    </>
  )
}

function traduzir(mensagem: string): string {
  if (/rate limit|too many|seconds/i.test(mensagem)) return 'Pediste vários códigos seguidos. Espera um minuto e tenta outra vez.'
  if (/expired|invalid/i.test(mensagem)) return 'O código não está certo ou já expirou. Pede outro.'
  if (/email/i.test(mensagem)) return 'Confirma se o email está bem escrito.'
  return mensagem
}
