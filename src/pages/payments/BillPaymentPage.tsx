import { useEffect, useState, type FormEvent } from 'react'
import { Info } from 'lucide-react'
import { useParams } from 'react-router-dom'
import {
  ApiError, MIN_AMOUNT, defaultSource, fetchProvider, maxPaymentAmount, searchInvoices, useAccounts, useCommission,
  useOperationLimits, usePaymentSubmit, useProfile, type Invoice, type ProviderDetails, type ProviderField,
} from '../../api'
import { groupPage } from '../../data/paymentGroups'
import { flag } from '../../abroad'
import ProviderLayout from '../../components/ProviderLayout'
import ProviderLogo from '../../components/ProviderLogo'
import { AccountSelect, AmountInput, Field, PaymentResult, Summary, amountError, parseAmount, totalOf } from '../../components/transfer'
import { formatRub } from '../../format'
import { OfferNote } from '../requisites/RequisitesLayout'
import { formatPhone } from './MobilePaymentPage'

// Куда «назад» из формы поставщика — в его категорию
function backTo(group: string): [string, string] {
  const g = groupPage(group)
  return g ? [g.path, g.back] : ['/', 'Платежи']
}

const ruDate = (iso: string) => iso.split('-').reverse().join('.')
const thisMonth = () => new Date().toISOString().slice(0, 7)

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/

// Оплата поставщику (тип BILL) по его шаблону полей из biller: у Тройки — номер карты, у ChatGPT — почта,
// страна аккаунта и номинал, у зарубежной связи — номер в формате страны. Всё ещё раз проверит biller.
export default function BillPaymentPage() {
  const { code = '' } = useParams()
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
    <ProviderLayout logo={<ProviderLogo big name={p.name} domain={p.domain} color={p.color} country={p.countryCode} />}
      title={p.title} subtitle={p.legalName} back={backTo(p.groupCode)}>
      <BillForm key={p.code} details={details} />
    </ProviderLayout>
  )
}

