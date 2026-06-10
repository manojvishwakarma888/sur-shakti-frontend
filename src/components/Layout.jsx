import React, { useState, useContext } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { FaBars } from 'react-icons/fa'; 
import ThemeToggle from './ThemeToggle';
import { AuthContext } from '../context/AuthContext';

const Layout = () => {
  const { user } = useContext(AuthContext);
  // 1. State to manage Sidebar visibility on mobile
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  // 2. Function to toggle the state
  const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);

  return (
    <div className="d-flex position-relative">
      
      {/* 3. Mobile Overlay (Dark background when menu is open) */}
      {/* Clicking this dark area closes the sidebar */}
      <div 
        className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`} 
        onClick={() => setSidebarOpen(false)}
      ></div>

      {/* 4. The Sidebar (We pass isOpen and toggle so it can behave correctly) */}
      <Sidebar isOpen={isSidebarOpen} toggle={() => setSidebarOpen(false)} />
      
      {/* 5. Main Content Area */}
      <div className="flex-grow-1 bg-light main-content" style={{ minHeight: '100vh', width: '81%' }}>
         
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
            <button className="btn btn-light border" onClick={toggleSidebar}>
                <FaBars size={20} className="text-primary"/>
            </button>

            <span className="fw-bold text-primary">Sur Shakti Connect</span>
            
            <ThemeToggle />
         </div>

         {/* The Actual Page Content (Dashboard, Bills, etc.) */}
         <div className="p-3 p-md-4">
             <Outlet />
         </div>

      </div>
    </div>
  );
};

export default Layout;