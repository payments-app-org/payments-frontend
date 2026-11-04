const rubles = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 })
const kopecks = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// 100 ₽, но 1,50 ₽ — копейки показываем двумя знаками
export function formatRub(value: number) {
  return `${(Number.isInteger(value) ? rubles : kopecks).format(value)} ₽`
}

const SYMBOLS: Record<string, string> = { RUB: '₽', USD: '$', EUR: '€' }

// Сумма в валюте операции: 1 000 ₽, 59,99 $
export function formatMoney(value: number, currency: string) {
  return `${(Number.isInteger(value) ? rubles : kopecks).format(value)} ${SYMBOLS[currency] ?? currency}`
}

const percentFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 })

// Тариф словами: «1,5%», «3% (мин. 50 ₽)», «10 ₽ + 1,5%», «0,5% сверх 100 000 ₽ в месяц (не более 1 500 ₽)»
export function tariffLabel(t: {
  percent: number; minFee: number; fixedFee: number; maxFee?: number | null; freeMonthlyAmount?: number | null
}) {
  const percent = `${percentFormat.format(t.percent)}%`
  let base = t.fixedFee > 0 ? `${formatRub(t.fixedFee)} + ${percent}` : percent
  if (t.freeMonthlyAmount) base += ` сверх ${formatRub(t.freeMonthlyAmount)} в месяц`
  const bounds = [t.minFee > 0 && `мин. ${formatRub(t.minFee)}`, t.maxFee != null && `не более ${formatRub(t.maxFee)}`].filter(Boolean)
  return bounds.length ? `${base} (${bounds.join(', ')})` : base
}
