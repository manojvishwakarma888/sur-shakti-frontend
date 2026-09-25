import { useEffect, useId, useRef, useState } from 'react';
import { FaCheck, FaGlobe } from 'react-icons/fa';
import { languages, setLanguage, t, useLanguage } from '../i18n/language';
import './LanguageSwitcher.css';

export default function LanguageSwitcher({ standalone = false }) {
  const language = useLanguage();
  const [open, setOpen] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const root = useRef(null);
  const trigger = useRef(null);
  const options = useRef([]);
  const menuId = useId();
  const dismiss = () => { setOpen(false); trigger.current?.focus(); };
  useEffect(() => {
    if (!open) return;
    options.current[languages.findIndex(item => item.code === language)]?.focus();
    const outside = event => { if (!root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open, language]);
  const keyboard = event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); dismiss(); return; }
    const current = options.current.indexOf(document.activeElement);
    const next = { ArrowDown: (current + 1) % languages.length, ArrowUp: (current + languages.length - 1) % languages.length, Home: 0, End: languages.length - 1 }[event.key];
    if (next !== undefined) { event.preventDefault(); options.current[next]?.focus(); }
  };
  return <div ref={root} className={`language-switcher${standalone ? ' language-switcher-standalone' : ''}`}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <button ref={trigger} type="button" className="language-trigger" aria-label={t('Change language')} title={t('Change language')}
      aria-haspopup="menu" aria-expanded={open} aria-controls={menuId} onClick={() => setOpen(value => !value)}
      onKeyDown={event => { if (['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); setOpen(true); } }}>
      <FaGlobe aria-hidden="true" /><span aria-hidden="true" className="language-code">{language.toUpperCase()}</span>
    </button>
    {open && <div className="language-panel" id={menuId} role="menu" aria-label={t('Choose your language')} onKeyDown={keyboard}>
      <p className="language-panel-title">{t('Choose your language')}</p>
      {languages.map((item, index) => <button ref={element => { options.current[index] = element; }} key={item.code}
        type="button" role="menuitemradio" aria-checked={language === item.code} tabIndex={language === item.code ? 0 : -1}
        onClick={() => { setLanguage(item.code); setAnnouncement(`${t('Language changed')}: ${item.label}`); dismiss(); }}>
        <span lang={item.code}>{item.label}</span><FaCheck aria-hidden="true" style={{ visibility: language === item.code ? 'visible' : 'hidden' }} />
      </button>)}
      <p className="language-panel-hint">{t('Saved on this device')}</p>
    </div>}
    <span className="visually-hidden" role="status" aria-live="polite">{announcement}</span>
  </div>;
}
