import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import PaymentsPage from './pages/PaymentsPage'
import HistoryPage from './pages/HistoryPage'
import CardsPage from './pages/CardsPage'
import OperationPage from './pages/OperationPage'
import AnalyticsPage from './pages/AnalyticsPage'
import WalletPage from './pages/wallet/WalletPage'
import WalletConditionsPage from './pages/wallet/WalletConditionsPage'
import WalletTopUpPage from './pages/wallet/WalletTopUpPage'
import WalletTransferPage from './pages/wallet/WalletTransferPage'
import PhoneTransferPage from './pages/transfers/PhoneTransferPage'
import CardTransferPage from './pages/transfers/CardTransferPage'
import OwnTransferPage from './pages/transfers/OwnTransferPage'
import AbroadTransferPage from './pages/transfers/AbroadTransferPage'
import WalletToWalletPage from './pages/transfers/WalletToWalletPage'
import RequisitesPage from './pages/requisites/RequisitesPage'
import LegalPaymentPage from './pages/requisites/LegalPaymentPage'
import MobilePaymentPage from './pages/payments/MobilePaymentPage'
import GovPage from './pages/payments/GovPage'
import GovProviderPage from './pages/payments/GovProviderPage'
import LoansPage from './pages/payments/LoansPage'
import LoanPaymentPage from './pages/payments/LoanPaymentPage'

// Страницы во всю ширину — без левой панели с кошельками и картами
const FULL_WIDTH = ['/cards']

export default function App() {
  const { pathname } = useLocation()
  const fullWidth = FULL_WIDTH.includes(pathname)
  return (
    <>
      <Header />
      <div className={fullWidth ? 'layout full-width' : 'layout'}>
        {!fullWidth && <Sidebar />}
        <main className="content">
          <Routes>
            <Route path="/" element={<PaymentsPage />} />
            <Route path="/transfers/phone" element={<PhoneTransferPage />} />
            <Route path="/transfers/card" element={<CardTransferPage />} />
            <Route path="/transfers/own" element={<OwnTransferPage />} />
            <Route path="/transfers/abroad" element={<AbroadTransferPage />} />
            <Route path="/transfers/wallet" element={<WalletToWalletPage />} />
            <Route path="/transfers/requisites" element={<RequisitesPage />} />
            <Route path="/transfers/requisites/uin" element={<GovProviderPage code="uin" back={['/transfers/requisites', 'Свободные реквизиты']} />} />
            <Route path="/transfers/requisites/legal" element={<LegalPaymentPage ourBank={false} />} />
            <Route path="/transfers/requisites/legal-our" element={<LegalPaymentPage ourBank />} />
            <Route path="/payments/mobile" element={<MobilePaymentPage />} />
            <Route path="/payments/mobile/:code" element={<MobilePaymentPage />} />
            <Route path="/payments/gov" element={<GovPage />} />
            <Route path="/payments/gov/:code" element={<GovProviderPage />} />
            <Route path="/payments/loans" element={<LoansPage />} />
            <Route path="/payments/loans/:code" element={<LoanPaymentPage />} />
            <Route path="/cards" element={<CardsPage />} />
            <Route path="/wallet" element={<WalletPage />} />
            <Route path="/wallet/conditions" element={<WalletConditionsPage />} />
            <Route path="/wallet/topup" element={<WalletTopUpPage />} />
            <Route path="/wallet/transfer" element={<WalletTransferPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/history/analytics" element={<AnalyticsPage />} />
            <Route path="/history/:id" element={<OperationPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </>
  )
}
