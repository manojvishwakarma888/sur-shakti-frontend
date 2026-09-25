import BrandLogo from './BrandLogo';
import React, { useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { FaTimes, FaDownload, FaCheckCircle, FaSpinner } from 'react-icons/fa';

const ReceiptModal = ({ bill, receipt, user, onClose }) => {
  const receiptRef = useRef();
  const [downloading, setDownloading] = useState(false);

  // Determine Data

  const flatNo = bill.flatNo || bill.FlatNo || user?.flatNo || "N/A";
  const paymentDate = bill.paymentDate || bill.PaymentDate ? new Date(bill.paymentDate || bill.PaymentDate).toLocaleDateString() : 'Not available';

  const handleDownload = async () => {
    setDownloading(true);
    const element = receiptRef.current;

    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
      // 1. Capture the receipt element as a high-quality image
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');

      // 2. Initialize PDF (Portrait, A4)
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // 3. Keep the complete receipt inside A4 margins.
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfPageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const availableWidth = pdfWidth - (margin * 2);
      const availableHeight = pdfPageHeight - (margin * 2);
      const scale = Math.min(availableWidth / canvas.width, availableHeight / canvas.height);
      const imageWidth = canvas.width * scale;
      const imageHeight = canvas.height * scale;
      const imageX = (pdfWidth - imageWidth) / 2;

      // 4. Add image to PDF and Save
      pdf.addImage(imgData, 'PNG', imageX, margin, imageWidth, imageHeight);
      pdf.save(`Receipt_${bill.month}_${flatNo}.pdf`);
      
    } catch (err) {
      console.error("PDF generation failed", err);
      toast.error("Could not download the receipt. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="receipt-overlay position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
         style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}>
      
      <div className="receipt-preview bg-white rounded-4 shadow-lg" role="dialog" aria-modal="true" aria-labelledby="receipt-preview-title">
        
        {/* Header Actions */}
        <div className="receipt-preview-header d-flex justify-content-between align-items-center p-3 border-bottom bg-light">
           <h6 id="receipt-preview-title" className="fw-bold m-0 text-secondary">Receipt Preview</h6>
           <button aria-label="Close receipt" disabled={downloading} onClick={onClose} className="btn btn-sm btn-light border rounded-circle"><FaTimes/></button>
        </div>

        {/* --- RECEIPT CONTENT (Captured for PDF) --- */}
        <div className="receipt-preview-scroll">
        <div ref={receiptRef} className="receipt-print-area" style={{backgroundColor: '#fff', color: '#000'}}>
            
            {/* Society Header */}
            <div className="text-center mb-4 border-bottom pb-3">
                <BrandLogo size={104} className="mb-2" />
                <h4 className="fw-bold mb-0 text-uppercase" style={{letterSpacing: '1px'}}>Sur Shakti Society</h4>
                <small className="text-muted">Valsad, Gujarat, India</small>
            </div>

            {/* Receipt Badge */}
            <div className="text-center mb-4">
                <div className="badge bg-success bg-opacity-10 text-success border border-success px-4 py-2 rounded-pill">
                    <FaCheckCircle className="me-2"/> PAYMENT RECEIPT
                </div>
                <div className="mt-2 text-muted small">
                    Receipt: {receipt?.receiptNumber}
                </div>
            </div>

            {/* Details Table */}
            <div className="row g-3 mb-4 border p-3 rounded-3 bg-light bg-opacity-25">
                <div className="col-6">
                    <small className="text-muted fw-bold d-block text-uppercase" style={{fontSize: '0.7rem'}}>Payment reference</small>
                    <span className="fw-bold">{receipt?.transactionReferenceId || receipt?.paymentMode}</span>
                </div>
                <div className="col-6 text-end">
                    <small className="text-muted fw-bold d-block text-uppercase" style={{fontSize: '0.7rem'}}>Row House No</small>
                    <span className="fw-bold">{flatNo}</span>
                </div>
                <div className="col-6">
                    <small className="text-muted fw-bold d-block text-uppercase" style={{fontSize: '0.7rem'}}>Paid Date</small>
                    <span>{paymentDate}</span>
                </div>
                <div className="col-6 text-end">
                    <small className="text-muted fw-bold d-block text-uppercase" style={{fontSize: '0.7rem'}}>Month</small>
                    <span>{bill.month}</span>
                </div>
            </div>

            {/* Amount Section */}
            <div className="d-flex justify-content-between align-items-center border-top border-bottom py-3 mb-4">
                <span className="fw-bold text-secondary">Total Amount Paid</span>
                <span className="fs-3 fw-bold text-dark">₹{receipt?.amountPaid}</span>
            </div>

            {/* Footer */}
            <div className="text-center mt-5 pt-3 text-muted" style={{borderTop: '1px dashed #ccc'}}>
                <small style={{fontSize: '0.75rem'}}>
                    This receipt is valid proof of payment for society maintenance.<br/>
                    Generated via Sur Shakti Connect.
                </small>
            </div>
        </div>
        </div>
        {/* --- END CAPTURE AREA --- */}

        {/* Footer Buttons */}
        <div className="receipt-preview-footer p-3 border-top bg-light d-flex gap-2">
            <button className="btn btn-secondary flex-grow-1" onClick={onClose} disabled={downloading}>
                Close
            </button>
            <button 
                className="btn btn-primary flex-grow-1 fw-bold" 
                onClick={handleDownload} 
                disabled={downloading}
            >
                {downloading ? (
                    <><FaSpinner className="fa-spin me-2"/> Generating PDF...</>
                ) : (
                    <><FaDownload className="me-2"/> Download PDF</>
                )}
            </button>
        </div>

      </div>
    </div>
  );
};

export default ReceiptModal;




