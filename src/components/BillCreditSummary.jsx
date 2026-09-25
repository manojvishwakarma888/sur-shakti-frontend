import { money } from '../services/maintenance';
export default function BillCreditSummary({ bill }) {
  return <div className="small fw-normal">
    {Number(bill.creditAmount) > 0 && <div>Amount credited: {money(bill.creditAmount)}</div>}
    {Number(bill.extraChargeAmount) > 0 && <div>Extra charges: {money(bill.extraChargeAmount)}</div>}
  </div>;
}
