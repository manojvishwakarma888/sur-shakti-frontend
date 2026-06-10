import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { toast } from 'react-toastify';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    
    // Get data from URL (e.g., ?email=abc@test.com&token=xyz...)
    const email = searchParams.get('email');
    const token = searchParams.get('token'); 

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if(newPassword !== confirmPassword) return toast.error("Passwords do not match");

        setLoading(true);
        try {
            await api.post('Auth/reset-password', {
                email: email,
                token: token, 
                newPassword: newPassword
            });
            toast.success("Password Reset Successful! Please Login.");
            navigate('/login');
        } catch (err) {
            console.error(err);
            toast.error("Failed to reset password. The link may be expired or invalid.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
            <div className="card p-4 shadow-sm border-0 rounded-4" style={{width: '400px'}}>
                <h3 className="fw-bold mb-3">Set New Password</h3>
                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label className="form-label fw-bold small text-muted">NEW PASSWORD</label>
                        <input type="password" className="form-control" required
                            value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                    </div>
                    <div className="mb-4">
                        <label className="form-label fw-bold small text-muted">CONFIRM PASSWORD</label>
                        <input type="password" className="form-control" required
                            value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                    </div>
                    <button className="btn btn-success w-100 fw-bold py-2" disabled={loading}>
                        {loading ? 'Resetting...' : 'Reset Password'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ResetPassword;