import { useState, type ReactNode } from 'react'
import { ChevronDown, ChevronUp, Link2, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAccounts } from '../api'
import { formatRub } from '../format'
import PaymentSystemBadge from './PaymentSystemBadge'

const STORAGE_KEY = 'sidebar-collapsed'

function readCollapsed(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

// Сворачиваемый блок; что свёрнуто — помним между заходами
function Collapsible({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(() => readCollapsed()[id] ?? false)
  const toggle = () => {
    const next = !collapsed
    setCollapsed(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readCollapsed(), [id]: next }))
    } catch {
      // приватный режим — просто не запоминаем
    }
  }
  return (
    <section className={collapsed ? 'panel collapsible collapsed' : 'panel collapsible'}>
      <button type="button" className="panel-head collapse-btn" onClick={toggle} aria-expanded={!collapsed}>
        <h3>{title}</h3>
        {collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
      </button>
      {!collapsed && children}
    </section>
  )
}

export default function Sidebar() {
  const { accounts, error } = useAccounts()
  // «Мой кошелёк» у пользователя всегда один, карт может быть сколько угодно
  const wallet = accounts?.find((a) => a.kind === 'wallet')
  const cards = accounts?.filter((a) => a.kind === 'card') ?? []
  const status = error ? 'Не удалось загрузить' : 'Загружаем…'

  return (
    <aside className="sidebar">
      <Collapsible id="wallets" title="Кошельки">
        {wallet ? (
          <Link to="/wallet" className="row sidebar-link">
            <div>
              <div className="small">{wallet.name}</div>
              <div className="balance">{formatRub(wallet.balance)}</div>
            </div>
            <span className="round-icon big"><Wallet size={20} /></span>
          </Link>
        ) : <div className="small muted">{status}</div>}
      </Collapsible>

      <Collapsible id="cards" title="Карты">
        <div className="cards-list">
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
        </div>
        <div className="divider" />
        <div className="row">
          <div className="small">Привязать карту другого банка</div>
          <Link2 size={18} />
        </div>
      </Collapsible>
    </aside>
  )
}
