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
const dateTime = value => value ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
const paymentKey = prefix => `${prefix}-${Date.now()}-${globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)}`;

function Receipt({ receipt, onClose }) {
  const download = () => {
    const text = [
      'SUR SHAKTI SOCIETY · EVENT PAYMENT RECEIPT', `Receipt: ${receipt.receiptNumber}`,
      `Event: ${receipt.eventTitle}`, `Booking: #${receipt.bookingId}`,
      `Amount: INR ${receipt.amount}`, `Method: ${receipt.method}`,
      `Reference: ${receipt.transactionReference || 'Cash'}`, `Paid: ${dateTime(receipt.paidAt)}`,
      `Verified: ${dateTime(receipt.verifiedAt)}`,
    ].join('\n');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${receipt.receiptNumber}.txt`; anchor.click(); URL.revokeObjectURL(url);
  };
  return <div className="event-receipt" role="dialog" aria-modal="true" aria-labelledby="event-receipt-title">
    <div className="event-receipt-sheet"><button className="receipt-close" type="button" onClick={onClose} aria-label="Close receipt">×</button><FaCheckCircle className="receipt-seal" /><span className="event-section-kicker">Payment verified</span><h3 id="event-receipt-title">Event payment receipt</h3><strong className="receipt-amount">{money(receipt.amount)}</strong><dl><div><dt>Receipt</dt><dd>{receipt.receiptNumber}</dd></div><div><dt>Event</dt><dd>{receipt.eventTitle}</dd></div><div><dt>Method</dt><dd>{receipt.method}</dd></div><div><dt>Reference</dt><dd>{receipt.transactionReference || 'Cash payment'}</dd></div><div><dt>Paid on</dt><dd>{dateTime(receipt.paidAt)}</dd></div></dl><button type="button" className="payment-primary" onClick={download}><FaDownload /> Download receipt</button></div>
  </div>;
}

export default function EventPaymentPanel({ booking, isStaff, onChanged }) {
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
    const notes = verify ? null : window.prompt('Reason for rejecting this payment:');
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

  if (loading) return <div className="event-payment-loading"><FaSpinner className="spin" /> Loading payment journey…</div>;
  if (error) return <div className="event-payment-error"><FaExclamationCircle /><span>{error}</span><button type="button" onClick={load}>Retry</button></div>;
  if (cancelled && !settlement && payments.length === 0 && refunds.length === 0 && !Number(summary?.verifiedPayments) && !Number(summary?.refunded)) {
    return <p className="event-form-note">No payment required. This booking was cancelled without payment.</p>;
  }
  return <div className="event-payment-workspace">
    {cancelled && !settlement && <p className="event-form-note">This booking is cancelled. Existing payments remain below for verification and any applicable refund.</p>}
    {(!cancelled || settlement) && <div className="payment-overview">
      <div className="payment-overview-copy"><span className="event-section-kicker">Payment & settlement</span><h4>{summary.paymentStatus === 'Paid' ? 'Payment complete' : summary.paymentStatus === 'Submitted' ? 'Verification in progress' : `${money(summary.balanceDue)} due`}</h4><p>{pending ? 'The committee is checking the submitted payment.' : summary.paymentStatus === 'Paid' ? 'Your booking payment is verified.' : settlement ? 'This balance is due after the final inspection.' : deadlinePassed ? 'The payment deadline has passed. Contact the committee.' : `Pay before ${dateTime(booking.paymentDeadline)} to confirm this booking.`}</p></div>
      <div className={`payment-state-icon state-${String(summary.paymentStatus).toLowerCase()}`}>{summary.paymentStatus === 'Paid' ? <FaCheck /> : summary.paymentStatus === 'Submitted' ? <FaClock /> : <FaMoneyBillWave />}</div>
      <div className="payment-progress"><span style={{ width: `${paymentProgress}%` }} /></div>
      <dl className="payment-totals"><div><dt>Booking fee</dt><dd>{money(summary.bookingCharge)}</dd></div><div><dt>Refundable deposit</dt><dd>{money(summary.deposit)}</dd></div><div><dt>Verified</dt><dd>{money(summary.verifiedPayments)}</dd></div><div className="payment-balance"><dt>Balance</dt><dd>{money(summary.balanceDue)}</dd></div></dl>
    </div>}

    {!isStaff && instructions && Number(instructions.amount) > 0 && !pending && (!deadlinePassed || settlement) && <form className="upi-payment-card" onSubmit={submitUpi}>
      <div className="upi-qr"><QRCode value={eventUpiUri} size={164} /><span><FaQrcode /> Scan with any UPI app</span></div>
      <div className="upi-payment-form"><span className="event-section-kicker">Secure UPI handoff</span><h4>Pay {money(instructions.amount)}</h4><p>Pay to <strong>{SOCIETY_NAME}</strong> · {SOCIETY_UPI_ID}. Then enter the UTR shown in your app.</p><a className="payment-secondary" href={eventUpiUri}>Open UPI app</a><label htmlFor={`event-utr-${booking.id}`}>UPI transaction reference</label><input id={`event-utr-${booking.id}`} value={reference} maxLength="100" required onChange={event => setReference(event.target.value)} placeholder="12-digit UTR / reference" /><button className="payment-primary" disabled={busy === 'upi'}>{busy === 'upi' ? <FaSpinner className="spin" /> : <FaCheckCircle />} Submit for verification</button><small>No automatic charge is initiated. Submit only after completing payment in your UPI app.</small></div>
    </form>}

    {isStaff && Number(summary.balanceDue) > 0 && instructions && !pending && (!deadlinePassed || settlement) && <div className="staff-cash-card"><span><FaMoneyBillWave /><span><strong>Resident paying by cash?</strong><small>Collect the exact outstanding balance: {money(summary.balanceDue)}</small></span></span><button type="button" disabled={busy === 'cash'} onClick={collectCash}>Record cash & issue receipt</button></div>}

    {payments.length > 0 && <section className="event-ledger"><div className="payment-section-title"><span><FaReceipt /></span><div><h4>Payment activity</h4><p>References and committee verification</p></div></div><div className="event-ledger-list">{payments.map(payment => <div key={payment.id}><span className={`ledger-status ${String(payment.status).toLowerCase()}`}>{payment.status}</span><span><strong>{money(payment.amount)} · {payment.method}</strong><small>{payment.transactionReference || 'Cash'} · {dateTime(payment.paidAt)}</small>{payment.notes && <small className="ledger-note">{payment.notes}</small>}</span><span className="ledger-actions">{isStaff && payment.status === 'Submitted' && <><button type="button" className="verify" onClick={() => review(payment, true)} disabled={Boolean(busy)}>Verify</button><button type="button" className="reject" onClick={() => review(payment, false)} disabled={Boolean(busy)}>Reject</button></>}{payment.status === 'Verified' && <button type="button" onClick={() => openReceipt(payment)} disabled={busy === `receipt-${payment.id}`}><FaReceipt /> Receipt</button>}</span></div>)}</div></section>}

    {settlement && <section className="settlement-result"><div className="payment-section-title"><span><FaChair /></span><div><h4>Final inspection</h4><p>{settlement.chairsReturned} of {booking.chairQuantity || 0} chairs returned</p></div></div><div className="settlement-numbers"><span><small>Deductions</small><strong>{money(settlement.deductions)}</strong></span><span><small>Refund due</small><strong>{money(settlement.refundDue)}</strong></span><span><small>Additional due</small><strong>{money(settlement.additionalDue)}</strong></span></div><p>{settlement.notes}</p></section>}

    {canSettle && <form className="settlement-form" onSubmit={submitSettlement}><div className="payment-section-title"><span><FaCheckCircle /></span><div><h4>Complete final inspection</h4><p>Record returned chairs and any approved deductions.</p></div></div><div className="payment-form-grid"><label>Chairs returned<input type="number" min="0" max={booking.chairQuantity || 0} value={settlementForm.chairsReturned} onChange={e => setSettlementForm({ ...settlementForm, chairsReturned: e.target.value })} required /></label><label>Deductions (₹)<input type="number" min="0" step="0.01" value={settlementForm.deductions} onChange={e => setSettlementForm({ ...settlementForm, deductions: e.target.value })} required /></label>{String(booking.status).toLowerCase() === 'cancelled' && <label>Retained cancellation fee (₹)<input type="number" min="0" max={booking.bookingCharge} step="0.01" value={settlementForm.cancellationCharge} onChange={e => setSettlementForm({ ...settlementForm, cancellationCharge: e.target.value })} required /></label>}<label className="wide">Inspection notes<textarea rows="3" maxLength="1000" value={settlementForm.notes} onChange={e => setSettlementForm({ ...settlementForm, notes: e.target.value })} required placeholder="Chair condition, cleaning, damage, or cancellation decision" /></label></div><button className="payment-primary" disabled={busy === 'settlement'}>Save final settlement</button></form>}

    {isStaff && settlement && refundRemaining > 0 && <form className="refund-form" onSubmit={submitRefund}><div className="payment-section-title"><span><FaUndoAlt /></span><div><h4>Record refund payout</h4><p>{money(refundRemaining)} remains to be refunded</p></div></div><div className="payment-form-grid"><label>Method<select value={refundForm.method} onChange={e => setRefundForm({ ...refundForm, method: e.target.value })}><option>UPI</option><option>Cash</option></select></label><label>Recipient<input maxLength="300" value={refundForm.recipient} onChange={e => setRefundForm({ ...refundForm, recipient: e.target.value })} required placeholder="Resident name / UPI recipient" /></label>{refundForm.method === 'UPI' && <label>Transaction reference<input maxLength="100" value={refundForm.transactionReference} onChange={e => setRefundForm({ ...refundForm, transactionReference: e.target.value })} required /></label>}<label className="wide">Payout confirmation<textarea rows="2" maxLength="1000" value={refundForm.confirmation} onChange={e => setRefundForm({ ...refundForm, confirmation: e.target.value })} required placeholder="Acknowledgment or payout confirmation" /></label></div><button className="payment-primary" disabled={busy === 'refund'}>Record {money(refundRemaining)} refund</button></form>}

    {refunds.length > 0 && <div className="refund-history"><strong>Refund history</strong>{refunds.map(item => <span key={item.id}>{money(item.amount)} via {item.method} · {dateTime(item.paidAt)}</span>)}</div>}
    {receipt && <Receipt receipt={receipt} onClose={() => setReceipt(null)} />}
  </div>;
}
