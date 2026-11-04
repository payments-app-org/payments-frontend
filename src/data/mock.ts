// Моковые данные — то, что ещё не переехало в бэкенд


export const paymentCategories = [
  { id: 'mobile', title: 'Мобильная связь', icon: 'Smartphone', to: '/payments/mobile' },
  { id: 'games', title: 'Игры и сервисы', icon: 'Gamepad2', to: '/payments/games' },
  { id: 'utilities', title: 'Услуги ЖКХ', icon: 'Bath', to: '/payments/utilities' },
  { id: 'gov', title: 'Госуслуги, штрафы, налоги', icon: 'Flag', to: '/payments/gov' },
  { id: 'internet', title: 'Интернет и ТВ, Телефония', icon: 'MessageSquare', to: '/payments/internet' },
  { id: 'loans', title: 'Погашение кредитов', icon: 'Percent', to: '/payments/loans' },
  { id: 'emoney', title: 'Электронные деньги', icon: 'Coins', to: '/payments/emoney' },
  { id: 'transport', title: 'Транспорт', icon: 'Bus', to: '/payments/transport' },
  { id: 'foreign', title: 'Зарубежные операторы', icon: 'Radio', to: '/payments/foreign-mobile' },
  { id: 'education', title: 'Образование', icon: 'GraduationCap', to: '/payments/education' },
  { id: 'shops', title: 'Интернет-магазины', icon: 'ShoppingBasket', to: '/payments/shops' },
  { id: 'travel', title: 'Путешествие', icon: 'Plane', to: '/payments/travel' },
  { id: 'insurance', title: 'Страхование', icon: 'ShieldCheck', to: '/payments/insurance' },
  { id: 'security', title: 'Охранные системы', icon: 'Video', to: '/payments/security' },
  { id: 'donations', title: 'Пожертвования', icon: 'HeartHandshake', to: '/payments/donations' },
  { id: 'free', title: 'Свободные реквизиты', icon: 'FileText', to: '/transfers/requisites' },
  { id: 'misc', title: 'Разное', icon: 'Ellipsis', to: '/payments/misc' },
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

