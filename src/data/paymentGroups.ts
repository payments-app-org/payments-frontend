// Категории платежей с поставщиками из biller: группа → адрес страницы и заголовок
export const PAYMENT_GROUPS = [
  { group: 'GOV', path: '/payments/gov', title: 'Оплата гос.услуг и штрафов', back: 'Госуслуги' },
  { group: 'TRANSPORT', path: '/payments/transport', title: 'Транспорт', back: 'Транспорт' },
  { group: 'GAMES', path: '/payments/games', title: 'Игры и сервисы', back: 'Игры и сервисы' },
  { group: 'FOREIGN_MOBILE', path: '/payments/foreign-mobile', title: 'Зарубежные операторы', back: 'Зарубежные операторы' },
  { group: 'EMONEY', path: '/payments/emoney', title: 'Электронные деньги', back: 'Электронные деньги' },
  { group: 'EDUCATION', path: '/payments/education', title: 'Образование', back: 'Образование' },
  { group: 'SHOPS', path: '/payments/shops', title: 'Интернет-магазины', back: 'Интернет-магазины' },
  { group: 'TRAVEL', path: '/payments/travel', title: 'Путешествие', back: 'Путешествие' },
  { group: 'INSURANCE', path: '/payments/insurance', title: 'Страхование', back: 'Страхование' },
  { group: 'SECURITY', path: '/payments/security', title: 'Охранные системы', back: 'Охранные системы' },
  { group: 'DONATIONS', path: '/payments/donations', title: 'Пожертвования', back: 'Пожертвования' },
] as const

export function groupPage(group: string) {
  return PAYMENT_GROUPS.find((g) => g.group === group)
}
