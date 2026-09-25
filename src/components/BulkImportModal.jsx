import { t as uiText, useLanguage } from '../i18n/language.js';
import React, { useState } from 'react';
import api, { getApiErrorMessage } from '../services/api';
import { FaFileExcel, FaUpload, FaTimes, FaInfoCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';

const BulkImportModal = ({ onClose, onRefresh }) => {
  useLanguage();
    const [file, setFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [result, setResult] = useState(null);
    const [inviteEmail, setInviteEmail] = useState('');
    const [isResending, setIsResending] = useState(false);

    const handleFileChange = (e) => {
        const selected = e.target.files[0];
        setResult(null);
        if (!selected) return setFile(null);
        if (!selected.name.toLowerCase().endsWith('.xlsx')) {
            e.target.value = '';
            setFile(null);
            return toast.error(uiText("Choose an .xlsx workbook. The older .xls format is not supported."));
        }
        if (selected.size > 5 * 1024 * 1024) {
            e.target.value = '';
            setFile(null);
            return toast.error(uiText("The workbook must be 5 MB or smaller."));
        }
        setFile(selected);
    };

    const handleUpload = async () => {
        if (!file) return toast.error(uiText("Please select an Excel file first."));

        const formData = new FormData();
        formData.append("file", file);

        setIsUploading(true);
        try {
            const res = await api.post('/Auth/import-residents', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            setResult(res.data);
            toast.success(res.data.message || uiText("Resident import completed."));
            onRefresh(); // Refresh the resident list on the dashboard
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Import failed. Please check the workbook.'));
        } finally {
            setIsUploading(false);
        }
    };

    const handleResendInvitation = async (e) => {
        e.preventDefault();
        setIsResending(true);
        try {
            const res = await api.post('/Auth/resend-invitation', { email: inviteEmail.trim() });
            toast.success(res.data?.message || uiText("Setup invitation sent."));
            setInviteEmail('');
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Unable to resend the invitation.'));
        } finally {
            setIsResending(false);
        }
    };

    return (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" 
             style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1060, backdropFilter: 'blur(3px)' }}>
            
            <div className="bg-white rounded-4 shadow-lg p-4 w-100" style={{ maxWidth: '500px' }}>
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="fw-bold mb-0 text-success"><FaFileExcel className="me-2"/>{' ' + uiText("Bulk Import Residents")}</h5>
                    <button className="btn-close" onClick={onClose}></button>
                </div>

                <div className="alert alert-info border-0 small d-flex align-items-start">
                    <FaInfoCircle className="me-2 mt-1" />
                    <div>
                        <strong>{uiText("Instructions:")}</strong>{' ' + uiText("Use columns:")}<code className="d-block mt-1">{uiText("Full Name | Email | Flat No | Phone")}</code>
                        <small>{uiText("Use the row house number in the spreadsheet’s Flat No column.")}</small>{uiText("Imported residents receive a personal password setup link by email.")}</div>
                </div>

                <div className="border-dashed rounded-3 p-5 text-center bg-light mb-4" 
                     style={{ border: '2px dashed #ccc' }}>
                    <input type="file" id="excelFile" hidden accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={handleFileChange} />
                    <label htmlFor="excelFile" style={{ cursor: 'pointer' }}>
                        <FaUpload size={40} className="text-muted mb-3" />
                        <p className="mb-0 fw-bold">{file ? file.name : uiText("Click to select Excel file")}</p>
                        <small className="text-muted">{uiText(".xlsx only, up to 5 MB")}</small>
                    </label>
                </div>

                {result && (
                    <div className="alert alert-success" role="status">
                        <div className="fw-bold mb-1">{uiText("Import complete")}</div>
                        <div className="small">{result.created || 0}{' ' + uiText("created ·") + ' '}{result.invitationsSent || 0}{' ' + uiText("invitations sent ·") + ' '}{result.skipped || 0}{' ' + uiText("skipped")}</div>
                        {result.failures?.length > 0 && (
                            <ul className="small mt-2 mb-0 ps-3">
                                {result.failures.map((failure, index) => <li key={`${failure.email}-${index}`}>{failure.email || uiText("Row")}: {failure.message}</li>)}
                            </ul>
                        )}
                    </div>
                )}

                <form onSubmit={handleResendInvitation} className="border-top pt-3 mt-3">
                    <label htmlFor="inviteEmail" className="form-label small fw-bold">{uiText("RESEND PASSWORD SETUP LINK")}</label>
                    <div className="input-group">
                        <input id="inviteEmail" type="email" className="form-control" placeholder="resident@example.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} required />
                        <button className="btn btn-outline-primary" disabled={isResending}>{isResending ? uiText("Sending…") : uiText("Resend")}</button>
                    </div>
                </form>

                <div className="d-flex gap-2">
                    <button className="btn btn-success w-100 fw-bold py-2" 
                            onClick={handleUpload} 
                            disabled={isUploading || !file}>
                        {isUploading ? uiText("Processing...") : uiText("Start Import")}
                    </button>
                    <button className="btn btn-light w-100 fw-bold" onClick={onClose}>{uiText("Cancel")}</button>
                </div>
            </div>
        </div>
    );
};

export default BulkImportModal;
