import { useCallback, useEffect, useRef, useState } from 'react'

// Авторизации пока нет — работаем от имени демо-пользователя из сида сервиса account
export const CURRENT_USER_ID = '00000000-0000-0000-0000-000000000001'

export type PaymentSystem = 'MIR' | 'VISA' | 'MASTERCARD'

// Лимиты счёта; null — без ограничения
export type AccountLimits = { maxPayment: number | null; maxBalance: number | null; maxMonthlyTurnover: number | null }

// kind: wallet — «Мой кошелёк», card — карта нашего банка, external — привязанная карта другого банка.
// balance — сколько можно потратить (без зарезервированного под платежи в процессе); null — неизвестно (карта другого банка).
// title — для выпадающих списков («Кредитная ·· 1006»), name и last4 — по отдельности.
// defaultForPayments — «сердечко»: подставляется в «Списать с» по умолчанию.
export type Account = {
  id: string
  kind: 'card' | 'wallet' | 'external'
  title: string
  name: string
  last4: string | null
  paymentSystem: PaymentSystem | null
  balance: number | null
  cardExpiry: string | null
  isDefault: boolean
  defaultForPayments: boolean
  limits: AccountLimits | null
}

type ApiAccount = {
  id: string
  type: 'WALLET' | 'CARD' | 'EXTERNAL_CARD'
  title: string
  available: number | null
  cardLast4: string | null
  paymentSystem: PaymentSystem | null
  cardExpiry: string | null
  isDefault: boolean
  defaultForPayments: boolean
  limits: AccountLimits | null
}

export type OperationType = 'SBP_PHONE' | 'CARD2CARD' | 'OWN_TRANSFER'

export type Commission = {
  amount: number
  percent: number
  minFee: number
  fixedFee: number
  commission: number
  total: number
  subscription: 'NONE' | 'PREMIUM' | 'PREMIUM_PLUS'
  quoteToken: string
}

export type PaymentStatus =
  | 'CREATED' | 'RESERVED' | 'FRAUD_APPROVED' | 'SENT_TO_PROCESSING'
  | 'CONFIRMING' | 'SUCCESS' | 'COMPENSATING' | 'FAILED'

export type Payment = {
  paymentId: string
  status: PaymentStatus
  amount: number
  commission: number
  total: number
  recipientName: string | null
  recipientBankId: string | null
  failureCode: string | null
  message: string
}

export class ApiError extends Error {
  constructor(readonly status: number, message: string, readonly code?: string) {
    super(message)
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) {
    const problem = await res.json().catch(() => null)
    throw new ApiError(res.status, problem?.detail ?? `Ошибка ${res.status}`, problem?.code)
  }
  return res.json()
}

function toAccount(a: ApiAccount): Account {
  const base = {
    id: a.id, name: a.title, last4: a.cardLast4, paymentSystem: a.paymentSystem, balance: a.available,
    cardExpiry: a.cardExpiry, isDefault: a.isDefault, defaultForPayments: a.defaultForPayments, limits: a.limits,
  }
  if (a.type === 'WALLET') return { ...base, kind: 'wallet', title: a.title }
  return { ...base, kind: a.type === 'CARD' ? 'card' : 'external', title: `${a.title} ·· ${a.cardLast4}` }
}

// «Списать с» по умолчанию: отмеченный сердечком счёт, иначе первая карта нашего банка, иначе что есть
export function defaultSource(accounts: Account[] | null, except?: string | null) {
  const candidates = accounts?.filter((a) => a.id !== except) ?? []
  return candidates.find((a) => a.defaultForPayments) ?? candidates.find((a) => a.kind === 'card') ?? candidates[0] ?? null
}

