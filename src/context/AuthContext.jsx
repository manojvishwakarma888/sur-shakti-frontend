import React, { createContext, useState, useEffect } from 'react';
import { jwtDecode } from "jwt-decode"; 
import Cookies from 'js-cookie'; 
import api from '../services/api';
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. Check for logged-in user on app start (Read from Cookies)
  useEffect(() => {    
    const token = Cookies.get('token'); 
    
    if (token) {
      decodeAndSetUser(token);
    }
    setLoading(false);
  }, []);

const decodeAndSetUser = (token) => {
    try {
      const decoded = jwtDecode(token);
      
      // 🟢 DEBUG: This will show you the EXACT keys in your token
      console.log("RAW DECODED JWT:", decoded);

      const userData = {
        // 1. Map the ID (The most important part for Mitesh)
        // We check 'nameid', 'sub', and the long .NET URI string
        id: decoded.nameid || 
            decoded.sub || 
            decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] || 
            decoded.UserId,

        email: decoded.email || 
               decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"] || 
               decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"],

        role: decoded.role || 
              decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"],

        fullName: decoded.FullName || decoded.fullName || "Resident",
        flatNo: decoded.FlatNo || decoded.flatNo || "N/A"
      };

      console.log("FINAL MAPPED USER:", userData);
      setUser(userData);
    } catch (error) {
      console.error("Invalid Token", error);
      logout();
    }
};

  const login = async (email, password) => {
    try {     
      const response = await api.post('/Auth/login', { email, password });
      const data = response.data;
      if (data?.token) {
        // ✅ 2. Set Cookie (Expires in 7 days)
        Cookies.set('token', data.token, { expires: 7 });

        // 🧹 CLEANUP: Remove from localStorage to avoid conflicts
        localStorage.removeItem('token'); 
        
        decodeAndSetUser(data.token);
        return data;
      }
      return null;
    } catch (error) {
      console.error("Login Error", error);
      return null;
    }
  };

  const logout = () => {
    // ✅ 3. Remove Cookie
    Cookies.remove('token');
    
    // 🧹 CLEANUP: Remove from localStorage just in case
    localStorage.removeItem('token');
    
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
