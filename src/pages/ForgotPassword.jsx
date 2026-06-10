import React, { useState } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('Auth/forgot-password', { email });
            toast.success("Check your email for the reset link!");
        } catch (err) {
            toast.error("Error sending email. Please check if the email exists.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
            <div className="card p-4 shadow-sm border-0 rounded-4" style={{width: '400px'}}>
                <h3 className="fw-bold mb-2">Forgot Password?</h3>
                <p className="text-muted small mb-4">Enter your registered email address and we'll send you a link to reset your password.</p>
                
                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label className="form-label fw-bold small text-muted">EMAIL ADDRESS</label>
                        <input 
                            type="email" 
                            className="form-control py-2" 
                            placeholder="name@example.com" 
                            value={email} 
                            onChange={e => setEmail(e.target.value)} 
                            required 
                        />
                    </div>
                    <button className="btn btn-primary w-100 fw-bold py-2 mb-3" disabled={loading}>
                        {loading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                </form>
                
                <div className="text-center">
                    <Link to="/login" className="text-decoration-none small fw-bold text-secondary">
                        Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;