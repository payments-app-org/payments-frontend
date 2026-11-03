import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ChevronDown } from 'lucide-react'
import { bankLogoUrl, banks, type Bank } from '../data/banks'

function BankLogo({ bank }: { bank: Bank }) {
  const [broken, setBroken] = useState(false)
  const src = bankLogoUrl(bank)
  if (broken || !src) {
    return <span className="bank-logo fallback" style={{ background: bank.color }}>{bank.name[0]}</span>
  }
  // Если у сайта нет иконки, сервис отдаёт стандартный глобус 16×16 — тогда тоже показываем букву
  return (
    <img className="bank-logo" src={src} alt="" onError={() => setBroken(true)}
      onLoad={(e) => { if (e.currentTarget.naturalWidth < 32) setBroken(true) }} />
  )
}

// Выбор банка только из списка: печатаем «т» — остаются банки, где есть «т», кликаем — банк выбран.
// Набранный текст сам по себе банк не выбирает, выбор меняется только кликом или Enter.
export default function BankSelect({ value, onChange }: { value: Bank | null; onChange: (b: Bank) => void }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const q = query.trim().toLowerCase()
  // Сначала банки, чьё название начинается с запроса, потом — где он встречается внутри
  const options = q
    ? [...banks.filter((b) => b.name.toLowerCase().startsWith(q)),
       ...banks.filter((b) => !b.name.toLowerCase().startsWith(q) && b.name.toLowerCase().includes(q))]
    : banks

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) {
        setQuery('')
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  useEffect(() => setActive(0), [query])

  const choose = (bank: Bank) => {
    onChange(bank)
    setQuery('')
    setOpen(false)
    inputRef.current?.blur()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((i) => Math.min(i + 1, options.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && open) {
      e.preventDefault()
      if (options[active]) choose(options[active])
    } else if (e.key === 'Escape') {
      setQuery('')
      setOpen(false)
    }
  }

  return (
    <div className="select bank-select" ref={ref}>
      <div className={open ? 'input select-btn focused' : 'input select-btn'} onClick={() => { setOpen(true); inputRef.current?.focus() }}>
        {value && !query && <BankLogo bank={value} />}
        <input
          ref={inputRef}
          className="bank-input"
          placeholder={value?.name ?? 'Введите название банка'}
          value={open ? query : value?.name ?? ''}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
        />
        <ChevronDown size={20} className="muted" />
      </div>
      {open && (
        <div className="select-menu bank-menu" role="listbox">
          {options.length === 0 && <div className="select-empty">Банк не найден</div>}
          {options.map((bank, i) => (
            <button
              type="button"
              key={bank.id}
              role="option"
              aria-selected={value?.id === bank.id}
              className={i === active ? 'select-option active' : 'select-option'}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(bank)}
            >
              <BankLogo bank={bank} />
              <span className="select-title">{bank.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
