import type { TaxEngine } from '../types.js';
import { indiaEngine } from './india.js';

const registry: Record<string, TaxEngine> = {
  IN: indiaEngine,
};

export function getEngine(jurisdiction: string): TaxEngine | null {
  return registry[jurisdiction] ?? null;
}

export function listEngines() {
  return Object.values(registry).map((e) => e.jurisdiction);
}