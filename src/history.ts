import { apiFetch } from './auth'

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
  // Магазин / контрагент — второй уровень «провала» в аналитике
  title?: string | null
}

export const EMPTY_FILTERS: HistoryFilters = {
  accountId: null, period: 'all', from: '', to: '', direction: null, categories: [], loyalty: [], currencies: [], title: null,
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
  if (f.title) q.set('title', f.title)
  if (cursor) q.set('cursor', cursor)
  const res = await apiFetch(`/api/history/operations?${q}`, { signal })
  if (!res.ok) throw new Error(`Ошибка ${res.status}`)
  return res.json() as Promise<{ items: Operation[]; nextCursor: string | null }>
}

export async function fetchOperation(id: string): Promise<Operation> {
  const res = await apiFetch(`/api/history/operations/${id}`)
  if (!res.ok) throw new Error(res.status === 404 ? 'Операция не найдена' : `Ошибка ${res.status}`)
  return res.json()
}

export type SummaryGroup = { key: string; name: string; total: number; count: number }
export type Summary = {
  month: string
  direction: Direction
  category: string | null
  total: number
  count: number
  groups: SummaryGroup[]
  previousMonth: string
  nextMonth: string
}

// Итог за месяц и разбивка: по категориям, а внутри категории — по магазинам/контрагентам
export async function fetchSummary(month: string, direction: Direction, category?: string | null, title?: string | null): Promise<Summary> {
  const q = new URLSearchParams({ month, direction })
  if (category) q.set('category', category)
  if (title) q.set('title', title)
  const res = await apiFetch(`/api/history/summary?${q}`)
  if (!res.ok) throw new Error(`Ошибка ${res.status}`)
  return res.json()
}

// Текущий месяц по Москве: 2026-11
export function currentMonth() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: HISTORY_TIME_ZONE, year: 'numeric', month: '2-digit' }).format(new Date())
}

// Первый и последний день месяца: 2026-11 → 2026-11-01, 2026-11-30
export function monthRange(month: string) {
  const [y, m] = month.split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, '0')}` }
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await apiFetch('/api/history/categories')
  if (!res.ok) throw new Error(`Ошибка ${res.status}`)
  return res.json()
}
