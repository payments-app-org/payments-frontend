import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ChevronDown } from 'lucide-react'
import { bankLogoUrl, banks, type Bank } from '../data/banks'

export function BankLogo({ bank }: { bank: Bank }) {
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

function findBank(text: string) {
  const t = text.trim().toLowerCase()
  return banks.find((b) => b.name.toLowerCase() === t) ?? null
}

// Банк получателя: можно выбрать из списка (печатаем «т» — остаются банки с «т») или вписать что угодно.
// Не из списка или пусто — bank = null, и payment возьмёт банк по умолчанию получателя.
export default function BankSelect({ text, value, onChange }: {
  text: string
  value: Bank | null
  onChange: (text: string, bank: Bank | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Если в поле уже выбранный банк — показываем весь список, иначе фильтруем по набранному
  const q = value ? '' : text.trim().toLowerCase()
  const options = q
    ? [...banks.filter((b) => b.name.toLowerCase().startsWith(q)),
       ...banks.filter((b) => !b.name.toLowerCase().startsWith(q) && b.name.toLowerCase().includes(q))]
    : banks

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  useEffect(() => setActive(0), [text])

  const choose = (bank: Bank) => {
    onChange(bank.name, bank)
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
    } else if (e.key === 'Enter' && open && options[active]) {
      e.preventDefault()
      choose(options[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="select bank-select" ref={ref}>
      <div className={open ? 'input select-btn focused' : 'input select-btn'} onClick={() => { setOpen(true); inputRef.current?.focus() }}>
        {value && <BankLogo bank={value} />}
        <input
          ref={inputRef}
          className="bank-input"
          placeholder="Введите название банка"
          value={text}
          onChange={(e) => {
            onChange(e.target.value, findBank(e.target.value))
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
      {open && options.length > 0 && (
        <div className="select-menu bank-menu" role="listbox">
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
