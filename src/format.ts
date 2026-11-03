const rubles = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 })
const kopecks = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// 100 ₽, но 1,50 ₽ — копейки показываем двумя знаками
export function formatRub(value: number) {
  return `${(Number.isInteger(value) ? rubles : kopecks).format(value)} ₽`
}
