import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles.css'
import { initAuth } from './auth'

// Сначала вход (Keycloak), потом приложение: все запросы в API идут с токеном
initAuth().then((signedIn) => {
  if (!signedIn) return
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>,
  )
})
