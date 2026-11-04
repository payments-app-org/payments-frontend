import { useEffect, useState } from 'react'
import { Pencil } from 'lucide-react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ApiError, defaultSource, fetchProvider, fetchTemplate, useAccounts, useCommission, usePaymentSubmit,
  type PaymentTemplate, type ProviderDetails,
} from '../../api'
import { needsTemplatePayPage, payFields } from '../../components/PayeeFields'
import ProviderLayout from '../../components/ProviderLayout'
import { AccountSelect, PaymentResult, Summary, amountError, totalOf } from '../../components/transfer'
import { formatRub } from '../../format'
import { OfferNote } from '../requisites/RequisitesLayout'
import { formatPhone } from '../payments/MobilePaymentPage'
import { SavedLogo } from './common'

// Оплата по шаблону, когда обычная форма поставщика сумму из шаблона не примет (госуслуги, ГИС ЖКХ):
// данные и сумма из шаблона, выбор счёта и «Оплатить». Остальных поставщиков отправляем в их форму.
export default function TemplatePayPage() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const [template, setTemplate] = useState<PaymentTemplate | null>(null)
  const [details, setDetails] = useState<ProviderDetails | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTemplate(id).then(async (t) => {
      setTemplate(t)
      setDetails(await fetchProvider(t.provider.code))
    }).catch((e) => setError(e instanceof ApiError ? e.message : 'Не удалось загрузить шаблон'))
  }, [id])

  if (!template || !details) {
    return <section className="panel transfer"><div className="transfer-body muted">{error ?? 'Загружаем…'}</div></section>
  }
  if (params.get('auto') && !needsTemplatePayPage(details)) {
    return <Navigate to={`/payments/bill/${template.provider.code}?template=${template.id}`} replace />
  }
  return (
    <ProviderLayout logo={<SavedLogo big provider={template.provider} />} title={template.provider.name} subtitle={template.name}
      back={['/', 'Платежи']}
      action={<Link to={`/templates/${template.id}/edit`} className="icon-btn soft" aria-label="Изменить шаблон" title="Изменить"><Pencil size={16} /></Link>}>
      <PayByTemplate template={template} details={details} />
    </ProviderLayout>
  )
}

function PayByTemplate({ template, details }: { template: PaymentTemplate; details: ProviderDetails }) {
  const { accounts } = useAccounts()
  const payment = usePaymentSubmit()
  const [fromId, setFromId] = useState<string | null>(template.sourceAccountId)
  const [quoteRefresh, setQuoteRefresh] = useState(0)
  const sources = accounts?.filter((a) => a.kind !== 'external') ?? []
  const from = sources.find((a) => a.id === fromId) ?? (sources.length ? defaultSource(sources) : null)
  const commission = useCommission('BILL', from?.id, template.amount, quoteRefresh, { providerCode: template.provider.code })
  const amountErr = amountError(totalOf(commission, template.amount), from, template.amount)
  const submitting = payment.state.status === 'submitting'
  const labels = Object.fromEntries(payFields(details).map((f) => [f.key, f]))

  useEffect(() => {
    if (payment.state.status === 'rejected' && payment.state.code?.startsWith('QUOTE')) setQuoteRefresh((n) => n + 1)
  }, [payment.state])

  if (payment.state.status === 'done') {
    return <PaymentResult what="Платёж" payment={payment.state.payment} to={`${template.provider.name} · ${template.name}`}
      back={['/', 'Вернуться к платежам']} onRetry={() => { payment.reset(); setQuoteRefresh((n) => n + 1) }} />
  }
  const pay = () => {
    if (!from || commission.status !== 'ready' || amountErr) return
    payment.submit({
      type: 'BILL', sourceAccountId: from.id, providerCode: template.provider.code, recipientFields: template.fields,
      amount: template.amount, quoteToken: commission.data.quoteToken,
    })
  }
  return (
    <div className="form">
      <div className="info-rows">
        {Object.entries(template.fields).map(([k, v]) => (
          <div key={k}>
            <span className="muted">{labels[k]?.label ?? k}</span>
            <b>{labels[k]?.type === 'PHONE' ? formatPhone(v) : labels[k]?.type === 'CHOICE' ? labels[k].options.find((o) => o.value === v)?.label ?? v : v}</b>
          </div>
        ))}
        <div><span className="muted">Сумма</span><b>{formatRub(template.amount)}</b></div>
      </div>
      <div className="group pay-method">
        <h3>Способ оплаты</h3>
        <AccountSelect accounts={sources} value={from} onChange={(a) => setFromId(a.id)} placeholder="Загружаем счета…" />
      </div>
      <Summary state={commission} />
      {amountErr && <div className="form-error">{amountErr}</div>}
      {payment.state.status === 'rejected' && <div className="form-error">{payment.state.message}</div>}
      <div className="pay-row">
        <OfferNote />
        <button type="button" className="btn-primary" onClick={pay} disabled={commission.status !== 'ready' || !!amountErr || submitting}>
          {submitting ? 'Оплачиваем…' : 'Оплатить'}
        </button>
      </div>
    </div>
  )
}
