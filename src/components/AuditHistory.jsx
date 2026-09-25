import { t as uiText, useLanguage } from '../i18n/language.js';
import { paymentStatusLabel } from '../utils/billing';
import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import api, { getApiErrorMessage } from '../services/api';
import { listPage, money } from '../services/maintenance';
import { Field, ErrorMessage, Pager } from './MaintenanceUI';

const categories = { FlatLedgerEntry: 'Account entries', Occupancy: 'Resident assignments', Bill: 'Bills', Transaction: 'Payments', Expense: 'Expenses' };
const labels = { flatno: 'Row house', amount: 'Amount', amountpaid: 'Amount paid', penaltyamount: 'Late fee', creditamount: 'Amount credited', extrachargeamount: 'Extra charges', description: 'Reason / description', kind: 'Entry type', status: 'Status', ispaid: 'Paid', residenttype: 'Resident type', userid: 'Resident', payerid: 'Payer', startsat: 'Assignment started', endsat: 'Assignment ended', duedate: 'Due date', month: 'Billing month', billmonth: 'Billing month', billtype: 'Bill type', paymentmode: 'Payment method', transactionreferenceid: 'Payment reference', failurereason: 'Reason', title: 'Title', category: 'Category', notes: 'Notes' };
const hidden = new Set(['id', 'createdby', 'actorid', 'sourcekey', 'rowversion', 'createdat', 'updatedat', 'postedat', 'verifiedbyuserid']);
function snapshot(raw) {
  try {
    const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return value && typeof value === 'object' && !Array.isArray(value) ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key.toLowerCase(), item])) : {};
  } catch { return {}; }
}
function date(value) {
  const parsed = new Date(value);
  return value && !Number.isNaN(parsed.getTime()) ? parsed.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Date unavailable';
}
function Activity({ row, names }) {
  useLanguage();
  const before = snapshot(row.before), after = snapshot(row.after);
  const data = Object.keys(after).length ? after : before;
  const action = { Added: 'added', Modified: 'updated', Deleted: 'removed' }[row.action] || row.action || 'changed';
  const types = { FlatLedgerEntry: 'Account entry', Occupancy: 'Resident assignment', Bill: 'Bill', Transaction: 'Payment', PaymentTransaction: 'Payment', Expense: 'Expense' };
  let title = (types[row.entity] || 'Record') + ' ' + action;
  if (row.entity === 'FlatLedgerEntry' && data.kind === 'Adjustment') title = (data.amount != null && Number.isFinite(Number(data.amount)) ? money(Math.abs(data.amount)) + (Number(data.amount) < 0 ? ' credit ' : ' extra charge ') : 'Bill change ') + action;
  if (data.flatno) title += ' for Row house ' + data.flatno;
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(key => !hidden.has(key) && !key.endsWith('url') && (labels[key] || !key.endsWith('id')) && JSON.stringify(before[key]) !== JSON.stringify(after[key]));
  const format = (key, value) => {
    if (value == null || value === '') return key === 'endsat' && value === null ? 'Not ended' : '—';
    if (key === 'userid' || key === 'payerid') return names[value] || 'Name unavailable';
    if (key === 'kind' && value === 'Adjustment') return Number(data.amount) < 0 ? 'Amount credited' : 'Extra charge';
    if (key === 'status') return paymentStatusLabel(value);
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (['amount', 'amountpaid', 'penaltyamount'].includes(key) && Number.isFinite(Number(value))) return money(value);
    if (['startsat', 'endsat', 'duedate'].includes(key)) return date(value);
    return typeof value === 'object' ? JSON.stringify(value) : String(value);
  };
  return <article className={"audit-activity border rounded-3 p-3 mb-3 " + (data.kind === "Adjustment" ? Number(data.amount) < 0 ? "audit-credit" : "audit-debit" : "")}>
    <h4 className="h6 fw-bold mb-2">{title}</h4>
    <p className="small text-muted mb-2">{date(row.at)}{' ' + uiText("· Changed by") + ' '}{names[row.actorId] || uiText("name unavailable")}</p>
    {data.description && <p className="mb-2">{data.description}</p>}
    {row.action === 'Added' && data.kind === 'Adjustment' && Number(data.amount) !== 0 && Number.isFinite(Number(data.amount)) && <p className="small mb-2">{Number(data.amount) > 0 ? uiText("Added to the amount owed.") : uiText("Credited to the row house account.")}</p>}
    {keys.length > 0 ? <details className="mt-2"><summary>{uiText("View changes")}</summary><div className="audit-change-list mt-3">
      {keys.map(key => <div className="audit-change" key={key}><strong>{uiText(labels[key] || key)}</strong><div>{row.action !== 'Added' && <span><span className="text-muted">{uiText("Previously:") + ' '}</span>{format(key, before[key])}<br /></span>}<span className="text-muted">{row.action === 'Deleted' ? uiText("After removal: ") : uiText("Now: ")}</span>{format(key, after[key])}</div></div>)}
    </div></details> : <p className="small text-muted">{uiText("No additional change details are available.")}</p>}
  </article>;
}

