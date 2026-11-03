import { useState } from 'react'
import { formatRub } from '../format'

export type DonutSegment = { key: string; label: string; value: number; color: string }

// Категориальная палитра в фиксированном порядке (светлая тема, проверена на различимость при дальтонизме).
// Девятой категории не бывает: всё, что не влезло, сворачивается в «Остальное» нейтрального цвета.
export const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6']
export const OTHER_COLOR = '#9a9da6'
export const OTHER_KEY = '__other'

// Не больше семи групп, остальные — в «Остальное». Цвет закреплён за группой по её месту в порядке order (категория/алфавит),
// а не по величине суммы — при смене месяца цвета не «прыгают» между группами.
export function toSegments<T extends { key: string; name: string; total: number }>(groups: T[], order: (a: T, b: T) => number): DonutSegment[] {
  const top = [...groups].sort((a, b) => b.total - a.total)
  const shown = top.slice(0, SERIES.length)
  const rest = top.slice(SERIES.length)
  const colored = [...shown].sort(order).map((g, i) => ({ key: g.key, label: g.name, value: g.total, color: SERIES[i] }))
  const byTotal = colored.sort((a, b) => b.value - a.value)
  if (rest.length) {
    byTotal.push({ key: OTHER_KEY, label: 'Остальное', value: rest.reduce((s, g) => s + g.total, 0), color: OTHER_COLOR })
  }
  return byTotal
}

// Кольцо «доли целого». Между сегментами — зазор в цвет фона; при наведении — название, сумма и доля в центре.
export default function Donut({ segments, size = 240, thickness = 30, onSelect, label }: {
  segments: DonutSegment[]
  size?: number
  thickness?: number
  onSelect?: (key: string) => void
  label?: string
}) {
  const [hover, setHover] = useState<string | null>(null)
  const total = segments.reduce((s, x) => s + x.value, 0)
  const r = 50 - thickness / size * 50
  const stroke = thickness / size * 100
  const c = 2 * Math.PI * r
  const gap = segments.length > 1 ? 0.8 : 0
  let offset = 0
  const active = segments.find((s) => s.key === hover)

  return (
    <div className="donut" style={{ width: size, height: size }} aria-label={label} role="img">
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--soft)" strokeWidth={stroke} />
        {total > 0 && segments.map((s) => {
          const len = (s.value / total) * c
          const dash = Math.max(len - gap, 0.3)
          const el = (
            <circle key={s.key} cx="50" cy="50" r={r} fill="none" stroke={s.color}
              strokeWidth={hover === s.key ? stroke + 3 : stroke}
              strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={-offset}
              transform="rotate(-90 50 50)"
              className={onSelect && s.key !== OTHER_KEY ? 'donut-seg clickable' : 'donut-seg'}
              onMouseEnter={() => setHover(s.key)} onMouseLeave={() => setHover(null)}
              onClick={() => onSelect && s.key !== OTHER_KEY && onSelect(s.key)} />
          )
          offset += len
          return el
        })}
      </svg>
      {active && (
        <div className="donut-center">
          <div className="donut-center-label">{active.label}</div>
          <b>{formatRub(Math.round(active.value * 100) / 100)}</b>
          <div className="muted">{Math.round((active.value / total) * 1000) / 10}%</div>
        </div>
      )}
    </div>
  )
}
