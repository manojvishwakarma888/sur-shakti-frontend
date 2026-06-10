import React, { useEffect, useState, useContext } from 'react';
import api from '../services/api';
import PaymentModal from '../components/PaymentModal';
import ReceiptModal from '../components/ReceiptModal';
import ManualBillModal from '../components/ManualBillModal';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { 
  FaUser, FaDownload, FaWhatsapp, FaHistory, 
  FaPlus, FaTimes, FaCheck, FaPen, FaFileCsv 
} from 'react-icons/fa';

const MyBills = () => {
  const { user } = useContext(AuthContext);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterMonth, setFilterMonth] = useState('All');

  const [selectedBill, setSelectedBill] = useState(null);
  const [receiptBill, setReceiptBill] = useState(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);

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

  const fetchBills = async () => {
    try {
      const res = await api.get('Bill');
      setBills(res.data);
    } catch (err) {
      toast.error("Could not load bills.");
    } finally {
      setLoading(false);
    }
  };

  const filteredBills = bills.filter(bill => {
    const isPaid = bill.isPaid ?? bill.IsPaid;
    const billMonth = bill.month || bill.Month || "";
    const matchesStatus = filterStatus === 'All' || (filterStatus === 'Paid' && isPaid === true) || (filterStatus === 'Unpaid' && isPaid === false);
    let matchesMonth = filterMonth === 'All' ? true : filterMonth === 'Others' ? !displayMonths.includes(billMonth) : billMonth === filterMonth;
    return matchesStatus && matchesMonth;
  });

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
    try {
      await api.put(`Bill/${bill.billId}/pay`, { IsPaid: true });
      toast.success("Marked as Paid");
      fetchBills();
    } catch (err) {
      toast.error("Failed to update status.");
    }
  };

  const handleWhatsAppRemind = (bill) => {
    let num = (bill.phoneNumber || bill.User?.PhoneNumber || "").toString().replace(/\D/g, '');
    if (num.length === 10) num = "91" + num;
    const msg = `*Sur Shakti Residency*\nPending: *${bill.month}*\nAmount: *₹${bill.amount}*`;
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="flex-grow-1 bg-light p-3 p-md-4" style={{ minHeight: '100vh' }}>
      
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold mb-0">{isAdmin ? 'Society Billing' : 'My Payments'}</h2>
        {isAdmin && (
          <button className="btn btn-dark fw-bold btn-sm" onClick={() => setShowGenerateModal(true)}>
            <FaPlus className="me-2" /> Generate Bill
          </button>
        )}
      </div>

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
          <div className="table-responsive">
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
                  <tr><td colSpan="6" className="text-center p-4">Loading bills...</td></tr>
                ) : filteredBills.length > 0 ? filteredBills.map(bill => {
                  const isPaid = bill.isPaid ?? bill.IsPaid;
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
                        <div className="d-flex justify-content-end gap-2">
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
                                  <button className="btn btn-outline-success btn-sm rounded-circle shadow-sm" onClick={() => handleWhatsAppRemind(bill)} title="WhatsApp Reminder">
                                    <FaWhatsapp size={16} />
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
              <div className="d-flex gap-2">
                <button type="submit" className="btn btn-dark w-100 fw-bold">Update</button>
                <button type="button" className="btn btn-light w-100" onClick={() => setShowEditModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showGenerateModal && <ManualBillModal onClose={() => setShowGenerateModal(false)} onSuccess={fetchBills} />}
      {selectedBill && <PaymentModal bill={selectedBill} onClose={() => setSelectedBill(null)} onPaymentComplete={() => fetchBills()} />}
      {receiptBill && <ReceiptModal bill={receiptBill} user={user} onClose={() => setReceiptBill(null)} />}
    </div>
  );
};

export default MyBills;