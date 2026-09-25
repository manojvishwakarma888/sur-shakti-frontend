import { useCallback, useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaArrowLeft, FaCalendarAlt, FaChair, FaCheck, FaCheckCircle, FaClock,
  FaCog, FaInfoCircle, FaPlus, FaSpinner, FaTimes,
} from 'react-icons/fa';
import { AuthContext } from '../context/AuthContext';
import { getApiErrorMessage } from '../services/api';
import EventPaymentPanel from '../components/EventPaymentPanel';
import {
  cancelEventBooking, createPlotBlock, deletePlotBlock, getEventInventory,
  listEventBookings, listPlotBlocks, reviewEventBooking, updateEventInventory,
} from '../services/eventBookings';
import './EventManagement.css';

const formatCurrency = value => Number(value) === 0 ? 'Free' : `₹${Number(value || 0).toLocaleString('en-IN')}`;
const formatBookingDate = value => value ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const statusClass = status => `status-${String(status || 'pending').toLowerCase()}`;
const lifecycle = booking => {
  const status = String(booking.status || 'Pending').toLowerCase();
  const eventPassed = booking.endsAt && new Date(booking.endsAt) < new Date();
  if (status === 'rejected') return { branch: 'Rejected by committee', current: 1 };
  if (status === 'cancelled') return { branch: 'Booking cancelled', current: 1 };
  const paymentComplete = ['approved', 'completed', 'closed'].includes(status);
  return {
    current: status === 'pending' ? 1 : status === 'awaitingpayment' ? 2 : status === 'completed' ? 5 : status === 'closed' ? 6 : eventPassed ? 4 : 3,
    stages: [
      ['Request sent', 'Booking details received'],
      ['Committee review', status === 'pending' ? 'Awaiting decision' : 'Availability approved'],
      ['Payment verification', paymentComplete ? 'Payment verified' : Number(booking.bookingCharge) + Number(booking.deposit) > 0 ? 'Awaiting full payment' : 'No payment required'],
      ['Booking confirmed', paymentComplete ? 'Plot and chairs reserved' : 'Confirms after payment'],
      ['Event & inspection', 'Committee records cleaning or damage'],
      ['Refund & closure', status === 'closed' ? 'Settlement complete' : 'Pending final settlement'],
    ],
  };
};

