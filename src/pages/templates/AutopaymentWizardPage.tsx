import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, CalendarRange, Check, ChevronLeft, ChevronRight, Pencil, UserRound } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ApiError, createAutopayment, defaultSource, fetchMobileOperator, fetchProvider, useAccounts, useCommission,
  type ProviderDetails,
} from '../../api'
import { PayeeFieldInputs, usePayee } from '../../components/PayeeFields'
import ProviderLogo from '../../components/ProviderLogo'
import { AccountSelect, AmountInput, Field, amountError, parseAmount, totalOf } from '../../components/transfer'
import { formatRub, tariffLabel } from '../../format'
import { OfferNote } from '../requisites/RequisitesLayout'
import { formatPhone } from '../payments/MobilePaymentPage'
import { scheduleText } from './common'

const PERIODS = [7, 14, 90]
const QUICK = [300, 500, 1000, 2000]
const WEEK = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС']
const MONTH_NAMES = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']

// Сегодня по Москве: YYYY-MM-DD
function todayIso() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Moscow' }).format(new Date())
}

// Новый автоплатёж: данные поставщика → вид (каждый месяц / период) → дата → сумма → откуда списывать
export default function AutopaymentWizardPage() {
  const { code = '' } = useParams()
  const [details, setDetails] = useState<ProviderDetails | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProvider(code).then(setDetails).catch((e) => setError(e instanceof ApiError ? e.message : 'Не удалось загрузить поставщика'))
  }, [code])

  if (!details) {
    return <section className="panel transfer"><div className="transfer-body muted">{error ?? 'Загружаем…'}</div></section>
  }
  return <Wizard details={details} />
}

