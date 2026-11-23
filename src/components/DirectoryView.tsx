import { useState } from 'react';
import type { Company, DiscoveredAgent } from '../types';

export default function DirectoryView({ companies, agents, onSelect, onLease }: {
  companies: Company[];
  agents: DiscoveredAgent[];
  onSelect: (floor: number) => void;
  onLease: (floor: number) => void;
}) {
  const [query, setQuery] = useState('');
  const filtered = companies.filter((c) =>
    `${c.name} ${c.sector} ${c.tagline}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <section className="page">
      <header className="page-head">
        <div><p className="eyebrow">Tenant register</p><h1>Company directory</h1></div>
        <p className="page-sub">Six companies, one building. Every floor runs on a real published Pollinations agent.</p>
      </header>
      <label className="search">
        <span className="sr-only">Search companies</span>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, sector or promise" />
      </label>
      <div className="directory-grid">
        {filtered.map((c) => {
          const agent = c.preferredAgents.map((id) => agents.find((a) => a.id === id)).find(Boolean) || agents[0];
          return (
            <article className="company-card" key={c.id} style={{ '--accent': c.accent, '--accent-soft': c.accentSoft } as React.CSSProperties}>
              <div className="card-top"><span className="floor-chip">F{String(c.floor).padStart(2, '0')}</span><span className="card-glyph">{c.glyph}</span></div>
              <h3>{c.name}</h3>
              <p className="card-sector">{c.sector}</p>
              <p className="card-tagline">{c.tagline}</p>
              <p className="small muted mono">{agent ? agent.title : 'Agent catalogue unavailable'}</p>
              <div className="card-actions">
                <button className="btn primary" onClick={() => onSelect(c.floor)}>Enter office</button>
                <button className="btn ghost" onClick={() => onLease(c.floor)}>Rent a floor</button>
              </div>
            </article>
          );
        })}
      </div>
      {filtered.length === 0 && <p className="empty">No companies match “{query}”.</p>}
    </section>
  );
}
