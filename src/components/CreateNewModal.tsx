import { CalendarClock, ChevronRight, FileText, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Modal from './Modal'

// «Создать новый»: шаблон платежа, автоплатёж или автопополнение
export default function CreateNewModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const options = [
    { to: '/templates/new', title: 'Шаблон платежа', text: 'Сохраните реквизиты и сумму — оплата в одно нажатие', icon: <FileText size={22} /> },
    { to: '/autopayments/new', title: 'Автоплатёж', text: 'Платёж сам уйдёт по расписанию: каждый месяц или раз в N дней', icon: <CalendarClock size={22} /> },
    { to: '/topups/new', title: 'Автопополнение', text: 'Пополнять свой счёт раз в месяц, по балансу или держать постоянный баланс', icon: <RefreshCw size={22} /> },
  ]
  return (
    <Modal title="Создать новый" onClose={onClose}>
      <div className="choose-list">
        {options.map((o) => (
          <button type="button" key={o.to} className="choose-row" onClick={() => navigate(o.to)}>
            <span className="round-icon">{o.icon}</span>
            <span className="choose-title"><b>{o.title}</b><span className="muted small">{o.text}</span></span>
            <ChevronRight size={20} className="muted" />
          </button>
        ))}
      </div>
    </Modal>
  )
}
