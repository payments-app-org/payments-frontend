# payments-frontend

Платёжный кабинет: «Платежи и переводы», «История», «Ещё». React + Vite + TypeScript. В `design/` — макеты.

- Локально: из `payments-local` — `scripts/up.sh web`, http://localhost:5173. Запросы к API — через прокси Vite к сервисам (`vite.config.ts`).
- **Вход — через Keycloak** (`src/auth.ts`, библиотека oidc-client-ts): без токена приложение отправляет на страницу входа
  (`/auth` — тот же хост: в кластере маршрут Traefik, локально прокси Vite), Authorization Code + PKCE. Каждый запрос
  в API — через `apiFetch` с заголовком `Authorization: Bearer`; access-токен живёт 5 минут и молча продлевается
  по refresh-токену. id пользователя — `currentUserId()` (claim `sub`), `X-User-Id` ставит gateway. «Ещё» → «Выйти».
- Образ (`Dockerfile`): по умолчанию — боевой, nginx со статикой (`nginx.conf`, порт 8080); цель `dev` — dev-сервер Vite для docker compose.
- CI: шаблон `frontend.yml` из [payments-ci](https://github.com/payments-app-org/payments-ci) — `npm ci`, `npm run build` (проверка типов и сборка), Trivy, сборка и проверка образа. Слияние в `main` — только при зелёной проверке `ci / ok`; после слияния образ публикуется в GHCR и выкатывается в кластер ([payments-deploy](https://github.com/payments-app-org/payments-deploy)): http://payments.localhost.

Страницы и устройство приложения — [payments-local/CLAUDE.md](https://github.com/payments-app-org/payments-local/blob/main/CLAUDE.md).
