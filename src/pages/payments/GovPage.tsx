import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchProviders, type Provider } from '../../api'
import ProviderLogo from '../../components/ProviderLogo'
import CategoryPage from './CategoryPage'

// «Оплата гос.услуг и штрафов»: поставщики группы GOV из biller
export default function GovPage() {
  const navigate = useNavigate()
  const [providers, setProviders] = useState<Provider[] | null>(null)

  useEffect(() => {
    const ctrl = new AbortController()
    fetchProviders({ group: 'GOV' }, ctrl.signal).then(setProviders).catch(() => {})
    return () => ctrl.abort()
  }, [])

  return (
    <CategoryPage title="Оплата гос.услуг и штрафов">
      <div className="tiles tiles-4">
        {providers === null && <div className="muted">Загружаем…</div>}
        {providers?.map((p) => (
          <button type="button" key={p.code} className="tile tile-small" onClick={() => navigate(`/payments/gov/${p.code}`)}>
            <ProviderLogo name={p.name} domain={p.domain} color={p.color} />
            <span>{p.name}</span>
          </button>
        ))}
      </div>
    </CategoryPage>
  )
}
