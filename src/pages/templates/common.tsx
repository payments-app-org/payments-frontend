import type { Autopayment, PaymentTemplate, SavedProvider } from '../../api'
import ProviderLogo from '../../components/ProviderLogo'

// Категории, из которых можно создать шаблон или автоплатёж: все платежи вкладки «Платежи»,
// кроме погашения кредитов (пока только витрина)
export const TEMPLATE_GROUPS = [
  { group: 'MOBILE', title: 'Мобильная связь', icon: 'Smartphone' },
  { group: 'GOV', title: 'Госуслуги, штрафы, налоги', icon: 'Flag' },
  { group: 'GAMES', title: 'Игры и сервисы', icon: 'Gamepad2' },
  { group: 'UTILITIES', title: 'Услуги ЖКХ', icon: 'Bath' },
  { group: 'INTERNET', title: 'Интернет и ТВ, Телефония', icon: 'MessageSquare' },
  { group: 'EMONEY', title: 'Электронные деньги', icon: 'Coins' },
  { group: 'TRANSPORT', title: 'Транспорт', icon: 'Bus' },
  { group: 'FOREIGN_MOBILE', title: 'Зарубежные операторы', icon: 'Radio' },
  { group: 'EDUCATION', title: 'Образование', icon: 'GraduationCap' },
  { group: 'SHOPS', title: 'Интернет-магазины', icon: 'ShoppingBasket' },
  { group: 'TRAVEL', title: 'Путешествие', icon: 'Plane' },
  { group: 'INSURANCE', title: 'Страхование', icon: 'ShieldCheck' },
  { group: 'SECURITY', title: 'Охранные системы', icon: 'Video' },
  { group: 'DONATIONS', title: 'Пожертвования', icon: 'HeartHandshake' },
  { group: 'MISC', title: 'Разное', icon: 'Ellipsis' },
] as const

export function SavedLogo({ provider, big }: { provider: SavedProvider; big?: boolean }) {
  return <ProviderLogo big={big} name={provider.name} domain={provider.domain} color={provider.color} country={provider.countryCode} />
}

// Оплата по шаблону — форма поставщика с подставленными данными. Госуслуги — на странице оплаты шаблона
// (их форма ищет начисления); поставщиков с поиском счёта эта страница сама отправит куда нужно.
export function templatePayRoute(t: PaymentTemplate) {
  if (t.provider.groupCode === 'MOBILE') return `/payments/mobile/${t.provider.code}?template=${t.id}`
  if (t.provider.groupCode === 'GOV') return `/templates/${t.id}/pay`
  return `/templates/${t.id}/pay?auto=1`
}

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']

// 2026-11-04 → «4 ноября»
export function dayMonth(iso: string) {
  const [, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]}`
}

export function daysWord(n: number) {
  const m10 = n % 10
  const m100 = n % 100
  return m10 === 1 && m100 !== 11 ? 'день' : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 'дня' : 'дней'
}

// «каждое 4-е число месяца», «каждые 7 дней с 4 ноября»
export function scheduleText(a: { scheduleKind: 'MONTHLY' | 'PERIOD'; dayOfMonth?: number | null; periodDays?: number | null; startDate?: string | null }) {
  if (a.scheduleKind === 'MONTHLY') return `каждое ${a.dayOfMonth}-е число месяца`
  const n = a.periodDays ?? 0
  const every = n === 1 ? 'каждый день' : `каждые ${n} ${daysWord(n)}`
  return a.startDate ? `${every} с ${dayMonth(a.startDate)}` : every
}

export function autopaymentSubtitle(a: Autopayment) {
  return a.status === 'PAUSED' ? 'Приостановлен' : `Следующий платёж ${dayMonth(a.nextRunDate)}`
}
