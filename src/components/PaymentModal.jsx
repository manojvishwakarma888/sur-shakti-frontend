import React, { useState } from 'react';
import QRCode from "react-qr-code";
import { FaTimes, FaCopy } from 'react-icons/fa';

const PaymentModal = ({ bill, onClose, onPaymentComplete }) => {
  const [step, setStep] = useState(1); // 1: Scan, 2: Confirm
  const [transactionId, setTransactionId] = useState('');

  // --- CONFIGURATION ---
  // REPLACE THIS with your actual UPI ID (e.g., yourname@oksbi)
  const SOCIETY_UPI_ID = "7276450016@ybl"; 
  const SOCIETY_NAME = "Sur Shakti Residency";
  // ---------------------

  // Generate UPI String
  // Format: upi://pay?pa=ADDRESS&pn=NAME&am=AMOUNT&tn=NOTE
  const upiString = `upi://pay?pa=${SOCIETY_UPI_ID}&pn=${SOCIETY_NAME}&am=${bill.amount || bill.Amount}&tn=Bill ${bill.month}`;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!transactionId) return alert("Please enter the Transaction ID.");
    
    // Call parent function to update Backend
    onPaymentComplete(bill.billId || bill.BillId, transactionId);
  };

  return (
    <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" 
         style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
      
      <div className="bg-white rounded-4 shadow-lg overflow-hidden" style={{ width: '400px', maxWidth: '90%' }}>
        
        {/* Header */}
        <div className="bg-primary p-3 d-flex justify-content-between align-items-center text-white">
          <h5 className="mb-0 fw-bold">Pay Maintenance</h5>
          <button onClick={onClose} className="btn btn-sm text-white opacity-75"><FaTimes size={20}/></button>
        </div>

        {/* Body */}
        <div className="p-4 text-center">
          
          {step === 1 ? (
            <>
              <p className="text-muted mb-3">Scan with <strong>PhonePe, GPay, or Paytm</strong></p>
              
              <div className="border p-3 rounded-3 d-inline-block mb-3 bg-white">
                 <QRCode value={upiString} size={180} />
              </div>

              <h3 className="fw-bold">₹{bill.amount || bill.Amount}</h3>
              <p className="small text-muted mb-4">{bill.month} Maintenance</p>

              <div className="bg-light p-2 rounded-3 mb-3 d-flex justify-content-between align-items-center">
                 <small className="text-muted text-truncate" style={{maxWidth: '200px'}}>{SOCIETY_UPI_ID}</small>
                 <button className="btn btn-link btn-sm p-0" onClick={() => navigator.clipboard.writeText(SOCIETY_UPI_ID)}>
                    <FaCopy />
                 </button>
              </div>

              <button className="btn btn-success w-100 fw-bold py-2" onClick={() => setStep(2)}>
                I Have Paid
              </button>
            </>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-3 text-start">
                <label className="form-label small fw-bold text-muted">ENTER TRANSACTION ID (UTR)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. 302518291029" 
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  required 
                />
                <div className="form-text small">Found in your payment app history.</div>
              </div>
              
              <div className="d-flex gap-2">
                 <button type="button" className="btn btn-light flex-grow-1" onClick={() => setStep(1)}>Back</button>
                 <button type="submit" className="btn btn-primary flex-grow-1 fw-bold">Verify & Submit</button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};

export default PaymentModal;