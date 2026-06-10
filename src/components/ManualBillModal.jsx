import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api'; 
import { FaTimes, FaSearch, FaLayerGroup, FaCalendarAlt, FaFileInvoice } from 'react-icons/fa';
import { toast } from 'react-toastify';

const ManualBillModal = ({ onClose, onSuccess }) => {
    const [residents, setResidents] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        title: 'Maintenance Bill',
        month: '', 
        amount: '',
        type: 'Maintenance'
        // 🟢 REMOVED: dueDate
    });

    useEffect(() => {
        const fetchResidents = async () => {
            try {
                const res = await api.get('/Auth/all-residents');
                setResidents(res.data);
            } catch (err) {
                toast.error("Failed to load resident list.");
            }
        };
        fetchResidents();
    }, []);

    const filteredResidents = useMemo(() => {
        if (!searchTerm) return residents;
        return residents.filter(user => 
            (user.fullName && user.fullName.toLowerCase().includes(searchTerm.toLowerCase())) || 
            (user.flatNo && user.flatNo.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [residents, searchTerm]);

    const toggleResident = (userId) => {
        setSelectedIds(prev => 
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const handleSelectAllVisible = () => {
        const visibleIds = filteredResidents.map(u => u.id);
        const allVisibleSelected = visibleIds.every(id => selectedIds.includes(id));
        if (allVisibleSelected) {
            setSelectedIds(prev => prev.filter(id => !visibleIds.includes(id))); 
        } else {
            setSelectedIds(prev => [...new Set([...prev, ...visibleIds])]); 
        }
    };

    const handleSubmit = async () => {
        if (selectedIds.length === 0) return toast.error("Select at least one resident.");
        if (!formData.month) return toast.error("Please select a billing month.");
        if (!formData.title.trim()) return toast.error("Bill title is required.");

        setLoading(true);
        try {
            const payload = {
                userIds: selectedIds,
                title: `${formData.title} - ${formData.month}`, 
                amount: formData.amount ? parseFloat(formData.amount) : 0,
                type: formData.type,
                // 🟢 REMOVED: dueDate from payload
            };

            const res = await api.post('/Bill/bulk-generate', payload);
            toast.success(res.data.message);
            onSuccess();
            onClose();
        } catch (error) {
            toast.error(error.response?.data || "Failed to generate bills.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" 
             style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1050, backdropFilter: 'blur(4px)' }}>
            
            <div className="bg-white rounded-4 shadow-lg w-100 mx-3" style={{ maxWidth: '900px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                
                <div className="d-flex justify-content-between align-items-center p-3 border-bottom">
                    <div>
                        <h5 className="mb-0 fw-bold text-dark"><FaFileInvoice className="me-2 text-primary"/> Generate New Bills</h5>
                        <p className="text-muted small mb-0">Select residents and customize billing details.</p>
                    </div>
                    <button onClick={onClose} className="btn-close shadow-none"></button>
                </div>

                <div className="modal-body p-0 d-flex flex-column flex-lg-row" style={{ overflow: 'hidden' }}>
                    
                    {/* LEFT: RESIDENT LIST */}
                    <div className="col-lg-7 border-end d-flex flex-column bg-light p-3">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className="fw-bold small text-secondary">
                                <FaLayerGroup className="me-1"/> SELECTION ({selectedIds.length})
                            </span>
                            <button className="btn btn-sm btn-link text-decoration-none fw-bold p-0" onClick={handleSelectAllVisible}>
                                {filteredResidents.length > 0 && filteredResidents.every(id => selectedIds.includes(id.id)) ? "Deselect All" : "Select All Visible"}
                            </button>
                        </div>

                        <div className="input-group mb-3 shadow-sm border rounded-3 overflow-hidden">
                            <span className="input-group-text bg-white border-0"><FaSearch className="text-muted"/></span>
                            <input 
                                type="text" 
                                className="form-control border-0 shadow-none" 
                                placeholder="Search by Name or Flat No..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="flex-grow-1 border rounded-3 bg-white shadow-sm overflow-auto" style={{ maxHeight: '400px' }}>
                            {filteredResidents.map(user => (
                                <div 
                                    key={user.id} 
                                    className={`d-flex align-items-center p-2 border-bottom transition-all ${selectedIds.includes(user.id) ? 'bg-primary-subtle' : ''}`}
                                    onClick={() => toggleResident(user.id)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <input className="form-check-input ms-2" type="checkbox" checked={selectedIds.includes(user.id)} readOnly />
                                    <div className="ms-3">
                                        <div className="fw-bold text-dark small">{user.fullName}</div>
                                        <div className="text-muted" style={{fontSize: '0.75rem'}}>Flat No: <span className="fw-bold">{user.flatNo}</span></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* RIGHT: BILL FORM */}
                    <div className="col-lg-5 p-4 bg-white d-flex flex-column shadow-sm">
                        <h6 className="fw-bold text-uppercase small text-muted border-bottom pb-2 mb-4">Billing Information</h6>

                        <div className="mb-3">
                            <label className="form-label small fw-bold">Bill Title <span className="text-danger">*</span></label>
                            <input 
                                type="text" 
                                className="form-control form-control-sm shadow-none" 
                                placeholder="e.g. Monthly Maintenance"
                                value={formData.title}
                                onChange={e => setFormData({...formData, title: e.target.value})}
                            />
                        </div>

                        {/* 🟢 UPDATED: Month Picker with Label Placeholder */}
                        <div className="mb-3">
                            <label className="form-label small fw-bold">Billing Month <span className="text-danger">*</span></label>
                            <div className="input-group input-group-sm">
                                <span className="input-group-text bg-light"><FaCalendarAlt className="text-muted"/></span>
                                <input 
                                    type="month" 
                                    className="form-control shadow-none" 
                                    required
                                    onChange={(e) => {
                                        if (!e.target.value) return;
                                        const date = new Date(e.target.value + "-01");
                                        const formatted = date.toLocaleString('default', { month: 'long', year: 'numeric' });
                                        setFormData({...formData, month: formatted});
                                    }}
                                />
                            </div>
                            {/* 🟢 Conditional Helper acts as a dynamic placeholder */}
                            <div className="mt-1" style={{minHeight: '20px'}}>
                                {formData.month ? (
                                    <span className="text-primary fw-bold" style={{fontSize: '0.75rem'}}>Selected: {formData.month}</span>
                                ) : (
                                    <span className="text-muted italic" style={{fontSize: '0.75rem'}}>Select a month from the calendar above</span>
                                )}
                            </div>
                        </div>

                        <div className="row g-2 mb-4">
                            <div className="col-6">
                                <label className="form-label small fw-bold">Type</label>
                                <select className="form-select form-select-sm shadow-none" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                                    <option value="Maintenance">Maintenance</option>
                                    <option value="Event">Event</option>
                                    <option value="Penalty">Penalty</option>
                                </select>
                            </div>
                            <div className="col-6">
                                <label className="form-label small fw-bold">Amount (₹)</label>
                                <input type="number" className="form-control form-control-sm shadow-none" placeholder="0.00" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                            </div>
                        </div>

                        {/* 🟢 REMOVED: Due Date Input Section */}

                        <div className="mt-auto">
                            <button className="btn btn-primary w-100 fw-bold py-2 shadow-sm" onClick={handleSubmit} disabled={loading || selectedIds.length === 0}>
                                {loading ? "Generating..." : `Create ${selectedIds.length} Bills`}
                            </button>
                            <button className="btn btn-link text-muted w-100 mt-2 text-decoration-none small" onClick={onClose}>Discard</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManualBillModal;