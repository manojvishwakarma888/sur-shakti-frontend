import BrandLogo from '../components/BrandLogo';
import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FaLock } from 'react-icons/fa';
import { markPasswordUpdatedNow } from '../utils/passwordPolicy';

const ChangePassword = () => {
    const { user } = useContext(AuthContext);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            return toast.error("Confirm password does not match new password.");
        }
        if (newPassword.length < 6) {
            return toast.error("New password must be at least 6 characters long.");
        }

        setLoading(true);
        try {
            await api.post('Profile/change-password', {
                currentPassword,
                newPassword
            });
            markPasswordUpdatedNow(user?.email);
            toast.success("Password updated successfully!");
            navigate('/dashboard');
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data || "Failed to change password. Please verify current password.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="d-flex justify-content-center align-items-center min-vh-100 py-4 py-md-0" style={{ backgroundColor: 'var(--bg-primary, #f8fafc)' }}>
            <div className="card p-4 shadow-lg border-0 rounded-4" style={{ width: '400px', backgroundColor: 'var(--card-bg, #ffffff)' }}>
                
                <div className="text-center mb-4">
                    <BrandLogo size={128} className="mb-2" />
                    <h4 className="fw-bold text-dark mb-1">Update Password</h4>
                    <p className="text-muted small mb-0">Please refresh your password. This reminder appears every 30 days.</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label className="form-label fw-bold small text-muted">CURRENT PASSWORD</label>
                        <div className="input-group border rounded-3 px-3 py-2 bg-light bg-opacity-50">
                            <FaLock className="text-muted me-2 mt-1" />
                            <input 
                                type="password" 
                                className="form-control border-0 bg-transparent shadow-none" 
                                required
                                placeholder="Enter current password"
                                value={currentPassword} 
                                onChange={e => setCurrentPassword(e.target.value)} 
                            />
                        </div>
                    </div>

                    <div className="mb-3">
                        <label className="form-label fw-bold small text-muted">NEW PASSWORD</label>
                        <div className="input-group border rounded-3 px-3 py-2 bg-light bg-opacity-50">
                            <FaLock className="text-muted me-2 mt-1" />
                            <input 
                                type="password" 
                                className="form-control border-0 bg-transparent shadow-none" 
                                required
                                placeholder="Enter new password"
                                minLength={6}
                                value={newPassword} 
                                onChange={e => setNewPassword(e.target.value)} 
                            />
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="form-label fw-bold small text-muted">CONFIRM NEW PASSWORD</label>
                        <div className="input-group border rounded-3 px-3 py-2 bg-light bg-opacity-50">
                            <FaLock className="text-muted me-2 mt-1" />
                            <input 
                                type="password" 
                                className="form-control border-0 bg-transparent shadow-none" 
                                required
                                placeholder="Confirm new password"
                                value={confirmPassword} 
                                onChange={e => setConfirmPassword(e.target.value)} 
                            />
                        </div>
                    </div>

                    <button className="btn btn-primary w-100 fw-bold py-2.5 rounded-3 shadow-sm" disabled={loading}>
                        {loading ? 'Updating...' : 'Update & Continue'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChangePassword;
