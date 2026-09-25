import { paymentStatusLabel } from '../utils/billing';
import { useCallback, useContext, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api, { getApiErrorMessage, openAuthenticatedFile } from '../services/api';
import { noRetry, staffRole } from '../services/maintenance';
import { toast } from 'react-toastify';
import BillingNavigation from '../components/BillingNavigation';

export default function PaymentReview() {
  const { user } = useContext(AuthContext);
  return staffRole(user) ? <ReviewQueue /> : <Navigate to="/my-bills" replace />;
}

function ReviewQueue() {
  const [pendingVerifications, setPendingVerifications] = useState([]);
  const [verificationNotes, setVerificationNotes] = useState({});
  const [verificationBusyId, setVerificationBusyId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reminding, setReminding] = useState(false);
  const verifyPaymentTransaction = async ({ paymentTransactionId, isVerified, failureReason = null }) => {
    await api.post(`/payment-transactions/${paymentTransactionId}/verify`, {
      isVerified,
      failureReason,
    });
  };

  const retryPaymentVerification = async ({ paymentTransactionId, reason = null }) => {
    await api.post(`/payment-transactions/admin/${paymentTransactionId}/retry-verification`, {
      reason,
    });
  };

  const fetchPendingVerifications = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const { data } = await api.get('/payment-transactions/admin/pending-verifications');
      if (!Array.isArray(data)) throw new Error('The server returned an unexpected review queue.');
      setPendingVerifications(data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to load payments waiting for verification.'));
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchPendingVerifications(); }, [fetchPendingVerifications]);

  const handleVerifyPayment = async (transaction, isVerified) => {
    const id = transaction.transactionId;
    const note = verificationNotes[id]?.trim();
    if (!isVerified && !note) {
      toast.error('Add a reason before rejecting this payment.');
      return;
    }
    setVerificationBusyId(id);
    try {
      await verifyPaymentTransaction({ paymentTransactionId: id, isVerified, failureReason: isVerified ? null : note });
      toast.success(isVerified ? 'Payment approved.' : 'Payment rejected.');
      setVerificationNotes(current => ({ ...current, [id]: '' }));
      await fetchPendingVerifications();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Unable to verify this payment.'));
    } finally {
      setVerificationBusyId(null);
    }
  };

  const handleRetryVerification = async (transaction) => {
    const id = transaction.transactionId;
    setVerificationBusyId(id);
    try {
      await retryPaymentVerification({ paymentTransactionId: id, reason: verificationNotes[id]?.trim() || null });
      toast.success('Payment sent for review again.');
      await fetchPendingVerifications();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Unable to retry verification.'));
    } finally {
      setVerificationBusyId(null);
    }
  };


  const sendInAppReminders = async () => {
    if (reminding) return;
    setReminding(true);
    try {
      const { data } = await api.post('/Bill/send-reminders', undefined, noRetry);
      toast.success((data.queued ?? 0) + ' reminders sent to resident inboxes.');
    } catch (err) { toast.error(getApiErrorMessage(err)); } finally { setReminding(false); }
  };

  return <div className="bills-screen">
    <div className="page-heading"><div><h2 className="fw-bold mb-1">Payment review</h2><p className="text-muted mb-0">Verify resident payments and follow up on unpaid bills.</p></div>
      <button className="btn btn-outline-primary" disabled={loading || verificationBusyId !== null} onClick={fetchPendingVerifications}>Refresh queue</button>
    </div>
    <BillingNavigation />
    {error && <div className="alert alert-danger" role="alert">{error}</div>}
    {loading && <p role="status">Loading payments to review…</p>}
      {!loading && !error && (
        <section className="card border-0 shadow-sm rounded-4 mb-4" aria-labelledby="verification-title">
          <div className="card-body p-3 p-md-4">
            <div className="d-flex justify-content-between align-items-center gap-3 mb-3">
              <div>
                <h3 id="verification-title" className="h5 fw-bold mb-1">Payments awaiting review</h3>
                <p className="text-muted small mb-0">Review resident references before marking bills paid.</p>
              </div>
              <span className="badge text-bg-primary rounded-pill">{pendingVerifications.length}</span>
            </div>
            {pendingVerifications.length === 0 ? (
              <p className="small text-muted mb-0">No payments are waiting for review.</p>
            ) : (
              <div className="d-grid gap-3">
                {pendingVerifications.map(transaction => {
                  const id = transaction.transactionId;
                  const isFailed = String(transaction.status).toLowerCase() === 'failed';
                  const isRejected = String(transaction.status).toLowerCase() === 'rejected';
                  return (
                    <article key={id} className="border rounded-4 p-3">
                      <div className="d-flex justify-content-between align-items-start gap-3 mb-2">
                        <div>
                          <div className="fw-bold">Payment #{id} · Row house {transaction.flatNo || '—'} · {transaction.billMonth || 'Bill'}</div>
                          <div className="small text-muted">Reference: {transaction.transactionReferenceId || 'Not submitted'} · {transaction.paymentMode || 'Payment'}</div>
                        </div>
                        <div className="text-end">
                          <div className="fw-bold text-primary">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(transaction.amountPaid || 0)}</div>
                          <span className={`badge ${isFailed ? 'text-bg-danger' : 'text-bg-warning'}`}>{paymentStatusLabel(transaction.status)}</span>
                        </div>
                      </div>
                      {transaction.failureReason && <p className="small text-danger mb-2">Last failure: {transaction.failureReason}</p>}
                      <button className="btn btn-outline-secondary btn-sm mb-2" onClick={() => openAuthenticatedFile('/payment-transactions/' + id + '/proof').catch(err => toast.error(err.response?.status === 404 ? 'No proof attached.' : getApiErrorMessage(err)))}>View payment proof</button>
                      {isRejected && <p className="small text-muted">Rejected — a corrected payment needs a new reference.</p>}
                      <label htmlFor={`verification-note-${id}`} className="form-label small fw-semibold mb-1">Review note or rejection reason</label>
                      <input id={`verification-note-${id}`} className="form-control form-control-sm mb-2" maxLength={500} value={verificationNotes[id] || ''} onChange={event => setVerificationNotes(current => ({ ...current, [id]: event.target.value }))} placeholder="Required when rejecting" />
                      <div className="d-flex flex-wrap gap-2">
                        <button className="btn btn-success btn-sm flex-grow-1" disabled={verificationBusyId !== null || isRejected} onClick={() => handleVerifyPayment(transaction, true)}>Approve</button>
                        <button className="btn btn-outline-danger btn-sm flex-grow-1" disabled={verificationBusyId !== null || isRejected} onClick={() => handleVerifyPayment(transaction, false)}>Reject</button>
                        {isFailed && <button className="btn btn-outline-primary btn-sm flex-grow-1" disabled={verificationBusyId !== null} onClick={() => handleRetryVerification(transaction)}>Retry check</button>}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}


    <section className="card p-3 rounded-4"><h3 className="h5">Payment reminders</h3><p className="text-muted small">Send in-app reminders for due and overdue bills. Duplicate daily reminders are skipped.</p>
      <button className="btn btn-outline-primary align-self-start" disabled={reminding} onClick={sendInAppReminders}>{reminding ? 'Sending reminders…' : 'Send reminders'}</button>
    </section>
  </div>;
}
