import { useEffect, useState, type FormEvent } from 'react'
import { Smartphone } from 'lucide-react'
import { useParams } from 'react-router-dom'
import {
  ApiError, defaultSource, fetchMobileOperator, fetchProvider, maxPaymentAmount, useAccounts, useCommission,
  useOperationLimits, usePaymentSubmit, type Provider,
} from '../../api'
import ProviderLayout from '../../components/ProviderLayout'
import ProviderLogo from '../../components/ProviderLogo'
import { AccountSelect, AmountHint, AmountInput, Field, PaymentResult, Summary, amountError, parseAmount, totalOf } from '../../components/transfer'
import { OfferNote } from '../requisites/RequisitesLayout'

// +7 996 448-80-61 — храним 10 цифр после кода страны
export function formatPhone(raw: string) {
  let d = raw.replace(/\D/g, '')
  if (d.startsWith('7') || d.startsWith('8')) d = d.slice(1)
  d = d.slice(0, 10)
  if (!d) return ''
  let s = `+7 ${d.slice(0, 3)}`
  if (d.length > 3) s += ` ${d.slice(3, 6)}`
  if (d.length > 6) s += `-${d.slice(6, 8)}`
  if (d.length > 8) s += `-${d.slice(8, 10)}`
  return s
}

type Lookup = { status: 'idle' | 'loading' } | { status: 'found'; operator: Provider } | { status: 'error'; message: string }

// Оплата мобильной связи. Ввели номер — biller по реестру нумерации говорит, чей он, и шапка становится шапкой оператора.
// /payments/mobile/yota — форма конкретного оператора: номер другого оператора не пропустим.
export default function MobilePaymentPage() {
  const { code } = useParams()
  const { accounts } = useAccounts()
  const limits = useOperationLimits()
  const payment = usePaymentSubmit()
  const [fixed, setFixed] = useState<Provider | null>(null)
  const [phone, setPhone] = useState('')
  const [lookup, setLookup] = useState<Lookup>({ status: 'idle' })
  const [rawAmount, setRawAmount] = useState('')
  const [amountTouched, setAmountTouched] = useState(false)
  const [fromId, setFromId] = useState<string | null>(null)
  const [quoteRefresh, setQuoteRefresh] = useState(0)

  const digits = phone.replace(/\D/g, '').slice(1)
  const sources = accounts?.filter((a) => a.kind !== 'external') ?? []
  const from = sources.find((a) => a.id === fromId) ?? (sources.length ? defaultSource(sources) : null)
  const amount = parseAmount(rawAmount)
  const operator = lookup.status === 'found' ? lookup.operator : null
  const mismatch = operator && fixed && operator.code !== fixed.code ? `Номер обслуживается оператором ${operator.name}` : null
  const commission = useCommission('BILL', operator ? from?.id : undefined, amount, quoteRefresh, { providerCode: operator?.code })
  const amountErr = amountTouched && !rawAmount ? 'Обязательное поле'
    : amountError(totalOf(commission, amount), from, amount, maxPaymentAmount(limits, 'BILL', from))
  const valid = !!operator && !mismatch && !!from && commission.status === 'ready' && !amountErr
  const submitting = payment.state.status === 'submitting'

  useEffect(() => {
    setFixed(null)
    if (!code) return
    const ctrl = new AbortController()
    fetchProvider(code, ctrl.signal).then((d) => setFixed(d.provider)).catch(() => {})
    return () => ctrl.abort()
  }, [code])

  // Номер набран полностью — спрашиваем оператора
  useEffect(() => {
    if (digits.length !== 10) {
      setLookup({ status: 'idle' })
      return
    }
    const ctrl = new AbortController()
    setLookup({ status: 'loading' })
    fetchMobileOperator(`+7${digits}`, ctrl.signal)
      .then((op) => setLookup({ status: 'found', operator: op }))
      .catch((e) => {
        if (e.name === 'AbortError') return
        setLookup({ status: 'error', message: e instanceof ApiError ? e.message : 'Не удалось определить оператора' })
      })
    return () => ctrl.abort()
  }, [digits])

  useEffect(() => {
    if (payment.state.status === 'rejected' && payment.state.code?.startsWith('QUOTE')) setQuoteRefresh((n) => n + 1)
  }, [payment.state])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setAmountTouched(true)
    if (!valid || submitting || commission.status !== 'ready' || !from || !operator) return
    payment.submit({
      type: 'BILL', sourceAccountId: from.id, providerCode: operator.code, recipientFields: { phone: `+7${digits}` },
      amount, quoteToken: commission.data.quoteToken,
    })
  }

  const shown = fixed ?? operator
  const head = {
    logo: shown ? <ProviderLogo big name={shown.name} domain={shown.domain} color={shown.color} />
      : <span className="provider-logo big neutral"><Smartphone size={30} /></span>,
    title: shown ? shown.title : 'Оплата телефона любого оператора связи',
    subtitle: shown?.legalName,
    back: ['/', 'Платежи'] as [string, string],
  }

  if (payment.state.status === 'done') {
    return (
      <ProviderLayout {...head}>
        <PaymentResult what="Платёж" payment={payment.state.payment} to={`${operator?.name ?? ''} · ${phone}`}
          back={['/', 'Вернуться к платежам']} onRetry={() => { payment.reset(); setQuoteRefresh((n) => n + 1) }} />
      </ProviderLayout>
    )
  }

  const phoneErr = mismatch ?? (lookup.status === 'error' ? lookup.message : undefined)
  return (
    <ProviderLayout {...head}>
      <form className="form" onSubmit={submit}>
        <Field label="Номер телефона" error={phoneErr} hint={lookup.status === 'loading' ? 'Определяем оператора…' : undefined}>
          <input className="input" inputMode="tel" placeholder="+7" value={phone}
            onFocus={() => { if (!phone) setPhone('+7') }}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '') === '7' ? '+7' : formatPhone(e.target.value))} />
        </Field>
        <div className="field-stack" onBlur={() => setAmountTouched(true)}>
          <Field label="Сумма платежа" error={amountErr} hint={<AmountHint operationType="BILL" account={from} />}>
            <AmountInput value={rawAmount} onChange={setRawAmount} placeholder="₽" />
          </Field>
          {operator && !mismatch && <span className="field-hint">Рекомендуем сумму платежа с учётом ваших расходов</span>}
        </div>
        <div className="group pay-method">
          <h3>Способ оплаты</h3>
          <AccountSelect accounts={sources} value={from} onChange={(a) => setFromId(a.id)} placeholder="Загружаем счета…" />
        </div>
        <Summary state={commission} />
        {payment.state.status === 'rejected' && <div className="form-error">{payment.state.message}</div>}
        <div className="pay-row">
          <OfferNote />
          <button type="submit" className="btn-primary" disabled={submitting || !!mismatch}>{submitting ? 'Оплачиваем…' : 'Оплатить'}</button>
        </div>
      </form>
    </ProviderLayout>
  )
}
