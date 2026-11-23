import type { LeaseApplication, WorkRun } from '../types';
import { formatPollen, sessionCost } from '../lib/cost';

export default function DashboardView({ connected, balance, runs, applications, onConnect, onGoFloor }: {
  connected: boolean;
  balance: { budget: number | null; account: number | null };
  runs: WorkRun[];
  applications: LeaseApplication[];
  onConnect: () => void;
  onGoFloor: (id: string) => void;
}) {
  const live = runs.filter((r) => r.mode === 'live');
  const pending = runs.filter((r) => r.decision === 'pending');
  return (
    <section className="page">
      <header className="page-head">
        <div><p className="eyebrow">Operator console</p><h1>Your dashboard</h1></div>
        <p className="page-sub">Everything you ran, spent and decided in this browser session.</p>
      </header>

      <div className="stat-grid">
        <div className="stat"><span>Wallet</span><strong>{connected ? 'Connected' : 'Not connected'}</strong><small>{connected ? `Budget ${formatPollen(balance.budget ?? 0)} · account ${formatPollen(balance.account ?? 0)}` : 'Your Pollen stays yours'}</small></div>
        <div className="stat"><span>Live runs</span><strong>{live.length}</strong><small>real agent calls</small></div>
        <div className="stat"><span>Spent this session</span><strong>{formatPollen(sessionCost(live))}</strong><small>Pollen, from usage reports</small></div>
        <div className="stat"><span>Awaiting decision</span><strong>{pending.length}</strong><small>approve / reject / revise</small></div>
      </div>

      {!connected && <div className="notice"><p>No wallet connected. Demos are labelled and never call the API. Live runs only start after you authorize a scoped key.</p><button className="btn primary" onClick={onConnect}>Connect with Pollinations Pay</button></div>}

      <section className="dash-section">
        <div className="block-title"><span>Run history</span><span className="small muted">{runs.length} total</span></div>
        {runs.length === 0 ? <p className="empty">No runs yet. Enter an office and try a work order.</p> : (
          <div className="run-list">
            {runs.map((r) => (
              <article key={r.id} className="run-row">
                <div><button className="link" onClick={() => onGoFloor(r.companyId)}>{r.companyId}</button><span className="small muted mono"> / {r.orderId}</span></div>
                <span className={`mode-badge ${r.mode}`}>{r.mode === 'demo' ? 'DEMO' : 'LIVE'}</span>
                <span className="small mono">{r.usage.totalTokens.toLocaleString()} tok</span>
                <span className="small mono">{formatPollen(r.cost)}</span>
                <span className={`decision-chip d-${r.decision}`}>{r.decision}</span>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="dash-section">
        <div className="block-title"><span>Office applications</span><span className="small muted">{applications.length} saved locally</span></div>
        {applications.length === 0 ? <p className="empty">No applications yet. Find a floor you like and apply.</p> : (
          <div className="run-list">
            {applications.map((a) => (
              <article key={a.id} className="run-row">
                <div><strong>{a.applicant}</strong><span className="small muted mono"> → F{String(a.floor).padStart(2, '0')} {a.companyName}</span></div>
                <span className="small muted">{a.email}</span>
                <span className="small muted">{new Date(a.createdAt).toLocaleDateString()}</span>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
