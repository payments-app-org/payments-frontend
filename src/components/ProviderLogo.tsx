import { useState } from 'react'
import { flag } from '../abroad'

// Логотип поставщика: флаг страны (зарубежные операторы), favicon его сайта или первая буква на фирменном цвете
export default function ProviderLogo({ name, domain, color, country, big }: {
  name: string; domain: string | null; color: string; country?: string | null; big?: boolean
}) {
  const [broken, setBroken] = useState(false)
  const cls = big ? 'provider-logo big' : 'provider-logo'
  if (country) {
    return <span className={`${cls} flag`}>{flag(country)}</span>
  }
  if (broken || !domain) {
    return <span className={`${cls} fallback`} style={{ background: color }}>{name[0]}</span>
  }
  // Если у сайта нет иконки, сервис отдаёт стандартный глобус 16×16 — тогда тоже показываем букву
  return (
    <span className={cls}>
      <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=128`} alt="" onError={() => setBroken(true)}
        onLoad={(e) => { if (e.currentTarget.naturalWidth < 32) setBroken(true) }} />
    </span>
  )
}
