import React, { useEffect, useState, useContext } from 'react';
import api, { getApiErrorMessage } from '../services/api';
import BillCreditSummary from '../components/BillCreditSummary';
import { billPayableAmount } from '../utils/billing';
import PaymentModal from '../components/PaymentModal';
import BillingNavigation from '../components/BillingNavigation';
import { noRetry, paymentHistory } from '../services/maintenance';
import ReceiptModal from '../components/ReceiptModal';
import ManualBillModal from '../components/ManualBillModal';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { 
  FaUser, FaDownload, FaHistory, 
  FaPlus, FaTimes, FaCheck, FaPen, FaFileCsv 
} from 'react-icons/fa';

const PAYMENT_AUDIT_STORAGE_KEY = 'surshakti_payment_audit_v1';

const safeParseJson = (value, fallback = []) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const readPaymentAudit = () => {
  const data = localStorage.getItem(PAYMENT_AUDIT_STORAGE_KEY);
  const parsed = safeParseJson(data, []);
  return Array.isArray(parsed) ? parsed : [];
};

const writePaymentAudit = (records) => {
  localStorage.setItem(PAYMENT_AUDIT_STORAGE_KEY, JSON.stringify(records));
};

const normalizeTxnId = (value) => String(value || '').trim().toUpperCase().replace(/\s+/g, '');
const normalizeBillId = (value) => String(value ?? '').trim();
const createIdempotencyKey = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `idem-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
};

const billIsPaid = (bill) => {
  const flag = bill.isPaid ?? bill.IsPaid;
  return flag === true || flag === 1 || flag === '1';
};

const billPrimaryId = (bill) => normalizeBillId(bill.billId || bill.BillId);
const extractTransactionEntityId = (payload) => {
  if (!payload) return null;
  return (
    payload.id ||
    payload.transactionId ||
    payload.paymentTransactionId ||
    payload.transaction?.id ||
    payload.data?.id ||
    null
  );
};

const MyBills = () => {
  const { user } = useContext(AuthContext);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterMonth, setFilterMonth] = useState('All');

  const [selectedBill, setSelectedBill] = useState(null);
  const [receiptBill, setReceiptBill] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [cashBusyId, setCashBusyId] = useState(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [unsyncedPayments, setUnsyncedPayments] = useState(0);

  // --- EDIT STATE ---
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBillId, setEditingBillId] = useState(null);
  const [editFormData, setEditFormData] = useState({
    flatNo: '', amount: '', billType: 'Maintenance', month: '', dueDate: ''
  });

  // 🟢 IMPROVED: Case-insensitive Admin/Secretary check
  const isAdmin = 
    user?.role?.toLowerCase() === 'admin' || 
    user?.role?.toLowerCase() === 'secretary';

  const displayMonths = (() => {
    const months = [];
    const date = new Date();
    date.setDate(1);
    for (let i = 0; i < 12; i++) {
      const monthName = date.toLocaleString('default', { month: 'long' });
      const year = date.getFullYear();
      months.push(`${monthName} ${year}`);
      date.setMonth(date.getMonth() - 1);
    }
    return [...new Set([...months, ...bills.map(bill => bill.month || bill.Month).filter(Boolean)])];
  })();

  useEffect(() => {
    fetchBills();
  }, []);

  const createPaymentTransaction = async ({ billId, amount, method, idempotencyKey }) => {
    const payload = {
      billId: Number(billId),
      amountPaid: Number(amount || 0),
      paymentMode: method || 'UPI',
      idempotencyKey,
    };

    const res = await api.post('/payment-transactions/create', payload);
    const entityId = extractTransactionEntityId(res.data);
    if (!entityId) {
      throw new Error('Create transaction response is missing transaction ID.');
    }
    return String(entityId);
  };

  const submitPaymentTransaction = async ({ paymentTransactionId, transactionId }) => {
    await api.post(`/payment-transactions/${paymentTransactionId}/submit`, {
      transactionReferenceId: transactionId,
    });
  };

  const manualVerifyPaymentTransaction = async ({ paymentTransactionId, transactionId }) => {
    await api.post(`/payment-transactions/admin/${paymentTransactionId}/manual-verify`, {
      notes: transactionId ? `Cash payment verified by admin. Reference: ${transactionId}` : 'Cash payment verified by admin.',
    });
  };

  const updateUnsyncedCount = () => {
    const records = readPaymentAudit();
    const count = records.filter((record) => normalizeBillId(record.userId) === normalizeBillId(user?.id) && record.status !== 'synced').length;
    setUnsyncedPayments(count);
  };

  const refreshKnownPaymentStatuses = async (serverBills = []) => {
    const records = readPaymentAudit().filter(r => normalizeBillId(r.userId) === normalizeBillId(user?.id));
    const ids = [...new Set([...records.map(r => r.paymentTransactionId), ...serverBills.map(b => b.paymentTransactionId)].filter(Boolean))];
    const results = await Promise.allSettled(ids.map(id => api.get('/payment-transactions/' + id)));
    const loaded = results.filter(r => r.status === 'fulfilled' && r.value.data?.transactionId).map(r => r.value.data);
    try {
      let skip = 0;
      while (true) {
        const page = await paymentHistory({ status: 'Submitted', skip });
        loaded.push(...page.items.filter(t => !loaded.some(existing => existing.transactionId === t.transactionId)));
        skip += page.items.length;
        if (!page.items.length || skip >= page.totalCount) break;
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Unable to check pending payment history.'));
    }
    setTransactions(loaded);
    const byId = new Map(loaded.map(t => [String(t.transactionId), t]));
    writePaymentAudit(readPaymentAudit().map(record => {
      if (normalizeBillId(record.userId) !== normalizeBillId(user?.id)) return record;
      const t = byId.get(String(record.paymentTransactionId));
      if (!t) return record;
      return { ...record, serverStatus: t.status,
        status: ['Submitted', 'Verified', 'Synced', 'Rejected'].includes(t.status) ? 'synced' : record.status };
    }));
    updateUnsyncedCount();
  };
  const fetchBills = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await api.get('Bill');
      setBills(res.data);
      await refreshKnownPaymentStatuses(res.data || []);
    } catch {
      setLoadError("We couldn’t load your bills. Check your connection and try again.");
      updateUnsyncedCount();
    } finally {
      setLoading(false);
    }
  };

  const totalDue = bills.filter(bill => !billIsPaid(bill)).reduce((sum, bill) => sum + billPayableAmount(bill), 0);
  const unpaidCount = bills.filter(bill => !billIsPaid(bill)).length;
  const emptyBills = <div className="empty-state"><h3 className="h5">{bills.length ? 'No matching bills' : 'No bills yet'}</h3><p>{bills.length ? 'Try another month or clear your filters.' : 'Your bills will appear here when the society issues them.'}</p>{bills.length > 0 && <button className="btn btn-outline-primary" onClick={() => { setFilterStatus('All'); setFilterMonth('All'); }}>Clear filters</button>}</div>;

  const filteredBills = bills.filter(bill => {
    const isPaid = billIsPaid(bill);
    const billMonth = bill.month || bill.Month || "";
    const matchesStatus = filterStatus === 'All' || (filterStatus === 'Paid' && isPaid === true) || (filterStatus === 'Unpaid' && isPaid === false);
    let matchesMonth = filterMonth === 'All' ? true : filterMonth === 'Others' ? !displayMonths.includes(billMonth) : billMonth === filterMonth;
    return matchesStatus && matchesMonth;
  });

  if (isAdmin) {
    filteredBills.sort((a, b) => Number(billIsPaid(a)) - Number(billIsPaid(b)));
  }

  // --- ACTIONS ---
  const handleOpenPayment = (bill) => setSelectedBill(bill);
  const handleOpenReceipt = async (bill) => {
    if (bill.paidByCredit) { toast.info('This bill was covered by credit. No payment receipt is needed.'); return; }
    const transaction = transactions.find(t => String(t.billId) === billPrimaryId(bill) && ['Verified', 'Synced'].includes(t.status));
    let id = transaction?.transactionId || bill.paymentTransactionId;
    try {
      if (!id) {
        const pages = await Promise.all(['Verified', 'Synced'].map(status => paymentHistory({ billId: Number(billPrimaryId(bill)), status })));
        id = pages.flatMap(page => page.items).find(t => t.receiptAvailable)?.transactionId;
      }
      if (!id) {
        toast.info('No verified receipt is available for this bill.');
        return;
      }
      const { data } = await api.get('/payment-transactions/' + id + '/receipt');
      if (!data.receiptNumber) throw new Error('Payment receipt is not available yet.');
      setReceiptBill({ ...bill, flatNo: data.flatNo, month: data.month, receipt: data, amount: data.amountPaid, paymentDate: data.issuedAt });
    } catch (err) { toast.error(getApiErrorMessage(err)); }
  };

  const handleExport = () => {
    if (filteredBills.length === 0) return toast.warning("No records to export.");
    const headers = ["Row House No", "Resident Name", "Month", "Type", "Amount", "Status"];
    const csvRows = filteredBills.map(b => {
      const status = (b.isPaid ?? b.IsPaid) ? "Paid" : "Unpaid";
      return [b.flatNo, `"${b.residentName}"`, `"${b.month}"`, b.billType || "Maintenance", billPayableAmount(b), status].join(',');
    });
    const csvString = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `SurShakti_Bills_${filterMonth}_${filterStatus}.csv`;
    link.click();
    toast.success("Download started!");
  };

  const openEditModal = (bill) => {
    setEditingBillId(bill.billId);
    setEditFormData({
      flatNo: bill.flatNo || bill.FlatNo,
      amount: bill.amount || bill.Amount,
      billType: bill.billType || bill.BillType || 'Maintenance',
      month: bill.month || bill.Month,
      dueDate: bill.dueDate ? new Date(bill.dueDate).toISOString().split('T')[0] : ''
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`Bill/${editingBillId}`, { ...editFormData, amount: parseFloat(editFormData.amount) });
      toast.success("Bill Updated!");
      setShowEditModal(false);
      fetchBills();
    } catch {
      toast.error("Update failed.");
    }
  };

  const handleMarkAsPaid = async (bill) => {
    if (cashBusyId !== null || loading || !window.confirm('Confirm receipt of the full CASH payment?')) return;
    const billId = billPrimaryId(bill);
    setCashBusyId('cash-' + billId);
    const existing = readPaymentAudit().find(r => normalizeBillId(r.userId) === normalizeBillId(user?.id) && r.billId === billId && r.method === 'CASH' && r.status !== 'synced');
    const record = existing || {
      localRecordId: createIdempotencyKey(), billId, transactionId: 'CASH-' + billId + '-' + Date.now(),
      amount: billPayableAmount(bill), method: 'CASH', idempotencyKey: createIdempotencyKey(),
      userId: normalizeBillId(user?.id), status: 'pending'
    };
    const save = patch => {
      Object.assign(record, patch);
      writePaymentAudit([...readPaymentAudit().filter(r => r.localRecordId !== record.localRecordId), record]);
      updateUnsyncedCount();
    };
    save({});
    try {
      let id = record.paymentTransactionId;
      if (id) {
        const { data } = await api.get('/payment-transactions/' + id);
        if (['Verified', 'Synced'].includes(data.status)) { save({ status: 'synced' }); await fetchBills(); return; }
        if (data.status === 'Rejected') { save({ status: 'synced' }); throw new Error('This cash payment was rejected. Start a new payment.'); }
      } else {
        id = await createPaymentTransaction({ billId, amount: record.amount, method: 'CASH', idempotencyKey: record.idempotencyKey });
        save({ paymentTransactionId: id });
      }
      await manualVerifyPaymentTransaction({ paymentTransactionId: id, transactionId: record.transactionId });
      save({ status: 'synced' });
      toast.success('Cash payment verified.');
      await fetchBills();
    } catch (err) { toast.error(getApiErrorMessage(err)); }
    finally { setCashBusyId(null); }
  };
  const handlePaymentComplete = async ({ billId, transactionId, amount, month, proof }) => {
    const normalizedBillId = normalizeBillId(billId);
    const reference = normalizeTxnId(transactionId);
    const records = readPaymentAudit();
    const previous = records.find(r => normalizeBillId(r.userId) === normalizeBillId(user?.id) && normalizeTxnId(r.transactionId) === reference);
    if (previous && (previous.status === 'synced' || normalizeBillId(previous.billId) !== normalizedBillId)) {
      throw new Error('This reference has already been submitted. Use a new reference for a corrected payment.');
    }
    const record = previous || {
      localRecordId: createIdempotencyKey(), billId: normalizedBillId, transactionId: reference,
      amount: Number(amount), month, method: 'UPI', idempotencyKey: createIdempotencyKey(),
      status: 'pending', userId: normalizeBillId(user?.id), createdAt: new Date().toISOString()
    };
    const save = patch => {
      Object.assign(record, patch);
      const existing = readPaymentAudit();
      writePaymentAudit([...existing.filter(r => r.localRecordId !== record.localRecordId), record]);
      updateUnsyncedCount();
    };
    save({});
    try {
      let paymentTransactionId = record.paymentTransactionId;
      if (paymentTransactionId) {
        const { data: current } = await api.get('/payment-transactions/' + paymentTransactionId);
        if (['Submitted', 'Verified', 'Synced'].includes(current.status)) {
          save({ status: 'synced' }); setSelectedBill(null); await fetchBills(); return;
        }
        if (current.status === 'Rejected') {
          save({ status: 'synced', serverStatus: 'Rejected' });
          throw new Error('This payment was rejected. Use a new reference for a corrected payment.');
        }
      } else {
        paymentTransactionId = await createPaymentTransaction({ billId, amount, method: 'UPI', idempotencyKey: record.idempotencyKey });
        save({ paymentTransactionId });
      }
      if (proof) {
        const form = new FormData(); form.append('file', proof);
        await api.post('/payment-transactions/' + paymentTransactionId + '/proof', form, noRetry);
      }
      await submitPaymentTransaction({ paymentTransactionId, transactionId: reference });
      save({ status: 'synced', serverStatus: 'Submitted' });
      toast.success('Payment submitted successfully!');
      setSelectedBill(null);
      await fetchBills();
    } catch (err) {
      if (record.serverStatus !== 'Rejected') save({ status: 'failed' });
      throw new Error(getApiErrorMessage(err, 'Payment was not submitted. Retry with the same reference; reselect proof if needed.'));
    }
  };
  return (
    <div className="bills-screen">
      <div className="d-flex flex-wrap gap-3 justify-content-between align-items-center mb-4">
        <h2 className="fw-bold mb-0">{isAdmin ? 'Society bills' : 'My bills'}</h2>
        {isAdmin && (
          <button className="btn btn-dark fw-bold btn-sm" onClick={() => setShowGenerateModal(true)}>
            <FaPlus className="me-2" /> Generate Bill
          </button>
        )}
      </div>

      <BillingNavigation />
      {loadError && <div className="alert alert-danger" role="alert"><p className="mb-2">{loadError}</p><button className="btn btn-outline-danger" onClick={fetchBills} disabled={loading}>Try again</button></div>}
      <div className="bill-summary" aria-busy={loading}><div><span>Total amount due</span><strong>{loading ? 'Loading…' : loadError ? 'Unavailable' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalDue)}</strong></div><div><span>Unpaid bills</span><strong>{loading ? '—' : loadError ? '—' : unpaidCount}</strong></div></div>
      {unsyncedPayments > 0 && (
        <div className="alert alert-warning d-flex justify-content-between align-items-center rounded-4 shadow-sm" role="alert">
          <div className="small fw-semibold mb-0">
            {unsyncedPayments} payment {unsyncedPayments > 1 ? 'records are' : 'record is'} not confirmed. Refresh status first. If still pending, reopen the payment with the same reference or retry the Cash action.
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline-dark"
            onClick={fetchBills}
            disabled={loading}
          >
            Refresh status
          </button>
        </div>
      )}

      <div className="bg-white p-3 rounded-4 shadow-sm mb-4 bill-filter-panel">
        <div className="row g-3 align-items-end">
          <div className="col-md-4">
            <label className="fw-bold small text-muted mb-1">STATUS</label>
            <div className="btn-group w-100 shadow-sm" role="group" aria-label="Filter bills by status">
              {['All', 'Paid', 'Unpaid'].map(s => (
                <button key={s} aria-pressed={filterStatus === s} className={`btn btn-sm ${filterStatus === s ? 'btn-dark' : 'btn-outline-dark'}`} onClick={() => setFilterStatus(s)}>{s}</button>
              ))}
            </div>
          </div>
          <div className="col-md-4">
            <label htmlFor="bill-month-filter" className="fw-bold small text-muted mb-1">MONTH</label>
            <select id="bill-month-filter" className="form-select form-select-sm" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
              <option value="All">All Months</option>
              {displayMonths.map((m, i) => <option key={i} value={m}>{m}</option>)}
              <option value="Others">Others</option>
            </select>
          </div>
          <div className="col-md-4">
            {isAdmin && <button onClick={handleExport} className="btn btn-sm btn-outline-primary w-100 fw-bold"><FaFileCsv className="me-2"/>Export CSV</button>}
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4 overflow-hidden bill-results">
        <div className="card-body p-0">
          
          {/* Desktop Table View */}
          <div className="d-none d-md-block table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="bg-light">
                <tr className="small text-uppercase text-muted">
                  {isAdmin && <th className="ps-4">Resident</th>}
                  <th>Month</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th className="text-end pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, idx) => (
                    <tr key={idx}>
                      {isAdmin && (
                        <td className="ps-4">
                          <div className="shimmer-placeholder shimmer-title w-75"></div>
                          <div className="shimmer-placeholder shimmer-text w-50" style={{ height: '0.65rem' }}></div>
                        </td>
                      )}
                      <td><div className="shimmer-placeholder shimmer-title w-50" style={{ height: '1rem' }}></div></td>
                      <td><div className="shimmer-placeholder shimmer-badge"></div></td>
                      <td><div className="shimmer-placeholder shimmer-text w-25" style={{ height: '1rem' }}></div></td>
                      <td><div className="shimmer-placeholder shimmer-badge"></div></td>
                      <td className="text-end pe-4"><div className="shimmer-placeholder shimmer-btn float-end"></div></td>
                    </tr>
                  ))
                ) : filteredBills.length > 0 ? filteredBills.map(bill => {
                  const isPaid = billIsPaid(bill);
                  const type = bill.billType || bill.BillType || 'Maintenance';
                  return (
                    <tr key={bill.billId}>
                      {isAdmin && (
                        <td className="ps-4">
                          <div className="fw-bold text-dark">{bill.residentName}</div>
                          <div className="text-muted small">Row house {bill.flatNo}</div>
                        </td>
                      )}
                      <td className="fw-bold">{bill.month}</td>
                      <td><span className="badge bg-light text-dark border">{type}</span></td>
                      <td className="fw-bold text-primary">₹{billPayableAmount(bill).toLocaleString('en-IN')}<BillCreditSummary bill={bill} /></td>
                      <td>
                        <span className={`badge rounded-pill px-3 ${isPaid ? 'bg-success bg-opacity-10 text-success' : 'bg-danger bg-opacity-10 text-danger'}`}>
                          {isPaid ? (bill.paidByCredit ? 'Covered by credit' : 'Paid') : transactions.some(t => String(t.billId) === billPrimaryId(bill) && t.status === 'Submitted') ? 'Under review' : 'Unpaid'}
                        </span>
                      </td>
                      <td className="text-end pe-4">
                        <div className="d-flex flex-wrap justify-content-end gap-2">
                          {isPaid ? (
                            <button className="btn btn-light btn-sm rounded-circle border shadow-sm" onClick={() => handleOpenReceipt(bill)} title="Download Receipt">
                              <FaDownload size={14} className="text-secondary" />
                            </button>
                          ) : (
                            <>
                              {isAdmin ? (
                                <>
                                  <button className="btn btn-outline-secondary btn-sm rounded-circle shadow-sm" disabled={transactions.some(t => String(t.billId) === billPrimaryId(bill) && t.status === 'Submitted')} onClick={() => openEditModal(bill)} title="Edit Bill">
                                    <FaPen size={12} />
                                  </button>
                                  
                                  <button className="btn btn-outline-primary btn-sm rounded-circle shadow-sm" disabled={cashBusyId !== null || loading || transactions.some(t => String(t.billId) === billPrimaryId(bill) && t.status === 'Submitted')} onClick={() => handleMarkAsPaid(bill)} title="Mark Paid (Cash)">
                                    <FaCheck size={14} />
                                  </button>
                                </>
                              ) : (
                                <button className="btn btn-primary btn-sm rounded-pill px-3 fw-bold" disabled={transactions.some(t => String(t.billId) === billPrimaryId(bill) && t.status === 'Submitted')} onClick={() => handleOpenPayment(bill)}>Pay Now</button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={isAdmin ? 6 : 5}>{!loadError && emptyBills}</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Stack View */}
          <div className="d-block d-md-none mobile-bill-list">
            {loading ? (
              Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="mobile-bill-card border-bottom bg-white">
                  <div className="shimmer-placeholder shimmer-title w-75 mb-2" style={{ height: '1.25rem' }}></div>
                  <div className="shimmer-placeholder shimmer-text w-50 mb-2"></div>
                  <div className="shimmer-placeholder shimmer-badge"></div>
                </div>
              ))
            ) : filteredBills.length > 0 ? (
              filteredBills.map(bill => {
                const isPaid = billIsPaid(bill);
                const type = bill.billType || bill.BillType || 'Maintenance';
                return (
                  <div key={bill.billId} className="mobile-bill-card border-bottom bg-white">
                    <div className="mobile-bill-header">
                      <div>
                        {isAdmin ? (
                          <>
                            <div className="fw-bold text-dark">{bill.residentName}</div>
                            <div className="text-muted small">Row house {bill.flatNo} • {bill.month}</div>
                          </>
                        ) : (
                          <>
                            <div className="fw-bold text-dark">{bill.month}</div>
                            <div className="text-muted small">{type} Bill</div>
                          </>
                        )}
                      </div>
                      <span className={`badge rounded-pill px-3 ${isPaid ? 'bg-success bg-opacity-10 text-success' : 'bg-danger bg-opacity-10 text-danger'}`}>
                        {isPaid ? (bill.paidByCredit ? 'Covered by credit' : 'Paid') : transactions.some(t => String(t.billId) === billPrimaryId(bill) && t.status === 'Submitted') ? 'Under review' : 'Unpaid'}
                      </span>
                    </div>
                    
                    <div className="mobile-bill-footer">
                      <div>
                        <div className="fw-bold text-primary fs-5">₹{billPayableAmount(bill).toLocaleString('en-IN')}</div><BillCreditSummary bill={bill} />
                        {Number(bill.penaltyAmount ?? bill.PenaltyAmount ?? 0) > 0 && <small className="text-danger">Includes ₹{Number(bill.penaltyAmount ?? bill.PenaltyAmount).toLocaleString('en-IN')} late fee</small>}
                      </div>
                      
                      <div className="mobile-bill-actions">
                        {isPaid ? (
                          <button className="btn btn-light btn-sm rounded-pill border px-3" onClick={() => handleOpenReceipt(bill)}>
                            <FaDownload className="me-1 text-secondary" size={12} /> Receipt
                          </button>
                        ) : (
                          <>
                            {isAdmin ? (
                              <>
                                <button className="btn btn-outline-secondary btn-sm bill-edit-button" aria-label="Edit bill" disabled={transactions.some(t => String(t.billId) === billPrimaryId(bill) && t.status === 'Submitted')} onClick={() => openEditModal(bill)} title="Edit Bill">
                                  <FaPen size={12} />
                                </button>
                                
                                <button className="btn btn-outline-primary btn-sm rounded-pill px-3" disabled={cashBusyId !== null || loading || transactions.some(t => String(t.billId) === billPrimaryId(bill) && t.status === 'Submitted')} onClick={() => handleMarkAsPaid(bill)}>
                                  <FaCheck className="me-1" size={12} /> Cash
                                </button>
                              </>
                            ) : (
                              <button className="btn btn-primary btn-sm rounded-pill px-4 fw-bold" disabled={transactions.some(t => String(t.billId) === billPrimaryId(bill) && t.status === 'Submitted')} onClick={() => handleOpenPayment(bill)}>Pay Now</button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              !loadError && emptyBills
            )}
          </div>

        </div>
      </div>



      {/* --- EDIT MODAL --- */}
      {showEditModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}>
          <div className="bg-white rounded-4 shadow-lg p-4" style={{ width: '400px' }}>
            <h5 className="fw-bold mb-3">Edit Bill Details</h5>
            <form onSubmit={handleEditSubmit}>
              <div className="mb-3">
                <label className="small fw-bold text-muted">AMOUNT (₹)</label>
                <input type="number" className="form-control" value={editFormData.amount} onChange={e => setEditFormData({...editFormData, amount: e.target.value})} />
              </div>
              <div className="mb-3">
                <label className="small fw-bold text-muted">BILLING MONTH</label>
                <input 
                  type="month" 
                  className="form-control" 
                  onChange={(e) => {
                    if(!e.target.value) return;
                    const date = new Date(e.target.value + "-01");
                    const formatted = date.toLocaleString('default', { month: 'long', year: 'numeric' });
                    setEditFormData({...editFormData, month: formatted});
                  }} 
                />
                <small className="text-primary">Current: {editFormData.month}</small>
              </div>
              <div className="mb-4">
                <label className="small fw-bold text-muted">BILL TYPE</label>
                <select className="form-select" value={editFormData.billType} onChange={e => setEditFormData({...editFormData, billType: e.target.value})}>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Penalty">Penalty</option>
                  <option value="Event">Event</option>
                </select>
              </div>
              <div className="d-flex flex-wrap gap-2">
                <button type="submit" className="btn btn-dark w-100 fw-bold">Update</button>
                <button type="button" className="btn btn-light w-100" onClick={() => setShowEditModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showGenerateModal && <ManualBillModal onClose={() => setShowGenerateModal(false)} onSuccess={fetchBills} />}
      {selectedBill && <PaymentModal bill={selectedBill} onClose={() => setSelectedBill(null)} onPaymentComplete={handlePaymentComplete} />}
      {receiptBill && <ReceiptModal bill={receiptBill} receipt={receiptBill.receipt} user={user} onClose={() => setReceiptBill(null)} />}
    </div>
  );
};

export default MyBills;

