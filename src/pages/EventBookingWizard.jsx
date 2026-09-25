import { createElement, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaArrowLeft, FaArrowRight, FaBan, FaCalendarAlt, FaChair, FaCheck, FaCheckCircle,
  FaClock, FaHistory, FaInfoCircle, FaLeaf, FaLightbulb, FaPhoneAlt, FaShieldAlt,
  FaSpinner, FaTint, FaTree, FaUsers, FaVolumeDown,
} from 'react-icons/fa';
import { getApiErrorMessage } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { createEventBooking, getEventAvailability, listEventBookings, quoteEventBooking } from '../services/eventBookings';
import './EventManagement.css';

const plotRates = {
  'Common Plot 1': { fullDay: 1500, halfDay: 1000 },
  'Common Plot 2': { fullDay: 2500, halfDay: 1500 },
  'Common Plot 3': { fullDay: 1500, halfDay: 1000 },
};
const chairEventTypes = {
  commonPrivate: { label: 'Private function at home or lane', rate: 3, purpose: 'PrivateFunction', hint: 'Birthday, Vastu or another private gathering' },
  society: { label: 'Common society event', rate: 0, purpose: 'SocietyEvent', hint: 'Committee events: free chairs, subject to approval' },
  emergency: { label: 'Emergency requirement', rate: 0, purpose: 'Emergency', hint: 'Unexpected or urgent community need' },
};
const plotPurposes = {
  PrivateFunction: 'Private function',
  SocietyEvent: 'Common society event',
  Emergency: 'Emergency requirement',
};
const steps = [
  { number: 1, label: 'Booking type', helper: 'Choose a resource' },
  { number: 2, label: 'Event details', helper: 'Date and availability' },
  { number: 3, label: 'Review', helper: 'Confirm and submit' },
];
const rules = [
  { icon: FaChair, text: 'Count chairs during collection and return them clean to designated storage.' },
  { icon: FaShieldAlt, text: 'The organizer is responsible for cleaning and any physical damage.' },
  { icon: FaVolumeDown, text: 'Follow noise permissions; after 11:00 PM, music must remain inside the home.' },
  { icon: FaTint, text: 'Use water and electricity responsibly and keep internal traffic access clear.' },
];
const formatCurrency = value => Number(value) === 0 ? 'Free' : `₹${Number(value || 0).toLocaleString('en-IN')}`;
const validateSocietyQuote = (payload, quote) => {
  if (payload.purpose === 'SocietyEvent' && !['bookingCharge', 'deposit', 'totalDue'].every(field => quote?.[field] === 0)) {
    throw new Error('Society events must be free. The server pricing needs updating; your booking has not been submitted.');
  }
};
const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const bookingRange = (date, time, duration, bookingType, endDate, endTime) => {
  if (!date || !time) return null;
  const start = new Date(`${date}T${time}:00`);
  if (Number.isNaN(start.getTime())) return null;
  if (bookingType === 'chairs') {
    if (!endTime) return null;
    const end = new Date(`${endDate || date}T${endTime}:00`);
    if (Number.isNaN(end.getTime()) || end <= start) return null;
    return { startsAt: start.toISOString(), endsAt: end.toISOString() };
  }
  const hours = duration === 'fullDay' ? 24 : 12;
  return { startsAt: start.toISOString(), endsAt: new Date(start.getTime() + hours * 60 * 60 * 1000).toISOString() };
};

