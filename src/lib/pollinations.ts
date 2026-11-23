import type { Company, DiscoveredAgent, Usage } from '../types';

const AUTH = (import.meta.env.VITE_POLLINATIONS_AUTH_URL || 'https://enter.pollinations.ai').replace(/\/$/, '');
const GEN = (import.meta.env.VITE_POLLINATIONS_GEN_URL || 'https://gen.pollinations.ai').replace(/\/$/, '');
const CLIENT_ID: string | undefined = import.meta.env.VITE_POLLINATIONS_APP_KEY || undefined;
const SCOPE = 'profile usage';
const BUDGET = 10;
const EXPIRY = 7;

const S = {
  verifier: 'meridian.pkce',
  state: 'meridian.state',
  key: 'meridian.pollen.key',
};

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

const base64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export function redirectUri(): string {
  const u = new URL(window.location.href);
  u.search = '';
  u.hash = '';
  return u.toString();
}

export async function createPkce(): Promise<{ verifier: string; challenge: string }> {
  const random = crypto.randomUUID() + crypto.randomUUID() + crypto.randomUUID();
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(random));
  return { verifier: random, challenge: base64url(new Uint8Array(digest)) };
}

export function buildAuthUrl(challenge: string, state: string): string {
  const p = new URLSearchParams({
    response_type: 'code',
    redirect_uri: redirectUri(),
    scope: SCOPE,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    budget: String(BUDGET),
    expiry: String(EXPIRY),
  });
  if (CLIENT_ID) p.set('client_id', CLIENT_ID);
  return `${AUTH}/authorize?${p}`;
}

export async function startConnect(): Promise<void> {
  const { verifier, challenge } = await createPkce();
  const state = crypto.randomUUID();
  sessionStorage.setItem(S.verifier, verifier);
  sessionStorage.setItem(S.state, state);
  window.location.assign(buildAuthUrl(challenge, state));
}

export function getKey(): string | null {
  return sessionStorage.getItem(S.key);
}

export function disconnect(): void {
  [S.verifier, S.state, S.key].forEach((k) => sessionStorage.removeItem(k));
}

/** Returns a key when the callback completed, or null on a normal page load. */
export async function consumeCallback(): Promise<{ key?: string; error?: string }> {
  const params = new URLSearchParams(window.location.search);
  if (!params.has('code') && !params.has('error')) return {};
  const clean = new URL(window.location.href);
  clean.search = '';
  clean.hash = '';
  window.history.replaceState({}, '', clean.toString());

  if (params.has('error')) return { error: params.get('error_description') || params.get('error') || 'Authorization was denied.' };

  const expected = sessionStorage.getItem(S.state);
  if (!expected || expected !== params.get('state')) return { error: 'Authorization state did not match. Please try connecting again.' };
  const verifier = sessionStorage.getItem(S.verifier);
  if (!verifier) return { error: 'The signing session expired. Please try connecting again.' };

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: params.get('code') || '',
    redirect_uri: redirectUri(),
    code_verifier: verifier,
  });
  if (CLIENT_ID) body.set('client_id', CLIENT_ID);

  const res = await fetch(`${AUTH}/api/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { error: mapApiError(res.status, data) };
  }
  if (!data.access_token || !String(data.access_token).startsWith('sk_')) {
    return { error: 'Pollinations returned a key we could not use. Please try again.' };
  }
  sessionStorage.setItem(S.key, data.access_token);
  sessionStorage.removeItem(S.verifier);
  sessionStorage.removeItem(S.state);
  return { key: data.access_token };
}

export async function verifyKey(key: string): Promise<boolean> {
  try {
    const res = await fetch(`${GEN}/account/key`, { headers: { Authorization: `Bearer ${key}` } });
    return res.ok;
  } catch {
    return false;
  }
}

type RawAgent = {
  name: string;
  title?: string;
  description?: string;
  agent?: boolean;
  community?: boolean;
  health?: { status?: string; success_rate?: number };
  base_model?: string | null;
  pricing?: { promptTextTokens?: string; completionTextTokens?: string };
  supported_endpoints?: string[];
};

export async function discoverAgents(): Promise<DiscoveredAgent[]> {
  const res = await fetch(`${GEN}/text/models?agent=true`, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new ApiError(res.status, `Agent discovery failed (${res.status}).`);
  const raw = (await res.json()) as RawAgent[];
  return raw
    .filter((a) => a.agent && a.health?.status !== 'down' && a.supported_endpoints?.includes('/v1/chat/completions'))
    .map((a) => ({
      id: a.name,
      title: a.title || a.name,
      description: a.description || '',
      baseModel: a.base_model || null,
      health: (a.health?.status as DiscoveredAgent['health']) || 'unknown',
      pricing: {
        prompt: Number(a.pricing?.promptTextTokens || 0),
        completion: Number(a.pricing?.completionTextTokens || 0),
      },
    }));
}

export function resolveAgent(company: Company, agents: DiscoveredAgent[]): DiscoveredAgent | undefined {
  for (const id of company.preferredAgents) {
    const hit = agents.find((a) => a.id === id);
    if (hit) return hit;
  }
  return agents.find((a) => a.id === 'community/patbing/tower-writer')
    || agents.find((a) => a.health === 'healthy' && !a.description.toLowerCase().includes('simulator'))
    || agents[0];
}

export async function getBalance(key: string): Promise<{ budget: number | null; account: number | null }> {
  const res = await fetch(`${GEN}/account/balance`, { headers: { Authorization: `Bearer ${key}` } });
  if (!res.ok) return { budget: null, account: null };
  const d = await res.json();
  return { budget: d.balance ?? null, account: d.accountBalance?.total ?? null };
}

export function mapApiError(status: number, payload: unknown): string {
  const body = payload as { error?: string | { message?: string }; message?: string } | undefined;
  const detail = typeof body?.error === 'string' ? body.error : body?.error?.message || body?.message;
  switch (status) {
    case 401:
      return 'Your Pollinations key is missing or was revoked. Connect again to continue.';
    case 402:
      return 'Your Pollen balance (or this key’s budget) is exhausted. Top up in your Pollinations dashboard or lower the Connect budget.';
    case 403:
      return 'This key does not permit that model. Reconnect and allow text models on the consent screen.';
    case 404:
      return 'That agent is no longer published. Pick another floor or refresh the directory.';
    case 429:
      return 'Pollinations is rate-limiting this key. Wait a moment and try again.';
    case 400:
      return `The agent rejected the request${detail ? `: ${detail}` : '.'}`;
    default:
      if (status >= 500) return 'Pollinations is temporarily unavailable. Try again in a moment.';
      return detail ? `Request failed: ${detail}` : `Request failed (HTTP ${status}).`;
  }
}

export async function callAgent(key: string, model: string, messages: { role: string; content: string }[]): Promise<{ content: string; usage: Usage }> {
  let res: Response;
  try {
    res = await fetch(`${GEN}/v1/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, temperature: 0.5 }),
    });
  } catch {
    throw new ApiError(0, 'Network unreachable. Check your connection and try again.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, mapApiError(res.status, data));
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) throw new ApiError(res.status, 'The agent returned an empty answer. Nothing was charged for this step.');
  const u = data?.usage || {};
  return {
    content: content.trim(),
    usage: {
      promptTokens: Number(u.prompt_tokens || 0),
      completionTokens: Number(u.completion_tokens || 0),
      totalTokens: Number(u.total_tokens || Number(u.prompt_tokens || 0) + Number(u.completion_tokens || 0)),
    },
  };
}
