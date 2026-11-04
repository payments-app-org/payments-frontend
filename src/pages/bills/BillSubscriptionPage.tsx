import { useCallback, useEffect, useState } from 'react'
import { Pencil } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import {
  ApiError, defaultSource, fetchSubscription, useAccounts, useCommission, usePaymentSubmit,
  type Subscription, type SubscriptionBill,
} from '../../api'
import ProviderLayout from '../../components/ProviderLayout'
import ProviderLogo from '../../components/ProviderLogo'
import { AccountSelect, PaymentResult, Summary, amountError, totalOf } from '../../components/transfer'
import { formatRub } from '../../format'
import { OfferNote } from '../requisites/RequisitesLayout'
import { billsWord } from './BillsPage'

const ruDate = (iso: string) => iso.split('-').reverse().join('.')

// Шаблон «Счета на оплату»: неоплаченные счета у поставщика по сохранённым данным и их оплата
export default function BillSubscriptionPage() {
  const { id = '' } = useParams()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [bills, setBills] = useState<SubscriptionBill[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [billId, setBillId] = useState<string | null>(null)

  const load = useCallback(() => {
    setBills(null)
    fetchSubscription(id).then((r) => {
      setSubscription(r.subscription)
      setBills(r.bills)
      setBillId(r.bills.length === 1 ? r.bills[0].id : null)
    }).catch((e) => setError(e instanceof ApiError ? e.message : 'Не удалось проверить счета'))
  }, [id])

  useEffect(load, [load])

  if (!subscription) {
    return <section className="panel transfer"><div className="transfer-body muted">{error ?? 'Проверяем счета у поставщика…'}</div></section>
  }
  const p = subscription.provider
  const bill = bills?.find((b) => b.id === billId) ?? null
  return (
    <ProviderLayout logo={<ProviderLogo big name={p.name} domain={p.domain} color={p.color} country={p.countryCode} />}
      title={p.name} subtitle={subscription.name} back={['/bills', 'Счета на оплату']}
      action={<Link to={`/bills/${id}/edit`} className="icon-btn soft" aria-label="Редактировать шаблон" title="Редактировать"><Pencil size={18} /></Link>}>
      {bills === null && <div className="muted">Проверяем счета у поставщика…</div>}
      {bills?.length === 0 && (
        <p className="bills-paid">На данный момент все счета оплачены.<br />Мы уведомим вас о новых начислениях</p>
      )}
      {bills && bills.length > 0 && (
        <div className="form charges">
          <h3>К оплате: {billsWord(bills.length)}</h3>
          {bills.map((b) => (
            <button type="button" key={b.id} className={b.id === billId ? 'charge-card active' : 'charge-card'} onClick={() => setBillId(b.id)}>
              <span className="charge-main">
                <b>{b.title}</b>
                {b.description && <span className="muted">{b.description}</span>}
                {b.dueDate && <span className="muted">Оплатить до {ruDate(b.dueDate)}</span>}
              </span>
              <span className="charge-amount">
                <b>{formatRub(b.amount)}</b>
                {b.discountUntil && b.amount < b.fullAmount && (
                  <span className="cashback">скидка до {ruDate(b.discountUntil)}<br /><s className="muted">{formatRub(b.fullAmount)}</s></span>
                )}
              </span>
            </button>
          ))}
          {bill && <PayBill key={bill.id} bill={bill} subscription={subscription} onPaid={load} />}
        </div>
      )}
    </ProviderLayout>
  )
}

// Оплата выбранного счёта: сумма — ровно из счёта, данные плательщика — из шаблона
function PayBill({ bill, subscription, onPaid }: { bill: SubscriptionBill; subscription: Subscription; onPaid: () => void }) {
  const { accounts } = useAccounts()
  const payment = usePaymentSubmit()
  const [fromId, setFromId] = useState<string | null>(null)
  const sources = accounts?.filter((a) => a.kind !== 'external') ?? []
  const from = sources.find((a) => a.id === fromId) ?? (sources.length ? defaultSource(sources) : null)
  const providerCode = subscription.provider.code
  const commission = useCommission('BILL', from?.id, bill.amount, 0, { providerCode })
  const amountErr = amountError(totalOf(commission, bill.amount), from, bill.amount)
  const submitting = payment.state.status === 'submitting'

  if (payment.state.status === 'done') {
    const done = payment.state.payment
    return (
      <>
        <PaymentResult what="Платёж" payment={done} to={`${subscription.provider.name} · ${bill.title}`}
          back={['/bills', 'Вернуться к счетам']} onRetry={payment.reset} />
        {done.status === 'SUCCESS' && <button type="button" className="btn-secondary" onClick={onPaid}>Проверить счета ещё раз</button>}
      </>
    )
  }
  const pay = () => {
    if (!from || commission.status !== 'ready' || amountErr) return
    payment.submit({
      type: 'BILL', sourceAccountId: from.id, providerCode, chargeId: bill.id, recipientFields: subscription.fields,
      amount: bill.amount, quoteToken: commission.data.quoteToken,
    })
  }
  return (
    <>
      <div className="group pay-method">
        <h3>Способ оплаты</h3>
        <AccountSelect accounts={sources} value={from} onChange={(a) => setFromId(a.id)} placeholder="Загружаем счета…" />
      </div>
      <Summary state={commission} />
      {amountErr && <div className="form-error">{amountErr}</div>}
      {payment.state.status === 'rejected' && <div className="form-error">{payment.state.message}</div>}
      <div className="pay-row">
        <OfferNote />
        <button type="button" className="btn-primary" onClick={pay} disabled={commission.status !== 'ready' || !!amountErr || submitting}>
          {submitting ? 'Оплачиваем…' : 'Оплатить'}
        </button>
      </div>
    </>
  )
}
