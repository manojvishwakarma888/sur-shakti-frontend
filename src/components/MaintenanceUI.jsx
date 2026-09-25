import { t as uiText, useLanguage } from '../i18n/language.js';
import { paymentStatusLabel } from '../utils/billing';
export function Field({ label, children }) {
  useLanguage();
  return <label className="maintenance-field"><span>{uiText(label)}</span>{children}</label>;
}
export function ErrorMessage({ error }) {
  useLanguage();
  return error ? <div className="alert alert-danger" role="alert">{uiText(error)}</div> : null;
}
export function Pager({ skip, count, onPage, busy }) {
  useLanguage();
  return <div className="d-flex gap-2 align-items-center mt-3">
    <button className="btn btn-outline-secondary" disabled={busy || !skip} onClick={() => onPage(Math.max(0, skip - 50))}>{uiText("Previous")}</button>
    <span className="small">{uiText("Page") + ' '}{skip / 50 + 1}</span>
    <button className="btn btn-outline-secondary" disabled={busy || count < 50} onClick={() => onPage(skip + 50)}>{uiText("Next")}</button>
  </div>;
}
export function Status({ value }) {
  useLanguage();
  return <span className="badge bg-secondary">{uiText(paymentStatusLabel(value))}</span>;
}
