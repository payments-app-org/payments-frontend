import { useEffect, useRef, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'

// Даты — строки yyyy-mm-dd; to = null — выбрана одна дата
export type DateRange = { from: string | null; to: string | null }

const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
const WEEKDAYS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const ruDate = (isoDate: string) => isoDate.split('-').reverse().join('.')

// 6 недель с понедельника, захватывая хвосты соседних месяцев
function monthGrid(year: number, month: number) {
  const first = new Date(year, month, 1)
  const shift = (first.getDay() + 6) % 7
  return Array.from({ length: 42 }, (_, i) => new Date(year, month, 1 - shift + i))
}

// Поле «ДД.ММ.ГГГГ — ДД.ММ.ГГГГ» с календарём: первый клик — начало, второй — конец периода. Будущие дни недоступны.
export default function DateRangePicker({ value, onChange }: { value: DateRange; onChange: (r: DateRange) => void }) {
  const today = iso(new Date())
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() } })
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const pick = (day: string) => {
    if (!value.from || value.to) onChange({ from: day, to: null })
    else if (day < value.from) onChange({ from: day, to: value.from })
    else onChange({ from: value.from, to: day })
  }
  const step = (delta: number) => setView((v) => {
    const d = new Date(v.year, v.month + delta, 1)
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const label = value.from ? `${ruDate(value.from)}${value.to && value.to !== value.from ? ` — ${ruDate(value.to)}` : ''}` : ''
  const canGoForward = iso(new Date(view.year, view.month + 1, 1)) <= today

  return (
    <div className="date-range" ref={ref}>
      <button type="button" className={open ? 'input date-range-input focused' : 'input date-range-input'} onClick={() => setOpen(!open)}>
        <span className={label ? '' : 'placeholder'}>{label || 'ДД.ММ.ГГГГ'}</span>
        <CalendarDays size={20} className="muted" />
      </button>
      {open && (
        <div className="calendar">
          <div className="calendar-head">
            <button type="button" className="icon-btn" onClick={() => step(-1)} aria-label="Предыдущий месяц"><ChevronLeft size={20} /></button>
            <span>{MONTHS[view.month]} <b>{view.year}</b></span>
            <button type="button" className="icon-btn" onClick={() => step(1)} disabled={!canGoForward} aria-label="Следующий месяц"><ChevronRight size={20} /></button>
          </div>
          <div className="calendar-grid">
            {WEEKDAYS.map((d) => <span key={d} className="calendar-weekday">{d}</span>)}
            {monthGrid(view.year, view.month).map((d) => {
              const day = iso(d)
              const inRange = value.from && value.to && day > value.from && day < value.to
              const edge = day === value.from || day === value.to
              const cls = ['calendar-day',
                d.getMonth() !== view.month && 'other',
                day === today && 'today',
                inRange && 'in-range',
                edge && 'edge'].filter(Boolean).join(' ')
              return (
                <button type="button" key={day} className={cls} disabled={day > today} onClick={() => pick(day)}>{d.getDate()}</button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
