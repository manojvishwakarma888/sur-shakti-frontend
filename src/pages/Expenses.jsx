import React, { useEffect, useState, useContext } from 'react';
import api from '../services/api';
// import Sidebar from '../components/Sidebar'; // Uncomment if needed
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FaPlus, FaTrash, FaTimes, FaUpload, FaFileInvoice } from 'react-icons/fa';

const Expenses = () => {
    const { user } = useContext(AuthContext);
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
    const BACKEND_URL = "http://localhost:5236"; // Base URL for images

    useEffect(() => {
        fetchExpenses();
    }, []);

    const fetchExpenses = async () => {
        try {
            const res = await api.get('Expense');
            setExpenses(res.data);
            setLoading(false);
        } catch (err) {
            toast.error("Failed to load expenses.");
            setLoading(false);
        }
    };

    // --- 1. HANDLE FILE SELECTION ---
    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFormData({ ...formData, receiptFile: e.target.files[0] });
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

            toast.success("Expense Added Successfully!");
            setShowModal(false);
            fetchExpenses(); // Refresh list

            // Reset Form
            setFormData({
                title: '', amount: '', category: 'Repairs',
                date: new Date().toISOString().split('T')[0],
                description: '', receiptFile: null
            });

        } catch (err) {
            console.error(err);
            toast.error("Failed to add expense.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this record?")) return;
        try {
            await api.delete(`Expense/${id}`);
            toast.success("Deleted successfully");
            fetchExpenses();
        } catch (err) {
            toast.error("Delete failed.");
        }
    };

    // Calculate Total
    const totalSpent = expenses.reduce((acc, curr) => acc + curr.amount, 0);

    return (
        <div className="d-flex d-column">
            {/* <Sidebar /> */}
            <div className="flex-grow-1 bg-light" style={{ minHeight: '100vh' }}>

                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2 className="fw-bold text-dark">Society Expenses</h2>
                    {isAdmin && (
                        <button className="btn btn-danger fw-bold shadow-sm" onClick={() => setShowModal(true)}>
                            <FaPlus className="me-2" /> Add Expense
                        </button>
                    )}
                </div>

                {/* Summary Card */}
                <div className="row mb-4">
                    <div className="col-md-4">
                        <div className="card border-0 shadow-sm rounded-4 bg-danger text-white p-3">
                            <div className="card-body">
                                <h6 className="opacity-75 text-uppercase small ls-1">Total Expenses</h6>
                                <h2 className="fw-bold display-5 mb-0">₹{totalSpent.toLocaleString('en-IN')}</h2>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Expenses Table */}
                <div className="card border-0 shadow-sm rounded-4">
                    <div className="card-body p-0">
                        {loading ? <div className="p-4 text-center">Loading...</div> : expenses.length === 0 ? <div className="p-5 text-center text-muted">No expenses recorded yet.</div> : (
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="bg-light">
                                        <tr>
                                            <th className="ps-4">Date</th>
                                            <th>Title</th>
                                            <th>Category</th>
                                            <th>Amount</th>
                                            <th>Receipt</th>
                                            {isAdmin && <th className="text-end pe-4">Action</th>}
                                            </tr>
                                    </thead>
                                    <tbody>
                                        {expenses.map(exp => (
                                            <tr key={exp.id}>
                                                <td className="ps-4 text-muted">{new Date(exp.date).toLocaleDateString()}</td>
                                                <td className="fw-bold text-dark">{exp.title}</td>
                                                <td><span className="badge bg-secondary bg-opacity-10 text-secondary border">{exp.category}</span></td>
                                                <td className="fw-bold text-danger">- ₹{exp.amount}</td>

                                                {/* --- NEW: DOWNLOAD BUTTON --- */}
                                                {exp.receiptUrl ? (
                                                    <td>
                                                        <a
                                                            href={`${BACKEND_URL}${exp.receiptUrl}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="btn btn-sm btn-light border text-primary"
                                                            title="View Bill"
                                                        >
                                                            <FaFileInvoice className="me-1" /> View
                                                        </a>
                                                    </td>
                                                ) : (
                                                    // We MUST render an empty TD to keep alignment, 
                                                    // unless you want the column to collapse.
                                                    <td></td>
                                                )}

                                                {isAdmin && (
                                                    <td className="text-end pe-4">
                                                        <button onClick={() => handleDelete(exp.id)} className="btn btn-sm btn-outline-danger border-0 rounded-circle"><FaTrash size={12} /></button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* ADD EXPENSE MODAL */}
                {showModal && (
                    <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
                        <div className="bg-white rounded-4 shadow-lg p-4" style={{ width: '450px' }}>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h5 className="fw-bold mb-0">Add New Expense</h5>
                                <button onClick={() => setShowModal(false)} className="btn btn-sm btn-light rounded-circle"><FaTimes /></button>
                            </div>
                            <form onSubmit={handleAddExpense}>
                                <div className="mb-3">
                                    <label className="form-label small fw-bold text-muted">TITLE</label>
                                    <input type="text" className="form-control" placeholder="e.g. Lift Repair" required
                                        value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label small fw-bold text-muted">AMOUNT (₹)</label>
                                    <input type="number" className="form-control" required
                                        value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} />
                                </div>
                                <div className="row mb-3">
                                    <div className="col-6">
                                        <label className="form-label small fw-bold text-muted">CATEGORY</label>
                                        <select className="form-select" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                            <option>Repairs</option>
                                            <option>Salary</option>
                                            <option>Utility</option>
                                            <option>Event</option>
                                            <option>Other</option>
                                        </select>
                                    </div>
                                    <div className="col-6">
                                        <label className="form-label small fw-bold text-muted">DATE</label>
                                        <input type="date" className="form-control" required
                                            value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                                    </div>
                                </div>

                                {/* --- NEW: FILE UPLOAD INPUT --- */}
                                <div className="mb-4">
                                    <label className="form-label small fw-bold text-muted">UPLOAD BILL / RECEIPT</label>
                                    <div className="input-group">
                                        <input type="file" className="form-control" accept="image/*,.pdf" onChange={handleFileChange} />
                                        <span className="input-group-text bg-light text-secondary"><FaUpload /></span>
                                    </div>
                                    {formData.receiptFile && (
                                        <small className="text-success d-block mt-1">Selected: {formData.receiptFile.name}</small>
                                    )}
                                </div>

                                <button type="submit" className="btn btn-danger w-100 fw-bold py-2" disabled={submitting}>
                                    {submitting ? "Uploading..." : "Save Expense"}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default Expenses;