export default function AuditHistory() {
  useLanguage();
  const { user } = useContext(AuthContext);
  const [entity, setEntity] = useState('');
  const [recordId, setRecordId] = useState('');
  const [query, setQuery] = useState({});
  const [rows, setRows] = useState([]);
  const [skip, setSkip] = useState(0);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [residents, setResidents] = useState([]);
  useEffect(() => {
    let active = true;
    api.get('/Auth/all-residents').then(({ data }) => { if (active && Array.isArray(data)) setResidents(data); }).catch(() => { /* Names are optional; preserve access to the audit history. */ });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    let active = true;
    listPage('/maintenance/audit', { ...query, skip }).then(data => { if (active) setRows(data); })
      .catch(err => { if (active) setError(getApiErrorMessage(err)); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [query, skip]);
  const reload = (filters = query, offset = 0) => {
    setBusy(true); setError(''); setRows([]); setSkip(offset); setQuery({ ...filters });
  };
  const names = Object.fromEntries(residents.filter(person => person.fullName).map(person => [person.id, person.fullName]));
  if (user?.id) names[user.id] = user.fullName + ' (you)';
  return <section>
    <h3 className="h5">{uiText("Activity history")}</h3>
    <p className="text-muted">{uiText("See what changed in society records, when it changed, and who made the change. This history is read-only.")}</p>
    <form onSubmit={event => { event.preventDefault(); reload({ entity: entity || undefined, recordId: recordId.trim() || undefined }); }}>
      <fieldset disabled={busy}><div className="maintenance-form-grid"><Field label={uiText("Show activity for")}><select className="form-select" value={entity} onChange={event => setEntity(event.target.value)}><option value="">{uiText("All activity")}</option>{Object.entries(categories).map(([value, label]) => <option key={value} value={value}>{uiText(label)}</option>)}</select></Field></div>
      <details className="my-3"><summary>{uiText("Find a specific record (optional)")}</summary><div className="mt-2"><Field label={uiText("Record number")}><input className="form-control" value={recordId} onChange={event => setRecordId(event.target.value)} /></Field><small className="text-muted">{uiText("Use this only if you know the record number. Leave it blank to see all records.")}</small></div></details>
      <div className="d-flex flex-wrap gap-2 mb-3"><button className="btn btn-primary">{uiText("Show activity")}</button><button type="button" className="btn btn-outline-secondary" onClick={() => { setEntity(''); setRecordId(''); reload({}); }}>{uiText("Reset filters")}</button></div></fieldset>
    </form>
    <ErrorMessage error={error} />
    {error && <button className="btn btn-outline-primary mb-3" onClick={() => reload(query, skip)}>{uiText("Try again")}</button>}
    {busy && <p role="status">{uiText("Loading activity…")}</p>}
    {!busy && !error && !rows.length && <p>{uiText("No activity found. Changes will appear here after they are recorded.")}</p>}
    {rows.map(row => <Activity key={row.id} row={row} names={names} />)}
    {!error && <Pager skip={skip} count={rows.length} busy={busy} onPage={offset => reload(query, offset)} />}
  </section>;
}
