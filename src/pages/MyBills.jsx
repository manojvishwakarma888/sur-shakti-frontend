import React, { useEffect, useState, useContext } from 'react';
import api from '../services/api';
import PaymentModal from '../components/PaymentModal';
import WhatsAppReminderModal from '../components/WhatsAppReminderModal';
import ReceiptModal from '../components/ReceiptModal';
import ManualBillModal from '../components/ManualBillModal';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { 
  FaUser, FaDownload, FaWhatsapp, FaHistory, 
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

const billTxnId = (bill) => normalizeTxnId(bill.transactionId || bill.TransactionId || '');
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
  
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterMonth, setFilterMonth] = useState('All');

  const [selectedBill, setSelectedBill] = useState(null);
  const [receiptBill, setReceiptBill] = useState(null);
  const [reminderBill, setReminderBill] = useState(null);
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
    for (let i = 0; i < 12; i++) {
      const monthName = date.toLocaleString('default', { month: 'long' });
      const year = date.getFullYear();
      months.push(`${monthName} ${year}`);
      date.setMonth(date.getMonth() - 1);
    }
    return months;
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
    const count = records.filter((record) => record.status !== 'synced').length;
    setUnsyncedPayments(count);
  };

  const syncStoredPaymentAttempts = async (serverBills = []) => {
    const records = readPaymentAudit();
    if (records.length === 0) {
      setUnsyncedPayments(0);
      return;
    }

    const paidBillIds = new Set(
      (serverBills || [])
        .filter(billIsPaid)
        .map(billPrimaryId)
        .filter(Boolean)
    );

    const serverTxnIds = new Set(
      (serverBills || [])
        .map(billTxnId)
        .filter(Boolean)
    );

    const updatedRecords = [...records];
    let syncedNow = 0;

    for (let i = 0; i < updatedRecords.length; i++) {
      const record = updatedRecords[i];
      const recBillId = normalizeBillId(record.billId);
      const recTxnId = normalizeTxnId(record.transactionId);

      if (!recBillId || !recTxnId) {
        updatedRecords[i] = {
          ...record,
          status: 'failed',
          lastError: 'Invalid stored payment record.',
          retryCount: (record.retryCount || 0) + 1,
          updatedAt: new Date().toISOString(),
        };
        continue;
      }

      if (paidBillIds.has(recBillId) || serverTxnIds.has(recTxnId)) {
        if (record.status !== 'synced') syncedNow += 1;
        updatedRecords[i] = {
          ...record,
          status: 'synced',
          syncedAt: new Date().toISOString(),
          lastError: null,
          updatedAt: new Date().toISOString(),
        };
        continue;
      }

      try {
        let paymentTransactionId = record.paymentTransactionId;
        if (!paymentTransactionId) {
          const recordIdem = record.idempotencyKey || createIdempotencyKey();
          paymentTransactionId = await createPaymentTransaction({
            billId: recBillId,
            amount: record.amount,
            month: record.month,
            method: record.method || 'UPI',
            idempotencyKey: recordIdem,
          });
          updatedRecords[i] = {
            ...updatedRecords[i],
            idempotencyKey: recordIdem,
            paymentTransactionId,
            updatedAt: new Date().toISOString(),
          };
        }

        if ((record.method || 'UPI').toUpperCase() === 'CASH') {
          await manualVerifyPaymentTransaction({
            paymentTransactionId,
            transactionId: recTxnId || null,
          });
        } else {
          await submitPaymentTransaction({
            paymentTransactionId,
            transactionId: recTxnId,
          });
        }

        syncedNow += 1;
        updatedRecords[i] = {
          ...record,
          transactionId: recTxnId,
          status: 'synced',
          syncedAt: new Date().toISOString(),
          lastError: null,
          updatedAt: new Date().toISOString(),
        };
      } catch (err) {
        updatedRecords[i] = {
          ...record,
          status: 'failed',
          retryCount: (record.retryCount || 0) + 1,
          lastError: err?.response?.data?.message || err?.message || 'Unable to sync payment record.',
          updatedAt: new Date().toISOString(),
        };
      }
    }

    writePaymentAudit(updatedRecords);
    updateUnsyncedCount();

    if (syncedNow > 0) {
      toast.success(`${syncedNow} stored payment ${syncedNow > 1 ? 'records were' : 'record was'} synced.`);
    }
  };

  const fetchBills = async () => {
    try {
      const res = await api.get('Bill');
      setBills(res.data);
      await syncStoredPaymentAttempts(res.data || []);
    } catch (err) {
      toast.error("Could not load bills.");
      updateUnsyncedCount();
    } finally {
      setLoading(false);
    }
  };

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
  const handleOpenReceipt = (bill) => setReceiptBill(bill);

  const handleExport = () => {
    if (filteredBills.length === 0) return toast.warning("No records to export.");
    const headers = ["Flat No", "Resident Name", "Month", "Type", "Amount", "Status"];
    const csvRows = filteredBills.map(b => {
      const status = (b.isPaid ?? b.IsPaid) ? "Paid" : "Unpaid";
      return [b.flatNo, `"${b.residentName}"`, `"${b.month}"`, b.billType || "Maintenance", b.amount, status].join(',');
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
    } catch (err) {
      toast.error("Update failed.");
    }
  };

  const handleMarkAsPaid = async (bill) => {
    if (!window.confirm("Confirm CASH payment?")) return;

    const normalizedBillId = normalizeBillId(bill.billId || bill.BillId);
    const cashTxnId = `CASH-${normalizedBillId}-${Date.now()}`;
    const localRecordId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const idempotencyKey = createIdempotencyKey();

    const newRecord = {
      localRecordId,
      billId: normalizedBillId,
      transactionId: cashTxnId,
      amount: Number(bill.amount || bill.Amount || 0),
      month: bill.month || bill.Month || null,
      method: 'CASH',
      idempotencyKey,
      status: 'pending',
      retryCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: normalizeBillId(user?.id || user?.userId || user?.UserId || ''),
    };

    const existing = readPaymentAudit();
    writePaymentAudit([...existing, newRecord]);
    updateUnsyncedCount();

    try {
      const paymentTransactionId = await createPaymentTransaction({
        billId: normalizedBillId,
        amount: newRecord.amount,
        month: newRecord.month,
        method: 'CASH',
        idempotencyKey,
      });

      await manualVerifyPaymentTransaction({
        paymentTransactionId,
        transactionId: cashTxnId,
      });

      const updated = readPaymentAudit().map((record) => {
        if (record.localRecordId !== localRecordId) return record;
        return {
          ...record,
          paymentTransactionId,
          status: 'synced',
          syncedAt: new Date().toISOString(),
          lastError: null,
          updatedAt: new Date().toISOString(),
        };
      });
      writePaymentAudit(updated);
      updateUnsyncedCount();

      toast.success("Marked as Paid");
      fetchBills();
    } catch (err) {
      const updated = readPaymentAudit().map((record) => {
        if (record.localRecordId !== localRecordId) return record;
        return {
          ...record,
          status: 'failed',
          retryCount: (record.retryCount || 0) + 1,
          lastError: err?.response?.data?.message || err?.message || 'Unable to sync cash payment.',
          updatedAt: new Date().toISOString(),
        };
      });
      writePaymentAudit(updated);
      updateUnsyncedCount();

      toast.warning('Cash payment record stored locally. Please retry sync.');
    }
  };

  const handlePaymentComplete = async ({ billId, transactionId, amount, month }) => {
    const normalizedBillId = normalizeBillId(billId);
    const normalizedTxnId = normalizeTxnId(transactionId);

    const serverTxnIds = new Set(bills.map(billTxnId).filter(Boolean));
    const localTxnIds = new Set(readPaymentAudit().map((record) => normalizeTxnId(record.transactionId)).filter(Boolean));
    if (serverTxnIds.has(normalizedTxnId) || localTxnIds.has(normalizedTxnId)) {
      toast.error('This transaction ID already exists. Please verify your UTR and try again.');
      return;
    }

    const localRecordId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const newRecord = {
      localRecordId,
      billId: normalizedBillId,
      transactionId: normalizedTxnId,
      amount: Number(amount || 0),
      month: month || null,
      method: 'UPI',
      idempotencyKey: createIdempotencyKey(),
      status: 'pending',
      retryCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: normalizeBillId(user?.id || user?.userId || user?.UserId || ''),
    };

    const existing = readPaymentAudit();
    writePaymentAudit([...existing, newRecord]);
    updateUnsyncedCount();

    try {
      const paymentTransactionId = await createPaymentTransaction({
        billId: normalizedBillId,
        amount: Number(amount || 0),
        month: month || null,
        method: 'UPI',
        idempotencyKey: newRecord.idempotencyKey,
      });

      await submitPaymentTransaction({
        paymentTransactionId,
        transactionId: normalizedTxnId,
      });

      const updated = readPaymentAudit().map((record) => {
        if (record.localRecordId !== localRecordId) return record;
        return {
          ...record,
          paymentTransactionId,
          status: 'synced',
          syncedAt: new Date().toISOString(),
          lastError: null,
          updatedAt: new Date().toISOString(),
        };
      });
      writePaymentAudit(updated);
      updateUnsyncedCount();

      toast.success("Payment submitted successfully!");
      setSelectedBill(null);
      fetchBills();
    } catch (err) {
      const updated = readPaymentAudit().map((record) => {
        if (record.localRecordId !== localRecordId) return record;
        return {
          ...record,
          status: 'failed',
          retryCount: (record.retryCount || 0) + 1,
          lastError: err?.response?.data?.message || err?.message || 'Unable to sync payment record.',
          updatedAt: new Date().toISOString(),
        };
      });
      writePaymentAudit(updated);
      updateUnsyncedCount();

      toast.warning('Payment saved locally. We will retry syncing when bills are refreshed.');
      setSelectedBill(null);
    }
  };

  const handleWhatsAppRemind = (bill) => {
    if (isAdmin && !billIsPaid(bill)) setReminderBill(bill);
  };

  return (
    <>
      <div className="d-flex flex-wrap gap-3 justify-content-between align-items-center mb-4">
        <h2 className="fw-bold mb-0">{isAdmin ? 'Society Billing' : 'My Payments'}</h2>
        {isAdmin && (
          <button className="btn btn-dark fw-bold btn-sm" onClick={() => setShowGenerateModal(true)}>
            <FaPlus className="me-2" /> Generate Bill
          </button>
        )}
      </div>

      {unsyncedPayments > 0 && (
        <div className="alert alert-warning d-flex justify-content-between align-items-center rounded-4 shadow-sm" role="alert">
          <div className="small fw-semibold mb-0">
            {unsyncedPayments} payment {unsyncedPayments > 1 ? 'records are' : 'record is'} stored locally and waiting to sync.
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline-dark"
            onClick={fetchBills}
          >
            Retry Sync
          </button>
        </div>
      )}

      <div className="bg-white p-3 rounded-4 shadow-sm mb-4">
        <div className="row g-3 align-items-end">
          <div className="col-md-4">
            <label className="fw-bold small text-muted mb-1">STATUS</label>
            <div className="btn-group w-100 shadow-sm">
              {['All', 'Paid', 'Unpaid'].map(s => (
                <button key={s} className={`btn btn-sm ${filterStatus === s ? 'btn-dark' : 'btn-outline-dark'}`} onClick={() => setFilterStatus(s)}>{s}</button>
              ))}
            </div>
          </div>
          <div className="col-md-4">
            <label className="fw-bold small text-muted mb-1">MONTH</label>
            <select className="form-select form-select-sm" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
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

      <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
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
                          <div className="text-muted small">Flat {bill.flatNo}</div>
                        </td>
                      )}
                      <td className="fw-bold">{bill.month}</td>
                      <td><span className="badge bg-light text-dark border">{type}</span></td>
                      <td className="fw-bold text-primary">₹{bill.amount}</td>
                      <td>
                        <span className={`badge rounded-pill px-3 ${isPaid ? 'bg-success bg-opacity-10 text-success' : 'bg-danger bg-opacity-10 text-danger'}`}>
                          {isPaid ? 'Paid' : 'Unpaid'}
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
                                  <button className="btn btn-outline-secondary btn-sm rounded-circle shadow-sm" onClick={() => openEditModal(bill)} title="Edit Bill">
                                    <FaPen size={12} />
                                  </button>
                                  <button className="btn btn-outline-success btn-sm rounded-pill shadow-sm" onClick={() => handleWhatsAppRemind(bill)} aria-label="Send reminder on WhatsApp" title="Send reminder on WhatsApp">
                                    <FaWhatsapp size={16} className="me-1" />Remind
                                  </button>
                                  <button className="btn btn-outline-primary btn-sm rounded-circle shadow-sm" onClick={() => handleMarkAsPaid(bill)} title="Mark Paid (Cash)">
                                    <FaCheck size={14} />
                                  </button>
                                </>
                              ) : (
                                <button className="btn btn-primary btn-sm rounded-pill px-3 fw-bold" onClick={() => handleOpenPayment(bill)}>Pay Now</button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan="6" className="text-center p-4 text-muted">No bills found.</td></tr>
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
                            <div className="text-muted small">Flat {bill.flatNo} • {bill.month}</div>
                          </>
                        ) : (
                          <>
                            <div className="fw-bold text-dark">{bill.month}</div>
                            <div className="text-muted small">{type} Bill</div>
                          </>
                        )}
                      </div>
                      <span className={`badge rounded-pill px-3 ${isPaid ? 'bg-success bg-opacity-10 text-success' : 'bg-danger bg-opacity-10 text-danger'}`}>
                        {isPaid ? 'Paid' : 'Unpaid'}
                      </span>
                    </div>
                    
                    <div className="mobile-bill-footer">
                      <div className="fw-bold text-primary fs-5">₹{bill.amount}</div>
                      
                      <div className="mobile-bill-actions">
                        {isPaid ? (
                          <button className="btn btn-light btn-sm rounded-pill border px-3" onClick={() => handleOpenReceipt(bill)}>
                            <FaDownload className="me-1 text-secondary" size={12} /> Receipt
                          </button>
                        ) : (
                          <>
                            {isAdmin ? (
                              <>
                                <button className="btn btn-outline-secondary btn-sm bill-edit-button" aria-label="Edit bill" onClick={() => openEditModal(bill)} title="Edit Bill">
                                  <FaPen size={12} />
                                </button>
                                <button className="btn btn-outline-success btn-sm rounded-pill" onClick={() => handleWhatsAppRemind(bill)} aria-label="Send reminder on WhatsApp" title="Send reminder on WhatsApp">
                                  <FaWhatsapp size={16} className="me-1" />Remind
                                </button>
                                <button className="btn btn-outline-primary btn-sm rounded-pill px-3" onClick={() => handleMarkAsPaid(bill)}>
                                  <FaCheck className="me-1" size={12} /> Cash
                                </button>
                              </>
                            ) : (
                              <button className="btn btn-primary btn-sm rounded-pill px-4 fw-bold" onClick={() => handleOpenPayment(bill)}>Pay Now</button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center p-4 text-muted bg-white">No bills found.</div>
            )}
          </div>

        </div>
      </div>

      {reminderBill && <WhatsAppReminderModal bill={reminderBill} onClose={() => setReminderBill(null)} />}

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
      {receiptBill && <ReceiptModal bill={receiptBill} user={user} onClose={() => setReceiptBill(null)} />}
    </>
  );
};

export default MyBills;