import React, { useContext, useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
// 1. REMOVE 'axios' import
import api from '../services/api'; // 2. KEEP 'api' (it has the cookie interceptor)

import { 
  FaBuilding, 
  FaThLarge, 
  FaFileInvoiceDollar, 
  FaMoneyBillWave, 
  FaBullhorn, 
  FaHeadset, 
  FaPhoneAlt, 
  FaSignOutAlt, 
  FaUserCog,
  FaTimes 
} from 'react-icons/fa';

const Sidebar = ({ isOpen, toggle }) => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [avatarUrl, setAvatarUrl] = useState(null);

  // Define Backend URL for Images (Ideally put this in a config file)
  const BACKEND_URL = "http://localhost:5236";

  useEffect(() => {
    const fetchProfilePic = async () => {
        try {
            // 3. FIX: Use 'api.get' instead of 'axios.get'
            // No need to check localStorage or set headers manually. 
            // The 'api' instance handles Cookies automatically.
            const response = await api.get("/Auth/current-user");

            const dbValue = response.data.profilePicture; 

            if (dbValue) {                
                if (dbValue.startsWith("http")) {
                    setAvatarUrl(dbValue);
                } else {
                    // Use the constant variable for cleaner code
                    setAvatarUrl(`${BACKEND_URL}/Images/${dbValue}`);
                }
            }
        } catch (error) {
            // It's normal to fail if not logged in yet, so we just log it
            console.error("Error fetching profile pic:", error);
        }
    };

    fetchProfilePic();
  }, []);

  const isAdmin = user?.role === 'Admin' || user?.role === 'Secretary';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.split(' ');
    return parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0][0];
  };

  return (
    <div 
        className={`d-flex flex-column bg-white border-end vh-100 p-3 sidebar-container ${isOpen ? 'open' : ''}`} 
        style={{ width: '280px', minWidth: '280px' }}
    >
      
      {/* Brand & Close Button */}
      <div className="d-flex align-items-center justify-content-between mb-4 px-2 mt-2">
        <div className="d-flex align-items-center">
            <div className="bg-primary bg-opacity-10 text-primary p-2 rounded-3 me-3">
                <FaBuilding size={24} />
            </div>
            <div>
                <h5 className="fw-bold mb-0 text-dark" style={{letterSpacing: '-0.5px'}}>Sur Shakti</h5>
                <small className="text-muted" style={{fontSize: '0.75rem'}}>Connect</small>
            </div>
        </div>
        
        <button className="btn btn-sm text-secondary d-md-none" onClick={toggle}>
            <FaTimes size={20} />
        </button>
      </div>

      {/* User Card */}
      <div className="bg-light rounded-4 p-3 d-flex align-items-center mb-4 shadow-sm border-0">
        <div className="me-3" style={{ flexShrink: 0 }}>
            {avatarUrl ? (
                <img 
                    src={avatarUrl} 
                    alt="Profile" 
                    className="rounded-circle border border-2 border-white shadow-sm"
                    style={{width: '45px', height: '45px', objectFit: 'cover',imageRendering: '-webkit-optimize-contrast'}}
                    onError={(e) => {
                        e.target.style.display = 'none'; 
                        setAvatarUrl(null); 
                    }}
                />
            ) : (
                <div className="rounded-circle bg-white d-flex align-items-center justify-content-center text-primary fw-bold border" 
                     style={{ width: '45px', height: '45px' }}>
                     {getInitials(user?.fullName)}
                </div>
            )}
        </div>

        <div className="overflow-hidden">
          <h6 className="fw-bold mb-0 text-truncate text-dark">
            {user?.fullName || "Resident"}
          </h6>
          <small className="text-primary fw-bold" style={{fontSize: '0.75rem', letterSpacing: '0.5px'}}>
             {isAdmin ? "ADMINISTRATOR" : (user?.flatNo ? `House NO: ${user.flatNo}` : "RESIDENT")}
          </small>
        </div>
      </div>

      {/* Navigation Links */}
      <ul className="nav nav-pills flex-column flex-grow-1 gap-2">
        <NavItem to="/dashboard" icon={FaThLarge} label="Dashboard" onClick={toggle} />
        <NavItem to="/my-bills" icon={FaFileInvoiceDollar} label={isAdmin ? "Bills & Payments" : "My Bills"} onClick={toggle} />        
        <NavItem to="/expenses" icon={FaMoneyBillWave} label="Expenses" onClick={toggle} />
        <NavItem to="/notices" icon={FaBullhorn} label="Notices" onClick={toggle} />
        <NavItem to="/complaints" icon={FaHeadset} label="Helpdesk" onClick={toggle} />
        <NavItem to="/directory" icon={FaPhoneAlt} label="Directory" onClick={toggle} />
        <NavItem to="/profile" icon={FaUserCog} label="Settings" onClick={toggle} />
      </ul>

      {/* Logout */}
      <div className="mt-auto pt-3 border-top sign-out">
        <button 
            onClick={handleLogout} 
            className="nav-link w-100 text-start text-danger fw-bold d-flex align-items-center px-3 hover-danger"
            style={{gap: '12px'}}
        >
          <FaSignOutAlt /> Sign Out
        </button>
      </div>
    </div>
  );
};

const NavItem = ({ to, icon: Icon, label, onClick }) => (
  <li className="nav-item">
    <NavLink 
      to={to} 
      onClick={onClick} 
      className={({ isActive }) => 
        `nav-link d-flex align-items-center fw-medium px-3 py-2 ${isActive ? 'active shadow-sm fw-bold' : 'text-secondary'}`
      }
      style={({ isActive }) => ({
        gap: '12px',
        backgroundColor: isActive ? 'var(--sidebar-active-bg, #E3F2FD)' : 'transparent',
        color: isActive ? 'var(--sidebar-active-text, #0d6efd)' : 'var(--sidebar-text, #6c757d)',
        transition: 'all 0.2s ease'
      })}
    >
      <Icon size={18} /> {label}
    </NavLink>
  </li>
);

export default Sidebar;