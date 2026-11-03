import { useState, type FormEvent } from 'react'
import { defaultSource, useAccounts, useCommission } from '../../api'
import {
  AccountSelect, AmountInput, Field, SubmitButton, Success, Summary, TransferLayout, amountError, parseAmount, totalOf,
} from '../../components/transfer'
import { banks } from '../../data/mock'

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
  const [bank, setBank] = useState('')
  const [message, setMessage] = useState('')
  const [rawAmount, setRawAmount] = useState('')
  const [done, setDone] = useState(false)

  const from = accounts?.find((a) => a.id === fromId) ?? defaultSource(accounts)
  const amount = parseAmount(rawAmount)
  const commission = useCommission('PHONE_TRANSFER', amount)
  const amountErr = amountError(totalOf(commission, amount), from)
  const valid = !!from && phone.replace(/\D/g, '').length === 11 && bank.trim() !== ''
    && commission.status === 'ready' && !amountErr

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (valid) setDone(true)
  }

  return (
    <TransferLayout title="По номеру телефона">
      {done ? <Success amount={amount} to={`${phone}, ${bank}`} /> : (
        <form className="form" onSubmit={submit}>
          <Field label="Списать с">
            <AccountSelect accounts={accounts ?? []} value={from} onChange={(a) => setFromId(a.id)} placeholder="Загружаем счета…" />
          </Field>
          <Field label="Номер телефона">
            <input className="input" inputMode="tel" placeholder="+7 000 000 00 00" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} />
          </Field>
          <Field label="Банк получателя">
            <input className="input" list="banks" placeholder="Введите название банка" value={bank} onChange={(e) => setBank(e.target.value)} />
            <datalist id="banks">{banks.map((b) => <option key={b} value={b} />)}</datalist>
          </Field>
          <Field label="Сообщение получателю" hint={`${message.length}/${MESSAGE_MAX}`}>
            <input className="input" placeholder="Введите сообщение" maxLength={MESSAGE_MAX} value={message} onChange={(e) => setMessage(e.target.value)} />
          </Field>
          <Field label="Сумма перевода" error={amountErr}>
            <AmountInput value={rawAmount} onChange={setRawAmount} placeholder="Введите сумму" />
          </Field>
          <Summary state={commission} />
          <SubmitButton disabled={!valid}>Продолжить</SubmitButton>
        </form>
      )}
    </TransferLayout>
  )
}
