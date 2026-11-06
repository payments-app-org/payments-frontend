# payments-frontend

Платёжный кабинет: «Платежи и переводы», «История», «Ещё». React + Vite + TypeScript. В `design/` — макеты.

- Локально: из `payments-local` — `scripts/up.sh web`, http://localhost:5173. Запросы к API — через прокси Vite к сервисам (`vite.config.ts`).
- Образ (`Dockerfile`): по умолчанию — боевой, nginx со статикой (`nginx.conf`, порт 8080); цель `dev` — dev-сервер Vite для docker compose.
- CI: шаблон `frontend.yml` из [payments-ci](https://github.com/payments-app-org/payments-ci) — `npm ci`, `npm run build` (проверка типов и сборка), Trivy, сборка и проверка образа. Слияние в `main` — только при зелёной проверке `ci / ok`; после слияния образ публикуется в GHCR и выкатывается в кластер ([payments-deploy](https://github.com/payments-app-org/payments-deploy)): http://payments.localhost.

Страницы и устройство приложения — [payments-local/CLAUDE.md](https://github.com/payments-app-org/payments-local/blob/main/CLAUDE.md).
