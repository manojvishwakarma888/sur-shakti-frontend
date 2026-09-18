import React, { useState, useEffect } from 'react'; // 1. Added Hooks here
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// Import Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Notices from './pages/Notices';
import Complaints from './pages/Complaints';
import MyBills from './pages/MyBills';
import Directory from './pages/Directory';
import Expenses from './pages/Expenses';
import Profile from './pages/Profile';

import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ChangePassword from './pages/ChangePassword';

// Components
import PrivateRoute from './components/PrivateRoute';
import ScrollToTop from './components/ScrollToTop';
import Layout from './components/Layout'; 

function App() {
  // 2. State to track internet connection
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // 3. Effect to listen for network changes
  useEffect(() => {
      const handleStatusChange = () => setIsOnline(navigator.onLine);
      window.addEventListener('online', handleStatusChange);
      window.addEventListener('offline', handleStatusChange);
      return () => {
          window.removeEventListener('online', handleStatusChange);
          window.removeEventListener('offline', handleStatusChange);
      };
  }, []);

  return (
    <ThemeProvider>
        <AuthProvider>
          <Router>
            <ScrollToTop />
            <ToastContainer position="top-right" autoClose={3000} />
            
            {/* 4. THE OFFLINE BANNER */}
            { !isOnline && (
                <div className="bg-danger text-white text-center p-2 fixed-bottom fw-bold shadow-lg" style={{zIndex: 9999}}>
                    ⚠️ No Internet Connection. Retrying...
                </div>
            )}
            
            <Routes>
              {/* --- PUBLIC ROUTES --- */}
              <Route path="/" element={<Navigate to="/login" />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* --- FORGOT/RESET PASSWORD ROUTES --- */}
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/change-password" element={<PrivateRoute><ChangePassword /></PrivateRoute>} />
      
              {/* --- PRIVATE ROUTES WRAPPED IN LAYOUT --- */}
              <Route element={<Layout />}> 
                  <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                  <Route path="/notices" element={<PrivateRoute><Notices /></PrivateRoute>} />
                  <Route path="/complaints" element={<PrivateRoute><Complaints /></PrivateRoute>} />
                  <Route path="/my-bills" element={<PrivateRoute><MyBills /></PrivateRoute>} />
                  <Route path="/directory" element={<PrivateRoute><Directory /></PrivateRoute>} />
                  <Route path="/expenses" element={<PrivateRoute><Expenses /></PrivateRoute>} />
                  <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
              </Route>

            </Routes>
          </Router>
        </AuthProvider>
    </ThemeProvider>
  );
}

export default App;