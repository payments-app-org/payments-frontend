import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    // В контейнере на macOS события файловой системы приходят ненадёжно
    watch: { usePolling: true, interval: 300 },
    // Браузер ходит в API через dev-сервер, поэтому CORS не нужен. Весь /api — в gateway (payments-gateway),
    // он разводит запросы по сервисам, как в кластере
    // Keycloak (/auth) — тоже через dev-сервер: тот же хост, что у приложения, как в кластере
    proxy: {
      '/api': process.env.API_URL ?? 'http://localhost:8080',
      '/auth': process.env.AUTH_URL ?? 'http://localhost:8180',
    },
  },
})
