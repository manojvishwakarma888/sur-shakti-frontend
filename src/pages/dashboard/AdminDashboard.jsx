import ManualBillModal from '../../components/ManualBillModal';
import { billPayableAmount } from '../../utils/billing';
import WidgetStack from '../../components/WidgetStack';
import MobileShortcuts from '../../components/MobileShortcuts';
import React, { useEffect, useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext'; 
import api from '../../services/api'; 
import Sidebar from '../../components/Sidebar'; 
import BulkImportModal from '../../components/BulkImportModal'; // 🟢 NEW: Import the Modal
import { toast } from 'react-toastify';

// Icons
import { 
  FaBullhorn, FaExclamationTriangle, FaRupeeSign, 
  FaWallet, FaArrowDown, FaArrowUp, FaBell, FaUserPlus 
} from 'react-icons/fa';
import { MdOutlinePendingActions } from "react-icons/md";

const AdminDashboard = () => {
  const { user } = useContext(AuthContext);
  
  const [stats, setStats] = useState({ 
      totalCollection: 0,
      totalExpense: 0,
      cashInHand: 0, 
      totalPending: 0, 
      openComplaints: 0 
  });
  
  const [showCreateBill, setShowCreateBill] = useState(false);
  const [defaulters, setDefaulters] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingReminders, setSendingReminders] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false); // 🟢 NEW: Modal State

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, billsRes, expensesRes] = await Promise.all([
          api.get('/Dashboard/stats'),
          api.get('/Bill'),
          api.get('/Expense')
      ]);
      const data = statsRes.data;

      setStats({
        totalCollection: data.totalIncome || 0,    
        totalExpense: data.totalExpense || 0,      
        cashInHand: data.cashInHand || 0,          
        totalPending: data.totalPending || 0,      
        openComplaints: data.pendingComplaints || 0 
      });

      const unpaidList = (billsRes.data || [])
        .filter(b => !(b.isPaid || b.IsPaid))
        .map(b => ({
             id: b.billId || b.BillId,
             name: b.residentName || b.ResidentName || 'Unknown',
             flatNo: b.flatNo || b.FlatNo,
             amount: billPayableAmount(b),
             date: b.dueDate || b.DueDate
        }));

      setDefaulters(unpaidList);
      setExpenses(expensesRes.data || []);
      setLoading(false);
    } catch (err) { 
        console.error("Dashboard Load Error:", err); 
        setLoading(false); 
    }
  };

  const exportDues = () => {
    const cell = (value) => {
      let text = String(value ?? '');
      if (/^[=+@\-\t\r]/.test(text)) text = "'" + text;
      return '"' + text.replaceAll('"', '""') + '"';
    };
    const rows = [['Resident', 'Row house', 'Amount due', 'Due date'],
      ...defaulters.map(item => [item.name, item.flatNo, item.amount, item.date || ''])];
    const url = URL.createObjectURL(new Blob([rows.map(row => row.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'SurShakti_Pending_Dues.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleSendReminders = async () => {
      if (!window.confirm("Send reminders for due and overdue bills?")) return;
      setSendingReminders(true);
      try {
          const response = await api.post('/Bill/send-reminders');
          toast.success((response.data.queued ?? 0) + ' reminders sent to resident inboxes.');
      } catch (error) {
          toast.error("Failed to send reminders.");
      } finally {
          setSendingReminders(false);
      }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

  const StatsCard = ({ title, value, color, icon: Icon, isMoney }) => (
    <div className="col">
      <div className={"card admin-stat-card border-0 shadow-sm rounded-4 h-100 stat-tone-" + color} style={{ backgroundColor: `var(--bs-${color}-bg-subtle)` }}>
        <div className="card-body p-3">
          <div className="d-flex justify-content-between align-items-start mb-2">
             <div className={`bg-${color} bg-opacity-25 rounded-circle p-2 d-flex align-items-center justify-content-center`} style={{width: '40px', height: '40px'}}>
                <Icon className={`text-${color}`} size={18} />
             </div>
          </div>
          <h6 className="text-muted fw-bold small mb-1 text-uppercase" style={{fontSize: '0.7rem', letterSpacing: '0.5px'}}>{title}</h6>
          <h4 className={`fw-bold text-${color} mb-0`}>{isMoney ? formatCurrency(value) : value}</h4>
        </div>
      </div>
    </div>
  );

  return (
    <div className="admin-dashboard">
        
        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-4 screen-intro">
          <div>
             <h2 className="fw-bold text-dark mb-1">Admin Overview</h2>
             <p className="text-muted small mb-0">Sur Shakti Residency • Financial Health</p>
          </div>
          <div className="d-none d-md-flex align-items-center gap-3">
             {/* 🟢 NEW: Bulk Add Button */}
             <button 
                onClick={() => setShowImportModal(true)} 
                className="btn btn-outline-success btn-sm fw-bold d-flex align-items-center gap-2"
             >
                <FaUserPlus /> Bulk Add
             </button>
          </div>
        </div>

        <div className="d-flex flex-wrap gap-2 mb-3"><Link className="btn btn-outline-primary" to="/maintenance">Accounts & residents</Link><Link className="btn btn-outline-primary" to="/notifications">Notification inbox</Link></div>
        <MobileShortcuts admin onAddResidents={() => setShowImportModal(true)} onCreateBill={() => setShowCreateBill(true)} onExportDues={exportDues} exportDisabled={loading || defaulters.length === 0} onRefresh={fetchAdminData} refreshing={loading} />
        {/* Stats Row */}
        <WidgetStack label="Admin widgets" labels={['Payments received', 'Total spending', 'Available funds', 'Amount still due', 'Open Complaints']} className="row row-cols-2 row-cols-sm-3 row-cols-md-5 g-3 mb-4 admin-widget-row">
          <StatsCard title="Payments received" value={stats.totalCollection} color="primary" icon={FaArrowUp} isMoney />
          <StatsCard title="Total spending" value={stats.totalExpense} color="danger" icon={FaArrowDown} isMoney />
          <StatsCard title="Available funds" value={stats.cashInHand} color="success" icon={FaWallet} isMoney />
          <StatsCard title="Amount still due" value={stats.totalPending} color="warning" icon={MdOutlinePendingActions} isMoney />
          <StatsCard title="Open Complaints" value={stats.openComplaints} color="info" icon={FaExclamationTriangle} />
        </WidgetStack>

        {/* Expense Breakdown Progress Bar */}
        {(() => {
          const categoriesList = ['Repairs', 'Salary', 'Utility', 'Event', 'Other'];
          const categoryColors = {
              Repairs: '#dc3545',
              Salary: '#0d6efd',
              Utility: '#0dcaf0',
              Event: '#198754',
              Other: '#ffc107'
          };
          const breakdown = categoriesList.map(cat => {
              const amount = expenses
                  .filter(e => (e.category || e.Category || '').toLowerCase() === cat.toLowerCase())
                  .reduce((sum, e) => sum + e.amount, 0);
              const percentage = stats.totalExpense > 0 ? (amount / stats.totalExpense) * 100 : 0;
              return { category: cat, amount, percentage, color: categoryColors[cat] };
          }).filter(item => item.amount > 0);

          return stats.totalExpense > 0 && breakdown.length > 0 && (
            <div className="card border-0 shadow-sm rounded-4 mb-4 p-3 bg-white">
              <div className="card-body p-1">
                <div className="d-flex justify-content-between align-items-center mb-2">
                   <small className="text-muted fw-bold text-uppercase" style={{fontSize: '0.65rem', letterSpacing: '0.5px'}}>Expense Distribution</small>
                   <small className="text-danger fw-bold font-monospace" style={{fontSize: '0.7rem'}}>Total: {formatCurrency(stats.totalExpense)}</small>
                </div>
                <div className="progress rounded-pill mb-2" style={{ height: '8px', overflow: 'hidden' }}>
                   {breakdown.map((item, idx) => (
                      <div 
                        key={idx}
                        className="progress-bar"
                        role="progressbar"
                        style={{ 
                            width: `${item.percentage}%`, 
                            backgroundColor: item.color,
                            transition: 'width 0.6s ease'
                        }}
                        aria-valuenow={item.percentage}
                        aria-valuemin="0"
                        aria-valuemax="100"
                        title={`${item.category}: ${formatCurrency(item.amount)} (${item.percentage.toFixed(1)}%)`}
                      ></div>
                   ))}
                </div>
                <div className="d-flex flex-wrap gap-3 mt-1">
                   {breakdown.map((item, idx) => (
                      <div key={idx} className="d-flex align-items-center gap-1">
                         <span className="rounded-circle d-inline-block" style={{ width: '8px', height: '8px', backgroundColor: item.color }}></span>
                         <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                            {item.category}: <span className="fw-bold text-dark">{formatCurrency(item.amount)}</span> ({item.percentage.toFixed(0)}%)
                         </small>
                      </div>
                   ))}
                </div>
              </div>
            </div>
          );
        })()}

        <div className="row g-4">
          {/* Defaulters List */}
          <div className="col-md-8">
            <div className="card border-0 shadow-sm rounded-4 h-100">
              <div className="card-body p-4">
                <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-2 admin-dues-heading">
                  <h5 className="fw-bold mb-0"><FaRupeeSign className="mobile-section-icon me-1" aria-hidden="true" />Residents with unpaid bills</h5>
                  <div className="d-flex gap-2">
                      <button 
                          onClick={handleSendReminders} 
                          disabled={sendingReminders || defaulters.length === 0}
                          className="btn btn-sm btn-success d-flex align-items-center gap-2 fw-bold"
                      >
                          <FaBell size={16} />
                          {sendingReminders ? "Sending..." : "Remind All"}
                      </button>
                      <Link to="/my-bills" className="btn btn-sm btn-outline-primary fw-bold text-decoration-none">
                          Manage All
                      </Link>
                  </div>
                </div>

                {loading ? <div className="text-center py-3">Loading...</div> : 
                 defaulters.length === 0 ? <p className="text-muted text-center py-4">No pending dues. Great job!</p> : 
                  defaulters.slice(0, 4).map(d => (
                    <div key={d.id} className="d-flex justify-content-between align-items-center p-3 mb-2 bg-white border rounded-3 admin-due-item">
                      <div className="d-flex align-items-center">
                        <span className="badge bg-danger bg-opacity-10 text-danger p-2 me-3 rounded-3" style={{width: '60px'}}> {d.flatNo}</span>
                        <div>
                            <h6 className="mb-0 fw-bold">{d.name}</h6>
                            <small className="text-muted">Due: {new Date(d.date).toLocaleDateString()}</small>
                        </div>
                      </div>
                      <span className="fw-bold text-danger">{formatCurrency(d.amount)}</span>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
          
          {/* Quick Tasks */}
          <div className="col-md-4">
            <div className="card border-0 shadow-sm rounded-4 h-100">
              <div className="card-body p-4">
                <h5 className="fw-bold mb-4">Quick Tasks</h5>
                <div className="d-grid gap-3">
                  <Link to="/notices" className="btn btn-light p-3 text-start rounded-4 border-0" style={{backgroundColor: 'var(--task-notice-bg, #E3F2FD)'}}>
                    <div className="d-flex align-items-center">
                        <div className="bg-white p-2 rounded-circle me-3 text-primary"><FaBullhorn /></div>
                        <div><h6 className="fw-bold mb-0">Post New Notice</h6><small className="text-muted">Broadcast to residents</small></div>
                    </div>
                  </Link>
                  {/* ... other task links ... */}
                </div>
              </div>
            </div>
          </div>
        </div>

      {showCreateBill && <ManualBillModal onClose={() => setShowCreateBill(false)} onSuccess={fetchAdminData} />}
      {/* 🟢 NEW: Bulk Import Modal Integration */}
      {showImportModal && (
        <BulkImportModal 
           onClose={() => setShowImportModal(false)} 
           onRefresh={fetchAdminData} 
        />
      )}
    </div>
  );
};

export default AdminDashboard;


