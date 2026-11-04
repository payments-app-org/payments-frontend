import { useEffect, useState, type FormEvent } from 'react'
import { CircleHelp } from 'lucide-react'
import { defaultSource, maxPaymentAmount, useAccounts, useCommission, useOperationLimits, usePaymentSubmit } from '../../api'
import {
  AccountSelect, AmountHint, AmountInput, Field, PaymentResult, Summary, amountError, parseAmount, totalOf,
} from '../../components/transfer'
import RequisitesLayout, { OfferNote } from './RequisitesLayout'

// БИК нашего банка — тот же, что проверяет payment
const OUR_BIK = '044525999'

type FieldDef = { key: string; label: string; placeholder?: string; digits?: number; help?: string }

// Поля в порядке макетов. В «Счетах нашего банка» БИК фиксирован.
const FIELDS: FieldDef[] = [
  { key: 'account', label: 'Номер счёта получателя', placeholder: '20 цифр', digits: 20, help: 'Расчётный счёт организации, 20 цифр' },
  { key: 'bik', label: 'БИК банка получателя', placeholder: '9 цифр', digits: 9 },
  { key: 'inn', label: 'ИНН получателя', placeholder: '10 или 12 цифр для ИП', digits: 12 },
  { key: 'name', label: 'Название компании получателя' },
  { key: 'kpp', label: 'КПП получателя', placeholder: '9 символов, у ИП не указывается' },
  { key: 'purpose', label: 'Назначение платежа' },
  { key: 'payerInn', label: 'ИНН отправителя', placeholder: '12 цифр, необязательно', digits: 12 },
  { key: 'payerName', label: 'ФИО отправителя' },
]

// Оплата по счёту юрлицу: в другой банк (REQUISITES) или на счёт в нашем банке (REQUISITES_OUR).
// Полную проверку (ключ счёта, контрольные числа ИНН) делает payment.
export default function LegalPaymentPage({ ourBank }: { ourBank: boolean }) {
  const op = ourBank ? 'REQUISITES_OUR' : 'REQUISITES'
  const { accounts } = useAccounts()
  const limits = useOperationLimits()
  const payment = usePaymentSubmit()
  const [fromId, setFromId] = useState<string | null>(null)
  const [values, setValues] = useState<Record<string, string>>(ourBank ? { bik: OUR_BIK } : {})
  const [rawAmount, setRawAmount] = useState('')
  const [quoteRefresh, setQuoteRefresh] = useState(0)

  const sources = accounts?.filter((a) => a.kind !== 'external') ?? []
  const from = sources.find((a) => a.id === fromId) ?? (sources.length ? defaultSource(sources) : null)
  const amount = parseAmount(rawAmount)
  const commission = useCommission(op, from?.id, amount, quoteRefresh)
  const amountErr = amountError(totalOf(commission, amount), from, amount, maxPaymentAmount(limits, op, from))
  const isIp = (values.inn ?? '').replace(/\D/g, '').length === 12

  const fieldError = (f: FieldDef) => {
    const v = (values[f.key] ?? '').trim()
    if (!v) return null
    const d = v.replace(/\D/g, '')
    if (f.key === 'account' && d.length !== 20) return 'Нужно 20 цифр'
    if (f.key === 'bik' && !/^04\d{7}$/.test(d)) return '9 цифр, начинается с 04'
    if ((f.key === 'inn') && d.length !== 10 && d.length !== 12) return '10 цифр у организации, 12 — у ИП'
    if (f.key === 'payerInn' && d.length !== 12) return '12 цифр'
    if (f.key === 'kpp' && !/^\d{4}[\dA-Z]{2}\d{3}$/.test(v.toUpperCase())) return '9 символов'
    return null
  }
  const required = FIELDS.filter((f) => f.key !== 'payerInn' && !(f.key === 'kpp' && isIp))
  const filled = required.every((f) => (values[f.key] ?? '').trim()) && FIELDS.every((f) => !fieldError(f))
  const valid = !!from && filled && commission.status === 'ready' && !amountErr
  const submitting = payment.state.status === 'submitting'

  useEffect(() => {
    if (payment.state.status === 'rejected' && payment.state.code?.startsWith('QUOTE')) setQuoteRefresh((n) => n + 1)
  }, [payment.state])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!valid || submitting || commission.status !== 'ready' || !from) return
    payment.submit({ type: op, sourceAccountId: from.id, amount, quoteToken: commission.data.quoteToken, recipientFields: values })
  }

  const title = ourBank ? 'Оплата по счёту юр. лицу. Счета нашего банка' : 'Оплата по счёту юр. лицу (кроме бюджетных)'
  if (payment.state.status === 'done') {
    return (
      <RequisitesLayout title={title} subtitle="Переводы по свободным реквизитам">
        <PaymentResult payment={payment.state.payment} to={values.name ?? ''} onRetry={() => { payment.reset(); setQuoteRefresh((n) => n + 1) }}
          back={['/transfers/requisites', 'Вернуться к реквизитам']} />
      </RequisitesLayout>
    )
  }

  return (
    <RequisitesLayout title={title} subtitle="Переводы по свободным реквизитам">
      <form className="form" onSubmit={submit}>
        {FIELDS.filter((f) => !(f.key === 'kpp' && isIp)).map((f) => (
          <Field key={f.key} label={f.label} error={fieldError(f) ?? undefined}
            hint={ourBank && f.key === 'bik' ? 'БИК нашего банка — подставлен автоматически' : undefined}>
            <span className="input-with-icon">
              <input className="input" value={values[f.key] ?? ''} placeholder={f.placeholder ?? ''} readOnly={ourBank && f.key === 'bik'}
                inputMode={f.digits ? 'numeric' : 'text'} maxLength={f.key === 'purpose' ? 210 : f.key === 'kpp' ? 9 : undefined}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: f.digits ? e.target.value.replace(/\D/g, '').slice(0, f.digits) : e.target.value }))} />
              {f.help && <span className="input-icon" data-tooltip={f.help}><CircleHelp size={18} /></span>}
            </span>
          </Field>
        ))}
        <Field label="Сумма платежа" error={amountErr} hint={<AmountHint operationType={op} account={from} />}>
          <AmountInput value={rawAmount} onChange={setRawAmount} placeholder="" />
        </Field>
        <div className="group">
          <h3>Способ оплаты</h3>
          <AccountSelect accounts={sources} value={from} onChange={(a) => setFromId(a.id)} placeholder="Загружаем счета…" />
        </div>
        <Summary state={commission} />
        {payment.state.status === 'rejected' && <div className="form-error">{payment.state.message}</div>}
        <div className="pay-row">
          <OfferNote />
          <button type="submit" className="btn-primary" disabled={!valid || submitting}>{submitting ? 'Оплачиваем…' : 'Оплатить'}</button>
        </div>
      </form>
    </RequisitesLayout>
  )
}
