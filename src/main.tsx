import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.js'

const storedTheme = window.localStorage.getItem('anchor-theme')
if (storedTheme === 'dark') {
  document.documentElement.classList.add('dark')
  document.documentElement.style.colorScheme = 'dark'
}

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element #root was not found')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
