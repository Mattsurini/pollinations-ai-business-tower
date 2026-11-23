import type { Company, WorkOrder } from '../types';

/**
 * Demo output is visibly labelled and never presented as an agent result.
 * It exists so the tower is explorable when nobody has connected a wallet.
 */
export function demoDeliverable(company: Company, order: WorkOrder, revisionNote?: string): string {
  return [
    `SAMPLE OUTPUT — demo mode. No Pollinations agent was called and nothing was charged.`,
    ``,
    `# ${order.deliverable} — ${company.name}`,
    ``,
    `This is a structural preview of what a live run would return. Connect your own Pollinations wallet to run the real ${company.crew[0].name} agent on your own Pollen.`,
    ``,
    `## What the live run would cover`,
    ...order.stages.map((s) => `- ${s.label}: ${s.instruction}`),
    ``,
    `## Decision gate`,
    `A live run ends here for founder review: Approve, Reject, or Request a revision.`,
    ...(revisionNote ? [``, `Revision requested: ${revisionNote}`] : []),
    ``,
    `Company goal: ${company.goal}`,
  ].join('\n');
}
