import { billPayableAmount } from './billing';
export function normalizeWhatsAppPhone(value) {
  const raw = String(value ?? '').trim();
  if (!raw || !/^\+?[\d\s().-]+$/.test(raw)) return '';
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (!raw.startsWith('+') && !raw.startsWith('00')) {
    if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
    if (digits.length === 10) {
      if (!/^[6-9]/.test(digits)) return '';
      digits = '91' + digits;
    }
  }
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : '';
}
export function buildBillReminder(bill) {
  const name = bill.residentName || bill.ResidentName || 'Resident';
  const flat = bill.flatNo || bill.FlatNo;
  const month = bill.month || bill.Month;
  const amount = billPayableAmount(bill);
  const due = bill.dueDate || bill.DueDate;
  const date = due ? new Date(due) : null;
  return [
    'Hello ' + name + ',',
    'This is a payment reminder from Sur Shakti Residency.',
    flat ? 'Row house: ' + flat : '',
    (bill.billType || bill.BillType || 'Maintenance') + (month ? ' - ' + month : ''),
    Number.isFinite(amount) ? 'Amount pending: ' + new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount) : '',
    date && !Number.isNaN(date.getTime()) ? 'Due date: ' + date.toLocaleDateString('en-IN') : '',
    'Please open Sur Shakti Connect to review your bill and make payment. If you have already paid, please share your payment reference with the society office.',
    'Thank you.'
  ].filter(Boolean).join('\n');
}
