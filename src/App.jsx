

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
import EventBookingWizard from './pages/EventBookingWizard';
import EventBookingHistory from './pages/EventBookingHistory';

import ResetPassword from './pages/ResetPassword';
import ChangePassword from './pages/ChangePassword';

// Components
import PrivateRoute from './components/PrivateRoute';
import ScrollToTop from './components/ScrollToTop';
import Layout from './components/Layout'; 

import PaymentHistory from './pages/PaymentHistory';
import PaymentReview from './pages/PaymentReview';
const Maintenance = React.lazy(() => import('./pages/Maintenance'));
const Notifications = React.lazy(() => import('./pages/Notifications'));
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
                <div className="offline-banner" role="status">
                    You’re offline. Reconnect to load updates or submit changes.
                </div>
            )}
            
            <Routes>
              {/* --- PUBLIC ROUTES --- */}
              <Route path="/" element={<Navigate to="/login" />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* --- FORGOT/RESET PASSWORD ROUTES --- */}
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/change-password" element={<PrivateRoute><ChangePassword /></PrivateRoute>} />
      
              {/* --- PRIVATE ROUTES WRAPPED IN LAYOUT --- */}
              <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
                  <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                  <Route path="/notices" element={<PrivateRoute><Notices /></PrivateRoute>} />
                  <Route path="/complaints" element={<PrivateRoute><Complaints /></PrivateRoute>} />
                  <Route path="/my-bills" element={<PrivateRoute><MyBills /></PrivateRoute>} />
                  <Route path="/payment-history" element={<React.Suspense fallback={<p role="status">Loading payment history…</p>}><PaymentHistory /></React.Suspense>} />
                  <Route path="/payment-review" element={<React.Suspense fallback={<p role="status">Loading payment review…</p>}><PaymentReview /></React.Suspense>} />
                  <Route path="/directory" element={<PrivateRoute><Directory /></PrivateRoute>} />
                  <Route path="/expenses" element={<PrivateRoute><Expenses /></PrivateRoute>} />
                  <Route path="/maintenance" element={<PrivateRoute><React.Suspense fallback={<p role="status">Loading accounts…</p>}><Maintenance /></React.Suspense></PrivateRoute>} />
                  <Route path="/notifications" element={<PrivateRoute><React.Suspense fallback={<p role="status">Loading inbox…</p>}><Notifications /></React.Suspense></PrivateRoute>} />
                  <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
                  <Route path="/event-management" element={<PrivateRoute><EventBookingWizard /></PrivateRoute>} />
                  <Route path="/event-management/history" element={<PrivateRoute><EventBookingHistory /></PrivateRoute>} />
              </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Router>
        </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
