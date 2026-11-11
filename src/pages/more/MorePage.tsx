import { ChevronRight, HeartHandshake, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { SUBSCRIPTION_LABEL, useProfile } from '../../api'
import { logout } from '../../auth'
import { formatRub } from '../../format'
import { formatPhone } from '../payments/MobilePaymentPage'

// «Ещё»: профиль пользователя и дополнительные функции (сюда же добавим новые)
export default function MorePage() {
  const navigate = useNavigate()
  const profile = useProfile()
  const fullName = profile ? [profile.lastName, profile.firstName, profile.middleName].filter(Boolean).join(' ') : ''
  const initials = profile ? `${profile.firstName[0] ?? ''}${profile.lastName[0] ?? ''}` : ''

  const features = [
    {
      to: '/more/roundup', title: 'Округление платежей', icon: <HeartHandshake size={22} />,
      text: profile?.roundup
        ? `Включено · до ${formatRub(profile.roundup.step)} · «${profile.roundup.fundName}»`
        : 'Округляйте покупки — разница уйдёт в благотворительный фонд',
    },
  ]

  return (
    <>
      <h1>Ещё</h1>
      <section className="panel profile-card">
        <span className="profile-avatar">{initials}</span>
        <div>
          <h2>{fullName || 'Загружаем…'}</h2>
          {profile?.phone && <div className="muted">{formatPhone(profile.phone)}</div>}
          {profile && (
            <div className="profile-badges">
              <span className={profile.subscription === 'NONE' ? 'profile-badge' : 'profile-badge premium'}>
                {SUBSCRIPTION_LABEL[profile.subscription]}
              </span>
            </div>
          )}
        </div>
      </section>
      <section className="panel choose-panel">
        {features.map((f) => (
          <button type="button" key={f.to} className="choose-row" onClick={() => navigate(f.to)}>
            <span className="round-icon">{f.icon}</span>
            <span className="choose-title"><b>{f.title}</b><span className="muted small">{f.text}</span></span>
            <ChevronRight size={20} className="muted" />
          </button>
        ))}
        {/* Выход: закрывает сессию в Keycloak, следующий вход — снова с паролем */}
        <button type="button" className="choose-row" onClick={() => void logout()}>
          <span className="round-icon"><LogOut size={22} /></span>
          <span className="choose-title"><b>Выйти</b><span className="muted small">Завершить сеанс на этом устройстве</span></span>
        </button>
      </section>
    </>
  )
}
