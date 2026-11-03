import { useEffect, useState } from 'react'

// Авторизации пока нет — работаем от имени демо-пользователя из сида сервиса account
export const CURRENT_USER_ID = '00000000-0000-0000-0000-000000000001'

export type Account = { id: string; kind: 'card' | 'wallet'; title: string; balance: number }

type ApiAccount = {
  id: string
  type: 'WALLET' | 'CARD'
  title: string
  balance: number
  cardLast4: string | null
}

export type OperationType = 'PHONE_TRANSFER' | 'CARD_TRANSFER' | 'OWN_TRANSFER'

export type Commission = {
  amount: number
  percent: number
  commission: number
  total: number
  subscription: 'NONE' | 'PREMIUM' | 'PREMIUM_PLUS'
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.json()
}

function toAccount(a: ApiAccount): Account {
  return a.type === 'CARD'
    ? { id: a.id, kind: 'card', title: `${a.title} ·· ${a.cardLast4}`, balance: a.balance }
    : { id: a.id, kind: 'wallet', title: a.title, balance: a.balance }
}

// По умолчанию списываем с карты, как в макете; кошелёк — если карт нет
export function defaultSource(accounts: Account[] | null) {
  return accounts?.find((a) => a.kind === 'card') ?? accounts?.[0] ?? null
}

export function fetchAccounts() {
  return request<ApiAccount[]>(`/api/users/${CURRENT_USER_ID}/accounts`).then((list) => list.map(toAccount))
}

export function fetchCommission(operationType: OperationType, amount: number, signal: AbortSignal) {
  return request<Commission>('/api/pricing/commission', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: CURRENT_USER_ID, operationType, amount }),
    signal,
  })
}

export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetchAccounts().then(setAccounts, () => setError(true))
  }, [])

  return { accounts, error }
}

export type CommissionState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; data: Commission }
  | { status: 'error' }

const DEBOUNCE_MS = 500

// Считаем комиссию через полсекунды после того, как пользователь перестал вводить сумму
export function useCommission(operationType: OperationType, amount: number): CommissionState {
  const [state, setState] = useState<CommissionState>({ status: 'idle' })

  useEffect(() => {
    if (amount <= 0) {
      setState({ status: 'idle' })
      return
    }
    setState({ status: 'loading' })
    const controller = new AbortController()
    const timer = setTimeout(() => {
      fetchCommission(operationType, amount, controller.signal).then(
        (data) => setState({ status: 'ready', data }),
        () => { if (!controller.signal.aborted) setState({ status: 'error' }) },
      )
    }, DEBOUNCE_MS)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [operationType, amount])

  return state
}
