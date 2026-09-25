import { t as uiText, useLanguage, getLocale } from '../i18n/language.js';
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
const formatCurrency = value => Number(value) === 0 ? uiText('Free') : `₹${Number(value || 0).toLocaleString('en-IN')}`;
const validateSocietyQuote = (payload, quote) => {
  if (payload.purpose === 'SocietyEvent' && !['bookingCharge', 'deposit', 'totalDue'].every(field => quote?.[field] === 0)) {
    throw new Error(uiText('Society events must be free. The server pricing needs updating; your booking has not been submitted.'));
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
  useLanguage();
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
    if (bookingType === 'chairs' && Number(chairCount) < 1) return toast.error(uiText("Enter at least one chair."));
    if (chairLimitExceeded) return toast.error(uiText("A maximum of 50 chairs can be booked."));
    setStep(2);
  };
  const goToReview = () => {
    if (!eventName.trim() || !date || !startTime) return toast.error(uiText("Enter the event name, date and start time."));
    if (!houseNumber.trim()) return toast.error(uiText("Enter your house number."));
    if (chairLimitExceeded) return toast.error(uiText("A maximum of 50 chairs can be booked."));
    if (bookingType === 'chairs' && !range) return toast.error(uiText("Enter an end date and time after the chair booking starts."));
    if (!availability) return toast.error(uiText("Wait for live availability to be confirmed."));
    if (plotUnavailable) return toast.error(uiText("{{v0}} is not available for this time.", { v0: plot }));
    if (chairsUnavailable) return toast.error(uiText("Only {{v0}} chairs are available for this time.", { v0: availability.availableChairs }));
    if (availabilityLoading) return toast.info(uiText("Please wait while availability is checked."));
    setStep(3);
  };
  const handleSubmit = async event => {
    event.preventDefault();
    if (step !== 3 || apiStatus !== 'available') return;
    if (chairLimitExceeded) return toast.error(uiText("A maximum of 50 chairs can be booked."));
    setSubmitting(true);
    try {
      if (isSocietyEvent) validateSocietyQuote(payload, await quoteEventBooking(payload));
      const created = await createEventBooking({ ...payload, acceptRules: rulesAccepted });
      setSubmittedBooking(created);
      toast.success(uiText("Booking request submitted for committee review."));
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
        <span className="event-eyebrow"><FaLeaf />{' ' + uiText("Community celebrations, made simple")}</span>
        <h1 id="event-page-title">{uiText("Plan your next gathering")}</h1>
        <p>{uiText("Book a common plot or society chairs in three simple steps.")}</p>
        <Link className="event-hero-action secondary" to="/event-management/history"><FaHistory />{' ' + uiText("View booking history")}</Link>
      </div>
      <div className="event-hero-art" aria-hidden="true"><span className="event-sun" /><span className="event-cloud cloud-one" /><span className="event-cloud cloud-two" /><div className="event-gazebo"><span /><span /><span /></div><FaTree className="event-tree tree-one" /><FaTree className="event-tree tree-two" /><div className="event-people"><FaUsers /></div></div>
    </section>

    {apiStatus !== 'available' && apiStatus !== 'checking' && <div className={`event-api-notice ${apiStatus === 'error' ? 'warning' : ''}`} role="alert"><FaInfoCircle /><div><strong>{uiText("Event booking service is unavailable")}</strong><span>{apiError}</span></div><button type="button" onClick={checkApi}>{uiText("Try again")}</button></div>}

    <nav className="booking-progress" aria-label={uiText("Booking progress")}>
      {steps.map(item => {
        const complete = step > item.number || submittedBooking;
        const active = step === item.number && !submittedBooking;
        return <button key={item.number} type="button" className={`${active ? 'active' : ''} ${complete ? 'complete' : ''}`} onClick={() => item.number < step && !submittedBooking && setStep(item.number)} disabled={item.number > step || Boolean(submittedBooking)} aria-current={active ? 'step' : undefined}><span className="progress-number">{complete ? <FaCheck /> : item.number}</span><span><strong>{uiText(item.label)}</strong><small>{uiText(item.helper)}</small></span></button>;
      })}
    </nav>

    <section className="wizard-card" aria-live="polite">
      {submittedBooking ? <div className="wizard-success"><span><FaCheckCircle /></span><p className="event-section-kicker">{uiText("Request submitted")}</p><h2>{uiText("Booking #")}{submittedBooking.id}{' ' + uiText("is pending review")}</h2><p>{uiText("The committee will confirm current availability before approval. Follow its status from booking history.")}</p><div><Link to="/event-management/history">{uiText("View booking history") + ' '}<FaArrowRight /></Link><button type="button" onClick={startAnother}>{uiText("Create another request")}</button></div></div> :
      <form onSubmit={handleSubmit}>
        {step === 1 && <div className="wizard-step-panel">
          <div className="wizard-heading"><span className="event-section-kicker">{uiText("Step 1")}</span><h2>{uiText("What would you like to book?")}</h2><p>{uiText("Choose one option to get started.")}</p></div>
          <div className="event-type-switch">
            <button type="button" className={bookingType === 'plot' ? 'active' : ''} onClick={() => setBookingType('plot')}><span><FaTree /></span><span><strong>{uiText("Common plot")}</strong><small>{uiText("Space with utilities and chairs")}</small></span><FaCheckCircle className="selected-check" /></button>
            <button type="button" className={bookingType === 'chairs' ? 'active' : ''} onClick={() => { setBookingType('chairs'); if (Number(chairCount) < 1) setChairCount(1); }}><span><FaChair /></span><span><strong>{uiText("Society chairs")}</strong><small>{uiText("Chairs without a plot booking")}</small></span><FaCheckCircle className="selected-check" /></button>
          </div>
          {bookingType === 'plot' ? <>
            <div className="event-field plot-purpose-field"><label htmlFor="plot-purpose">{uiText("Event purpose")}</label><select id="plot-purpose" value={plotPurpose} onChange={event => setPlotPurpose(event.target.value)}>{Object.entries(plotPurposes).map(([value, label]) => <option value={value} key={value}>{uiText(label)}</option>)}</select><small>{uiText("Committee / society events: free common plot and chairs, with no deposit. Committee approval is required.")}</small></div>
            <fieldset><legend>{uiText("Choose a plot")}</legend><div className="plot-options">{Object.entries(plotRates).map(([name, rates]) => <label key={name} className={plot === name ? 'selected' : ''}><input type="radio" name="plot" checked={plot === name} onChange={() => setPlot(name)} /><span className="plot-number">{name.slice(-1)}</span><span><strong>{uiText(name)}</strong><small>{isSocietyEvent ? uiText("Free") : uiText("From {{v0}}", { v0: formatCurrency(rates.halfDay) })}</small></span><FaCheckCircle /></label>)}</div></fieldset>
          </> :
          <div className="wizard-resource-fields">
            <div className="event-field"><label htmlFor="chair-event-type">{uiText("Purpose")}</label><select id="chair-event-type" value={chairType} onChange={event => setChairType(event.target.value)}>{Object.entries(chairEventTypes).map(([key, item]) => <option value={key} key={key}>{uiText(item.label)}</option>)}</select><small>{uiText(selectedChairType.hint)}</small></div>
            <div className="event-field"><label htmlFor="chair-count">{uiText("Number of chairs")}</label><input id="chair-count" type="number" min="1" max="50" value={chairCount} onChange={event => setChairCount(event.target.value)} aria-invalid={chairLimitExceeded} aria-describedby={chairLimitExceeded ? 'chair-count-error' : undefined} />{chairLimitExceeded ? <small id="chair-count-error" className="event-field-error" role="alert">{uiText("Maximum 50 chairs are available.")}</small> : <small>{uiText("Up to 50 society chairs")}</small>}</div>
          </div>}
          <div className="wizard-actions end"><button type="button" className="wizard-primary" onClick={goToDetails}>{uiText("Continue to event details") + ' '}<FaArrowRight /></button></div>
        </div>}

        {step === 2 && <div className="wizard-step-panel">
          <div className="wizard-heading"><span className="event-section-kicker">{uiText("Step 2")}</span><h2>{uiText("When and where is your event?")}</h2><p>{uiText("We’ll check availability and calculate the exact server price.")}</p></div>
          <div className="event-details-grid">
            <div className="event-field"><label htmlFor="event-house-number">{uiText("House number")}</label><input id="event-house-number" type="text" maxLength="50" placeholder="e.g. A-12" value={houseNumber} onChange={event => setHouseNumber(event.target.value)} autoComplete="address-line1" /><small>{uiText("Used to identify the resident making this booking.")}</small></div>
            <div className="event-field"><label htmlFor="event-name">{uiText("Event name")}</label><input id="event-name" type="text" maxLength="150" placeholder={uiText("e.g. Birthday celebration")} value={eventName} onChange={event => setEventName(event.target.value)} /></div>
            <div className="event-field"><label htmlFor="event-date">{uiText("Event date")}</label><div className="event-input-icon"><FaCalendarAlt /><input id="event-date" type="date" min={localDate()} value={date} onChange={event => setDate(event.target.value)} /></div></div>
            <div className="event-field"><label htmlFor="event-time">{uiText("Start time")}</label><div className="event-input-icon"><FaClock /><input id="event-time" type="time" value={startTime} onChange={event => setStartTime(event.target.value)} /></div></div>
            {bookingType === 'chairs' && <><div className="event-field"><label htmlFor="event-end-date">{uiText("End date")}</label><div className="event-input-icon"><FaCalendarAlt /><input id="event-end-date" type="date" min={date || localDate()} value={endDate} onChange={event => setEndDate(event.target.value)} /></div><small>{uiText("Leave blank for the same day.")}</small></div><div className="event-field"><label htmlFor="event-end-time">{uiText("End time")}</label><div className="event-input-icon"><FaClock /><input id="event-end-time" type="time" value={endTime} onChange={event => setEndTime(event.target.value)} /></div></div></>}
          </div>
          {bookingType === 'plot' && <fieldset><legend>{uiText("Duration")}</legend><div className="duration-options">
            <label className={duration === 'halfDay' ? 'selected' : ''}><input type="radio" name="duration" checked={duration === 'halfDay'} onChange={() => setDuration('halfDay')} /><span><strong>{uiText("12 hours")}</strong><small>{formatCurrency(isSocietyEvent ? 0 : plotRates[plot].halfDay)}</small></span><FaCheckCircle /></label>
            <label className={duration === 'fullDay' ? 'selected' : ''}><input type="radio" name="duration" checked={duration === 'fullDay'} onChange={() => setDuration('fullDay')} /><span><strong>{uiText("24 hours")}</strong><small>{formatCurrency(isSocietyEvent ? 0 : plotRates[plot].fullDay)}</small></span><span className="popular-pill">{uiText("Popular")}</span><FaCheckCircle /></label>
          </div></fieldset>}
          <div className="wizard-resource-fields">
            <div className="event-field"><label htmlFor="requested-chairs">{bookingType === 'plot' ? uiText("Included chairs") : uiText("Requested chairs")}</label><input id="requested-chairs" type="number" min={bookingType === 'plot' ? 0 : 1} max="50" value={chairCount} onChange={event => setChairCount(event.target.value)} aria-invalid={chairLimitExceeded} aria-describedby={chairLimitExceeded ? 'requested-chairs-error' : undefined} />{chairLimitExceeded ? <small id="requested-chairs-error" className="event-field-error" role="alert">{uiText("Maximum 50 chairs are available.")}</small> : <small>{uiText("Society inventory: 50 chairs.")}</small>}</div>
          </div>
          {range && <div className={`availability-strip ${plotUnavailable || chairsUnavailable ? 'unavailable' : ''}`} role="status">{availabilityLoading ? <><FaSpinner className="spin" />{' ' + uiText("Checking live availability and pricing…")}</> : availability ? plotUnavailable ? <><FaInfoCircle /> {plot}{' ' + uiText("is unavailable for this period.")}</> : chairsUnavailable ? <><FaInfoCircle />{' ' + uiText("Only") + ' '}{availability.availableChairs}{' ' + uiText("chairs are available.")}</> : <><FaCheckCircle />{' ' + uiText("Available ·") + ' '}{availability.availableChairs}{' ' + uiText("chairs and") + ' '}{(availability.availablePlots || []).length}{' ' + uiText("plots free")}</> : <><FaInfoCircle />{' ' + uiText("Complete the details to check availability.")}</>}</div>}
          <div className="wizard-actions"><button type="button" className="wizard-secondary" onClick={() => setStep(1)}><FaArrowLeft />{' ' + uiText("Back")}</button><button type="button" className="wizard-primary" onClick={goToReview} disabled={availabilityLoading}>{uiText("Review booking") + ' '}<FaArrowRight /></button></div>
        </div>}

        {step === 3 && <div className="wizard-step-panel">
          <div className="wizard-heading"><span className="event-section-kicker">{uiText("Step 3")}</span><h2>{uiText("Review your booking")}</h2><p>{uiText("Confirm the details and society rules before submitting.")}</p></div>
          <div className="wizard-review-grid">
            <div><small>{uiText("Event")}</small><strong>{eventName}</strong><span>{uiText("House") + ' '}{houseNumber} · {uiText(bookingType === 'plot' ? plotPurposes[plotPurpose] : selectedChairType.label)}</span></div>
            <div><small>{uiText("Resource")}</small><strong>{uiText(bookingType === 'plot' ? plot : uiText("{{v0}} society chairs", { v0: chairCount }))}</strong><span>{bookingType === 'plot' ? uiText("{{v0}} chairs included", { v0: chairCount }) : uiText("For House {{v0}}", { v0: houseNumber })}</span></div>
            <div><small>{uiText("Schedule")}</small><strong>{new Date(range.startsAt).toLocaleDateString(getLocale(), { dateStyle: 'medium' })}</strong><span>{bookingType === 'plot' ? `${new Date(range.startsAt).toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit' })} · ${uiText(duration === 'fullDay' ? '24 hours' : '12 hours')}` : `${new Date(range.startsAt).toLocaleString(getLocale(), { dateStyle: 'short', timeStyle: 'short' })} – ${new Date(range.endsAt).toLocaleString(getLocale(), { dateStyle: 'short', timeStyle: 'short' })}`}</span></div>
          </div>
          <div className="booking-summary"><div><span>{uiText("Booking charge")}</span><strong>{formatCurrency(amount)}</strong></div>{deposit > 0 && <div><span>{uiText("Refundable deposit")}</span><strong>{formatCurrency(deposit)}</strong></div>}<div className="summary-total"><span>{uiText("Server-quoted total")}</span><strong>{formatCurrency(quote?.totalDue ?? amount + deposit)}</strong></div></div>
          <div className="wizard-rules"><h3>{uiText("Society rules")}</h3><div>{rules.map(({ icon, text }) => <p key={text}>{createElement(icon)}<span>{uiText(text)}</span></p>)}</div><p className="firecracker-note"><FaInfoCircle />{' ' + uiText("Firecrackers are not permitted in common plots.")}</p></div>
          <label className="event-rules-check"><input type="checkbox" checked={rulesAccepted} onChange={event => setRulesAccepted(event.target.checked)} required /><span>{uiText("I have read and accept the booking, cleanup, utilities, noise and damage rules.")}</span></label>
          <div className="wizard-actions"><button type="button" className="wizard-secondary" onClick={() => setStep(2)}><FaArrowLeft />{' ' + uiText("Back")}</button><button type="submit" className="wizard-primary" disabled={submitting || !rulesAccepted}>{submitting ? <><FaSpinner className="spin" />{' ' + uiText("Submitting…")}</> : <>{uiText("Submit request") + ' '}<FaArrowRight /></>}</button></div>
        </div>}
      </form>}
    </section>

    <section className="booking-support-grid" aria-label={uiText("Booking information and contacts")}>
      <article className="booking-support-card included">
        <span className="support-card-icon"><FaLightbulb /></span>
        <div><span className="event-section-kicker">{uiText("Included with plot booking")}</span><h2>{uiText("Everything you need")}</h2></div>
        <ul><li><FaCheckCircle />{' ' + uiText("Water and electricity")}</li><li><FaCheckCircle />{' ' + uiText("Society chairs")}</li><li><FaCheckCircle />{' ' + uiText("Focus lights")}</li></ul>
        <p>{uiText("These facilities are covered by the common-plot booking charge and remain subject to responsible use.")}</p>
      </article>

      <article className="booking-support-card contacts">
        <span className="support-card-icon"><FaPhoneAlt /></span>
        <div><span className="event-section-kicker">{uiText("Bookings and queries")}</span><h2>{uiText("Talk to the booking team")}</h2></div>
        <div className="support-contact-list">
          <a href="tel:9328427285"><span>{uiText("Amitbhai")}</span><strong>93284 27285</strong></a>
          <a href="tel:9427469218"><span>{uiText("Shitalbhai")}</span><strong>94274 69218</strong></a>
        </div>
        <p>{uiText("Contact the committee for availability, deposit confirmation and practical arrangements.")}</p>
      </article>

      <article className="booking-support-card warning">
        <span className="support-card-icon"><FaBan /></span>
        <div><span className="event-section-kicker">{uiText("Important safety rule")}</span><h2>{uiText("No firecrackers")}</h2></div>
        <strong className="firecracker-warning">{uiText("Firecrackers are strictly prohibited in the garden and all common-plot areas.")}</strong>
        <p>{uiText("Please keep internal roads clear, protect landscaping and help maintain a safe celebration for every resident.")}</p>
      </article>
    </section>

    <details className="full-event-policy">
      <summary>
        <span><span className="event-section-kicker">{uiText("Society policy")}</span><strong>{uiText("Full booking, chair and refund rules")}</strong><small>{uiText("Review availability, cleanup, deposit, noise and safety requirements.")}</small></span>
        <span className="policy-expand-label">{uiText("View all rules")}</span>
      </summary>
      <div className="full-policy-content">
        <section>
          <h2>{uiText("Booking and availability")}</h2>
          <ul>
            <li>{uiText("Advance booking is mandatory before using a common plot or collecting society chairs.")}</li>
            <li>{uiText("Chairs are issued first-come, first-served and remain subject to live availability.")}</li>
            <li>{uiText("A plot booking is confirmed only after the applicable full deposit or payment is recorded by the committee.")}</li>
            <li>{uiText("Society events may receive priority, and plots may be unavailable during festivals or committee arrangements.")}</li>
            <li>{uiText("If multiple events need chairs on the same day, committee members will help resolve the conflict.")}</li>
          </ul>
        </section>
        <section>
          <h2>{uiText("Chair care and responsibility")}</h2>
          <ul>
            <li>{uiText("The person making the booking must count chairs at collection and return.")}</li>
            <li>{uiText("Return chairs neat, clean and on time to the designated storage location.")}</li>
            <li>{uiText("Private House or Lane functions cost ₹3 per chair; approved society events and emergencies are free.")}</li>
            <li>{uiText("Chairs used with an approved common-plot booking are included in that plot booking.")}</li>
            <li>{uiText("The organizer must pay for chair or property damage at actual repair or replacement cost.")}</li>
          </ul>
        </section>
        <section>
          <h2>{uiText("Deposit, cleanup and refund")}</h2>
          <ul>
            <li>{uiText("The ₹2,000 plot deposit is refundable subject to inspection. Committee / society events are free, with no plot charge, chair charge or deposit.")}</li>
            <li>{uiText("The organizer has one day after the event to remove tents and chairs, clean the premises and vacate the plot.")}</li>
            <li>{uiText("If cleanup is incomplete, the society may arrange cleaning and deduct the applicable expense from the deposit.")}</li>
            <li>{uiText("The remaining deposit balance is returned after cleaning and damage checks are completed.")}</li>
            <li>{uiText("Damage to common areas must be repaired or compensated by the organizer at actual cost.")}</li>
          </ul>
        </section>
        <section>
          <h2>{uiText("Noise, utilities and safety")}</h2>
          <ul>
            <li>{uiText("Keep internal society roads clear and ensure event parking does not obstruct traffic.")}</li>
            <li>{uiText("Firecrackers are strictly prohibited in gardens and all society common plots.")}</li>
            <li>{uiText("DJ or loud-music permissions must follow Gujarat Police, municipal and government requirements.")}</li>
            <li>{uiText("The published society guideline specifies up to 45 dB and DJ use only until 11:00 PM; a half-speaker setup is advised.")}</li>
            <li>{uiText("After 11:00 PM, music must move inside the resident’s home, not continue in the common plot.")}</li>
            <li>{uiText("Keep sound reasonable and reduce it immediately if a resident complains.")}</li>
            <li>{uiText("Use included water and electricity responsibly under the society’s fair-usage policy.")}</li>
          </ul>
        </section>
      </div>
      <footer><FaInfoCircle />{' ' + uiText("These guidelines were discussed and approved by majority at the society general meeting held on 16 May 2026. Contact a committee member before posting booking disputes in the common group.")}</footer>
    </details>
  </div>;
}
