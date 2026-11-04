import { useEffect, useState } from 'react'
import { fetchRegions, type Region } from './api'

// Выбранный регион платежей: от него зависит, каких поставщиков показываем (федеральные видны везде).
// Храним в браузере — это удобство для конкретного пользователя.
const KEY = 'payments.region'
const EVENT = 'payments-region-changed'
export const DEFAULT_REGION = 'moscow'

let regionsCache: Promise<Region[]> | null = null

function read() {
  try {
    return localStorage.getItem(KEY) || DEFAULT_REGION
  } catch {
    return DEFAULT_REGION
  }
}

export function useRegion() {
  const [code, setCode] = useState(read)
  const [regions, setRegions] = useState<Region[]>([])

  useEffect(() => {
    regionsCache ??= fetchRegions().catch(() => { regionsCache = null; return [] })
    regionsCache.then(setRegions)
    const sync = () => setCode(read())
    window.addEventListener(EVENT, sync)
    return () => window.removeEventListener(EVENT, sync)
  }, [])

  const change = (next: string) => {
    try { localStorage.setItem(KEY, next) } catch { /* без хранилища — только до перезагрузки */ }
    setCode(next)
    window.dispatchEvent(new Event(EVENT))
  }
  const current = regions.find((r) => r.code === code) ?? null
  return { code, current, regions, change }
}
