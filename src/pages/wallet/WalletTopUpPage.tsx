import { useState, type FormEvent } from 'react'
import { Wallet } from 'lucide-react'
import { ApiError, fetchCommission, useAccounts, usePaymentSubmit, useProfile, type Account } from '../../api'
import AccountPicker, { FixedAccount } from '../../components/AccountPicker'
import Breadcrumbs from '../../components/Breadcrumbs'
import { PaymentResult, parseAmount } from '../../components/transfer'
import { formatPhone } from './WalletPage'

// Пополнение «Моего кошелька» со своей карты, без комиссии. С карты нашего банка — сразу в account,
// с привязанной карты другого банка — через процессинг (это решает payment).
export default function WalletTopUpPage() {
  const { accounts } = useAccounts()
  const profile = useProfile()
  const payment = usePaymentSubmit()
  const [sourceId, setSourceId] = useState<string | null>(null)
  const [rawAmount, setRawAmount] = useState('')
  const [quoteError, setQuoteError] = useState<string | null>(null)

  const wallet = accounts?.find((a) => a.kind === 'wallet') ?? null
  // Кредитной картой кошелёк не пополнить (электронные деньги нельзя получить в кредит)
  const sources = accounts?.filter((a) => a.kind !== 'wallet' && !a.credit) ?? []
  const source = sources.find((a) => a.id === sourceId) ?? null
  const amount = parseAmount(rawAmount)
  const tooMuch = !!source && source.balance !== null && amount > source.balance
  const valid = !!source && !!wallet && amount > 0 && !tooMuch
  const submitting = payment.state.status === 'submitting'

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!valid || submitting || !source || !wallet) return
    setQuoteError(null)
    try {
      // Котировка всё равно нужна payment, хоть комиссия и нулевая
      const quote = await fetchCommission('OWN_TRANSFER', source.id, amount, { destinationAccountId: wallet.id }, new AbortController().signal)
      payment.submit({ type: 'OWN_TRANSFER', sourceAccountId: source.id, destinationAccountId: wallet.id, amount, quoteToken: quote.quoteToken })
    } catch (err) {
      setQuoteError(err instanceof ApiError ? err.message : 'Не удалось выполнить пополнение, попробуйте ещё раз')
    }
  }

  return (
    <>
      <Breadcrumbs items={[['Главная', '/'], ['Мой кошелёк', '/wallet'], ['Пополнить']]} />
      <section className="panel wallet-form">
        <div className="wallet-form-head">
          <span className="acc-tile wallet big"><Wallet size={34} /></span>
          <h1>Пополнить кошелёк</h1>
        </div>
        {payment.state.status === 'done' ? (
          <div className="wallet-form-body">
            <PaymentResult payment={payment.state.payment} to="Мой кошелёк" onRetry={payment.reset} back={['/wallet', 'Вернуться в кошелёк']} />
          </div>
        ) : (
          <form className="wallet-form-body" onSubmit={submit}>
            <AccountPicker title="Откуда списать" accounts={sources} value={source} onChange={(a: Account) => setSourceId(a.id)} />
            <FixedAccount prefix="на" account={wallet} phone={profile ? formatPhone(profile.phone) : null} />
            <AmountField value={rawAmount} onChange={setRawAmount} error={tooMuch ? 'Недостаточно средств на карте' : undefined} />
            {(quoteError || payment.state.status === 'rejected') && (
              <div className="form-error">{quoteError ?? (payment.state.status === 'rejected' ? payment.state.message : '')}</div>
            )}
            <button type="submit" className="btn-big" disabled={!valid || submitting}>{submitting ? 'Пополняем…' : 'Пополнить'}</button>
          </form>
        )}
      </section>
    </>
  )
}

// Поле суммы с плавающей подписью «Сумма»
export function AmountField({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <label className={error ? 'float-field invalid' : 'float-field'}>
      <span className={value ? 'float-label up' : 'float-label'}>Сумма</span>
      <span className="float-value">
        <input inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ''))} />
        {value && <span>₽</span>}
      </span>
      {error && <span className="field-error">{error}</span>}
    </label>
  )
}
