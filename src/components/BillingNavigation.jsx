import { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { staffRole } from '../services/maintenance';

export default function BillingNavigation() {
  const { user } = useContext(AuthContext);
  const links = [['/my-bills', 'Bills'], ['/payment-history', 'Payment history']];
  if (staffRole(user)) links.push(['/payment-review', 'Payment review']);
  return <nav className="d-flex flex-wrap gap-2 mb-4" aria-label="Billing pages">
    {links.map(([to, label]) => <NavLink key={to} to={to} className={({ isActive }) => 'btn btn-sm rounded-pill px-3 ' + (isActive ? 'btn-primary' : 'btn-outline-secondary')}>{label}</NavLink>)}
  </nav>;
}