export default function EventBookingWizard() {
  const { user } = useContext(AuthContext);
  const [step, setStep] = useState(1);
  const [bookingType, setBookingType] = useState('plot');
  const [plotPurpose, setPlotPurpose] = useState('PrivateFunction');
  const [plot, setPlot] = useState('Common Plot 2');
  const [duration, setDuration] = useState('fullDay');
  const [chairType, setChairType] = useState('commonPrivate');
  const [chairCount, setChairCount] = useState(0);
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('18:00');
  const [eventName, setEventName] = useState('');
  const [houseNumber, setHouseNumber] = useState(() => user?.flatNo && user.flatNo !== 'N/A' ? String(user.flatNo) : '');
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [quote, setQuote] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedBooking, setSubmittedBooking] = useState(null);
  const [apiStatus, setApiStatus] = useState('checking');
  const [apiError, setApiError] = useState('');

  const selectedChairType = chairEventTypes[chairType];
  const range = useMemo(() => bookingRange(date, startTime, duration, bookingType, endDate, endTime), [date, startTime, duration, bookingType, endDate, endTime]);
  const chairLimitExceeded = Number(chairCount) > 50;
  const payload = useMemo(() => ({
    title: eventName.trim() || 'Event booking',
    purpose: bookingType === 'plot' ? plotPurpose : selectedChairType.purpose,
    location: bookingType === 'plot' ? 'CommonPlot' : 'House',
    locationDetails: bookingType === 'plot'
      ? `House ${houseNumber.trim()} · ${plot}`
      : `House ${houseNumber.trim()}`,
    plotNumber: bookingType === 'plot' ? Number(plot.slice(-1)) : null,
    startsAt: range?.startsAt,
    endsAt: range?.endsAt,
    chairQuantity: Number(chairCount) || 0,
    acceptRules: true,
  }), [eventName, bookingType, plotPurpose, selectedChairType.purpose, houseNumber, plot, range, chairCount]);

  useEffect(() => {
    if (!houseNumber && user?.flatNo && user.flatNo !== 'N/A') setHouseNumber(String(user.flatNo));
  }, [houseNumber, user?.flatNo]);

  const checkApi = useCallback(async () => {
    setApiStatus('checking');
    try {
      await listEventBookings({ pageSize: 1 });
      setApiStatus('available');
      setApiError('');
    } catch (error) {
      const missing = error?.response?.status === 404;
      setApiStatus(missing ? 'unavailable' : 'error');
      setApiError(missing ? 'The connected server does not have the Event Booking API installed yet.' : getApiErrorMessage(error, 'Could not connect to the Event Booking API.'));
    }
  }, []);
  useEffect(() => { checkApi(); }, [checkApi]);

  useEffect(() => {
    setAvailability(null);
    setQuote(null);
    if (step < 2 || !range || apiStatus !== 'available' || chairLimitExceeded) return undefined;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setAvailabilityLoading(true);
      try {
        const [availabilityResult, quoteResult] = await Promise.all([
          getEventAvailability(range.startsAt, range.endsAt, controller.signal),
          quoteEventBooking(payload, controller.signal),
        ]);
        if (controller.signal.aborted) return;
        validateSocietyQuote(payload, quoteResult);
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
  }, [step, range, apiStatus, bookingType, payload, chairLimitExceeded]);

  const isSocietyEvent = payload.purpose === 'SocietyEvent';
  const estimatedAmount = isSocietyEvent ? 0 : bookingType === 'plot' ? plotRates[plot][duration] : selectedChairType.rate * (Number(chairCount) || 0);
  const amount = Number(quote?.bookingCharge ?? estimatedAmount);
  const deposit = Number(quote?.deposit ?? (bookingType === 'plot' && !isSocietyEvent ? 2000 : 0));
  const plotUnavailable = bookingType === 'plot' && availability?.availablePlots && !availability.availablePlots.includes(Number(plot.slice(-1)));
  const chairsUnavailable = availability && Number(chairCount) > availability.availableChairs;

  const goToDetails = () => {
    if (bookingType === 'chairs' && Number(chairCount) < 1) return toast.error('Enter at least one chair.');
    if (chairLimitExceeded) return toast.error('A maximum of 50 chairs can be booked.');
    setStep(2);
  };
  const goToReview = () => {
    if (!eventName.trim() || !date || !startTime) return toast.error('Enter the event name, date and start time.');
    if (!houseNumber.trim()) return toast.error('Enter your house number.');
    if (chairLimitExceeded) return toast.error('A maximum of 50 chairs can be booked.');
    if (bookingType === 'chairs' && !range) return toast.error('Enter an end date and time after the chair booking starts.');
    if (!availability) return toast.error('Wait for live availability to be confirmed.');
    if (plotUnavailable) return toast.error(`${plot} is not available for this time.`);
    if (chairsUnavailable) return toast.error(`Only ${availability.availableChairs} chairs are available for this time.`);
    if (availabilityLoading) return toast.info('Please wait while availability is checked.');
    setStep(3);
  };
  const handleSubmit = async event => {
    event.preventDefault();
    if (step !== 3 || apiStatus !== 'available') return;
    if (chairLimitExceeded) return toast.error('A maximum of 50 chairs can be booked.');
    setSubmitting(true);
    try {
      if (isSocietyEvent) validateSocietyQuote(payload, await quoteEventBooking(payload));
      const created = await createEventBooking({ ...payload, acceptRules: rulesAccepted });
      setSubmittedBooking(created);
      toast.success('Booking request submitted for committee review.');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not submit the booking request.'));
    } finally { setSubmitting(false); }
  };
  const startAnother = () => {
    setSubmittedBooking(null); setStep(1); setEventName(''); setDate(''); setEndDate(''); setRulesAccepted(false);
  };

  return <div className="event-management-screen event-wizard-screen">
    <section className="event-hero event-hero-compact" aria-labelledby="event-page-title">
      <div className="event-hero-copy">
        <span className="event-eyebrow"><FaLeaf /> Community celebrations, made simple</span>
        <h1 id="event-page-title">Plan your next gathering</h1>
        <p>Book a common plot or society chairs in three simple steps.</p>
        <Link className="event-hero-action secondary" to="/event-management/history"><FaHistory /> View booking history</Link>
      </div>
      <div className="event-hero-art" aria-hidden="true"><span className="event-sun" /><span className="event-cloud cloud-one" /><span className="event-cloud cloud-two" /><div className="event-gazebo"><span /><span /><span /></div><FaTree className="event-tree tree-one" /><FaTree className="event-tree tree-two" /><div className="event-people"><FaUsers /></div></div>
    </section>

    {apiStatus !== 'available' && apiStatus !== 'checking' && <div className={`event-api-notice ${apiStatus === 'error' ? 'warning' : ''}`} role="alert"><FaInfoCircle /><div><strong>Event booking service is unavailable</strong><span>{apiError}</span></div><button type="button" onClick={checkApi}>Try again</button></div>}

    <nav className="booking-progress" aria-label="Booking progress">
      {steps.map(item => {
        const complete = step > item.number || submittedBooking;
        const active = step === item.number && !submittedBooking;
        return <button key={item.number} type="button" className={`${active ? 'active' : ''} ${complete ? 'complete' : ''}`} onClick={() => item.number < step && !submittedBooking && setStep(item.number)} disabled={item.number > step || Boolean(submittedBooking)} aria-current={active ? 'step' : undefined}><span className="progress-number">{complete ? <FaCheck /> : item.number}</span><span><strong>{item.label}</strong><small>{item.helper}</small></span></button>;
      })}
    </nav>

    <section className="wizard-card" aria-live="polite">
      {submittedBooking ? <div className="wizard-success"><span><FaCheckCircle /></span><p className="event-section-kicker">Request submitted</p><h2>Booking #{submittedBooking.id} is pending review</h2><p>The committee will confirm current availability before approval. Follow its status from booking history.</p><div><Link to="/event-management/history">View booking history <FaArrowRight /></Link><button type="button" onClick={startAnother}>Create another request</button></div></div> :
      <form onSubmit={handleSubmit}>
        {step === 1 && <div className="wizard-step-panel">
          <div className="wizard-heading"><span className="event-section-kicker">Step 1</span><h2>What would you like to book?</h2><p>Choose one option to get started.</p></div>
          <div className="event-type-switch">
            <button type="button" className={bookingType === 'plot' ? 'active' : ''} onClick={() => setBookingType('plot')}><span><FaTree /></span><span><strong>Common plot</strong><small>Space with utilities and chairs</small></span><FaCheckCircle className="selected-check" /></button>
            <button type="button" className={bookingType === 'chairs' ? 'active' : ''} onClick={() => { setBookingType('chairs'); if (Number(chairCount) < 1) setChairCount(1); }}><span><FaChair /></span><span><strong>Society chairs</strong><small>Chairs without a plot booking</small></span><FaCheckCircle className="selected-check" /></button>
          </div>
          {bookingType === 'plot' ? <>
            <div className="event-field plot-purpose-field"><label htmlFor="plot-purpose">Event purpose</label><select id="plot-purpose" value={plotPurpose} onChange={event => setPlotPurpose(event.target.value)}>{Object.entries(plotPurposes).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><small>Committee / society events: free common plot and chairs, with no deposit. Committee approval is required.</small></div>
            <fieldset><legend>Choose a plot</legend><div className="plot-options">{Object.entries(plotRates).map(([name, rates]) => <label key={name} className={plot === name ? 'selected' : ''}><input type="radio" name="plot" checked={plot === name} onChange={() => setPlot(name)} /><span className="plot-number">{name.slice(-1)}</span><span><strong>{name}</strong><small>{isSocietyEvent ? 'Free' : `From ${formatCurrency(rates.halfDay)}`}</small></span><FaCheckCircle /></label>)}</div></fieldset>
          </> :
          <div className="wizard-resource-fields">
            <div className="event-field"><label htmlFor="chair-event-type">Purpose</label><select id="chair-event-type" value={chairType} onChange={event => setChairType(event.target.value)}>{Object.entries(chairEventTypes).map(([key, item]) => <option value={key} key={key}>{item.label}</option>)}</select><small>{selectedChairType.hint}</small></div>
            <div className="event-field"><label htmlFor="chair-count">Number of chairs</label><input id="chair-count" type="number" min="1" max="50" value={chairCount} onChange={event => setChairCount(event.target.value)} aria-invalid={chairLimitExceeded} aria-describedby={chairLimitExceeded ? 'chair-count-error' : undefined} />{chairLimitExceeded ? <small id="chair-count-error" className="event-field-error" role="alert">Maximum 50 chairs are available.</small> : <small>Up to 50 society chairs</small>}</div>
          </div>}
          <div className="wizard-actions end"><button type="button" className="wizard-primary" onClick={goToDetails}>Continue to event details <FaArrowRight /></button></div>
        </div>}

        {step === 2 && <div className="wizard-step-panel">
          <div className="wizard-heading"><span className="event-section-kicker">Step 2</span><h2>When and where is your event?</h2><p>We’ll check availability and calculate the exact server price.</p></div>
          <div className="event-details-grid">
            <div className="event-field"><label htmlFor="event-house-number">House number</label><input id="event-house-number" type="text" maxLength="50" placeholder="e.g. A-12" value={houseNumber} onChange={event => setHouseNumber(event.target.value)} autoComplete="address-line1" /><small>Used to identify the resident making this booking.</small></div>
            <div className="event-field"><label htmlFor="event-name">Event name</label><input id="event-name" type="text" maxLength="150" placeholder="e.g. Birthday celebration" value={eventName} onChange={event => setEventName(event.target.value)} /></div>
            <div className="event-field"><label htmlFor="event-date">Event date</label><div className="event-input-icon"><FaCalendarAlt /><input id="event-date" type="date" min={localDate()} value={date} onChange={event => setDate(event.target.value)} /></div></div>
            <div className="event-field"><label htmlFor="event-time">Start time</label><div className="event-input-icon"><FaClock /><input id="event-time" type="time" value={startTime} onChange={event => setStartTime(event.target.value)} /></div></div>
            {bookingType === 'chairs' && <><div className="event-field"><label htmlFor="event-end-date">End date</label><div className="event-input-icon"><FaCalendarAlt /><input id="event-end-date" type="date" min={date || localDate()} value={endDate} onChange={event => setEndDate(event.target.value)} /></div><small>Leave blank for the same day.</small></div><div className="event-field"><label htmlFor="event-end-time">End time</label><div className="event-input-icon"><FaClock /><input id="event-end-time" type="time" value={endTime} onChange={event => setEndTime(event.target.value)} /></div></div></>}
          </div>
          {bookingType === 'plot' && <fieldset><legend>Duration</legend><div className="duration-options">
            <label className={duration === 'halfDay' ? 'selected' : ''}><input type="radio" name="duration" checked={duration === 'halfDay'} onChange={() => setDuration('halfDay')} /><span><strong>12 hours</strong><small>{formatCurrency(isSocietyEvent ? 0 : plotRates[plot].halfDay)}</small></span><FaCheckCircle /></label>
            <label className={duration === 'fullDay' ? 'selected' : ''}><input type="radio" name="duration" checked={duration === 'fullDay'} onChange={() => setDuration('fullDay')} /><span><strong>24 hours</strong><small>{formatCurrency(isSocietyEvent ? 0 : plotRates[plot].fullDay)}</small></span><span className="popular-pill">Popular</span><FaCheckCircle /></label>
          </div></fieldset>}
          <div className="wizard-resource-fields">
            <div className="event-field"><label htmlFor="requested-chairs">{bookingType === 'plot' ? 'Included chairs' : 'Requested chairs'}</label><input id="requested-chairs" type="number" min={bookingType === 'plot' ? 0 : 1} max="50" value={chairCount} onChange={event => setChairCount(event.target.value)} aria-invalid={chairLimitExceeded} aria-describedby={chairLimitExceeded ? 'requested-chairs-error' : undefined} />{chairLimitExceeded ? <small id="requested-chairs-error" className="event-field-error" role="alert">Maximum 50 chairs are available.</small> : <small>Society inventory: 50 chairs.</small>}</div>
          </div>
          {range && <div className={`availability-strip ${plotUnavailable || chairsUnavailable ? 'unavailable' : ''}`} role="status">{availabilityLoading ? <><FaSpinner className="spin" /> Checking live availability and pricing…</> : availability ? plotUnavailable ? <><FaInfoCircle /> {plot} is unavailable for this period.</> : chairsUnavailable ? <><FaInfoCircle /> Only {availability.availableChairs} chairs are available.</> : <><FaCheckCircle /> Available · {availability.availableChairs} chairs and {(availability.availablePlots || []).length} plots free</> : <><FaInfoCircle /> Complete the details to check availability.</>}</div>}
          <div className="wizard-actions"><button type="button" className="wizard-secondary" onClick={() => setStep(1)}><FaArrowLeft /> Back</button><button type="button" className="wizard-primary" onClick={goToReview} disabled={availabilityLoading}>Review booking <FaArrowRight /></button></div>
        </div>}

        {step === 3 && <div className="wizard-step-panel">
          <div className="wizard-heading"><span className="event-section-kicker">Step 3</span><h2>Review your booking</h2><p>Confirm the details and society rules before submitting.</p></div>
          <div className="wizard-review-grid">
            <div><small>Event</small><strong>{eventName}</strong><span>House {houseNumber} · {bookingType === 'plot' ? plotPurposes[plotPurpose] : selectedChairType.label}</span></div>
            <div><small>Resource</small><strong>{bookingType === 'plot' ? plot : `${chairCount} society chairs`}</strong><span>{bookingType === 'plot' ? `${chairCount} chairs included` : `For House ${houseNumber}`}</span></div>
            <div><small>Schedule</small><strong>{new Date(range.startsAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</strong><span>{bookingType === 'plot' ? `${new Date(range.startsAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} · ${duration === 'fullDay' ? '24 hours' : '12 hours'}` : `${new Date(range.startsAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })} – ${new Date(range.endsAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}`}</span></div>
          </div>
          <div className="booking-summary"><div><span>Booking charge</span><strong>{formatCurrency(amount)}</strong></div>{deposit > 0 && <div><span>Refundable deposit</span><strong>{formatCurrency(deposit)}</strong></div>}<div className="summary-total"><span>Server-quoted total</span><strong>{formatCurrency(quote?.totalDue ?? amount + deposit)}</strong></div></div>
          <div className="wizard-rules"><h3>Society rules</h3><div>{rules.map(({ icon, text }) => <p key={text}>{createElement(icon)}<span>{text}</span></p>)}</div><p className="firecracker-note"><FaInfoCircle /> Firecrackers are not permitted in common plots.</p></div>
          <label className="event-rules-check"><input type="checkbox" checked={rulesAccepted} onChange={event => setRulesAccepted(event.target.checked)} required /><span>I have read and accept the booking, cleanup, utilities, noise and damage rules.</span></label>
          <div className="wizard-actions"><button type="button" className="wizard-secondary" onClick={() => setStep(2)}><FaArrowLeft /> Back</button><button type="submit" className="wizard-primary" disabled={submitting || !rulesAccepted}>{submitting ? <><FaSpinner className="spin" /> Submitting…</> : <>Submit request <FaArrowRight /></>}</button></div>
        </div>}
      </form>}
    </section>

    <section className="booking-support-grid" aria-label="Booking information and contacts">
      <article className="booking-support-card included">
        <span className="support-card-icon"><FaLightbulb /></span>
        <div><span className="event-section-kicker">Included with plot booking</span><h2>Everything you need</h2></div>
        <ul><li><FaCheckCircle /> Water and electricity</li><li><FaCheckCircle /> Society chairs</li><li><FaCheckCircle /> Focus lights</li></ul>
        <p>These facilities are covered by the common-plot booking charge and remain subject to responsible use.</p>
      </article>

      <article className="booking-support-card contacts">
        <span className="support-card-icon"><FaPhoneAlt /></span>
        <div><span className="event-section-kicker">Bookings and queries</span><h2>Talk to the booking team</h2></div>
        <div className="support-contact-list">
          <a href="tel:9328427285"><span>Amitbhai</span><strong>93284 27285</strong></a>
          <a href="tel:9427469218"><span>Shitalbhai</span><strong>94274 69218</strong></a>
        </div>
        <p>Contact the committee for availability, deposit confirmation and practical arrangements.</p>
      </article>

      <article className="booking-support-card warning">
        <span className="support-card-icon"><FaBan /></span>
        <div><span className="event-section-kicker">Important safety rule</span><h2>No firecrackers</h2></div>
        <strong className="firecracker-warning">Firecrackers are strictly prohibited in the garden and all common-plot areas.</strong>
        <p>Please keep internal roads clear, protect landscaping and help maintain a safe celebration for every resident.</p>
      </article>
    </section>

    <details className="full-event-policy">
      <summary>
        <span><span className="event-section-kicker">Society policy</span><strong>Full booking, chair and refund rules</strong><small>Review availability, cleanup, deposit, noise and safety requirements.</small></span>
        <span className="policy-expand-label">View all rules</span>
      </summary>
      <div className="full-policy-content">
        <section>
          <h2>Booking and availability</h2>
          <ul>
            <li>Advance booking is mandatory before using a common plot or collecting society chairs.</li>
            <li>Chairs are issued first-come, first-served and remain subject to live availability.</li>
            <li>A plot booking is confirmed only after the applicable full deposit or payment is recorded by the committee.</li>
            <li>Society events may receive priority, and plots may be unavailable during festivals or committee arrangements.</li>
            <li>If multiple events need chairs on the same day, committee members will help resolve the conflict.</li>
          </ul>
        </section>
        <section>
          <h2>Chair care and responsibility</h2>
          <ul>
            <li>The person making the booking must count chairs at collection and return.</li>
            <li>Return chairs neat, clean and on time to the designated storage location.</li>
            <li>Private House or Lane functions cost ₹3 per chair; approved society events and emergencies are free.</li>
            <li>Chairs used with an approved common-plot booking are included in that plot booking.</li>
            <li>The organizer must pay for chair or property damage at actual repair or replacement cost.</li>
          </ul>
        </section>
        <section>
          <h2>Deposit, cleanup and refund</h2>
          <ul>
            <li>The ₹2,000 plot deposit is refundable subject to inspection. Committee / society events are free, with no plot charge, chair charge or deposit.</li>
            <li>The organizer has one day after the event to remove tents and chairs, clean the premises and vacate the plot.</li>
            <li>If cleanup is incomplete, the society may arrange cleaning and deduct the applicable expense from the deposit.</li>
            <li>The remaining deposit balance is returned after cleaning and damage checks are completed.</li>
            <li>Damage to common areas must be repaired or compensated by the organizer at actual cost.</li>
          </ul>
        </section>
        <section>
          <h2>Noise, utilities and safety</h2>
          <ul>
            <li>Keep internal society roads clear and ensure event parking does not obstruct traffic.</li>
            <li>Firecrackers are strictly prohibited in gardens and all society common plots.</li>
            <li>DJ or loud-music permissions must follow Gujarat Police, municipal and government requirements.</li>
            <li>The published society guideline specifies up to 45 dB and DJ use only until 11:00 PM; a half-speaker setup is advised.</li>
            <li>After 11:00 PM, music must move inside the resident’s home, not continue in the common plot.</li>
            <li>Keep sound reasonable and reduce it immediately if a resident complains.</li>
            <li>Use included water and electricity responsibly under the society’s fair-usage policy.</li>
          </ul>
        </section>
      </div>
      <footer><FaInfoCircle /> These guidelines were discussed and approved by majority at the society general meeting held on 16 May 2026. Contact a committee member before posting booking disputes in the common group.</footer>
    </details>
  </div>;
}
