import { t as uiText, useLanguage } from '../i18n/language.js';
import { useState } from 'react';
import api, { getApiErrorMessage } from '../services/api';
import { money, noRetry } from '../services/maintenance';
import { Field, ErrorMessage } from './MaintenanceUI';

export default function MonthlyBilling({ onSuccess }) {
  useLanguage();
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [dueDate, setDueDate] = useState('');
  const [allFlats, setAllFlats] = useState(false);
  const [flats, setFlats] = useState('');
  const [charges, setCharges] = useState([{ chargeType: 'Maintenance', amount: '' }]);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const invalidate = () => { setPreview(null); setResult(null); setError(''); };
  const body = () => {
    const flatNumbers = [...new Set(flats.split(/[,\n]/).map(value => value.trim().toUpperCase()).filter(Boolean))];
    if (!allFlats && !flatNumbers.length) throw new Error('Enter at least one row house number.');
    if (!dueDate || dueDate < period + '-01') throw new Error('Due date must be on or after the start of the billing month.');
    const normalized = charges.map(c => ({ chargeType: c.chargeType.trim(), amount: Number(c.amount) }));
    if (normalized.some(c => !c.chargeType || c.amount <= 0 || !Number.isFinite(c.amount) || Math.abs(c.amount * 100 - Math.round(c.amount * 100)) > .00001)) throw new Error('Every charge needs a name and a positive amount with at most two decimals.');
    if (new Set(normalized.map(c => c.chargeType.toLowerCase())).size !== normalized.length) throw new Error('Charge types must be unique.');
    return { period, dueDate, allFlats, flatNumbers: allFlats ? [] : flatNumbers, charges: normalized };
  };
  const previewBills = async event => {
    event.preventDefault(); setError(''); setPreview(null); setResult(null); setBusy(true);
    try {
      const request = body();
      const { data } = await api.post('/maintenance/billing/preview', request, noRetry);
      if (!Array.isArray(data)) throw new Error('Unexpected preview response.');
      setPreview({ request, rows: data });
    } catch (err) { setError(getApiErrorMessage(err)); } finally { setBusy(false); }
  };
  const generate = async () => {
    if (busy || !preview) return;
    setBusy(true); setError('');
    try {
      const { data } = await api.post('/maintenance/billing/generate', preview.request, noRetry);
      setResult(data); setPreview(null); onSuccess?.();
    } catch (err) {
      setError(getApiErrorMessage(err));
      setPreview(null);
    } finally { setBusy(false); }
  };
  return <section>
    <h3 className="h5">{uiText("Monthly billing")}</h3>
    <p className="text-muted small">{uiText("Preview charges before generating. Each charge type creates a separate bill. Existing bills are skipped.")}</p>
    <ErrorMessage error={error} />
    {result && <div className="alert alert-success" role="status">{uiText("Created") + ' '}{result.created}{' ' + uiText("bills; skipped") + ' '}{result.skipped}{' ' + uiText("existing bills.")}</div>}
    <form onSubmit={previewBills} onChange={invalidate}>
      <fieldset disabled={busy}>
        <div className="maintenance-form-grid">
          <Field label={uiText("Billing month")}><input className="form-control" type="month" value={period} required onChange={e => setPeriod(e.target.value)} /></Field>
          <Field label={uiText("Due date")}><input className="form-control" type="date" min={period + '-01'} value={dueDate} required onChange={e => setDueDate(e.target.value)} /></Field>
        </div>
        <label className="d-flex gap-2 my-3"><input type="checkbox" checked={allFlats} onChange={e => setAllFlats(e.target.checked)} />{uiText("Bill all known row houses")}</label>
        {!allFlats && <Field label={uiText("Row house numbers (comma separated)")}><textarea className="form-control" value={flats} onChange={e => setFlats(e.target.value)} placeholder="A-101, A-102" required /></Field>}
        {charges.map((charge, index) => <div key={index} className="maintenance-charge-row">
          <Field label={'Charge type ' + (index + 1)}><input className="form-control" value={charge.chargeType} maxLength={50} required onChange={e => setCharges(charges.map((c, i) => i === index ? { ...c, chargeType: e.target.value } : c))} /></Field>
          <Field label={'Amount ' + (index + 1)}><input className="form-control" type="number" step=".01" min=".01" value={charge.amount} required onChange={e => setCharges(charges.map((c, i) => i === index ? { ...c, amount: e.target.value } : c))} /></Field>
          <button type="button" className="btn btn-outline-danger" disabled={charges.length === 1} onClick={() => { invalidate(); setCharges(charges.filter((_, i) => i !== index)); }}>{uiText("Remove")}</button>
        </div>)}
        <div className="d-flex gap-2 my-3"><button type="button" className="btn btn-outline-primary" onClick={() => { invalidate(); setCharges([...charges, { chargeType: '', amount: '' }]); }}>{uiText("Add charge")}</button><button className="btn btn-primary" type="submit">{busy ? uiText("Working…") : uiText("Preview bills")}</button></div>
      </fieldset>
    </form>
    {preview && <div>
      <h4 className="h6">{uiText("Preview:") + ' '}{preview.rows.length}{' ' + uiText("charges")}</h4>
      <div className="maintenance-table"><table className="table"><thead><tr><th>{uiText("Row house")}</th><th>{uiText("Charge")}</th><th>{uiText("Amount")}</th><th>{uiText("Result")}</th></tr></thead><tbody>
        {preview.rows.map((row, i) => <tr key={i}><td>{row.flatNo}</td><td>{row.chargeType}</td><td>{money(row.amount)}</td><td>{row.alreadyExists ? uiText("Already exists — skip") : uiText("New bill")}</td></tr>)}
      </tbody></table></div>
      <button className="btn btn-success" disabled={busy || !preview.rows.some(r => !r.alreadyExists)} onClick={generate}>{busy ? uiText("Generating…") : uiText("Generate previewed bills")}</button>
    </div>}
  </section>;
}
