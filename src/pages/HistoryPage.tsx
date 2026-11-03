import { SlidersHorizontal } from 'lucide-react'
import { operations, type Operation } from '../data/mock'
import { formatRub } from '../format'

function groupByDate(list: Operation[]) {
  const groups = new Map<string, Operation[]>()
  for (const op of list) {
    groups.set(op.date, [...(groups.get(op.date) ?? []), op])
  }
  return [...groups.entries()]
}

export default function HistoryPage() {
  return (
    <section className="panel history">
      <h1>История</h1>
      <div className="filters-row">
        <button className="chip square">Фильтры <SlidersHorizontal size={16} /></button>
      </div>

      {groupByDate(operations).map(([date, ops]) => (
        <div key={date} className="day">
          <h3>{date}</h3>
          {ops.map((op) => (
            <div key={op.id} className="op">
              <span className="avatar" style={{ background: op.avatar.color }}>{op.avatar.letter}</span>
              <div className="op-body">
                <div className="op-title">{op.title}</div>
                <div className="muted">{op.subtitle}</div>
                {op.tag && <span className="chip tag">{op.tag}</span>}
              </div>
              <div className={op.amount > 0 ? 'amount income' : 'amount'}>{formatRub(op.amount)}</div>
            </div>
          ))}
        </div>
      ))}
    </section>
  )
}
