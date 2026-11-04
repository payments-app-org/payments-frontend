import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

// Карточка формы оплаты поставщику: логотип, заголовок, юрлицо под ним; ниже — форма
export default function ProviderLayout({ logo, title, subtitle, back, action, children }: {
  logo: ReactNode; title: string; subtitle?: string | null; back: [string, string]; action?: ReactNode; children: ReactNode
}) {
  return (
    <section className="panel transfer">
      <div className="transfer-head requisites-head">
        <div className="provider-head-row">
          <Link to={back[0]} className="back"><ChevronLeft size={18} /> {back[1]}</Link>
          {action}
        </div>
        <div className="requisites-title">
          {logo}
          <div>
            <h1>{title}</h1>
            {subtitle && <div className="requisites-subtitle">{subtitle}</div>}
          </div>
        </div>
      </div>
      <div className="transfer-body">{children}</div>
    </section>
  )
}
