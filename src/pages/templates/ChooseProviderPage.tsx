import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchProviders, type Provider } from '../../api'
import Icon from '../../components/Icon'
import ProviderLogo from '../../components/ProviderLogo'
import RegionSelect from '../../components/RegionSelect'
import { useRegion } from '../../region'
import { TEMPLATE_GROUPS } from './common'

// «Шаблон платежа» / «Новый автоплатёж»: категория → поставщик (с поиском по всем поставщикам и фильтром региона)
export default function ChooseProviderPage({ mode }: { mode: 'template' | 'autopayment' }) {
  const navigate = useNavigate()
  const { code: region } = useRegion()
  const [q, setQ] = useState('')
  const [group, setGroup] = useState<(typeof TEMPLATE_GROUPS)[number] | null>(null)
  const [providers, setProviders] = useState<Provider[] | null>(null)
  const query = q.trim()
  const allowed = new Set<string>(TEMPLATE_GROUPS.map((g) => g.group))

  useEffect(() => {
    if (!group && query.length < 2) { setProviders(null); return }
    const ctrl = new AbortController()
    const t = setTimeout(() => {
      fetchProviders(group && query.length < 2 ? { group: group.group, region } : { q: query, region, group: group?.group }, ctrl.signal)
        .then((list) => setProviders(list.filter((p) => allowed.has(p.groupCode)))).catch(() => {})
    }, query ? 250 : 0)
    return () => { clearTimeout(t); ctrl.abort() }
  }, [group, query, region])

  const choose = (p: Provider) => navigate(`${mode === 'template' ? '/templates/new' : '/autopayments/new'}/${p.code}`)
  const title = mode === 'template' ? 'Шаблон платежа' : 'Новый автоплатёж'

  return (
    <>
      {group
        ? <button type="button" className="back" onClick={() => { setGroup(null); setQ('') }}><ChevronLeft size={18} /> {title}</button>
        : <Link to="/templates" className="back"><ChevronLeft size={18} /> Шаблоны и автоплатежи</Link>}
      <h1>{group ? group.title : title}</h1>
      <RegionSelect />
      <label className="search">
        <input placeholder={group ? 'Поиск поставщика' : 'Поиск'} value={q} onChange={(e) => setQ(e.target.value)} />
        <Search size={20} />
      </label>
      <section className="panel choose-panel">
        {!group && query.length < 2 && TEMPLATE_GROUPS.map((g) => (
          <button type="button" key={g.group} className="choose-row" onClick={() => setGroup(g)}>
            <span className="round-icon"><Icon name={g.icon} /></span>
            <span className="choose-title">{g.title}</span>
            <ChevronRight size={20} className="muted" />
          </button>
        ))}
        {providers === null && (group || query.length >= 2) && <div className="muted">Загружаем…</div>}
        {providers?.length === 0 && <div className="muted">Ничего не нашли</div>}
        {providers?.map((p) => (
          <button type="button" key={p.code} className="choose-row" onClick={() => choose(p)}>
            <ProviderLogo name={p.name} domain={p.domain} color={p.color} country={p.countryCode} />
            <span className="choose-title">{p.name}</span>
            <ChevronRight size={20} className="muted" />
          </button>
        ))}
      </section>
    </>
  )
}
