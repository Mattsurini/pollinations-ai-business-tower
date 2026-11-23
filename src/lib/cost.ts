import type { DiscoveredAgent, Usage, WorkRun } from '../types';

export const emptyUsage = (): Usage => ({ promptTokens: 0, completionTokens: 0, totalTokens: 0 });

export function addUsage(a: Usage, b: Usage): Usage {
  return {
    promptTokens: a.promptTokens + b.promptTokens,
    completionTokens: a.completionTokens + b.completionTokens,
    totalTokens: a.totalTokens + b.totalTokens,
  };
}

/** Agent pricing is dollars per token (the API calls the unit "pollen"). */
export function estimateCost(agent: DiscoveredAgent | undefined, usage: Usage): number {
  if (!agent) return 0;
  return usage.promptTokens * agent.pricing.prompt + usage.completionTokens * agent.pricing.completion;
}

export function formatPollen(amount: number): string {
  if (amount === 0) return '0.00';
  if (amount < 0.01) return amount.toFixed(5);
  return amount.toFixed(3);
}

export function sessionCost(runs: WorkRun[]): number {
  return runs.reduce((sum, r) => sum + r.cost, 0);
}
