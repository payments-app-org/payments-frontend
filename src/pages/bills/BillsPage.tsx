import { useEffect, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError, fetchSubscriptionProviders, fetchSubscriptions, type Provider, type Subscription } from '../../api'
import Modal from '../../components/Modal'
import ProviderLogo from '../../components/ProviderLogo'
import { formatRub } from '../../format'
import { useRegion } from '../../region'

// «3 счёта», «1 счёт»
export function billsWord(n: number) {
  const m10 = n % 10
  const m100 = n % 100
  const w = m10 === 1 && m100 !== 11 ? 'счёт' : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 'счёта' : 'счетов'
  return `${n} ${w}`
}

// «Счета на оплату»: шаблоны пользователя. Открывая страницу, biller заново спрашивает поставщиков о счетах.
export default function BillsPage() {
  const navigate = useNavigate()
  const [list, setList] = useState<Subscription[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [choosing, setChoosing] = useState(false)

  useEffect(() => {
    fetchSubscriptions().then(setList).catch((e) => setError(e instanceof ApiError ? e.message : 'Не удалось загрузить счета'))
  }, [])

  const total = list?.reduce((sum, s) => sum + s.unpaidTotal, 0) ?? 0
  const checked = list?.map((s) => s.checkedAt).filter((x): x is string => !!x).sort().pop()

  return (
    <>
      <Link to="/" className="back"><ChevronLeft size={18} /> Платежи и переводы</Link>
      <h1>Счета на оплату</h1>
      <section className="panel bills-panel">
        {list === null && !error && <div className="muted">Проверяем счета у поставщиков…</div>}
        {error && <div className="form-error">{error}</div>}
        {list && (
          <>
            <h2 className="bills-total">{total > 0 ? `К оплате ${formatRub(total)}` : 'Нет счетов'}</h2>
            {checked && <div className="muted">Наличие счетов проверено сегодня в {new Date(checked).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' })}</div>}
            {list.length === 0 && <div className="muted bills-empty">Здесь появятся счета ЖКХ, налогов, штрафов, интернета и ТВ. Создайте шаблон — и мы будем проверять их за вас.</div>}
            <div className="bills-list">
              {list.map((s) => (
                <button type="button" key={s.id} className="bill-row" onClick={() => navigate(`/bills/${s.id}`)}>
                  <ProviderLogo name={s.provider.name} domain={s.provider.domain} color={s.provider.color} country={s.provider.countryCode} />
                  <span className="bill-row-main">
                    <b>{s.name}</b>
                    <span className="muted">{s.provider.name}</span>
                  </span>
                  <span className={s.unpaidCount > 0 ? 'bill-row-status due' : 'bill-row-status'}>
                    {s.unpaidCount > 0 ? <>{billsWord(s.unpaidCount)}<br />{formatRub(s.unpaidTotal)}</> : 'Нет счетов'}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
        <button type="button" className="btn-primary" onClick={() => setChoosing(true)}>Создать новый</button>
      </section>
      {choosing && <ChooseProvider onClose={() => setChoosing(false)} onChoose={(p) => navigate(`/bills/new/${p.code}`)} />}
    </>
  )
}

// «Выберите категорию»: поставщики, которые выставляют счета, — с учётом региона
function ChooseProvider({ onClose, onChoose }: { onClose: () => void; onChoose: (p: Provider) => void }) {
  const { code: region } = useRegion()
  const [providers, setProviders] = useState<Provider[] | null>(null)
  useEffect(() => { fetchSubscriptionProviders(region).then(setProviders).catch(() => setProviders([])) }, [region])
  return (
    <Modal title="Выберите категорию" onClose={onClose}>
      <div className="choose-list">
        {providers === null && <div className="muted">Загружаем…</div>}
        {providers?.map((p) => (
          <button type="button" key={p.code} className="select-option" onClick={() => onChoose(p)}>
            <ProviderLogo name={p.name} domain={p.domain} color={p.color} country={p.countryCode} />
            <span className="select-title">{p.name}</span>
          </button>
        ))}
      </div>
    </Modal>
  )
}
