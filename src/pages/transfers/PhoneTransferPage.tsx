import { useEffect, useState, type FormEvent } from 'react'
import { defaultSource, useAccounts, useCommission, usePaymentSubmit } from '../../api'
import {
  AccountSelect, AmountInput, Field, PaymentResult, SubmitButton, Summary, TransferLayout, amountError, parseAmount, totalOf,
} from '../../components/transfer'
import BankSelect from '../../components/BankSelect'
import type { Bank } from '../../data/banks'

const MESSAGE_MAX = 40

// +7 000 000 00 00 — храним только 10 цифр после кода страны
function formatPhone(raw: string) {
  let d = raw.replace(/\D/g, '')
  if (d.startsWith('7') || d.startsWith('8')) d = d.slice(1)
  d = d.slice(0, 10)
  if (!d) return ''
  return ['+7', d.slice(0, 3), d.slice(3, 6), d.slice(6, 8), d.slice(8, 10)].filter(Boolean).join(' ')
}

export default function PhoneTransferPage() {
  const { accounts } = useAccounts()
  const [fromId, setFromId] = useState<string | null>(null)
  const [phone, setPhone] = useState('')
  const [bank, setBank] = useState<Bank | null>(null)
  const [message, setMessage] = useState('')
  const [rawAmount, setRawAmount] = useState('')
  const [quoteRefresh, setQuoteRefresh] = useState(0)
  const payment = usePaymentSubmit()

  const from = accounts?.find((a) => a.id === fromId) ?? defaultSource(accounts)
  const amount = parseAmount(rawAmount)
  const commission = useCommission('SBP_PHONE', from?.id, amount, quoteRefresh)
  const amountErr = amountError(totalOf(commission, amount), from)
  const phoneDigits = phone.replace(/\D/g, '')
  const valid = !!from && phoneDigits.length === 11 && !!bank && commission.status === 'ready' && !amountErr
  const submitting = payment.state.status === 'submitting'

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!valid || submitting || commission.status !== 'ready') return
    payment.submit({
      type: 'SBP_PHONE',
      sourceAccountId: from.id,
      recipientPhone: `+${phoneDigits}`,
      recipientBankId: bank.id,
      amount,
      quoteToken: commission.data.quoteToken,
    })
  }

  // Котировка истекла или уже использована — молча берём новую, пользователь нажмёт ещё раз
  useEffect(() => {
    if (payment.state.status === 'rejected' && payment.state.code?.startsWith('QUOTE')) setQuoteRefresh((n) => n + 1)
  }, [payment.state])

  // Котировка одноразовая: после попытки платежа берём новую
  const retry = () => {
    payment.reset()
    setQuoteRefresh((n) => n + 1)
  }

  if (payment.state.status === 'done') {
    return (
      <TransferLayout title="По номеру телефона">
        <PaymentResult payment={payment.state.payment} to={`${phone}, ${bank?.name}`} onRetry={retry} />
      </TransferLayout>
    )
  }

  return (
    <TransferLayout title="По номеру телефона">
      <form className="form" onSubmit={submit}>
        <Field label="Списать с">
          <AccountSelect accounts={accounts ?? []} value={from} onChange={(a) => setFromId(a.id)} placeholder="Загружаем счета…" />
        </Field>
        <Field label="Номер телефона">
          <input className="input" inputMode="tel" placeholder="+7 000 000 00 00" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} />
        </Field>
        <div className="field">
          <span className="field-label">Банк получателя</span>
          <BankSelect value={bank} onChange={setBank} />
        </div>
        <Field label="Сообщение получателю" hint={`${message.length}/${MESSAGE_MAX}`}>
          <input className="input" placeholder="Введите сообщение" maxLength={MESSAGE_MAX} value={message} onChange={(e) => setMessage(e.target.value)} />
        </Field>
        <Field label="Сумма перевода" error={amountErr}>
          <AmountInput value={rawAmount} onChange={setRawAmount} placeholder="Введите сумму" />
        </Field>
        <Summary state={commission} />
        {payment.state.status === 'rejected' && <div className="form-error">{payment.state.message}</div>}
        <SubmitButton disabled={!valid || submitting}>{submitting ? 'Переводим…' : 'Продолжить'}</SubmitButton>
      </form>
    </TransferLayout>
  )
}
