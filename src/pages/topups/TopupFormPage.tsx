import { useState } from 'react'
import { ChevronDown, ChevronLeft, RefreshCw, Wallet } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError, createTopup, useAccounts, useCommission, type Account, type TopupKind } from '../../api'
import { BankLogo } from '../../components/BankSelect'
import Modal from '../../components/Modal'
import { AccountSelect, AmountInput, Field, balanceLabel, parseAmount } from '../../components/transfer'
import PaymentSystemBadge from '../../components/PaymentSystemBadge'
import { banks, type Bank } from '../../data/banks'
import { formatRub, tariffLabel } from '../../format'
import { OfferNote } from '../requisites/RequisitesLayout'

type Source = { kind: 'OWN'; account: Account } | { kind: 'SBP'; bank: Bank }

const KINDS: { kind: TopupKind; title: string }[] = [
  { kind: 'MONTHLY', title: 'Раз в месяц' },
  { kind: 'BY_BALANCE', title: 'По балансу' },
  { kind: 'CONSTANT_BALANCE', title: 'Постоянный баланс' },
]

// Новое автопополнение своего счёта: откуда (своя карта или свой счёт в другом банке по СБП), куда, тип и суммы
export default function TopupFormPage() {
  const navigate = useNavigate()
  const { accounts } = useAccounts()
  const own = accounts?.filter((a) => a.kind !== 'external') ?? []
  const [source, setSource] = useState<Source | null>(null)
  const [choosing, setChoosing] = useState(false)
  const [destId, setDestId] = useState<string | null>(null)
  const [name, setName] = useState<string | null>(null)
  const [kind, setKind] = useState<TopupKind>('MONTHLY')
  const [day, setDay] = useState(new Date().getDate())
  const [rawAmount, setRawAmount] = useState('')
  const [rawThreshold, setRawThreshold] = useState('')
  const [rawTarget, setRawTarget] = useState('')
  const [limitOn, setLimitOn] = useState(false)
  const [rawLimit, setRawLimit] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sourceAccountId = source?.kind === 'OWN' ? source.account.id : null
  const destinations = own.filter((a) => a.id !== sourceAccountId)
  const dest = destinations.find((a) => a.id === destId) ?? null
  const amount = parseAmount(rawAmount)
  const threshold = parseAmount(rawThreshold)
  const target = parseAmount(rawTarget)
  const limit = parseAmount(rawLimit)
  // Комиссию показываем на сумму пополнения (для постоянного баланса — на сам баланс как оценку)
  const probe = kind === 'CONSTANT_BALANCE' ? target : amount
  const commission = useCommission('OWN_TRANSFER', sourceAccountId ?? undefined, probe, 0,
    dest ? { destinationAccountId: dest.id } : null)
  const fee = source?.kind === 'SBP' ? 'Без комиссии'
    : commission.status === 'ready' ? (commission.data.commission === 0 ? 'Без комиссии' : `Комиссия ${tariffLabel(commission.data)}`)
    : commission.status === 'error' ? commission.message : undefined

  const amountNeeded = kind !== 'CONSTANT_BALANCE'
  const valid = !!source && !!dest
    && (!amountNeeded || amount >= 10)
    && (kind !== 'BY_BALANCE' || rawThreshold !== '')
    && (kind !== 'CONSTANT_BALANCE' || target >= 10)
    && (!limitOn || kind === 'MONTHLY' || limit >= 10)
    && commission.status !== 'error'

  const submit = async () => {
    if (!valid || saving || !source || !dest) return
    setSaving(true)
    setError(null)
    try {
      const created = await createTopup({
        name: name ?? undefined,
        sourceKind: source.kind,
        ...(source.kind === 'OWN' ? { sourceAccountId: source.account.id } : { sourceBankId: source.bank.id, sourceBankName: source.bank.name }),
        destinationAccountId: dest.id, kind,
        ...(kind === 'MONTHLY' ? { dayOfMonth: day, amount } : {}),
        ...(kind === 'BY_BALANCE' ? { threshold, amount } : {}),
        ...(kind === 'CONSTANT_BALANCE' ? { targetBalance: target } : {}),
        ...(limitOn && kind !== 'MONTHLY' ? { monthlyLimit: limit } : {}),
      })
      navigate(`/topups/${created.id}`, { replace: true })
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Не удалось подключить автопополнение')
      setSaving(false)
    }
  }

  return (
    <section className="panel transfer">
      <div className="transfer-head requisites-head">
        <Link to="/templates" className="back"><ChevronLeft size={18} /> Шаблоны и автоплатежи</Link>
        <div className="requisites-title">
          <span className="provider-logo big neutral"><RefreshCw size={28} /></span>
          <div>
            <h1>Автопополнение</h1>
            <div className="requisites-subtitle">Своего счёта — с карты или из другого банка по СБП</div>
          </div>
        </div>
      </div>
      <div className="transfer-body">
        <div className="form">
          <div className="group pay-method">
            <h3>Откуда списать</h3>
            <button type="button" className="input select-btn" onClick={() => setChoosing(true)}>
              {source?.kind === 'OWN' && <><SourceIcon account={source.account} /><span className="select-title">{source.account.title}</span><span>{balanceLabel(source.account)}</span></>}
              {source?.kind === 'SBP' && <><BankLogo bank={source.bank} /><span className="select-title">Счёт в {source.bank.name}</span><span className="cashback">по СБП</span></>}
              {!source && <span className="placeholder select-title">Выберите из списка</span>}
              <ChevronDown size={20} className="muted" />
            </button>
          </div>
          <div className="group pay-method">
            <h3>Куда перевести</h3>
            <AccountSelect accounts={destinations} value={dest} onChange={(a) => setDestId(a.id)} placeholder="Выберите из списка" />
          </div>
          <Field label="Название автопополнения">
            <input className="input" maxLength={60} placeholder="Например, Зарплатная WEEKEND ·· 3752"
              value={name ?? dest?.title ?? ''} onChange={(e) => setName(e.target.value)} />
          </Field>

          <div className="field">
            <span className="field-label">Тип автопополнения</span>
            <div className="chips">
              {KINDS.map((k) => (
                <button type="button" key={k.kind} className={kind === k.kind ? 'chip-option active' : 'chip-option'} onClick={() => setKind(k.kind)}>{k.title}</button>
              ))}
            </div>
          </div>

          {kind === 'MONTHLY' && (
            <Field label="Число месяца" hint="В коротком месяце — в последний день">
              <select className="input" value={day} onChange={(e) => setDay(Number(e.target.value))}>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{String(d).padStart(2, '0')}</option>)}
              </select>
            </Field>
          )}
          {kind === 'BY_BALANCE' && (
            <>
              <p className="bill-intro">Пополнять, когда баланс на карте ниже или равен указанному</p>
              <Field label="Баланс, при котором пополнять">
                <AmountInput value={rawThreshold} onChange={setRawThreshold} placeholder="Например, 10 000 ₽" />
              </Field>
            </>
          )}
          {kind === 'CONSTANT_BALANCE' && (
            <>
              <p className="bill-intro">Держим на карте этот баланс: потратили — пополним на разницу</p>
              <Field label="Баланс, который поддерживать" hint={fee}>
                <AmountInput value={rawTarget} onChange={setRawTarget} placeholder="Например, 50 000 ₽" />
              </Field>
            </>
          )}
          {amountNeeded && (
            <Field label="Сумма пополнения" hint={fee} error={rawAmount && amount < 10 ? 'Минимальная сумма — 10 ₽' : undefined}>
              <AmountInput value={rawAmount} onChange={setRawAmount} placeholder="₽" />
            </Field>
          )}
          {kind !== 'MONTHLY' && (
            <>
              <label className="switch-row">
                <span>Установить лимит в месяц</span>
                <input type="checkbox" className="switch" checked={limitOn} onChange={(e) => setLimitOn(e.target.checked)} />
              </label>
              {limitOn && (
                <Field label="Лимит пополнения в месяц" error={rawLimit && limit < 10 ? 'От 10 ₽' : undefined}>
                  <AmountInput value={rawLimit} onChange={setRawLimit} placeholder="Например, 50 000 ₽" />
                </Field>
              )}
            </>
          )}

          {error && <div className="form-error">{error}</div>}
          <div className="pay-row">
            <OfferNote action="Подключить" />
            <button type="button" className="btn-primary" onClick={submit} disabled={!valid || saving}>{saving ? 'Подключаем…' : 'Подключить'}</button>
          </div>
        </div>
      </div>
      {choosing && (
        <ChooseSource accounts={own} onClose={() => setChoosing(false)}
          onChoose={(s) => { setSource(s); setChoosing(false); if (s.kind === 'OWN' && s.account.id === destId) setDestId(null) }} />
      )}
    </section>
  )
}

