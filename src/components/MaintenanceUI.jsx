import { paymentStatusLabel } from '../utils/billing';
export function Field({ label, children }) {
  return <label className="maintenance-field"><span>{label}</span>{children}</label>;
}
export function ErrorMessage({ error }) {
  return error ? <div className="alert alert-danger" role="alert">{error}</div> : null;
}
export function Pager({ skip, count, onPage, busy }) {
  return <div className="d-flex gap-2 align-items-center mt-3">
    <button className="btn btn-outline-secondary" disabled={busy || !skip} onClick={() => onPage(Math.max(0, skip - 50))}>Previous</button>
    <span className="small">Page {skip / 50 + 1}</span>
    <button className="btn btn-outline-secondary" disabled={busy || count < 50} onClick={() => onPage(skip + 50)}>Next</button>
  </div>;
}
export function Status({ value }) {
  return <span className="badge bg-secondary">{paymentStatusLabel(value)}</span>;
}
