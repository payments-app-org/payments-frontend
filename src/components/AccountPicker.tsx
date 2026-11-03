import { useState } from 'react'
import { ChevronDown, CreditCard, Plus, Wallet } from 'lucide-react'
import type { Account } from '../api'
import { formatRub } from '../format'
import AddCardModal from './AddCardModal'
import Modal from './Modal'
import PaymentSystemBadge from './PaymentSystemBadge'

// Квадратная иконка счёта: кошелёк, карта нашего банка или карта другого банка
export function AccountTile({ account }: { account: Account | null }) {
  if (!account) return <span className="acc-tile empty"><CreditCard size={20} /></span>
  if (account.kind === 'wallet') return <span className="acc-tile wallet"><Wallet size={22} /></span>
  return (
    <span className={`acc-tile ${account.kind === 'external' ? 'external' : (account.paymentSystem ?? 'MIR').toLowerCase()}`}>
      <PaymentSystemBadge system={account.paymentSystem} />
    </span>
  )
}

// «Карта *1111» для карт других банков, «Зарплатная WEEKEND ·· 3752» — для наших
export function accountName(a: Account) {
  return a.kind === 'external' ? `Карта *${a.last4}` : a.title
}

function AccountLine({ account }: { account: Account }) {
  return (
    <span className="acc-line">
      {account.balance === null
        ? <span className="acc-line-main">{accountName(account)}</span>
        : <><span className="acc-line-sub">{accountName(account)}</span><span className="acc-line-main">{formatRub(account.balance)}</span></>}
    </span>
  )
}

// Поле выбора счёта в стиле «Откуда списать»: по клику — окно со списком и «Новая карта»
export default function AccountPicker({ title, accounts, value, onChange }: {
  title: string
  accounts: Account[]
  value: Account | null
  onChange: (a: Account) => void
}) {
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  return (
    <>
      <button type="button" className="picker" onClick={() => setOpen(true)}>
        <AccountTile account={value} />
        {value ? <AccountLine account={value} /> : <span className="picker-placeholder">{title}</span>}
        <ChevronDown size={22} className="muted" />
      </button>
      {open && (
        <Modal title={title} onClose={() => setOpen(false)}>
          <div className="picker-list">
            {accounts.map((a) => (
              <button type="button" key={a.id} className="picker-option" onClick={() => { onChange(a); setOpen(false) }}>
                <AccountTile account={a} />
                <AccountLine account={a} />
              </button>
            ))}
            <button type="button" className="picker-option" onClick={() => { setOpen(false); setAdding(true) }}>
              <span className="acc-tile empty"><Plus size={22} /></span>
              <span className="acc-line"><span className="acc-line-main">Новая карта</span></span>
            </button>
          </div>
        </Modal>
      )}
      {adding && <AddCardModal onClose={() => setAdding(false)} onAdded={onChange} />}
    </>
  )
}

// Неизменяемая плашка счёта: «на Мой кошелёк: +7 996 448-80-61» и баланс
export function FixedAccount({ prefix, account, phone }: { prefix: string; account: Account | null; phone: string | null }) {
  return (
    <div className="picker fixed">
      <AccountTile account={account} />
      <span className="acc-line">
        <span className="acc-line-sub">{prefix} Мой кошелёк{phone ? `: ${phone}` : ''}</span>
        <span className="acc-line-main">{account?.balance != null ? formatRub(account.balance) : '…'}</span>
      </span>
    </div>
  )
}
