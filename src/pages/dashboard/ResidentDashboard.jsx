import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import Sidebar from '../../components/Sidebar';
import { 
  FaBullhorn, FaExclamationTriangle, FaRupeeSign, FaWrench, FaPhoneAlt, 
  FaSun, FaMoon, FaCloudSun, FaCheckCircle, FaTimes, FaCalendarAlt 
} from 'react-icons/fa';
import { Link } from 'react-router-dom';

const ResidentDashboard = () => {
  const { user } = useContext(AuthContext);
  const [residentStats, setResidentStats] = useState({ myDue: 0 });
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [timeData, setTimeData] = useState({
    greeting: 'Welcome',
    icon: <FaSun className="text-warning mb-3" size={40} />,
    statusMsg: 'Sur Shakti Gardens are open'
  });

  const TODAY_DATE = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  useEffect(() => {
    if (user) {
      fetchResidentData();
      calculateTimeOfDay();
    }

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, [user]);

  const calculateTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setTimeData({ 
        greeting: 'Good Morning', 
        icon: <FaCloudSun className="text-warning mb-3" size={40} />,
        statusMsg: 'Have a wonderful day ahead!'
      });
    } else if (hour < 18) {
      setTimeData({ 
        greeting: 'Good Afternoon', 
        icon: <FaSun className="text-warning mb-3" size={40} />,
        statusMsg: 'Offices are open until 6 PM.'
      });
    } else {
      setTimeData({ 
        greeting: 'Good Evening', 
        icon: <FaMoon className="text-secondary mb-3" size={40} />,
        statusMsg: 'Main Gates close at 11 PM.'
      });
    }
  };

  const fetchResidentData = async () => {
    try {
      setLoading(true);
      const [billsRes, noticesRes] = await Promise.all([
        api.get('/Bill'),
        api.get('/Notice')
      ]);

      let myDueAmount = 0;
      
      if (billsRes.data && Array.isArray(billsRes.data)) {
          const currentUserId = String(user?.id || user?.UserId || "").toLowerCase().trim();
          
          const myBills = billsRes.data.filter(bill => {
              const bUserId = String(bill.userId || bill.UserId || "").toLowerCase().trim();
              if (bUserId === currentUserId && currentUserId !== "") {
                const isPaid = bill.isPaid ?? bill.IsPaid;
                const unpaid = isPaid === false || isPaid === 0 || isPaid === "0" || !isPaid;                
                return unpaid;
              }
              return false;
          });

          myBills.forEach(bill => {
              myDueAmount += (bill.amount || bill.Amount || 0);
          });
      }

      setResidentStats({ myDue: myDueAmount });
      
      const sortedNotices = (noticesRes.data || [])
        .sort((a, b) => new Date(b.postedDate || b.createdAt) - new Date(a.postedDate || a.createdAt))
        .slice(0, 3);

      setNotices(sortedNotices);
      setLoading(false);
    } catch (err) { 
        console.error("Dashboard Load Error:", err); 
        setLoading(false); 
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Date N/A";
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? "Invalid Date" : date.toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', { 
    style: 'currency', 
    currency: 'INR' 
  }).format(amount);

  return (
    <div className="container-fluid bg-light min-vh-100 p-0" style={{ overflowX: 'hidden' }}>
      <div className="p-3 p-md-4">
        
        {/* Header Section */}
        <div className="row mx-0 mb-4 align-items-center">
          <div className="col-8 col-md-8 px-0">
            <h2 className="fw-bold text-dark mb-1 fs-3 fs-md-2">{timeData.greeting}, {user?.fullName || 'Resident'}!</h2>
            <p className="text-muted mb-0 small">House No: <span className="fw-bold text-primary">{user?.flatNo || 'N/A'}</span></p>
          </div>
          
          <div className="col-4 col-md-4 px-0 d-flex justify-content-end align-items-center gap-2">
             <div className="text-end d-none d-md-block">
                <h2 className="fw-bold text-dark mb-0" style={{fontFamily: 'monospace', letterSpacing: '-1px'}}>
                   {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </h2>
                <small className="text-muted fw-bold text-uppercase" style={{fontSize: '0.75rem', letterSpacing: '1px'}}>
                   {TODAY_DATE}
                </small>
             </div>
          </div>
        </div>

        {/* 3-Card Layout: Maintenance, Quick Actions, Status */}
        <div className="row g-3 g-md-4 mb-4 mx-0">
          
          {/* Maintenance Due Card */}
          <div className="col-12 col-md-4 px-1">
            <div className="card border-0 shadow-sm rounded-4 h-100 p-3">
              <div className="card-body d-flex flex-column justify-content-between p-0">
                <div>
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <small className="text-muted fw-bold" style={{fontSize: '0.75rem'}}>MAINTENANCE DUE</small>
                    <FaRupeeSign className="text-muted opacity-25" size={24}/>
                  </div>
                  
                  {loading ? (
                    <h2 className="text-muted">Loading...</h2>
                  ) : residentStats.myDue > 0 ? (
                    <h2 className="fw-bold text-danger display-6 mb-4">
                      {formatCurrency(residentStats.myDue)}
                    </h2>
                  ) : (
                    <div className="mb-4">
                        <h2 className="fw-bold text-success display-6 mb-1">All Clear</h2>
                        <small className="text-muted">No pending dues.</small>
                    </div>
                  )}
                </div>
                
                {residentStats.myDue > 0 ? (
                    <Link to="/my-bills" className="btn btn-primary w-100 fw-bold py-2 rounded-3 shadow-sm text-decoration-none">
                        Pay Now
                    </Link>
                ) : (
                    <button className="btn btn-success w-100 fw-bold py-2 rounded-3 disabled" style={{opacity: 0.8}}>
                        <FaCheckCircle className="me-2"/> Paid
                    </button>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="col-12 col-md-4 px-1">
            <div className="card border-0 shadow-sm rounded-4 h-100 p-3 text-white" 
                 style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}>
              <div className="card-body p-0">
                <h5 className="fw-bold mb-1">Quick Actions</h5>
                <p className="small opacity-75 mb-4">House No: {user?.flatNo}</p>
                <div className="row g-2 mx-0">
                  <div className="col-6 px-1">
                    <Link to="/complaints" className="btn w-100 h-100 py-3 rounded-3 border-0 text-white d-flex flex-column align-items-center justify-content-center" style={{backgroundColor: 'rgba(255,255,255,0.2)', textDecoration: 'none'}}>
                        <FaWrench size={20} className="mb-2"/>
                        <span className="small fw-bold">Report</span>
                    </Link>
                  </div>
                  <div className="col-6 px-1">
                      <Link to="/directory" className="btn w-100 h-100 py-3 rounded-3 border-0 text-white d-flex flex-column align-items-center justify-content-center" style={{backgroundColor: 'rgba(255,255,255,0.2)', textDecoration: 'none'}}>
                        <FaPhoneAlt size={20} className="mb-2"/>
                        <span className="small fw-bold">Contacts</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Status Greeting Card */}
          <div className="col-12 col-md-4 px-1">
             <div className="card border-0 shadow-sm rounded-4 h-100 overflow-hidden text-center position-relative">
                <div style={{
                  position: 'absolute', top:0, left:0, right:0, bottom:0, 
                  backgroundImage: 'url("https://images.unsplash.com/photo-1596205252654-2c55673400a4?auto=format&fit=crop&w=600&q=80")', 
                  backgroundSize: 'cover', opacity: 0.8
                }}></div>
                <div className="card-body position-relative d-flex flex-column align-items-center justify-content-center bg-white m-3 rounded-4 shadow-sm" style={{opacity: 0.95}}>
                    {timeData.icon}
                    <h5 className="fw-bold mb-1">{timeData.greeting}</h5>
                    <small className="text-muted">{timeData.statusMsg}</small>
                </div>
             </div>
          </div>
        </div>

        {/* Latest Updates Header */}
        <div className="row mx-0 mb-3 align-items-center">
            <div className="col-6 px-0"><h5 className="fw-bold text-dark m-0">Latest Updates</h5></div>
            <div className="col-6 px-0 text-end"><Link to="/notices" className="text-primary fw-bold text-decoration-none small">View All</Link></div>
        </div>

        {/* Updates List */}
        <div className="row g-3 g-md-4 mb-4 mx-0">
           {loading ? (
             <div className="col-12 text-center py-5">Loading updates...</div>
           ) : notices.length > 0 ? (
             notices.map(notice => (
                 <div key={notice.noticeId || notice.id} className="col-12 col-lg-6 px-1">
                    <div className="card border-0 shadow-sm rounded-4 h-100">
                      <div className="card-body p-3 d-flex align-items-start">
                          <div className="rounded-3 me-3 d-flex align-items-center justify-content-center flex-shrink-0" 
                               style={{width: '60px', height: '60px', backgroundColor: notice.isUrgent ? 'var(--urgent-badge-bg, #FFE5E5)' : 'var(--info-badge-bg, #E3F2FD)'}}>
                             {notice.isUrgent ? <FaExclamationTriangle className="text-danger" size={24}/> : <FaBullhorn className="text-primary" size={24}/>}
                         </div>
                         <div className="flex-grow-1 overflow-hidden">
                            <div className="mb-1 d-flex justify-content-between">
                              <div>
                                {notice.isUrgent && <span className="badge bg-danger bg-opacity-10 text-danger me-2" style={{fontSize: '0.65rem'}}>URGENT</span>}
                                <span className="badge bg-primary bg-opacity-10 text-primary" style={{fontSize: '0.65rem'}}>{notice.category || 'NOTICE'}</span>
                              </div>
                              <small className="text-muted" style={{fontSize: '0.7rem'}}>{formatDate(notice.postedDate || notice.createdAt)}</small>
                            </div>
                            <h6 className="fw-bold mb-1 text-truncate">{notice.title}</h6>
                            <p className="text-muted small mb-2 text-truncate">{notice.content}</p>
                            <button className="btn btn-link p-0 text-decoration-none fw-bold" style={{fontSize: '0.8rem'}} onClick={() => setSelectedNotice(notice)}>
                                Read More
                            </button>
                         </div>
                      </div>
                    </div>
                 </div>
             ))
           ) : (
             <div className="col-12 text-center p-5 text-muted border rounded-4 bg-white">
                <FaBullhorn className="mb-3 opacity-25" size={30}/>
                <p className="mb-0">No new updates right now.</p>
             </div>
           )}
        </div>

        {/* Notice Modal */}
        {selectedNotice && (
            <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center p-3" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000 }}>
                <div className="bg-white rounded-4 shadow-lg p-0 overflow-hidden w-100" style={{ maxWidth: '500px' }}>
                    <div className="bg-primary p-4 text-white position-relative">
                        <button onClick={() => setSelectedNotice(null)} className="btn btn-sm btn-white bg-white bg-opacity-25 text-white position-absolute top-0 end-0 m-3 rounded-circle">
                            <FaTimes />
                        </button>
                        <h4 className="fw-bold mb-0">{selectedNotice.title}</h4>
                        <small className="opacity-75">Posted on {formatDate(selectedNotice.postedDate || selectedNotice.createdAt)}</small>
                    </div>
                    <div className="p-4">
                        <p className="text-secondary" style={{whiteSpace: 'pre-line', lineHeight: '1.6'}}>{selectedNotice.content}</p>
                        <div className="text-end mt-3 border-top pt-3">
                            <button className="btn btn-secondary px-4 rounded-pill w-100 w-md-auto" onClick={() => setSelectedNotice(null)}>Close</button>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default ResidentDashboard;