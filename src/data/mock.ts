// Моковые данные — то, что ещё не переехало в бэкенд

export const templates = [{ id: 'yota', name: 'Yota', color: '#3fb6e8', to: '/payments/mobile/yota' }]

export const paymentCategories = [
  { id: 'mobile', title: 'Мобильная связь', icon: 'Smartphone', to: '/payments/mobile' },
  { id: 'games', title: 'Игры и сервисы', icon: 'Gamepad2', to: '/payments/games' },
  { id: 'utilities', title: 'Услуги ЖКХ', icon: 'Bath' },
  { id: 'gov', title: 'Госуслуги, штрафы, налоги', icon: 'Flag', to: '/payments/gov' },
  { id: 'internet', title: 'Интернет и ТВ, Телефония', icon: 'MessageSquare' },
  { id: 'loans', title: 'Погашение кредитов', icon: 'Percent', to: '/payments/loans' },
  { id: 'emoney', title: 'Электронные деньги', icon: 'Coins' },
  { id: 'transport', title: 'Транспорт', icon: 'Bus', to: '/payments/transport' },
  { id: 'foreign', title: 'Зарубежные операторы', icon: 'Radio', to: '/payments/foreign-mobile' },
  { id: 'education', title: 'Образование', icon: 'GraduationCap' },
  { id: 'shops', title: 'Интернет-магазины', icon: 'ShoppingBasket' },
  { id: 'travel', title: 'Путешествие', icon: 'Plane' },
  { id: 'insurance', title: 'Страхование', icon: 'ShieldCheck' },
  { id: 'security', title: 'Охранные системы', icon: 'Video' },
  { id: 'donations', title: 'Пожертвования', icon: 'HeartHandshake' },
  { id: 'free', title: 'Свободные реквизиты', icon: 'FileText', to: '/transfers/requisites' },
  { id: 'misc', title: 'Разное', icon: 'Ellipsis' },
  { id: 'steam', title: 'Они вернулись! – Steam, Playstation, Spotify…', icon: 'Gamepad2', to: '/payments/games' },
] as const

export const transferTypes = [
  { id: 'phone', title: 'По номеру телефона', icon: 'Phone', to: '/transfers/phone' },
  { id: 'card', title: 'По номеру карты', icon: 'CreditCard', to: '/transfers/card' },
  { id: 'own', title: 'Между своими счетами', icon: 'ArrowLeftRight', to: '/transfers/own' },
  { id: 'abroad', title: 'За рубеж', icon: 'Globe', to: '/transfers/abroad' },
  { id: 'requisites', title: 'По реквизитам', icon: 'File', to: '/transfers/requisites' },
  { id: 'wallet', title: 'На кошелек', icon: 'Wallet', to: '/transfers/wallet' },
] as const

export const documents = [
  'Памятка об электронных денежных средствах',
  'Переводы за рубеж',
  'Тарифы за переводы',
]
