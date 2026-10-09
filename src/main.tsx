import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { FornecedorAvisos } from './componentes/AvisoRapido'
import { db } from './lib/db'
import { prepararDadosIniciais } from './lib/inicial'
import { iniciarSync } from './lib/sync'
import './estilos.css'

async function arrancar() {
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
