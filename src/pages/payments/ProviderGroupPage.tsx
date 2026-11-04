import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchProviders, type Provider } from '../../api'
import ProviderLogo from '../../components/ProviderLogo'
import { providerRoute } from '../../components/ProviderSearch'
import CategoryPage from './CategoryPage'

// Категория платежей: поставщики группы из biller плитками (госуслуги, транспорт, игры, зарубежные операторы)
export default function ProviderGroupPage({ group, title }: { group: string; title: string }) {
  const navigate = useNavigate()
  const [providers, setProviders] = useState<Provider[] | null>(null)

  useEffect(() => {
    const ctrl = new AbortController()
    setProviders(null)
    fetchProviders({ group }, ctrl.signal).then(setProviders).catch(() => {})
    return () => ctrl.abort()
  }, [group])

  return (
    <CategoryPage title={title}>
      <div className="tiles tiles-4">
        {providers === null && <div className="muted">Загружаем…</div>}
        {providers?.map((p) => (
          <button type="button" key={p.code} className="tile tile-small" onClick={() => navigate(providerRoute(p))}>
            <ProviderLogo name={p.name} domain={p.domain} color={p.color} country={p.countryCode} />
            <span>{p.name}</span>
          </button>
        ))}
      </div>
    </CategoryPage>
  )
}
