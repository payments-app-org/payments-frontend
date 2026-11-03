import type { PaymentSystem } from '../api'

// Значок платёжной системы карты
export default function PaymentSystemBadge({ system }: { system: PaymentSystem | null }) {
  switch (system) {
    case 'MASTERCARD':
      return (
        <span className="card-badge mastercard" aria-label="Mastercard">
          <span className="mc-circle mc-red" />
          <span className="mc-circle mc-yellow" />
        </span>
      )
    case 'VISA':
      return <span className="card-badge visa">VISA</span>
    default:
      return <span className="card-badge">МИР</span>
  }
}
