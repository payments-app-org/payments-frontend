import { ChevronRight } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Icon from '../components/Icon'
import InfoBlock from '../components/InfoBlock'
import ProviderSearch from '../components/ProviderSearch'
import { paymentCategories, templates, transferTypes } from '../data/mock'

type Tab = 'payments' | 'transfers'

export default function PaymentsPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const tab: Tab = params.get('tab') === 'transfers' ? 'transfers' : 'payments'
  const setTab = (t: Tab) => setParams(t === 'payments' ? {} : { tab: t })

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
            <h3>Шаблоны</h3>
            <button className="chip">Все</button>
          </div>
          <div className="template-list">
            {templates.map((t) => (
              <div key={t.id} className="template" role="button" onClick={() => navigate(t.to)}>
                <span className="avatar big" style={{ background: t.color }}>{t.name[0]}</span>
                <span className="small">{t.name}</span>
              </div>
            ))}
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
    </>
  )
}
