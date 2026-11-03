import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { defaultSource, useAccounts, useCommission, usePaymentSubmit, type Account } from '../../api'
import {
  AccountSelect, AmountInput, Field, PaymentResult, SubmitButton, Summary, TransferLayout, amountError, parseAmount, totalOf,
} from '../../components/transfer'

export default function OwnTransferPage() {
  const accounts = useAccounts().accounts ?? []
  const [fromId, setFromId] = useState<string | null>(null)
  const [toId, setToId] = useState<string | null>(null)
  const [rawAmount, setRawAmount] = useState('')
  const [quoteRefresh, setQuoteRefresh] = useState(0)
  const [params] = useSearchParams()
  const payment = usePaymentSubmit()

  // Берём счета из свежего списка: после перевода балансы обновятся и в выпадающих списках
  const to = accounts.find((a) => a.id === toId) ?? null
  // По умолчанию — инструмент оплаты по умолчанию (если он не совпадает со счётом зачисления)
  const from = accounts.find((a) => a.id === fromId) ?? (accounts.length ? defaultSource(accounts, toId) : null)

  // «Пополнить» на странице кошелька открывает перевод с уже выбранным кошельком в «Зачислить на»
  useEffect(() => {
    if (params.get('to') === 'wallet' && !toId) {
      const wallet = accounts.find((a) => a.kind === 'wallet')
      if (wallet) setToId(wallet.id)
    }
  }, [accounts, params, toId])

  const amount = parseAmount(rawAmount)
  const commission = useCommission('OWN_TRANSFER', from?.id, amount, quoteRefresh, to ? { destinationAccountId: to.id } : null)
  const amountErr = amountError(totalOf(commission, amount), from)
  const valid = !!from && !!to && from.id !== to.id && commission.status === 'ready' && !amountErr
  const submitting = payment.state.status === 'submitting'

  const chooseFrom = (a: Account) => {
    setFromId(a.id)
    if (toId === a.id) setToId(null)
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!valid || submitting || commission.status !== 'ready') return
    payment.submit({
      type: 'OWN_TRANSFER',
      sourceAccountId: from.id,
      destinationAccountId: to.id,
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
      <TransferLayout title="Перевод между своими счетами">
        <PaymentResult payment={payment.state.payment} to={to?.title ?? ''} onRetry={retry} />
      </TransferLayout>
    )
  }

  return (
    <TransferLayout title="Перевод между своими счетами">
      <form className="form" onSubmit={submit}>
        <Field label="Списать с">
          <AccountSelect accounts={accounts} value={from} onChange={chooseFrom} placeholder="Выберите источник списания" />
        </Field>
        <Field label="Зачислить на">
          <AccountSelect accounts={accounts.filter((a) => a.id !== from?.id && a.kind !== 'external')} value={to} onChange={(a) => setToId(a.id)} placeholder="Выберите источник зачисления" />
        </Field>
        <Field label="Сумма перевода" error={amountErr}>
          <AmountInput value={rawAmount} onChange={setRawAmount} />
        </Field>
        <Summary state={commission} />
        {payment.state.status === 'rejected' && <div className="form-error">{payment.state.message}</div>}
        <SubmitButton disabled={!valid || submitting}>{submitting ? 'Переводим…' : 'Перевести'}</SubmitButton>
      </form>
    </TransferLayout>
  )
}
