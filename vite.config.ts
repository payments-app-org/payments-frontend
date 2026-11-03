import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    // В контейнере на macOS события файловой системы приходят ненадёжно
    watch: { usePolling: true, interval: 300 },
    // Браузер ходит в сервисы через dev-сервер, поэтому CORS не нужен
    proxy: {
      '/api/users': process.env.ACCOUNT_URL ?? 'http://localhost:8081',
      '/api/pricing': process.env.PRICING_URL ?? 'http://localhost:8082',
    },
  },
})
