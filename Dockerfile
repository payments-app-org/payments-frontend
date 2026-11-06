# syntax=docker/dockerfile:1

# dev — dev-сервер Vite для docker compose (payments-local): код монтируется томом, правки видны сразу
FROM node:22-alpine AS dev
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev"]

# Сборка статики: проверка типов и vite build → dist/
FROM dev AS build
RUN npm run build

# Боевой образ (по умолчанию): nginx отдаёт собранную статику. Запросы /api/* сюда не приходят —
# в Kubernetes их разводит по сервисам вход (ingress). Без root, порт 8080
FROM nginxinc/nginx-unprivileged:1.29-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
