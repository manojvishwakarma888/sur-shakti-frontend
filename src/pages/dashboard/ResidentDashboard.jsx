import { t as uiText, useLanguage, getLocale } from '../../i18n/language.js';
import { billPayableAmount } from '../../utils/billing';
import MobileShortcuts from '../../components/MobileShortcuts';
import CommunityPageHero from '../../components/CommunityPageHero';
import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import { 
  FaBullhorn, FaExclamationTriangle, FaRupeeSign, FaWrench, FaPhoneAlt, 
  FaSun, FaMoon, FaCloudSun, FaCheckCircle, FaTimes
} from 'react-icons/fa';
import { Link } from 'react-router-dom';

const ResidentDashboard = () => {
  useLanguage();
  const { user } = useContext(AuthContext);
  const [residentStats, setResidentStats] = useState({ myDue: 0 });
  const [notices, setNotices] = useState([]);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [tickets, setTickets] = useState(null);
  const [ticketError, setTicketError] = useState(false);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setTickets(null);
    setTicketError(false);
    api.get('/Complaint').then(({ data }) => {
      if (!Array.isArray(data)) throw new Error('Invalid tickets response');
      if (!cancelled) setTickets(data);
    }).catch(() => {
      if (!cancelled) setTicketError(true);
    });
    return () => { cancelled = true; };
  }, [user, refreshVersion]);

  const resolvedTickets = tickets?.filter(ticket =>
    ['resolved', 'closed'].includes(String(ticket.status ?? ticket.Status ?? '').toLowerCase())
  ).length ?? 0;

  const [loading, setLoading] = useState(true);
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [timeData, setTimeData] = useState({
    greeting: 'Welcome',
    icon: <FaSun className="text-warning mb-3" size={40} />,
    statusMsg: 'Sur Shakti Gardens are open'
  });

  const TODAY_DATE = new Date().toLocaleDateString(getLocale(), { weekday: 'long', day: 'numeric', month: 'long' });

  useEffect(() => {
    if (user) {
      fetchResidentData();
      calculateTimeOfDay();
    }

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, [user, refreshVersion]);

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
          // The server includes bills accessible through confirmed occupancy, even if billed to a previous resident.
          const myBills = billsRes.data.filter(bill => {
            const paid = bill.isPaid ?? bill.IsPaid;
            return paid !== true && paid !== 1 && paid !== '1';
          });
          myBills.forEach(bill => {
              myDueAmount += billPayableAmount(bill);
          });
      }

      setResidentStats({ myDue: myDueAmount });
      
      const sortedNotices = (noticesRes.data || [])
        .sort((a, b) => new Date(b.postedDate || b.createdAt) - new Date(a.postedDate || a.createdAt))
        .slice(0, 3);

      setNotices(sortedNotices);
      
      // Save offline cache
      localStorage.setItem('cached_due_amount_' + user.id, myDueAmount.toString());
      localStorage.setItem('cached_dashboard_notices', JSON.stringify(sortedNotices));
      
      setLoading(false);
    } catch (err) { 
        console.error("Dashboard Load Error, loading from offline cache:", err); 
        const cachedDue = localStorage.getItem('cached_due_amount_' + user.id);
        const cachedNotices = localStorage.getItem('cached_dashboard_notices');
        
        if (cachedDue !== null) {
            setResidentStats({ myDue: parseFloat(cachedDue) });
        }
        if (cachedNotices !== null) {
            setNotices(JSON.parse(cachedNotices));
        }
        setLoading(false); 
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Date N/A";
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? "Invalid Date" : date.toLocaleDateString(getLocale(), {
        day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', { 
    style: 'currency', 
    currency: 'INR' 
  }).format(amount);

  return (
    <div className="resident-dashboard">
      
      {/* Header Section */}
      <CommunityPageHero pathname="/dashboard" eyebrow={timeData.greeting}
        title={uiText("Welcome home, {{v0}}!", { v0: user?.fullName || 'Resident' })}
        description={<>{uiText("Row house No:") + ' '}<strong>{user?.flatNo || 'N/A'}</strong>{' ' + uiText("· Sur Shakti Residency")}</>}>
        <div className="resident-hero-clock d-none d-md-flex"><span>{TODAY_DATE}</span><time>{currentTime.toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</time></div>
      </CommunityPageHero>

      <section role="region" aria-label={uiText("Resident widgets")}
        className="row g-3 mb-3 resident-cards resident-widget-row resident-overview">        {/* Maintenance Due Card */}
        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 h-100 p-3 balance-card">
            <div className="card-body d-flex flex-column justify-content-between p-0">
              <div>
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <small className="text-muted fw-bold" style={{fontSize: '0.75rem'}}>{uiText("MAINTENANCE DUE")}</small>
                  <FaRupeeSign className="text-muted opacity-25" size={24}/>
                </div>
                
                {loading ? (
                   <div className="shimmer-placeholder shimmer-title w-75 mb-4" style={{ height: '2.5rem' }}></div>
                 ) : residentStats.myDue > 0 ? (
                  <h2 className="fw-bold text-danger display-6 mb-4">
                    {formatCurrency(residentStats.myDue)}
                  </h2>
                ) : (
                  <div className="mb-4">
                      <h2 className="fw-bold text-success display-6 mb-1">{uiText("All Clear")}</h2>
                      <small className="text-muted">{uiText("No pending dues.")}</small>
                  </div>
                )}
              </div>
              
              {loading ? (
                  <button className="btn btn-primary w-100 fw-bold py-2 rounded-3" disabled>{uiText("Loading balance…")}</button>
              ) : residentStats.myDue > 0 ? (
                  <Link to="/my-bills" className="btn btn-primary w-100 fw-bold py-2 rounded-3 shadow-sm text-decoration-none">{uiText("Pay Now")}</Link>
              ) : (
                  <button className="btn btn-success w-100 fw-bold py-2 rounded-3 disabled" style={{opacity: 0.8}}>
                      <FaCheckCircle className="me-2"/>{' ' + uiText("Paid")}</button>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 h-100 p-3 text-white quick-actions-card">
            <div className="card-body p-0">
              <h5 className="fw-bold mb-1">{uiText("Quick Actions")}</h5>
              <p className="small opacity-75 mb-4">{uiText("Row house No:") + ' '}{user?.flatNo}</p>
              <div className="row g-2">
                <div className="col-6">
                  <Link to="/complaints" className="btn w-100 h-100 py-3 rounded-3 border-0 text-white d-flex flex-column align-items-center justify-content-center" style={{backgroundColor: 'rgba(255,255,255,0.2)', textDecoration: 'none'}}>
                      <FaWrench size={20} className="mb-2"/>
                      <span className="small fw-bold">{uiText("Report")}</span>
                  </Link>
                </div>
                <div className="col-6">
                    <Link to="/directory" className="btn w-100 h-100 py-3 rounded-3 border-0 text-white d-flex flex-column align-items-center justify-content-center" style={{backgroundColor: 'rgba(255,255,255,0.2)', textDecoration: 'none'}}>
                      <FaPhoneAlt size={20} className="mb-2"/>
                      <span className="small fw-bold">{uiText("Contacts")}</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Helpdesk overview */}
        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 h-100 p-3 helpdesk-summary-card">
            <div className="card-body p-0 d-flex flex-column">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <h5 className="fw-bold mb-0">{uiText("Helpdesk Overview")}</h5>
                <FaWrench className="text-primary" aria-hidden="true" />
              </div>
              <p className="text-muted small mb-3">{uiText("Stay on top of your reported issues.")}</p>
              {ticketError ? (
                <p className="text-muted small my-auto" role="status">{uiText("Ticket summary is unavailable. Open helpdesk to try again.")}</p>
              ) : tickets === null ? (
                <p className="text-muted small my-auto" role="status">{uiText("Loading tickets...")}</p>
              ) : (
                <div className="helpdesk-summary-counts mb-3">
                  <div><strong className="text-warning">{tickets.length - resolvedTickets}</strong><span>{uiText("Pending")}</span></div>
                  <div><strong className="text-success">{resolvedTickets}</strong><span>{uiText("Resolved")}</span></div>
                </div>
              )}
              <Link to="/complaints" className="btn btn-outline-primary w-100 fw-bold rounded-3 mt-auto">
                {tickets?.length === 0 ? uiText("Raise a ticket") : uiText("View tickets")}
              </Link>
            </div>
          </div>
        </div>
      </section>
      <MobileShortcuts onRefresh={() => setRefreshVersion(value => value + 1)} refreshing={loading || (tickets === null && !ticketError)} />
      {/* Latest Updates Header */}
      <div className="row mb-3 align-items-center">
          <div className="col-6"><h5 className="fw-bold text-dark m-0"><FaBullhorn className="me-2 mobile-section-icon" aria-hidden="true" />{uiText("Latest Updates")}</h5></div>
          <div className="col-6 text-end"><Link to="/notices" className="text-primary fw-bold text-decoration-none small">{uiText("View All")}</Link></div>
      </div>

      {/* Updates List */}
      <div className="row g-3 mb-3 resident-cards">
          {loading ? (
            Array.from({ length: 2 }).map((_, idx) => (
              <div key={idx} className="col-12 col-xl-4">
                <div className="card border-0 shadow-sm rounded-4 h-100">
                  <div className="card-body p-3 d-flex align-items-start">
                    <div className="shimmer-placeholder me-3" style={{ width: '60px', height: '60px', borderRadius: '12px' }}></div>
                    <div className="flex-grow-1 overflow-hidden">
                      <div className="d-flex justify-content-between mb-2">
                        <div className="shimmer-placeholder shimmer-badge"></div>
                        <div className="shimmer-placeholder shimmer-text w-25"></div>
                      </div>
                      <div className="shimmer-placeholder shimmer-title w-75"></div>
                      <div className="shimmer-placeholder shimmer-text w-90"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : notices.length > 0 ? (
           notices.map(notice => (
               <div key={notice.noticeId || notice.id} className="col-12 col-xl-4">
                  <div className="card border-0 shadow-sm rounded-4 h-100">
                    <div className="card-body p-3 d-flex align-items-start">
                        <div className="rounded-3 me-3 d-flex align-items-center justify-content-center flex-shrink-0" 
                             style={{width: '60px', height: '60px', backgroundColor: notice.isUrgent ? 'var(--urgent-badge-bg, #FFE5E5)' : 'var(--info-badge-bg, #E3F2FD)'}}>
                           {notice.isUrgent ? <FaExclamationTriangle className="text-danger" size={24}/> : <FaBullhorn className="text-primary" size={24}/>}
                       </div>
                       <div className="flex-grow-1 overflow-hidden">
                          <div className="mb-1 d-flex flex-wrap gap-1 justify-content-between">
                            <div>
                              {notice.isUrgent && <span className="badge bg-danger bg-opacity-10 text-danger me-2" style={{fontSize: '0.65rem'}}>{uiText("URGENT")}</span>}
                              <span className="badge bg-primary bg-opacity-10 text-primary" style={{fontSize: '0.65rem'}}>{uiText(notice.category || 'NOTICE')}</span>
                            </div>
                            <small className="text-muted" style={{fontSize: '0.7rem'}}>{formatDate(notice.postedDate || notice.createdAt)}</small>
                          </div>
                          <h6 className="fw-bold mb-1 text-truncate">{notice.title}</h6>
                          <p className="text-muted small mb-2 text-truncate">{notice.content}</p>
                          <button className="btn btn-link p-0 text-decoration-none fw-bold" style={{fontSize: '0.8rem'}} onClick={() => setSelectedNotice(notice)}>{uiText("Read More")}</button>
                       </div>
                    </div>
                  </div>
               </div>
           ))
         ) : (
           <div className="col-12 text-center p-5 text-muted border rounded-4 bg-white">
              <FaBullhorn className="mb-3 opacity-25" size={30}/>
              <p className="mb-0">{uiText("No new updates right now.")}</p>
           </div>
         )}
      </div>

      {/* Notice Modal */}
      {selectedNotice && (
          <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center p-3" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000 }}>
              <div className="bg-white rounded-4 shadow-lg p-0 w-100" style={{ maxWidth: '500px', maxHeight: 'calc(100dvh - 2rem)', overflowY: 'auto' }}>
                  <div className="bg-primary p-4 text-white position-relative">
                      <button onClick={() => setSelectedNotice(null)} className="btn btn-sm btn-white bg-white bg-opacity-25 text-white position-absolute top-0 end-0 m-3 rounded-circle">
                          <FaTimes />
                      </button>
                      <h4 className="fw-bold mb-0">{selectedNotice.title}</h4>
                      <small className="opacity-75">{uiText("Posted on") + ' '}{formatDate(selectedNotice.postedDate || selectedNotice.createdAt)}</small>
                  </div>
                  <div className="p-4">
                      <p className="text-secondary" style={{whiteSpace: 'pre-line', lineHeight: '1.6'}}>{selectedNotice.content}</p>
                      <div className="text-end mt-3 border-top pt-3">
                          <button className="btn btn-secondary px-4 rounded-pill w-100 w-md-auto" onClick={() => setSelectedNotice(null)}>{uiText("Close")}</button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default ResidentDashboard;
