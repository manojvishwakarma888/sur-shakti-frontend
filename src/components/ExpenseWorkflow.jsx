import { t as uiText, useLanguage } from '../i18n/language.js';
import { useEffect, useState } from 'react';
import api, { getApiErrorMessage, openAuthenticatedFile } from '../services/api';
import { listPage, money, noRetry } from '../services/maintenance';
import { Field, ErrorMessage, Pager, Status } from './MaintenanceUI';

export default function ExpenseWorkflow({ refreshVersion = 0, onChanged }) {
  useLanguage();
  const [expenses, setExpenses] = useState([]);
  const [banks, setBanks] = useState([]);
  const [skip, setSkip] = useState(0);
  const [bankSkip, setBankSkip] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState({});
  const [matches, setMatches] = useState({});
  const [bank, setBank] = useState({ reference: '', date: '', amount: '' });
  const [version, setVersion] = useState(0);
  const [message, setMessage] = useState('');
  useEffect(() => {
    let active = true;
    setBusy(true); setError(''); setExpenses([]); setBanks([]);
    Promise.all([listPage('/maintenance/expenses', { skip }), listPage('/maintenance/expenses/bank-records', { skip: bankSkip })])
      .then(([e, b]) => { if (active) { setExpenses(e); setBanks(b); } })
      .catch(err => { if (active) setError(getApiErrorMessage(err)); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [skip, bankSkip, version, refreshVersion]);
  const mutate = async (action, success) => {
    if (busy) return;
    setBusy(true); setError(''); setMessage('');
    try { await action(); setMessage(success); setVersion(v => v + 1); onChanged?.(); }
    catch (err) { setError(getApiErrorMessage(err)); }
    finally { setBusy(false); }
  };
  const review = (exp, approved) => {
    const reason = (notes[exp.id] || '').trim();
    if (!approved && !reason) { setError('Enter a reason before rejecting an expense.'); return; }
    mutate(() => api.post('/maintenance/expenses/' + exp.id + '/review', { approved, reason: reason || null }, noRetry), approved ? 'Expense approved.' : 'Expense rejected.');
  };
  const cancel = exp => {
    if (window.confirm('Cancel "' + exp.title + '"? Its invoice and audit history will be retained.')) {
      mutate(() => api.delete('/Expense/' + exp.id, noRetry), 'Expense cancelled.');
    }
  };
  return <section className="card p-3 p-md-4 mt-4 rounded-4 maintenance-screen">
    <h3 className="h5">{uiText("Expense approval & bank matching")}</h3>
    <ErrorMessage error={error} />{message && <p className="alert alert-success" role="status">{message}</p>}
    <button className="btn btn-outline-primary align-self-start mb-3" disabled={busy} onClick={() => setVersion(v => v + 1)}>{uiText("Refresh workflow")}</button>
    {busy && <p role="status">{uiText("Loading…")}</p>}
    {!busy && !error && !expenses.length && <p>{uiText("No expenses on this page.")}</p>}
    {expenses.map(exp => <article key={exp.id} className="border rounded-3 p-3 mb-3">
      <div className="d-flex justify-content-between gap-2"><strong>{exp.title} · {money(exp.amount)}</strong><Status value={exp.status} /></div>
      <small className="text-muted">#{exp.id} · {exp.date?.slice(0, 10)} · {exp.category}</small>
      {exp.reviewReason && <p className="small mt-2">{uiText("Review:") + ' '}{exp.reviewReason}</p>}
      {exp.invoiceUrl && <button className="btn btn-outline-secondary my-2" onClick={() => openAuthenticatedFile(exp.invoiceUrl).catch(err => setError(getApiErrorMessage(err)))}>{uiText("View invoice")}</button>}
      {exp.status === 'Submitted' && <div className="mt-2"><Field label={'Review reason for expense ' + exp.id}><input className="form-control" maxLength={500} value={notes[exp.id] || ''} onChange={e => setNotes({ ...notes, [exp.id]: e.target.value })} /></Field><div className="d-flex gap-2 mt-2"><button className="btn btn-success" disabled={busy} onClick={() => review(exp, true)}>{uiText("Approve")}</button><button className="btn btn-outline-danger" disabled={busy} onClick={() => review(exp, false)}>{uiText("Reject")}</button></div></div>}
      {exp.status === 'Approved' && <div className="mt-2">
        {banks.some(b => b.expenseId === exp.id) ? <p className="text-success">{uiText("Matched to bank record") + ' '}{banks.find(b => b.expenseId === exp.id).reference}</p> : <>
          <Field label={'Bank record for expense ' + exp.id}><select className="form-select" value={matches[exp.id] || ''} onChange={e => setMatches({ ...matches, [exp.id]: e.target.value })}><option value="">{uiText("Select a bank payment not yet linked")}</option>{banks.filter(b => !b.expenseId && Number(b.amount) === Number(exp.amount)).map(b => <option key={b.id} value={b.id}>{b.reference} · {money(b.amount)}</option>)}</select></Field>
          <button className="btn btn-outline-primary mt-2" disabled={busy || !matches[exp.id]} onClick={() => mutate(() => api.post('/maintenance/expenses/' + exp.id + '/match/' + matches[exp.id], undefined, noRetry), 'Bank record matched.')}>{uiText("Link bank payment")}</button>
        </>}
      </div>}
      {exp.status !== 'Cancelled' && <button className="btn btn-outline-danger mt-3" disabled={busy || banks.some(b => b.expenseId === exp.id)} onClick={() => cancel(exp)}>{uiText("Cancel expense")}</button>}
    </article>)}
    <Pager skip={skip} count={expenses.length} busy={busy} onPage={setSkip} />
    <h4 className="h6 mt-4">{uiText("Money paid from the bank")}</h4><p className="small text-muted">{uiText("Add each bank payment and link it to the matching approved expense.")}</p>
    <div className="maintenance-table"><table className="table"><thead><tr><th>{uiText("Reference")}</th><th>{uiText("Date")}</th><th>{uiText("Amount")}</th><th>{uiText("Expense")}</th></tr></thead><tbody>{banks.map(b => <tr key={b.id}><td>{b.reference}</td><td>{b.date?.slice(0, 10)}</td><td>{money(b.amount)}</td><td>{b.expenseId || uiText("Not linked")}</td></tr>)}</tbody></table></div>
    <Pager skip={bankSkip} count={banks.length} busy={busy} onPage={setBankSkip} />
    <form className="mt-3" onSubmit={e => { e.preventDefault(); mutate(async () => { await api.post('/maintenance/expenses/bank-records', { ...bank, reference: bank.reference.trim(), amount: Number(bank.amount) }, noRetry); setBank({ reference: '', date: '', amount: '' }); }, 'Bank record saved.'); }}><fieldset disabled={busy}><div className="maintenance-form-grid">
      <Field label={uiText("Bank reference")}><input className="form-control" required maxLength={100} value={bank.reference} onChange={e => setBank({ ...bank, reference: e.target.value })} /></Field>
      <Field label={uiText("Bank date")}><input type="date" className="form-control" required value={bank.date} onChange={e => setBank({ ...bank, date: e.target.value })} /></Field>
      <Field label={uiText("Amount paid (₹)")}><input type="number" min=".01" step=".01" className="form-control" required value={bank.amount} onChange={e => setBank({ ...bank, amount: e.target.value })} /></Field>
    </div><button className="btn btn-primary mt-3">{uiText("Add bank record")}</button></fieldset></form>
  </section>;
}
