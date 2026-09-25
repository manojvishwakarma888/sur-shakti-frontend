import BillingNavigation from '../components/BillingNavigation';
import PaymentActivity from '../components/PaymentActivity';

export default function PaymentHistory() {
  return <div className="bills-screen">
    <div className="mb-4"><h2 className="fw-bold mb-1">Payment history</h2><p className="text-muted mb-0">Track payment status, view proof, and download receipts.</p></div>
    <BillingNavigation />
    <PaymentActivity />
  </div>;
}
