import { useEffect, useRef, useState } from 'react';
import api, { getApiErrorMessage } from '../services/api';
import { listPage, noRetry } from '../services/maintenance';
import { ErrorMessage, Pager } from '../components/MaintenanceUI';
import CommunityPageHero from '../components/CommunityPageHero';

export default function Notifications() {
  const [rows, setRows] = useState([]);
  const [skip, setSkip] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [version, setVersion] = useState(0);
  const request = useRef(0);
  useEffect(() => {
    let active = true;
    let inFlight = false;
    const load = async () => {
      if (inFlight) return;
      inFlight = true;
      const id = ++request.current;
      try { const data = await listPage('/notifications', { skip }); if (active && id === request.current) { setRows(data); setError(''); } }
      catch (err) { if (active) setError(getApiErrorMessage(err)); }
      finally { inFlight = false; if (active) setLoading(false); }
    };
    setLoading(true); setRows([]); load();
    const timer = setInterval(() => { if (!document.hidden) load(); }, 30000);
    return () => { active = false; clearInterval(timer); };
  }, [skip, version]);
  const markRead = async id => {
    setBusyId(id); setError('');
    try {
      await api.post('/notifications/' + id + '/read', undefined, noRetry);
      ++request.current;
      setRows(current => current.map(row => row.id === id ? { ...row, readAt: new Date().toISOString() } : row));
    } catch (err) { setError(getApiErrorMessage(err)); } finally { setBusyId(null); }
  };
  return <div className="maintenance-screen"><CommunityPageHero pathname="/notifications" title="Notifications"><button className="btn btn-outline-primary" onClick={() => setVersion(v => v + 1)} disabled={loading}>Refresh</button></CommunityPageHero>
    <p className="text-muted small">Updates from the society office. Refreshes every 30 seconds while this page is open.</p>
    <ErrorMessage error={error} />
    {loading ? <p role="status">Loading notifications…</p> : !error && !rows.length ? <p className="empty-state">No notifications on this page.</p> : null}
    <div className="d-grid gap-3">{rows.map(row => <article className="card p-3 rounded-4" key={row.id}>
      <div className="d-flex justify-content-between gap-2"><strong>{{ Bill: 'New bill', PaymentStatus: 'Payment update', ComplaintStatus: 'Help request update', DueDate: 'Payment reminder', Overdue: 'Overdue bill', BillChange: 'Bill updated' }[row.kind] || row.kind}</strong><span className="small">{row.readAt ? 'Read' : 'Unread'}</span></div>
      <p className="my-2" style={{ whiteSpace: 'pre-wrap' }}>{row.message}</p>
      <small className="text-muted">{new Date(row.createdAt).toLocaleString()}</small>
      {!row.readAt && <button className="btn btn-outline-primary mt-3 align-self-start" disabled={busyId !== null} onClick={() => markRead(row.id)}>Mark as read</button>}
    </article>)}</div><Pager skip={skip} count={rows.length} onPage={setSkip} busy={loading || busyId !== null} />
  </div>;
}
