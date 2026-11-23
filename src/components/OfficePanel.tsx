import { useState } from 'react';
import type { Company, DiscoveredAgent, WorkRun } from '../types';
import { formatPollen } from '../lib/cost';

type Props = {
  company: Company;
  agent?: DiscoveredAgent;
  discovery: 'loading' | 'live' | 'fallback' | 'error';
  connected: boolean;
  runs: WorkRun[];
  progress: { label: string; index: number; total: number } | null;
  busy: boolean;
  error: string | null;
  onRun: (company: Company, orderId: string, mode: 'live' | 'demo') => void;
  onDecide: (run: WorkRun, decision: WorkRun['decision'], note?: string) => void;
  onConnect: () => void;
  onLease: (floor: number) => void;
};

export default function OfficePanel({ company, agent, discovery, connected, runs, progress, busy, error, onRun, onDecide, onConnect, onLease }: Props) {
  const [revisionFor, setRevisionFor] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const companyRuns = runs.filter((r) => r.companyId === company.id);
  const latest = companyRuns[0];

  return (
    <aside className="office" style={{ '--accent': company.accent, '--accent-soft': company.accentSoft } as React.CSSProperties} aria-label={`${company.name} office`}>
      <div className="office-head">
        <div className="office-glyph">{company.glyph}</div>
        <div>
          <p className="eyebrow">Floor {String(company.floor).padStart(2, '0')} · {company.sector}</p>
          <h2>{company.name}</h2>
        </div>
      </div>
      <p className="office-tagline">{company.tagline}</p>
      <p className="office-desc">{company.description}</p>

      <section className="office-block agent-block">
        <div className="block-title"><span>Agent on duty</span><span className={`pill ${discovery === 'live' ? 'pill-live' : 'pill-muted'}`}>{discovery === 'live' ? 'Live discovery' : discovery === 'loading' ? 'Discovering…' : discovery === 'error' ? 'Registry fallback' : 'Registry fallback'}</span></div>
        {agent ? (
          <>
            <strong>{agent.title}</strong>
            <p className="mono small">{agent.id}</p>
            <p className="small muted">Base: {agent.baseModel || 'managed agent'} · health: {agent.health}</p>
          </>
        ) : <p className="small muted">No published agents reachable. Demo mode still works; live runs are unavailable.</p>}
        <p className="small muted">Goal: {company.goal}</p>
      </section>

      <section className="office-block">
        <div className="block-title"><span>The crew</span></div>
        <ul className="crew">
          {company.crew.map((c) => (
            <li key={c.role}>
              <span className="crew-role">{c.role}</span>
              <strong>{c.name}</strong>
              <span className="small muted">{c.duty}</span>
              <span className="tool">{c.tool}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="office-block">
        <div className="block-title"><span>Work orders</span><span className="small muted">billed to your Pollen</span></div>
        <div className="orders">
          {company.orders.map((o) => (
            <article className="order" key={o.id}>
              <div className="order-top"><h4>{o.title}</h4><span className="small muted">~{o.minutes} min</span></div>
              <p className="small">{o.brief}</p>
              <div className="stage-list">
                {o.stages.map((s) => <span key={s.label} className="stage-chip">{s.label}</span>)}
              </div>
              <div className="order-actions">
                <button className="btn primary" disabled={!connected || busy || !agent} onClick={() => onRun(company, o.id, 'live')}>
                  {connected ? 'Run with my Pollen' : 'Connect to run'}
                </button>
                <button className="btn ghost" disabled={busy} onClick={() => onRun(company, o.id, 'demo')}>Run demo</button>
              </div>
            </article>
          ))}
        </div>
        {!connected && <button className="link" onClick={onConnect}>Connect your wallet →</button>}
      </section>

      {busy && progress && (
        <section className="office-block progress-block" aria-live="polite">
          <div className="block-title"><span>Agent at work</span><span className="small mono">{progress.index}/{progress.total}</span></div>
          <div className="progress-track"><div style={{ width: `${(progress.index / progress.total) * 100}%` }} /></div>
          <p className="small">{progress.label}… output appears when the run finishes.</p>
        </section>
      )}

      {error && <p className="error-box" role="alert">{error}</p>}

      {latest && (
        <section className="office-block deliverable">
          <div className="block-title">
            <span>Latest deliverable</span>
            <span className={`mode-badge ${latest.mode}`}>{latest.mode === 'demo' ? 'DEMO · no agent called' : 'LIVE · agent result'}</span>
          </div>
          <p className="small muted mono">
            {new Date(latest.startedAt).toLocaleString()} · {(latest.elapsedMs / 1000).toFixed(1)}s · {latest.usage.totalTokens.toLocaleString()} tokens · {formatPollen(latest.cost)} Pollen
          </p>
          <div className="decision-line">
            <span>Decision: <strong>{latest.decision}</strong></span>
            {latest.decision === 'pending' ? (
              <div className="decision-actions">
                <button className="btn small-btn approve" onClick={() => onDecide(latest, 'approved')}>Approve</button>
                <button className="btn small-btn" onClick={() => onDecide(latest, 'rejected')}>Reject</button>
                <button className="btn small-btn" onClick={() => setRevisionFor(revisionFor === latest.id ? null : latest.id)}>Request revision</button>
              </div>
            ) : null}
          </div>
          {revisionFor === latest.id && latest.decision === 'pending' && (
            <div className="revision">
              <label htmlFor="revision-note">What should the agent change?</label>
              <textarea id="revision-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Be specific: which section, what to add, what to remove." rows={3} />
              <button className="btn primary" disabled={!note.trim() || busy} onClick={() => { onDecide(latest, 'revision', note.trim()); setNote(''); setRevisionFor(null); }}>Send revision request</button>
            </div>
          )}
          {latest.decision === 'revision' && latest.revisionNote && <p className="small muted">Revision request: “{latest.revisionNote}”</p>}
          <pre className="output">{latest.deliverable}</pre>
        </section>
      )}

      <button className="lease-link" onClick={() => onLease(company.floor)}>Apply to rent this floor →</button>
    </aside>
  );
}
