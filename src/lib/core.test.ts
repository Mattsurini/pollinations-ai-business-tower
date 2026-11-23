import { describe, expect, it } from 'vitest';
import { companies } from '../data/companies';
import { addUsage, emptyUsage, estimateCost, formatPollen, sessionCost } from './cost';
import { demoDeliverable } from './demo';
import { createPkce, mapApiError, resolveAgent } from './pollinations';
import type { DiscoveredAgent, WorkRun } from '../types';

const agent = (id: string, health: DiscoveredAgent['health'] = 'healthy'): DiscoveredAgent => ({
  id, title: id, description: '', baseModel: 'test/model', health,
  pricing: { prompt: 0.0000001, completion: 0.0000005 },
});

describe('PKCE', () => {
  it('produces a high-entropy verifier and an S256-shaped challenge', async () => {
    const { verifier, challenge } = await createPkce();
    expect(verifier.length).toBeGreaterThan(50);
    expect(challenge).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(challenge).not.toBe(verifier);
  });
});

describe('error mapping', () => {
  it('gives actionable messages for auth and payment failures', () => {
    expect(mapApiError(401, {})).toMatch(/Connect again/);
    expect(mapApiError(402, {})).toMatch(/Pollen balance/);
    expect(mapApiError(429, {})).toMatch(/rate-limiting/);
    expect(mapApiError(503, {})).toMatch(/temporarily unavailable/);
  });
});

describe('agent resolution', () => {
  const target = companies[0];
  it('prefers a company agent when it is published', () => {
    const list = [agent('other'), agent(target.preferredAgents[0])];
    expect(resolveAgent(target, list)?.id).toBe(target.preferredAgents[0]);
  });
  it('falls back to any healthy agent when preferences are unpublished', () => {
    expect(resolveAgent(target, [agent('other')])?.id).toBe('other');
  });
  it('returns undefined when the catalogue is empty', () => {
    expect(resolveAgent(target, [])).toBeUndefined();
  });
});

describe('usage and cost', () => {
  it('aggregates token counts and prices them with the live agent rate', () => {
    const usage = addUsage({ promptTokens: 100, completionTokens: 20, totalTokens: 120 }, { promptTokens: 50, completionTokens: 10, totalTokens: 60 });
    expect(usage).toEqual({ promptTokens: 150, completionTokens: 30, totalTokens: 180 });
    expect(estimateCost(agent('a'), usage)).toBeCloseTo(0.00003);
    expect(estimateCost(undefined, usage)).toBe(0);
    expect(emptyUsage().totalTokens).toBe(0);
  });
  it('formats small pollen amounts and aggregates a session', () => {
    expect(formatPollen(0)).toBe('0.00');
    expect(formatPollen(0.00001234)).toBe('0.00001');
    const runs = [{ cost: 0.01 }, { cost: 0.02 }] as WorkRun[];
    expect(sessionCost(runs)).toBeCloseTo(0.03);
  });
});

describe('demo honesty', () => {
  it('labels sample output as having made no API call', () => {
    const text = demoDeliverable(companies[0], companies[0].orders[0], 'shorter');
    expect(text).toContain('SAMPLE OUTPUT');
    expect(text).toContain('No Pollinations agent was called');
    expect(text).toContain('shorter');
  });
});
