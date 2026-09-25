import { t as uiText, useLanguage } from '../i18n/language.js';
import { useEffect, useState } from 'react';
import api, { getApiErrorMessage } from '../services/api';
import { flatPath, money, newKey, noRetry } from '../services/maintenance';
import { billPayableAmount } from '../utils/billing';
import { Field, ErrorMessage } from './MaintenanceUI';

export default function BillChanges({ flatNo, pending = [], onSaved }) {
  useLanguage();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ billId: '', type: 'credit', amount: '', reason: '', idempotencyKey: newKey() });
  useEffect(() => {
    let active = true;
    api.get('/Bill').then(({ data }) => {
      if (!Array.isArray(data)) throw new Error('Unable to read bills. Please try again.');
      if (active) setBills(data.filter(bill => String(bill.flatNo).toUpperCase() === flatNo.toUpperCase() && (!bill.isPaid || bill.paidByCredit)));
    }).catch(err => { if (active) setError(getApiErrorMessage(err)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [flatNo, version]);
  const change = values => setForm(current => ({ ...current, ...values, idempotencyKey: newKey() }));
  const selected = bills.find(bill => String(bill.billId) === form.billId);
  const currentDue = selected ? billPayableAmount(selected) : 0;
  const amount = Number(form.amount);
  const signed = form.type === 'credit' ? -amount : amount;
  const save = async (event, earlier) => {
    event?.preventDefault();
    setError('');
    if (!selected) { setError('Choose the bill to update.'); return; }
    const value = earlier ? Number(earlier.amount) : signed;
    if (!Number.isFinite(value) || value === 0 || (!earlier && amount <= 0)) { setError('Enter an amount greater than zero.'); return; }
    if (Math.abs(value * 100 - Math.round(value * 100)) > .00001) { setError('Use no more than two decimal places.'); return; }
    if (currentDue + value < 0) { setError('The credit cannot be more than this bill’s amount due.'); return; }
    if (!window.confirm((value < 0 ? 'Credit ' : 'Add an extra charge of ') + money(Math.abs(value)) + ' to bill #' + selected.billId + '? New amount due: ' + money(currentDue + value))) return;
    setBusy(true);
    try {
      if (earlier) await api.post(flatPath(flatNo) + '/adjustments/' + earlier.id + '/apply', { billId: selected.billId }, noRetry);
      else await api.post(flatPath(flatNo) + '/adjustments', { billId: selected.billId, amount: value, reason: form.reason.trim(), idempotencyKey: form.idempotencyKey }, noRetry);
      onSaved(value < 0 ? 'Amount credited. The bill and amount due have been updated.' : 'Extra charge added. The bill and amount due have been updated.');
    } catch (err) { setError(getApiErrorMessage(err)); } finally { setBusy(false); }
  };
  return <section className="border-top pt-3 mt-3">
    <h4 className="h6">{uiText("Give credit or add a charge")}</h4>
    <p className="small text-muted">{uiText("Choose a bill. A credit reduces what the resident owes; an extra charge increases it. This does not record a payment or spending.")}</p>
    <ErrorMessage error={error} />
    {loading && <p role="status">{uiText("Loading bills…")}</p>}
    {error && !loading && <button className="btn btn-outline-secondary mb-3" onClick={() => { setLoading(true); setError(''); setVersion(value => value + 1); }}>{uiText("Reload bills")}</button>}
    {!loading && !error && !bills.length && <p>{uiText("No unpaid bills for this row house. Create a bill before giving credit or adding a charge.")}</p>}
    <form onSubmit={event => save(event)}><fieldset disabled={loading || busy || !bills.length}>
      <Field label={uiText("Choose bill")}><select className="form-select" required value={form.billId} onChange={event => change({ billId: event.target.value })}><option value="">{uiText("Select a bill")}</option>{bills.map(bill => <option key={bill.billId} value={bill.billId}>{uiText("Bill #")}{bill.billId} · {bill.month} · {bill.billType}{' ' + uiText("· Due") + ' '}{money(billPayableAmount(bill))}</option>)}</select></Field>
      <div className="maintenance-form-grid mt-3">
        <Field label={uiText("What would you like to do?")}><select className="form-select" value={form.type} onChange={event => change({ type: event.target.value })}><option value="credit">{uiText("Give credit (reduce amount due)")}</option><option value="charge">{uiText("Add an extra charge")}</option></select></Field>
        <Field label={uiText("Amount (₹)")}><input className="form-control" type="number" min="0.01" step="0.01" required value={form.amount} onChange={event => change({ amount: event.target.value })} /></Field>
        <Field label={uiText("Reason for this change")}><input className="form-control" required maxLength={500} value={form.reason} onChange={event => change({ reason: event.target.value })} placeholder={uiText("e.g. Correcting an extra charge")} /></Field>
      </div>
      {selected && amount > 0 && <p className={"mt-3 rounded-3 p-2 " + (form.type === "credit" ? "ledger-credit" : "ledger-debit")} role="status">{uiText("Current amount due:") + ' '}{money(currentDue)}{' ' + uiText("· New amount due:") + ' '}{money(currentDue + signed)}</p>}
      <button className="btn btn-primary mt-3">{busy ? uiText("Saving…") : form.type === 'credit' ? uiText("Give credit") : uiText("Add extra charge")}</button>
    </fieldset></form>
    {pending.length > 0 && <section className="alert alert-warning mt-3"><h5 className="h6">{uiText("Earlier entries need a bill")}</h5><p className="small">{uiText("These entries already affect the account statement. Choose a bill above and link each entry to update its amount due too. This will not add it to the statement again.")}</p>{pending.map(entry => <div key={entry.id} className="border-top py-2"><p>{entry.amount < 0 ? uiText("Credit") : uiText("Extra charge")}: {money(Math.abs(entry.amount))} · {entry.reason}</p><button type="button" className="btn btn-outline-primary" disabled={busy || !selected} onClick={() => save(null, entry)}>{uiText("Apply to selected bill")}</button></div>)}</section>}
  </section>;
}
