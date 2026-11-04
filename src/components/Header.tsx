import { NavLink, useLocation } from 'react-router-dom'

export default function Header() {
  const { pathname } = useLocation()
  // Всё, кроме истории и «Ещё», — раздел «Платежи и переводы»
  const paymentsActive = !pathname.startsWith('/history') && !pathname.startsWith('/more')

  return (
    <header className="header">
      <div className="header-inner">
        <span className="logo">Pay</span>
        <nav className="nav">
          <NavLink to="/" className={paymentsActive ? 'nav-link active' : 'nav-link'}>Платежи и переводы</NavLink>
          <NavLink to="/history" className="nav-link">История</NavLink>
          <NavLink to="/more" className="nav-link">Ещё</NavLink>
        </nav>
      </div>
    </header>
  )
}
