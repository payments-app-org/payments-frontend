import { useEffect, useState } from 'react'
import { ArrowLeftRight, CreditCard, Globe, Info, QrCode, Smartphone, type LucideIcon } from 'lucide-react'
import { fetchTariffs, useAccounts, type TariffRow, type TariffSection } from '../../api'
import Breadcrumbs from '../../components/Breadcrumbs'
import Modal from '../../components/Modal'
import { formatRub, tariffLabel } from '../../format'

const SECTION_ICONS: Record<string, LucideIcon> = {
  OWN_TRANSFER: ArrowLeftRight,
  ABROAD: Globe,
  SBP_PHONE: Smartphone,
  CARD2CARD: CreditCard,
  QR: QrCode,
}

const isFree = (s: TariffSection) => [...s.outgoing, ...s.incoming].every((r) => r.percent === 0 && r.minFee === 0 && r.fixedFee === 0)

function Rows({ rows }: { rows: TariffRow[] }) {
  return (
    <div className="kv-list">
      {rows.map((r) => (
        <div key={r.label} className="kv-row"><span>{r.label}</span><b>{tariffLabel(r)}</b></div>
      ))}
    </div>
  )
}

// Комиссии раздела; если есть и «с кошелька», и «на кошелёк» — переключатель
function TariffModal({ section, onClose }: { section: TariffSection; onClose: () => void }) {
  const both = section.outgoing.length > 0 && section.incoming.length > 0
  const [tab, setTab] = useState<'out' | 'in'>(section.outgoing.length > 0 ? 'out' : 'in')
  return (
    <Modal title={section.title} subtitle="Комиссии" onClose={onClose}>
      {both && (
        <div className="tabs modal-tabs">
          <button type="button" className={tab === 'out' ? 'tab active' : 'tab'} onClick={() => setTab('out')}>С кошелька</button>
          <button type="button" className={tab === 'in' ? 'tab active' : 'tab'} onClick={() => setTab('in')}>На кошелёк</button>
        </div>
      )}
      <Rows rows={tab === 'out' ? section.outgoing : section.incoming} />
    </Modal>
  )
}

export default function WalletConditionsPage() {
  const { accounts } = useAccounts()
  const wallet = accounts?.find((a) => a.kind === 'wallet')
  const [sections, setSections] = useState<TariffSection[] | null>(null)
  const [open, setOpen] = useState<TariffSection | 'limits' | null>(null)

  useEffect(() => { fetchTariffs('WALLET').then((t) => setSections(t.sections), () => setSections([])) }, [])

  const limits = wallet?.limits
  const limitValue = (v: number | null | undefined) => (v == null ? 'Без ограничений' : formatRub(v))

  return (
    <>
      <Breadcrumbs items={[['Главная', '/'], ['Мой кошелёк', '/wallet'], ['Лимиты и условия счёта']]} />

      <section className="panel wallet-section">
        <h2 className="section-title">Лимиты</h2>
        <button type="button" className="list-row" onClick={() => setOpen('limits')}>
          <span className="round-icon"><Info size={18} /></span>
          <span className="list-row-title">Лимиты счёта</span>
        </button>
      </section>

      <section className="panel wallet-section">
        <h2 className="section-title">Комиссии</h2>
        {sections === null && <div className="muted">Загружаем…</div>}
        {sections?.map((s) => {
          const Icon = SECTION_ICONS[s.operationType] ?? Info
          return (
            <button key={s.operationType} type="button" className="list-row" onClick={() => setOpen(s)}>
              <span className="round-icon"><Icon size={18} /></span>
              <span className="list-row-title">
                {s.title}
                {isFree(s) && <span className="muted">Без комиссии</span>}
              </span>
            </button>
          )
        })}
      </section>

      {open === 'limits' && (
        <Modal title="Лимиты счёта" onClose={() => setOpen(null)}>
          <div className="kv-list">
            <div className="kv-row"><span>Максимальная сумма платежа</span><b>{limitValue(limits?.maxPayment)}</b></div>
            <div className="kv-row"><span>Максимальный остаток на счёте</span><b>{limitValue(limits?.maxBalance)}</b></div>
            <div className="kv-row"><span>Максимальная сумма операций в месяц</span><b>{limitValue(limits?.maxMonthlyTurnover)}</b></div>
          </div>
        </Modal>
      )}
      {open && open !== 'limits' && <TariffModal section={open} onClose={() => setOpen(null)} />}
    </>
  )
}
