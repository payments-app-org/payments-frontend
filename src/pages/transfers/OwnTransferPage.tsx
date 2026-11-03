import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAccounts, useCommission, type Account } from '../../api'
import {
  AccountSelect, AmountInput, Field, SubmitButton, Success, Summary, TransferLayout, amountError, parseAmount, totalOf,
} from '../../components/transfer'

export default function OwnTransferPage() {
  const accounts = useAccounts().accounts ?? []
  const [from, setFrom] = useState<Account | null>(null)
  const [to, setTo] = useState<Account | null>(null)
  const [rawAmount, setRawAmount] = useState('')
  const [done, setDone] = useState(false)
  const [params] = useSearchParams()

  // «Пополнить» на странице кошелька открывает перевод с уже выбранным кошельком в «Зачислить на»
  useEffect(() => {
    if (params.get('to') === 'wallet' && !to) {
      const wallet = accounts.find((a) => a.kind === 'wallet')
      if (wallet) setTo(wallet)
    }
  }, [accounts, params, to])

  const amount = parseAmount(rawAmount)
  const commission = useCommission('OWN_TRANSFER', from?.id, amount, 0, to ? { destinationAccountId: to.id } : null)
  const amountErr = amountError(totalOf(commission, amount), from)
  const valid = !!from && !!to && from.id !== to.id && commission.status === 'ready' && !amountErr

  const chooseFrom = (a: Account) => {
    setFrom(a)
    if (to?.id === a.id) setTo(null)
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (valid) setDone(true)
  }

  return (
    <TransferLayout title="Перевод между своими счетами">
      {done ? <Success amount={amount} to={to!.title} /> : (
        <form className="form" onSubmit={submit}>
          <Field label="Списать с">
            <AccountSelect accounts={accounts} value={from} onChange={chooseFrom} placeholder="Выберите источник списания" />
          </Field>
          <Field label="Зачислить на">
            <AccountSelect accounts={accounts.filter((a) => a.id !== from?.id)} value={to} onChange={setTo} placeholder="Выберите источник зачисления" />
          </Field>
          <Field label="Сумма перевода" error={amountErr}>
            <AmountInput value={rawAmount} onChange={setRawAmount} />
          </Field>
          <Summary state={commission} />
          <SubmitButton disabled={!valid}>Перевести</SubmitButton>
        </form>
      )}
    </TransferLayout>
  )
}
