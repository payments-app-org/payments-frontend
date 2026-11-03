import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatRub } from '../format'
import { currentMonth, fetchSummary, type Direction, type Summary } from '../history'
import Donut, { toSegments } from './Donut'

// Плитки «Расходы / Доходы» за текущий месяц над историей; по клику — аналитика
export default function MonthTotals() {
  const navigate = useNavigate()
  const [data, setData] = useState<Record<Direction, Summary | null>>({ EXPENSE: null, INCOME: null })

  useEffect(() => {
    const month = currentMonth();
    (['EXPENSE', 'INCOME'] as Direction[]).forEach((d) =>
      fetchSummary(month, d).then((s) => setData((p) => ({ ...p, [d]: s })), () => {}))
  }, [])

  const tile = (d: Direction, title: string) => {
    const s = data[d]
    return (
      <button type="button" className="total-tile" onClick={() => navigate(`/history/analytics?direction=${d}`)}>
        <Donut segments={s ? toSegments(s.groups, (a, b) => a.key.localeCompare(b.key)) : []} size={52} thickness={9} />
        <span>
          <span className="muted">{title}</span>
          <b>{s ? formatRub(Math.round(s.total)) : '…'}</b>
        </span>
      </button>
    )
  }

  return (
    <div className="totals-row">
      {tile('EXPENSE', 'Расходы')}
      {tile('INCOME', 'Доходы')}
    </div>
  )
}
