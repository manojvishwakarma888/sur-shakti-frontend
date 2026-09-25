import { useEffect, useRef } from 'react';
import MonthlyBilling from './MonthlyBilling';
export default function ManualBillModal({ onClose, onSuccess }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current;
    const overflow = document.body.style.overflow;
    dialog.showModal(); document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  return <dialog ref={ref} className="maintenance-dialog" aria-labelledby="manual-bill-title" onCancel={onClose}>
    <div className="d-flex justify-content-between align-items-center gap-2 mb-3">
      <h2 id="manual-bill-title" className="h5 mb-0">Generate New Bills</h2>
      <button className="btn btn-light" aria-label="Close generate bills" onClick={onClose}>Close</button>
    </div>
    <MonthlyBilling onSuccess={onSuccess} />
  </dialog>;
}