function Wizard({ details }: { details: ProviderDetails }) {
  const navigate = useNavigate()
  const p = details.provider
  const payee = usePayee(details)
  const { accounts } = useAccounts()
  const today = todayIso()

  const [step, setStep] = useState(0)
  const [tried, setTried] = useState(false)
  const [payeeError, setPayeeError] = useState<string | null>(null)
  const [kind, setKind] = useState<'MONTHLY' | 'PERIOD'>('MONTHLY')
  const [periodDays, setPeriodDays] = useState(7)
  const [customPeriod, setCustomPeriod] = useState('')
  const [day, setDay] = useState(Number(today.slice(8)))
  const [startDate, setStartDate] = useState(today)
  const [rawAmount, setRawAmount] = useState('')
  const [sourceId, setSourceId] = useState<string | null>(null)
  const [backupOn, setBackupOn] = useState(false)
  const [backupId, setBackupId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const sources = accounts?.filter((a) => a.kind !== 'external') ?? []
  const source = sources.find((a) => a.id === sourceId) ?? (sources.length ? defaultSource(sources) : null)
  const backups = sources.filter((a) => a.id !== source?.id)
  const backup = backupOn ? backups.find((a) => a.id === backupId) ?? backups[0] ?? null : null
  const amount = payee.nominalField ? payee.nominal?.price ?? 0 : parseAmount(rawAmount)
  const commission = useCommission('BILL', source?.id, amount, 0, { providerCode: p.code })
  const amountErr = amountError(totalOf(commission, amount), null, amount)
  const schedule = { scheduleKind: kind, dayOfMonth: day, periodDays, startDate: kind === 'PERIOD' ? startDate : null }
  const recipient = Object.values(payee.output())[0] ?? ''
  const recipientText = p.groupCode === 'MOBILE' && recipient ? formatPhone(recipient) : recipient

  // Шаг 0: данные поставщика; у связи — ещё и что номер этого оператора
  const nextFromPayee = async () => {
    setTried(true)
    setPayeeError(null)
    if (!payee.valid) return
    if (p.groupCode === 'MOBILE') {
      try {
        const op = await fetchMobileOperator(payee.output().phone)
        if (op.code !== p.code) { setPayeeError(`Номер обслуживается оператором ${op.name}`); return }
      } catch (e) {
        setPayeeError(e instanceof ApiError ? e.message : 'Не удалось проверить номер')
        return
      }
    }
    setStep(1)
  }

  const submit = async () => {
    if (!source || amount <= 0 || amountErr || saving) return
    setSaving(true)
    setSaveError(null)
    try {
      const created = await createAutopayment({
        providerCode: p.code, fields: payee.output(), amount, sourceAccountId: source.id, backupAccountId: backup?.id ?? null,
        scheduleKind: kind, ...(kind === 'MONTHLY' ? { dayOfMonth: day } : { periodDays, startDate }),
      })
      navigate(`/autopayments/${created.id}`, { replace: true })
    } catch (e) {
      setSaveError(e instanceof ApiError ? e.message : 'Не удалось подключить автоплатёж')
      setSaving(false)
    }
  }

  return (
    <section className="panel transfer">
      <div className="transfer-head requisites-head">
        <div className="provider-head-row">
          {step === 0
            ? <Link to="/autopayments/new" className="back"><ChevronLeft size={18} /> Новый автоплатёж</Link>
            : <button type="button" className="back" onClick={() => setStep(step - 1)}><ChevronLeft size={18} /> Назад</button>}
          {step > 0 && <span className="wizard-step">{step} из 4</span>}
        </div>
        {step > 0 && <div className="wizard-progress"><span style={{ width: `${step * 25}%` }} /></div>}
        <div className="requisites-title">
          <ProviderLogo big name={p.name} domain={p.domain} color={p.color} country={p.countryCode} />
          <div>
            <h1>{step === 0 ? (p.groupCode === 'MOBILE' ? 'Кому пополнить' : 'Данные платежа') : p.name}</h1>
            <div className="requisites-subtitle">{step === 0 ? p.name : recipientText}</div>
          </div>
          {step > 0 && <button type="button" className="icon-btn soft wizard-edit" onClick={() => setStep(0)} aria-label="Изменить данные"><Pencil size={16} /></button>}
        </div>
      </div>

      <div className="transfer-body">
        {step === 0 && (
          <div className="form">
            {p.groupCode === 'MOBILE' && payee.profile?.phone && (
              <button type="button" className="choose-row self-row" onClick={() => payee.set('phone', formatPhone(payee.profile!.phone))}>
                <span className="round-icon"><UserRound size={20} /></span>
                <span className="choose-title"><b>Себе</b><span className="muted small">{formatPhone(payee.profile.phone)}</span></span>
              </button>
            )}
            <PayeeFieldInputs payee={payee} details={details} show={() => tried} />
            {payeeError && <div className="form-error">{payeeError}</div>}
            <button type="button" className="btn-primary" onClick={nextFromPayee}>Продолжить</button>
          </div>
        )}

        {step === 1 && (
          <div className="form">
            <h2 className="wizard-title">Вид автоплатежа</h2>
            <button type="button" className={kind === 'MONTHLY' ? 'kind-card active' : 'kind-card'} onClick={() => setKind('MONTHLY')}>
              <span className="round-icon"><CalendarDays size={22} /></span>
              <span className="choose-title"><b>Каждый месяц</b><span className="muted small">В выбранное число месяца — например, в день оплаты по тарифу</span></span>
              {kind === 'MONTHLY' && <Check size={20} className="kind-check" />}
            </button>
            <button type="button" className={kind === 'PERIOD' ? 'kind-card active' : 'kind-card'} onClick={() => setKind('PERIOD')}>
              <span className="round-icon"><CalendarRange size={22} /></span>
              <span className="choose-title"><b>По расписанию</b><span className="muted small">Когда платёж каждый раз одинаковый — раз в несколько дней</span></span>
              {kind === 'PERIOD' && <Check size={20} className="kind-check" />}
            </button>
            {kind === 'PERIOD' && (
              <div className="group">
                <h3>Укажите период</h3>
                <div className="chips">
                  {PERIODS.map((d) => (
                    <button type="button" key={d} className={periodDays === d && !customPeriod ? 'chip-option active' : 'chip-option'}
                      onClick={() => { setPeriodDays(d); setCustomPeriod('') }}>{d} дней</button>
                  ))}
                </div>
                <Field label="Свой период, дней" hint="От 1 до 180 дней"
                  error={customPeriod && (Number(customPeriod) < 1 || Number(customPeriod) > 180) ? 'От 1 до 180 дней' : undefined}>
                  <input className="input" inputMode="numeric" placeholder="Например, 9" value={customPeriod}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, '').slice(0, 3)
                      setCustomPeriod(v)
                      if (Number(v) >= 1 && Number(v) <= 180) setPeriodDays(Number(v))
                    }} />
                </Field>
              </div>
            )}
            <button type="button" className="btn-primary" onClick={() => setStep(2)}
              disabled={kind === 'PERIOD' && !!customPeriod && (Number(customPeriod) < 1 || Number(customPeriod) > 180)}>Продолжить</button>
          </div>
        )}

        {step === 2 && (
          <div className="form">
            <h2 className="wizard-title">Дата оплаты</h2>
            <p className="muted wizard-sub">{kind === 'MONTHLY' ? 'Удобнее выбирать на основе тарифа' : 'Удобнее выбирать на основе дня оплаты счёта'}</p>
            {kind === 'MONTHLY'
              ? <DayGrid value={day} onChange={setDay} />
              : <StartCalendar value={startDate} min={today} onChange={setStartDate} />}
            <p className="wizard-caption">{scheduleText(schedule)}</p>
            <button type="button" className="btn-primary" onClick={() => setStep(3)}>Продолжить</button>
          </div>
        )}

        {step === 3 && (
          <div className="form">
            <h2 className="wizard-title">Сумма платежа</h2>
            {payee.nominalField
              ? <p className="bills-paid">{payee.nominal ? `${payee.nominal.name} — ${formatRub(payee.nominal.price)}` : 'Выберите номинал на первом шаге'}</p>
              : (
                <>
                  <Field label="Сумма" error={amountErr}
                    hint={commission.status === 'ready' ? (commission.data.commission === 0 ? 'Без комиссии' : `Комиссия ${tariffLabel(commission.data)}`) : undefined}>
                    <AmountInput value={rawAmount} onChange={setRawAmount} placeholder="₽" />
                  </Field>
                  <div className="chips">
                    {QUICK.map((v) => <button type="button" key={v} className="chip-option" onClick={() => setRawAmount(String(v))}>{formatRub(v)}</button>)}
                  </div>
                </>
              )}
            {amount > 0 && <p className="wizard-caption">{formatRub(amount)} — {scheduleText(schedule)}</p>}
            <button type="button" className="btn-primary" onClick={() => setStep(4)} disabled={amount <= 0 || !!amountErr}>Продолжить</button>
          </div>
        )}

        {step === 4 && (
          <div className="form">
            <h2 className="wizard-title">Откуда списывать</h2>
            <p className="muted wizard-sub">Если на основном не хватит денег, вся сумма спишется с запасного</p>
            <div className="group pay-method">
              <h3>Основной счёт</h3>
              <AccountSelect accounts={sources} value={source} onChange={(a) => { setSourceId(a.id); if (a.id === backupId) setBackupId(null) }} placeholder="Загружаем счета…" />
            </div>
            <label className="check-row">
              <input type="checkbox" checked={backupOn} onChange={(e) => setBackupOn(e.target.checked)} disabled={backups.length === 0} />
              <span>Запасной счёт</span>
            </label>
            {backupOn && backup && (
              <div className="group pay-method">
                <h3>Запасной счёт</h3>
                <AccountSelect accounts={backups} value={backup} onChange={(a) => setBackupId(a.id)} />
              </div>
            )}
            <p className="wizard-caption">{formatRub(amount)}{commission.status === 'ready' && commission.data.commission > 0 ? ` + комиссия ${formatRub(commission.data.commission)}` : ''} — {scheduleText(schedule)}</p>
            {saveError && <div className="form-error">{saveError}</div>}
            <div className="pay-row">
              <OfferNote action="Подключить" />
              <button type="button" className="btn-primary" onClick={submit} disabled={saving || !source}>{saving ? 'Подключаем…' : 'Подключить'}</button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

// Числа месяца для «Каждый месяц»
function DayGrid({ value, onChange }: { value: number; onChange: (d: number) => void }) {
  return (
    <div className="day-grid">
      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
        <button type="button" key={d} className={d === value ? 'day active' : 'day'} onClick={() => onChange(d)}>{d}</button>
      ))}
    </div>
  )
}

