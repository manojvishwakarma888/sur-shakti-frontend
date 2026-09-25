import { t as uiText, useLanguage, getLocale } from '../i18n/language.js';
import ExpenseWorkflow from '../components/ExpenseWorkflow';
import React, { useEffect, useState, useContext } from 'react';
import api, { getApiErrorMessage, openAuthenticatedFile } from '../services/api';
// import Sidebar from '../components/Sidebar'; // Uncomment if needed
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FaPlus, FaTrash, FaTimes, FaUpload, FaFileInvoice } from 'react-icons/fa';

const Expenses = () => {
  useLanguage();
    const { user } = useContext(AuthContext);
    const [workflowVersion, setWorkflowVersion] = useState(0);
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false); // Loading state for upload

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        amount: '',
        category: 'Repairs',
        date: new Date().toISOString().split('T')[0],
        description: '',
        receiptFile: null // <--- NEW: Stores the file object
    });

    const isAdmin = user?.role === 'Admin' || user?.role === 'Secretary';

    useEffect(() => {
        fetchExpenses();
    }, []);

    const fetchExpenses = async () => {
        try {
            const res = await api.get('Expense');
            setExpenses(res.data);
            setLoading(false);
        } catch (err) {
            toast.error(getApiErrorMessage(err, "Failed to load expenses."));
            setLoading(false);
        }
    };

    // --- 1. HANDLE FILE SELECTION ---
    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const selected = e.target.files[0];
            const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
            if (!allowedTypes.includes(selected.type)) {
                e.target.value = '';
                return toast.error(uiText("Choose a JPEG, PNG, WebP, or PDF receipt."));
            }
            if (selected.size > 5 * 1024 * 1024) {
                e.target.value = '';
                return toast.error(uiText("Receipt must be 5 MB or smaller."));
            }
            setFormData({ ...formData, receiptFile: selected });
        }
    };

    // --- 2. HANDLE SUBMIT (Using FormData) ---
    const handleAddExpense = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            // Create FormData object for File Upload
            const data = new FormData();
            data.append('Title', formData.title);
            data.append('Amount', formData.amount);
            data.append('Category', formData.category);
            data.append('Date', formData.date);
            data.append('Description', formData.description);

            // Only append file if one is selected
            if (formData.receiptFile) {
                data.append('ReceiptFile', formData.receiptFile);
            }

            // POST to 'Expense/add' with multipart/form-data header
            await api.post('Expense/add', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            toast.success(uiText("Expense Added Successfully!"));
            setShowModal(false);
            fetchExpenses(); setWorkflowVersion(v => v + 1); // Refresh list

            // Reset Form
            setFormData({
                title: '', amount: '', category: 'Repairs',
                date: new Date().toISOString().split('T')[0],
                description: '', receiptFile: null
            });

        } catch (err) {
            console.error(err);
            toast.error(getApiErrorMessage(err, 'Failed to add expense.'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm(uiText("Cancel this expense? The invoice and audit history will be retained."))) return;
        try {
            await api.delete(`Expense/${id}`);
            toast.success(uiText("Expense cancelled"));
            fetchExpenses();
        } catch (err) {
            toast.error(getApiErrorMessage(err, "Cancellation failed."));
        }
    };

    // Calculate Total
    const totalSpent = expenses.reduce((acc, curr) => acc + curr.amount, 0);

    // Calculate breakdown by category
    const categoriesList = ['Repairs', 'Salary', 'Utility', 'Event', 'Other'];
    const categoryColors = {
        Repairs: '#dc3545', // Red
        Salary: '#0d6efd',  // Primary Blue
        Utility: '#0dcaf0', // Cyan Info
        Event: '#198754',   // Success Green
        Other: '#ffc107'    // Warning Yellow
    };

    const breakdown = categoriesList.map(cat => {
        const amount = expenses
            .filter(e => (e.category || e.Category || '').toLowerCase() === cat.toLowerCase())
            .reduce((sum, e) => sum + e.amount, 0);
        const percentage = totalSpent > 0 ? (amount / totalSpent) * 100 : 0;
        return { category: cat, amount, percentage, color: categoryColors[cat] };
    }).filter(item => item.amount > 0);

    return (
        <div className="expenses-screen">
                <div className="page-heading">
                    <h2 className="fw-bold text-dark">{uiText("Society Expenses")}</h2>
                    {isAdmin && (
                        <button className="btn btn-danger fw-bold shadow-sm" onClick={() => setShowModal(true)}>
                            <FaPlus className="me-2" />{' ' + uiText("Add Expense")}</button>
                    )}
                </div>

                {/* Summary & Breakdown Row */}
                <div className="row g-3 mb-4">
                    <div className="col-md-4">
                        <div className="card border-0 shadow-sm rounded-4 bg-danger text-white p-3 h-100 d-flex flex-column justify-content-center">
                            <div className="card-body py-2">
                                <h6 className="opacity-75 text-uppercase small ls-1 mb-2">{uiText("Total Expenses")}</h6>
                                <h2 className="fw-bold display-5 mb-0">₹{totalSpent.toLocaleString('en-IN')}</h2>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-8">
                        <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100">
                            <div className="card-body">
                                <h6 className="text-muted fw-bold small text-uppercase mb-3">{uiText("Breakdown by Category")}</h6>
                                {totalSpent > 0 ? (
                                    <>
                                        {/* Multi-segment Progress Bar */}
                                        <div className="progress rounded-pill mb-3" style={{ height: '14px', overflow: 'hidden' }}>
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
                                                    title={`${item.category}: ₹${item.amount.toLocaleString('en-IN')} (${item.percentage.toFixed(1)}%)`}
                                                ></div>
                                            ))}
                                        </div>
                                        
                                        {/* Legend Grid */}
                                        <div className="row g-2">
                                            {breakdown.map((item, idx) => (
                                                <div key={idx} className="col-6 col-sm-4 col-md-3">
                                                    <div className="d-flex align-items-center gap-2">
                                                        <span className="rounded-circle d-inline-block" style={{ width: '10px', height: '10px', backgroundColor: item.color, flexShrink: 0 }}></span>
                                                        <div className="text-truncate">
                                                            <small className="fw-bold d-block text-dark text-truncate" style={{ fontSize: '0.75rem' }}>{item.category}</small>
                                                            <small className="text-muted font-monospace" style={{ fontSize: '0.7rem' }}>
                                                                ₹{item.amount.toLocaleString('en-IN')} ({item.percentage.toFixed(0)}%)
                                                            </small>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <small className="text-muted">{uiText("No expenses recorded to analyze.")}</small>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Expenses Table */}
                <div className="card border-0 shadow-sm rounded-4 expense-list-shell">
                    <div className="card-body p-0">
                        {loading ? <div className="p-4 text-center">{uiText("Loading...")}</div> : expenses.length === 0 ? <div className="p-5 text-center text-muted">{uiText("No expenses recorded yet.")}</div> : (
                            <>
                                {/* Desktop Table View */}
                                <div className="d-none d-md-block table-responsive">
                                    <table className="table table-hover align-middle mb-0">
                                        <thead className="bg-light">
                                            <tr>
                                                <th className="ps-4">{uiText("Date")}</th>
                                                <th>{uiText("Title")}</th>
                                                <th>{uiText("Category")}</th>
                                                <th>{uiText("Amount")}</th>
                                                <th>{uiText("Receipt")}</th>
                                                {isAdmin && <th className="text-end pe-4">{uiText("Action")}</th>}
                                                </tr>
                                        </thead>
                                        <tbody>
                                            {expenses.map(exp => (
                                                <tr key={exp.id}>
                                                    <td className="ps-4 text-muted">{new Date(exp.date).toLocaleDateString(getLocale())}</td>
                                                    <td className="fw-bold text-dark">{exp.title}</td>
                                                    <td><span className="badge bg-secondary bg-opacity-10 text-secondary border">{uiText(exp.category)}</span></td>
                                                    <td className="fw-bold text-danger">- ₹{exp.amount}</td>

                                                    {/* --- NEW: DOWNLOAD BUTTON --- */}
                                                    {exp.receiptUrl ? (
                                                        <td>
                                                            <button
                                                                type="button"
                                                                onClick={() => openAuthenticatedFile(exp.receiptUrl).catch(() => toast.error(uiText("Unable to open receipt.")))}
                                                                className="btn btn-sm btn-light border text-primary"
                                                                title={uiText("View Bill")}
                                                            >
                                                                <FaFileInvoice className="me-1" />{' ' + uiText("View")}</button>
                                                        </td>
                                                    ) : (
                                                        // We MUST render an empty TD to keep alignment, 
                                                        // unless you want the column to collapse.
                                                        <td></td>
                                                    )}

                                                    {isAdmin && (
                                                        <td className="text-end pe-4">
                                                            <button aria-label={uiText("Cancel expense")} title={uiText("Cancel expense")} onClick={() => handleDelete(exp.id)} className="btn btn-sm btn-outline-danger border-0 rounded-circle"><FaTrash size={12} /></button>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile Card Stack View */}
                                <div className="d-block d-md-none expense-mobile-list">
                                    {expenses.map(exp => (
                                        <div key={exp.id} className="p-3 border-bottom bg-white expense-mobile-card">
                                            <div className="d-flex justify-content-between align-items-start mb-1">
                                                <div>
                                                    <div className="fw-bold text-dark">{exp.title}</div>
                                                    <small className="text-muted">{new Date(exp.date).toLocaleDateString(getLocale())}</small>
                                                </div>
                                                <span className="badge bg-secondary bg-opacity-10 text-secondary border">{uiText(exp.category)}</span>
                                            </div>
                                            <div className="d-flex justify-content-between align-items-center mt-3">
                                                <span className="fw-bold text-danger">- ₹{exp.amount}</span>
                                                <div className="d-flex gap-2">
                                                    {exp.receiptUrl && (
                                                        <button
                                                            type="button"
                                                            onClick={() => openAuthenticatedFile(exp.receiptUrl).catch(() => toast.error(uiText("Unable to open receipt.")))}
                                                            className="btn btn-sm btn-light border text-primary"
                                                            title={uiText("View Bill")}
                                                        >
                                                            <FaFileInvoice className="me-1" size={12} />{' ' + uiText("View")}</button>
                                                    )}
                                                    {isAdmin && (
                                                        <button aria-label={uiText("Cancel expense")} title={uiText("Cancel expense")} onClick={() => handleDelete(exp.id)} className="btn btn-sm btn-outline-danger border-0 rounded-circle"><FaTrash size={12} /></button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {isAdmin && <ExpenseWorkflow refreshVersion={workflowVersion} onChanged={fetchExpenses} />}
                {/* ADD EXPENSE MODAL */}
                {showModal && (
                    <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
                        <div className="bg-white rounded-4 shadow-lg p-4" style={{ width: 'min(450px, calc(100vw - 24px))', maxHeight: '90dvh', overflowY: 'auto' }}>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h5 className="fw-bold mb-0">{uiText("Add New Expense")}</h5>
                                <button onClick={() => setShowModal(false)} className="btn btn-sm btn-light rounded-circle"><FaTimes /></button>
                            </div>
                            <form onSubmit={handleAddExpense}>
                                <div className="mb-3">
                                    <label className="form-label small fw-bold text-muted">{uiText("TITLE")}</label>
                                    <input type="text" className="form-control" placeholder={uiText("e.g. Lift Repair")} required
                                        value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label small fw-bold text-muted">{uiText("AMOUNT (₹)")}</label>
                                    <input type="number" min=".01" step=".01" className="form-control" required
                                        value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} />
                                </div>
                                <div className="row mb-3">
                                    <div className="col-6">
                                        <label className="form-label small fw-bold text-muted">{uiText("CATEGORY")}</label>
                                        <select className="form-select" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                            <option value="Repairs">{uiText("Repairs")}</option>
                                            <option value="Salary">{uiText("Salary")}</option>
                                            <option value="Utility">{uiText("Utility")}</option>
                                            <option value="Event">{uiText("Event")}</option>
                                            <option value="Other">{uiText("Other")}</option>
                                        </select>
                                    </div>
                                    <div className="col-6">
                                        <label className="form-label small fw-bold text-muted">{uiText("DATE")}</label>
                                        <input type="date" className="form-control" required
                                            value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                                    </div>
                                </div>

                                {/* --- NEW: FILE UPLOAD INPUT --- */}
                                <div className="mb-4">
                                    <label className="form-label small fw-bold text-muted">{uiText("UPLOAD BILL / RECEIPT")}</label>
                                    <div className="input-group">
                                        <input type="file" className="form-control" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={handleFileChange} />
                                        <span className="input-group-text bg-light text-secondary"><FaUpload /></span>
                                    </div>
                                    {formData.receiptFile && (
                                        <small className="text-success d-block mt-1">{uiText("Selected:") + ' '}{formData.receiptFile.name}</small>
                                    )}
                                    <small className="text-muted d-block mt-1">{uiText("JPEG, PNG, WebP, or PDF · up to 5 MB")}</small>
                                </div>

                                <button type="submit" className="btn btn-danger w-100 fw-bold py-2" disabled={submitting}>
                                    {submitting ? uiText("Uploading...") : uiText("Save Expense")}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

        </div>
    );
};

export default Expenses;


