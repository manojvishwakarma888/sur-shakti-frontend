import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { FaTimes, FaDownload, FaCheckCircle, FaBuilding, FaSpinner } from 'react-icons/fa';

const ReceiptModal = ({ bill, user, onClose }) => {
  const receiptRef = useRef();
  const [downloading, setDownloading] = useState(false);

  // Determine Data
  const residentName = bill.residentName || bill.ResidentName || user?.fullName || "Resident";
  const flatNo = bill.flatNo || bill.FlatNo || user?.flatNo || "N/A";
  const paymentDate = bill.paymentDate || bill.PaymentDate ? new Date(bill.paymentDate || bill.PaymentDate).toLocaleDateString() : new Date().toLocaleDateString();

  const handleDownload = async () => {
    setDownloading(true);
    const element = receiptRef.current;

    try {
      // 1. Capture the receipt element as a high-quality image
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');

      // 2. Initialize PDF (Portrait, A4)
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // 3. Calculate dimensions to fit nicely
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      // 4. Add image to PDF and Save
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Receipt_${bill.month}_${flatNo}.pdf`);
      
    } catch (err) {
      console.error("PDF generation failed", err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" 
         style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}>
      
      <div className="bg-white rounded-4 shadow-lg overflow-hidden" style={{ width: '500px', maxWidth: '90%' }}>
        
        {/* Header Actions */}
        <div className="d-flex justify-content-between align-items-center p-3 border-bottom bg-light">
           <h6 className="fw-bold m-0 text-secondary">Receipt Preview</h6>
           <button onClick={onClose} className="btn btn-sm btn-light border rounded-circle"><FaTimes/></button>
        </div>

        {/* --- RECEIPT CONTENT (Captured for PDF) --- */}
        <div ref={receiptRef} className="p-5" style={{backgroundColor: '#fff', color: '#000'}}>
            
            {/* Society Header */}
            <div className="text-center mb-4 border-bottom pb-3">
                <div className="d-inline-flex align-items-center justify-content-center p-2 rounded-circle bg-dark text-white mb-2">
                    <FaBuilding size={24}/>
                </div>
                <h4 className="fw-bold mb-0 text-uppercase" style={{letterSpacing: '1px'}}>Sur Shakti Society</h4>
                <small className="text-muted">Valsad, Gujarat, India</small>
            </div>

            {/* Receipt Badge */}
            <div className="text-center mb-4">
                <div className="badge bg-success bg-opacity-10 text-success border border-success px-4 py-2 rounded-pill">
                    <FaCheckCircle className="me-2"/> PAYMENT RECEIPT
                </div>
                <div className="mt-2 text-muted small">
                    Transaction ID: {bill.transactionId || `TXN-${bill.billId}99`}
                </div>
            </div>

            {/* Details Table */}
            <div className="row g-3 mb-4 border p-3 rounded-3 bg-light bg-opacity-25">
                <div className="col-6">
                    <small className="text-muted fw-bold d-block text-uppercase" style={{fontSize: '0.7rem'}}>Billed To</small>
                    <span className="fw-bold">{residentName}</span>
                </div>
                <div className="col-6 text-end">
                    <small className="text-muted fw-bold d-block text-uppercase" style={{fontSize: '0.7rem'}}>Flat No</small>
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
                <span className="fs-3 fw-bold text-dark">₹{bill.amount || bill.Amount}</span>
            </div>

            {/* Footer */}
            <div className="text-center mt-5 pt-3 text-muted" style={{borderTop: '1px dashed #ccc'}}>
                <small style={{fontSize: '0.75rem'}}>
                    This receipt is valid proof of payment for society maintenance.<br/>
                    Generated via Sur Shakti Connect.
                </small>
            </div>
        </div>
        {/* --- END CAPTURE AREA --- */}

        {/* Footer Buttons */}
        <div className="p-3 border-top bg-light d-flex gap-2">
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