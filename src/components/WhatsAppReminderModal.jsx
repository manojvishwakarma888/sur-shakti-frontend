import { useEffect, useRef, useState } from 'react';
import { FaWhatsapp } from 'react-icons/fa';
import { buildBillReminder, normalizeWhatsAppPhone } from '../utils/whatsapp';
export default function WhatsAppReminderModal({ bill, onClose }) {
  const dialog = useRef(null);
  const [phone, setPhone] = useState(bill.phoneNumber || bill.PhoneNumber || bill.user?.phoneNumber || bill.User?.PhoneNumber || '');
  const [message, setMessage] = useState(() => buildBillReminder(bill));
  const number = normalizeWhatsAppPhone(phone);
  const [copyStatus, setCopyStatus] = useState('');
  const messageField = useRef(null);
  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message.trim());
      setCopyStatus('Message copied. Paste it into the resident’s WhatsApp chat.');
    } catch {
      messageField.current.focus();
      messageField.current.select();
      setCopyStatus('Message selected. Use your device’s Copy command, then paste it into WhatsApp.');
    }
  };
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);
  return (
    <dialog ref={dialog} className="whatsapp-dialog rounded-4 shadow-lg" aria-labelledby="whatsapp-title" onCancel={onClose}>
      <div className="d-flex align-items-center justify-content-between gap-3 mb-3">
        <h2 id="whatsapp-title" className="h5 fw-bold mb-0">WhatsApp payment reminder</h2>
        <button type="button" className="btn-close" aria-label="Close reminder" onClick={onClose} />
      </div>
      <p className="text-muted small">Review the recipient and message. On a computer, open WhatsApp Web and sign in if prompted, then press Send in the chat. On your phone, choose Open WhatsApp.</p>
      <label htmlFor="reminder-phone" className="form-label">Resident's WhatsApp number</label>
      <input autoFocus id="reminder-phone" type="tel" className="form-control" value={phone} onChange={event => setPhone(event.target.value)} aria-describedby="reminder-phone-help" aria-invalid={!number} placeholder="e.g. +91 98765 43210" />
      <p id="reminder-phone-help" className={'small mt-2 ' + (number ? 'text-muted' : 'text-danger')}>
        {number ? 'Opens chat with +' + number + '. Please confirm this is the correct resident.' : 'Enter a valid number. Indian mobile numbers can use 10 digits; other numbers need a country code.'}
      </p>
      <label htmlFor="reminder-message" className="form-label">Message</label>
      <textarea ref={messageField} id="reminder-message" className="form-control" rows={8} value={message} onChange={event => setMessage(event.target.value)} />
      <div className="d-flex flex-wrap justify-content-end gap-2 mt-3">
        <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
        {number && message.trim() ? (
          <>
            <a className="btn btn-success" href={'https://web.whatsapp.com/send?phone=' + number + '&text=' + encodeURIComponent(message.trim())} target="_blank" rel="noopener noreferrer"><FaWhatsapp className="me-2" />Open WhatsApp Web</a>
            <a className="btn btn-outline-success" href={'https://wa.me/' + number + '?text=' + encodeURIComponent(message.trim())} target="_blank" rel="noopener noreferrer">Open WhatsApp (phone)</a>
          </>
        ) : <button type="button" className="btn btn-success" disabled>Open WhatsApp</button>}
      </div>
      <div className="mt-3 border-top pt-3">
        <button type="button" className="btn btn-outline-secondary btn-sm" disabled={!message.trim()} onClick={copyMessage}>Copy message</button>
        <p className="small text-muted mt-2 mb-0">You can also paste this message into an existing WhatsApp chat. If your browser shows a certificate warning, do not continue past it; contact your network administrator.</p>
        <p className="small mt-2 mb-0" role="status">{copyStatus}</p>
      </div>
    </dialog>
  );
}
