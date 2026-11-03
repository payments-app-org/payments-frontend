import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ReceiptText } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useAccounts } from '../api'
import CategoryIcon from '../components/CategoryIcon'
import Modal from '../components/Modal'
import Receipt, { type ReceiptRow } from '../components/Receipt'
import { formatMoney } from '../format'
import { fetchOperation, type Operation } from '../history'

const dateLong = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow',
})

const LOYALTY: Record<string, string> = { CASHBACK: 'Кешбэк рублями', PREMIUM: 'Подписка Премиум', DISCOUNT: 'Скидки партнёров' }
const TRANSFERS = ['SBP_TRANSFER', 'CARD_TRANSFER', 'OWN_TRANSFER']

// Строки деталей — одни и те же в карточке и в чеке
function detailRows(op: Operation, accountTitle: string | null): ReceiptRow[] {
  const rows: ReceiptRow[] = []
  const transfer = TRANSFERS.includes(op.category)
  if (op.cashback) rows.push(['Кешбэк рублями', formatMoney(op.cashback, 'RUB')])
  rows.push(['Категория исполнителя', op.categoryName])
  if (op.mcc) rows.push(['MCC', op.mcc])
  if (transfer) rows.push([op.direction === 'INCOME' ? 'Отправитель' : 'Получатель', op.title])
  // У списаний в amount уже входит комиссия — показываем раздельно
  rows.push(['Сумма', formatMoney(op.amount - op.fee, op.currency)])
  if (op.fee > 0) rows.push(['Комиссия', formatMoney(op.fee, op.currency)])
  rows.push(['Скидка', formatMoney(op.discount, op.currency)])
  if (op.loyaltyProgram && op.loyaltyProgram !== 'CASHBACK') rows.push(['Программа лояльности', LOYALTY[op.loyaltyProgram]])
  if (accountTitle) rows.push([op.direction === 'INCOME' ? 'Счёт зачисления' : 'Счёт списания', accountTitle])
  if (op.details) rows.push([transfer ? 'Сообщение' : 'Назначение', op.details])
  if (op.transactionCode) rows.push(['Код транзакции', op.transactionCode])
  return rows
}

// PDF собираем в браузере: снимок бланка чека → страница A5. Библиотеки грузим только по нажатию.
async function downloadPdf(el: HTMLElement, fileName: string) {
  const [{ jsPDF }, { default: html2canvas }] = await Promise.all([import('jspdf'), import('html2canvas')])
  const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff' })
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' })
  const margin = 10
  const width = pdf.internal.pageSize.getWidth() - margin * 2
  const height = (canvas.height * width) / canvas.width
  // JPEG: чек весит ~100 КБ вместо пары мегабайт в PNG
  pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, width, height)
  pdf.save(fileName)
}

function ReceiptModal({ op, rows, onClose }: { op: Operation; rows: ReceiptRow[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)
  const download = () => {
    if (!ref.current) return
    setSaving(true)
    setError(false)
    downloadPdf(ref.current, `chek-${op.transactionCode ?? op.id}.pdf`)
      .catch(() => setError(true))
      .finally(() => setSaving(false))
  }
  return (
    <Modal title="Чек" onClose={onClose}>
      <div className="receipt-wrap">
        <Receipt ref={ref} op={op} rows={rows} />
        {error && <div className="form-error">Не удалось сформировать PDF, попробуйте ещё раз</div>}
        <button type="button" className="btn-primary" onClick={download} disabled={saving}>{saving ? 'Готовим PDF…' : 'Скачать чек'}</button>
      </div>
    </Modal>
  )
}

export default function OperationPage() {
  const { id } = useParams()
  const { accounts } = useAccounts()
  const [op, setOp] = useState<Operation | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [receipt, setReceipt] = useState(false)

  useEffect(() => {
    if (id) fetchOperation(id).then(setOp, (e) => setError(e.message))
  }, [id])

  const account = accounts?.find((a) => a.id === op?.accountId)
  const rows = op ? detailRows(op, account?.title ?? null) : []

  return (
    <section className="panel operation">
      <Link to="/history" className="back"><ChevronLeft size={18} /> История</Link>
      {error && <div className="history-empty error-text">{error}</div>}
      {!op && !error && <div className="history-empty muted">Загружаем…</div>}
      {op && (
        <>
          <div className="operation-head">
            <div className="operation-icon"><CategoryIcon category={op.category} /></div>
            <div className="operation-title">{op.title}</div>
            <div className={op.direction === 'INCOME' ? 'operation-amount income' : 'operation-amount'}>
              {op.direction === 'INCOME' ? '+' : '−'}{formatMoney(op.amount, op.currency)}
            </div>
            <div className="muted">{op.direction === 'INCOME' ? 'Зачисление выполнено' : 'Платёж выполнен'}</div>
            <div className="muted">{dateLong.format(new Date(op.occurredAt)).replace(' г.', '').replace(' в ', ' ')}</div>
            <button type="button" className="receipt-btn" onClick={() => setReceipt(true)}>
              <ReceiptText size={22} />Сохранить чек
            </button>
          </div>

          <h3 className="operation-details-title">Детали операции</h3>
          <div className="operation-details">
            {rows.map(([k, v]) => (
              <div key={k} className="detail-row"><span className="muted">{k}</span><span>{v}</span></div>
            ))}
          </div>
        </>
      )}
      {op && receipt && <ReceiptModal op={op} rows={rows} onClose={() => setReceipt(false)} />}
    </section>
  )
}
