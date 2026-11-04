import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ProviderLogo from '../../components/ProviderLogo'
import { loanBanks } from '../../data/loanBanks'
import CategoryPage from './CategoryPage'

// Сколько банков видно сразу, остальные — по «Показать ещё»
const FIRST = 16

// «Погашение кредитов»: банки и МФО. Пока только витрина — платёж будет у команды кредитования.
export default function LoansPage() {
  const navigate = useNavigate()
  const [all, setAll] = useState(false)
  const list = all ? loanBanks : loanBanks.slice(0, FIRST)
  return (
    <CategoryPage title="Погашение кредитов">
      <div className={all ? 'tiles tiles-4' : 'tiles tiles-4 with-more'}>
        {list.map((b) => (
          <button type="button" key={b.code} className="tile tile-small" onClick={() => navigate(`/payments/loans/${b.code}`)}>
            <ProviderLogo name={b.name} domain={b.domain} color={b.color} />
            <span>{b.name}</span>
          </button>
        ))}
      </div>
      {!all && <button type="button" className="btn-secondary show-more" onClick={() => setAll(true)}>Показать ещё</button>}
    </CategoryPage>
  )
}
