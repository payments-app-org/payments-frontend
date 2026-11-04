import { useState } from 'react'

// Логотип поставщика: favicon его сайта; нет сайта или иконки — первая буква на фирменном цвете
export default function ProviderLogo({ name, domain, color, big }: { name: string; domain: string | null; color: string; big?: boolean }) {
  const [broken, setBroken] = useState(false)
  const cls = big ? 'provider-logo big' : 'provider-logo'
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