// Календарь даты первого платежа для «По расписанию»: с сегодняшнего дня
function StartCalendar({ value, min, onChange }: { value: string; min: string; onChange: (iso: string) => void }) {
  const [month, setMonth] = useState(() => { const [y, m] = value.split('-').map(Number); return { y, m: m - 1 } })
  const cells = useMemo(() => {
    const first = new Date(Date.UTC(month.y, month.m, 1))
    const offset = (first.getUTCDay() + 6) % 7
    const len = new Date(Date.UTC(month.y, month.m + 1, 0)).getUTCDate()
    return [...Array(offset).fill(null), ...Array.from({ length: len }, (_, i) => i + 1)]
  }, [month])
  const iso = (d: number) => `${month.y}-${String(month.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const shift = (n: number) => setMonth(({ y, m }) => { const t = m + n; return { y: y + Math.floor(t / 12), m: ((t % 12) + 12) % 12 } })
  const canBack = iso(1) > min.slice(0, 8) + '01'
  return (
    <div className="start-calendar">
      <div className="cal-head">
        <button type="button" className="icon-btn" onClick={() => shift(-1)} disabled={!canBack} aria-label="Предыдущий месяц"><ChevronLeft size={18} /></button>
        <b>{MONTH_NAMES[month.m]} {month.y}</b>
        <button type="button" className="icon-btn" onClick={() => shift(1)} aria-label="Следующий месяц"><ChevronRight size={18} /></button>
      </div>
      <div className="day-grid">
        {WEEK.map((w) => <span key={w} className="week-day">{w}</span>)}
        {cells.map((d, i) => d === null ? <span key={`e${i}`} /> : (
          <button type="button" key={d} disabled={iso(d) < min} className={iso(d) === value ? 'day active' : 'day'} onClick={() => onChange(iso(d))}>{d}</button>
        ))}
      </div>
    </div>
  )
}
