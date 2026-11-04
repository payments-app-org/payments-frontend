import { useState, type FormEvent } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { defaultSource, useAccounts } from '../../api'
import ProviderLayout from '../../components/ProviderLayout'
import ProviderLogo from '../../components/ProviderLogo'
import { AccountSelect, AmountHint, AmountInput, Field, Summary, amountError, parseAmount } from '../../components/transfer'
import { loanBanks } from '../../data/loanBanks'
import { OfferNote } from '../requisites/RequisitesLayout'

// Погашение кредита в другом банке. Только интерфейс: данные платежа будут уходить в команду кредитования,
// интеграции с ней пока нет — поэтому «Оплатить» лишь проверяет поля.
export default function LoanPaymentPage() {
  const { code } = useParams()
  const bank = loanBanks.find((b) => b.code === code)
  const { accounts } = useAccounts()
  const [number, setNumber] = useState('')
  const [lastName, setLastName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [rawAmount, setRawAmount] = useState('')
  const [fromId, setFromId] = useState<string | null>(null)
  const [notice, setNotice] = useState(false)

  if (!bank) return <Navigate to="/payments/loans" replace />

  const byCard = bank.by === 'card'
  const sources = accounts?.filter((a) => a.kind !== 'external') ?? []
  const from = sources.find((a) => a.id === fromId) ?? (sources.length ? defaultSource(sources) : null)
  const amount = parseAmount(rawAmount)
  const amountErr = amountError(amount, from, amount)
  const numberOk = byCard ? number.length >= 16 && number.length <= 19 : number.length === 20
  const valid = numberOk && !!lastName.trim() && !!firstName.trim() && amount > 0 && !amountErr && !!from

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (valid) setNotice(true)
  }

  return (
    <ProviderLayout logo={<ProviderLogo big name={bank.name} domain={bank.domain} color={bank.color} />}
      title={`Погасить кредит ${bank.name}`} subtitle={bank.legalName} back={['/payments/loans', 'Погашение кредитов']}>
      <form className="form" onSubmit={submit}>
        <Field label={byCard ? 'Номер карты получателя' : 'Номер счета получателя'}>
          <input className="input" inputMode="numeric" placeholder={byCard ? '16–19 цифр' : '20 цифр'} value={number}
            onChange={(e) => setNumber(e.target.value.replace(/\D/g, '').slice(0, byCard ? 19 : 20))} />
        </Field>
        <Field label="Фамилия владельца счета">
          <input className="input" placeholder="Владелец счета" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </Field>
        <Field label="Имя владельца счета">
          <input className="input" placeholder="Владелец счета" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </Field>
        <Field label="Отчество владельца счета">
          <input className="input" placeholder="Владелец счета" value={middleName} onChange={(e) => setMiddleName(e.target.value)} />
        </Field>
        <Field label="Сумма платежа" error={amountErr} hint={<AmountHint operationType="LOAN_PAYMENT" account={from} />}>
          <AmountInput value={rawAmount} onChange={setRawAmount} placeholder="₽" />
        </Field>
        <div className="group pay-method">
          <h3>Способ оплаты</h3>
          <AccountSelect accounts={sources} value={from} onChange={(a) => setFromId(a.id)} placeholder="Загружаем счета…" />
        </div>
        <Summary state={{ status: 'idle' }} />
        {notice && <div className="form-note">Погашение кредитов пока не подключено: платёж будет передаваться в команду кредитования.</div>}
        <div className="pay-row">
          <OfferNote />
          <button type="submit" className="btn-primary" disabled={!valid}>Оплатить</button>
        </div>
      </form>
    </ProviderLayout>
  )
}
