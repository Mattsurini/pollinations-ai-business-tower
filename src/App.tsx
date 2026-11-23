import { lazy, Suspense, useEffect, useState } from 'react';
import { companies, companyById, companyByFloor } from './data/companies';
import { addUsage, emptyUsage, estimateCost, formatPollen } from './lib/cost';
import { demoDeliverable } from './lib/demo';
import {
  ApiError, callAgent, consumeCallback, disconnect, discoverAgents, getBalance,
  getKey, resolveAgent, startConnect, verifyKey,
} from './lib/pollinations';
import { loadApplications, loadRuns, saveApplications, saveRuns } from './lib/storage';
import type { Company, DiscoveredAgent, LeaseApplication, RunStageResult, WorkOrder, WorkRun } from './types';
const Tower3D = lazy(() => import('./components/Tower3D'));
import TowerFallback from './components/TowerFallback';
import OfficePanel from './components/OfficePanel';
import DirectoryView from './components/DirectoryView';
import DashboardView from './components/DashboardView';
import LeaseView from './components/LeaseView';

type View = 'tower' | 'directory' | 'dashboard' | 'lease';
type Progress = { label: string; index: number; total: number };

const canWebGL = () => {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
};

export default function App() {
  const [view, setView] = useState<View>('tower');
  const [floor, setFloor] = useState(6);
  const [key, setKey] = useState<string | null>(null);
  const [agents, setAgents] = useState<DiscoveredAgent[]>([]);
  const [discovery, setDiscovery] = useState<'loading' | 'live' | 'fallback' | 'error'>('loading');
  const [balance, setBalance] = useState<{ budget: number | null; account: number | null }>({ budget: null, account: null });
  const [runs, setRuns] = useState<WorkRun[]>(() => loadRuns());
  const [applications, setApplications] = useState<LeaseApplication[]>(() => loadApplications());
  const [progress, setProgress] = useState<Progress | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [use3D, setUse3D] = useState(() => canWebGL() && !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [leasePreselect, setLeasePreselect] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cb = await consumeCallback();
        if (cancelled) return;
        if (cb.error) setError(cb.error);
        if (cb.key) setKey(cb.key);
        else {
          const existing = getKey();
          if (existing) {
            if (await verifyKey(existing)) setKey(existing);
            else { disconnect(); setError('Your previous Pollinations key expired or was revoked. Connect again to run live work.'); }
          }
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not restore your wallet session.');
      }
      try {
        const list = await discoverAgents();
        if (!cancelled) { setAgents(list); setDiscovery('live'); }
      } catch {
        if (!cancelled) setDiscovery('error');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!key) { setBalance({ budget: null, account: null }); return; }
    let cancelled = false;
    getBalance(key).then((b) => { if (!cancelled) setBalance(b); });
    return () => { cancelled = true; };
  }, [key]);

  useEffect(() => { saveRuns(runs); }, [runs]);
  useEffect(() => { saveApplications(applications); }, [applications]);

  const company = companyByFloor(floor) || companies[0];
  const agent = resolveAgent(company, agents);

  function enterFloor(n: number) { setFloor(n); setView('tower'); }

  function addRun(run: WorkRun) { setRuns((prev) => [run, ...prev]); }

  async function runWork(target: Company, order: WorkOrder, mode: 'live' | 'demo', revision?: { note: string; previous: string }) {
    if (busy) return;
    setError(null); setNotice(null);
    const startedAt = Date.now();
    const base = {
      id: crypto.randomUUID(), companyId: target.id, orderId: order.id,
      startedAt, decision: 'pending' as const, revisionNote: revision?.note,
    };

    if (mode === 'demo') {
      addRun({ ...base, mode: 'demo', agentId: 'demo', agentTitle: 'Demo preview',
        deliverable: demoDeliverable(target, order, revision?.note),
        stages: order.stages.map((s) => ({ label: s.label, output: 'SAMPLE — no agent was called.' })),
        usage: emptyUsage(), cost: 0, elapsedMs: 0 });
      setNotice('Demo run ready. No agent was called and nothing was charged.');
      return;
    }

    if (!key) { setError('Connect your Pollinations wallet before running live work. Demos remain available.'); return; }
    const chosen = resolveAgent(target, agents);
    if (!chosen) { setError('No published agents are reachable right now. Live runs are unavailable; use demo mode.'); return; }

    setBusy(true);
    try {
      const messages: { role: string; content: string }[] = [
        { role: 'system', content: `You are ${target.crew[0].name}, the ${target.crew[0].role} at ${target.name}. ${target.description} Your mission: ${target.goal} Work with the crew: ${target.crew.map((c) => `${c.name} (${c.duty})`).join('; ')}. Produce concrete, decision-ready output in Markdown. Never invent data or sources.` },
        { role: 'user', content: `Work order: ${order.title}\n${order.brief}\n\nExpected deliverable: ${order.deliverable}.` },
      ];
      let stages: RunStageResult[] = [];
      let usage = emptyUsage();

      if (revision) {
        setProgress({ label: 'Revision', index: 1, total: 1 });
        messages.push({ role: 'assistant', content: revision.previous });
        messages.push({ role: 'user', content: `The human reviewer asked for this change: ${revision.note}. Return the revised deliverable only.` });
        const res = await callAgent(key, chosen.id, messages);
        stages = [{ label: 'Revision', output: res.content }];
        usage = res.usage;
      } else {
        for (const [i, stage] of order.stages.entries()) {
          setProgress({ label: stage.label, index: i + 1, total: order.stages.length });
          messages.push({ role: 'user', content: `Step ${i + 1} of ${order.stages.length} — ${stage.label}. ${stage.instruction}` });
          const res = await callAgent(key, chosen.id, messages);
          stages.push({ label: stage.label, output: res.content });
          usage = addUsage(usage, res.usage);
          messages.push({ role: 'assistant', content: res.content });
        }
      }

      addRun({ ...base, mode: 'live', agentId: chosen.id, agentTitle: chosen.title,
        deliverable: stages.at(-1)?.output || '', stages, usage,
        cost: estimateCost(chosen, usage), elapsedMs: Date.now() - startedAt });
      setNotice(`Live run finished with ${chosen.title}. ${usage.totalTokens.toLocaleString()} tokens billed to your key.`);
      getBalance(key).then(setBalance);
    } catch (e) {
      const message = e instanceof ApiError || e instanceof Error ? e.message : 'The run failed for an unknown reason.';
      setError(message);
      if (e instanceof ApiError && e.status === 401) { disconnect(); setKey(null); }
    } finally {
      setBusy(false); setProgress(null);
    }
  }

  function decide(run: WorkRun, decision: WorkRun['decision'], note?: string) {
    setRuns((prev) => prev.map((r) => r.id === run.id ? { ...r, decision, revisionNote: note } : r));
    if (decision === 'revision' && note) {
      const target = companyById(run.companyId);
      const order = target?.orders.find((o) => o.id === run.orderId);
      if (target && order) void runWork(target, order, run.mode, { note, previous: run.deliverable });
    }
  }

  function submitLease(data: Pick<LeaseApplication, 'companyId' | 'companyName' | 'applicant' | 'email' | 'pitch' | 'floor'>) {
    setApplications((prev) => [{ ...data, id: crypto.randomUUID(), createdAt: Date.now() }, ...prev]);
  }

  function openLease(floorNumber: number) { setLeasePreselect(floorNumber); setView('lease'); }

  return (
    <div className="app">
      <header className="topbar">
        <button className="brand" onClick={() => setView('tower')} aria-label="Meridian home">
          <span className="brand-mark">M</span>
          <span><strong>MERIDIAN</strong><small>AI Business Tower</small></span>
        </button>
        <nav aria-label="Main navigation">
          <button className={view === 'tower' ? 'active' : ''} onClick={() => setView('tower')}>Tower</button>
          <button className={view === 'directory' ? 'active' : ''} onClick={() => setView('directory')}>Directory</button>
          <button className={view === 'dashboard' ? 'active' : ''} onClick={() => setView('dashboard')}>Dashboard</button>
          <button className={view === 'lease' ? 'active' : ''} onClick={() => openLease(floor)}>Rent</button>
        </nav>
        <div className="wallet">
          {key ? (
            <>
              <span className="wallet-state"><i /> Connected · {formatPollen(balance.budget ?? 0)} left</span>
              <button className="btn ghost" onClick={() => { disconnect(); setKey(null); setNotice('Wallet disconnected. The key was removed from this tab.'); }}>Disconnect</button>
            </>
          ) : (
            <button className="btn wallet-btn" onClick={() => void startConnect()}>Connect your Pollen</button>
          )}
        </div>
      </header>

      {(notice || error) && (
        <div className={`banner ${error ? 'banner-error' : 'banner-ok'}`} role={error ? 'alert' : 'status'}>
          <span>{error || notice}</span>
          <button onClick={() => { setError(null); setNotice(null); }} aria-label="Dismiss">×</button>
        </div>
      )}

      <main>
        {view === 'tower' && (
          <div className="tower-layout">
            <div className="tower-main">
              <div className="tower-toolbar">
                <div><p className="eyebrow">Live building · 6 tenants</p><h1>Choose a floor</h1></div>
                <button className="btn ghost" onClick={() => setUse3D((v) => !v)}>{use3D ? 'Use floor-stack view' : 'Use 3D view'}</button>
              </div>
              <div className="stage">
                {use3D ? <Suspense fallback={<TowerFallback companies={companies} selectedFloor={floor} onSelect={enterFloor} />}><Tower3D companies={companies} selectedFloor={floor} onSelect={enterFloor} /></Suspense> : <TowerFallback companies={companies} selectedFloor={floor} onSelect={enterFloor} />}
                <div className="floor-rail" role="group" aria-label="Floors">
                  {[...companies].reverse().map((c) => (
                    <button key={c.id} className={c.floor === floor ? 'active' : ''} style={{ '--tag': c.accent } as React.CSSProperties} onClick={() => enterFloor(c.floor)} aria-current={c.floor === floor}>
                      <span>{String(c.floor).padStart(2, '0')}</span>{c.name}
                    </button>
                  ))}
                </div>
              </div>
              {!key && <p className="mode-note">Demo mode: the tower and sample outputs are explorable. Connect your own wallet to run real agents on your own Pollen.</p>}
            </div>
            <OfficePanel
              company={company} agent={agent} discovery={discovery} connected={!!key}
              runs={runs} progress={progress} busy={busy} error={error}
              onRun={(c, id, mode) => { const o = c.orders.find((x) => x.id === id); if (o) void runWork(c, o, mode); }}
              onDecide={decide} onConnect={() => void startConnect()} onLease={openLease}
            />
          </div>
        )}
        {view === 'directory' && <DirectoryView companies={companies} agents={agents} onSelect={enterFloor} onLease={openLease} />}
        {view === 'dashboard' && <DashboardView connected={!!key} balance={balance} runs={runs} applications={applications} onConnect={() => void startConnect()} onGoFloor={(id) => { const c = companyById(id); if (c) enterFloor(c.floor); }} />}
        {view === 'lease' && <LeaseView companies={companies} preselect={leasePreselect} applications={applications} onSubmit={submitLease} />}
      </main>

      <footer>
        <span>MERIDIAN · a Pollinations Quest #17999 build</span>
        <span>{agents.length ? `${agents.length} public agents discovered` : 'Agent catalogue unavailable'} · runs billed to your key, never to the app owner</span>
      </footer>
    </div>
  );
}
