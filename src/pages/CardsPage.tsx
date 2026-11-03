import { useState, type ReactNode } from 'react'
import { ArrowLeftRight, ArrowRight, ChevronRight, FileText, Plus, Trash2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError, unlinkCard, useAccounts, useProfile, type Account } from '../api'
import AddCardModal from '../components/AddCardModal'
import Breadcrumbs from '../components/Breadcrumbs'
import DefaultHeart from '../components/DefaultHeart'
import Modal from '../components/Modal'
import PaymentSystemBadge from '../components/PaymentSystemBadge'
import { formatRub } from '../format'

const IDENTIFICATION: Record<string, string> = { FULL: 'Полная', SIMPLIFIED: 'Упрощённая', ANONYMOUS: 'Анонимная' }

// +79964480000 → +7 996 448 00 00
const formatPhone = (phone: string) => {
  const d = phone.replace(/\D/g, '')
  return d.length === 11 ? `+7 ${d.slice(1, 4)} ${d.slice(4, 7)} ${d.slice(7, 9)} ${d.slice(9)}` : phone
}

function ActionButton({ icon, children, onClick, disabled, hint }: {
  icon: ReactNode; children: ReactNode; onClick?: () => void; disabled?: boolean; hint?: string
}) {
  return (
    <button type="button" className="action-btn" onClick={onClick} disabled={disabled} data-tooltip={hint}>
      {icon}{children}
    </button>
  )
}

// Подтверждение перед отвязкой карты другого банка
function UnlinkModal({ card, onClose }: { card: Account; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const confirm = () => {
    setSaving(true)
    unlinkCard(card.id).then(onClose, (e) => {
      setSaving(false)
      setError(e instanceof ApiError ? e.message : 'Не удалось отвязать карту, попробуйте ещё раз')
    })
  }
  return (
    <Modal title="Отвязать карту?" onClose={onClose}>
      <p className="modal-text">Карта ·· {card.last4} пропадёт из списка счетов, переводить с неё будет нельзя. Её можно привязать снова.</p>
      {error && <div className="form-error">{error}</div>}
      <div className="modal-actions">
        <button type="button" className="btn-secondary" onClick={onClose}>Отмена</button>
        <button type="button" className="btn-primary" onClick={confirm} disabled={saving}>{saving ? 'Отвязываем…' : 'Отвязать'}</button>
      </div>
    </Modal>
  )
}

function CardTile({ card }: { card: Account }) {
  const navigate = useNavigate()
  const [unlinking, setUnlinking] = useState(false)
  // Все действия по карте ведут на переводы — там карта уже будет в «Списать с», если она по умолчанию
  const toTransfers = () => navigate('/?tab=transfers')
  return (
    <div className="tile-block">
      <div className="tile-head">
        <div className="card-title">
          <span className={`mini-card ${card.kind === 'external' ? 'external' : (card.paymentSystem ?? 'MIR').toLowerCase()}`}>
            <PaymentSystemBadge system={card.paymentSystem} />
          </span>
          <div>
            <div>{card.title}</div>
            <div className="muted">·· {card.last4}{card.cardExpiry && ` · до ${card.cardExpiry}`}</div>
          </div>
        </div>
        <DefaultHeart account={card} />
      </div>
      {card.balance === null ? (
        <div className="tile-balance"><div className="muted">Карта другого банка — баланс не виден</div></div>
      ) : (
        <div className="tile-balance"><div>Баланс</div><b>{formatRub(card.balance)}</b></div>
      )}
      <div className="actions">
        <ActionButton icon={<Plus size={18} />} onClick={toTransfers}>Пополнить</ActionButton>
        <ActionButton icon={<ArrowRight size={18} />} onClick={toTransfers}>Оплатить</ActionButton>
        <ActionButton icon={<ArrowLeftRight size={18} />} onClick={toTransfers}>Перевести</ActionButton>
        {card.kind === 'external' && (
          <ActionButton icon={<Trash2 size={18} />} onClick={() => setUnlinking(true)}>Удалить</ActionButton>
        )}
      </div>
      {unlinking && <UnlinkModal card={card} onClose={() => setUnlinking(false)} />}
    </div>
  )
}

// Счета и карты: «Мой кошелёк», карты нашего банка и привязанные карты других банков
export default function CardsPage() {
  const { accounts } = useAccounts()
  const profile = useProfile()
  const navigate = useNavigate()
  const [adding, setAdding] = useState(false)
  const wallet = accounts?.find((a) => a.kind === 'wallet')
  const cards = accounts?.filter((a) => a.kind !== 'wallet') ?? []

  return (
    <>
      <Breadcrumbs items={[['Главная', '/'], ['Счета и карты']]} />

      <section className="panel wallet-section">
        <div className="section-head">
          <Link to="/wallet" className="section-title section-link">Мой кошелёк <ChevronRight size={24} /></Link>
          {wallet && <DefaultHeart account={wallet} />}
        </div>
        <div className="tiles-2">
          <div className="info-tile">
            <div>Номер кошелька</div>
            <b>{profile ? formatPhone(profile.phone) : '…'}</b>
          </div>
          <div className="info-tile">
            <div>Баланс</div>
            <b>{wallet?.balance != null ? formatRub(wallet.balance) : '…'}</b>
            <div className="info-tile-foot">Идентификация: <b>{profile ? IDENTIFICATION[profile.identificationLevel] : '…'}</b></div>
          </div>
        </div>
        <div className="actions">
          <ActionButton icon={<Plus size={18} />} onClick={() => navigate('/transfers/own?to=wallet')}>Пополнить</ActionButton>
          <ActionButton icon={<ArrowRight size={18} />} onClick={() => navigate('/')}>Оплатить</ActionButton>
          <ActionButton icon={<ArrowLeftRight size={18} />} onClick={() => navigate('/?tab=transfers')}>Перевести</ActionButton>
          <ActionButton icon={<FileText size={18} />} disabled hint="Скоро">Справка по счёту</ActionButton>
        </div>
      </section>

      <section className="panel wallet-section">
        <div className="section-head">
          <h2 className="section-title">Карты</h2>
          <ActionButton icon={<Plus size={18} />} onClick={() => setAdding(true)}>Добавить карту</ActionButton>
        </div>
        <div className="tiles-list">
          {accounts === null && <div className="muted">Загружаем…</div>}
          {cards.map((card) => <CardTile key={card.id} card={card} />)}
        </div>
      </section>

      {adding && <AddCardModal onClose={() => setAdding(false)} />}
    </>
  )
}
