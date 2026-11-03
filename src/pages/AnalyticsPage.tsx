import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import CategoryIcon from '../components/CategoryIcon'
import Donut, { OTHER_KEY, toSegments } from '../components/Donut'
import { formatMoney, formatRub } from '../format'
import {
  EMPTY_FILTERS, HISTORY_TIME_ZONE, currentMonth, fetchCategories, fetchOperations, fetchSummary, monthRange,
  type Category, type Direction, type Operation, type Summary,
} from '../history'

const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
const dayFormat = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'long', timeZone: HISTORY_TIME_ZONE })

const monthLabel = (month: string) => {
  const [y, m] = month.split('-').map(Number)
  return `${MONTHS[m - 1]}${y === new Date().getFullYear() ? '' : ` ${y}`}`
}

// Операции подряд по дням с суммой за день
function groupByDay(ops: Operation[]) {
  const groups: { day: string; total: number; ops: Operation[] }[] = []
  for (const op of ops) {
    const day = dayFormat.format(new Date(op.occurredAt))
    const last = groups[groups.length - 1]
    if (last?.day === day) { last.ops.push(op); last.total += op.amount }
    else groups.push({ day, total: op.amount, ops: [op] })
  }
  return groups
}

// Аналитика расходов и доходов за месяц: кольцо по категориям → внутри категории по магазинам/контрагентам → операции.
// Всё состояние — в адресе (?direction=&month=&category=&title=), чтобы работали «назад» и ссылки.
export default function AnalyticsPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const direction = (params.get('direction') === 'INCOME' ? 'INCOME' : 'EXPENSE') as Direction
  const month = params.get('month') ?? currentMonth()
  const category = params.get('category')
  const title = params.get('title')

  const [categories, setCategories] = useState<Category[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [ops, setOps] = useState<{ items: Operation[]; cursor: string | null; loading: boolean; done: boolean }>({ items: [], cursor: null, loading: true, done: false })
  const sentinel = useRef<HTMLDivElement>(null)
  const generation = useRef(0)

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)))
    setParams(next)
  }

  useEffect(() => { fetchCategories().then(setCategories, () => {}) }, [])
  useEffect(() => { setSummary(null); fetchSummary(month, direction, category, title).then(setSummary, () => {}) }, [month, direction, category, title])

  // Без выбранной категории — все, кроме переводов между своими счетами (как в итогах)
  const filters = useMemo(() => {
    const { from, to } = monthRange(month)
    const all = categories.map((c) => c.code).filter((c) => c !== 'OWN_TRANSFER')
    return { ...EMPTY_FILTERS, period: 'custom' as const, from, to, direction, categories: category ? [category] : all, title }
  }, [month, direction, category, title, categories])

  const loadPage = useCallback((cursor: string | null) => {
    const gen = generation.current
    setOps((p) => ({ ...p, loading: true }))
    fetchOperations(filters, cursor).then((page) => {
      if (gen !== generation.current) return
      setOps((p) => ({ items: cursor ? [...p.items, ...page.items] : page.items, cursor: page.nextCursor, loading: false, done: !page.nextCursor }))
    }, () => { if (gen === generation.current) setOps((p) => ({ ...p, loading: false, done: true })) })
  }, [filters])

  useEffect(() => {
    generation.current += 1
    setOps({ items: [], cursor: null, loading: true, done: false })
    loadPage(null)
  }, [loadPage])

  useEffect(() => {
    const el = sentinel.current
    if (!el || ops.loading || ops.done) return
    const io = new IntersectionObserver((e) => { if (e[0].isIntersecting) loadPage(ops.cursor) }, { rootMargin: '400px' })
    io.observe(el)
    return () => io.disconnect()
  }, [ops, loadPage])

  // Порядок для закрепления цветов: категории — по справочнику, магазины/люди — по алфавиту
  const segments = useMemo(() => {
    if (!summary) return []
    const order = category
      ? (a: { key: string }, b: { key: string }) => a.key.localeCompare(b.key, 'ru')
      : (a: { key: string }, b: { key: string }) => categories.findIndex((c) => c.code === a.key) - categories.findIndex((c) => c.code === b.key)
    return toSegments(summary.groups, order)
  }, [summary, category, categories])

  const categoryName = categories.find((c) => c.code === category)?.name ?? category
  const drill = (key: string) => {
    if (key === OTHER_KEY) return
    if (!category) update({ category: key, title: null })
    else if (!title) update({ title: key })
  }
  const isCurrent = month >= currentMonth()

  return (
    <>
      <Link to="/history" className="back"><ChevronLeft size={18} /> История</Link>
      <section className="panel analytics">
        <h1>Аналитика финансов</h1>
        <div className="segmented">
          <button type="button" className={direction === 'EXPENSE' ? 'active' : ''} onClick={() => update({ direction: 'EXPENSE', category: null, title: null })}>Расходы</button>
          <button type="button" className={direction === 'INCOME' ? 'active' : ''} onClick={() => update({ direction: 'INCOME', category: null, title: null })}>Доходы</button>
        </div>

        <div className="analytics-month">{monthLabel(month)}</div>
        <div className="analytics-total">{summary ? formatRub(summary.total) : '…'}</div>

        {(category || title) && (
          <div className="analytics-filters">
            {category && <button type="button" className="filter-pill" onClick={() => update({ category: null, title: null })}>{categoryName} <X size={16} /></button>}
            {title && <button type="button" className="filter-pill" onClick={() => update({ title: null })}>{title} <X size={16} /></button>}
          </div>
        )}

        <div className="analytics-chart">
          <button type="button" className="icon-btn" onClick={() => update({ month: summary?.previousMonth ?? null })} aria-label="Предыдущий месяц"><ChevronLeft size={28} /></button>
          {summary && summary.count > 0
            ? <Donut segments={segments} onSelect={title ? undefined : drill} label={`${direction === 'EXPENSE' ? 'Расходы' : 'Доходы'} по ${category ? 'получателям' : 'категориям'}`} />
            : <div className="donut-empty muted">{summary ? 'За этот месяц операций нет' : 'Загружаем…'}</div>}
          <button type="button" className="icon-btn" onClick={() => update({ month: summary?.nextMonth ?? null })} disabled={isCurrent} aria-label="Следующий месяц"><ChevronRight size={28} /></button>
        </div>

        <div className="legend">
          {segments.map((s) => (
            <button type="button" key={s.key} className="legend-chip" onClick={() => drill(s.key)} disabled={!!title || s.key === OTHER_KEY}>
              <span className="legend-dot" style={{ background: s.color }} />
              <span className="legend-name">{s.label}</span>
              <b>{formatRub(Math.round(s.value * 100) / 100)}</b>
            </button>
          ))}
        </div>

        <div className="analytics-ops">
          {groupByDay(ops.items).map((g) => (
            <div key={g.day} className="day">
              <h3>{g.day} <span className="muted day-total">{formatRub(Math.round(g.total * 100) / 100)}</span></h3>
              {g.ops.map((op) => (
                <button type="button" key={op.id} className="op op-link" onClick={() => navigate(`/history/${op.id}`)}>
                  <CategoryIcon category={op.category} />
                  <div className="op-body">
                    <div className="op-title">{op.title}</div>
                    <div className="muted">{op.categoryName}</div>
                    {op.details && <span className="chip tag">{op.details}</span>}
                  </div>
                  <div className="op-amounts">
                    <div className={op.direction === 'INCOME' ? 'amount income' : 'amount'}>{op.direction === 'INCOME' ? '+' : ''}{formatMoney(op.amount, op.currency)}</div>
                    {op.cashback && op.direction === 'EXPENSE' && <div className="cashback">+{formatMoney(op.cashback, 'RUB')} кешбэк</div>}
                  </div>
                </button>
              ))}
            </div>
          ))}
          {ops.loading && <div className="history-empty muted">Загружаем…</div>}
          <div ref={sentinel} />
        </div>
      </section>
    </>
  )
}
