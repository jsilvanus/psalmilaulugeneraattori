import type { ChurchMode, ToneFormula, ToneSet } from '../tone/types.js';
import type { MelodyAnalysis } from './modeDetect.js';

export interface DifferentiaCandidate {
  differentiaIndex: number;
  /** Distance (in diatonic steps) between this differentia's final note and the antiphon's opening note. */
  distance: number;
}

export interface ToneMatchResult {
  tone: ToneFormula;
  differentiaIndex: number;
  /** Runner-up differentiae, best first, for the UI to offer as alternatives. */
  alternates: DifferentiaCandidate[];
}

function terminationFinalDegree(tone: ToneFormula, differentiaIndex: number): number {
  const formula = tone.termination[differentiaIndex];
  if (!formula) {
    throw new Error(`Tone "${tone.id}" has no differentia at index ${differentiaIndex}.`);
  }
  const lastPostAccent = formula.postAccent.at(-1);
  return lastPostAccent ? lastPostAccent.degree : formula.accentNote.degree;
}

/**
 * Picks the tone set's default tone for the detected mode, then the
 * differentia whose final note best matches the antiphon's opening note --
 * the standard choir-book rule for a smooth hand-off back into the antiphon
 * after the doxology. Never hardcodes the mode->tone pairing: that comes
 * from the ToneSet itself, since a future Finnish Lutheran set may map
 * differently.
 */
export function matchTone(toneSet: ToneSet, mode: ChurchMode, antiphon: MelodyAnalysis): ToneMatchResult {
  const tone = toneSet.defaultToneForMode(mode);
  const antiphonOpeningDegree = antiphon.firstPitch - antiphon.finalPitch;

  const candidates: DifferentiaCandidate[] = tone.termination.map((_, differentiaIndex) => ({
    differentiaIndex,
    distance: Math.abs(terminationFinalDegree(tone, differentiaIndex) - antiphonOpeningDegree),
  }));
  candidates.sort((a, b) => a.distance - b.distance);

  const [best, ...alternates] = candidates;
  if (!best) {
    throw new Error(`Tone "${tone.id}" has no terminations to choose from.`);
  }

  return { tone, differentiaIndex: best.differentiaIndex, alternates };
}