function SourceIcon({ account }: { account: Account }) {
  return account.kind === 'wallet' ? <span className="round-icon tiny"><Wallet size={14} /></span> : <PaymentSystemBadge system={account.paymentSystem} />
}

// «Откуда списать»: свои карты и кошелёк или «Ваш счёт в другом банке» → выбор банка-участника СБП
function ChooseSource({ accounts, onClose, onChoose }: { accounts: Account[]; onClose: () => void; onChoose: (s: Source) => void }) {
  const [banksOpen, setBanksOpen] = useState(false)
  return (
    <Modal title={banksOpen ? 'Выберите банк' : 'Откуда списать'} onClose={onClose}>
      <div className="choose-list">
        {banksOpen ? banks.map((b) => (
          <button type="button" key={b.id} className="choose-row" onClick={() => onChoose({ kind: 'SBP', bank: b })}>
            <BankLogo bank={b} />
            <span className="choose-title">Счёт в {b.name}</span>
          </button>
        )) : (
          <>
            <button type="button" className="choose-row" onClick={() => setBanksOpen(true)}>
              <span className="round-icon"><RefreshCw size={18} /></span>
              <span className="choose-title"><b>Ваш счёт в другом банке</b><span className="run-ok small">Без комиссии</span></span>
            </button>
            {accounts.map((a) => (
              <button type="button" key={a.id} className="choose-row" onClick={() => onChoose({ kind: 'OWN', account: a })}>
                <SourceIcon account={a} />
                <span className="choose-title"><b>{a.title}</b><span className="muted small">{balanceLabel(a)}</span></span>
              </button>
            ))}
          </>
        )}
      </div>
    </Modal>
  )
}
