import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Search, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { fetchProviders, type Provider } from '../api'
import { loanBanks } from '../data/loanBanks'
import ProviderLogo from './ProviderLogo'
import { useRegion } from '../region'

type Hit = { key: string; name: string; domain: string | null; color: string; country?: string | null; to: string }

// Куда ведёт поставщик: связь и госуслуги — свои формы, остальные — универсальная форма по полям поставщика
export function providerRoute(p: Provider) {
  if (p.groupCode === 'MOBILE') return `/payments/mobile/${p.code}`
  if (p.groupCode === 'GOV') return `/payments/gov/${p.code}`
  return `/payments/bill/${p.code}`
}

// Поиск по всем поставщикам (biller) и банкам погашения кредитов, выпадающий список с логотипами
export default function ProviderSearch() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<Hit[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const query = q.trim()
  const { code: region } = useRegion()

  useEffect(() => {
    if (query.length < 2) {
      setHits([])
      return
    }
    const ctrl = new AbortController()
    const t = setTimeout(() => {
      const loans: Hit[] = loanBanks
        .filter((b) => b.name.toLowerCase().includes(query.toLowerCase()))
        .map((b) => ({ key: `loan-${b.code}`, name: b.name, domain: b.domain, color: b.color, to: `/payments/loans/${b.code}` }))
      fetchProviders({ q: query, region }, ctrl.signal)
        .then((list) => setHits([...list.map((p) => ({ key: p.code, name: p.name, domain: p.domain, color: p.color, country: p.countryCode, to: providerRoute(p) })), ...loans]))
        .catch((e) => { if (e.name !== 'AbortError') setHits(loans) })
      setActive(0)
    }, 250)
    return () => { clearTimeout(t); ctrl.abort() }
  }, [query, region])

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, hits.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && hits[active]) navigate(hits[active].to)
    if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div className="provider-search" ref={ref}>
      <label className={open && query ? 'search focused' : 'search'}>
        <input placeholder="Например, ЖКХ Москвы" value={q} onKeyDown={onKeyDown} onFocus={() => setOpen(true)}
          onChange={(e) => { setQ(e.target.value); setOpen(true) }} />
        {q && <button type="button" className="search-clear" onClick={() => setQ('')} aria-label="Очистить"><X size={20} /></button>}
        <Search size={20} />
      </label>
      {open && query.length >= 2 && (
        <div className="select-menu search-menu">
          {hits.length === 0 && <div className="select-empty muted">Ничего не нашли</div>}
          {hits.map((h, i) => (
            <button type="button" key={h.key} className={i === active ? 'select-option active' : 'select-option'}
              onMouseEnter={() => setActive(i)} onClick={() => navigate(h.to)}>
              <ProviderLogo name={h.name} domain={h.domain} color={h.color} country={h.country} />
              <span>{h.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
