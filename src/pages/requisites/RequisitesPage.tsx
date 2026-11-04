import { useState } from 'react'
import { FileText, Landmark, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import InfoBlock from '../../components/InfoBlock'
import RegionSelect from '../../components/RegionSelect'

const OPTIONS = [
  { to: '/transfers/requisites/uin', title: 'Оплата по УИН', icon: 'gov' },
  { to: '/transfers/requisites/legal', title: 'Оплата по счёту юр. лицу (кроме бюджетных)', icon: 'doc' },
  { to: '/transfers/requisites/legal-our', title: 'Оплата по счёту юр. лицу. Счета нашего банка', icon: 'doc' },
]

// «Свободные реквизиты»: госуслуги по УИН и платежи юрлицам по реквизитам
export default function RequisitesPage() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const list = OPTIONS.filter((o) => o.title.toLowerCase().includes(q.trim().toLowerCase()))
  return (
    <>
      <h1>Свободные реквизиты</h1>
      <RegionSelect />
      <label className="search">
        <input placeholder="Например, ЖКХ Москвы" value={q} onChange={(e) => setQ(e.target.value)} />
        <Search size={20} />
      </label>
      <div className="tiles">
        {list.map((o) => (
          <button type="button" key={o.to} className="tile tile-small" onClick={() => navigate(o.to)}>
            <span className={o.icon === 'gov' ? 'gov-logo' : 'doc-logo'}>{o.icon === 'gov' ? <Landmark size={22} /> : <FileText size={22} />}</span>
            <span>{o.title}</span>
          </button>
        ))}
      </div>
      <InfoBlock />
    </>
  )
}
