import { useEffect, useState, type FormEvent } from 'react'
import { defaultSource, maxPaymentAmount, useAccounts, useCommission, useOperationLimits, usePaymentSubmit } from '../../api'
import {
  AccountSelect, AmountHint, AmountInput, Field, PaymentResult, SubmitButton, Summary, TransferLayout, amountError, parseAmount, totalOf,
} from '../../components/transfer'

// +7 000 000 00 00 — храним только 10 цифр после кода страны
function formatPhone(raw: string) {
  let d = raw.replace(/\D/g, '')
  if (d.startsWith('7') || d.startsWith('8')) d = d.slice(1)
  d = d.slice(0, 10)
  return d ? ['+7', d.slice(0, 3), d.slice(3, 6), d.slice(6, 8), d.slice(8, 10)].filter(Boolean).join(' ') : ''
}

// Перевод на «Мой кошелёк» другого клиента по номеру телефона — внутренний платёж, без антифрода и процессинга
export default function WalletToWalletPage() {
  const { accounts } = useAccounts()
  const limits = useOperationLimits()
  const payment = usePaymentSubmit()
  const [fromId, setFromId] = useState<string | null>(null)
  const [phone, setPhone] = useState('')
  const [rawAmount, setRawAmount] = useState('')
  const [quoteRefresh, setQuoteRefresh] = useState(0)

  // Списывать можно с кошелька или карты нашего банка
  const sources = accounts?.filter((a) => a.kind !== 'external') ?? []
  const from = sources.find((a) => a.id === fromId) ?? (sources.length ? defaultSource(sources) : null)
  const amount = parseAmount(rawAmount)
  const commission = useCommission('WALLET_TRANSFER', from?.id, amount, quoteRefresh)
  const amountErr = amountError(totalOf(commission, amount), from, amount, maxPaymentAmount(limits, 'WALLET_TRANSFER', from))
  const digits = phone.replace(/\D/g, '')
  const valid = !!from && digits.length === 11 && commission.status === 'ready' && !amountErr
  const submitting = payment.state.status === 'submitting'

  useEffect(() => {
    if (payment.state.status === 'rejected' && payment.state.code?.startsWith('QUOTE')) setQuoteRefresh((n) => n + 1)
  }, [payment.state])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!valid || submitting || commission.status !== 'ready' || !from) return
    payment.submit({ type: 'WALLET_TRANSFER', sourceAccountId: from.id, recipientPhone: `+${digits}`, amount, quoteToken: commission.data.quoteToken })
  }

  if (payment.state.status === 'done') {
    return (
      <TransferLayout title="Перевод на кошелёк">
        <PaymentResult payment={payment.state.payment} to={payment.state.payment.recipientName ?? phone}
          onRetry={() => { payment.reset(); setQuoteRefresh((n) => n + 1) }} />
      </TransferLayout>
    )
  }

  return (
    <TransferLayout title="Перевод на кошелёк">
      <form className="form" onSubmit={submit}>
        <div className="group">
          <h3>Списать с</h3>
          <AccountSelect accounts={sources} value={from} onChange={(a) => setFromId(a.id)} placeholder="Загружаем счета…" />
        </div>
        <div className="group">
          <h3>Кошелёк получателя</h3>
          <Field label="Номер телефона">
            <input className="input" inputMode="tel" placeholder="+7" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} />
          </Field>
        </div>
        <Field label="Сумма перевода" error={amountErr} hint={<AmountHint operationType="WALLET_TRANSFER" account={from} />}>
          <AmountInput value={rawAmount} onChange={setRawAmount} />
        </Field>
        <Summary state={commission} />
        {payment.state.status === 'rejected' && <div className="form-error">{payment.state.message}</div>}
        <SubmitButton disabled={!valid || submitting}>{submitting ? 'Переводим…' : 'Перевести'}</SubmitButton>
      </form>
    </TransferLayout>
  )
}
