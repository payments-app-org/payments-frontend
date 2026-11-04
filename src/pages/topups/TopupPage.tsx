import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { ApiError, deleteTopup, fetchTopup, setTopupStatus, type Topup, type TopupRun } from '../../api'
import ProviderLayout from '../../components/ProviderLayout'
import { formatRub } from '../../format'
import { dayMonth } from '../templates/common'

const RUN_STATUS: Record<TopupRun['status'], string> = {
  SUCCESS: 'Пополнено', FAILED: 'Не прошло', PROCESSING: 'Обрабатывается', PENDING: 'Выполняется',
}

// Условие автопополнения словами
export function topupRule(t: Topup) {
  switch (t.kind) {
    case 'MONTHLY': return `${formatRub(t.amount ?? 0)} каждое ${t.dayOfMonth}-е число месяца`
    case 'BY_BALANCE': return `${formatRub(t.amount ?? 0)}, когда баланс ${formatRub(t.threshold ?? 0)} или меньше`
    case 'CONSTANT_BALANCE': return `держать баланс ${formatRub(t.targetBalance ?? 0)}`
  }
}

// Карточка автопополнения: откуда, куда, условие, лимит месяца, история; пауза и удаление
export default function TopupPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [topup, setTopup] = useState<Topup | null>(null)
  const [runs, setRuns] = useState<TopupRun[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetchTopup(id).then((r) => { setTopup(r.topup); setRuns(r.runs) })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Не удалось загрузить автопополнение'))
  }, [id])

  if (!topup) {
    return <section className="panel transfer"><div className="transfer-body muted">{error ?? 'Загружаем…'}</div></section>
  }
  const t = topup
  const toggle = async () => {
    setBusy(true)
    try {
      setTopup(await setTopupStatus(t.id, t.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Не удалось изменить автопополнение')
    } finally {
      setBusy(false)
    }
  }
  const remove = async () => {
    setBusy(true)
    try {
      await deleteTopup(t.id)
      navigate('/templates', { replace: true })
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Не удалось удалить автопополнение')
      setBusy(false)
    }
  }

  return (
    <ProviderLayout logo={<span className="provider-logo big neutral"><RefreshCw size={28} /></span>} title={t.name}
      subtitle="Автопополнение" back={['/templates', 'Шаблоны и автоплатежи']}>
      <div className="form">
        <div className="info-rows">
          <div><span className="muted">Откуда</span><b>{t.sourceTitle}{t.sourceKind === 'SBP' ? ' (СБП)' : ''}</b></div>
          <div><span className="muted">Куда</span><b>{t.destinationTitle}</b></div>
          <div><span className="muted">Условие</span><b>{topupRule(t)}</b></div>
          {t.kind === 'MONTHLY' && t.nextRunDate && (
            <div><span className="muted">Следующее пополнение</span><b>{t.status === 'PAUSED' ? 'Приостановлено' : dayMonth(t.nextRunDate)}</b></div>
          )}
          {t.monthlyLimit !== null && (
            <div><span className="muted">Лимит в месяц</span><b>{formatRub(t.monthUsed)} из {formatRub(t.monthlyLimit)}</b></div>
          )}
          <div><span className="muted">Статус</span><b>{t.status === 'ACTIVE' ? 'Подключено' : 'Приостановлено'}</b></div>
        </div>
        <div className="group">
          <h3>История пополнений</h3>
          {runs.length === 0 && <div className="muted">Пополнений ещё не было</div>}
          {runs.map((r) => (
            <div key={r.id} className="run-row">
              <span>{dayMonth(r.createdAt.slice(0, 10))}</span>
              <span className="run-main">
                <span className={r.status === 'SUCCESS' ? 'run-ok' : r.status === 'FAILED' ? 'error-text' : 'muted'}>{RUN_STATUS[r.status]}</span>
                {r.balanceBefore !== null && <span className="muted small">Баланс был {formatRub(r.balanceBefore)}</span>}
                {r.status === 'FAILED' && r.message && <span className="muted small">{r.message}</span>}
              </span>
              <b>{formatRub(r.amount)}</b>
            </div>
          ))}
        </div>
        {error && <div className="form-error">{error}</div>}
        <div className="pay-row">
          <button type="button" className="btn-secondary" onClick={remove} disabled={busy}>Удалить</button>
          <button type="button" className="btn-primary" onClick={toggle} disabled={busy}>{t.status === 'ACTIVE' ? 'Приостановить' : 'Возобновить'}</button>
        </div>
      </div>
    </ProviderLayout>
  )
}
