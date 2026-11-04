import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ApiError, deleteAutopayment, fetchAutopayment, setAutopaymentStatus, useAccounts, type Autopayment, type AutopaymentRun,
} from '../../api'
import ProviderLayout from '../../components/ProviderLayout'
import { formatRub } from '../../format'
import { SavedLogo, dayMonth, scheduleText } from './common'

const RUN_STATUS: Record<AutopaymentRun['status'], string> = {
  SUCCESS: 'Оплачено', FAILED: 'Не прошёл', PROCESSING: 'Обрабатывается', PENDING: 'Выполняется',
}

// Карточка автоплатежа: расписание, ближайший платёж, счета, история запусков; пауза и удаление
export default function AutopaymentPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { accounts } = useAccounts()
  const [autopayment, setAutopayment] = useState<Autopayment | null>(null)
  const [runs, setRuns] = useState<AutopaymentRun[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetchAutopayment(id).then((r) => { setAutopayment(r.autopayment); setRuns(r.runs) })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Не удалось загрузить автоплатёж'))
  }, [id])

  if (!autopayment) {
    return <section className="panel transfer"><div className="transfer-body muted">{error ?? 'Загружаем…'}</div></section>
  }
  const a = autopayment
  const accountTitle = (accountId: string | null) => {
    const acc = accounts?.find((x) => x.id === accountId)
    return acc ? acc.title : accountId ? 'Счёт закрыт' : '—'
  }

  const toggle = async () => {
    setBusy(true)
    try {
      setAutopayment(await setAutopaymentStatus(a.id, a.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Не удалось изменить автоплатёж')
    } finally {
      setBusy(false)
    }
  }
  const remove = async () => {
    setBusy(true)
    try {
      await deleteAutopayment(a.id)
      navigate('/templates', { replace: true })
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Не удалось удалить автоплатёж')
      setBusy(false)
    }
  }

  return (
    <ProviderLayout logo={<SavedLogo big provider={a.provider} />} title={a.name} subtitle={a.provider.name}
      back={['/templates', 'Шаблоны и автоплатежи']}>
      <div className="form">
        <div className="info-rows">
          <div><span className="muted">Сумма</span><b>{formatRub(a.amount)}</b></div>
          <div><span className="muted">Расписание</span><b>{scheduleText(a)}</b></div>
          <div><span className="muted">Следующий платёж</span><b>{a.status === 'PAUSED' ? 'Приостановлен' : dayMonth(a.nextRunDate)}</b></div>
          {a.target && <div><span className="muted">Получатель</span><b>{a.target}</b></div>}
          <div><span className="muted">Основной счёт</span><b>{accountTitle(a.sourceAccountId)}</b></div>
          <div><span className="muted">Запасной счёт</span><b>{a.backupAccountId ? accountTitle(a.backupAccountId) : 'Не выбран'}</b></div>
        </div>

        <div className="group">
          <h3>История платежей</h3>
          {runs.length === 0 && <div className="muted">Платежей ещё не было — первый {dayMonth(a.nextRunDate)}</div>}
          {runs.map((r) => (
            <div key={r.id} className="run-row">
              <span>{dayMonth(r.runDate)}</span>
              <span className="run-main">
                <span className={r.status === 'SUCCESS' ? 'run-ok' : r.status === 'FAILED' ? 'error-text' : 'muted'}>{RUN_STATUS[r.status]}</span>
                {r.message && r.message !== RUN_STATUS[r.status] && <span className="muted small">{r.message}</span>}
              </span>
              <b>{formatRub(r.amount)}</b>
            </div>
          ))}
        </div>

        {error && <div className="form-error">{error}</div>}
        <div className="pay-row">
          <button type="button" className="btn-secondary" onClick={remove} disabled={busy}>Удалить</button>
          <button type="button" className="btn-primary" onClick={toggle} disabled={busy}>
            {a.status === 'ACTIVE' ? 'Приостановить' : 'Возобновить'}
          </button>
        </div>
      </div>
    </ProviderLayout>
  )
}
