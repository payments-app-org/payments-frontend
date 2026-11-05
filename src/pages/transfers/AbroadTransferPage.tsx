import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ChevronDown, Globe, Search } from 'lucide-react'
import { ApiError, defaultSource, useAccounts, usePaymentSubmit } from '../../api'
import {
  currencyFlag, fetchCountries, fetchCountry, fetchFxQuote, flag,
  type Country, type Field, type FxQuote, type Method,
} from '../../abroad'
import AccountPicker from '../../components/AccountPicker'
import Modal from '../../components/Modal'
import { PaymentResult, TransferLayout } from '../../components/transfer'
import { formatMoney, formatRub } from '../../format'

const rateFormat = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 4, maximumFractionDigits: 4 })
const toNumber = (raw: string) => Number(raw.replace(/\s/g, '').replace(',', '.')) || 0
const toInput = (n: number) => String(n).replace('.', ',')

function CountryRow({ country }: { country: Country }) {
  return (
    <>
      <span className="flag-tile">{flag(country.code)}</span>
      <span className="acc-line">
        <span className="acc-line-main">{country.nameRu}</span>
        {country.nameNative !== country.nameRu && <span className="acc-line-sub">{country.nameNative}</span>}
      </span>
    </>
  )
}

function MethodLogo({ method }: { method: Method }) {
  const letters = method.name.replace(/[^A-Za-zА-Яа-яЁё0-9 ]/g, '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('')
  return <span className="acc-tile method-logo" style={{ background: method.color }}>{letters}</span>
}

// Выбор страны: поиск по русскому и местному названию, популярные сверху
function CountryModal({ countries, onPick, onClose }: { countries: Country[]; onPick: (c: Country) => void; onClose: () => void }) {
  const [q, setQ] = useState('')
  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return s ? countries.filter((c) => c.nameRu.toLowerCase().includes(s) || c.nameNative.toLowerCase().includes(s) || c.code.toLowerCase() === s) : countries
  }, [countries, q])
  return (
    <Modal title="Выберите страну" onClose={onClose}>
      <label className="search-box"><Search size={20} /><input autoFocus placeholder="Название страны" value={q} onChange={(e) => setQ(e.target.value)} /></label>
      <div className="picker-list scroll-list">
        {list.map((c) => (
          <button type="button" key={c.code} className="picker-option" onClick={() => onPick(c)}><CountryRow country={c} /></button>
        ))}
        {list.length === 0 && <div className="muted history-empty">Страна не найдена</div>}
      </div>
    </Modal>
  )
}

// Выбор способа перевода: поиск, фильтр по типу, курс и итог по каждому
function MethodModal({ methods, quote, onPick, onClose }: { methods: Method[]; quote: FxQuote | null; onPick: (m: Method) => void; onClose: () => void }) {
  const [q, setQ] = useState('')
  const [kind, setKind] = useState<string | null>(null)
  const kinds = [...new Map(methods.map((m) => [m.kind, m.kindLabel])).entries()]
  const list = methods.filter((m) => (!kind || m.kind === kind) && m.name.toLowerCase().includes(q.trim().toLowerCase()))
  return (
    <Modal title="Способ получения" onClose={onClose}>
      <label className="search-box"><Search size={20} /><input placeholder="Поиск" value={q} onChange={(e) => setQ(e.target.value)} /></label>
      <div className="filter-chips method-kinds">
        <button type="button" className={!kind ? 'filter-chip active' : 'filter-chip'} onClick={() => setKind(null)}>Все</button>
        {kinds.map(([k, label]) => (
          <button type="button" key={k} className={kind === k ? 'filter-chip active' : 'filter-chip'} onClick={() => setKind(k)}>{label}</button>
        ))}
      </div>
      <div className="method-list scroll-list">
        {list.map((m) => (
          <button type="button" key={m.id} className="method-card" onClick={() => onPick(m)}>
            <span className="method-card-head">
              <MethodLogo method={m} />
              <span className="acc-line"><span className="acc-line-main method-name">{m.name}</span><span className="acc-line-sub">{m.kindLabel}</span></span>
            </span>
            {quote && (
              <span className="method-card-grid">
                <span><small>Курс</small>1 {quote.symbol} = {rateFormat.format(quote.rate)} ₽</span>
                <span><small>Комиссия</small>{formatRub(quote.commission)}</span>
                <span><small>Итого</small>{formatRub(quote.total)}</span>
              </span>
            )}
          </button>
        ))}
      </div>
    </Modal>
  )
}

