import { useEffect, useState } from 'react'
import { ChevronLeft, Pencil, Plus } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchAutopayments, fetchTemplates, type Autopayment, type PaymentTemplate } from '../../api'
import CreateNewModal from '../../components/CreateNewModal'
import { formatRub } from '../../format'
import { SavedLogo, autopaymentSubtitle, scheduleText, templatePayRoute } from './common'

// «Шаблоны и автоплатежи»: всё, что создал пользователь, и большая кнопка «Создать новый»
export default function TemplatesPage() {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState<PaymentTemplate[] | null>(null)
  const [autopayments, setAutopayments] = useState<Autopayment[] | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchTemplates().then(setTemplates).catch(() => setTemplates([]))
    fetchAutopayments().then(setAutopayments).catch(() => setAutopayments([]))
  }, [])

  return (
    <>
      <Link to="/" className="back"><ChevronLeft size={18} /> Платежи и переводы</Link>
      <h1>Шаблоны и автоплатежи</h1>
      <button type="button" className="create-big" onClick={() => setCreating(true)}>
        <span className="create-plus"><Plus size={26} /></span>
        <span><b>Создать новый</b><span className="muted small">Шаблон платежа или автоплатёж</span></span>
      </button>

      <section className="panel saved-section">
        <h2>Шаблоны</h2>
        {templates === null && <div className="muted">Загружаем…</div>}
        {templates?.length === 0 && <div className="muted">Шаблонов пока нет</div>}
        {templates?.map((t) => (
          <div key={t.id} className="saved-row">
            <button type="button" className="saved-main" onClick={() => navigate(templatePayRoute(t))}>
              <SavedLogo provider={t.provider} />
              <span className="bill-row-main"><b>{t.name}</b><span className="muted">{t.provider.name}{t.target ? ` · ${t.target}` : ''}</span></span>
              <span className="saved-amount">{formatRub(t.amount)}</span>
            </button>
            <Link to={`/templates/${t.id}/edit`} className="icon-btn soft" aria-label="Изменить шаблон" title="Изменить"><Pencil size={16} /></Link>
          </div>
        ))}
      </section>

      <section className="panel saved-section">
        <h2>Автоплатежи</h2>
        {autopayments === null && <div className="muted">Загружаем…</div>}
        {autopayments?.length === 0 && <div className="muted">Автоплатежей пока нет</div>}
        {autopayments?.map((a) => (
          <button type="button" key={a.id} className="saved-row saved-main" onClick={() => navigate(`/autopayments/${a.id}`)}>
            <SavedLogo provider={a.provider} />
            <span className="bill-row-main">
              <b>{a.name}</b>
              <span className="muted">{scheduleText(a)} · {autopaymentSubtitle(a)}</span>
            </span>
            <span className={a.status === 'PAUSED' ? 'saved-amount muted' : 'saved-amount'}>{formatRub(a.amount)}</span>
          </button>
        ))}
      </section>
      {creating && <CreateNewModal onClose={() => setCreating(false)} />}
    </>
  )
}
