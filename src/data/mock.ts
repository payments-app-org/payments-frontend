// Моковые данные — то, что ещё не переехало в бэкенд

export const templates = [{ id: 'yota', name: 'Yota', color: '#3fb6e8' }]

export const paymentCategories = [
  { id: 'mobile', title: 'Мобильная связь', icon: 'Smartphone' },
  { id: 'games', title: 'Игры и сервисы', icon: 'Gamepad2' },
  { id: 'utilities', title: 'Услуги ЖКХ', icon: 'Bath' },
  { id: 'gov', title: 'Госуслуги, штрафы, налоги', icon: 'Flag' },
  { id: 'internet', title: 'Интернет и ТВ, Телефония', icon: 'MessageSquare' },
  { id: 'loans', title: 'Погашение кредитов', icon: 'Percent' },
  { id: 'emoney', title: 'Электронные деньги', icon: 'Coins' },
  { id: 'transport', title: 'Транспорт', icon: 'Bus' },
  { id: 'foreign', title: 'Зарубежные операторы', icon: 'Radio' },
  { id: 'education', title: 'Образование', icon: 'GraduationCap' },
  { id: 'shops', title: 'Интернет-магазины', icon: 'ShoppingBasket' },
  { id: 'travel', title: 'Путешествие', icon: 'Plane' },
  { id: 'insurance', title: 'Страхование', icon: 'ShieldCheck' },
  { id: 'security', title: 'Охранные системы', icon: 'Video' },
  { id: 'donations', title: 'Пожертвования', icon: 'HeartHandshake' },
  { id: 'free', title: 'Свободные реквизиты', icon: 'FileText' },
  { id: 'misc', title: 'Разное', icon: 'Ellipsis' },
  { id: 'steam', title: 'Они вернулись! – Steam, Playstation, Spotify…', icon: 'Gamepad2' },
] as const

export const transferTypes = [
  { id: 'phone', title: 'По номеру телефона', icon: 'Phone', to: '/transfers/phone' },
  { id: 'card', title: 'По номеру карты', icon: 'CreditCard', to: '/transfers/card' },
  { id: 'own', title: 'Между своими счетами', icon: 'ArrowLeftRight', to: '/transfers/own' },
  { id: 'abroad', title: 'За рубеж', icon: 'Globe' },
  { id: 'requisites', title: 'По реквизитам', icon: 'File' },
  { id: 'wallet', title: 'На кошелек', icon: 'Wallet' },
] as const

export const documents = [
  'Памятка об электронных денежных средствах',
  'Переводы за рубеж',
  'Тарифы за переводы',
]

export type Operation = {
  id: number
  date: string
  title: string
  subtitle: string
  amount: number
  tag?: string
  avatar: { letter: string; color: string }
}

const bankA = { letter: 'М', color: '#e0312b' }
const bankB = { letter: 'Т', color: '#f5d33c' }
const bankC = { letter: 'С', color: '#1f3fae' }
const yota = { letter: 'Y', color: '#3fb6e8' }
const grey = { letter: '…', color: '#7884a8' }

export const operations: Operation[] = [
  { id: 1, date: '01 ноября', title: 'Артур Константинович Р', subtitle: 'Переводы через СБП', amount: 10, tag: 'Другое', avatar: bankA },
  { id: 2, date: '01 ноября', title: 'Артур Константинович Р', subtitle: 'Переводы через СБП', amount: -10, tag: 'Другое', avatar: bankA },
  { id: 3, date: '30 октября', title: 'Артур Константинович Р', subtitle: 'Переводы через СБП', amount: 10, tag: 'Перевод СБП', avatar: bankB },
  { id: 4, date: '29 октября', title: 'Артур Константинович Р', subtitle: 'Переводы через СБП', amount: -10, tag: '5', avatar: bankB },
  { id: 5, date: '27 октября', title: 'Артур Константинович Р', subtitle: 'Переводы через СБП', amount: -10, tag: 'Перевод СБП', avatar: bankB },
  { id: 6, date: '27 октября', title: 'Yota', subtitle: 'Мобильная связь', amount: -10, avatar: yota },
  { id: 7, date: '27 октября', title: 'Перевод с карты', subtitle: 'Переводы', amount: -10, avatar: bankA },
  { id: 8, date: '26 октября', title: 'Прочее', subtitle: 'Переводы', amount: -60, avatar: grey },
  { id: 9, date: '26 октября', title: 'Перевод с карты', subtitle: 'Переводы', amount: 50, avatar: bankC },
  { id: 10, date: '26 октября', title: 'Перевод с карты', subtitle: 'Переводы', amount: 10, avatar: bankC },
  { id: 11, date: '16 октября', title: 'Кешбэк', subtitle: 'Вознаграждение', amount: 273, avatar: { letter: '%', color: '#7884a8' } },
  { id: 12, date: '07 октября', title: 'Артур Константинович Р', subtitle: 'Переводы через СБП', amount: -1871.07, tag: 'Перевод СБП', avatar: bankB },
  { id: 13, date: '07 октября', title: 'MSKAPT1092', subtitle: 'Аптеки', amount: -338, avatar: { letter: '+', color: '#3b8ef0' } },
]
