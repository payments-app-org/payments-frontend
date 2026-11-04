import type { ReactNode } from 'react'
import { ChevronLeft, FileText, Landmark } from 'lucide-react'
import { Link } from 'react-router-dom'

// Шапка формы оплаты по реквизитам: иконка, название, подзаголовок
export default function RequisitesLayout({ title, subtitle, gov, children }: { title: string; subtitle: string; gov?: boolean; children: ReactNode }) {
  return (
    <section className="panel transfer">
      <div className="transfer-head requisites-head">
        <Link to="/transfers/requisites" className="back"><ChevronLeft size={18} /> Свободные реквизиты</Link>
        <div className="requisites-title">
          <span className={gov ? 'gov-logo big' : 'doc-logo big'}>{gov ? <Landmark size={30} /> : <FileText size={30} />}</span>
          <div>
            <h1>{title}</h1>
            <div className="requisites-subtitle">{subtitle}</div>
          </div>
        </div>
      </div>
      <div className="transfer-body">{children}</div>
    </section>
  )
}

export function OfferNote({ action = 'Оплатить' }: { action?: string }) {
  return <span className="offer-note">Нажимая на кнопку «{action}», вы соглашаетесь с <a href="#">Договором оферты</a></span>
}
