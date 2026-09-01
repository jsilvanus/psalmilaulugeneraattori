import type { ToneSet } from '../types.js';
import { catholicGregorianToneSet } from './catholicGregorian.js';
import { finnishGregorianToneSet } from './finnishGregorian.js';

const registry = new Map<string, ToneSet>([
  [catholicGregorianToneSet.id, catholicGregorianToneSet],
  [finnishGregorianToneSet.id, finnishGregorianToneSet],
]);

/**
 * Registers a new tone set (e.g. a future Finnish Lutheran set, or a custom
 * formulaic tone collection). Requires no changes to fit.ts, gabc.ts, or
 * abc.ts, which only ever consume ToneFormula values.
 */
export function registerToneSet(toneSet: ToneSet): void {
  registry.set(toneSet.id, toneSet);
}

export function getToneSet(id: string): ToneSet | undefined {
  return registry.get(id);
}

export function listToneSets(): ToneSet[] {
  return Array.from(registry.values());
}
