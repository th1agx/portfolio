import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { createContainer } from './app/container'
import './styles/tokens.css'
import './styles/base.css'

const container = createContainer()
container.registry.start()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App container={container} />
  </StrictMode>,
)
