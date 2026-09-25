import { createElement, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { AuthContext } from '../context/AuthContext';
import { getApiErrorMessage } from '../services/api';
import {
  cancelEventBooking,
  createEventBooking,
  createPlotBlock,
  deletePlotBlock,
  getEventAvailability,
  getEventInventory,
  listEventBookings,
  listPlotBlocks,
  quoteEventBooking,
  reviewEventBooking,
  updateEventInventory,
} from '../services/eventBookings';
import {
  FaArrowRight,
  FaCalendarAlt,
  FaChair,
  FaCheckCircle,
  FaClock,
  FaInfoCircle,
  FaLeaf,
  FaLightbulb,
  FaPhoneAlt,
  FaSpinner,
  FaShieldAlt,
  FaTint,
  FaTree,
  FaUsers,
  FaVolumeDown,
} from 'react-icons/fa';
import './EventManagement.css';

const plotRates = {
  'Common Plot 1': { fullDay: 1500, halfDay: 1000 },
  'Common Plot 2': { fullDay: 2500, halfDay: 1500 },
  'Common Plot 3': { fullDay: 1500, halfDay: 1000 },
};

const chairEventTypes = {
  commonPrivate: {
    label: 'Private function at home or lane',
    location: 'House / lane',
    rate: 3,
    hint: 'Birthday, Vastu or another private gathering outside a common plot',
  },
  society: {
    label: 'Common society event',
    location: 'House / lane',
    rate: 0,
    hint: 'Approved Ganpati, Navratri, Holi or society requirement',
  },
  emergency: {
    label: 'Emergency requirement',
    location: 'Any location',
    rate: 0,
    hint: 'Unexpected or urgent need',
  },
};

const bookingSteps = [
  'Choose the space, date and duration for your event.',
  'Submit the request and pay the applicable deposit.',
  'The committee confirms availability and your booking.',
];

const guidelines = [
  { icon: FaVolumeDown, title: 'Keep sound considerate', text: 'Follow DJ and music permissions. After 11:00 PM, use music inside your home only.' },
  { icon: FaTint, title: 'Use utilities responsibly', text: 'Water and electricity are included with the booking and must be used fairly.' },
  { icon: FaShieldAlt, title: 'Care for shared spaces', text: 'The host is responsible for cleaning and for the cost of any physical damage.' },
];

const formatCurrency = value => value === 0 ? 'Free' : `₹${value.toLocaleString('en-IN')}`;

const localDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const bookingRange = (date, time, duration) => {
  if (!date || !time) return null;
  const start = new Date(`${date}T${time}:00`);
  if (Number.isNaN(start.getTime())) return null;
  const hours = duration === 'fullDay' ? 24 : 12;
  return { startsAt: start.toISOString(), endsAt: new Date(start.getTime() + hours * 60 * 60 * 1000).toISOString() };
};

const formatBookingDate = value => value ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';

const statusClass = status => `status-${String(status || 'pending').toLowerCase()}`;

export default function EventManagement() {
  const { user } = useContext(AuthContext);
  const isStaff = ['admin', 'secretary'].includes(String(user?.role).toLowerCase());
  const [bookingType, setBookingType] = useState('plot');
  const [plot, setPlot] = useState('Common Plot 2');
  const [duration, setDuration] = useState('fullDay');
  const [chairType, setChairType] = useState('commonPrivate');
  const [chairLocation, setChairLocation] = useState('House');
  const [chairCount, setChairCount] = useState(50);
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [eventName, setEventName] = useState('');
  const [locationDetails, setLocationDetails] = useState('');
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [quote, setQuote] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedBooking, setSubmittedBooking] = useState(null);
  const [apiStatus, setApiStatus] = useState('checking');
  const [apiError, setApiError] = useState('');
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [actionId, setActionId] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [inventoryDraft, setInventoryDraft] = useState('');
  const [plotBlocks, setPlotBlocks] = useState([]);
  const [blockForm, setBlockForm] = useState({ plotNumber: 1, startsOn: '', endsOn: '', reason: '' });
  const [staffSaving, setStaffSaving] = useState(false);

  const today = localDate();
  const selectedChairType = chairEventTypes[chairType];
  const estimatedAmount = useMemo(() => {
    if (bookingType === 'plot') return plotRates[plot][duration];
    return selectedChairType.rate * Math.max(Number(chairCount) || 0, 0);
  }, [bookingType, plot, duration, selectedChairType.rate, chairCount]);
  const estimatedDeposit = bookingType === 'plot' ? 2000 : 0;
  const range = useMemo(() => bookingRange(date, startTime, duration), [date, startTime, duration]);

  const buildPayload = useCallback((acceptRules = rulesAccepted) => {
    const purpose = bookingType === 'plot' ? 'PrivateFunction' : {
      commonPrivate: 'PrivateFunction', society: 'SocietyEvent', emergency: 'Emergency', home: 'PrivateFunction',
    }[chairType];
    const location = bookingType === 'plot' ? 'CommonPlot' : chairType === 'emergency' ? 'Other' : chairLocation;
    return {
      title: eventName.trim() || 'Event booking',
      purpose,
      location,
      locationDetails: bookingType === 'plot' ? plot : locationDetails.trim(),
      plotNumber: bookingType === 'plot' ? Number(plot.slice(-1)) : null,
      startsAt: range?.startsAt,
      endsAt: range?.endsAt,
      chairQuantity: Number(chairCount) || 0,
      acceptRules,
    };
  }, [bookingType, chairType, chairLocation, eventName, locationDetails, plot, range, chairCount, rulesAccepted]);

  const loadBookings = useCallback(async () => {
    setBookingsLoading(true);
    try {
      setBookings(await listEventBookings(statusFilter ? { status: statusFilter } : {}));
      setApiStatus('available');
      setApiError('');
    } catch (error) {
      if (error?.response?.status === 404) {
        setApiStatus('unavailable');
        setApiError('The connected server does not have the Event Booking API installed yet. Deploy or restart the backend version that contains /api/event-bookings.');
        setBookings([]);
      } else {
        setApiStatus('error');
        setApiError(getApiErrorMessage(error, 'Could not connect to the Event Booking API.'));
        toast.error(getApiErrorMessage(error, 'Could not load event bookings.'));
      }
    } finally {
      setBookingsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (apiStatus === 'checking' || apiStatus === 'available') loadBookings();
  }, [loadBookings, apiStatus]);

  useEffect(() => {
    if (!range || apiStatus !== 'available') { setAvailability(null); setQuote(null); return undefined; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setAvailabilityLoading(true);
      try {
        const payload = buildPayload(true);
        const quoteReady = bookingType === 'plot' || Boolean(locationDetails.trim());
        const [availabilityResult, quoteResult] = await Promise.all([
          getEventAvailability(range.startsAt, range.endsAt, controller.signal),
          quoteReady ? quoteEventBooking(payload, controller.signal) : Promise.resolve(null),
        ]);
        setAvailability(availabilityResult);
        setQuote(quoteResult);
      } catch (error) {
        if (error?.code !== 'ERR_CANCELED') {
          setAvailability(null);
          setQuote(null);
          toast.error(getApiErrorMessage(error, 'Could not check availability and pricing.'));
        }
      } finally {
        if (!controller.signal.aborted) setAvailabilityLoading(false);
      }
    }, 350);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [range, buildPayload, apiStatus, bookingType, locationDetails]);

  useEffect(() => {
    if (!isStaff || apiStatus !== 'available') return;
    const startsAt = new Date().toISOString();
    const until = new Date();
    until.setMonth(until.getMonth() + 6);
    Promise.all([getEventInventory(), listPlotBlocks(startsAt, until.toISOString())])
      .then(([inventoryResult, blocksResult]) => {
        setInventory(inventoryResult);
        setInventoryDraft(String(inventoryResult?.totalChairs ?? 0));
        setPlotBlocks(blocksResult);
      })
      .catch(error => toast.error(getApiErrorMessage(error, 'Could not load event administration settings.')));
  }, [isStaff, apiStatus]);

  const amount = Number(quote?.bookingCharge ?? estimatedAmount);
  const deposit = Number(quote?.deposit ?? estimatedDeposit);
  const requestedPlot = Number(plot.slice(-1));
  const plotUnavailable = bookingType === 'plot' && availability?.availablePlots && !availability.availablePlots.includes(requestedPlot);
  const chairsUnavailable = availability && Number(chairCount) > availability.availableChairs;

  const handleSubmit = async event => {
    event.preventDefault();
    if (apiStatus !== 'available') return toast.error('Event Booking API is not available on the connected server.');
    if (!range) return toast.error('Choose a valid event date and start time.');
    if (plotUnavailable) return toast.error(`${plot} is not available for this time.`);
    if (chairsUnavailable) return toast.error(`Only ${availability.availableChairs} chairs are available for this time.`);
    setSubmitting(true);
    try {
      const created = await createEventBooking(buildPayload(true));
      setSubmittedBooking(created);
      toast.success('Booking request submitted for committee review.');
      await loadBookings();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not submit the booking request.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async booking => {
    const reason = window.prompt('Why are you cancelling this booking?');
    if (reason === null) return;
    setActionId(booking.id);
    try {
      await cancelEventBooking(booking.id, reason);
      toast.success('Booking cancelled.');
      await loadBookings();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not cancel the booking.'));
    } finally { setActionId(null); }
  };

  const handleReview = async (booking, approve) => {
    const reason = approve ? '' : window.prompt('Reason for rejection:');
    if (!approve && reason === null) return;
    const depositReceiptReference = approve && booking.plotNumber
      ? window.prompt('Enter the full deposit receipt reference:')
      : null;
    if (approve && booking.plotNumber && !depositReceiptReference) return;
    setActionId(booking.id);
    try {
      await reviewEventBooking(booking.id, { approve, reason: reason || null, depositReceiptReference });
      toast.success(approve ? 'Booking approved.' : 'Booking rejected.');
      await loadBookings();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not review the booking.'));
    } finally { setActionId(null); }
  };

  const handleInventorySave = async event => {
    event.preventDefault();
    setStaffSaving(true);
    try {
      const result = await updateEventInventory(Number(inventoryDraft));
      setInventory(result);
      setInventoryDraft(String(result.totalChairs));
      toast.success('Chair inventory updated.');
    } catch (error) { toast.error(getApiErrorMessage(error, 'Could not update chair inventory.')); }
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
    try {
      await deletePlotBlock(block.id);
      setPlotBlocks(current => current.filter(item => item.id !== block.id));
      toast.success('Plot closure removed.');
    } catch (error) { toast.error(getApiErrorMessage(error, 'Could not remove the plot closure.')); }
  };

  return (
    <div className="event-management-screen">
      <section className="event-hero" aria-labelledby="event-page-title">
        <div className="event-hero-copy">
          <span className="event-eyebrow"><FaLeaf aria-hidden="true" /> Community celebrations, made simple</span>
          <h1 id="event-page-title">Plan your next gathering</h1>
          <p>Reserve a common plot or request society chairs—all the rules, rates and contacts in one place.</p>
          <a className="event-hero-action" href="#booking-form">Start a booking <FaArrowRight aria-hidden="true" /></a>
        </div>
        <div className="event-hero-art" aria-hidden="true">
          <span className="event-sun" />
          <span className="event-cloud cloud-one" />
          <span className="event-cloud cloud-two" />
          <div className="event-gazebo"><span /><span /><span /></div>
          <FaTree className="event-tree tree-one" />
          <FaTree className="event-tree tree-two" />
          <div className="event-people"><FaUsers /></div>
        </div>
      </section>

      {apiStatus === 'unavailable' && (
        <div className="event-api-notice" role="alert">
          <FaInfoCircle /><div><strong>Event booking service is not deployed</strong><span>{apiError}</span></div>
        </div>
      )}
      {apiStatus === 'error' && (
        <div className="event-api-notice warning" role="alert">
          <FaInfoCircle /><div><strong>Event booking service could not be reached</strong><span>{apiError}</span></div>
          <button type="button" onClick={loadBookings}>Try again</button>
        </div>
      )}

      <section className="event-stats" aria-label="Booking highlights">
        <div><span className="event-stat-icon green"><FaCalendarAlt /></span><p><strong>Advance booking</strong><small>Required for every event</small></p></div>
        <div><span className="event-stat-icon amber">₹</span><p><strong>₹2,000 deposit</strong><small>Refundable after inspection</small></p></div>
        <div><span className="event-stat-icon blue"><FaChair /></span><p><strong>Chairs included</strong><small>With common plot booking</small></p></div>
        <div><span className="event-stat-icon coral"><FaClock /></span><p><strong>12 or 24 hours</strong><small>Choose what works for you</small></p></div>
      </section>

      <div className="event-layout">
        <main className="event-main-column">
          <section className="event-booking-card" id="booking-form" aria-labelledby="booking-heading">
            <div className="event-section-heading">
              <div><span className="event-section-kicker">New request</span><h2 id="booking-heading">What would you like to book?</h2></div>
              <span className="event-step-badge">Step 1 of 2</span>
            </div>

            <div className="event-type-switch" role="group" aria-label="Booking type">
              <button type="button" className={bookingType === 'plot' ? 'active' : ''} onClick={() => { setBookingType('plot'); setSubmittedBooking(null); }}>
                <span><FaTree /></span><span><strong>Common plot</strong><small>Space for your celebration</small></span><FaCheckCircle className="selected-check" />
              </button>
              <button type="button" className={bookingType === 'chairs' ? 'active' : ''} onClick={() => { setBookingType('chairs'); setSubmittedBooking(null); }}>
                <span><FaChair /></span><span><strong>Society chairs</strong><small>Request chairs for an event</small></span><FaCheckCircle className="selected-check" />
              </button>
            </div>

            <form className="event-form" onSubmit={handleSubmit}>
              {bookingType === 'plot' ? (
                <>
                  <fieldset>
                    <legend>Choose a plot</legend>
                    <div className="plot-options">
                      {Object.entries(plotRates).map(([name, rates]) => {
                        const plotNumber = Number(name.slice(-1));
                        const unavailable = availability?.availablePlots && !availability.availablePlots.includes(plotNumber);
                        return (
                        <label key={name} className={`${plot === name ? 'selected' : ''} ${unavailable ? 'unavailable' : ''}`}>
                          <input type="radio" name="plot" value={name} checked={plot === name} onChange={() => setPlot(name)} disabled={unavailable} />
                          <span className="plot-number">{name.slice(-1)}</span>
                          <span><strong>{name}</strong><small>{unavailable ? 'Unavailable' : `From ${formatCurrency(rates.halfDay)}`}</small></span>
                          <FaCheckCircle />
                        </label>
                      )})}
                    </div>
                  </fieldset>
                  <div className="event-field full-width">
                    <label htmlFor="plot-chair-count">Included chairs</label>
                    <input id="plot-chair-count" type="number" min="0" max="100000" value={chairCount} onChange={event => setChairCount(event.target.value)} />
                    <small>Enter 0 if you do not need society chairs. Availability is checked for the full booking period.</small>
                  </div>
                </>
              ) : (
                <>
                  <div className="event-field full-width">
                    <label htmlFor="chair-event-type">Purpose / event</label>
                    <select id="chair-event-type" value={chairType} onChange={event => setChairType(event.target.value)}>
                      {Object.entries(chairEventTypes).map(([key, item]) => <option value={key} key={key}>{item.label}</option>)}
                    </select>
                    <small>{selectedChairType.hint} · {selectedChairType.location}</small>
                  </div>
                  {chairType !== 'emergency' && (
                    <div className="event-field full-width">
                      <label htmlFor="chair-location">Location type</label>
                      <select id="chair-location" value={chairLocation} onChange={event => setChairLocation(event.target.value)}>
                        <option value="House">House</option><option value="Lane">Lane</option>
                      </select>
                    </div>
                  )}
                  <div className="chair-request-row">
                    <div className="event-field">
                      <label htmlFor="chair-count">Number of chairs</label>
                      <input id="chair-count" type="number" min="1" max="500" value={chairCount} onChange={event => setChairCount(event.target.value)} required />
                    </div>
                    <div className="chair-rate-card">
                      <span>Rate</span><strong>{selectedChairType.rate ? '₹3 per chair' : 'Free'}</strong><small>Subject to availability</small>
                    </div>
                  </div>
                </>
              )}

              <fieldset>
                <legend>Duration</legend>
                <div className="duration-options">
                  <label className={duration === 'halfDay' ? 'selected' : ''}>
                    <input type="radio" name="duration" value="halfDay" checked={duration === 'halfDay'} onChange={() => setDuration('halfDay')} />
                    <span><strong>12 hours</strong><small>{bookingType === 'plot' ? formatCurrency(plotRates[plot].halfDay) : 'Chair reservation window'}</small></span>
                    <FaCheckCircle />
                  </label>
                  <label className={duration === 'fullDay' ? 'selected' : ''}>
                    <input type="radio" name="duration" value="fullDay" checked={duration === 'fullDay'} onChange={() => setDuration('fullDay')} />
                    <span><strong>24 hours</strong><small>{bookingType === 'plot' ? formatCurrency(plotRates[plot].fullDay) : 'Chair reservation window'}</small></span>
                    <span className="popular-pill">Popular</span><FaCheckCircle />
                  </label>
                </div>
              </fieldset>

              <div className="event-details-grid">
                <div className="event-field">
                  <label htmlFor="event-name">Event name</label>
                  <input id="event-name" type="text" placeholder="e.g. Mehta family celebration" value={eventName} onChange={event => setEventName(event.target.value)} required />
                </div>
                <div className="event-field">
                  <label htmlFor="event-date">Event date</label>
                  <div className="event-input-icon"><FaCalendarAlt /><input id="event-date" type="date" min={today} value={date} onChange={event => setDate(event.target.value)} required /></div>
                </div>
                <div className="event-field">
                  <label htmlFor="event-start-time">Start time</label>
                  <div className="event-input-icon"><FaClock /><input id="event-start-time" type="time" value={startTime} onChange={event => setStartTime(event.target.value)} required /></div>
                </div>
              </div>

              {bookingType === 'chairs' && (
                <div className="event-field full-width">
                  <label htmlFor="location-details">Location details</label>
                  <input id="location-details" type="text" maxLength="300" placeholder={chairType === 'emergency' ? 'Describe the emergency delivery location' : 'Row house number or lane details'} value={locationDetails} onChange={event => setLocationDetails(event.target.value)} required />
                </div>
              )}

              {range && (
                <div className={`availability-strip ${plotUnavailable || chairsUnavailable ? 'unavailable' : ''}`} role="status">
                  {availabilityLoading ? <><FaSpinner className="spin" /> Checking live availability and pricing…</> : availability ? (
                    plotUnavailable ? <><FaInfoCircle /> {plot} is unavailable for this period.</> : chairsUnavailable ? <><FaInfoCircle /> Only {availability.availableChairs} chairs are available.</> :
                      <><FaCheckCircle /> Available · {availability.availableChairs} chairs and {(availability.availablePlots || []).length} plots free</>
                  ) : <><FaInfoCircle /> Live availability could not be confirmed.</>}
                </div>
              )}

              <div className="booking-summary">
                <div><span>{bookingType === 'plot' ? `${plot} · ${duration === 'fullDay' ? '24 hours' : '12 hours'}` : `${chairCount || 0} chairs · ${selectedChairType.location}`}</span><strong>{formatCurrency(amount)}</strong></div>
                {deposit > 0 && <div><span>Refundable deposit</span><strong>{formatCurrency(deposit)}</strong></div>}
                <div className="summary-total"><span>{quote ? 'Server quote' : 'Estimated total'}</span><strong>{formatCurrency(Number(quote?.totalDue ?? amount + deposit))}</strong></div>
              </div>

              <label className="event-rules-check"><input type="checkbox" checked={rulesAccepted} onChange={event => setRulesAccepted(event.target.checked)} required /><span>I accept the common plot, chair usage, cleanup and damage rules.</span></label>
              <button className="event-submit-button" type="submit" disabled={apiStatus !== 'available' || submitting || availabilityLoading || plotUnavailable || chairsUnavailable}>
                {submitting ? <><FaSpinner className="spin" /> Submitting request…</> : <>Submit booking request <FaArrowRight /></>}
              </button>
              <p className="event-form-note"><FaInfoCircle /> Your booking is confirmed only after payment and committee approval.</p>
            </form>

            {submittedBooking && (
              <div className="booking-ready" role="status">
                <FaCheckCircle />
                <div><strong>Request #{submittedBooking.id} submitted</strong><span>Status: {submittedBooking.status || 'Pending'} · The committee will review current availability before approval.</span></div>
              </div>
            )}
          </section>

          <section className="event-bookings-panel" aria-labelledby="bookings-heading">
            <div className="event-section-heading bookings-panel-heading">
              <div><span className="event-section-kicker">{isStaff ? 'Approval queue' : 'Your requests'}</span><h2 id="bookings-heading">{isStaff ? 'Event bookings' : 'My bookings'}</h2></div>
              <select aria-label="Filter bookings by status" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
                <option value="">All statuses</option><option value="Pending">Pending</option><option value="Approved">Approved</option><option value="Rejected">Rejected</option><option value="Cancelled">Cancelled</option>
              </select>
            </div>
            {apiStatus === 'unavailable' ? <div className="event-empty-state"><FaInfoCircle /><strong>Backend update required</strong><span>Bookings will appear after the Event Booking API is deployed.</span></div> : bookingsLoading ? <div className="bookings-loading"><FaSpinner className="spin" /> Loading bookings…</div> : bookings.length === 0 ? (
              <div className="event-empty-state"><FaCalendarAlt /><strong>No bookings found</strong><span>Your submitted requests will appear here.</span></div>
            ) : (
              <div className="booking-list">
                {bookings.map(booking => {
                  const canCancel = ['pending', 'approved'].includes(String(booking.status).toLowerCase()) && new Date(booking.startsAt) > new Date();
                  return <article className="booking-list-item" key={booking.id}>
                    <div className="booking-list-date"><strong>{new Date(booking.startsAt).getDate()}</strong><span>{new Date(booking.startsAt).toLocaleString('en-IN', { month: 'short' })}</span></div>
                    <div className="booking-list-content">
                      <div className="booking-list-title"><h3>{booking.title || 'Event booking'}</h3><span className={`booking-status ${statusClass(booking.status)}`}>{booking.status || 'Pending'}</span></div>
                      <p>{booking.plotNumber ? `Common Plot ${booking.plotNumber}` : `${booking.chairQuantity} chairs · ${booking.location}`}</p>
                      <small>{formatBookingDate(booking.startsAt)} – {formatBookingDate(booking.endsAt)} · {formatCurrency(Number(booking.bookingCharge) + Number(booking.deposit))}</small>
                      {booking.reviewReason && <span className="booking-reason"><FaInfoCircle /> {booking.reviewReason}</span>}
                    </div>
                    <div className="booking-list-actions">
                      {isStaff && String(booking.status).toLowerCase() === 'pending' && <>
                        <button type="button" className="approve" disabled={actionId === booking.id} onClick={() => handleReview(booking, true)}>Approve</button>
                        <button type="button" className="reject" disabled={actionId === booking.id} onClick={() => handleReview(booking, false)}>Reject</button>
                      </>}
                      {canCancel && <button type="button" className="cancel" disabled={actionId === booking.id} onClick={() => handleCancel(booking)}>Cancel</button>}
                    </div>
                  </article>;
                })}
              </div>
            )}
          </section>

          {isStaff && (
            <section className="event-admin-panel" aria-labelledby="event-admin-heading">
              <div className="event-section-heading"><div><span className="event-section-kicker">Committee controls</span><h2 id="event-admin-heading">Availability settings</h2></div></div>
              <div className="admin-tools-grid">
                <form className="admin-tool-card" onSubmit={handleInventorySave}>
                  <div className="admin-tool-icon"><FaChair /></div><h3>Chair inventory</h3><p>Set the society’s actual chair count. Approved reservations are protected.</p>
                  <label htmlFor="inventory-count">Total chairs</label>
                  <input id="inventory-count" type="number" min="0" max="100000" value={inventoryDraft} onChange={event => setInventoryDraft(event.target.value)} required />
                  <small>Current server value: {inventory?.totalChairs ?? '—'}</small>
                  <button type="submit" disabled={staffSaving}>Save inventory</button>
                </form>
                <form className="admin-tool-card" onSubmit={handleBlockCreate}>
                  <div className="admin-tool-icon amber"><FaCalendarAlt /></div><h3>Close a common plot</h3><p>Block a plot during festivals, maintenance or society events.</p>
                  <div className="admin-inline-fields">
                    <label>Plot<select value={blockForm.plotNumber} onChange={event => setBlockForm(current => ({ ...current, plotNumber: event.target.value }))}><option value="1">Plot 1</option><option value="2">Plot 2</option><option value="3">Plot 3</option></select></label>
                    <label>From<input type="date" min={today} value={blockForm.startsOn} onChange={event => setBlockForm(current => ({ ...current, startsOn: event.target.value }))} required /></label>
                    <label>Until<input type="date" min={blockForm.startsOn || today} value={blockForm.endsOn} onChange={event => setBlockForm(current => ({ ...current, endsOn: event.target.value }))} required /></label>
                  </div>
                  <label>Reason<input type="text" maxLength="1000" value={blockForm.reason} onChange={event => setBlockForm(current => ({ ...current, reason: event.target.value }))} required placeholder="Festival or maintenance" /></label>
                  <button type="submit" disabled={staffSaving}>Add closure</button>
                </form>
              </div>
              {plotBlocks.length > 0 && <div className="plot-block-list">
                {plotBlocks.map(block => <div key={block.id}><span><strong>Plot {block.plotNumber}</strong><small>{formatBookingDate(block.startsAt)} – {formatBookingDate(block.endsAt)} · {block.reason}</small></span><button type="button" onClick={() => handleBlockDelete(block)}>Remove</button></div>)}
              </div>}
            </section>
          )}

          <section className="event-guidelines" aria-labelledby="guidelines-heading">
            <div className="event-section-heading"><div><span className="event-section-kicker">Good to know</span><h2 id="guidelines-heading">Celebrate responsibly</h2></div></div>
            <div className="guideline-grid">
              {guidelines.map(({ icon, title, text }) => <article key={title}><span>{createElement(icon)}</span><h3>{title}</h3><p>{text}</p></article>)}
            </div>
          </section>
        </main>

        <aside className="event-sidebar" aria-label="Booking information">
          <section className="booking-process-card">
            <span className="event-section-kicker">How it works</span><h2>Simple booking process</h2>
            <ol>{bookingSteps.map((step, index) => <li key={step}><span>{index + 1}</span><p>{step}</p></li>)}</ol>
          </section>

          <section className="included-card">
            <div className="included-icon"><FaLightbulb /></div>
            <span className="event-section-kicker">Included with plots</span><h2>One booking, all essentials</h2>
            <ul><li><FaCheckCircle /> Water & electricity</li><li><FaCheckCircle /> Society chairs</li><li><FaCheckCircle /> Focus lights</li></ul>
            <p>These facilities are included in the same common plot booking amount.</p>
          </section>

          <section className="contact-card-event">
            <span className="event-section-kicker">Need help?</span><h2>Talk to the booking team</h2><p>For availability, payments and booking queries.</p>
            <a href="tel:9328427285"><span><FaPhoneAlt /></span><span><small>Amitbhai</small><strong>93284 27285</strong></span></a>
            <a href="tel:9427469218"><span><FaPhoneAlt /></span><span><small>Shitalbhai</small><strong>94274 69218</strong></span></a>
          </section>
        </aside>
      </div>

      <section className="event-policy-note">
        <FaInfoCircle /><div><strong>Before you book</strong><p>Firecrackers are prohibited in common plots. The host gets one day after the event to clean, remove tents and chairs, and vacate the plot. Plot availability may be limited during festivals or society events.</p></div>
      </section>
    </div>
  );
}
