import { Navigate, Route, Routes } from 'react-router-dom'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import PaymentsPage from './pages/PaymentsPage'
import HistoryPage from './pages/HistoryPage'
import CardsPage from './pages/CardsPage'
import WalletPage from './pages/wallet/WalletPage'
import WalletConditionsPage from './pages/wallet/WalletConditionsPage'
import PhoneTransferPage from './pages/transfers/PhoneTransferPage'
import CardTransferPage from './pages/transfers/CardTransferPage'
import OwnTransferPage from './pages/transfers/OwnTransferPage'

export default function App() {
  return (
    <>
      <Header />
      <div className="layout">
        <Sidebar />
        <main className="content">
          <Routes>
            <Route path="/" element={<PaymentsPage />} />
            <Route path="/transfers/phone" element={<PhoneTransferPage />} />
            <Route path="/transfers/card" element={<CardTransferPage />} />
            <Route path="/transfers/own" element={<OwnTransferPage />} />
            <Route path="/cards" element={<CardsPage />} />
            <Route path="/wallet" element={<WalletPage />} />
            <Route path="/wallet/conditions" element={<WalletConditionsPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </>
  )
}
