import { t as uiText, useLanguage } from '../i18n/language.js';
import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const PrivateRoute = ({ children }) => {
  useLanguage();
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <div>{uiText("Loading...")}</div>;
  }

  // If user is NOT logged in, kick them back to Login page ("/")
  if (!user) {
    return <Navigate to="/" />;
  }

  // If user IS logged in, show the protected page (the "children")
  return children;
};

export default PrivateRoute;