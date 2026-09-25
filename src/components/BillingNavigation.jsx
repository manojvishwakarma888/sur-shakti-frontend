import { t as uiText, useLanguage } from '../i18n/language.js';
import { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { staffRole } from '../services/maintenance';

export default function BillingNavigation() {
  useLanguage();
  const { user } = useContext(AuthContext);
  const links = [['/my-bills', 'Bills'], ['/payment-history', 'Payment history']];
  if (staffRole(user)) links.push(['/payment-review', 'Payment review']);
  return <nav className="d-flex flex-wrap gap-2 mb-4" aria-label={uiText("Billing pages")}>
    {links.map(([to, label]) => <NavLink key={to} to={to} className={({ isActive }) => 'btn btn-sm rounded-pill px-3 ' + (isActive ? 'btn-primary' : 'btn-outline-secondary')}>{uiText(label)}</NavLink>)}
  </nav>;
}
