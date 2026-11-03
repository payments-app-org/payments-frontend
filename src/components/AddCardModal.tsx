import { useState, type FormEvent } from 'react'
import { CircleHelp } from 'lucide-react'
import { ApiError, linkCard, type Account } from '../api'
import Modal from './Modal'

const formatCard = (raw: string) => raw.replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ')

// 1225 → 12/25
function formatExpiry(raw: string) {
  const d = raw.replace(/\D/g, '').slice(0, 4)
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d
}

// Привязка карты другого банка. CVC уходит на сервер только для проверки и не сохраняется.
export default function AddCardModal({ onClose, onAdded }: { onClose: () => void; onAdded?: (card: Account) => void }) {
  const [number, setNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const digits = number.replace(/\D/g, '')
  const valid = digits.length >= 16 && /^\d{2}\/\d{2}$/.test(expiry) && /^\d{3}$/.test(cvc)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!valid || saving) return
    setSaving(true)
    setError(null)
    linkCard(digits, expiry, cvc).then(
      (card) => { onAdded?.(card); onClose() },
      (err) => {
        setSaving(false)
        setError(err instanceof ApiError ? err.message : 'Не удалось привязать карту, попробуйте ещё раз')
      },
    )
  }

  return (
    <Modal title="Новая карта" onClose={onClose}>
      <form className="form add-card" onSubmit={submit}>
        <label className="field">
          <span className="field-label">Номер карты</span>
          <input className="input" inputMode="numeric" autoComplete="cc-number" placeholder="Номер карты" value={number}
            onChange={(e) => setNumber(formatCard(e.target.value))} autoFocus />
        </label>
        <div className="add-card-row">
          <label className="field">
            <span className="field-label">ММ/ГГ</span>
            <input className="input" inputMode="numeric" autoComplete="cc-exp" placeholder="ММ/ГГ" value={expiry}
              onChange={(e) => setExpiry(formatExpiry(e.target.value))} />
          </label>
          <label className="field">
            <span className="field-label">CVC/CVV</span>
            <span className="input-with-icon">
              <input className="input" type="password" inputMode="numeric" autoComplete="cc-csc" placeholder="CVC/CVV" value={cvc}
                onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 3))} />
              <span className="input-icon" data-tooltip="Три цифры на обороте карты"><CircleHelp size={18} /></span>
            </span>
          </label>
        </div>
        {error && <div className="form-error">{error}</div>}
        <button type="submit" className="btn-primary wide" disabled={!valid || saving}>{saving ? 'Привязываем…' : 'Добавить карту'}</button>
      </form>
    </Modal>
  )
}
