import { t as uiText, useLanguage } from '../i18n/language.js';
import React, { useContext } from 'react';
// Import Context (Up 1 level)
import { AuthContext } from '../context/AuthContext';

// Import Child Components (Down 1 level into 'dashboard' folder)
import AdminDashboard from './dashboard/AdminDashboard';
import ResidentDashboard from './dashboard/ResidentDashboard';

const Dashboard = () => {
  useLanguage();
  const { user } = useContext(AuthContext);

  if (!user) {
    return <div className="d-flex justify-content-center align-items-center vh-100">{uiText("Loading...")}</div>;
  }

  // The Traffic Cop Logic
  if (user.role === 'Admin' || user.role === 'Secretary') {
    return <AdminDashboard />;
  } else {
    return <ResidentDashboard />;
  }
};

export default Dashboard;