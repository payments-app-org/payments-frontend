# payments-frontend

Платёжный кабинет: «Платежи и переводы», «История», «Ещё». React + Vite + TypeScript. В `design/` — макеты.

- Локально: из `payments-local` — `scripts/up.sh web`, http://localhost:5173. Запросы к API — через прокси Vite к сервисам (`vite.config.ts`).
- CI: шаблон `frontend.yml` из [payments-ci](https://github.com/payments-app-org/payments-ci) — `npm ci`, `npm run build` (проверка типов и сборка), Trivy. Слияние в `main` — только при зелёной проверке `ci / ok`.

Страницы и устройство приложения — [payments-local/CLAUDE.md](https://github.com/payments-app-org/payments-local/blob/main/CLAUDE.md).