export default function EventBookingHistory() {
  const { user } = useContext(AuthContext);
  const isStaff = ['admin', 'secretary'].includes(String(user?.role).toLowerCase());
  const [view, setView] = useState('bookings');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [actionId, setActionId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [apiError, setApiError] = useState('');
  const [inventory, setInventory] = useState(null);
  const [inventoryDraft, setInventoryDraft] = useState('');
  const [plotBlocks, setPlotBlocks] = useState([]);
  const [blockForm, setBlockForm] = useState({ plotNumber: 1, startsOn: '', endsOn: '', reason: '' });
  const [staffSaving, setStaffSaving] = useState(false);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      setBookings(await listEventBookings(statusFilter ? { status: statusFilter } : {}));
      setApiError('');
    } catch (error) {
      setApiError(getApiErrorMessage(error, 'Could not load event bookings.'));
    } finally { setLoading(false); }
  }, [statusFilter]);
  useEffect(() => { loadBookings(); }, [loadBookings]);

  const loadSettings = useCallback(async () => {
    if (!isStaff) return;
    const startsAt = new Date().toISOString();
    const until = new Date();
    until.setMonth(until.getMonth() + 6);
    try {
      const [inventoryResult, blocksResult] = await Promise.all([getEventInventory(), listPlotBlocks(startsAt, until.toISOString())]);
      setInventory(inventoryResult);
      setInventoryDraft(String(inventoryResult?.totalChairs ?? 0));
      setPlotBlocks(blocksResult);
    } catch (error) { toast.error(getApiErrorMessage(error, 'Could not load availability settings.')); }
  }, [isStaff]);
  useEffect(() => { if (view === 'settings') loadSettings(); }, [view, loadSettings]);

  const handleCancel = async booking => {
    const reason = window.prompt('Why are you cancelling this booking?');
    if (reason === null) return;
    setActionId(booking.id);
    try { await cancelEventBooking(booking.id, reason); toast.success('Booking cancelled.'); await loadBookings(); }
    catch (error) { toast.error(getApiErrorMessage(error, 'Could not cancel the booking.')); }
    finally { setActionId(null); }
  };
  const handleReview = async (booking, approve) => {
    const reason = approve ? window.prompt('Optional approval note:', 'Availability checked') : window.prompt('Reason for rejection:');
    if (reason === null) return;
    setActionId(booking.id);
    try {
      await reviewEventBooking(booking.id, { approve, reason: reason || null });
      toast.success(approve ? 'Booking approved for payment.' : 'Booking rejected.');
      await loadBookings();
    } catch (error) { toast.error(getApiErrorMessage(error, 'Could not review the booking.')); }
    finally { setActionId(null); }
  };
  const handleInventorySave = async event => {
    event.preventDefault(); setStaffSaving(true);
    try { const result = await updateEventInventory(Number(inventoryDraft)); setInventory(result); setInventoryDraft(String(result.totalChairs)); toast.success('Chair inventory updated.'); }
    catch (error) { toast.error(getApiErrorMessage(error, 'Could not update chair inventory.')); }
    finally { setStaffSaving(false); }
  };
  const handleBlockCreate = async event => {
    event.preventDefault();
    const startsAt = new Date(`${blockForm.startsOn}T00:00:00`).toISOString();
    const endsAt = new Date(`${blockForm.endsOn}T23:59:59`).toISOString();
    if (new Date(endsAt) <= new Date(startsAt)) return toast.error('Closure end date must be on or after its start date.');
    setStaffSaving(true);
    try {
      const created = await createPlotBlock({ plotNumber: Number(blockForm.plotNumber), startsAt, endsAt, reason: blockForm.reason });
      setPlotBlocks(current => [...current, created]);
      setBlockForm({ plotNumber: 1, startsOn: '', endsOn: '', reason: '' });
      toast.success('Plot closure added.');
    } catch (error) { toast.error(getApiErrorMessage(error, 'Could not add the plot closure.')); }
    finally { setStaffSaving(false); }
  };
  const handleBlockDelete = async block => {
    if (!window.confirm(`Remove the closure for Common Plot ${block.plotNumber}?`)) return;
    try { await deletePlotBlock(block.id); setPlotBlocks(current => current.filter(item => item.id !== block.id)); toast.success('Plot closure removed.'); }
    catch (error) { toast.error(getApiErrorMessage(error, 'Could not remove the plot closure.')); }
  };

  const counts = bookings.reduce((result, booking) => ({ ...result, [String(booking.status || 'Pending').toLowerCase()]: (result[String(booking.status || 'Pending').toLowerCase()] || 0) + 1 }), {});

  return <div className="event-management-screen event-history-screen">
    <header className="history-page-header">
      <div><Link to="/event-management"><FaArrowLeft /> Event management</Link><span className="event-section-kicker">{isStaff ? 'Committee workspace' : 'Your events'}</span><h1>{isStaff ? 'Event bookings' : 'Booking history'}</h1><p>Track requests from submission through committee follow-up.</p></div>
      <Link className="history-new-booking" to="/event-management"><FaPlus /> New booking</Link>
    </header>

    {isStaff && <nav className="history-view-switch" aria-label="Event management sections">
      <button type="button" className={view === 'bookings' ? 'active' : ''} onClick={() => setView('bookings')}><FaCalendarAlt /> Bookings</button>
      <button type="button" className={view === 'settings' ? 'active' : ''} onClick={() => setView('settings')}><FaCog /> Availability settings</button>
    </nav>}

    {view === 'bookings' && <>
      <section className="history-summary" aria-label="Booking summary">
        <div><span>All requests</span><strong>{bookings.length}</strong></div><div><span>Needs review</span><strong>{counts.pending || 0}</strong></div><div><span>Payment due</span><strong>{counts.awaitingpayment || 0}</strong></div><div><span>Confirmed</span><strong>{(counts.approved || 0) + (counts.completed || 0) + (counts.closed || 0)}</strong></div>
      </section>
      <section className="event-bookings-panel history-bookings-panel">
        <div className="event-section-heading bookings-panel-heading"><div><span className="event-section-kicker">Requests</span><h2>{isStaff ? 'Review, payment and settlement' : 'Your booking requests'}</h2></div><select aria-label="Filter bookings by status" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="">All statuses</option><option value="Pending">Pending</option><option value="AwaitingPayment">Awaiting payment</option><option value="Approved">Approved</option><option value="Completed">Completed</option><option value="Closed">Closed</option><option value="Rejected">Rejected</option><option value="Cancelled">Cancelled</option></select></div>
        {apiError ? <div className="event-api-notice warning" role="alert"><FaInfoCircle /><div><strong>Could not load bookings</strong><span>{apiError}</span></div><button type="button" onClick={loadBookings}>Try again</button></div> :
        loading ? <div className="bookings-loading"><FaSpinner className="spin" /> Loading bookings…</div> : bookings.length === 0 ? <div className="event-empty-state"><FaCalendarAlt /><strong>No bookings found</strong><span>Create a request to start your event journey.</span></div> :
        <div className="booking-history-list">{bookings.map(booking => {
          const canCancel = ['pending', 'awaitingpayment', 'approved'].includes(String(booking.status).toLowerCase()) && (isStaff || new Date(booking.startsAt) > new Date());
          const tracking = lifecycle(booking);
          const expanded = expandedId === booking.id;
          return <article className="history-booking-card" key={booking.id}>
            <div className="history-booking-main">
              <div className="booking-list-date"><strong>{new Date(booking.startsAt).getDate()}</strong><span>{new Date(booking.startsAt).toLocaleString('en-IN', { month: 'short' })}</span></div>
              <div className="booking-list-content"><div className="booking-list-title"><h3>{booking.title || 'Event booking'}</h3><span className={`booking-status ${statusClass(booking.status)}`}>{booking.status || 'Pending'}</span></div><p>{booking.plotNumber ? (booking.locationDetails || `Common Plot ${booking.plotNumber}`) : `${booking.chairQuantity} chairs · ${booking.location}${booking.locationDetails ? ` · ${booking.locationDetails}` : ''}`}</p><small>{formatBookingDate(booking.startsAt)} – {formatBookingDate(booking.endsAt)} · {formatCurrency(Number(booking.bookingCharge) + Number(booking.deposit))}</small>{booking.reviewReason && <span className="booking-reason"><FaInfoCircle /> {booking.reviewReason}</span>}</div>
              <div className="booking-list-actions">{isStaff && String(booking.status).toLowerCase() === 'pending' && <><button type="button" className="approve" disabled={actionId === booking.id} onClick={() => handleReview(booking, true)}>Approve</button><button type="button" className="reject" disabled={actionId === booking.id} onClick={() => handleReview(booking, false)}>Reject</button></>}{canCancel && <button type="button" className="cancel" disabled={actionId === booking.id} onClick={() => handleCancel(booking)}>Cancel</button>}<button type="button" className="track" onClick={() => setExpandedId(expanded ? null : booking.id)}>{expanded ? 'Hide progress' : 'Track progress'}</button></div>
            </div>
            {expanded && <div className="booking-lifecycle">
              {tracking.branch ? <div className="lifecycle-branch"><FaTimes /><strong>{tracking.branch}</strong><span>{booking.reviewReason || booking.cancellationReason || 'This request will not continue through the booking process.'}</span></div> :
              <ol>{tracking.stages.map(([title, detail], index) => <li key={title} className={index < tracking.current ? 'complete' : index === tracking.current ? 'current' : ''}><span className="lifecycle-dot">{index < tracking.current ? <FaCheck /> : index + 1}</span><div><strong>{title}</strong><small>{detail}</small></div></li>)}</ol>}
              {!tracking.branch && <EventPaymentPanel booking={booking} isStaff={isStaff} onChanged={loadBookings} />}
              {tracking.branch && String(booking.status).toLowerCase() === 'cancelled' && <EventPaymentPanel booking={booking} isStaff={isStaff} onChanged={loadBookings} />}
            </div>}
          </article>;
        })}</div>}
      </section>
    </>}

    {view === 'settings' && isStaff && <section className="event-admin-panel history-settings-panel">
      <div className="event-section-heading"><div><span className="event-section-kicker">Committee controls</span><h2>Availability settings</h2></div></div>
      <div className="admin-tools-grid">
        <form className="admin-tool-card" onSubmit={handleInventorySave}><div className="admin-tool-icon"><FaChair /></div><h3>Chair inventory</h3><p>Set the society’s actual chair count. Approved reservations are protected.</p><label htmlFor="inventory-count">Total chairs</label><input id="inventory-count" type="number" min="0" max="100000" value={inventoryDraft} onChange={event => setInventoryDraft(event.target.value)} required /><small>Current server value: {inventory?.totalChairs ?? '—'}</small><button type="submit" disabled={staffSaving}>Save inventory</button></form>
        <form className="admin-tool-card" onSubmit={handleBlockCreate}><div className="admin-tool-icon amber"><FaCalendarAlt /></div><h3>Close a common plot</h3><p>Block a plot during festivals, maintenance or society events.</p><div className="admin-inline-fields"><label>Plot<select value={blockForm.plotNumber} onChange={event => setBlockForm(current => ({ ...current, plotNumber: event.target.value }))}><option value="1">Plot 1</option><option value="2">Plot 2</option><option value="3">Plot 3</option></select></label><label>From<input type="date" min={localDate()} value={blockForm.startsOn} onChange={event => setBlockForm(current => ({ ...current, startsOn: event.target.value }))} required /></label><label>Until<input type="date" min={blockForm.startsOn || localDate()} value={blockForm.endsOn} onChange={event => setBlockForm(current => ({ ...current, endsOn: event.target.value }))} required /></label></div><label>Reason<input type="text" maxLength="1000" value={blockForm.reason} onChange={event => setBlockForm(current => ({ ...current, reason: event.target.value }))} required placeholder="Festival or maintenance" /></label><button type="submit" disabled={staffSaving}>Add closure</button></form>
      </div>
      {plotBlocks.length > 0 && <div className="plot-block-list">{plotBlocks.map(block => <div key={block.id}><span><strong>Plot {block.plotNumber}</strong><small>{formatBookingDate(block.startsAt)} – {formatBookingDate(block.endsAt)} · {block.reason}</small></span><button type="button" onClick={() => handleBlockDelete(block)}>Remove</button></div>)}</div>}
    </section>}
  </div>;
}
