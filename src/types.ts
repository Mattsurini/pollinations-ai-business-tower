export type Stage = { label: string; instruction: string };

export type WorkOrder = {
  id: string;
  title: string;
  brief: string;
  deliverable: string;
  minutes: number;
  stages: Stage[];
};

export type AgentRole = { role: string; name: string; duty: string; tool: string };

export type Company = {
  id: string;
  floor: number;
  name: string;
  sector: string;
  tagline: string;
  description: string;
  founder: string;
  accent: string;
  accentSoft: string;
  glyph: string;
  goal: string;
  crew: AgentRole[];
  preferredAgents: string[];
  orders: WorkOrder[];
};

export type DiscoveredAgent = {
  id: string;
  title: string;
  description: string;
  baseModel: string | null;
  health: 'healthy' | 'degraded' | 'down' | 'unknown';
  pricing: { prompt: number; completion: number };
};

export type Usage = { promptTokens: number; completionTokens: number; totalTokens: number };

export type RunStageResult = { label: string; output: string };

export type WorkRun = {
  id: string;
  companyId: string;
  orderId: string;
  mode: 'live' | 'demo';
  agentId: string;
  agentTitle: string;
  deliverable: string;
  stages: RunStageResult[];
  usage: Usage;
  cost: number;
  startedAt: number;
  elapsedMs: number;
  decision: 'pending' | 'approved' | 'rejected' | 'revision';
  revisionNote?: string;
};

export type LeaseApplication = {
  id: string;
  companyId: string;
  companyName: string;
  applicant: string;
  email: string;
  pitch: string;
  floor: number;
  createdAt: number;
};
