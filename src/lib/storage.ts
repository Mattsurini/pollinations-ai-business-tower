import type { LeaseApplication, WorkRun } from '../types';

function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private browsing with storage disabled: keep the in-memory copy only.
  }
}

export const loadRuns = () => read<WorkRun[]>('meridian.runs', []);
export const saveRuns = (runs: WorkRun[]) => write('meridian.runs', runs);
export const loadApplications = () => read<LeaseApplication[]>('meridian.applications', []);
export const saveApplications = (apps: LeaseApplication[]) => write('meridian.applications', apps);
