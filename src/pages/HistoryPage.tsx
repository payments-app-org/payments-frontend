import { useCallback, useEffect, useRef, useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAccounts } from '../api'
import CategoryIcon from '../components/CategoryIcon'
import HistoryFiltersModal from '../components/HistoryFiltersModal'
import { formatMoney } from '../format'
import {
  EMPTY_FILTERS, HISTORY_TIME_ZONE, activeFiltersCount, fetchCategories, fetchOperations, type Category, type HistoryFilters, type Operation,
} from '../history'

// Дни считаем по московскому времени — так же, как сервер считает границы периода
const dayFormat = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'long', timeZone: HISTORY_TIME_ZONE })
const dayWithYearFormat = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'long', year: 'numeric', timeZone: HISTORY_TIME_ZONE })
const yearFormat = new Intl.DateTimeFormat('ru-RU', { year: 'numeric', timeZone: HISTORY_TIME_ZONE })

function dayLabel(iso: string) {
  const d = new Date(iso)
  return (yearFormat.format(d) === yearFormat.format(new Date()) ? dayFormat : dayWithYearFormat).format(d)
}

// Операции подряд по дням: [«01 ноября», [...]], [«30 октября», [...]]
function groupByDay(ops: Operation[]) {
  const groups: [string, Operation[]][] = []
  for (const op of ops) {
    const label = dayLabel(op.occurredAt)
    const last = groups[groups.length - 1]
    if (last && last[0] === label) last[1].push(op)
    else groups.push([label, [op]])
  }
  return groups
}

type Feed = { items: Operation[]; cursor: string | null; loading: boolean; error: boolean; done: boolean }

export default function HistoryPage() {
  const { accounts } = useAccounts()
  const [categories, setCategories] = useState<Category[]>([])
  const [params] = useSearchParams()
  const navigate = useNavigate()
  // «Посмотреть все» со страницы кошелька открывает историю уже отфильтрованной по счёту
  const [filters, setFilters] = useState<HistoryFilters>(() => ({ ...EMPTY_FILTERS, accountId: params.get('accountId') }))
  const [modalOpen, setModalOpen] = useState(false)
  const [feed, setFeed] = useState<Feed>({ items: [], cursor: null, loading: true, error: false, done: false })
  const sentinel = useRef<HTMLDivElement>(null)
  // Номер «поколения» ленты: ответ на старые фильтры не должен попасть в новую ленту
  const generation = useRef(0)

  useEffect(() => { fetchCategories().then(setCategories, () => {}) }, [])

  const loadPage = useCallback((f: HistoryFilters, cursor: string | null) => {
    const gen = generation.current
    setFeed((prev) => ({ ...prev, loading: true, error: false }))
    fetchOperations(f, cursor).then(
      (page) => {
        if (gen !== generation.current) return
        setFeed((prev) => ({
          items: cursor ? [...prev.items, ...page.items] : page.items,
          cursor: page.nextCursor,
          loading: false,
          error: false,
          done: !page.nextCursor,
        }))
      },
      () => { if (gen === generation.current) setFeed((prev) => ({ ...prev, loading: false, error: true })) },
    )
  }, [])

  // Новые фильтры — лента заново с первой страницы
  useEffect(() => {
    generation.current += 1
    setFeed({ items: [], cursor: null, loading: true, error: false, done: false })
    loadPage(filters, null)
  }, [filters, loadPage])

  // Бесконечная прокрутка: дошли до конца списка — подгружаем следующую страницу
  useEffect(() => {
    const el = sentinel.current
    if (!el || feed.loading || feed.done || feed.error) return
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadPage(filters, feed.cursor)
    }, { rootMargin: '400px' })
    observer.observe(el)
    return () => observer.disconnect()
  }, [feed, filters, loadPage])

  const accountLabel = (id: string | null) => {
    const a = accounts?.find((x) => x.id === id)
    return !a ? null : a.kind === 'wallet' ? a.name : `·· ${a.last4}`
  }
  const filtersCount = activeFiltersCount(filters)

  return (
    <section className="panel history">
      <h1>История</h1>
      <div className="filters-row">
        <button type="button" className="chip square" onClick={() => setModalOpen(true)}>
          Фильтры{filtersCount > 0 && <span className="filters-count">{filtersCount}</span>} <SlidersHorizontal size={16} />
        </button>
      </div>

      {groupByDay(feed.items).map(([day, ops]) => (
        <div key={day} className="day">
          <h3>{day}</h3>
          {ops.map((op) => (
            <button type="button" key={op.id} className="op op-link" onClick={() => navigate(`/history/${op.id}`)}>
              <CategoryIcon category={op.category} />
              <div className="op-body">
                <div className="op-title">{op.title}</div>
                <div className="muted">{[op.categoryName, accountLabel(op.accountId)].filter(Boolean).join(' · ')}</div>
                {op.details && <span className="chip tag">{op.details}</span>}
              </div>
              <div className="op-amounts">
                <div className={op.direction === 'INCOME' ? 'amount income' : 'amount'}>
                  {op.direction === 'INCOME' ? '+' : '−'}{formatMoney(op.amount, op.currency)}
                </div>
                {op.cashback && op.direction === 'EXPENSE' && <div className="cashback">+{formatMoney(op.cashback, 'RUB')} кешбэк</div>}
                {op.fee > 0 && <div className="muted">комиссия {formatMoney(op.fee, op.currency)}</div>}
              </div>
            </button>
          ))}
        </div>
      ))}

      {!feed.loading && !feed.error && feed.items.length === 0 && <div className="history-empty muted">Операций не найдено</div>}
      {feed.error && (
        <div className="history-empty">
          <span className="error-text">Не удалось загрузить историю</span>{' '}
          <button type="button" className="link-btn" onClick={() => loadPage(filters, feed.cursor)}>Повторить</button>
        </div>
      )}
      {feed.loading && <div className="history-empty muted">Загружаем…</div>}
      <div ref={sentinel} />

      {modalOpen && (
        <HistoryFiltersModal
          initial={filters}
          accounts={accounts ?? []}
          categories={categories}
          onApply={(f) => { setFilters(f); setModalOpen(false) }}
          onClose={() => setModalOpen(false)}
        />
      )}
    </section>
  )
}
