import { paymentStatusLabel } from '../utils/billing';
import { useEffect, useState } from 'react';
import api, { getApiErrorMessage, openAuthenticatedFile } from '../services/api';
import { money, paymentHistory } from '../services/maintenance';
import { Field, ErrorMessage, Status } from './MaintenanceUI';
import ReceiptModal from './ReceiptModal';

export default function PaymentActivity() {
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [history, setHistory] = useState({ items: [], totalCount: 0 });
  const [skip, setSkip] = useState(0);
  const [filters, setFilters] = useState({ billId: '', flatNo: '', status: '' });
  const [query, setQuery] = useState({});
  const [historyBusy, setHistoryBusy] = useState(true);
  const [historyError, setHistoryError] = useState('');
  useEffect(() => {
    let active = true;
    setHistoryBusy(true); setHistoryError('');
    paymentHistory({ ...query, skip }).then(data => {
      if (active) setHistory(data);
    }).catch(err => { if (active) { setHistoryError(getApiErrorMessage(err)); setHistory({ items: [], totalCount: 0 }); } })
      .finally(() => { if (active) setHistoryBusy(false); });
    return () => { active = false; };
  }, [query, skip, refreshVersion]);
  const [id, setId] = useState('');
  const [found, setFound] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lookup = async e => {
    e.preventDefault(); setBusy(true); setError(''); setFound(null);
    try { const { data } = await api.get('/payment-transactions/' + id); setFound(data); }
    catch (err) { setError(getApiErrorMessage(err)); } finally { setBusy(false); }
  };
  const showReceipt = async transaction => {
    setBusy(true); setError('');
    try {
      const { data } = await api.get('/payment-transactions/' + transaction.transactionId + '/receipt');
      if (!data.receiptNumber) throw new Error('The server did not return a verified receipt.');
      setReceipt(data);
    } catch (err) { setError(getApiErrorMessage(err)); } finally { setBusy(false); }
  };
  const rows = [...history.items];
  if (found && !rows.some(t => t.transactionId === found.transactionId)) rows.unshift(found);
  return <section className="card p-3 rounded-4 mb-4">
    <div className="d-flex flex-wrap justify-content-between gap-2 mb-2"><h3 className="h5 mb-0">Payments</h3><button className="btn btn-outline-primary btn-sm" disabled={historyBusy} onClick={() => setRefreshVersion(value => value + 1)}>Refresh payments</button></div>
    <p className="small text-muted">Payment history is available across devices. You can also look up a payment ID supplied by the society office. Private proof and receipts are available only to the payer and staff.</p>
    <ErrorMessage error={historyError} />
    <ErrorMessage error={error} />
    <form className="maintenance-form-grid mb-3" onSubmit={e => {
      e.preventDefault(); setSkip(0); setFound(null);
      setQuery({ billId: filters.billId || undefined, flatNo: filters.flatNo.trim().toUpperCase() || undefined, status: filters.status || undefined });
    }}>
      <Field label="Filter by bill ID"><input className="form-control" type="number" min="1" step="1" value={filters.billId} onChange={e => setFilters({ ...filters, billId: e.target.value })} /></Field>
      <Field label="Filter by row house"><input className="form-control" maxLength={100} value={filters.flatNo} onChange={e => setFilters({ ...filters, flatNo: e.target.value })} /></Field>
      <Field label="Payment status"><select className="form-select" value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}><option value="">All statuses</option>{['Created', 'Submitted', 'Verified', 'Rejected', 'Failed', 'Synced'].map(status => <option key={status} value={status}>{paymentStatusLabel(status)}</option>)}</select></Field>
      <button className="btn btn-outline-primary" disabled={historyBusy}>Apply filters</button>
    </form>
    <p role="status" style={{ minHeight: '1.5em' }}>{historyBusy ? 'Loading payment history…' : !historyError && !history.items.length ? 'No payments match these filters.' : '\u00a0'}</p>
    <form onSubmit={lookup} className="d-flex flex-wrap align-items-end gap-2 mb-3"><Field label="Payment ID"><input className="form-control" type="number" min="1" step="1" required value={id} onChange={e => setId(e.target.value)} /></Field><button className="btn btn-outline-primary" disabled={busy}>Find payment</button></form>
    {rows.map(t => <article className="border rounded-3 p-3 mb-2" key={t.transactionId}>
      <div className="d-flex justify-content-between gap-2"><strong>Payment #{t.transactionId} · Bill #{t.billId}</strong><Status value={t.status} /></div>
      <p className="small my-2">{money(t.amountPaid)} · {t.transactionReferenceId || 'Reference not submitted'}</p>
      {t.failureReason && <p className="small text-danger">{t.failureReason}</p>}
      {t.status === 'Rejected' && <p className="small text-muted">Rejected payments cannot be retried. Submit a corrected payment with a new reference; rejected references remain reserved.</p>}
      {(t.proofAvailable ?? Boolean(t.proofUrl)) && <button className="btn btn-outline-secondary me-2" disabled={busy} onClick={() => openAuthenticatedFile('/payment-transactions/' + t.transactionId + '/proof').catch(err => setError(getApiErrorMessage(err)))}>View proof</button>}
      {(t.receiptAvailable ?? ['Verified', 'Synced'].includes(t.status)) && <button className="btn btn-outline-primary" disabled={busy} onClick={() => showReceipt(t)}>Receipt</button>}
    </article>)}
    <div className="d-flex flex-wrap gap-2 align-items-center mt-3" aria-label="Payment history pages">
      <button className="btn btn-outline-secondary" disabled={historyBusy || !skip} onClick={() => setSkip(Math.max(0, skip - 50))}>Previous payments</button>
      <span className="small">Page {skip / 50 + 1} · {history.totalCount} payments</span>
      <button className="btn btn-outline-secondary" disabled={historyBusy || Boolean(historyError) || skip + 50 >= history.totalCount} onClick={() => setSkip(skip + 50)}>Next payments</button>
    </div>
    {receipt && <ReceiptModal bill={{ ...receipt, amount: receipt.amountPaid, paymentDate: receipt.issuedAt }} receipt={receipt} onClose={() => setReceipt(null)} />}
  </section>;
}
