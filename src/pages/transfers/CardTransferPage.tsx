import { useState, type FormEvent } from 'react'
import { defaultSource, useAccounts, useCommission } from '../../api'
import {
  AccountSelect, AmountInput, Field, SubmitButton, Success, Summary, TransferLayout, amountError, parseAmount, totalOf,
} from '../../components/transfer'

function formatCard(raw: string) {
  return raw.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ')
}

// Алгоритм Луна — контрольная сумма номера карты
function luhn(digits: string) {
  let sum = 0
  for (let i = 0; i < digits.length; i++) {
    let n = Number(digits[digits.length - 1 - i])
    if (i % 2 === 1) n = n * 2 > 9 ? n * 2 - 9 : n * 2
    sum += n
  }
  return sum % 10 === 0
}

export default function CardTransferPage() {
  const { accounts } = useAccounts()
  const [fromId, setFromId] = useState<string | null>(null)
  const [cardNumber, setCardNumber] = useState('')
  const [rawAmount, setRawAmount] = useState('')
  const [done, setDone] = useState(false)

  const digits = cardNumber.replace(/\D/g, '')
  const cardErr = digits.length === 16 && !luhn(digits) ? 'Проверьте номер карты' : undefined
  const from = accounts?.find((a) => a.id === fromId) ?? defaultSource(accounts)
  const amount = parseAmount(rawAmount)
  const commission = useCommission('CARD_TRANSFER', amount)
  const amountErr = amountError(totalOf(commission, amount), from)
  const valid = !!from && digits.length === 16 && !cardErr && commission.status === 'ready' && !amountErr

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (valid) setDone(true)
  }

  return (
    <TransferLayout title="Перевод по номеру карты">
      {done ? <Success amount={amount} to={`карта ·· ${digits.slice(-4)}`} /> : (
        <form className="form" onSubmit={submit}>
          <div className="group">
            <h3>Списать с</h3>
            <AccountSelect accounts={accounts ?? []} value={from} onChange={(a) => setFromId(a.id)} placeholder="Загружаем счета…" />
          </div>
          <div className="group">
            <h3>Карта получателя</h3>
            <Field label="Номер карты" error={cardErr}>
              <input className="input" inputMode="numeric" placeholder="1234 4567 8901 2345" value={cardNumber} onChange={(e) => setCardNumber(formatCard(e.target.value))} />
            </Field>
          </div>
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
