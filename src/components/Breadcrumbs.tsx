import { ChevronRight } from 'lucide-react'
import { Fragment } from 'react'
import { Link } from 'react-router-dom'

// Главная > Мой кошелёк > …; у последнего пункта ссылки нет
export default function Breadcrumbs({ items }: { items: [string, string?][] }) {
  return (
    <nav className="breadcrumbs" aria-label="Навигация">
      {items.map(([label, to], i) => (
        <Fragment key={label}>
          {i > 0 && <ChevronRight size={16} />}
          {to ? <Link to={to}>{label}</Link> : <span>{label}</span>}
        </Fragment>
      ))}
    </nav>
  )
}
