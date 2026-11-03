import { forwardRef } from 'react'
import type { Operation } from '../history'
import { formatMoney } from '../format'

export type ReceiptRow = [string, string]

const dateTime = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow',
})

// Бланк чека: тот же блок рисуется в окне и сохраняется в PDF
const Receipt = forwardRef<HTMLDivElement, { op: Operation; rows: ReceiptRow[] }>(({ op, rows }, ref) => (
  <div className="receipt" ref={ref}>
    <div className="receipt-logo"><span className="receipt-stripe" />Pay</div>
    <div className="receipt-rows">
      {rows.map(([k, v]) => (
        <div key={k} className="receipt-row"><b>{k}</b><span>{v}</span></div>
      ))}
    </div>
    <div className="receipt-total">
      <span>Итого</span>
      <span>{op.direction === 'INCOME' ? '+' : ''}{formatMoney(op.amount, op.currency)}</span>
    </div>
    <div className="receipt-foot">
      <div>Pay — платёжный сервис</div>
      <div>Чек сформирован {dateTime.format(new Date())} (МСК)</div>
    </div>
    <div className="receipt-stamp">
      <span className="receipt-stamp-check">✓</span>
      <span>
        <b>ВЫПОЛНЕН</b>
        <small>{dateTime.format(new Date(op.occurredAt))}</small>
        <small>Код {op.transactionCode}</small>
      </span>
    </div>
  </div>
))

export default Receipt
