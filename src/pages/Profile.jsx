import React, { useEffect, useState, useContext } from 'react';
import api, { getApiErrorMessage, publicAssetUrl } from '../services/api';
import Sidebar from '../components/Sidebar';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FaUserCircle, FaLock, FaPhone, FaSave, FaCamera } from 'react-icons/fa';
import { markPasswordUpdatedNow } from '../utils/passwordPolicy';
import CommunityPageHero from '../components/CommunityPageHero';

const Profile = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  
  // Profile Data
  const [profile, setProfile] = useState({
    fullName: '',
    flatNo: '',
    email: '',
    role: '',
    phoneNumber: '',
    profilePictureUrl: '' // <--- Holds the image link
  });

  const [passData, setPassData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get('Profile');
      setProfile(res.data);
      setLoading(false);
    } catch (err) {
      toast.error("Failed to load profile.");
      setLoading(false);
    }
  };

  // --- HANDLE PHOTO UPLOAD ---
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      e.target.value = '';
      return toast.error('Choose a JPEG, PNG, or WebP image.');
    }
    if (file.size > 5 * 1024 * 1024) {
      e.target.value = '';
      return toast.error('Profile photo must be 5 MB or smaller.');
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Send file to backend
      const res = await api.post('Profile/upload-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      // Update UI immediately
      setProfile({ ...profile, profilePictureUrl: res.data.url });
      toast.success("Profile photo updated!");
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, 'Failed to upload photo.'));
    }
  };

  const handleUpdateContact = async (e) => {
    e.preventDefault();
    try {
      await api.put('Profile/update-contact', { phoneNumber: profile.phoneNumber });
      toast.success("Phone number updated!");
    } catch (err) {
      toast.error("Failed to update contact.");
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passData.newPassword !== passData.confirmPassword) return toast.error("New passwords do not match!");

    try {
      await api.post('Profile/change-password', {
        currentPassword: passData.currentPassword,
        newPassword: passData.newPassword
      });
      markPasswordUpdatedNow(user?.email);
      toast.success("Password changed!");
      setPassData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data || "Incorrect current password.");
    }
  };

  if (loading) return <div className="d-flex justify-content-center mt-5">Loading...</div>;

  return (
    <div className="profile-screen">
        <CommunityPageHero pathname="/profile" title="Account Settings" />

        <div className="row g-4">
          {/* --- LEFT COLUMN: PROFILE --- */}
          <div className="col-md-6">
            <div className="card border-0 shadow-sm rounded-4 h-100">
              <div className="card-header bg-white border-0 pt-4 px-4 pb-0">
                <h5 className="fw-bold d-flex align-items-center">
                  <FaUserCircle className="me-2 text-primary" /> My Profile
                </h5>
              </div>
              <div className="card-body p-4">
                
                {/* --- PHOTO UPLOAD SECTION --- */}
                <div className="d-flex justify-content-center mb-4">
                  <div className="position-relative">
                    {/* Image or Placeholder */}
                    {profile.profilePictureUrl ? (
                        <img 
                          src={publicAssetUrl(profile.profilePictureUrl)}
                          alt="Profile" 
                          className="rounded-circle border border-3 border-light shadow-sm"
                          style={{ width: '120px', height: '120px', objectFit: 'cover' }} 
                        />
                    ) : (
                        <div className="rounded-circle bg-light d-flex align-items-center justify-content-center text-secondary border" 
                             style={{ width: '120px', height: '120px', fontSize: '3rem' }}>
                            {profile.fullName?.charAt(0) || "U"}
                        </div>
                    )}

                    {/* Camera Button */}
                    <label 
                        className="position-absolute bottom-0 end-0 bg-primary text-white rounded-circle p-2 shadow-sm"
                        style={{ cursor: 'pointer', transform: 'translate(10%, 10%)' }}
                    >
                      <FaCamera size={16} />
                      <input type="file" accept="image/jpeg,image/png,image/webp" className="d-none" onChange={handlePhotoUpload} />
                    </label>
                  </div>
                </div>

                <form onSubmit={handleUpdateContact}>
                  <div className="mb-3">
                    <label className="small text-muted fw-bold">FULL NAME</label>
                    <input type="text" className="form-control bg-light" value={profile.fullName} disabled />
                  </div>
                  <div className="mb-3">
                    <label className="small text-muted fw-bold">PHONE NUMBER</label>
                    <input type="text" className="form-control" value={profile.phoneNumber} onChange={(e) => setProfile({...profile, phoneNumber: e.target.value})} />
                  </div>
                  <button type="submit" className="btn btn-primary w-100 fw-bold"><FaSave className="me-2"/> Update Contact</button>
                </form>
              </div>
            </div>
          </div>

          {/* --- RIGHT COLUMN: PASSWORD --- */}
          <div className="col-md-6">
            <div className="card border-0 shadow-sm rounded-4 h-100">
              <div className="card-header bg-white border-0 pt-4 px-4 pb-0">
                <h5 className="fw-bold text-danger"><FaLock className="me-2" /> Security</h5>
              </div>
              <div className="card-body p-4">
                <form onSubmit={handleChangePassword}>
                  <div className="mb-3">
                    <label className="small text-muted fw-bold">CURRENT PASSWORD</label>
                    <input type="password" className="form-control" required value={passData.currentPassword} onChange={(e) => setPassData({...passData, currentPassword: e.target.value})} />
                  </div>
                  <div className="mb-3">
                    <label className="small text-muted fw-bold">NEW PASSWORD</label>
                    <input type="password" className="form-control" required minLength={6} value={passData.newPassword} onChange={(e) => setPassData({...passData, newPassword: e.target.value})} />
                  </div>
                  <div className="mb-3">
                    <label className="small text-muted fw-bold">CONFIRM PASSWORD</label>
                    <input type="password" className="form-control" required value={passData.confirmPassword} onChange={(e) => setPassData({...passData, confirmPassword: e.target.value})} />
                  </div>
                  <button type="submit" className="btn btn-outline-danger w-100 fw-bold">Change Password</button>
                </form>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
};

export default Profile;
