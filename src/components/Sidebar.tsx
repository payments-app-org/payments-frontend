import { ChevronUp, Link2, Wallet } from 'lucide-react'
import { useAccounts } from '../api'
import { formatRub } from '../format'
import PaymentSystemBadge from './PaymentSystemBadge'

export default function Sidebar() {
  const { accounts, error } = useAccounts()
  // «Мой кошелёк» у пользователя всегда один, карт может быть сколько угодно
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
              <div className="small">{wallet.name}</div>
              <div className="balance">{formatRub(wallet.balance)}</div>
            </div>
            <span className="round-icon big"><Wallet size={20} /></span>
          </div>
        ) : <div className="small muted">{status}</div>}
      </section>

      <section className="panel cards-panel">
        <div className="panel-head">
          <h3>Карты</h3>
          <ChevronUp size={18} />
        </div>
        {!accounts && <div className="small muted">{status}</div>}
        {accounts && cards.length === 0 && <div className="small muted">Карт пока нет</div>}
        {cards.map((card) => (
          <div key={card.id} className="card-row">
            <div className="card-info">
              <div className="small ellipsis">{card.name}</div>
              <div className="balance">{formatRub(card.balance)}</div>
            </div>
            <div className="card-meta">
              <div className="small">·· {card.last4}</div>
              <PaymentSystemBadge system={card.paymentSystem} />
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
