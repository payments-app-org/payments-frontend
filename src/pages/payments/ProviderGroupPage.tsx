import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchProviders, type Provider } from '../../api'
import ProviderLogo from '../../components/ProviderLogo'
import { providerRoute } from '../../components/ProviderSearch'
import CategoryPage from './CategoryPage'
import { useRegion } from '../../region'

// Категория платежей: поставщики группы из biller плитками (госуслуги, транспорт, игры, зарубежные операторы)
export default function ProviderGroupPage({ group, title }: { group: string; title: string }) {
  const navigate = useNavigate()
  const [providers, setProviders] = useState<Provider[] | null>(null)
  const { code: region } = useRegion()

  // Поставщики выбранного региона и федеральные
  useEffect(() => {
    const ctrl = new AbortController()
    setProviders(null)
    fetchProviders({ group, region }, ctrl.signal).then(setProviders).catch(() => {})
    return () => ctrl.abort()
  }, [group, region])

  return (
    <CategoryPage title={title}>
      <div className="tiles tiles-4">
        {providers === null && <div className="muted">Загружаем…</div>}
        {providers?.length === 0 && <div className="muted">В этом регионе поставщиков нет</div>}
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
