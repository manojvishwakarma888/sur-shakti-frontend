import { t as uiText, useLanguage } from '../i18n/language.js';
import BillingNavigation from '../components/BillingNavigation';
import PaymentActivity from '../components/PaymentActivity';

export default function PaymentHistory() {
  useLanguage();
  return <div className="bills-screen">
    <div className="mb-4"><h2 className="fw-bold mb-1">{uiText("Payment history")}</h2><p className="text-muted mb-0">{uiText("Track payment status, view proof, and download receipts.")}</p></div>
    <BillingNavigation />
    <PaymentActivity />
  </div>;
}
