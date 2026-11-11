import { UserManager, WebStorageStateStore, type User } from 'oidc-client-ts'

// Вход через Keycloak по OpenID Connect: Authorization Code + PKCE (рекомендация для браузерных приложений —
// у SPA нет места, где спрятать секрет клиента, поэтому клиент публичный, а код защищает одноразовый PKCE).
// Keycloak — на том же хосте по пути /auth (в кластере — маршрут Traefik, в compose — прокси Vite), поэтому
// адрес не настраивается под окружение и CORS не нужен.
//
// Токены — в sessionStorage вкладки (новая вкладка войдёт без пароля: сессия Keycloak в его cookie).
// Компромисс SPA: токен доступен JavaScript страницы, при XSS его можно украсть — поэтому access-токен короткий
// (5 минут). Самый строгий вариант — BFF: токены держит сервер, у браузера только cookie сессии.
const userManager = new UserManager({
  authority: `${window.location.origin}/auth/realms/payments`,
  client_id: 'payments-web',
  redirect_uri: `${window.location.origin}/`,
  post_logout_redirect_uri: `${window.location.origin}/`,
  response_type: 'code',
  scope: 'openid profile',
  // Незадолго до истечения access-токена — новый по refresh-токену, без перехода на страницу входа
  automaticSilentRenew: true,
  userStore: new WebStorageStateStore({ store: window.sessionStorage }),
})

let user: User | null = null

const here = () => window.location.pathname + window.location.search + window.location.hash

// Отправить на страницу входа; после входа вернёмся на ту же страницу (адрес — в state запроса)
function login(): Promise<void> {
  return userManager.signinRedirect({ state: here() })
}

// Вызывается до отрисовки приложения. true — пользователь вошёл; false — браузер уходит на страницу входа
export async function initAuth(): Promise<boolean> {
  const params = new URLSearchParams(window.location.search)
  if (params.has('code') && params.has('state')) {
    // Вернулись со страницы входа: меняем одноразовый код на токены (с проверкой PKCE и state)
    user = await userManager.signinRedirectCallback()
    window.history.replaceState(null, '', typeof user.state === 'string' ? user.state : '/')
  } else {
    user = await userManager.getUser()
  }
  // Access-токен истёк, а refresh ещё жив (вкладку открыли снова) — продлеваем молча
  if (user?.expired && user.refresh_token) {
    user = await userManager.signinSilent().catch(() => null)
  }
  if (!user || user.expired) {
    await login()
    return false
  }
  userManager.events.addUserLoaded((renewed) => { user = renewed })
  // Refresh-токен отозван или сессия Keycloak закончилась — входим заново
  userManager.events.addSilentRenewError(() => { void login() })
  return true
}

// id пользователя — claim sub токена (в Keycloak он равен id в сервисе account)
export function currentUserId(): string {
  if (!user) throw new Error('Пользователь не вошёл')
  return user.profile.sub
}

// fetch в наш API: добавляет access-токен. 401 — токен уже не принимают (отозван, сессия закрыта): входим заново
export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers)
  if (user) headers.set('Authorization', `Bearer ${user.access_token}`)
  const res = await fetch(input, { ...init, headers })
  if (res.status === 401) await login()
  return res
}

// Выход: закрыть сессию в Keycloak (иначе следующий вход прошёл бы без пароля) и вернуться на главную
export function logout(): Promise<void> {
  return userManager.signoutRedirect({ id_token_hint: user?.id_token })
}
