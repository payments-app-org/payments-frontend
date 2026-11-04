import { useEffect, useState, type FormEvent } from 'react'
import { CircleHelp } from 'lucide-react'
import { useParams } from 'react-router-dom'
import {
  ApiError, CURRENT_USER_ID, defaultSource, fetchProvider, maxPaymentAmount, useAccounts, useCommission,
  useOperationLimits, usePaymentSubmit, type ProviderDetails,
} from '../../api'
import ProviderLayout from '../../components/ProviderLayout'
import ProviderLogo from '../../components/ProviderLogo'
import { AccountSelect, AmountHint, AmountInput, Field, PaymentResult, Summary, amountError, parseAmount, totalOf } from '../../components/transfer'
import { formatRub } from '../../format'
import { OfferNote } from '../requisites/RequisitesLayout'
import { formatPhone } from './MobilePaymentPage'

type Charge = {
  id: string; uin: string; purpose: string; payeeName: string; payeeInn: string; amount: number
  discountedAmount: number | null; discountUntil: string | null; issuedAt: string; payableAmount: number
}

// Поля поиска начислений: key — параметр запроса в biller. spaced — показываем как «XX XX XXXXXX».
type SearchField = { key: string; label: string; placeholder?: string; digitsOnly: boolean; spaced?: boolean; max: number; lengths: number[]; help?: string }

const FIELDS: Record<string, SearchField[]> = {
  UIN: [{ key: 'uin', label: 'Уникальный идентификатор начисления', placeholder: '20 или 25 цифр', digitsOnly: true, max: 25, lengths: [20, 25] }],
  STS_VU: [
    { key: 'sts', label: 'Свидетельство о регистрации ТС', placeholder: 'XX XX XXXXXX', digitsOnly: false, spaced: true, max: 10, lengths: [10] },
    { key: 'vu', label: 'Водительское удостоверение', placeholder: 'XX XX XXXXXX', digitsOnly: false, spaced: true, max: 10, lengths: [10] },
  ],
  INN: [{ key: 'inn', label: 'ИНН', digitsOnly: true, max: 12, lengths: [12], help: 'ИНН физического лица — 12 цифр' }],
  PASSPORT_INN: [
    { key: 'passport', label: 'Серия и номер паспорта', digitsOnly: true, spaced: true, max: 10, lengths: [10] },
    { key: 'inn', label: 'ИНН', digitsOnly: true, max: 12, lengths: [12] },
  ],
}

const ruDate = (iso: string) => iso.split('-').reverse().join('.')
const spacedValue = (v: string) => [v.slice(0, 2), v.slice(2, 4), v.slice(4)].filter(Boolean).join(' ')

// Поставщик госуслуг из biller: ищем начисления по его полям (УИН, СТС/ВУ, ИНН, паспорт) или, у Росреестра,
// вводим УИН и сумму из квитанции
export default function GovProviderPage({ code: fixedCode, back = ['/payments/gov', 'Госуслуги'] }: { code?: string; back?: [string, string] }) {
  const params = useParams()
  const code = fixedCode ?? params.code ?? ''
  const [details, setDetails] = useState<ProviderDetails | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const ctrl = new AbortController()
    setDetails(null)
    setError(null)
    fetchProvider(code, ctrl.signal).then(setDetails).catch((e) => {
      if (e.name !== 'AbortError') setError(e instanceof ApiError ? e.message : 'Не удалось загрузить поставщика')
    })
    return () => ctrl.abort()
  }, [code])

  if (!details) {
    return <section className="panel transfer"><div className="transfer-body muted">{error ?? 'Загружаем…'}</div></section>
  }
  const p = details.provider
  return (
    <ProviderLayout logo={<ProviderLogo big name={p.name} domain={p.domain} color={p.color} />} title={p.title} subtitle={p.legalName} back={back}>
      {details.gov?.lookup === 'FREE'
        ? <GovFeeForm details={details} back={back} />
        : <ChargeSearch key={p.code} details={details} back={back} />}
    </ProviderLayout>
  )
}

