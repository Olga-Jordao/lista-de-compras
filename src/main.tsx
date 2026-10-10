import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { App } from './App'
import { FornecedorAvisos } from './componentes/AvisoRapido'
import { db } from './lib/db'
import { prepararDadosIniciais } from './lib/inicial'
import { iniciarSync } from './lib/sync'
import './estilos.css'

async function arrancar() {
  // Quando há versão nova publicada, instala-a e recarrega sozinha (sem precisar de F5 duas vezes).
  registerSW({ immediate: true })
  // Pede ao browser para não apagar os dados deste site quando faltar espaço.
  void navigator.storage?.persist?.()
  await prepararDadosIniciais(db)
  iniciarSync()
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <FornecedorAvisos>
        <App />
      </FornecedorAvisos>
    </StrictMode>,
  )
}

void arrancar()
