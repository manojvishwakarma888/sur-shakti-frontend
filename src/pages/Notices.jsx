import React, { useEffect, useState, useContext } from 'react';
import api from '../services/api';
// import Sidebar from '../components/Sidebar'; 
import { AuthContext } from '../context/AuthContext';
import { FaPlus, FaTrash, FaCalendarAlt, FaBullhorn, FaPen, FaTimes } from 'react-icons/fa';
import { toast } from 'react-toastify';

const Notices = () => {
  const { user } = useContext(AuthContext); 
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal & Mode State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);

  // Consolidated Form State
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    expiryDate: "",
    category: "",
    isUrgent: false
  });

  // 1. Fetch Notices on Load
  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    try {
      const res = await api.get('/notice');
      setNotices(res.data);
      localStorage.setItem('cached_notices', JSON.stringify(res.data));
      setLoading(false);
    } catch (err) {
      console.error("Failed to load notices, trying offline cache", err);
      const cached = localStorage.getItem('cached_notices');
      if (cached) {
        setNotices(JSON.parse(cached));
      }
      setLoading(false);
    }
  };

  // --- 2. MODAL HANDLERS ---

  // Open "Create" Modal
  const handleOpenCreate = () => {
    setIsEditing(false);
    setCurrentId(null);
    setFormData({ title: "", content: "", expiryDate: "", category: "", isUrgent: false }); // Reset form
    setShowModal(true);
  };

  // Open "Edit" Modal
  const handleOpenEdit = (notice) => {
    setIsEditing(true);
    setCurrentId(notice.id); // Or notice.noticeId depending on your DB
    
    // Pre-fill form with existing data
    setFormData({
        title: notice.title,
        content: notice.content,
        // Format date to YYYY-MM-DD for the input field
        expiryDate: notice.expiryDate ? new Date(notice.expiryDate).toISOString().split('T')[0] : "",
        category: notice.category,
        isUrgent: notice.isUrgent
    });
    
    setShowModal(true);
  };

  // --- 3. SUBMIT (Create OR Update) ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        // UPDATE Request (PUT)
        await api.put(`/notice/${currentId}`, formData);
        toast.success("Notice Updated Successfully!");
      } else {
        // CREATE Request (POST)
        await api.post('/notice', formData);
        toast.success("Notice Posted Successfully!");
      }

      setShowModal(false); 
      fetchNotices(); // Refresh List
    } catch (err) {
      console.error(err);
      toast.error(isEditing ? "Failed to update notice." : "Failed to post notice.");
    }
  };

  // --- 4. DELETE ---
  const handleDelete = async (id) => {
    if(!window.confirm("Are you sure you want to remove this notice?")) return;
    try {
      await api.delete(`/notice/${id}`);
      toast.success("Notice Deleted");
      fetchNotices();
    } catch (err) {
      toast.error("Could not delete notice");
    }
  };

  return (
    <>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="fw-bold text-dark"><FaBullhorn className="me-2 text-primary" /> Notice Board</h2>
          
          {user?.role === 'Admin' && (
            <button className="btn btn-primary fw-bold shadow-sm" onClick={handleOpenCreate}>
              <FaPlus className="me-2" /> Post New Notice
            </button>
          )}
        </div>

        <div className="row g-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="col-md-6 col-lg-4">
                <div className="card shadow-sm border-0 h-100 p-3">
                  <div className="card-body">
                    <div className="shimmer-placeholder shimmer-title w-75 mb-3" style={{ height: '1.25rem' }}></div>
                    <div className="shimmer-placeholder shimmer-text w-50 mb-3" style={{ height: '0.75rem' }}></div>
                    <div className="shimmer-placeholder shimmer-text w-100 mb-2"></div>
                    <div className="shimmer-placeholder shimmer-text w-90 mb-2"></div>
                    <div className="shimmer-placeholder shimmer-text w-60"></div>
                  </div>
                </div>
              </div>
            ))
          ) : notices.map((notice) => (
            <div key={notice.id || notice.noticeId} className="col-md-6 col-lg-4">
              <div className="card shadow-sm border-0 h-100"
              style={{ 
                backgroundColor: notice.isUrgent ? 'var(--urgent-bg, #fff5f5)' : 'var(--card-bg, #fff)', 
                borderLeft: notice.isUrgent ? '5px solid #dc3545' : 'none',
                color: 'var(--text-primary)'
              }}
              >
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start">
                    <h5 className="card-title fw-bold text-dark mb-1">
                        {notice.title}
                        {notice.isUrgent && (
                            <span className="badge bg-danger ms-2" style={{fontSize: '0.65rem', verticalAlign: 'middle'}}>URGENT</span>
                        )}
                    </h5>
                    
                    {/* ADMIN ACTIONS */}
                    {user?.role === 'Admin' && (
                      <div className="d-flex gap-2">
                        {/* EDIT BUTTON */}
                        <button 
                            className="btn btn-sm btn-outline-secondary border-0 rounded-circle"
                            onClick={() => handleOpenEdit(notice)}
                            title="Edit Notice"
                        >
                            <FaPen size={14} />
                        </button>
                        {/* DELETE BUTTON */}
                        <button 
                            className="btn btn-sm btn-outline-danger border-0 rounded-circle" 
                            onClick={() => handleDelete(notice.id || notice.noticeId)}
                            title="Delete Notice"
                        >
                            <FaTrash size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <h6 className="card-subtitle mb-3 text-muted small mt-1">
                    <span className="badge bg-light text-secondary border me-2">{notice.category}</span>
                    <FaCalendarAlt className="me-1" /> Expires: {new Date(notice.expiryDate).toLocaleDateString()}
                  </h6>
                  
                  <p className="card-text text-secondary" style={{whiteSpace: 'pre-line'}}>
                    {notice.content}
                  </p>
                </div>
                <div className="card-footer bg-transparent border-0 text-end pt-0">
                    <small className="text-muted fst-italic" style={{fontSize: '0.75rem'}}>Posted by Secretary</small>
                </div>
              </div>
            </div>
          ))}

          {notices.length === 0 && !loading && (
            <div className="col-12 text-center mt-5 text-muted">
              <p>No active notices found.</p>
            </div>
          )}
        </div>

        {/* --- MODAL --- */}
        {showModal && (
          <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content shadow-lg border-0">
                <div className="modal-header justify-content-between">
                  <h5 className="modal-title fw-bold">
                      {isEditing ? "Edit Notice" : "Post New Notice"}
                  </h5>
                  <button type="button" className="btn btn-light rounded-circle btn-sm p-2" onClick={() => setShowModal(false)}>
                      <FaTimes />
                  </button>
                </div>
                <div className="modal-body p-4">
                  <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                      <label className="form-label small fw-bold text-muted">TITLE</label>
                      <input type="text" className="form-control" required 
                             value={formData.title} 
                             onChange={e => setFormData({...formData, title: e.target.value})} />
                    </div>
                    <div className="mb-3">
                      <label className="form-label small fw-bold text-muted">CONTENT / DETAILS</label>
                      <textarea className="form-control" rows="4" required 
                                value={formData.content} 
                                onChange={e => setFormData({...formData, content: e.target.value})}></textarea>
                    </div>
                    <div className="row g-3 mb-3">
                        <div className="col-12 col-md-6">
                            <label className="form-label small fw-bold text-muted">CATEGORY</label>
                            <select className="form-select" required 
                                value={formData.category} 
                                onChange={e => setFormData({...formData, category: e.target.value})}>
                                <option value="">Select...</option>
                                <option value="General">General</option>
                                <option value="Event">Event</option>
                                <option value="Maintenance">Maintenance</option>
                                <option value="Alert">Alert</option>
                            </select>
                        </div>
                        <div className="col-12 col-md-6">
                            <label className="form-label small fw-bold text-muted">EXPIRY DATE</label>
                            <input type="date" className="form-control" required 
                                   value={formData.expiryDate} 
                                   onChange={e => setFormData({...formData, expiryDate: e.target.value})} />
                        </div>
                    </div>
                    
                    <div className="mb-4 form-check bg-light p-2 rounded border">
                      <input 
                        type="checkbox" 
                        className="form-check-input ms-1" 
                        id="urgentCheck"
                        checked={formData.isUrgent}
                        onChange={(e) => setFormData({...formData, isUrgent: e.target.checked})} 
                      />
                      <label className="form-check-label fw-bold text-danger ms-2" htmlFor="urgentCheck">
                        Mark as Urgent Notice?
                      </label>
                    </div>
                    
                    <div className="d-grid">
                      <button type="submit" className="btn btn-primary fw-bold py-2">
                          {isEditing ? "Update Notice" : "Publish Notice"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

    </>
  );
};

export default Notices;