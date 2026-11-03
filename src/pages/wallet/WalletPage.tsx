import { useEffect, useState, type ReactNode } from 'react'
import { ArrowUp, ChevronDown, ChevronRight, ChevronUp, Info, Plus, ScanLine, Wallet } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAccounts, useProfile } from '../../api'
import Breadcrumbs from '../../components/Breadcrumbs'
import CategoryIcon from '../../components/CategoryIcon'
import { formatMoney, formatRub } from '../../format'
import { EMPTY_FILTERS, fetchOperations, type Operation } from '../../history'

const FAQ = [
  {
    q: 'Что такое «Кошелёк»?',
    a: <p>«Кошелёк» — платёжный инструмент для повседневных трат. На него можно зачислить деньги, чтобы оплачивать покупки, услуги или делать переводы.</p>,
  },
  {
    q: 'Можно ли оплачивать App Store с помощью кошелька?',
    a: (
      <>
        <p>Да, с подпиской Премиум. Для этого:</p>
        <ul>
          <li>Пополните «Мой кошелёк» на нужную сумму</li>
          <li>Привяжите мобильный номер к Apple ID</li>
          <li>Оплачивайте приложения, игры, подписки и другие покупки в App Store</li>
        </ul>
      </>
    ),
  },
  {
    q: 'Как пополнить кошелёк?',
    a: <p>Нажмите «Пополнить» и переведите деньги со своей карты. С карты нашего банка — без лишних шагов, комиссия видна до перевода.</p>,
  },
]

// +79964480000 → +7 996 448-00-00
export function formatPhone(phone: string) {
  const d = phone.replace(/\D/g, '')
  return d.length === 11 ? `+7 ${d.slice(1, 4)} ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9)}` : phone
}

function FaqItem({ q, a }: { q: string; a: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="faq-item">
      <button type="button" className="faq-q" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>{q}</span>
        {open ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>
      {open && <div className="faq-a">{a}</div>}
    </div>
  )
}

export default function WalletPage() {
  const { accounts } = useAccounts()
  const profile = useProfile()
  const navigate = useNavigate()
  const wallet = accounts?.find((a) => a.kind === 'wallet')
  const [recent, setRecent] = useState<Operation[] | null>(null)

  // Последние три операции по кошельку
  useEffect(() => {
    if (!wallet) return
    fetchOperations({ ...EMPTY_FILTERS, accountId: wallet.id }, null, undefined, 3).then((p) => setRecent(p.items), () => setRecent([]))
  }, [wallet?.id])

  return (
    <>
      <Breadcrumbs items={[['Главная', '/'], ['Мой кошелёк']]} />

      <section className="wallet-hero">
        <button type="button" className="wallet-qr" aria-label="Оплатить по QR"><ScanLine size={22} /></button>
        <h1>Мой кошелёк</h1>
        <div className="wallet-balance">{wallet ? formatRub(wallet.balance ?? 0) : '…'}</div>
        <div className="wallet-phone">{profile ? formatPhone(profile.phone) : ' '}</div>
        <div className="wallet-art"><Wallet size={120} strokeWidth={1.2} /></div>
        <div className="wallet-actions">
          <button type="button" onClick={() => navigate('/wallet/topup')}><Plus size={20} />Пополнить</button>
          <button type="button" onClick={() => navigate('/wallet/transfer')}><ArrowUp size={20} />Перевести</button>
        </div>
      </section>

      <section className="panel wallet-section">
        <h2 className="section-title">История операций</h2>
        {recent === null && <div className="muted">Загружаем…</div>}
        {recent?.length === 0 && <div className="muted">Операций по кошельку пока нет</div>}
        {recent?.map((op) => (
          <div key={op.id} className="op">
            <CategoryIcon category={op.category} />
            <div className="op-body">
              <div className="op-title">{op.title}</div>
              <div className="muted">{op.categoryName}</div>
            </div>
            <div className={op.direction === 'INCOME' ? 'amount income' : 'amount'}>
              {op.direction === 'INCOME' ? '+' : '−'}{formatMoney(op.amount, op.currency)}
            </div>
          </div>
        ))}
        {wallet && <Link to={`/history?accountId=${wallet.id}`} className="btn-wide">Посмотреть все</Link>}
      </section>

      <section className="panel wallet-section">
        <h2 className="section-title">Информация</h2>
        <Link to="/wallet/conditions" className="list-row">
          <span className="round-icon"><Info size={18} /></span>
          <span className="list-row-title">Лимиты и условия счёта</span>
          <ChevronRight size={20} className="muted" />
        </Link>
      </section>

      <section className="panel wallet-section">
        <h2 className="section-title">Частые вопросы</h2>
        <div className="faq">{FAQ.map((f) => <FaqItem key={f.q} {...f} />)}</div>
      </section>
    </>
  )
}
