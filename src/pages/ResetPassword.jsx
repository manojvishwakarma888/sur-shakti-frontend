import { t as uiText, useLanguage } from '../i18n/language.js';
import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api, { getApiErrorMessage } from '../services/api';
import { toast } from 'react-toastify';

const ResetPassword = () => {
  useLanguage();
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
        if (!email || !token) return toast.error(uiText("This password setup link is incomplete. Ask an administrator to resend it."));
        if (newPassword.length < 6) return toast.error(uiText("Password must contain at least 6 characters."));
        if(newPassword !== confirmPassword) return toast.error(uiText("Passwords do not match"));

        setLoading(true);
        try {
            await api.post('Auth/reset-password', {
                email: email,
                token: token, 
                newPassword: newPassword
            });
            toast.success(uiText("Password Reset Successful! Please Login."));
            navigate('/login');
        } catch (err) {
            console.error(err);
            toast.error(getApiErrorMessage(err, 'Failed to set password. The link may be expired or invalid.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="d-flex justify-content-center align-items-center min-vh-100 py-4 py-md-0 bg-light">
            <div className="card p-4 shadow-sm border-0 rounded-4" style={{width: '400px'}}>
                <h3 className="fw-bold mb-2">{uiText("Set your password")}</h3>
                <p className="text-muted small mb-3">{uiText("Create a password to activate your Sur Shakti account.")}</p>
                {(!email || !token) && <div className="alert alert-danger small">{uiText("This link is invalid or incomplete. Ask an administrator to resend your setup invitation.")}</div>}
                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label className="form-label fw-bold small text-muted">{uiText("NEW PASSWORD")}</label>
                        <input type="password" className="form-control" required minLength={6} autoComplete="new-password"
                            value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                    </div>
                    <div className="mb-4">
                        <label className="form-label fw-bold small text-muted">{uiText("CONFIRM PASSWORD")}</label>
                        <input type="password" className="form-control" required minLength={6} autoComplete="new-password"
                            value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                    </div>
                    <button className="btn btn-success w-100 fw-bold py-2" disabled={loading || !email || !token}>
                        {loading ? uiText("Resetting...") : uiText("Reset Password")}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ResetPassword;
