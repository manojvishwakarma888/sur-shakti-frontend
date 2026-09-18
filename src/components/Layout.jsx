import React, { useState, useContext } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { FaBars, FaThLarge, FaFileInvoiceDollar, FaBullhorn, FaHeadset } from 'react-icons/fa'; 
import ThemeToggle from './ThemeToggle';
import { AuthContext } from '../context/AuthContext';

const Layout = () => {
  const { user } = useContext(AuthContext);
  // 1. State to manage Sidebar visibility on mobile
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  // 2. Function to toggle the state
  const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);

  return (
    <div className="d-flex position-relative app-shell">
      
      {/* 3. Mobile Overlay (Dark background when menu is open) */}
      {/* Clicking this dark area closes the sidebar */}
      <div 
        className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`} 
        onClick={() => setSidebarOpen(false)}
      ></div>

      {/* 4. The Sidebar (We pass isOpen and toggle so it can behave correctly) */}
      <Sidebar isOpen={isSidebarOpen} toggle={() => setSidebarOpen(false)} />
      
      {/* 5. Main Content Area */}
      <div className="flex-grow-1 bg-light main-content" style={{ minHeight: '100dvh' }}>
         
         {/* --- DESKTOP HEADER (Only visible on desktop 'd-none d-md-flex') --- */}
         <div className="d-none d-md-flex bg-white px-4 py-3 border-bottom align-items-center justify-content-between shadow-sm sticky-top">
            <span className="fw-bold text-primary fs-5" style={{letterSpacing: '-0.5px'}}>Sur Shakti Connect</span>
            <div className="d-flex align-items-center gap-3">
               <span className="text-muted small fw-bold">Welcome, {user?.fullName || "Resident"}</span>
               <ThemeToggle />
            </div>
         </div>

         {/* --- MOBILE HEADER (Only visible on mobile 'd-md-none') --- */}
         <div className="d-md-none bg-white p-3 border-bottom d-flex align-items-center justify-content-between shadow-sm sticky-top">
            {/* THE EXPAND BUTTON (Three Bars) */}
            <button className="btn btn-light border" aria-label="Open navigation" aria-expanded={isSidebarOpen} onClick={toggleSidebar}>
                <FaBars size={20} className="text-primary"/>
            </button>

            <span className="fw-bold text-primary">Sur Shakti Connect</span>
            
            <ThemeToggle />
         </div>

         {/* The Actual Page Content (Dashboard, Bills, etc.) */}
         <div className="p-3 p-md-4 app-page">
             <Outlet />
         </div>

      </div>
      <nav className="mobile-bottom-nav" aria-label="Main navigation">
        {[["/dashboard", FaThLarge, "Home"], ["/my-bills", FaFileInvoiceDollar, "Bills"], ["/notices", FaBullhorn, "Notices"], ["/complaints", FaHeadset, "Help"]].map(([to, Icon, label]) => (
          <NavLink key={to} to={to} onClick={() => setSidebarOpen(false)} className={({ isActive }) => isActive ? 'active' : ''}>
            <Icon aria-hidden="true" /><span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default Layout;