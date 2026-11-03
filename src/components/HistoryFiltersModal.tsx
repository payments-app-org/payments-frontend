import { useEffect, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import type { Account } from '../api'
import { EMPTY_FILTERS, type Category, type Currency, type HistoryFilters, type Loyalty } from '../history'

const LOYALTY: [Loyalty, string][] = [['CASHBACK', 'Кешбэк рублями'], ['PREMIUM', 'Подписка Премиум'], ['DISCOUNT', 'Скидки партнёров']]
const CURRENCIES: [Currency, string][] = [['RUB', '₽ Рубль'], ['USD', '$ Доллар'], ['EUR', '€ Евро']]

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" className={active ? 'filter-chip active' : 'filter-chip'} onClick={onClick}>{children}</button>
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="filter-section">
      <h3>{title}</h3>
      <div className="filter-chips">{children}</div>
    </section>
  )
}

function toggle<T>(list: T[], value: T) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

// Окно фильтров истории: правки копятся локально и применяются по кнопке «Показать»
export default function HistoryFiltersModal({ initial, accounts, categories, onApply, onClose }: {
  initial: HistoryFilters
  accounts: Account[]
  categories: Category[]
  onApply: (f: HistoryFilters) => void
  onClose: () => void
}) {
  const [f, setF] = useState(initial)
  const set = (patch: Partial<HistoryFilters> | ((prev: HistoryFilters) => Partial<HistoryFilters>)) =>
    setF((prev) => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Фильтры">
        <div className="modal-head">
          <h2>Фильтры</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Закрыть"><X size={20} /></button>
        </div>

        <div className="modal-body">
          <Section title="Карты и счета">
            <Chip active={!f.accountId} onClick={() => set({ accountId: null })}>Все</Chip>
            {accounts.map((a) => (
              <Chip key={a.id} active={f.accountId === a.id} onClick={() => set({ accountId: a.id })}>{a.title}</Chip>
            ))}
          </Section>

          <Section title="Период">
            <Chip active={f.period === 'all'} onClick={() => set({ period: 'all' })}>Всё время</Chip>
            <Chip active={f.period === 'week'} onClick={() => set({ period: 'week' })}>Неделя</Chip>
            <Chip active={f.period === 'month'} onClick={() => set({ period: 'month' })}>Месяц</Chip>
            <Chip active={f.period === 'custom'} onClick={() => set({ period: 'custom' })}>Свой период</Chip>
          </Section>
          {f.period === 'custom' && (
            <div className="period-inputs">
              <label>с <input type="date" className="input" value={f.from} max={f.to || undefined} onChange={(e) => set({ from: e.target.value })} /></label>
              <label>по <input type="date" className="input" value={f.to} min={f.from || undefined} onChange={(e) => set({ to: e.target.value })} /></label>
            </div>
          )}

          <Section title="Движение средств">
            <Chip active={!f.direction} onClick={() => set({ direction: null })}>Все</Chip>
            <Chip active={f.direction === 'INCOME'} onClick={() => set({ direction: 'INCOME' })}>Поступления</Chip>
            <Chip active={f.direction === 'EXPENSE'} onClick={() => set({ direction: 'EXPENSE' })}>Списания</Chip>
          </Section>

          <Section title="Категория">
            {categories.map((c) => (
              <Chip key={c.code} active={f.categories.includes(c.code)} onClick={() => set((p) => ({ categories: toggle(p.categories, c.code) }))}>{c.name}</Chip>
            ))}
          </Section>

          <Section title="Программа лояльности">
            {LOYALTY.map(([code, name]) => (
              <Chip key={code} active={f.loyalty.includes(code)} onClick={() => set((p) => ({ loyalty: toggle(p.loyalty, code) }))}>{name}</Chip>
            ))}
          </Section>

          <Section title="Валюта">
            {CURRENCIES.map(([code, name]) => (
              <Chip key={code} active={f.currencies.includes(code)} onClick={() => set((p) => ({ currencies: toggle(p.currencies, code) }))}>{name}</Chip>
            ))}
          </Section>
        </div>

        <div className="modal-foot">
          <button type="button" className="btn-secondary" onClick={() => setF(EMPTY_FILTERS)}>Сбросить</button>
          <button type="button" className="btn-primary" onClick={() => onApply(f)}>Показать</button>
        </div>
      </div>
    </div>
  )
}