function BillForm({ details }: { details: ProviderDetails }) {
  const { provider, fields, nominals, foreignMobile, game, utility } = details
  const { accounts } = useAccounts()
  const limits = useOperationLimits()
  const payment = usePaymentSubmit()
  const profile = useProfile()
  // Значение по умолчанию: у выбора — первый вариант, у месяца — текущий
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries([
    ...fields.filter((f) => f.type === 'CHOICE' && f.options.length).map((f) => [f.key, f.options[0].value]),
    ...fields.filter((f) => f.type === 'MONTH').map((f) => [f.key, thisMonth()]),
  ]))
  // Поиск счетов у поставщика (поля stage = SEARCH): найденные счета и выбранный
  // ЖКХ Москвы и др.: вкладки «Найти» (счёт у поставщика) и «Оплатить» (произвольная сумма без поиска)
  const hasSearch = fields.some((f) => f.stage === 'SEARCH')
  const directPay = hasSearch && !!utility?.directPay
  const [mode, setMode] = useState<'search' | 'pay'>('search')
  const lookup = hasSearch && mode === 'search'
  const searchFields = fields.filter((f) => f.stage === 'SEARCH' || f.stage === 'BOTH')
  // Поля, которые уйдут в платёж: при поиске — все, при «Оплатить» — без полей только для поиска
  const activeFields = lookup ? fields : fields.filter((f) => f.stage !== 'SEARCH')
  const payFields = lookup ? fields.filter((f) => f.stage === 'PAY') : activeFields
  const [invoices, setInvoices] = useState<Invoice[] | null>(null)
  const [invoiceId, setInvoiceId] = useState<string | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const invoice = invoices?.find((i) => i.id === invoiceId) ?? null
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [tried, setTried] = useState(false)
  const [rawAmount, setRawAmount] = useState('')
  const [fromId, setFromId] = useState<string | null>(null)
  const [quoteRefresh, setQuoteRefresh] = useState(0)

  const sources = accounts?.filter((a) => a.kind !== 'external') ?? []
  const from = sources.find((a) => a.id === fromId) ?? (sources.length ? defaultSource(sources) : null)
  const set = (key: string, v: string) => {
    setValues((s) => ({ ...s, [key]: v }))
    // Поменяли данные поиска — найденные счета уже не про них
    if (searchFields.some((f) => f.key === key)) { setInvoices(null); setInvoiceId(null) }
  }

  // Подставляем ФИО и телефон клиента, если поле ещё пустое
  useEffect(() => {
    if (!profile) return
    const fullName = [profile.lastName, profile.firstName, profile.middleName].filter(Boolean).join(' ')
    setValues((s) => {
      const next = { ...s }
      for (const f of fields) {
        if (next[f.key]) continue
        if (f.prefill === 'USER_FULL_NAME') next[f.key] = fullName
        if (f.prefill === 'USER_PHONE' && profile.phone) next[f.key] = formatPhone(profile.phone)
      }
      return next
    })
  }, [profile, fields])

  // Номиналы поля NOMINAL: только для выбранного региона, если номинал от него зависит
  const nominalField = fields.find((f) => f.type === 'NOMINAL')
  const nominalOptions = nominalField
    ? nominals.filter((n) => !nominalField.dependsOn || n.region === values[nominalField.dependsOn]) : []
  const nominal = nominalField ? nominalOptions.find((n) => String(n.id) === values[nominalField.key]) ?? null : null

  // Сменили регион — выбранный номинал другого региона сбрасываем
  useEffect(() => {
    if (nominalField && values[nominalField.key] && !nominal) set(nominalField.key, '')
  }, [nominalField, nominal, values])

  const amount = lookup ? invoice?.amount ?? 0 : nominalField ? nominal?.price ?? 0 : parseAmount(rawAmount)
  const commission = useCommission('BILL', from?.id, amount, quoteRefresh, { providerCode: provider.code })
  const accountMax = maxPaymentAmount(limits, 'BILL', from)
  const min = Math.max(MIN_AMOUNT, provider.minAmount ?? 0)
  const max = [accountMax, provider.maxAmount].filter((x): x is number => x !== null).reduce((a, b) => Math.min(a, b), Infinity)
  const fixedAmount = lookup || !!nominalField
  const amountErr = fixedAmount ? amountError(totalOf(commission, amount), from, amount)
    : amount > 0 && amount < min ? `Минимальная сумма — ${formatRub(min)}`
    : amountError(totalOf(commission, amount), from, amount, max === Infinity ? null : max)

  const errors = Object.fromEntries(activeFields.map((f) => [f.key, fieldError(f, values[f.key] ?? '', foreignMobile)]))
  const fieldsOk = Object.values(errors).every((e) => !e)
  const searchOk = searchFields.every((f) => !errors[f.key])
  const valid = fieldsOk && (!lookup || !!invoice) && amount > 0 && !amountErr && !!from && commission.status === 'ready'
  const submitting = payment.state.status === 'submitting'

  useEffect(() => {
    if (payment.state.status === 'rejected' && payment.state.code?.startsWith('QUOTE')) setQuoteRefresh((n) => n + 1)
  }, [payment.state])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setTried(true)
    if (!valid || submitting || commission.status !== 'ready' || !from) return
    const recipientFields: Record<string, string> = {}
    for (const f of activeFields) {
      const v = (values[f.key] ?? '').trim()
      if (!v) continue
      recipientFields[f.key] = f.type === 'PHONE' ? `+${v.replace(/\D/g, '')}` : f.type === 'LOCAL_PHONE' || f.type === 'DIGITS' ? v.replace(/\D/g, '') : v
    }
    payment.submit({
      type: 'BILL', sourceAccountId: from.id, providerCode: provider.code, recipientFields, amount,
      quoteToken: commission.data.quoteToken, chargeId: lookup ? invoice?.id : undefined,
    })
  }

  const search = async () => {
    setTried(false)
    setTouched(Object.fromEntries(searchFields.map((f) => [f.key, true])))
    if (!searchOk) return
    setSearching(true)
    setSearchError(null)
    setInvoiceId(null)
    try {
      const found = await searchInvoices(provider.code, Object.fromEntries(searchFields
        .filter((f) => (values[f.key] ?? '').trim())
        .map((f) => [f.key, f.type === 'DIGITS' ? values[f.key].replace(/\D/g, '') : values[f.key].trim()])))
      setInvoices(found)
      if (found.length === 1) setInvoiceId(found[0].id)
    } catch (err) {
      setInvoices(null)
      setSearchError(err instanceof ApiError ? err.message : 'Не удалось найти счета')
    } finally {
      setSearching(false)
    }
  }

  if (payment.state.status === 'done') {
    const done = payment.state.payment
    return (
      <>
        <PaymentResult what="Платёж" payment={done}
          to={invoice ? `${provider.name} · ${invoice.title}` : nominal ? `${provider.name} · ${nominal.name}` : provider.name}
          back={[backTo(provider.groupCode)[0], `Вернуться: ${backTo(provider.groupCode)[1]}`]}
          onRetry={() => { payment.reset(); setQuoteRefresh((n) => n + 1) }} />
        {done.status === 'SUCCESS' && game?.deliveryNote && <p className="muted-text center">{game.deliveryNote}</p>}
      </>
    )
  }

  const show = (key: string) => (tried || touched[key]) && errors[key]
  const renderField = (f: ProviderField) => {
        if (f.type === 'CHOICE') {
          return (
            <div className="field" key={f.key}>
              <span className="field-label">{f.label}</span>
              <div className="chips">
                {f.options.map((o) => (
                  <button type="button" key={o.value} className={values[f.key] === o.value ? 'chip-option active' : 'chip-option'} onClick={() => set(f.key, o.value)}>
                    {o.countryCode && <span className="chip-flag">{flag(o.countryCode)}</span>}{o.label}
                  </button>
                ))}
              </div>
            </div>
          )
        }
        if (f.type === 'MONTH') {
          return (
            <Field key={f.key} label={f.label} error={show(f.key) || undefined} hint={f.hint ?? undefined}>
              <input className="input" type="month" value={values[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)} />
            </Field>
          )
        }
        if (f.type === 'NOMINAL') {
          return (
            <div className="field" key={f.key}>
              <span className="field-label">{f.label}</span>
              <div className="chips">
                {nominalOptions.map((n) => (
                  <button type="button" key={n.id} className={values[f.key] === String(n.id) ? 'chip-option nominal active' : 'chip-option nominal'} onClick={() => set(f.key, String(n.id))}>
                    <span>{n.name}</span>
                    <span className="chip-price">{formatRub(n.price)}</span>
                  </button>
                ))}
              </div>
              {show(f.key) ? <span className="field-error">{errors[f.key]}</span> : f.hint && <span className="field-hint">{f.hint}</span>}
            </div>
          )
        }
        return (
          <Field key={f.key} label={f.label} error={show(f.key) || undefined} hint={f.hint ?? undefined}>
            <span className={f.type === 'LOCAL_PHONE' ? 'input-wrap with-prefix' : 'input-wrap'}>
              {f.type === 'LOCAL_PHONE' && foreignMobile && <span className="input-prefix">+{foreignMobile.dialCode}</span>}
              <input className="input" placeholder={f.placeholder ?? undefined}
                inputMode={f.type === 'DIGITS' || f.type === 'LOCAL_PHONE' ? 'numeric' : f.type === 'PHONE' ? 'tel' : f.type === 'EMAIL' ? 'email' : 'text'}
                value={values[f.key] ?? ''}
                onFocus={() => { if (f.type === 'PHONE' && !values[f.key]) set(f.key, '+7') }}
                onBlur={() => setTouched((t) => ({ ...t, [f.key]: true }))}
                onChange={(e) => set(f.key, normalize(f, e.target.value, foreignMobile?.numberLength))} />
              {f.info && <span className="input-help" title={f.info}><Info size={20} /></span>}
            </span>
          </Field>
        )
  }

  return (
    <form className="form" onSubmit={submit}>
      {utility?.intro && <p className="bill-intro">{utility.intro}</p>}
      {directPay && (
        <div className="bill-tabs">
          {(['search', 'pay'] as const).map((m) => (
            <button type="button" key={m} className={mode === m ? 'active' : ''}
              onClick={() => { setMode(m); setInvoices(null); setInvoiceId(null); setTried(false) }}>
              {m === 'search' ? 'Найти' : 'Оплатить'}
            </button>
          ))}
        </div>
      )}
      {lookup && (
        <>
          {searchFields.map(renderField)}
          {searchError && <div className="form-error">{searchError}</div>}
          <button type="button" className="btn-primary" onClick={search} disabled={searching}>{searching ? 'Ищем…' : 'Найти'}</button>
          {invoices && invoices.length === 0 && <div className="history-empty muted">Неоплаченных счетов не найдено</div>}
          {invoices && invoices.length > 0 && (
            <div className="form charges">
              <h3>Найдено счетов: {invoices.length}</h3>
              {invoices.map((i) => (
                <button type="button" key={i.id} className={i.id === invoiceId ? 'charge-card active' : 'charge-card'} onClick={() => setInvoiceId(i.id)}>
                  <span className="charge-main">
                    <b>{i.title}</b>
                    {i.description && <span className="muted">{i.description}</span>}
                    {i.dueDate && <span className="muted">Оплатить до {ruDate(i.dueDate)}</span>}
                  </span>
                  <span className="charge-amount"><b>{formatRub(i.amount)}</b></span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
      {(!lookup || invoice) && <>
      {payFields.map(renderField)}

      {!fixedAmount && (
        <Field label="Сумма платежа" error={amountErr}
          hint={<span className="amount-hint">От {formatRub(min)}{max !== Infinity ? ` до ${formatRub(max)}` : ''}</span>}>
          <AmountInput value={rawAmount} onChange={setRawAmount} placeholder="₽" />
        </Field>
      )}

      <div className="group pay-method">
        <h3>Способ оплаты</h3>
        <AccountSelect accounts={sources} value={from} onChange={(a) => setFromId(a.id)} placeholder="Загружаем счета…" />
      </div>
      <Summary state={commission} />
      {nominalField && <span className="field-hint">Цена номинала — с учётом комиссии поставщика</span>}
      {amountErr && nominalField && <div className="form-error">{amountErr}</div>}
      {payment.state.status === 'rejected' && <div className="form-error">{payment.state.message}</div>}
      {game?.deliveryNote && <div className="form-note">{game.deliveryNote}</div>}
      <div className="pay-row">
        <OfferNote />
        <button type="submit" className="btn-primary" disabled={submitting || (tried && !valid)}>{submitting ? 'Оплачиваем…' : 'Оплатить'}</button>
      </div>
      </>}
    </form>
  )
}

// Что можно ввести в поле: цифры — только цифры, телефон — +7 XXX XXX-XX-XX
function normalize(f: ProviderField, raw: string, localLength?: number) {
  switch (f.type) {
    case 'DIGITS': return raw.replace(/\D/g, '').slice(0, 25)
    case 'LOCAL_PHONE': return raw.replace(/\D/g, '').slice(0, localLength ?? 12)
    case 'PHONE': return raw.replace(/\D/g, '') === '7' ? '+7' : formatPhone(raw)
    default: return raw
  }
}

function fieldError(f: ProviderField, raw: string, fm: ProviderDetails['foreignMobile']) {
  const v = raw.trim()
  if (!v || (f.type === 'PHONE' && v === '+7')) return f.required ? (f.type === 'NOMINAL' ? 'Выберите номинал' : 'Обязательное поле') : undefined
  switch (f.type) {
    case 'EMAIL': return EMAIL.test(v) ? undefined : 'Проверьте адрес электронной почты'
    case 'PHONE': return v.replace(/\D/g, '').length === 11 ? undefined : 'Номер телефона — 10 цифр после +7'
    case 'LOCAL_PHONE':
      if (!fm) return undefined
      if (v.length !== fm.numberLength) return `Номер — ${fm.numberLength} цифр, без кода страны ${fm.dialCode}`
      return fm.prefixes.length && !fm.prefixes.some((p) => v.startsWith(p)) ? `Номер должен начинаться с ${fm.prefixes.join(', ')}` : undefined
    case 'DIGITS':
    case 'TEXT':
      return f.pattern && !new RegExp(`^(?:${f.pattern})$`).test(v) ? (f.hint && f.hint.length < 40 ? `Проверьте поле: ${f.hint}` : 'Проверьте значение') : undefined
    default: return undefined
  }
}