function ChargeSearch({ details, back }: { details: ProviderDetails; back: [string, string] }) {
  const fields = FIELDS[details.gov?.lookup ?? 'UIN'] ?? FIELDS.UIN
  const [values, setValues] = useState<Record<string, string>>({})
  const [charges, setCharges] = useState<Charge[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chargeId, setChargeId] = useState<string | null>(null)

  const raw = (key: string) => values[key] ?? ''
  const filled = fields.filter((f) => raw(f.key))
  // Нужен хотя бы один документ, и каждый заполненный — полностью
  const ready = filled.length > 0 && filled.every((f) => f.lengths.includes(raw(f.key).length))

  const search = async (e: FormEvent) => {
    e.preventDefault()
    if (!ready) return
    setSearching(true)
    setError(null)
    setChargeId(null)
    try {
      const qs = new URLSearchParams({ provider: details.provider.code })
      filled.forEach((f) => qs.set(f.key, raw(f.key)))
      const res = await fetch(`/api/biller/gov/charges?${qs}`, { headers: { 'X-User-Id': CURRENT_USER_ID } })
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

  const charge = charges?.find((c) => c.id === chargeId) ?? null
  return (
    <>
      <form className="form" onSubmit={search}>
        {fields.map((f, i) => (
          <Field key={f.key} label={f.label} error={i === fields.length - 1 ? error ?? undefined : undefined}>
            <span className="input-wrap">
              <input className="input" inputMode={f.digitsOnly ? 'numeric' : 'text'} placeholder={f.placeholder}
                value={f.spaced ? spacedValue(raw(f.key)) : raw(f.key)}
                onChange={(e) => {
                  const v = f.digitsOnly ? e.target.value.replace(/\D/g, '') : e.target.value.toUpperCase().replace(/[^0-9A-ZА-ЯЁ]/g, '')
                  setValues((s) => ({ ...s, [f.key]: v.slice(0, f.max) }))
                }} />
              {f.help && <span className="input-help" title={f.help}><CircleHelp size={20} /></span>}
            </span>
          </Field>
        ))}
        <button type="submit" className="btn-primary" disabled={!ready || searching}>{searching ? 'Ищем…' : 'Найти счета'}</button>
      </form>

      {charges && charges.length === 0 && <div className="history-empty muted">Неоплаченных начислений не найдено</div>}
      {charges && charges.length > 0 && (
        <div className="form charges">
          <h3>Найдено начислений: {charges.length}</h3>
          {charges.map((c) => (
            <button type="button" key={c.id} className={c.id === chargeId ? 'charge-card active' : 'charge-card'} onClick={() => setChargeId(c.id)}>
              <span className="charge-main">
                <b>{c.purpose}</b>
                <span className="muted">{c.payeeName}</span>
                <span className="muted">УИН {c.uin} · от {ruDate(c.issuedAt)}</span>
              </span>
              <span className="charge-amount">
                <b>{formatRub(c.payableAmount)}</b>
                {c.discountedAmount !== null && c.payableAmount < c.amount && (
                  <span className="cashback">скидка 50% до {ruDate(c.discountUntil!)}<br /><s className="muted">{formatRub(c.amount)}</s></span>
                )}
              </span>
            </button>
          ))}
          {charge && <ChargePay key={charge.id} charge={charge} providerCode={details.provider.code} back={back} />}
        </div>
      )}
    </>
  )
}

// Оплата найденного начисления: сумма — ровно из начисления
function ChargePay({ charge, providerCode, back }: { charge: Charge; providerCode: string; back: [string, string] }) {
  const { accounts } = useAccounts()
  const payment = usePaymentSubmit()
  const [fromId, setFromId] = useState<string | null>(null)
  const sources = accounts?.filter((a) => a.kind !== 'external') ?? []
  const from = sources.find((a) => a.id === fromId) ?? (sources.length ? defaultSource(sources) : null)
  const amount = charge.payableAmount
  const commission = useCommission('BILL', from?.id, amount, 0, { providerCode })
  const amountErr = amountError(totalOf(commission, amount), from, amount)
  const submitting = payment.state.status === 'submitting'

  if (payment.state.status === 'done') {
    return <PaymentResult what="Платёж" payment={payment.state.payment} to={charge.payeeName} onRetry={payment.reset} back={back} />
  }
  const pay = () => {
    if (!from || commission.status !== 'ready' || amountErr) return
    payment.submit({ type: 'BILL', sourceAccountId: from.id, amount, quoteToken: commission.data.quoteToken, providerCode, chargeId: charge.id })
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

// Росреестр: УИН из квитанции, данные плательщика и сумма — начисление не ищем
function GovFeeForm({ details, back }: { details: ProviderDetails; back: [string, string] }) {
  const prefix = details.gov?.uinPrefix ?? ''
  const { accounts } = useAccounts()
  const limits = useOperationLimits()
  const payment = usePaymentSubmit()
  const [uin, setUin] = useState(prefix)
  const [payerName, setPayerName] = useState('')
  const [payerAddress, setPayerAddress] = useState('')
  const [payerPhone, setPayerPhone] = useState('')
  const [rawAmount, setRawAmount] = useState('')
  const [fromId, setFromId] = useState<string | null>(null)
  const [quoteRefresh, setQuoteRefresh] = useState(0)

  const sources = accounts?.filter((a) => a.kind !== 'external') ?? []
  const from = sources.find((a) => a.id === fromId) ?? (sources.length ? defaultSource(sources) : null)
  const amount = parseAmount(rawAmount)
  const commission = useCommission('BILL', from?.id, amount, quoteRefresh, { providerCode: details.provider.code })
  const amountErr = amountError(totalOf(commission, amount), from, amount, maxPaymentAmount(limits, 'BILL', from))
  const uinOk = (uin.length === 20 || uin.length === 25) && uin.startsWith(prefix)
  const uinErr = uin.length >= prefix.length && !uin.startsWith(prefix) ? `УИН Росреестра начинается с ${prefix}` : undefined
  const phoneDigits = payerPhone.replace(/\D/g, '')
  const valid = uinOk && !!payerName.trim() && !!payerAddress.trim() && phoneDigits.length === 11 && !!from
    && commission.status === 'ready' && !amountErr
  const submitting = payment.state.status === 'submitting'

  useEffect(() => {
    if (payment.state.status === 'rejected' && payment.state.code?.startsWith('QUOTE')) setQuoteRefresh((n) => n + 1)
  }, [payment.state])

  if (payment.state.status === 'done') {
    return <PaymentResult what="Платёж" payment={payment.state.payment} to={details.provider.name}
      onRetry={() => { payment.reset(); setQuoteRefresh((n) => n + 1) }} back={back} />
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!valid || submitting || commission.status !== 'ready' || !from) return
    payment.submit({
      type: 'BILL', sourceAccountId: from.id, amount, quoteToken: commission.data.quoteToken,
      providerCode: details.provider.code,
      recipientFields: { uin, payerName: payerName.trim(), payerAddress: payerAddress.trim(), payerPhone: `+${phoneDigits}` },
    })
  }

  return (
    <form className="form" onSubmit={submit}>
      <Field label="УИН" error={uinErr} hint="20 или 25 цифр из квитанции">
        <input className="input" inputMode="numeric" value={uin} onChange={(e) => setUin(e.target.value.replace(/\D/g, '').slice(0, 25))} />
      </Field>
      <Field label="ФИО плательщика">
        <input className="input" value={payerName} maxLength={150} onChange={(e) => setPayerName(e.target.value)} />
      </Field>
      <Field label="Адрес плательщика">
        <input className="input" value={payerAddress} maxLength={255} onChange={(e) => setPayerAddress(e.target.value)} />
      </Field>
      <Field label="Телефон плательщика">
        <input className="input" inputMode="tel" placeholder="+7" value={payerPhone}
          onFocus={() => { if (!payerPhone) setPayerPhone('+7') }}
          onChange={(e) => setPayerPhone(e.target.value.replace(/\D/g, '') === '7' ? '+7' : formatPhone(e.target.value))} />
      </Field>
      <Field label="Сумма платежа" error={amountErr} hint={<AmountHint operationType="BILL" account={from} />}>
        <AmountInput value={rawAmount} onChange={setRawAmount} placeholder="₽" />
      </Field>
      <div className="group pay-method">
        <h3>Способ оплаты</h3>
        <AccountSelect accounts={sources} value={from} onChange={(a) => setFromId(a.id)} placeholder="Загружаем счета…" />
      </div>
      <Summary state={commission} />
      {payment.state.status === 'rejected' && <div className="form-error">{payment.state.message}</div>}
      <div className="pay-row">
        <OfferNote />
        <button type="submit" className="btn-primary" disabled={!valid || submitting}>{submitting ? 'Оплачиваем…' : 'Оплатить'}</button>
      </div>
    </form>
  )
}
