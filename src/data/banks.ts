// Банки-участники СБП. id — идентификатор участника, его ждёт сервис payment.
// domain — откуда берём логотип (favicon сайта банка); нет domain или логотип не загрузился — буква на фоне color.
export type Bank = { id: string; name: string; domain?: string; color: string }

export const banks: Bank[] = [
  { id: '100000000111', name: 'Сбербанк', domain: 'sberbank.ru', color: '#21a038' },
  { id: '100000000004', name: 'Т-Банк', domain: 'tbank.ru', color: '#ffdd2d' },
  { id: '100000000008', name: 'Альфа-Банк', domain: 'alfabank.ru', color: '#ef3124' },
  { id: '100000000005', name: 'ВТБ', domain: 'online.vtb.ru', color: '#0a2896' },
  { id: '100000000001', name: 'Газпромбанк', domain: 'gazprombank.ru', color: '#0b3c8c' },
  { id: '100000000007', name: 'Райффайзенбанк', domain: 'raiffeisen.ru', color: '#fff200' },
  { id: '100000000017', name: 'МТС Банк', domain: 'mtsbank.ru', color: '#e30611' },
  { id: '100000000273', name: 'Озон Банк', domain: 'ozon.ru', color: '#005bff' },
  { id: '100000000150', name: 'Яндекс Банк', domain: 'bank.yandex.ru', color: '#fc3f1d' },
  { id: '100000000013', name: 'Совкомбанк', domain: 'sovcombank.ru', color: '#1d3e8f' },
  { id: '100000000016', name: 'Почта Банк', domain: 'www.pochtabank.ru', color: '#1a37a1' },
  { id: '100000000012', name: 'Росбанк', color: '#e2001a' },
]

export function bankLogoUrl(bank: Bank) {
  return bank.domain ? `https://www.google.com/s2/favicons?domain=${bank.domain}&sz=64` : null
}
