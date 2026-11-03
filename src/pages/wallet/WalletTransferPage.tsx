import { useState, type FormEvent } from 'react'
import { ArrowLeftRight } from 'lucide-react'
import { useAccounts, useCommission, usePaymentSubmit, useProfile, type Account } from '../../api'
import AccountPicker, { FixedAccount, accountName } from '../../components/AccountPicker'
import Breadcrumbs from '../../components/Breadcrumbs'
import { PaymentResult, Summary, amountError, parseAmount, totalOf } from '../../components/transfer'
import { formatPhone } from './WalletPage'
import { AmountField } from './WalletTopUpPage'

// «Между своими» с «Моего кошелька»: на свою карту нашего банка (сразу в account)
// или на свою привязанную карту другого банка (через процессинг)
export default function WalletTransferPage() {
  const { accounts } = useAccounts()
  const profile = useProfile()
  const payment = usePaymentSubmit()
  const [targetId, setTargetId] = useState<string | null>(null)
  const [rawAmount, setRawAmount] = useState('')
  const [quoteRefresh, setQuoteRefresh] = useState(0)

  const wallet = accounts?.find((a) => a.kind === 'wallet') ?? null
  const targets = accounts?.filter((a) => a.kind !== 'wallet') ?? []
  const target = targets.find((a) => a.id === targetId) ?? null
  const amount = parseAmount(rawAmount)
  const commission = useCommission('OWN_TRANSFER', wallet?.id, amount, quoteRefresh, target ? { destinationAccountId: target.id } : null)
  const amountErr = amountError(totalOf(commission, amount), wallet)
  const valid = !!wallet && !!target && commission.status === 'ready' && !amountErr
  const submitting = payment.state.status === 'submitting'

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!valid || submitting || !wallet || !target || commission.status !== 'ready') return
    payment.submit({ type: 'OWN_TRANSFER', sourceAccountId: wallet.id, destinationAccountId: target.id, amount, quoteToken: commission.data.quoteToken })
  }

  const retry = () => {
    payment.reset()
    setQuoteRefresh((n) => n + 1)
  }

  return (
    <>
      <Breadcrumbs items={[['Главная', '/'], ['Мой кошелёк', '/wallet'], ['Между своими']]} />
      <section className="panel wallet-form">
        <div className="wallet-form-head">
          <span className="acc-tile empty big"><ArrowLeftRight size={30} /></span>
          <h1>Между своими</h1>
        </div>
        {payment.state.status === 'done' ? (
          <div className="wallet-form-body">
            <PaymentResult payment={payment.state.payment} to={target ? accountName(target) : ''} onRetry={retry} back={['/wallet', 'Вернуться в кошелёк']} />
          </div>
        ) : (
          <form className="wallet-form-body" onSubmit={submit}>
            <FixedAccount prefix="с" account={wallet} phone={profile ? formatPhone(profile.phone) : null} />
            <AccountPicker title="Куда перевести" accounts={targets} value={target} onChange={(a: Account) => setTargetId(a.id)} />
            <AmountField value={rawAmount} onChange={setRawAmount} error={amountErr} />
            {amount > 0 && target && <Summary state={commission} />}
            {payment.state.status === 'rejected' && <div className="form-error">{payment.state.message}</div>}
            <button type="submit" className="btn-big" disabled={!valid || submitting}>{submitting ? 'Переводим…' : 'Перевести'}</button>
          </form>
        )}
      </section>
    </>
  )
}
