import { useState } from 'react'
import { Heart } from 'lucide-react'
import { setDefaultPaymentAccount, type Account } from '../api'

// «Сердечко»: отмеченный счёт подставляется в «Списать с» во всех переводах
export default function DefaultHeart({ account }: { account: Account }) {
  const [saving, setSaving] = useState(false)
  const active = account.defaultForPayments
  const hint = active ? 'Используется как инструмент оплаты по умолчанию' : 'Сделать инструментом оплаты по умолчанию'

  const choose = () => {
    if (active || saving) return
    setSaving(true)
    setDefaultPaymentAccount(account.id).finally(() => setSaving(false))
  }

  return (
    <button type="button" className={active ? 'heart-btn active' : 'heart-btn'} onClick={choose} aria-pressed={active}
      aria-label={hint} data-tooltip={hint}>
      <Heart size={20} fill={active ? 'currentColor' : 'none'} />
    </button>
  )
}
