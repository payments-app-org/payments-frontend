import { CalendarClock, ChevronRight, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Icon from '../components/Icon'
import InfoBlock from '../components/InfoBlock'
import ProviderSearch from '../components/ProviderSearch'
import { paymentCategories, transferTypes } from '../data/mock'
import { fetchAutopayments, fetchTemplates, type Autopayment, type PaymentTemplate } from '../api'
import CreateNewModal from '../components/CreateNewModal'
import { SavedLogo, templatePayRoute } from './templates/common'

type Tab = 'payments' | 'transfers'

export default function PaymentsPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const tab: Tab = params.get('tab') === 'transfers' ? 'transfers' : 'payments'
  const setTab = (t: Tab) => setParams(t === 'payments' ? {} : { tab: t })
  const [templates, setTemplates] = useState<PaymentTemplate[] | null>(null)
  const [autopayments, setAutopayments] = useState<Autopayment[] | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchTemplates().then(setTemplates).catch(() => setTemplates([]))
    fetchAutopayments().then(setAutopayments).catch(() => setAutopayments([]))
  }, [])

  return (
    <>
      <h1>Платежи и переводы</h1>

      <div className="top-cards">
        <button type="button" className="panel bills bills-link" onClick={() => navigate('/bills')}>
          <h3>Счета на оплату</h3>
          <span className="small muted">ЖКХ, налоги, штрафы, интернет</span>
          <ChevronRight size={20} className="muted bills-chevron" />
        </button>
        <section className="panel templates">
          <div className="panel-head">
            <h3>Шаблоны и автоплатежи</h3>
            <button type="button" className="chip" onClick={() => navigate('/templates')}>Все</button>
          </div>
          <div className="template-list">
            {templates?.map((t) => (
              <button type="button" key={t.id} className="template" onClick={() => navigate(templatePayRoute(t))} title={t.name}>
                <SavedLogo provider={t.provider} big />
                <span className="small">{t.name}</span>
              </button>
            ))}
            {autopayments?.map((a) => (
              <button type="button" key={a.id} className="template" onClick={() => navigate(`/autopayments/${a.id}`)} title={a.name}>
                <span className="template-auto"><SavedLogo provider={a.provider} big /><span className="auto-badge"><CalendarClock size={12} /></span></span>
                <span className="small">{a.provider.name}</span>
              </button>
            ))}
            <button type="button" className="template template-create" onClick={() => setCreating(true)}>
              <span className="create-plus"><Plus size={22} /></span>
              <span className="small">Создать новый</span>
            </button>
          </div>
        </section>
      </div>

      <div className="tabs">
        <button className={tab === 'payments' ? 'tab active' : 'tab'} onClick={() => setTab('payments')}>Платежи</button>
        <button className={tab === 'transfers' ? 'tab active' : 'tab'} onClick={() => setTab('transfers')}>Переводы</button>
      </div>

      {tab === 'payments' && <ProviderSearch />}

      <div className="tiles">
        {(tab === 'payments' ? paymentCategories : transferTypes).map((item) => (
          <button key={item.id} className="tile" onClick={() => 'to' in item && navigate(item.to)}>
            <span className="round-icon"><Icon name={item.icon} /></span>
            <span>{item.title}</span>
          </button>
        ))}
      </div>

      <InfoBlock />
      {creating && <CreateNewModal onClose={() => setCreating(false)} />}
    </>
  )
}
