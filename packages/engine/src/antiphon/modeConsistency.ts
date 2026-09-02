import type { Accidental, ChurchMode } from '../tone/types.js';
import { analyzeMelody, detectMode, walkAbcNotes } from './modeDetect.js';

/**
 * The 7 rotations of the diatonic (white-note) scale -- the historical
 * church modes (Dorian..Mixolydian) plus Glarean's Aeolian/Ionian (see
 * tone/types.ts's ChurchMode doc comment) plus Locrian, which no
 * liturgical tradition this engine models actually uses (Glarean himself
 * called it unusable), but which is a real, nameable diatonic species this
 * checker should report honestly if a melody's content happens to match
 * it, the same way abcjs itself accepts `K:Bloc`.
 */
export type ModeSpecies =
  'Ionian' | 'Dorian' | 'Phrygian' | 'Lydian' | 'Mixolydian' | 'Aeolian' | 'Locrian';

// Semitone offsets from the root for each species.
const SPECIES_INTERVALS: Record<ModeSpecies, number[]> = {
  Ionian: [0, 2, 4, 5, 7, 9, 11],
  Dorian: [0, 2, 3, 5, 7, 9, 10],
  Phrygian: [0, 1, 3, 5, 7, 8, 10],
  Lydian: [0, 2, 4, 6, 7, 9, 11],
  Mixolydian: [0, 2, 4, 5, 7, 9, 10],
  Aeolian: [0, 2, 3, 5, 7, 8, 10],
  Locrian: [0, 1, 3, 5, 6, 8, 10],
};

const NATURAL_SEMITONE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const ACCIDENTAL_OFFSET: Record<Accidental, number> = { sharp: 1, flat: -1, natural: 0 };

function semitoneClass(letter: string, accidental: Accidental | undefined): number {
  const offset = accidental ? ACCIDENTAL_OFFSET[accidental] : 0;
  return (NATURAL_SEMITONE[letter]! + offset + 12) % 12;
}

/** The tune's own final, by name -- e.g. `{ letter: 'G' }`, or `{ letter: 'B', accidental: 'flat' }`. */
export interface ModeRoot {
  letter: string;
  accidental?: Accidental;
}

export interface ModeConsistencyMatch {
  species: ModeSpecies;
  root: ModeRoot;
  /**
   * The corresponding ChurchMode (authentic or plagal) IF this (root,
   * species) pair is one of the 6 canonical, natural-final pairs this
   * engine has real tone data for (D-Dorian, E-Phrygian, F-Lydian,
   * G-Mixolydian, A-Aeolian, C-Ionian) -- see catholicGregorian.ts.
   * Undefined for any other match (e.g. G-Dorian: a real, correctly
   * detected mode, just one with no canonical final in this engine). That
   * absence is honest, not a bug -- it reflects this engine's actual
   * liturgical-tone coverage, not a limit of the detector.
   */
  churchMode?: ChurchMode;
}

const CANONICAL_PAIR: Partial<Record<string, [ChurchMode, ChurchMode]>> = {
  'D-Dorian': [1, 2],
  'E-Phrygian': [3, 4],
  'F-Lydian': [5, 6],
  'G-Mixolydian': [7, 8],
  'A-Aeolian': [9, 10],
  'C-Ionian': [11, 12],
};
const CANONICAL_LETTERS = new Set(Object.keys(CANONICAL_PAIR).map((key) => key.split('-')[0]!));

/**
 * Checks a melody's ACTUAL pitch content -- not just its final's bare
 * letter, the way detectMode does -- against every one of the 7 diatonic
 * mode species, anchored at the melody's own final (whatever note it
 * actually is, on the assumption you meant to end there). Unlike
 * detectMode, which always returns exactly one mode by trusting the final,
 * this can return zero, one, or several matches:
 *
 * - Zero: the melody uses a note that fits no species at that root at all
 *   -- e.g. you intended Dorian, landed on D, but used a flat 6th (Bb)
 *   somewhere, which Dorian's natural 6th doesn't allow. That's made
 *   visible here instead of silently accepted the way detectMode would
 *   (detectMode only ever looks at the final, so "ends on D" alone is
 *   enough for it to call it mode 1 regardless of what else was used).
 * - Several: the melody is short/simple enough that it never uses the one
 *   note that would tell two species apart -- an honest "could be either"
 *   rather than a falsely confident single answer.
 * - One, with `churchMode` set: a genuine match at one of this engine's 6
 *   canonical finals (e.g. D-Dorian) -- authentic/plagal is resolved by
 *   reusing detectMode's own heuristic, not reimplemented here.
 * - One, with `churchMode` undefined: a genuine match, just not at a final
 *   this engine has tone data for (e.g. G-Dorian, a real transposed mode).
 *
 * ABC input only: GABC's accidental syntax isn't read anywhere else in
 * this engine yet either (see output/gabc.ts's own note on that gap), so a
 * GABC melody can't carry the accidental information this check needs.
 */
export function checkModeConsistency(abcText: string): ModeConsistencyMatch[] {
  const events = Array.from(walkAbcNotes(abcText));
  if (events.length === 0) {
    throw new Error('The melody has no notes to analyze.');
  }

  const finalEvent = events[events.length - 1]!;
  const rootAccidental = finalEvent.explicitAccidental ?? finalEvent.keySignatureAccidental;
  const root: ModeRoot = { letter: finalEvent.letter, accidental: rootAccidental };
  const rootSemitone = semitoneClass(root.letter, root.accidental);

  const usedClasses = new Set(
    events.map((e) => semitoneClass(e.letter, e.explicitAccidental ?? e.keySignatureAccidental)),
  );

  // Only a natural final on one of the six canonical letters can map back
  // to a real ChurchMode. Computed once (not per species below), and never
  // throws: detectMode only throws for a final outside D/E/F/G/A/C, which
  // this guard already excludes.
  let detectedChurchMode: ChurchMode | undefined;
  if (!root.accidental && CANONICAL_LETTERS.has(root.letter)) {
    detectedChurchMode = detectMode(analyzeMelody(abcText)).mode;
  }

  const matches: ModeConsistencyMatch[] = [];
  for (const species of Object.keys(SPECIES_INTERVALS) as ModeSpecies[]) {
    const speciesClasses = new Set(
      SPECIES_INTERVALS[species]!.map((offset) => (rootSemitone + offset) % 12),
    );
    const fits = [...usedClasses].every((pitchClass) => speciesClasses.has(pitchClass));
    if (!fits) continue;

    const pair = root.accidental ? undefined : CANONICAL_PAIR[`${root.letter}-${species}`];
    const churchMode =
      pair && detectedChurchMode && pair.includes(detectedChurchMode)
        ? detectedChurchMode
        : undefined;
    matches.push({ species, root, churchMode });
  }
  return matches;
}
