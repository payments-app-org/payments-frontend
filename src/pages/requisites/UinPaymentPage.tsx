import { useState, type FormEvent } from 'react'
import { ApiError, CURRENT_USER_ID, defaultSource, useAccounts, useCommission, usePaymentSubmit } from '../../api'
import { AccountSelect, Field, PaymentResult, Summary, amountError, totalOf } from '../../components/transfer'
import { formatRub } from '../../format'
import RequisitesLayout, { OfferNote } from './RequisitesLayout'

type Charge = {
  id: string; uin: string; purpose: string; payeeName: string; payeeInn: string; amount: number
  discountedAmount: number | null; discountUntil: string | null; issuedAt: string; payableAmount: number
}

const ruDate = (iso: string) => iso.split('-').reverse().join('.')

// Госуслуги по УИН: ищем начисления в biller (он спрашивает ГИС ГМП), выбираем и оплачиваем точную сумму
export default function UinPaymentPage() {
  const { accounts } = useAccounts()
  const payment = usePaymentSubmit()
  const [uin, setUin] = useState('')
  const [charges, setCharges] = useState<Charge[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chargeId, setChargeId] = useState<string | null>(null)
  const [fromId, setFromId] = useState<string | null>(null)

  const digits = uin.replace(/\D/g, '')
  const sources = accounts?.filter((a) => a.kind !== 'external') ?? []
  const from = sources.find((a) => a.id === fromId) ?? (sources.length ? defaultSource(sources) : null)
  const charge = charges?.find((c) => c.id === chargeId) ?? null
  const amount = charge?.payableAmount ?? 0
  const commission = useCommission('UIN_PAYMENT', from?.id, amount)
  const amountErr = charge ? amountError(totalOf(commission, amount), from, amount) : undefined
  const submitting = payment.state.status === 'submitting'

  const search = async (e: FormEvent) => {
    e.preventDefault()
    if (digits.length !== 20 && digits.length !== 25) return
    setSearching(true)
    setError(null)
    setChargeId(null)
    try {
      const res = await fetch(`/api/biller/gov/charges?uin=${digits}`, { headers: { 'X-User-Id': CURRENT_USER_ID } })
      const body = await res.json()
      if (!res.ok) throw new ApiError(res.status, body?.detail ?? 'Не удалось найти начисления')
      setCharges(body)
      if (body.length === 1) setChargeId(body[0].id)
    } catch (err) {
      setCharges(null)
      setError(err instanceof ApiError ? err.message : 'Не удалось найти начисления')
    } finally {
      setSearching(false)
    }
  }

  const pay = () => {
    if (!charge || !from || commission.status !== 'ready' || amountErr) return
    payment.submit({ type: 'UIN_PAYMENT', sourceAccountId: from.id, amount, quoteToken: commission.data.quoteToken, chargeId: charge.id })
  }

  if (payment.state.status === 'done') {
    return (
      <RequisitesLayout gov title="Оплата по УИН" subtitle="Оплата по уникальному идентификатору начисления">
        <PaymentResult payment={payment.state.payment} to={charge?.payeeName ?? ''} onRetry={payment.reset}
          back={['/transfers/requisites', 'Вернуться к реквизитам']} />
      </RequisitesLayout>
    )
  }

  return (
    <RequisitesLayout gov title="Оплата по УИН" subtitle="Оплата по уникальному идентификатору начисления">
      <form className="form" onSubmit={search}>
        <Field label="Уникальный идентификатор начисления" error={error ?? undefined}>
          <input className="input" inputMode="numeric" placeholder="20 или 25 цифр" value={uin}
            onChange={(e) => setUin(e.target.value.replace(/\D/g, '').slice(0, 25))} />
        </Field>
        <button type="submit" className="btn-primary" disabled={(digits.length !== 20 && digits.length !== 25) || searching}>
          {searching ? 'Ищем…' : 'Найти счета'}
        </button>
      </form>

      {charges && charges.length === 0 && <div className="history-empty muted">Неоплаченных начислений по этому УИН нет</div>}
      {charges && charges.length > 0 && (
        <div className="form charges">
          <h3>Найдено начислений: {charges.length}</h3>
          {charges.map((c) => (
            <button type="button" key={c.id} className={c.id === chargeId ? 'charge-card active' : 'charge-card'} onClick={() => setChargeId(c.id)}>
              <span className="charge-main">
                <b>{c.purpose}</b>
                <span className="muted">{c.payeeName}</span>
                <span className="muted">ИНН {c.payeeInn} · от {ruDate(c.issuedAt)}</span>
              </span>
              <span className="charge-amount">
                <b>{formatRub(c.payableAmount)}</b>
                {c.discountedAmount !== null && c.payableAmount < c.amount && (
                  <span className="cashback">скидка 50% до {ruDate(c.discountUntil!)}<br /><s className="muted">{formatRub(c.amount)}</s></span>
                )}
              </span>
            </button>
          ))}

          {charge && (
            <>
              <div className="group">
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
          )}
        </div>
      )}
    </RequisitesLayout>
  )
}
