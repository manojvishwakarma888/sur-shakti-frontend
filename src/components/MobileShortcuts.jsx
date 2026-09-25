import { Link } from 'react-router-dom';
import { FaUserPlus, FaFileInvoice, FaDownload, FaAddressBook, FaChartPie, FaBook, FaBell, FaSyncAlt } from 'react-icons/fa';

export default function MobileShortcuts({ admin = false, onAddResidents, onCreateBill, onExportDues, onRefresh, refreshing = false, exportDisabled = false }) {
  const items = admin ? [
    { label: 'Add residents', icon: FaUserPlus, tone: 'indigo', onClick: onAddResidents },
    { label: 'Create bill', icon: FaFileInvoice, tone: 'coral', onClick: onCreateBill },
    { label: 'Export dues', icon: FaDownload, tone: 'teal', onClick: onExportDues, disabled: exportDisabled },
  ] : [
    { to: '/directory', label: 'Contacts', icon: FaAddressBook, tone: 'indigo' },
    { to: '/notifications', label: 'Inbox', icon: FaBell, tone: 'coral' },
    { to: '/profile', label: 'My profile', icon: FaBook, FaBell, tone: 'teal' },
  ];
  items.push({ label: refreshing ? 'Refreshing' : 'Refresh', icon: FaSyncAlt, tone: 'amber', onClick: onRefresh, disabled: refreshing });
  return <nav className="mobile-shortcuts" aria-label="Dashboard shortcuts">
    {items.map(({ to, label, icon: Icon, tone, onClick, disabled }) => {
      const content = <><span className={'shortcut-icon tone-' + tone}><Icon aria-hidden="true" /></span><span>{label}</span></>;
      return to ? <Link key={tone} to={to}>{content}</Link> :
        <button key={tone} type="button" onClick={onClick} disabled={disabled}>{content}</button>;
    })}
  </nav>;
}

