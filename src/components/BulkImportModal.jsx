import React, { useState } from 'react';
import api from '../services/api';
import { FaFileExcel, FaUpload, FaTimes, FaInfoCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';

const BulkImportModal = ({ onClose, onRefresh }) => {
    const [file, setFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleUpload = async () => {
        if (!file) return toast.error("Please select an Excel file first.");

        const formData = new FormData();
        formData.append("file", file);

        setIsUploading(true);
        try {
            const res = await api.post('/Auth/import-residents', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            toast.success(res.data.message);
            onRefresh(); // Refresh the resident list on the dashboard
            onClose();
        } catch (err) {
            toast.error(err.response?.data || "Import failed. Please check file format.");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" 
             style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1060, backdropFilter: 'blur(3px)' }}>
            
            <div className="bg-white rounded-4 shadow-lg p-4 w-100" style={{ maxWidth: '500px' }}>
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="fw-bold mb-0 text-success"><FaFileExcel className="me-2"/> Bulk Import Residents</h5>
                    <button className="btn-close" onClick={onClose}></button>
                </div>

                <div className="alert alert-info border-0 small d-flex align-items-start">
                    <FaInfoCircle className="me-2 mt-1" />
                    <div>
                        <strong>Instructions:</strong> Use columns: 
                        <code className="d-block mt-1">Full Name | Email | Flat No | Phone</code>
                        Imported residents will receive a temporary password.
                    </div>
                </div>

                <div className="border-dashed rounded-3 p-5 text-center bg-light mb-4" 
                     style={{ border: '2px dashed #ccc' }}>
                    <input type="file" id="excelFile" hidden accept=".xlsx, .xls" onChange={handleFileChange} />
                    <label htmlFor="excelFile" style={{ cursor: 'pointer' }}>
                        <FaUpload size={40} className="text-muted mb-3" />
                        <p className="mb-0 fw-bold">{file ? file.name : "Click to select Excel file"}</p>
                        <small className="text-muted">Supports .xlsx and .xls only</small>
                    </label>
                </div>

                <div className="d-flex gap-2">
                    <button className="btn btn-success w-100 fw-bold py-2" 
                            onClick={handleUpload} 
                            disabled={isUploading || !file}>
                        {isUploading ? "Processing..." : "Start Import"}
                    </button>
                    <button className="btn btn-light w-100 fw-bold" onClick={onClose}>Cancel</button>
                </div>
            </div>
        </div>
    );
};

export default BulkImportModal;