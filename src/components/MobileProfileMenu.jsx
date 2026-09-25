import { t as uiText, useLanguage } from '../i18n/language.js';
import { useContext, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaUserCog, FaSignOutAlt } from 'react-icons/fa';
import { AuthContext } from '../context/AuthContext';

export default function MobileProfileMenu() {
  useLanguage();
  const { user, logout } = useContext(AuthContext);
  const name = String(user?.fullName || '').trim();
  const parts = name.split(/\s+/).filter(Boolean);
  const house = String(user?.flatNo || '').trim();
  const initials = name && name.toLowerCase() !== 'resident'
    ? (Array.from(parts[0])[0] + (parts.length > 1 ? Array.from(parts.at(-1))[0] : '')).toLocaleUpperCase()
    : house && house.toLowerCase() !== 'n/a' ? house : 'U';
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const trigger = useRef(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const dismiss = event => {
      if (!root.current?.contains(event.target)) setOpen(false);
    };
    const escape = event => {
      if (event.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    const media = window.matchMedia('(min-width: 768px)');
    const resize = () => { if (media.matches) setOpen(false); };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    media.addEventListener('change', resize);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', escape);
      media.removeEventListener('change', resize);
    };
  }, [open]);

  return <div ref={root} className="mobile-profile d-md-none"
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <button ref={trigger} type="button" className="mobile-profile-trigger icon-button"
      aria-label={uiText("Your account")} aria-expanded={open} aria-controls="mobile-account-panel"
      onClick={() => setOpen(value => !value)}><span className="mobile-profile-initials" title={name || house || uiText("Your account")} style={{ fontSize: initials.length > 4 ? '.6rem' : initials.length > 2 ? '.75rem' : '1rem' }}>{initials}</span></button>
    {open && <section id="mobile-account-panel" className="mobile-account-panel" aria-label={uiText("Your account")}>
      <div className="mobile-account-summary">
        <strong>{user?.fullName || uiText("Resident")}</strong>
        <small>{uiText(user?.role || uiText("Resident"))}{' ' + uiText("· Row house") + ' '}{user?.flatNo || 'N/A'}</small>
      </div>
      <Link to="/profile" onClick={() => setOpen(false)}><FaUserCog aria-hidden="true" />{uiText("My profile")}</Link>
      <button type="button" onClick={() => { setOpen(false); logout(); navigate('/login', { replace: true }); }}>
        <FaSignOutAlt aria-hidden="true" />{uiText("Sign out")}</button>
    </section>}
  </div>;
}

