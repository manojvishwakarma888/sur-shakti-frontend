import { useId, useState } from 'react';

export default function ExpandableText({ text = '', limit = 280 }) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const content = String(text);
  const long = content.length > limit;
  return <div className="readable-copy">
    <p id={id} className="card-text text-secondary" style={{ whiteSpace: 'pre-line' }}>{long && !expanded ? `${content.slice(0, limit).trimEnd()}…` : content}</p>
    {long && <button type="button" className="btn btn-link readable-copy-toggle" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(value => !value)}>{expanded ? 'Show less' : 'Read full notice'}<span aria-hidden="true">{expanded ? ' −' : ' +'}</span></button>}
  </div>;
}
