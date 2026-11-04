import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ApiError, defaultSource, deleteTemplate, fetchProvider, fetchTemplate, fetchTemplates, saveTemplate, useAccounts,
  useCommission, type PaymentTemplate, type ProviderDetails,
} from '../../api'
import { PayeeFieldInputs, invoiceOnly, usePayee } from '../../components/PayeeFields'
import ProviderLayout from '../../components/ProviderLayout'
import ProviderLogo from '../../components/ProviderLogo'
import { AccountSelect, AmountInput, Field, Summary, amountError, parseAmount, totalOf } from '../../components/transfer'

const NAME_MAX = 40

// Шаблон платежа: создание (/templates/new/:code) и редактирование (/templates/:id/edit).
// Название, счёт списания, данные поставщика и сумма — всё, что потом подставится в форму оплаты.
export default function TemplateFormPage() {
  const { code, id } = useParams()
  const [details, setDetails] = useState<ProviderDetails | null>(null)
  const [template, setTemplate] = useState<PaymentTemplate | null>(null)
  const [defaultName, setDefaultName] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        if (id) {
          const t = await fetchTemplate(id)
          setTemplate(t)
          setDetails(await fetchProvider(t.provider.code))
        } else if (code) {
          const [d, list] = await Promise.all([fetchProvider(code), fetchTemplates()])
          setDefaultName(`${d.provider.name} - ${list.filter((t) => t.provider.code === code).length + 1}`.slice(0, NAME_MAX))
          setDetails(d)
        }
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'Не удалось загрузить')
      }
    }
    load()
  }, [code, id])

  if (!details) {
    return <section className="panel transfer"><div className="transfer-body muted">{error ?? 'Загружаем…'}</div></section>
  }
  const p = details.provider
  return (
    <ProviderLayout logo={<ProviderLogo big name={p.name} domain={p.domain} color={p.color} country={p.countryCode} />}
      title={id ? 'Редактирование шаблона' : 'Новый шаблон'} subtitle={p.name}
      back={id ? ['/templates', 'Шаблоны и автоплатежи'] : ['/templates/new', 'Шаблон платежа']}>
      {invoiceOnly(details)
        ? <p className="bills-paid">Этот поставщик выставляет счета — сумма каждый раз своя. Добавьте его в <Link to="/bills">«Счета на оплату»</Link>.</p>
        : <TemplateForm details={details} template={template} defaultName={defaultName} />}
    </ProviderLayout>
  )
}

function TemplateForm({ details, template, defaultName }: { details: ProviderDetails; template: PaymentTemplate | null; defaultName: string }) {
  const navigate = useNavigate()
  const { accounts } = useAccounts()
  const payee = usePayee(details, template?.fields)
  const [name, setName] = useState(template?.name ?? defaultName)
  const [rawAmount, setRawAmount] = useState(template ? String(template.amount) : '')
  const [fromId, setFromId] = useState<string | null>(template?.sourceAccountId ?? null)
  const [tried, setTried] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sources = accounts?.filter((a) => a.kind !== 'external') ?? []
  const from = sources.find((a) => a.id === fromId) ?? (sources.length ? defaultSource(sources) : null)
  const amount = payee.nominalField ? payee.nominal?.price ?? 0 : parseAmount(rawAmount)
  const commission = useCommission('BILL', from?.id, amount, 0, { providerCode: details.provider.code })
  const amountErr = amount <= 0 && tried ? 'Укажите сумму' : amountError(totalOf(commission, amount), from, amount)
  const valid = !!name.trim() && payee.valid && amount > 0 && !!from

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setTried(true)
    if (!valid || saving || !from) return
    setSaving(true)
    setError(null)
    try {
      await saveTemplate(template?.id ?? null, {
        name: name.trim(), providerCode: details.provider.code, fields: payee.output(), amount, sourceAccountId: from.id,
      })
      navigate('/')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось сохранить шаблон')
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!template || saving) return
    setSaving(true)
    try {
      await deleteTemplate(template.id)
      navigate('/templates', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось удалить шаблон')
      setSaving(false)
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <Field label="Название шаблона" error={tried && !name.trim() ? 'Обязательное поле' : undefined} hint={`${name.length}/${NAME_MAX}`}>
        <input className="input" value={name} maxLength={NAME_MAX} onChange={(e) => setName(e.target.value)} />
      </Field>
      <div className="group pay-method">
        <h3>Откуда списать</h3>
        <AccountSelect accounts={sources} value={from} onChange={(a) => setFromId(a.id)} placeholder="Загружаем счета…" />
      </div>
      <PayeeFieldInputs payee={payee} details={details} show={() => tried} />
      {!payee.nominalField && (
        <Field label="Сумма платежа" error={amountErr}>
          <AmountInput value={rawAmount} onChange={setRawAmount} placeholder="₽" />
        </Field>
      )}
      <Summary state={commission} />
      {error && <div className="form-error">{error}</div>}
      <div className="pay-row">
        {template ? <button type="button" className="btn-secondary" onClick={remove} disabled={saving}>Удалить</button> : <span />}
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Сохраняем…' : 'Сохранить'}</button>
      </div>
    </form>
  )
}
