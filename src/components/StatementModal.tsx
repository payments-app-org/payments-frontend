import { forwardRef, useRef, useState } from 'react'
import type { Account, Profile } from '../api'
import { formatMoney, formatRub } from '../format'
import { EMPTY_FILTERS, fetchOperations, type Operation } from '../history'
import { saveElementAsPdf } from '../pdf'
import DateRangePicker, { ruDate, type DateRange } from './DateRangePicker'
import Modal from './Modal'

const IDENTIFICATION: Record<string, string> = { FULL: 'Полный', SIMPLIFIED: 'Упрощённый', ANONYMOUS: 'Анонимный' }
const msk = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('ru-RU', { ...opts, timeZone: 'Europe/Moscow' })
const dateFmt = msk({ day: '2-digit', month: '2-digit', year: 'numeric' })
const timeFmt = msk({ hour: '2-digit', minute: '2-digit', second: '2-digit' })
const TRANSFERS = ['SBP_TRANSFER', 'CARD_TRANSFER', 'OWN_TRANSFER']

function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10, m100 = n % 100
  return m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20) ? few : many
}

// Все операции счета за период — листаем курсором по 100
async function fetchAll(accountId: string, from: string, to: string) {
  const filters = { ...EMPTY_FILTERS, accountId, period: 'custom' as const, from, to }
  const items: Operation[] = []
  let cursor: string | null = null
  do {
    const page = await fetchOperations(filters, cursor, undefined, 100)
    items.push(...page.items)
    cursor = page.nextCursor
  } while (cursor)
  return items
}

type StatementData = { account: Account; profile: Profile; from: string; to: string; operations: Operation[] }

// Бланк справки по счёту — рендерится вне экрана и сохраняется в PDF
const Statement = forwardRef<HTMLDivElement, StatementData>(({ account, profile, from, to, operations }, ref) => (
  <div className="statement" ref={ref}>
    <div className="statement-top">
      <div className="statement-logo"><span>Pay</span>ОПЛАТА</div>
      <div className="muted">{dateFmt.format(new Date())}, {timeFmt.format(new Date()).slice(0, 5)}</div>
    </div>
    <h1>Справка по счёту «Мой Кошелёк»</h1>
    <div className="statement-period">За период с {ruDate(from)} по {ruDate(to)}</div>
    <div className="statement-grid">
      <div><b>Статус счёта</b><span className="chip statement-chip">Активный</span></div>
      <div><b>Номер телефона</b><span>{profile.phone}</span></div>
      <div><b>Уровень идентификации</b><span>{IDENTIFICATION[profile.identificationLevel]}</span></div>
      <div><b>Номер счёта</b><span>{account.accountNumber ?? '—'}</span></div>
      <div><b>Дата открытия</b><span>{account.openedAt ? `${dateFmt.format(new Date(account.openedAt)).replace(/\./g, '/')} ${timeFmt.format(new Date(account.openedAt))}` : '—'}</span></div>
      <div><b>Баланс</b><span>{formatRub(account.balance ?? 0)}</span></div>
      <div><b>Валюта счёта</b><span>RUB</span></div>
    </div>
    <h2>Операции по счёту</h2>
    <div className="statement-period">{operations.length} {plural(operations.length, 'операция', 'операции', 'операций')}</div>
    <table className="statement-table">
      <thead><tr><th>Дата / Время</th><th>Номер операции</th><th>Сумма</th><th>Описание</th></tr></thead>
      <tbody>
        {operations.map((op) => (
          <tr key={op.id}>
            <td>{dateFmt.format(new Date(op.occurredAt))}<small>{timeFmt.format(new Date(op.occurredAt))}</small></td>
            <td className="muted-cell">{op.transactionCode ?? '—'}</td>
            <td>{op.direction === 'INCOME' ? '+' : '-'}{formatMoney(op.amount, op.currency)}</td>
            <td>{TRANSFERS.includes(op.category) ? op.categoryName : op.title}{TRANSFERS.includes(op.category) && <small>{op.title}</small>}</td>
          </tr>
        ))}
      </tbody>
    </table>
    {operations.length === 0 && <div className="statement-period">За выбранный период операций по счёту не было</div>}
  </div>
))

// «Справка за произвольный период» по «Моему кошельку»: выбор периода → PDF
export default function StatementModal({ account, profile, onClose }: { account: Account; profile: Profile; onClose: () => void }) {
  const [range, setRange] = useState<DateRange>({ from: null, to: null })
  const [data, setData] = useState<StatementData | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  const get = async () => {
    if (!range.from) return
    const from = range.from, to = range.to ?? range.from
    setBusy(true)
    setError(null)
    try {
      const operations = await fetchAll(account.id, from, to)
      setData({ account, profile, from, to, operations })
      // Даём React отрисовать бланк, потом снимаем его в PDF
      await new Promise((r) => setTimeout(r, 50))
      await saveElementAsPdf(ref.current!, `spravka-moy-koshelek-${ruDate(from)}-${ruDate(to)}.pdf`)
      onClose()
    } catch {
      setError('Не удалось сформировать справку, попробуйте ещё раз')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Справка за произвольный период" onClose={onClose}>
      <div className="statement-form">
        <span className="field-label">Выберите дату или период</span>
        <DateRangePicker value={range} onChange={setRange} />
        {error && <div className="form-error">{error}</div>}
      </div>
      <div className="modal-footer-bar">
        <button type="button" className="btn-secondary" onClick={onClose}>Отмена</button>
        <button type="button" className="btn-primary" onClick={get} disabled={!range.from || busy}>{busy ? 'Готовим…' : 'Получить'}</button>
      </div>
      {data && <div className="offscreen"><Statement ref={ref} {...data} /></div>}
    </Modal>
  )
}
