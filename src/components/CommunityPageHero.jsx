import {
  FaBell, FaBookOpen, FaBullhorn, FaChartPie, FaClipboardCheck,
  FaCreditCard, FaFileInvoiceDollar, FaHeadset, FaHome, FaReceipt,
  FaTree, FaUserCircle, FaUsers, FaWallet,
} from 'react-icons/fa';
import './CommunityPageHero.css';

const pages = {
  '/dashboard': { eyebrow: 'Your community at a glance', title: 'Welcome home', description: 'The latest from life at Sur Shakti Residency.', icon: FaHome, tone: 'home' },
  '/my-bills': { eyebrow: 'Your society account', title: 'Bills and payments', description: 'A clear view of your monthly maintenance.', icon: FaFileInvoiceDollar, tone: 'gold' },
  '/payment-history': { eyebrow: 'Your payment record', title: 'Every payment, in one place', description: 'Follow each payment from submission to receipt.', icon: FaReceipt, tone: 'blue' },
  '/payment-review': { eyebrow: 'Committee workspace', title: 'Review with confidence', description: 'Keep society payments moving.', icon: FaClipboardCheck, tone: 'gold' },
  '/maintenance': { eyebrow: 'Society accounts', title: 'A clearer view of the books', description: 'Keep account activity easy to follow.', icon: FaChartPie, tone: 'blue' },
  '/notifications': { eyebrow: 'Your community inbox', title: 'Stay in the loop', description: 'Society updates gathered in one place.', icon: FaBell, tone: 'coral' },
  '/notices': { eyebrow: 'Around the society', title: 'The community notice board', description: 'Catch up on what is happening nearby.', icon: FaBullhorn, tone: 'coral' },
  '/complaints': { eyebrow: 'Here to help', title: 'Help when you need it', description: 'Follow the issues that matter to you.', icon: FaHeadset, tone: 'blue' },
  '/directory': { eyebrow: 'People and places', title: 'Know your community', description: 'Find the people who make this place home.', icon: FaUsers, tone: 'home' },
  '/expenses': { eyebrow: 'Society spending', title: 'Every expense has a story', description: 'See where community funds go.', icon: FaWallet, tone: 'gold' },
  '/profile': { eyebrow: 'Your account', title: 'Make yourself at home', description: 'Your details and preferences in one place.', icon: FaUserCircle, tone: 'home' },
};

export default function CommunityPageHero({ pathname, title, description, eyebrow, children }) {
  const page = pages[pathname];
  if (!page) return null;
  const Icon = page.icon;
  const compact = ['/my-bills', '/payment-history', '/payment-review', '/maintenance', '/expenses'].includes(pathname);
  if (compact) return null;
  return <section className={`community-page-hero tone-${page.tone}`} aria-label={`${page.title} introduction`}>
    <div className="community-hero-copy"><span className="community-hero-eyebrow"><FaBookOpen aria-hidden="true" /> {eyebrow || page.eyebrow}</span><h1>{title || page.title}</h1><p>{description || page.description}</p>{children}</div>
    <div className="community-hero-art" aria-hidden="true"><span className="community-hero-sun" /><span className="community-hero-cloud cloud-a" /><span className="community-hero-cloud cloud-b" /><span className="community-hero-ground" /><span className="community-hero-house house-a" /><span className="community-hero-house house-b" /><FaTree className="community-hero-tree tree-a" /><FaTree className="community-hero-tree tree-b" /><span className="community-hero-feature"><Icon /></span><FaCreditCard className="community-hero-spark spark-a" /><FaBookOpen className="community-hero-spark spark-b" /></div>
  </section>;
}
