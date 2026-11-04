import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronLeft, CircleCheck, CircleX, LoaderCircle, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'
import { MIN_AMOUNT, maxPaymentAmount, useOperationLimits, type Account, type CommissionState, type Payment } from '../api'
import { formatRub, tariffLabel } from '../format'
import PaymentSystemBadge from './PaymentSystemBadge'

// Общие куски форм переводов: каркас страницы, выбор счёта, сумма, итог

export function TransferLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="panel transfer">
      <div className="transfer-head">
        <Link to="/?tab=transfers" className="back"><ChevronLeft size={18} /> Переводы</Link>
        <h1>{title}</h1>
      </div>
      <div className="transfer-body">{children}</div>
    </section>
  )
}

export function Field({ label, hint, error, children }: { label: string; hint?: ReactNode; error?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {error ? <span className="field-error">{error}</span> : hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

export function balanceLabel(a: Account) {
  return a.balance === null ? 'другой банк' : formatRub(a.balance)
}

function AccountIcon({ account }: { account: Account }) {
  return account.kind !== 'wallet'
    ? <PaymentSystemBadge system={account.paymentSystem} />
    : <span className="round-icon tiny"><Wallet size={14} /></span>
}

export function AccountSelect({ accounts, value, onChange, placeholder = 'Выберите счёт' }: {
  accounts: Account[]
  value: Account | null
  onChange: (a: Account) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div className="select" ref={ref}>
      <button type="button" className={open ? 'input select-btn focused' : 'input select-btn'} onClick={() => setOpen(!open)}>
        {value ? (
          <>
            <AccountIcon account={value} />
            <span className="select-title">{value.title}</span>
            <span>{balanceLabel(value)}</span>
          </>
        ) : (
          <span className="placeholder select-title">{placeholder}</span>
        )}
        <ChevronDown size={20} className="muted" />
      </button>
      {open && (
        <div className="select-menu">
          {accounts.map((a) => (
            <button type="button" key={a.id} className="select-option" onClick={() => { onChange(a); setOpen(false) }}>
              <AccountIcon account={a} />
              <span className="select-title">{a.title}</span>
              <span>{balanceLabel(a)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function parseAmount(raw: string) {
  const n = Number(raw.replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

// total — сумма вместе с комиссией (её сверяем с балансом), amount — сама сумма перевода (её — с минимумом и лимитом)
export function amountError(total: number, from: Account | null, amount = total, max: number | null = null) {
  if (amount > 0 && amount < MIN_AMOUNT) return `Минимальная сумма — ${MIN_AMOUNT} ₽`
  if (max !== null && amount > max) return `Максимальная сумма — ${formatRub(max)}`
  // Баланс карты другого банка неизвестен — проверит процессинг
  if (from && from.balance !== null && total > from.balance) return 'Недостаточно средств'
  return undefined
}

// Плашка под суммой: «От 10 ₽ до 50 000 ₽»
export function AmountHint({ operationType, account }: { operationType: string; account: Account | null }) {
  const limits = useOperationLimits()
  const max = maxPaymentAmount(limits, operationType, account)
  return <span className="amount-hint">От {formatRub(MIN_AMOUNT)}{max !== null ? ` до ${formatRub(max)}` : ''}</span>
}

export function AmountInput({ value, onChange, placeholder = '0 ₽' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      className="input"
      inputMode="decimal"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ''))}
    />
  )
}

// Комиссию считает сервис pricing; здесь только показываем результат
export function Summary({ state }: { state: CommissionState }) {
  switch (state.status) {
    case 'idle':
      return <div className="summary muted-text">Здесь мы рассчитываем итоговую сумму</div>
    case 'loading':
      return <div className="summary muted-text">Считаем комиссию…</div>
    case 'error':
      return <div className="summary error-text">{state.message}</div>
    case 'ready': {
      const { commission, total } = state.data
      return (
        <div className="summary">
          <div className="summary-row">
            <span>Комиссия {tariffLabel(state.data)}</span>
            <span>{formatRub(commission)}</span>
          </div>
          <div className="summary-row total"><span>Итого к списанию</span><span>{formatRub(total)}</span></div>
        </div>
      )
    }
  }
}

// Сумма к списанию вместе с комиссией, если она уже посчитана
export function totalOf(state: CommissionState, amount: number) {
  return state.status === 'ready' ? state.data.total : amount
}

export function SubmitButton({ disabled, children }: { disabled: boolean; children: ReactNode }) {
  return <button type="submit" className="btn-primary" disabled={disabled}>{children}</button>
}

export function Success({ amount, to }: { amount: number; to: string }) {
  return (
    <div className="success">
      <CircleCheck size={56} strokeWidth={1.5} className="success-icon" />
      <h2>Перевод отправлен</h2>
      <p className="muted-text">{formatRub(amount)} · {to}</p>
      <Link to="/?tab=transfers" className="btn-primary link">Вернуться к переводам</Link>
    </div>
  )
}

// Итог платежа из сервиса payment: успех, отказ или «ещё обрабатывается»
export function PaymentResult({ payment, to, onRetry, back = ['/?tab=transfers', 'Вернуться к переводам'], what = 'Перевод' }: {
  payment: Payment
  to: string
  onRetry: () => void
  back?: [string, string]
  // «Перевод выполнен» / «Платёж выполнен»
  what?: 'Перевод' | 'Платёж'
}) {
  if (payment.status === 'SUCCESS') {
    return (
      <div className="success">
        <CircleCheck size={56} strokeWidth={1.5} className="success-icon" />
        <h2>{what} выполнен</h2>
        <p className="muted-text">{formatRub(payment.amount)} · {to}<br />Комиссия {formatRub(payment.commission)}, списано {formatRub(payment.total)}</p>
        {!!payment.roundUpAmount && payment.roundUpAmount > 0 && (
          <p className="roundup-note">Округление на пользу: {formatRub(payment.roundUpAmount)} — «{payment.roundUpFundName}»</p>
        )}
        <Link to={back[0]} className="btn-primary link">{back[1]}</Link>
      </div>
    )
  }
  if (payment.status === 'FAILED' || payment.status === 'COMPENSATING') {
    return (
      <div className="success">
        <CircleX size={56} strokeWidth={1.5} className="error-text" />
        <h2>{what} не выполнен</h2>
        <p className="muted-text">{payment.message}</p>
        <button type="button" className="btn-primary link" onClick={onRetry}>Попробовать снова</button>
      </div>
    )
  }
  return (
    <div className="success">
      <LoaderCircle size={56} strokeWidth={1.5} className="muted spin" />
      <h2>{what} обрабатывается</h2>
      <p className="muted-text">Это может занять немного времени. Статус обновится сам.</p>
    </div>
  )
}
