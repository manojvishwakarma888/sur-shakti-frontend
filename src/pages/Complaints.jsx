import React, { useEffect, useState, useContext } from 'react';
import api from '../services/api';
import Sidebar from '../components/Sidebar';
import { AuthContext } from '../context/AuthContext';
import { FaPlus, FaCheckCircle, FaExclamationCircle, FaClock, FaUser } from 'react-icons/fa';
import { toast } from 'react-toastify';

const Complaints = () => {
  const { user } = useContext(AuthContext); 
  const [complaints, setComplaints] = useState([]);
  const [showModal, setShowModal] = useState(false);
  
  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Maintenance"); // Matches your DTO

  // 1. Fetch Complaints
  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    try {
      const res = await api.get('/Complaint');
      // Debug: Check console to confirm 'TicketId' is present
      console.log("Complaints Data:", res.data); 
      setComplaints(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load complaints");
    }
  };

  // 2. Handle Create (Matches CreateComplaintDto)
  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/Complaint', {
        title: title,
        description: description,
        category: category // Sending 'Category' as required by your Controller
      });
      
      toast.success("Ticket Raised Successfully!");
      setShowModal(false); 
      fetchComplaints(); 
      setTitle(""); setDescription(""); setCategory("Maintenance");
    } catch (err) {
      console.error(err);
      toast.error("Failed to raise ticket.");
    }
  };

  // 3. Handle Status Update (Matches UpdateComplaintStatusDto)
  const handleStatusUpdate = async (id, newStatus) => {
    const remark = window.prompt("Enter Resolution Remark (Optional):", "Issue Resolved");
    if (remark === null) return; // User cancelled

    try {
      // FIX: URL matches [HttpPatch("{id}/status")]
      await api.patch(`/Complaint/${id}/status`, {
        status: newStatus,
        resolutionRemark: remark
      });
      
      toast.success(`Ticket marked as ${newStatus}`);
      fetchComplaints();
    } catch (err) {
      console.error(err);
      toast.error("Could not update status.");
    }
  };

  // Helper for Status Badge
  const getStatusBadge = (status) => {
    if(status === 'Resolved' || status === 'Closed') return <span className="badge bg-success">Resolved</span>;
    return <span className="badge bg-warning text-dark">Pending</span>;
  };

  return (
    <>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2><FaExclamationCircle className="me-2 text-danger" /> Helpdesk Tickets</h2>
          
          {/* Only show 'Raise Ticket' if NOT admin (usually), or both can raise */}
          <button className="btn btn-danger" onClick={() => setShowModal(true)}>
            <FaPlus className="me-2" /> Raise Ticket
          </button>
        </div>

        <div className="row g-4">
          {complaints.map((item) => (
            // FIX 1: Use 'TicketId' as the key
            <div key={item.ticketId || item.TicketId} className="col-md-12">
              <div className={`card shadow-sm border-0 ${item.status === 'Resolved' ? 'opacity-75' : ''}`}>
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start">
                    
                    {/* Left Side: Ticket Details */}
                    <div>
                      <h5 className="fw-bold mb-1">
                        {item.title || item.Title}
                        <span className="badge bg-secondary ms-2" style={{fontSize: '0.7rem'}}>
                           {item.category || item.Category}
                        </span>
                      </h5>
                      <p className="text-muted mb-2">{item.description || item.Description}</p>
                      
                      {/* Meta Info */}
                      <div className="d-flex gap-3 small text-muted">
                        <span><FaClock className="me-1"/> {new Date(item.createdAt || item.CreatedAt).toLocaleDateString()}</span>
                        
                        {/* Admin View: Show who raised it */}
                        {(item.raisedBy || item.RaisedBy) && (
                          <span className="text-primary fw-bold">
                            <FaUser className="me-1"/> {item.raisedBy} (Flat {item.flatNo})
                          </span>
                        )}
                      </div>

                      {/* Stepper Timeline */}
                      <div className="d-flex align-items-center mt-3 pt-1 mb-3" style={{ maxWidth: '400px' }}>
                         <div className="d-flex align-items-center w-100 position-relative">
                            
                            {/* Step 1: Raised */}
                            <div className="d-flex flex-column align-items-center position-relative" style={{ zIndex: 2 }}>
                               <div className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center fw-bold shadow-sm" style={{ width: '22px', height: '22px', fontSize: '0.7rem' }}>✓</div>
                               <small className="fw-bold mt-1 text-dark" style={{ fontSize: '0.65rem' }}>Raised</small>
                            </div>
                            
                            {/* Line 1 */}
                            <div className="flex-grow-1" style={{ height: '2px', backgroundColor: '#198754', transform: 'translateY(-8px)', margin: '0 -5px' }}></div>
                            
                            {/* Step 2: In Review */}
                            <div className="d-flex flex-column align-items-center position-relative" style={{ zIndex: 2 }}>
                               <div className={`rounded-circle d-flex align-items-center justify-content-center fw-bold shadow-sm ${item.status === 'Resolved' || item.status === 'Closed' ? 'bg-success text-white' : 'bg-warning text-dark animate-pulse-warning'}`} style={{ width: '22px', height: '22px', fontSize: '0.7rem' }}>
                                  {item.status === 'Resolved' || item.status === 'Closed' ? '✓' : '2'}
                               </div>
                               <small className="fw-bold mt-1 text-dark" style={{ fontSize: '0.65rem' }}>In Review</small>
                            </div>
                            
                            {/* Line 2 */}
                            <div className="flex-grow-1" style={{ height: '2px', backgroundColor: item.status === 'Resolved' || item.status === 'Closed' ? '#198754' : '#e2e8f0', transform: 'translateY(-8px)', margin: '0 -5px' }}></div>
                            
                            {/* Step 3: Resolved */}
                            <div className="d-flex flex-column align-items-center position-relative" style={{ zIndex: 2 }}>
                               <div className={`rounded-circle d-flex align-items-center justify-content-center fw-bold shadow-sm ${item.status === 'Resolved' || item.status === 'Closed' ? 'bg-success text-white' : 'bg-light text-muted border'}`} style={{ width: '22px', height: '22px', fontSize: '0.7rem' }}>
                                  {item.status === 'Resolved' || item.status === 'Closed' ? '✓' : '3'}
                               </div>
                               <small className="fw-bold mt-1 text-dark" style={{ fontSize: '0.65rem' }}>Resolved</small>
                            </div>
                            
                         </div>
                      </div>

                      {/* Show Resolution Remark if resolved */}
                      {(item.resolutionRemark || item.ResolutionRemark) && (
                         <div className="alert alert-success py-1 px-2 mt-2 d-inline-block small mb-0">
                           <strong>Resolution:</strong> {item.resolutionRemark || item.ResolutionRemark}
                         </div>
                      )}
                    </div>

                    {/* Right Side: Actions */}
                    <div className="text-end">
                      <div className="mb-2">{getStatusBadge(item.status || item.Status)}</div>
                      
                      {/* Admin Actions */}
                      {user?.role === 'Admin' && (item.status !== 'Resolved') && (
                        <button 
                          className="btn btn-sm btn-outline-success"
                          // FIX 2: Pass 'TicketId' to function
                          onClick={() => handleStatusUpdate(item.ticketId || item.TicketId, "Resolved")}
                        >
                          <FaCheckCircle className="me-1"/> Mark Resolved
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {complaints.length === 0 && (
            <div className="text-center mt-5 text-muted">
              <p>No tickets found.</p>
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Raise New Ticket</h5>
                  <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                </div>
                <div className="modal-body">
                  <form onSubmit={handleCreate}>
                    <div className="mb-3">
                      <label className="form-label">Category</label>
                      <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
                        <option value="Maintenance">Maintenance</option>
                        <option value="Electrical">Electrical</option>
                        <option value="Plumbing">Plumbing</option>
                        <option value="Security">Security</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Title</label>
                      <input type="text" className="form-control" required 
                             value={title} onChange={e => setTitle(e.target.value)} />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Description</label>
                      <textarea className="form-control" rows="3" required 
                                value={description} onChange={e => setDescription(e.target.value)}></textarea>
                    </div>
                    <div className="d-grid">
                      <button type="submit" className="btn btn-danger">Submit Ticket</button>
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

export default Complaints;