import { ApiError, currentUserId } from './api'
import { apiFetch } from './auth'

export type Country = { code: string; nameRu: string; nameNative: string; dialCode: string | null; popular: boolean; currencies: string[] }
export type Field = { key: string; label: string; type: string; pattern: string; placeholder: string | null }
// Способ перевода вместе с полями получателя и пределами суммы (₽ за перевод) — приходит сразу со страной
export type Method = {
  id: number; name: string; kind: 'CARD' | 'PHONE' | 'ACCOUNT' | 'WALLET'; kindLabel: string; color: string
  minAmount: number; maxAmount: number; fields: Field[]
}
export type FxQuote = { amountRub: number; currency: string; symbol: string; receiveAmount: number; rate: number; commission: number; total: number; quoteToken: string }

async function get<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(url, init)
  if (!res.ok) {
    const problem = await res.json().catch(() => null)
    throw new ApiError(res.status, problem?.detail ?? `Ошибка ${res.status}`, problem?.code)
  }
  return res.json()
}

export const fetchCountries = () => get<Country[]>('/api/biller/countries')
export const fetchCountry = (code: string) => get<{ country: Country; methods: Method[] }>(`/api/biller/countries/${code}`)

// Пересчёт по курсу: задаём либо сумму в рублях, либо сумму к получению
export function fetchFxQuote(sourceAccountId: string, currency: string, by: { amountRub?: number; receiveAmount?: number }, signal?: AbortSignal) {
  return get<FxQuote>('/api/pricing/fx-quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: currentUserId(), sourceAccountId, currency, ...by }),
    signal,
  })
}

// Флаг страны эмодзи из кода ISO: AM → 🇦🇲
export function flag(code: string) {
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
}

// Флаг валюты: первые две буквы кода ISO 4217 — страна (USD → US); у евро — флаг ЕС
export function currencyFlag(currency: string) {
  return flag(currency === 'EUR' ? 'EU' : currency.slice(0, 2))
}
