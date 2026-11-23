import type { Company } from '../types';

export default function TowerFallback({ companies, selectedFloor, onSelect }: { companies: Company[]; selectedFloor: number; onSelect: (f: number) => void }) {
  return (
    <div className="tower-fallback" role="group" aria-label="Floor stack. 3D rendering is off.">
      <div className="fallback-beacon" />
      {[...companies].reverse().map((c) => (
        <button
          key={c.id}
          className={`fallback-floor ${c.floor === selectedFloor ? 'is-selected' : ''}`}
          style={{ '--tag': c.accent } as React.CSSProperties}
          onClick={() => onSelect(c.floor)}
          aria-current={c.floor === selectedFloor}
        >
          <span className="fallback-num">{String(c.floor).padStart(2, '0')}</span>
          <span className="fallback-name">{c.name}</span>
          <span className="fallback-sector">{c.sector}</span>
        </button>
      ))}
      <p className="fallback-note">Floor-stack view — same floors, no WebGL required.</p>
    </div>
  );
}
