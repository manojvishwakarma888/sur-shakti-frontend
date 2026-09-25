import BillCreditSummary from './BillCreditSummary';
import { billPayableAmount } from '../utils/billing';
import { validateProof } from '../services/maintenance';
import { useEffect, useRef, useState } from 'react';
import QRCode from 'react-qr-code';
import { FaTimes, FaCopy } from 'react-icons/fa';
import { createSocietyUpiUri, SOCIETY_NAME, SOCIETY_UPI_ID } from '../utils/upi';

export default function PaymentModal({ bill, onClose, onPaymentComplete }) {
  const dialog = useRef(null);
  const busy = useRef(false);
  const [proof, setProof] = useState(null);
  const [step, setStep] = useState(1);
  const [transactionId, setTransactionId] = useState('');
  const [error, setError] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const amount = billPayableAmount(bill);
  const month = bill.month || bill.Month || '';
  const type = bill.billType || bill.BillType || 'Maintenance';
  const upiString = createSocietyUpiUri(amount, `${type} ${month}`);

  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement;
    const overflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      previousFocus?.focus();
    };
  }, []);

  const copyUpi = async () => {
    try {
      await navigator.clipboard.writeText(SOCIETY_UPI_ID);
      setCopyStatus('UPI ID copied.');
    } catch {
      setCopyStatus('Unable to copy. Select and copy the UPI ID above.');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (busy.current) return;
    const reference = transactionId.trim().toUpperCase().replace(/\s+/g, '');
    if (!reference || reference.length > 100) {
      setError('Enter the payment reference from your payment app (up to 100 characters).');
      return;
    }
    busy.current = true;
    setSubmitting(true);
    setError('');
    try {
      await onPaymentComplete({
        billId: bill.billId || bill.BillId, transactionId: reference, amount, month, proof,
      });
    } catch (failure) {
      setError(failure.message || 'Unable to submit. Please try again.');
    } finally {
      busy.current = false;
      setSubmitting(false);
    }
  };

  return (
    <dialog ref={dialog} className="payment-dialog" aria-labelledby="payment-title"
      onCancel={event => { event.preventDefault(); if (!busy.current) onClose(); }}>
      <div className="payment-heading">
        <div>
          <p className="text-muted small mb-1">Sur Shakti Residency</p>
          <h2 id="payment-title" className="h5 fw-bold mb-0">Pay your bill</h2>
        </div>
        <button type="button" className="btn btn-light icon-button" aria-label="Close payment"
          disabled={submitting} onClick={onClose}><FaTimes /></button>
      </div>
      <div className="payment-body">
        <div className="payment-amount">
          <span className="text-muted small">{type}{month ? ' · ' + month : ''}</span>
          <strong>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(amount))}</strong>
          <BillCreditSummary bill={bill} />
        </div>
        <ol className="payment-steps" aria-label="Payment steps">
          <li aria-current={step === 1 ? 'step' : undefined}>1. Make payment</li>
          <li aria-current={step === 2 ? 'step' : undefined}>2. Submit reference</li>
        </ol>
        {step === 1 ? (
          <>
            <a className="btn btn-primary w-100 payment-open-app" href={upiString}>Open UPI app</a>
            <p className="small text-muted text-center mt-2">Or scan this QR code with another device.</p>
            <div className="payment-qr"><QRCode value={upiString} size={164} /></div>
            <div className="payment-upi">
              <span>{SOCIETY_UPI_ID}</span>
              <button type="button" className="btn btn-light icon-button" aria-label="Copy UPI ID" onClick={copyUpi}><FaCopy /></button>
            </div>
            <p className="small text-muted mb-3" role="status">{copyStatus}</p>
            <button type="button" className="btn btn-primary w-100" onClick={() => setStep(2)}>I've paid — add reference</button>
            <p className="small text-muted text-center mt-3 mb-0">Already paid? Add your reference without paying again.</p>
          </>
        ) : (
          <form onSubmit={handleSubmit} aria-busy={submitting}>
            <label htmlFor="payment-utr" className="form-label fw-semibold">Payment reference (UTR)</label>
            <input autoFocus id="payment-utr" className="form-control" value={transactionId}
              onChange={event => { setTransactionId(event.target.value); setError(''); }}
              placeholder="e.g. 302518291029" autoComplete="off" autoCapitalize="characters"
              spellCheck={false} maxLength={100} required disabled={submitting}
              aria-invalid={Boolean(error)} aria-describedby="payment-help payment-error" />
            <p id="payment-help" className="small text-muted mt-2">Find this in your payment app's transaction details. The society office will check your payment before marking the bill paid.</p>
            <label className="form-label" htmlFor="payment-proof">Payment proof (optional)</label>
            <input id="payment-proof" type="file" className="form-control mb-2" accept="image/jpeg,image/png,image/webp,application/pdf" disabled={submitting}
              onChange={event => {
                const file = event.target.files?.[0] || null;
                const message = validateProof(file);
                setError(message);
                if (message) { event.target.value = ''; setProof(null); } else setProof(file);
              }} />
            <p className="small text-muted">JPEG, PNG, WebP or PDF, up to 5 MB. Proof uploads before your payment is submitted.</p>
            <p id="payment-error" className="small text-danger" role="alert">{error}</p>
            <div className="d-flex gap-2">
              <button type="button" className="btn btn-outline-secondary" disabled={submitting} onClick={() => setStep(1)}>Back</button>
              <button type="submit" className="btn btn-primary flex-grow-1" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit for review'}
              </button>
            </div>
            <p className="small text-muted mt-3 mb-0" role="status">{submitting ? 'Sending your reference. Please keep this window open.' : ''}</p>
          </form>
        )}
      </div>
    </dialog>
  );
}