// Перевод за рубеж: страна → счёт списания → валюта → суммы (пересчёт в обе стороны) → способ → данные получателя.
// Справочники — из biller, курс и котировка — из pricing, сам перевод — сага в payment. Комиссии нет: доход в курсе.
export default function AbroadTransferPage() {
  const { accounts } = useAccounts()
  const payment = usePaymentSubmit()
  const [countries, setCountries] = useState<Country[]>([])
  const [country, setCountry] = useState<Country | null>(null)
  const [methods, setMethods] = useState<Method[]>([])
  const [countryModal, setCountryModal] = useState(true)
  const [methodModal, setMethodModal] = useState(false)
  const [sourceId, setSourceId] = useState<string | null>(null)
  const [currency, setCurrency] = useState<string | null>(null)
  const [rub, setRub] = useState('')
  const [receive, setReceive] = useState('')
  const [edited, setEdited] = useState<'rub' | 'receive'>('rub')
  const [quote, setQuote] = useState<FxQuote | null>(null)
  const [quoteState, setQuoteState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [quoteError, setQuoteError] = useState<string | null>(null)
  const [method, setMethod] = useState<Method | null>(null)
  const [fields, setFields] = useState<Field[]>([])
  const [values, setValues] = useState<Record<string, string>>({})
  const [step, setStep] = useState<'form' | 'details'>('form')
  // Увеличиваем, чтобы взять новую котировку (старая использована или истекла)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => { fetchCountries().then(setCountries, () => {}) }, [])

  const sources = accounts?.filter((a) => a.kind !== 'external') ?? []
  const source = sources.find((a) => a.id === sourceId) ?? (sources.length ? defaultSource(sources) : null)

  const pickCountry = (c: Country) => {
    setCountry(c)
    setCountryModal(false)
    // По умолчанию — местная валюта (первая в списке страны)
    setCurrency(c.currencies[0])
    setMethod(null)
    setQuote(null)
    setReceive('')
    fetchCountry(c.code).then((d) => setMethods(d.methods), () => setMethods([]))
  }

  // Через полсекунды после ввода — котировка; заполняем вторую сумму
  useEffect(() => {
    const value = toNumber(edited === 'rub' ? rub : receive)
    if (!source || !currency || value <= 0) {
      setQuote(null)
      setQuoteState('idle')
      return
    }
    setQuoteState('loading')
    const controller = new AbortController()
    const timer = setTimeout(() => {
      fetchFxQuote(source.id, currency, edited === 'rub' ? { amountRub: value } : { receiveAmount: value }, controller.signal).then(
        (q) => {
          setQuote(q)
          setQuoteState('idle')
          setQuoteError(null)
          if (edited === 'rub') setReceive(toInput(q.receiveAmount))
          else setRub(toInput(q.amountRub))
        },
        (e) => {
          if (controller.signal.aborted) return
          setQuoteState('error')
          setQuoteError(e instanceof ApiError ? e.message : 'Не удалось получить курс')
        },
      )
    }, 500)
    return () => { clearTimeout(timer); controller.abort() }
  }, [source?.id, currency, edited === 'rub' ? rub : receive, edited, refresh])

  const pickMethod = (m: Method) => {
    setMethod(m)
    setMethodModal(false)
    // Поля получателя пришли вместе со страной — второй запрос не нужен
    setFields(m.fields)
    setValues({})
  }

  const tooMuch = !!source && source.balance !== null && !!quote && quote.total > source.balance
  // Пределы суммы у каждого способа свои (на карту — до 150 тыс. ₽, на счёт — до 1 млн); окончательно проверит payment
  const outOfRange = !!method && !!quote && (quote.amountRub < method.minAmount || quote.amountRub > method.maxAmount)
  const formReady = !!country && !!source && !!currency && !!quote && quoteState === 'idle' && !!method && !tooMuch && !outOfRange

  const fieldError = (f: Field) => {
    const raw = values[f.key] ?? ''
    if (!raw) return null
    const v = ['CARD_NUMBER', 'PHONE', 'ACCOUNT', 'IBAN', 'SWIFT', 'IFSC'].includes(f.type) ? raw.replace(/\s/g, '').toUpperCase()
      : f.key.endsWith('_name') ? raw.trim().toUpperCase() : raw.trim()
    return new RegExp(f.pattern).test(v) ? null : 'Проверьте формат'
  }
  const detailsReady = fields.length > 0 && fields.every((f) => values[f.key] && !fieldError(f))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!formReady || !detailsReady || !quote || !country || !source || !method || !currency) return
    payment.submit({
      type: 'ABROAD', sourceAccountId: source.id, amount: quote.amountRub, quoteToken: quote.quoteToken,
      country: country.code, receiveCurrency: currency, receiveAmount: quote.receiveAmount, transferMethodId: method.id,
      recipientFields: values,
    })
  }

  // Котировка одноразовая и живёт 10 минут: после отказа берём новую
  useEffect(() => {
    if (payment.state.status === 'rejected' && payment.state.code?.startsWith('QUOTE')) setRefresh((n) => n + 1)
  }, [payment.state])

  const retry = () => { payment.reset(); setStep('form'); setRefresh((n) => n + 1) }

  if (payment.state.status === 'done') {
    return (
      <TransferLayout title="Перевод за рубеж">
        <PaymentResult payment={payment.state.payment}
          to={`${country?.nameRu}, ${method?.name} · получат ${formatMoney(quote?.receiveAmount ?? 0, currency ?? 'USD')}`} onRetry={retry} />
      </TransferLayout>
    )
  }

  if (step === 'details' && method) {
    return (
      <TransferLayout title="Данные получателя">
        <form className="form" onSubmit={submit}>
          <div className="abroad-method-line"><MethodLogo method={method} /><span>{method.name}<br /><small className="muted">{country?.nameRu} · {method.kindLabel}</small></span></div>
          {fields.map((f) => (
            <label key={f.key} className="field">
              <span className="field-label">{f.label}</span>
              <input className="input" value={values[f.key] ?? ''}
                placeholder={f.type === 'PHONE' && country?.dialCode ? `${country.dialCode} …` : f.placeholder ?? ''}
                inputMode={['CARD_NUMBER', 'PHONE'].includes(f.type) ? 'tel' : 'text'}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: f.type === 'CARD_NUMBER'
                  ? e.target.value.replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ') : e.target.value }))} />
              {fieldError(f) && <span className="field-error">{fieldError(f)}</span>}
            </label>
          ))}
          <div className="summary">
            <div className="summary-row"><span>Получатель получит</span><span>{formatMoney(quote?.receiveAmount ?? 0, currency ?? '')}</span></div>
            <div className="summary-row total"><span>Итого к списанию</span><span>{formatRub(quote?.total ?? 0)}</span></div>
          </div>
          {payment.state.status === 'rejected' && <div className="form-error">{payment.state.message}</div>}
          <div className="abroad-actions">
            <button type="button" className="btn-secondary" onClick={() => setStep('form')}>Назад</button>
            <button type="submit" className="btn-primary" disabled={!detailsReady || payment.state.status === 'submitting'}>
              {payment.state.status === 'submitting' ? 'Переводим…' : 'Перевести'}
            </button>
          </div>
        </form>
      </TransferLayout>
    )
  }

  return (
    <TransferLayout title="Перевод за рубеж">
      <div className="form">
        <div className="field">
          <span className="field-label">Откуда</span>
          <AccountPicker title="Откуда списать" accounts={sources} value={source} onChange={(a) => setSourceId(a.id)} />
        </div>
        <div className="field">
          <span className="field-label">Куда</span>
          <button type="button" className="picker" onClick={() => setCountryModal(true)}>
            {country ? <CountryRow country={country} /> : <><span className="acc-tile empty"><Globe size={22} /></span><span className="picker-placeholder">Выберите страну</span></>}
            <ChevronDown size={22} className="muted" />
          </button>
        </div>

        {country && (
          <>
            <div className="field">
              <span className="field-label">Валюта перевода</span>
              <div className="currency-chips">
                {country.currencies.map((c) => (
                  <button type="button" key={c} className={c === currency ? 'currency-chip active' : 'currency-chip'}
                    onClick={() => { setCurrency(c); setEdited('rub') }}>
                    <span className="currency-flag">{currencyFlag(c)}</span>{c}
                  </button>
                ))}
              </div>
            </div>
            <div className="amounts-row">
              <label className="field">
                <span className="field-label">Сумма перевода</span>
                <span className="input input-suffix"><input inputMode="decimal" placeholder="0" value={rub}
                  onChange={(e) => { setRub(e.target.value.replace(/[^\d.,]/g, '')); setEdited('rub') }} /><span>RUB</span></span>
              </label>
              <label className="field">
                <span className="field-label">Сумма к получению</span>
                <span className="input input-suffix"><input inputMode="decimal" placeholder="0" value={receive}
                  onChange={(e) => { setReceive(e.target.value.replace(/[^\d.,]/g, '')); setEdited('receive') }} /><span>{currency}</span></span>
              </label>
            </div>
            <div className="field">
              <span className="field-label">Способ получения</span>
              <button type="button" className="picker" onClick={() => setMethodModal(true)} disabled={methods.length === 0}>
                {method ? <><MethodLogo method={method} /><span className="acc-line"><span className="acc-line-sub">{method.kindLabel}</span><span className="acc-line-main">{method.name}</span></span></>
                  : <span className="picker-placeholder">Выберите банк или способ</span>}
                <ChevronDown size={22} className="muted" />
              </button>
            </div>
            <div className="summary">
              {quoteState === 'loading' && <span className="muted-text">Считаем по курсу…</span>}
              {quoteState === 'error' && <span className="error-text">{quoteError}</span>}
              {quoteState === 'idle' && !quote && <span className="muted-text">Введите сумму — пересчитаем по курсу</span>}
              {quoteState === 'idle' && quote && (
                <>
                  <div className="summary-row"><span>Курс</span><span>1 {quote.symbol} = {rateFormat.format(quote.rate)} ₽</span></div>
                  <div className="summary-row"><span>Комиссия</span><span>{formatRub(quote.commission)}</span></div>
                  <div className="summary-row total"><span>Итого к списанию</span><span>{formatRub(quote.total)}</span></div>
                </>
              )}
            </div>
            {tooMuch && <div className="form-error">Недостаточно средств</div>}
            {!tooMuch && outOfRange && method && (
              <div className="form-error">Этим способом можно отправить от {formatRub(method.minAmount)} до {formatRub(method.maxAmount)}</div>
            )}
            <button type="button" className="btn-primary" disabled={!formReady} onClick={() => setStep('details')}>Продолжить</button>
          </>
        )}
      </div>
      {countryModal && countries.length > 0 && <CountryModal countries={countries} onPick={pickCountry} onClose={() => setCountryModal(false)} />}
      {methodModal && <MethodModal methods={methods} quote={quote} onPick={pickMethod} onClose={() => setMethodModal(false)} />}
    </TransferLayout>
  )
}
