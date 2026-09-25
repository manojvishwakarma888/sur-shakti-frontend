import { t as uiText, useLanguage } from '../i18n/language.js';
import { money } from '../services/maintenance';
export default function BillCreditSummary({ bill }) {
  useLanguage();
  return <div className="small fw-normal">
    {Number(bill.creditAmount) > 0 && <div>{uiText("Amount credited:") + ' '}{money(bill.creditAmount)}</div>}
    {Number(bill.extraChargeAmount) > 0 && <div>{uiText("Extra charges:") + ' '}{money(bill.extraChargeAmount)}</div>}
  </div>;
}
