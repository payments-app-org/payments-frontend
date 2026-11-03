import { CURRENT_USER_ID } from './api'

export type Direction = 'INCOME' | 'EXPENSE'
export type Loyalty = 'CASHBACK' | 'PREMIUM' | 'DISCOUNT'
export type Currency = 'RUB' | 'USD' | 'EUR'

export type Operation = {
  id: string
  accountId: string | null
  occurredAt: string
  direction: Direction
  category: string
  categoryName: string
  title: string
  details: string | null
  amount: number
  fee: number
  currency: Currency
  cashback: number | null
  loyaltyProgram: Loyalty | null
  counterpartyUserId: string | null
  mcc: string | null
  discount: number
  transactionCode: string | null
}

export type Category = { code: string; name: string }

export type HistoryFilters = {
  accountId: string | null
  period: 'all' | 'week' | 'month' | 'custom'
  from: string // yyyy-mm-dd, для своего периода
  to: string
  direction: Direction | null
  categories: string[]
  loyalty: Loyalty[]
  currencies: Currency[]
}

export const EMPTY_FILTERS: HistoryFilters = {
  accountId: null, period: 'all', from: '', to: '', direction: null, categories: [], loyalty: [], currencies: [],
}

export function activeFiltersCount(f: HistoryFilters) {
  return [f.accountId, f.period !== 'all', f.direction, f.categories.length, f.loyalty.length, f.currencies.length]
    .filter(Boolean).length
}

// Сервер считает дни по Москве — и мы тоже, иначе в другом часовом поясе операции «переедут» на соседний день
export const HISTORY_TIME_ZONE = 'Europe/Moscow'
const isoDate = new Intl.DateTimeFormat('en-CA', { timeZone: HISTORY_TIME_ZONE }) // 2026-11-03

// Неделя и месяц — последние 7 и 30 дней, включая сегодня
function periodRange(f: HistoryFilters): { from?: string; to?: string } {
  if (f.period === 'custom') return { from: f.from || undefined, to: f.to || undefined }
  if (f.period === 'all') return {}
  const days = f.period === 'week' ? 6 : 29
  return { from: isoDate.format(new Date(Date.now() - days * 86_400_000)) }
}

export async function fetchOperations(f: HistoryFilters, cursor: string | null, signal?: AbortSignal, limit = 30) {
  const q = new URLSearchParams({ limit: String(limit) })
  if (f.accountId) q.set('accountId', f.accountId)
  const { from, to } = periodRange(f)
  if (from) q.set('from', from)
  if (to) q.set('to', to)
  if (f.direction) q.set('direction', f.direction)
  f.categories.forEach((c) => q.append('category', c))
  f.loyalty.forEach((l) => q.append('loyalty', l))
  f.currencies.forEach((c) => q.append('currency', c))
  if (cursor) q.set('cursor', cursor)
  const res = await fetch(`/api/history/operations?${q}`, { headers: { 'X-User-Id': CURRENT_USER_ID }, signal })
  if (!res.ok) throw new Error(`Ошибка ${res.status}`)
  return res.json() as Promise<{ items: Operation[]; nextCursor: string | null }>
}

export async function fetchOperation(id: string): Promise<Operation> {
  const res = await fetch(`/api/history/operations/${id}`, { headers: { 'X-User-Id': CURRENT_USER_ID } })
  if (!res.ok) throw new Error(res.status === 404 ? 'Операция не найдена' : `Ошибка ${res.status}`)
  return res.json()
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch('/api/history/categories')
  if (!res.ok) throw new Error(`Ошибка ${res.status}`)
  return res.json()
}
