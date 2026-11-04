import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { useRegion } from '../region'

// «Регион: Москва и Московская область ▾» — фильтр поставщиков по региону
export default function RegionSelect() {
  const { code, current, regions, change } = useRegion()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div className="region-select" ref={ref}>
      <button type="button" className="region-link" onClick={() => setOpen(!open)}>
        Регион: {current?.name ?? 'Москва и Московская область'} <ChevronDown size={16} />
      </button>
      {open && (
        <div className="select-menu region-menu">
          {regions.map((r) => (
            <button type="button" key={r.code} className={r.code === code ? 'select-option active' : 'select-option'}
              onClick={() => { change(r.code); setOpen(false) }}>
              <span className="select-title">{r.name}</span>
              {r.code === code && <Check size={18} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