export function linkCard(cardNumber: string, expiry: string, cvc: string) {
  return request<ApiAccount>(`/api/users/${CURRENT_USER_ID}/linked-cards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cardNumber, expiry, cvc }),
  }).then((a) => { notifyAccountsChanged(); return toAccount(a) })
}

export function setDefaultPaymentAccount(accountId: string) {
  return request<ApiAccount[]>(`/api/users/${CURRENT_USER_ID}/default-payment-account`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accountId }),
  }).then(() => notifyAccountsChanged())
}

export function fetchAccounts() {
  return request<ApiAccount[]>(`/api/users/${CURRENT_USER_ID}/accounts`).then((list) => list.map(toAccount))
}

// От чего ещё зависит тариф: карта получателя (наша или чужая) или свой счёт зачисления
export type CommissionTarget = { recipientCardNumber?: string; destinationAccountId?: string }

export function fetchCommission(operationType: OperationType, sourceAccountId: string, amount: number, target: CommissionTarget, signal: AbortSignal) {
  return request<Commission>('/api/pricing/commission', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: CURRENT_USER_ID, sourceAccountId, operationType, amount, ...target }),
    signal,
  })
}

export type Profile = {
  id: string
  displayName: string
  phone: string
  subscription: 'NONE' | 'PREMIUM' | 'PREMIUM_PLUS'
  identificationLevel: 'ANONYMOUS' | 'SIMPLIFIED' | 'FULL'
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null)
  useEffect(() => { request<Profile>(`/api/users/${CURRENT_USER_ID}`).then(setProfile, () => {}) }, [])
  return profile
}

export type TariffRow = { label: string; percent: number; minFee: number; fixedFee: number }
export type TariffSection = { operationType: string; title: string; outgoing: TariffRow[]; incoming: TariffRow[] }

export function fetchTariffs(account: 'WALLET' | 'OUR_CARD') {
  return request<{ subscription: string; sections: TariffSection[] }>(`/api/pricing/tariffs?userId=${CURRENT_USER_ID}&account=${account}`)
}

const ACCOUNTS_CHANGED = 'accounts-changed'

// Балансы поменялись (прошёл платёж) — все, кто показывает счета, перезапросят их
export function notifyAccountsChanged() {
  window.dispatchEvent(new Event(ACCOUNTS_CHANGED))
}

export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    const load = () => fetchAccounts().then(setAccounts, () => setError(true))
    load()
    window.addEventListener(ACCOUNTS_CHANGED, load)
    return () => window.removeEventListener(ACCOUNTS_CHANGED, load)
  }, [])

  return { accounts, error }
}

export type CommissionState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; data: Commission }
  | { status: 'error'; message: string }

const DEBOUNCE_MS = 500

// Считаем комиссию через полсекунды после того, как пользователь перестал вводить сумму.
// refresh — увеличить, чтобы взять новую котировку (старая использована или истекла).
// target === null — получатель ещё не указан, считать рано.
export function useCommission(operationType: OperationType, sourceAccountId: string | undefined, amount: number, refresh = 0,
  target: CommissionTarget | null = {}): CommissionState {
  const [state, setState] = useState<CommissionState>({ status: 'idle' })
  const targetKey = target === null ? null : `${target.recipientCardNumber ?? ''}|${target.destinationAccountId ?? ''}`

  useEffect(() => {
    if (amount <= 0 || !sourceAccountId || targetKey === null) {
      setState({ status: 'idle' })
      return
    }
    const [recipientCardNumber, destinationAccountId] = targetKey.split('|')
    setState({ status: 'loading' })
    const controller = new AbortController()
    const timer = setTimeout(() => {
      fetchCommission(operationType, sourceAccountId, amount,
        { recipientCardNumber: recipientCardNumber || undefined, destinationAccountId: destinationAccountId || undefined },
        controller.signal).then(
        (data) => setState({ status: 'ready', data }),
        (e) => {
          if (controller.signal.aborted) return
          // 422 — такой перевод недоступен (например, по СБП с карты другого банка): показываем причину
          setState({ status: 'error', message: e instanceof ApiError && e.status === 422 ? e.message : 'Не удалось рассчитать комиссию, попробуйте ещё раз' })
        },
      )
    }, DEBOUNCE_MS)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [operationType, sourceAccountId, amount, refresh, targetKey])

  return state
}

export type PaymentRequest = {
  type: 'SBP_PHONE' | 'CARD2CARD' | 'OWN_TRANSFER'
  sourceAccountId: string
  recipientPhone?: string
  recipientBankId?: string
  recipientCardNumber?: string
  destinationAccountId?: string
  amount: number
  quoteToken: string
  message?: string
}

export type SubmitState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'done'; payment: Payment }
  | { status: 'rejected'; message: string; code?: string }

const POLL_MS = 2000
const FINAL: PaymentStatus[] = ['SUCCESS', 'FAILED']

function getPayment(id: string) {
  return request<Payment>(`/api/payments/${id}`, { headers: { 'X-User-Id': CURRENT_USER_ID } })
}

// Отправка платежа. Ключ идемпотентности живёт, пока не получен ответ:
// если запрос оборвался и пользователь нажал ещё раз — уйдёт тот же ключ, двойного списания не будет.
export function usePaymentSubmit() {
  const [state, setState] = useState<SubmitState>({ status: 'idle' })
  const key = useRef<string>(crypto.randomUUID())
  const alive = useRef(true)

  // Выставляем при каждом монтировании: StrictMode в dev монтирует компонент дважды
  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])

  const submit = useCallback(async (body: PaymentRequest) => {
    setState({ status: 'submitting' })
    try {
      let payment = await request<Payment>('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': CURRENT_USER_ID, 'X-Idempotency-Key': key.current },
        body: JSON.stringify(body),
      })
      key.current = crypto.randomUUID()
      // 202 — платёж ещё идёт: опрашиваем, пока не завершится
      while (!FINAL.includes(payment.status) && alive.current) {
        if (alive.current) setState({ status: 'done', payment })
        await new Promise((r) => setTimeout(r, POLL_MS))
        payment = await getPayment(payment.paymentId)
      }
      if (alive.current) setState({ status: 'done', payment })
      notifyAccountsChanged()
    } catch (e) {
      if (e instanceof ApiError) {
        key.current = crypto.randomUUID()
        setState({ status: 'rejected', message: e.message, code: e.code })
      } else {
        // Сеть оборвалась — ключ оставляем, повтор безопасен
        setState({ status: 'rejected', message: 'Нет связи с сервером, попробуйте ещё раз' })
      }
    }
  }, [])

  const reset = useCallback(() => setState({ status: 'idle' }), [])

  return { state, submit, reset }
}
