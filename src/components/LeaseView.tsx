import { useState } from 'react';
import type { Company, LeaseApplication } from '../types';

const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export default function LeaseView({ companies, preselect, applications, onSubmit }: {
  companies: Company[];
  preselect: number | null;
  applications: LeaseApplication[];
  onSubmit: (data: Pick<LeaseApplication, 'companyId' | 'companyName' | 'applicant' | 'email' | 'pitch' | 'floor'>) => void;
}) {
  const [floor, setFloor] = useState(preselect ?? 6);
  const [applicant, setApplicant] = useState('');
  const [email, setEmail] = useState('');
  const [pitch, setPitch] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const company = companies.find((c) => c.floor === floor) || companies[0];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!applicant.trim()) return setError('Add your name so the floor owner knows who is applying.');
    if (!emailOk(email)) return setError('Enter a valid email address.');
    if (pitch.trim().length < 20) return setError('Write at least 20 characters about the business you would run here.');
    setError('');
    onSubmit({ companyId: company.id, companyName: company.name, applicant: applicant.trim(), email: email.trim(), pitch: pitch.trim(), floor });
    setSent(true);
    setApplicant(''); setEmail(''); setPitch('');
  }

  return (
    <section className="page">
      <header className="page-head">
        <div><p className="eyebrow">Vacancy · floor {String(company.floor).padStart(2, '0')}</p><h1>Rent an office</h1></div>
        <p className="page-sub">Tell the building who you are and what you would run. The application stays in this browser — nothing is uploaded.</p>
      </header>

      <form className="lease-form" onSubmit={submit}>
        <label>Floor
          <select value={floor} onChange={(e) => { setFloor(Number(e.target.value)); setSent(false); }}>
            {companies.map((c) => <option key={c.id} value={c.floor}>F{String(c.floor).padStart(2, '0')} — {c.name}</option>)}
          </select>
        </label>
        <label>Your name<input value={applicant} onChange={(e) => setApplicant(e.target.value)} placeholder="Founder or team name" /></label>
        <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label>
        <label>What would you run here?<textarea rows={6} value={pitch} onChange={(e) => setPitch(e.target.value)} placeholder="One clear paragraph: the business, the agents you would hire, and the work they would do." /></label>
        {error && <p className="error-box" role="alert">{error}</p>}
        <button className="btn primary" type="submit">Save application</button>
        {sent && <p className="success-box" role="status">Saved to this browser. No server received it — this MVP has no leasing backend.</p>}
      </form>

      {applications.length > 0 && (
        <section className="dash-section">
          <div className="block-title"><span>Saved applications</span><span className="small muted">{applications.length}</span></div>
          <div className="run-list">
            {applications.map((a) => (
              <article key={a.id} className="run-row"><div><strong>{a.applicant}</strong><span className="small muted mono"> → F{String(a.floor).padStart(2, '0')} {a.companyName}</span></div><span className="small muted">{a.email}</span></article>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
