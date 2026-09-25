import MobileProfileMenu from './MobileProfileMenu';
import BrandLogo from './BrandLogo';
import { useState, useContext, useEffect, useRef } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { FaChevronLeft, FaChevronRight, FaThLarge, FaFileInvoiceDollar, FaBullhorn, FaHeadset } from 'react-icons/fa';
import ThemeToggle from './ThemeToggle';
import CommunityPageHero from './CommunityPageHero';
import './PageExperience.css';
import './FreshExperience.css';
import { AuthContext } from '../context/AuthContext';

const destinations = [
  { to: '/dashboard', icon: FaThLarge, label: 'Home' },
  { to: '/my-bills', icon: FaFileInvoiceDollar, label: 'Bills' },
  { to: '/notices', icon: FaBullhorn, label: 'Notices' },
  { to: '/complaints', icon: FaHeadset, label: 'Help' },
];
const titles = { '/maintenance': 'Maintenance accounts', '/notifications': 'Notifications', '/dashboard': 'Home', '/my-bills': 'Bills', '/payment-history': 'Payment history', '/payment-review': 'Payment review', '/notices': 'Notice board',
  '/complaints': 'Helpdesk', '/directory': 'Community directory', '/expenses': 'Society expenses', '/profile': 'Your profile', '/event-management': 'Event management', '/event-management/history': 'Booking history' };
function BottomLink({ destination, onClick }) {
  const Icon = destination.icon;
  return <NavLink to={destination.to} onClick={onClick} className={({ isActive }) => isActive ? 'active' : ''}>
    <span className="mobile-nav-icon"><Icon aria-hidden="true" /></span>
    <span className="mobile-nav-label">{destination.label}</span>
  </NavLink>;
}

export default function Layout() {
  const { user } = useContext(AuthContext);
  const { pathname } = useLocation();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const menuButton = useRef(null);
  const pageContent = useRef(null);
  const [desktopCollapsed, setDesktopCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar-collapsed') === 'true'; } catch { return false; }
  });
  const toggleDesktopSidebar = () => {
    setDesktopCollapsed(value => {
      try { localStorage.setItem('sidebar-collapsed', String(!value)); } catch { /* Storage may be unavailable. */ }
      return !value;
    });
  };

  useEffect(() => {
    if (!isSidebarOpen) return;
    const sidebar = document.getElementById('app-sidebar');
    const media = window.matchMedia('(max-width: 767.98px)');
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    Array.from(sidebar.querySelectorAll('button, a')).find(item => item.getClientRects().length)?.focus();
    const onResize = () => { if (!media.matches) setSidebarOpen(false); };
    const onKeyDown = event => {
      if (event.key === 'Escape') setSidebarOpen(false);
      if (event.key !== 'Tab') return;
      const items = [...sidebar.querySelectorAll('a[href], button:not([disabled])')].filter(item => item.getClientRects().length);
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    media.addEventListener('change', onResize);
    const trigger = menuButton.current;
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKeyDown);
      media.removeEventListener('change', onResize);
      trigger?.focus();
    };
  }, [isSidebarOpen]);

  return (
    <div className={'d-flex position-relative app-shell' + (pathname.startsWith('/event-management') ? '' : ' fresh-shell') + (desktopCollapsed ? ' desktop-sidebar-collapsed' : '')}>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <div className={'sidebar-overlay ' + (isSidebarOpen ? 'active' : '')} aria-hidden="true" onClick={() => setSidebarOpen(false)} />
      <Sidebar isOpen={isSidebarOpen} toggle={() => setSidebarOpen(false)} />
      <div className="flex-grow-1 main-content" inert={isSidebarOpen ? true : undefined}>
        <header className="app-header">
          <button type="button" className="desktop-sidebar-toggle d-none d-md-inline-flex"
            aria-label={desktopCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-controls="app-sidebar"
            aria-expanded={!desktopCollapsed} onClick={toggleDesktopSidebar}>
            {desktopCollapsed ? <FaChevronRight aria-hidden="true" /> : <FaChevronLeft aria-hidden="true" />}
          </button>
          <MobileProfileMenu />
          <div className="app-identity">
          <Link to="/dashboard" className="brand-home-link" aria-label="Go to home">
          <BrandLogo size={44} />
          </Link>
          <div className="app-header-title">
            <span className="app-brand"><span>Sur Shakti</span><span className="app-brand-subtitle">Connect</span></span>
            <span className="fw-bold">{titles[pathname] || 'Sur Shakti Connect'}</span>
          </div>
          </div>
          <span className="d-none d-md-block text-muted small ms-auto">Welcome, {user?.fullName || 'Resident'}</span>
          <ThemeToggle />
        </header>
        <button ref={menuButton} type="button" className="mobile-drawer-trigger d-md-none"
          aria-label="Open navigation" title="Open all menus" aria-controls="app-sidebar"
          aria-expanded={isSidebarOpen} onClick={() => setSidebarOpen(true)}>
          <FaChevronLeft aria-hidden="true" />
        </button>
        <main ref={pageContent} id="main-content" tabIndex={-1} className={`p-3 p-md-4 app-page${pathname.startsWith('/event-management') ? '' : ' refined-page'}`}>
          {pathname === '/dashboard' && ['Admin', 'Secretary'].includes(user?.role) && <CommunityPageHero pathname={pathname} />}
          <Outlet />
        </main>
      </div>
      <nav className="mobile-bottom-nav" aria-label="Main navigation" inert={isSidebarOpen ? true : undefined}>
        {destinations.map(destination => <BottomLink key={destination.to} destination={destination} onClick={() => setSidebarOpen(false)} />)}
      </nav>
    </div>
  );
}
