import { useEffect, useState } from 'react'
import { ChevronDown, ChevronLeft, CircleHelp, HeartHandshake, ShoppingBasket, SlidersHorizontal } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ApiError, disableRoundup, enableRoundup, fetchProviders, useProfile, type Provider } from '../../api'
import Modal from '../../components/Modal'
import ProviderLogo from '../../components/ProviderLogo'
import { formatRub } from '../../format'

type Step = 10 | 100 | 1000

// Примеры покупок для каждого шага: «85 ₽ → 90 ₽, 5 ₽ переведём»
const EXAMPLES: Record<Step, { place: string; amount: number }[]> = {
  10: [{ place: 'Продукты', amount: 85 }, { place: 'Кофе', amount: 79 }, { place: 'Спорттовары', amount: 112 }],
  100: [{ place: 'Продукты', amount: 850 }, { place: 'Кафе', amount: 1590 }, { place: 'Спорттовары', amount: 2300 }],
  1000: [{ place: 'Продукты', amount: 4350 }, { place: 'Связь и интернет', amount: 1290 }, { place: 'Путешествия', amount: 27800 }],
}

const roundUp = (amount: number, step: number) => Math.ceil(amount / step) * step

// «Округление на пользу»: что это, настройка (шаг и фонд), включение и отключение
export default function RoundupPage() {
  const [refresh, setRefresh] = useState(0)
  const profile = useProfile(refresh)
  const [configuring, setConfiguring] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const roundup = profile?.roundup ?? null

  const turnOff = async () => {
    setBusy(true)
    setError(null)
    try {
      await disableRoundup()
      setRefresh((n) => n + 1)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Не удалось отключить округление')
    } finally {
      setBusy(false)
    }
  }

  if (configuring) {
    return <RoundupSettings initial={roundup} onDone={() => { setConfiguring(false); setRefresh((n) => n + 1) }} onBack={() => setConfiguring(false)} />
  }

  return (
    <>
      <Link to="/more" className="back"><ChevronLeft size={18} /> Ещё</Link>
      <section className="panel roundup-hero">
        <span className="roundup-heart"><HeartHandshake size={44} /></span>
        <h1>Округление на пользу</h1>
        <p className="muted">Округляйте стоимость покупок — разницу получит выбранная вами благотворительная организация</p>
        {roundup && (
          <div className="roundup-current">
            <b>Округление включено</b>
            <span>До {formatRub(roundup.step)} · разницу получит «{roundup.fundName}»</span>
          </div>
        )}
        <div className="roundup-points">
          <div><span className="round-icon"><CircleHelp size={20} /></span><span><b>Как это работает</b><span className="muted">Стоимость покупки округлится в большую сторону — разница будет переведена автоматически</span></span></div>
          <div><span className="round-icon"><ShoppingBasket size={20} /></span><span><b>Где работает округление</b><span className="muted">Оплата связи, игр и сервисов, ЖКХ, госуслуг и штрафов, интернета, образования, интернет-магазинов, путешествий, страхования, охранных систем и свободных реквизитов. Переводы людям не округляем</span></span></div>
          <div><span className="round-icon"><SlidersHorizontal size={20} /></span><span><b>Настройте округление</b><span className="muted">Вы можете выбрать, на сколько округлять сумму покупок</span></span></div>
        </div>
        {error && <div className="form-error">{error}</div>}
        {roundup ? (
          <div className="pay-row">
            <button type="button" className="btn-secondary" onClick={() => setConfiguring(true)} disabled={busy}>Изменить</button>
            <button type="button" className="btn-primary" onClick={turnOff} disabled={busy}>{busy ? 'Отключаем…' : 'Отключить округление'}</button>
          </div>
        ) : (
          <button type="button" className="btn-primary" onClick={() => setConfiguring(true)} disabled={!profile}>Настроить округление</button>
        )}
      </section>
    </>
  )
}

function RoundupSettings({ initial, onDone, onBack }: {
  initial: { step: Step; fundCode: string; fundName: string } | null; onDone: () => void; onBack: () => void
}) {
  const [step, setStep] = useState<Step>(initial?.step ?? 10)
  const [funds, setFunds] = useState<Provider[] | null>(null)
  const [fund, setFund] = useState<{ code: string; name: string } | null>(initial ? { code: initial.fundCode, name: initial.fundName } : null)
  const [choosing, setChoosing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { fetchProviders({ group: 'DONATIONS' }).then(setFunds).catch(() => setFunds([])) }, [])
  const fundProvider = funds?.find((f) => f.code === fund?.code) ?? null

  const save = async () => {
    if (!fund || saving) return
    setSaving(true)
    setError(null)
    try {
      await enableRoundup(step, fund.code, fund.name)
      onDone()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Не удалось включить округление')
      setSaving(false)
    }
  }

  return (
    <>
      <button type="button" className="back" onClick={onBack}><ChevronLeft size={18} /> Округление на пользу</button>
      <h1>Округление платежей</h1>
      <section className="panel roundup-panel">
        <h2>Шаг округления</h2>
        <div className="chips">
          {([10, 100, 1000] as Step[]).map((s) => (
            <button type="button" key={s} className={step === s ? 'chip-option active' : 'chip-option'} onClick={() => setStep(s)}>До {formatRub(s)}</button>
          ))}
        </div>
        <span className="muted">Так будут округляться покупки</span>
        <div className="roundup-examples">
          {EXAMPLES[step].map((e) => (
            <div key={e.place} className="roundup-example">
              <span className="round-icon"><ShoppingBasket size={20} /></span>
              <span className="choose-title">
                <b>{formatRub(e.amount)} → {formatRub(roundUp(e.amount, step))}</b>
                <span className="run-ok small">{formatRub(roundUp(e.amount, step) - e.amount)} переведём · {e.place}</span>
              </span>
            </div>
          ))}
        </div>
      </section>
      <section className="panel roundup-panel">
        <h2>Куда переводить</h2>
        <button type="button" className="input select-btn" onClick={() => setChoosing(true)}>
          {fund ? <>{fundProvider && <ProviderLogo name={fundProvider.name} domain={fundProvider.domain} color={fundProvider.color} />}<span className="select-title">{fund.name}</span></>
            : <span className="placeholder select-title">Выберите организацию</span>}
          <ChevronDown size={20} className="muted" />
        </button>
      </section>
      {error && <div className="form-error">{error}</div>}
      <button type="button" className="btn-primary" onClick={save} disabled={!fund || saving}>{saving ? 'Включаем…' : 'Включить округление'}</button>
      {choosing && (
        <Modal title="Куда переводить" onClose={() => setChoosing(false)}>
          <div className="choose-list">
            {funds === null && <div className="muted">Загружаем…</div>}
            {funds?.map((f) => (
              <button type="button" key={f.code} className="choose-row" onClick={() => { setFund({ code: f.code, name: f.name }); setChoosing(false) }}>
                <ProviderLogo name={f.name} domain={f.domain} color={f.color} />
                <span className="choose-title"><b>{f.name}</b><span className="muted small">Благотворительный фонд</span></span>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </>
  )
}
