import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom'; 
import api, { BACKEND_URL } from '../services/api'; 
import { FaBuilding, FaEnvelope, FaLock } from 'react-icons/fa'; 
import { toast } from 'react-toastify';
import { isPasswordUpdateDue } from '../utils/passwordPolicy';
import './Login.css';

// 🟢 CONFIG: Ensure this matches your .NET Backend Port exactly
const IMAGE_BASE = `${BACKEND_URL}/`; 

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [topResidents, setTopResidents] = useState([]); 
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  // 🟢 Fetch residents and slice to exactly 3
  useEffect(() => {
    const fetchAvatars = async () => {
      try {
        const res = await api.get('/Auth/top-residents');
        // Limit to 3 immediately
        setTopResidents(res.data.slice(0, 3));
      } catch (err) {
        console.error("Failed to load resident avatars", err);
      }
    };
    fetchAvatars();
  }, []);

  // 🟢 Helper to fix the "Double URL" (ERR_CONNECTION_REFUSED)
  const getImageUrl = (res) => {
    if (!res.profilePictureUrl) {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(res.fullName)}&background=random&color=fff`;
    }
    // If the path already contains http (like from your error log), use it directly
    if (res.profilePictureUrl.startsWith('http')) {
      return res.profilePictureUrl;
    }
    // Otherwise, prepend the base path
    return `${IMAGE_BASE}${res.profilePictureUrl}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await login(email, password);
      setIsLoading(false);

      if (response) {
        const loginEmail = response.email || response.Email || email;
        const passwordDue = isPasswordUpdateDue(loginEmail);

        if (passwordDue) {
          toast.info("Password update reminder: please refresh your password (30-day policy).");
          navigate('/change-password'); 
        } else {
          navigate('/dashboard');
        }
      } else {
        toast.error("Invalid Login. Please check your email and password.");
      }
    } catch (err) {
      setIsLoading(false);
      toast.error("Login failed. Service may be unavailable.");
    }
  };

  return (
    <div className="container-fluid login-container p-0">
      <div className="row g-0 min-vh-100">
        
        {/* LEFT SIDE: BRANDING & AVATARS */}
        <div className="col-md-6 login-brand-section d-none d-md-flex flex-column justify-content-between p-5 text-white">
          <div>
            <div className="brand-header">
              <div className="brand-icon-box"><FaBuilding size={24} /></div>
              <span className="fw-bold ms-2 fs-4">Sur Shakti Connect</span>
            </div>
            
            <div className="hero-text mt-5">
              <h1 className="display-4 fw-bold">Your Community, <br />Digitalized.</h1>
              <p className="mt-3 fs-5 opacity-75">Seamless payments and secure management.</p>
            </div>
          </div>

          <div className="trusted-section mt-auto">
            <div className="d-flex align-items-center">
                <div className="avatars me-3 d-flex align-items-center">
                  {topResidents.length > 0 ? (
                    topResidents.map((res, index) => (
                      <img 
                        key={index}
                        src={getImageUrl(res)} 
                        className="avatar shadow-sm" 
                        style={{ 
                          marginLeft: index === 0 ? '0' : '8px', 
                          zIndex: 3 - index,
                          border: '2px solid rgba(255, 255, 255, 0.8)',
                          borderRadius: '50%',
                          width: '42px',
                          height: '42px',
                          objectFit: 'cover',
                          backgroundColor: '#f8f9fa',
                          transition: 'transform 0.2s'
                        }} 
                        alt={res.fullName}
                        title={res.fullName} 
                        // Optional: slight pop-up effect on hover
                        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.5)'}
                        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1.0)'}
                      />
                    ))
                  ) : (
                    <img src="https://i.pravatar.cc/150?img=1" className="avatar shadow-sm" alt="Default" style={{ width: '42px', borderRadius: '50%' }} />
                  )}
                </div>
                <span className="small fw-bold opacity-90">Trusted by 120+ Families</span>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE: LOGIN FORM */}
        <div className="col-12 col-md-6 login-form-section d-flex align-items-center justify-content-center bg-white p-4">
          <div className="form-wrapper w-100" style={{ maxWidth: '400px' }}> 
            <h2 className="form-title fw-bold text-dark">Welcome Back</h2>
            <p className="form-subtitle text-muted mb-4">Please enter your details to sign in.</p>

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label fw-bold small text-secondary">Email Address</label>
                <div className="input-group border rounded-3 px-3 py-2 bg-light">
                  <FaEnvelope className="text-muted me-2 mt-1" />
                  <input 
                    type="email" 
                    className="form-control border-0 bg-transparent shadow-none"
                    placeholder="name@surshakti.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label fw-bold small text-secondary">Password</label>
                <div className="input-group border rounded-3 px-3 py-2 bg-light">
                  <FaLock className="text-muted me-2 mt-1" />
                  <input 
                    type="password" 
                    className="form-control border-0 bg-transparent shadow-none"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary w-100 fw-bold py-3 rounded-3 shadow-sm mt-3" disabled={isLoading}>
                {isLoading ? "Signing In..." : "Sign In"}
              </button>
            </form>

            <div className="mt-4 text-center">
              <p className="text-muted small">
                Don't have an account? <Link to="/register" className="fw-bold text-decoration-none text-primary">Register Now</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;