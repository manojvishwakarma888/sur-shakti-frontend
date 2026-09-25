import BrandLogo from '../components/BrandLogo';
import React, { useState } from 'react';
import api from '../services/api';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaBuilding, FaUser, FaLock, FaPhone, FaKey, FaEnvelope } from 'react-icons/fa';

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    flatNo: '',
    phoneNumber: '', 
    societyCode: '' // Crucial for your new backend security check
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Matches your RegisterDto in C#
      await api.post('/auth/register', formData);
      
      toast.success("Registration Successful! Please Login.");
      navigate('/login'); 
    } catch (err) {
      console.error(err);
      // Show specific error from backend (e.g., "Invalid Society Code")
      toast.error(err.response?.data?.Message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 py-4 py-md-0" style={{ backgroundColor: 'var(--bg-secondary, #f0f2f5)' }}>
      <div className="card border-0 shadow-lg" style={{ maxWidth: '450px', width: '100%', borderRadius: '15px' }}>
        <div className="card-body p-5">
          
          <div className="text-center mb-4">
            <BrandLogo size={128} className="mb-3" />
            <h3 className="fw-bold text-dark">Join Sur Shakti</h3>
            <p className="text-muted small">Resident Self-Registration</p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Full Name */}
            <div className="mb-3 input-group">
              <span className="input-group-text bg-light border-0"><FaUser className="text-muted"/></span>
              <input type="text" name="fullName" className="form-control bg-light border-0" placeholder="Full Name" required onChange={handleChange} />
            </div>

            {/* Flat & Phone Row */}
            <div className="row g-2 mb-3">
              <div className="col-6 input-group">
                <span className="input-group-text bg-light border-0"><FaBuilding className="text-muted"/></span>
                <input type="text" name="flatNo" className="form-control bg-light border-0" placeholder="Row House No" required onChange={handleChange} />
              </div>
              <div className="col-6 input-group">
                <span className="input-group-text bg-light border-0"><FaPhone className="text-muted"/></span>
                <input type="tel" name="phoneNumber" className="form-control bg-light border-0" placeholder="Mobile" required onChange={handleChange} />
              </div>
            </div>

            {/* Email */}
            <div className="mb-3 input-group">
               <span className="input-group-text bg-light border-0"><FaEnvelope className="text-muted"/></span>
               <input type="email" name="email" className="form-control bg-light border-0" placeholder="Email Address" required onChange={handleChange} />
            </div>

            {/* Password */}
            <div className="mb-3 input-group">
              <span className="input-group-text bg-light border-0"><FaLock className="text-muted"/></span>
              <input type="password" name="password" className="form-control bg-light border-0" placeholder="Create Password" required onChange={handleChange} />
            </div>

            {/* Society Code (Security Field) */}
            <div className="mb-4">
              <div className="input-group">
                <span className="input-group-text bg-white border border-danger text-danger"><FaKey /></span>
                <input 
                  type="text" 
                  name="societyCode" 
                  className="form-control border-danger" 
                  placeholder="Society Code (Ask Secretary)" 
                  required 
                  onChange={handleChange} 
                />
              </div>
              <small className="text-danger" style={{fontSize: '0.7rem'}}>* Required for verification</small>
            </div>

            <button type="submit" className="btn btn-primary w-100 fw-bold py-2 shadow-sm" disabled={loading}>
              {loading ? 'Verifying...' : 'Create Account'}
            </button>
          </form>

          <div className="text-center mt-4 border-top pt-3">
            <small className="text-muted">Already have an account? <Link to="/login" className="text-primary fw-bold text-decoration-none">Sign In</Link></small>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Register;