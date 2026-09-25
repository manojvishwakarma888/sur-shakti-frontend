import { t as uiText, useLanguage } from '../i18n/language.js';
import { createElement, useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import api, { getApiErrorMessage } from '../services/api';
import { staffRole, flatPath, money, noRetry, listPage } from '../services/maintenance';
import { Field, ErrorMessage } from '../components/MaintenanceUI';
import BillChanges from '../components/BillChanges';
import { entryLabel } from '../utils/billing';
import AuditHistory from '../components/AuditHistory';
import MonthlyBilling from '../components/MonthlyBilling';
import { FaBook, FaHome, FaHistory, FaFileInvoice } from 'react-icons/fa';

function Statement({ user, staff }) {
  useLanguage();
  const [flat, setFlat] = useState(user?.flatNo === 'N/A' ? '' : user?.flatNo || '');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [statement, setStatement] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const load = async event => {
    event?.preventDefault(); setBusy(true); setError(''); setStatement(null);
    try {
      if (from && to && from > to) throw new Error('Start date must not be after end date.');
      const { data } = await api.get(flatPath(flat) + '/statement', { params: { from: from || undefined, to: to || undefined } });
      setStatement(data);
    } catch (err) {
      setError(err.response?.status === 403 ? 'Statement access requires a current resident assignment confirmed by the society office. Please contact an administrator.' : getApiErrorMessage(err));
    } finally { setBusy(false); }
  };
  return <section>
    <h3 className="h5">{uiText("Row house account history")}</h3>
    <p className="text-muted small">{uiText("See bills, payments, credits and extra charges for a row house. Leave dates blank to see all history. Dates use UTC.")}</p>
    <ErrorMessage error={error} />
    {message && <p role="status" className="alert alert-success">{message}</p>}
    <form onSubmit={load}><fieldset disabled={busy}><div className="maintenance-form-grid">
      <Field label={uiText("Row house number")}><input className="form-control" maxLength={100} value={flat} required onChange={e => { setFlat(e.target.value); setStatement(null); setMessage(''); }} /></Field>
      <Field label={uiText("From")}><input className="form-control" type="date" value={from} onChange={e => { setFrom(e.target.value); setStatement(null); }} /></Field>
      <Field label={uiText("To")}><input className="form-control" type="date" value={to} onChange={e => { setTo(e.target.value); setStatement(null); }} /></Field>
    </div><button className="btn btn-primary my-3">{busy ? uiText("Loading…") : uiText("View account")}</button></fieldset></form>
    {statement && <>
      <h4 className="h6">{uiText("Row house") + ' '}{statement.flatNo}</h4>
      <div className="maintenance-summary">{[['Balance at start', 'openingBalance'], ['Bills issued', 'charges'], ['Late fees', 'penalties'], ['Payments received', 'verifiedPayments'], ['Extra charges minus credits', 'adjustments'], ['Balance at end', 'closingBalance']].map(([label, key]) => <div key={key}><small>{uiText(label)}</small><strong>{money(statement[key])}</strong></div>)}</div>
      <div className="d-flex flex-wrap gap-2 mb-2 small"><span className="ledger-key ledger-key-debit">{uiText("Added to dues")}</span><span className="ledger-key ledger-key-credit">{uiText("Paid or credited")}</span></div>
      <div className="maintenance-table"><table className="table"><thead><tr><th>{uiText("Date (UTC)")}</th><th>{uiText("Description")}</th><th>{uiText("Added to dues")}</th><th>{uiText("Paid / credited")}</th><th>{uiText("Balance")}</th></tr></thead><tbody>
        {(statement.entries || []).map(entry => <tr key={entry.id}><td>{entry.date?.slice(0, 10)}</td><td>{uiText(entryLabel(entry))}: {entry.description}</td><td className={Number(entry.debit) > 0 ? "ledger-debit" : ""}>{Number(entry.debit) > 0 ? money(entry.debit) : "—"}</td><td className={Number(entry.credit) > 0 ? "ledger-credit" : ""}>{Number(entry.credit) > 0 ? money(entry.credit) : "—"}</td><td>{money(entry.balance)}</td></tr>)}
      </tbody></table></div>
      {!statement.entries?.length && <p>{uiText("No entries in this period.")}</p>}
      {staff && <BillChanges flatNo={statement.flatNo} pending={statement.pendingBillChanges || []} onSaved={message => { setMessage(message); load(); }} />}
    </>}
  </section>;
}

function Occupancy() {
  useLanguage();
  const [flat, setFlat] = useState('');
  const [loadedFlat, setLoadedFlat] = useState('');
  const [rows, setRows] = useState(null);
  const [residents, setResidents] = useState([]);
  const [resident, setResident] = useState('');
  const [type, setType] = useState('Owner');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = async event => {
    event?.preventDefault(); setBusy(true); setError(''); setRows(null);
    try {
      const target = flat.trim().toUpperCase();
      const [history, users] = await Promise.all([listPage(flatPath(target) + '/occupancies'), api.get('/Auth/all-residents')]);
      setRows(history); setResidents(users.data); setLoadedFlat(target);
    } catch (err) { setError(getApiErrorMessage(err)); } finally { setBusy(false); }
  };
  const save = async end => {
    if (!window.confirm(end ? 'End the current assignment for ' + loadedFlat + '?' : 'Confirm this billing resident for ' + loadedFlat + '? This replaces the current assignment.')) return;
    setBusy(true); setError('');
    try {
      await api.post(flatPath(loadedFlat) + '/occupancies' + (end ? '/end' : ''), end ? undefined : { userId: resident, residentType: type }, noRetry);
      setRows(await listPage(flatPath(loadedFlat) + '/occupancies')); setResident('');
    } catch (err) { setError(getApiErrorMessage(err)); } finally { setBusy(false); }
  };
  return <section><h3 className="h5">{uiText("Row house resident assignment")}</h3><p className="text-muted small">{uiText("One confirmed billing resident per row house. Financial history stays with the row house; payment proof and receipts stay private to the payer.")}</p>
    <ErrorMessage error={error} />
    <form onSubmit={load}><fieldset disabled={busy}><Field label={uiText("Row house number")}><input className="form-control" required maxLength={100} value={flat} onChange={e => { setFlat(e.target.value); setRows(null); }} /></Field><button className="btn btn-primary my-3">{uiText("Load assignment")}</button></fieldset></form>
    {rows && <><h4 className="h6">{uiText("History for") + ' '}{loadedFlat}</h4>
      {rows.length === 0 && <p>{uiText("No confirmed resident assignment. Select a resident below to confirm one.")}</p>}
      {rows.map(row => <div className="border rounded-3 p-3 mb-2" key={row.id}>
        <strong>{residents.find(r => r.id === row.userId)?.fullName || row.userId} · {row.residentType}</strong>
        <div className="small text-muted">{row.startsAt} → {row.endsAt || uiText("Current")}</div>
      </div>)}
      <form onSubmit={e => { e.preventDefault(); save(false); }}><fieldset disabled={busy}>
        <div className="maintenance-form-grid">
          <Field label={uiText("Billing resident")}><select className="form-select" required value={resident} onChange={e => setResident(e.target.value)}><option value="">{uiText("Select resident")}</option>{residents.map(r => <option key={r.id} value={r.id}>{r.fullName} — {r.flatNo || uiText("Unassigned")}</option>)}</select></Field>
          <Field label={uiText("Resident type")}><select className="form-select" value={type} onChange={e => setType(e.target.value)}><option value="Owner">{uiText("Owner")}</option><option value="Tenant">{uiText("Tenant")}</option></select></Field>
        </div><div className="d-flex flex-wrap gap-2 mt-3"><button className="btn btn-primary">{uiText("Confirm assignment")}</button><button type="button" className="btn btn-outline-danger" disabled={!rows.some(r => !r.endsAt)} onClick={() => save(true)}>{uiText("End current assignment")}</button></div>
      </fieldset></form>
    </>}
  </section>;
}

export default function Maintenance() {
  useLanguage();
  const { user } = useContext(AuthContext);
  const staff = staffRole(user);
  const [tab, setTab] = useState('Account history');
  const tabs = staff ? [['Account history', FaBook], ['Billing', FaFileInvoice], ['Resident assignment', FaHome], ['Activity history', FaHistory]] : [['Account history', FaBook]];
  return <div className="maintenance-screen"><h2 className="h3 fw-bold mb-3">{uiText("Row house accounts")}</h2>
    <div className="maintenance-tabs" role="group" aria-label={uiText("Maintenance sections")}>{tabs.map(([name, icon]) => <button className={'btn ' + (tab === name ? 'btn-primary' : 'btn-outline-primary')} key={name} aria-pressed={tab === name} onClick={() => setTab(name)}>{createElement(icon, { 'aria-hidden': true })} {uiText(name)}</button>)}</div>
    <div className="card p-3 p-md-4 border-0 shadow-sm rounded-4 mt-3">
      {tab === 'Account history' && <Statement user={user} staff={staff} />}
      {staff && tab === 'Billing' && <MonthlyBilling />}
      {staff && tab === 'Resident assignment' && <Occupancy />}
      {staff && tab === 'Activity history' && <AuditHistory />}
    </div>
  </div>;
}

