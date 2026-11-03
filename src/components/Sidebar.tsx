import { ChevronUp, Link2, Wallet } from 'lucide-react'
import { useAccounts } from '../api'
import { formatRub } from '../format'

export default function Sidebar() {
  const { accounts, error } = useAccounts()
  const wallet = accounts?.find((a) => a.kind === 'wallet')
  const cards = accounts?.filter((a) => a.kind === 'card') ?? []
  const status = error ? 'Не удалось загрузить' : 'Загружаем…'

  return (
    <aside className="sidebar">
      <section className="panel">
        <div className="panel-head">
          <h3>Кошельки</h3>
          <ChevronUp size={18} />
        </div>
        {wallet ? (
          <div className="row">
            <div>
              <div className="small">{wallet.title}</div>
              <div className="balance">{formatRub(wallet.balance)}</div>
            </div>
            <span className="round-icon big"><Wallet size={20} /></span>
          </div>
        ) : <div className="small muted">{status}</div>}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h3>Карты</h3>
          <ChevronUp size={18} />
        </div>
        {!accounts && <div className="small muted">{status}</div>}
        {cards.map((card) => (
          <div key={card.id} className="row">
            <div>
              <div className="small ellipsis">{card.title}</div>
              <div className="balance">{formatRub(card.balance)}</div>
            </div>
            <div className="card-meta">
              <span className="card-badge">МИР</span>
            </div>
          </div>
        ))}
        <div className="divider" />
        <div className="row">
          <div className="small">Привязать карту другого банка</div>
          <Link2 size={18} />
        </div>
      </section>
    </aside>
  )
}
