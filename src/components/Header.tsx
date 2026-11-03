import { NavLink, useLocation } from 'react-router-dom'

export default function Header() {
  const { pathname } = useLocation()
  // Формы переводов — часть раздела «Платежи и переводы»
  const paymentsActive = pathname === '/' || pathname.startsWith('/transfers')

  return (
    <header className="header">
      <div className="header-inner">
        <span className="logo">Pay</span>
        <nav className="nav">
          <NavLink to="/" className={paymentsActive ? 'nav-link active' : 'nav-link'}>Платежи и переводы</NavLink>
          <NavLink to="/history" className="nav-link">История</NavLink>
        </nav>
      </div>
    </header>
  )
}
