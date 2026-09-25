import { useRef, useState } from 'react';
import { FaHandPointUp } from 'react-icons/fa';

export default function WidgetStack({ children, labels, label, className = '' }) {
  const row = useRef(null);
  const [active, setActive] = useState(0);
  const select = (index) => {
    const element = row.current;
    element.scrollTo({
      left: element.children[index].offsetLeft - element.children[0].offsetLeft,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  };
  const sync = () => {
    const element = row.current;
    const offsets = Array.from(element.children).map(child =>
      Math.abs(child.offsetLeft - element.children[0].offsetLeft - element.scrollLeft));
    setActive(offsets.indexOf(Math.min(...offsets)));
  };
  return <div className="widget-stack">
    <div ref={row} className={'widget-stack-track ' + className} role="region" aria-label={label}
      tabIndex={0} onScroll={sync} onKeyDown={event => {
        if (event.target !== event.currentTarget || window.innerWidth >= 768) return;
        if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
          event.preventDefault();
          select(event.key === 'Home' ? 0 : event.key === 'End' ? labels.length - 1 :
            Math.max(0, Math.min(labels.length - 1, active + (event.key === 'ArrowRight' ? 1 : -1))));
        }
      }}>
      {children}
    </div>
    <div className="resident-widget-navigation" aria-label="Choose dashboard widget">
      <span className="small text-muted"><FaHandPointUp aria-hidden="true" /> Swipe</span>
      <div className="d-flex">{labels.map((name, index) =>
        <button key={name} type="button" className="resident-widget-dot" aria-label={name}
          aria-current={active === index ? 'true' : undefined} onClick={() => select(index)}><span /></button>
      )}</div>
      <span className="small text-muted" aria-live="polite">{active + 1} / {labels.length}</span>
    </div>
  </div>;
}
