import { t as uiText, useLanguage, getLocale } from '../i18n/language.js';
import { useCallback, useEffect, useMemo, useState } from 'react';
import QRCode from 'react-qr-code';
import { toast } from 'react-toastify';
import {
  FaChair, FaCheck, FaCheckCircle, FaClock, FaDownload, FaExclamationCircle,
  FaMoneyBillWave, FaQrcode, FaReceipt, FaSpinner, FaUndoAlt,
} from 'react-icons/fa';
import { getApiErrorMessage } from '../services/api';
import { createSocietyUpiUri, SOCIETY_NAME, SOCIETY_UPI_ID } from '../utils/upi';
import {
  collectEventCashPayment, createEventRefund, createEventSettlement,
  getEventPaymentInstructions, getEventPaymentReceipt, getEventPaymentSummary,
  getEventSettlement, listEventPayments, listEventRefunds, reviewEventPayment,
  submitEventUpiPayment,
} from '../services/eventBookings';

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const dateTime = value => value ? new Intl.DateTimeFormat(getLocale(), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
const paymentKey = prefix => `${prefix}-${Date.now()}-${globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)}`;

function Receipt({ receipt, onClose }) {
  useLanguage();
  const download = () => {
    const text = [
      'SUR SHAKTI SOCIETY · EVENT PAYMENT RECEIPT', `Receipt: ${receipt.receiptNumber}`,
      `Event: ${receipt.eventTitle}`, `Booking: #${receipt.bookingId}`,
      `Amount: INR ${receipt.amount}`, `Method: ${uiText(receipt.method)}`,
      `Reference: ${receipt.transactionReference || 'Cash'}`, `Paid: ${dateTime(receipt.paidAt)}`,
      `Verified: ${dateTime(receipt.verifiedAt)}`,
    ].join('\n');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${receipt.receiptNumber}.txt`; anchor.click(); URL.revokeObjectURL(url);
  };
  return <div className="event-receipt" role="dialog" aria-modal="true" aria-labelledby="event-receipt-title">
    <div className="event-receipt-sheet"><button className="receipt-close" type="button" onClick={onClose} aria-label={uiText("Close receipt")}>×</button><FaCheckCircle className="receipt-seal" /><span className="event-section-kicker">{uiText("Payment verified")}</span><h3 id="event-receipt-title">{uiText("Event payment receipt")}</h3><strong className="receipt-amount">{money(receipt.amount)}</strong><dl><div><dt>{uiText("Receipt")}</dt><dd>{receipt.receiptNumber}</dd></div><div><dt>{uiText("Event")}</dt><dd>{receipt.eventTitle}</dd></div><div><dt>{uiText("Method")}</dt><dd>{uiText(receipt.method)}</dd></div><div><dt>{uiText("Reference")}</dt><dd>{receipt.transactionReference || uiText("Cash payment")}</dd></div><div><dt>{uiText("Paid on")}</dt><dd>{dateTime(receipt.paidAt)}</dd></div></dl><button type="button" className="payment-primary" onClick={download}><FaDownload />{' ' + uiText("Download receipt")}</button></div>
  </div>;
}

export default function EventPaymentPanel({ booking, isStaff, onChanged }) {
  useLanguage();
  const [summary, setSummary] = useState(null);
  const [instructions, setInstructions] = useState(null);
  const [payments, setPayments] = useState([]);
  const [settlement, setSettlement] = useState(null);
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [reference, setReference] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [settlementForm, setSettlementForm] = useState({ chairsReturned: booking.chairQuantity || 0, deductions: 0, cancellationCharge: 0, notes: '' });
  const [refundForm, setRefundForm] = useState({ method: 'UPI', recipient: '', transactionReference: '', confirmation: '' });

  const bookingStatus = String(booking.status).toLowerCase();
  const cancelled = bookingStatus === 'cancelled';
  const canSettle = isStaff && !settlement && ((cancelled && Number(summary?.verifiedPayments) > 0) || (bookingStatus === 'approved' && new Date(booking.endsAt) <= new Date()));
  const load = useCallback(async () => {
    setLoading(true); setError('');
    const optional = async (request, fallback) => { try { return await request(); } catch (e) { if ([404, 409].includes(e?.response?.status)) return fallback; throw e; } };
    try {
      const [nextSummary, nextPayments, nextSettlement, nextRefunds] = await Promise.all([
        getEventPaymentSummary(booking.id), listEventPayments(booking.id),
        optional(() => getEventSettlement(booking.id), null), listEventRefunds(booking.id),
      ]);
      const nextInstructions = bookingStatus === 'awaitingpayment' || nextSettlement
        ? await optional(() => getEventPaymentInstructions(booking.id), null) : null;
      setSummary(nextSummary); setPayments(nextPayments); setSettlement(nextSettlement); setRefunds(nextRefunds); setInstructions(nextInstructions);
    } catch (e) { setError(getApiErrorMessage(e, 'Could not load event payment details.')); }
    finally { setLoading(false); }
  }, [booking.id, bookingStatus]);
  useEffect(() => { load(); }, [load]);

  const pending = payments.find(item => String(item.status).toLowerCase() === 'submitted');
  const paymentDeadline = booking.paymentDeadline && new Date(booking.paymentDeadline);
  const deadlinePassed = paymentDeadline && paymentDeadline <= new Date();
  const refundRemaining = Number(summary?.refundRemaining || 0);
  const eventUpiUri = instructions ? createSocietyUpiUri(instructions.amount, `Event booking #${booking.id}`) : '';
  const paymentProgress = useMemo(() => {
    const total = Number(summary?.bookingCharge || 0) + Number(summary?.deposit || 0);
    return total ? Math.min(100, Math.round(Number(summary?.verifiedPayments || 0) / total * 100)) : 100;
  }, [summary]);

  const run = async (key, action, success) => {
    setBusy(key);
    try { await action(); toast.success(success); await load(); await onChanged?.(); }
    catch (e) { toast.error(getApiErrorMessage(e)); }
    finally { setBusy(''); }
  };
  const submitUpi = event => {
    event.preventDefault();
    run('upi', () => submitEventUpiPayment(booking.id, { amount: Number(instructions.amount), idempotencyKey: paymentKey(`event-${booking.id}`), transactionReference: reference.trim(), paidAt: new Date().toISOString() }), 'Payment submitted for verification.');
  };
  const collectCash = () => run('cash', () => collectEventCashPayment(booking.id, { amount: Number(summary.balanceDue), idempotencyKey: paymentKey(`cash-${booking.id}`), paidAt: new Date().toISOString() }), 'Cash payment recorded and verified.');
  const review = (payment, verify) => {
    const notes = verify ? null : window.prompt(uiText("Reason for rejecting this payment:"));
    if (!verify && !notes) return;
    run(`review-${payment.id}`, () => reviewEventPayment(booking.id, payment.id, { verify, notes }), verify ? 'Payment verified.' : 'Payment rejected.');
  };
  const openReceipt = async payment => {
    setBusy(`receipt-${payment.id}`);
    try { setReceipt(await getEventPaymentReceipt(booking.id, payment.id)); }
    catch (e) { toast.error(getApiErrorMessage(e, 'Could not load receipt.')); }
    finally { setBusy(''); }
  };
  const submitSettlement = event => {
    event.preventDefault();
    const payload = { chairsReturned: Number(settlementForm.chairsReturned), deductions: Number(settlementForm.deductions), notes: settlementForm.notes.trim() };
    if (String(booking.status).toLowerCase() === 'cancelled') payload.cancellationCharge = Number(settlementForm.cancellationCharge);
    run('settlement', () => createEventSettlement(booking.id, payload), 'Inspection and settlement recorded.');
  };
  const submitRefund = event => {
    event.preventDefault();
    const payload = { ...refundForm, amount: refundRemaining, idempotencyKey: paymentKey(`refund-${booking.id}`), paidAt: new Date().toISOString(), transactionReference: refundForm.method === 'UPI' ? refundForm.transactionReference.trim() : null };
    run('refund', () => createEventRefund(booking.id, payload), 'Refund payout recorded.');
  };

  if (loading) return <div className="event-payment-loading"><FaSpinner className="spin" />{' ' + uiText("Loading payment journey…")}</div>;
  if (error) return <div className="event-payment-error"><FaExclamationCircle /><span>{error}</span><button type="button" onClick={load}>{uiText("Retry")}</button></div>;
  if (cancelled && !settlement && payments.length === 0 && refunds.length === 0 && !Number(summary?.verifiedPayments) && !Number(summary?.refunded)) {
    return <p className="event-form-note">{uiText("No payment required. This booking was cancelled without payment.")}</p>;
  }
  return <div className="event-payment-workspace">
    {cancelled && !settlement && <p className="event-form-note">{uiText("This booking is cancelled. Existing payments remain below for verification and any applicable refund.")}</p>}
    {(!cancelled || settlement) && <div className="payment-overview">
      <div className="payment-overview-copy"><span className="event-section-kicker">{uiText("Payment & settlement")}</span><h4>{summary.paymentStatus === 'Paid' ? uiText("Payment complete") : summary.paymentStatus === 'Submitted' ? uiText("Verification in progress") : uiText("{{v0}} due", { v0: money(summary.balanceDue) })}</h4><p>{pending ? uiText("The committee is checking the submitted payment.") : summary.paymentStatus === 'Paid' ? uiText("Your booking payment is verified.") : settlement ? uiText("This balance is due after the final inspection.") : deadlinePassed ? uiText("The payment deadline has passed. Contact the committee.") : uiText("Pay before {{v0}} to confirm this booking.", { v0: dateTime(booking.paymentDeadline) })}</p></div>
      <div className={`payment-state-icon state-${String(summary.paymentStatus).toLowerCase()}`}>{summary.paymentStatus === 'Paid' ? <FaCheck /> : summary.paymentStatus === 'Submitted' ? <FaClock /> : <FaMoneyBillWave />}</div>
      <div className="payment-progress"><span style={{ width: `${paymentProgress}%` }} /></div>
      <dl className="payment-totals"><div><dt>{uiText("Booking fee")}</dt><dd>{money(summary.bookingCharge)}</dd></div><div><dt>{uiText("Refundable deposit")}</dt><dd>{money(summary.deposit)}</dd></div><div><dt>{uiText("Verified")}</dt><dd>{money(summary.verifiedPayments)}</dd></div><div className="payment-balance"><dt>{uiText("Balance")}</dt><dd>{money(summary.balanceDue)}</dd></div></dl>
    </div>}

    {!isStaff && instructions && Number(instructions.amount) > 0 && !pending && (!deadlinePassed || settlement) && <form className="upi-payment-card" onSubmit={submitUpi}>
      <div className="upi-qr"><QRCode value={eventUpiUri} size={164} /><span><FaQrcode />{' ' + uiText("Scan with any UPI app")}</span></div>
      <div className="upi-payment-form"><span className="event-section-kicker">{uiText("Secure UPI handoff")}</span><h4>{uiText("Pay") + ' '}{money(instructions.amount)}</h4><p>{uiText("Pay to") + ' '}<strong>{SOCIETY_NAME}</strong> · {SOCIETY_UPI_ID}{uiText(". Then enter the UTR shown in your app.")}</p><a className="payment-secondary" href={eventUpiUri}>{uiText("Open UPI app")}</a><label htmlFor={`event-utr-${booking.id}`}>{uiText("UPI transaction reference")}</label><input id={`event-utr-${booking.id}`} value={reference} maxLength="100" required onChange={event => setReference(event.target.value)} placeholder={uiText("12-digit UTR / reference")} /><button className="payment-primary" disabled={busy === 'upi'}>{busy === 'upi' ? <FaSpinner className="spin" /> : <FaCheckCircle />}{' ' + uiText("Submit for verification")}</button><small>{uiText("No automatic charge is initiated. Submit only after completing payment in your UPI app.")}</small></div>
    </form>}

    {isStaff && Number(summary.balanceDue) > 0 && instructions && !pending && (!deadlinePassed || settlement) && <div className="staff-cash-card"><span><FaMoneyBillWave /><span><strong>{uiText("Resident paying by cash?")}</strong><small>{uiText("Collect the exact outstanding balance:") + ' '}{money(summary.balanceDue)}</small></span></span><button type="button" disabled={busy === 'cash'} onClick={collectCash}>{uiText("Record cash & issue receipt")}</button></div>}

    {payments.length > 0 && <section className="event-ledger"><div className="payment-section-title"><span><FaReceipt /></span><div><h4>{uiText("Payment activity")}</h4><p>{uiText("References and committee verification")}</p></div></div><div className="event-ledger-list">{payments.map(payment => <div key={payment.id}><span className={`ledger-status ${String(payment.status).toLowerCase()}`}>{uiText(payment.status)}</span><span><strong>{money(payment.amount)} · {uiText(payment.method)}</strong><small>{payment.transactionReference || uiText("Cash")} · {dateTime(payment.paidAt)}</small>{payment.notes && <small className="ledger-note">{payment.notes}</small>}</span><span className="ledger-actions">{isStaff && payment.status === 'Submitted' && <><button type="button" className="verify" onClick={() => review(payment, true)} disabled={Boolean(busy)}>{uiText("Verify")}</button><button type="button" className="reject" onClick={() => review(payment, false)} disabled={Boolean(busy)}>{uiText("Reject")}</button></>}{payment.status === 'Verified' && <button type="button" onClick={() => openReceipt(payment)} disabled={busy === `receipt-${payment.id}`}><FaReceipt />{' ' + uiText("Receipt")}</button>}</span></div>)}</div></section>}

    {settlement && <section className="settlement-result"><div className="payment-section-title"><span><FaChair /></span><div><h4>{uiText("Final inspection")}</h4><p>{settlement.chairsReturned}{' ' + uiText("of") + ' '}{booking.chairQuantity || 0}{' ' + uiText("chairs returned")}</p></div></div><div className="settlement-numbers"><span><small>{uiText("Deductions")}</small><strong>{money(settlement.deductions)}</strong></span><span><small>{uiText("Refund due")}</small><strong>{money(settlement.refundDue)}</strong></span><span><small>{uiText("Additional due")}</small><strong>{money(settlement.additionalDue)}</strong></span></div><p>{settlement.notes}</p></section>}

    {canSettle && <form className="settlement-form" onSubmit={submitSettlement}><div className="payment-section-title"><span><FaCheckCircle /></span><div><h4>{uiText("Complete final inspection")}</h4><p>{uiText("Record returned chairs and any approved deductions.")}</p></div></div><div className="payment-form-grid"><label>{uiText("Chairs returned")}<input type="number" min="0" max={booking.chairQuantity || 0} value={settlementForm.chairsReturned} onChange={e => setSettlementForm({ ...settlementForm, chairsReturned: e.target.value })} required /></label><label>{uiText("Deductions (₹)")}<input type="number" min="0" step="0.01" value={settlementForm.deductions} onChange={e => setSettlementForm({ ...settlementForm, deductions: e.target.value })} required /></label>{String(booking.status).toLowerCase() === 'cancelled' && <label>{uiText("Retained cancellation fee (₹)")}<input type="number" min="0" max={booking.bookingCharge} step="0.01" value={settlementForm.cancellationCharge} onChange={e => setSettlementForm({ ...settlementForm, cancellationCharge: e.target.value })} required /></label>}<label className="wide">{uiText("Inspection notes")}<textarea rows="3" maxLength="1000" value={settlementForm.notes} onChange={e => setSettlementForm({ ...settlementForm, notes: e.target.value })} required placeholder={uiText("Chair condition, cleaning, damage, or cancellation decision")} /></label></div><button className="payment-primary" disabled={busy === 'settlement'}>{uiText("Save final settlement")}</button></form>}

    {isStaff && settlement && refundRemaining > 0 && <form className="refund-form" onSubmit={submitRefund}><div className="payment-section-title"><span><FaUndoAlt /></span><div><h4>{uiText("Record refund payout")}</h4><p>{money(refundRemaining)}{' ' + uiText("remains to be refunded")}</p></div></div><div className="payment-form-grid"><label>{uiText("Method")}<select value={refundForm.method} onChange={e => setRefundForm({ ...refundForm, method: e.target.value })}><option value="UPI">{uiText("UPI")}</option><option value="Cash">{uiText("Cash")}</option></select></label><label>{uiText("Recipient")}<input maxLength="300" value={refundForm.recipient} onChange={e => setRefundForm({ ...refundForm, recipient: e.target.value })} required placeholder={uiText("Resident name / UPI recipient")} /></label>{refundForm.method === 'UPI' && <label>{uiText("Transaction reference")}<input maxLength="100" value={refundForm.transactionReference} onChange={e => setRefundForm({ ...refundForm, transactionReference: e.target.value })} required /></label>}<label className="wide">{uiText("Payout confirmation")}<textarea rows="2" maxLength="1000" value={refundForm.confirmation} onChange={e => setRefundForm({ ...refundForm, confirmation: e.target.value })} required placeholder={uiText("Acknowledgment or payout confirmation")} /></label></div><button className="payment-primary" disabled={busy === 'refund'}>{uiText("Record") + ' '}{money(refundRemaining)}{' ' + uiText("refund")}</button></form>}

    {refunds.length > 0 && <div className="refund-history"><strong>{uiText("Refund history")}</strong>{refunds.map(item => <span key={item.id}>{money(item.amount)}{' ' + uiText("via") + ' '}{uiText(item.method)} · {dateTime(item.paidAt)}</span>)}</div>}
    {receipt && <Receipt receipt={receipt} onClose={() => setReceipt(null)} />}
  </div>;
}
