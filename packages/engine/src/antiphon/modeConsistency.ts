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
 * Historical fact, sourced (not derived): under certain melodic conditions
 * -- the "mi contra fa" tritone-avoidance rule, B against F -- B was
 * customarily flattened in modes I/II (Dorian, final D) and, more usually,
 * modes V/VI (Lydian, final F), without the chant ceasing to be considered
 * that mode. A chant in one of these two (root, species) pairs may licitly
 * mix B-natural and B-flat; the strict single-interval-set check below
 * would otherwise misclassify that as inconsistent, or as a different
 * species (D-Aeolian) entirely, so these two pairs don't police the B
 * degree strictly. Deliberately NOT modeling the actual melodic condition
 * (flat specifically when the phrase approaches/frames F) -- that needs a
 * properly citable rule, not a derived guess; see refs/README.md's
 * "Customary B-flat" section for what's confirmed so far and what's
 * deferred (TODO: contour-aware checking, not just a static per-species
 * exemption).
 */
const CUSTOMARY_FLEXIBLE_LETTER: Partial<Record<string, string>> = {
  'D-Dorian': 'B',
  'F-Lydian': 'B',
};

/**
 * Checks a melody's ACTUAL pitch content -- not just its final's bare
 * letter, the way detectMode does -- against every one of the 7 diatonic
 * mode species, anchored at the melody's own final (whatever note it
 * actually is, on the assumption you meant to end there). Unlike
 * detectMode, which always returns exactly one mode by trusting the final,
 * this can return zero, one, or several matches:
 *
 * - Zero: the melody uses a note that fits no species at that root at all
 *   -- e.g. you intended Dorian, landed on D, but used an F# (raised 3rd)
 *   somewhere, which no customary Dorian inflection allows. That's made
 *   visible here instead of silently accepted the way detectMode would
 *   (detectMode only ever looks at the final, so "ends on D" alone is
 *   enough for it to call it mode 1 regardless of what else was used).
 *   Note that a D-final melody mixing B-natural and B-flat is NOT such a
 *   case -- see CUSTOMARY_FLEXIBLE_LETTER -- that's sourced, sanctioned
 *   practice for Dorian/Lydian specifically, not a real inconsistency.
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
  return analyzeConsistency(abcText).matches;
}

interface ConsistencyAnalysis {
  root: ModeRoot;
  matches: ModeConsistencyMatch[];
}

/**
 * Shared implementation behind checkModeConsistency and detectModeFromAbc:
 * the root is needed by the latter even when nothing matches (so it can say
 * WHICH final the content failed to cohere at), but the former's array
 * return has nowhere to put it.
 */
function analyzeConsistency(abcText: string): ConsistencyAnalysis {
  const events = Array.from(walkAbcNotes(abcText));
  if (events.length === 0) {
    throw new Error('The melody has no notes to analyze.');
  }

  const finalEvent = events[events.length - 1]!;
  const rootAccidental = finalEvent.explicitAccidental ?? finalEvent.keySignatureAccidental;
  const root: ModeRoot = { letter: finalEvent.letter, accidental: rootAccidental };
  const rootSemitone = semitoneClass(root.letter, root.accidental);

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
    // See CUSTOMARY_FLEXIBLE_LETTER's own doc comment: for the two
    // sourced (root, species) pairs, a note on this letter is exempted
    // from the strict check below regardless of which accidental it uses.
    const flexLetter = root.accidental
      ? undefined
      : CUSTOMARY_FLEXIBLE_LETTER[`${root.letter}-${species}`];
    const fits = events.every((e) => {
      if (flexLetter && e.letter === flexLetter) return true;
      return speciesClasses.has(
        semitoneClass(e.letter, e.explicitAccidental ?? e.keySignatureAccidental),
      );
    });
    if (!fits) continue;

    const pair = root.accidental ? undefined : CANONICAL_PAIR[`${root.letter}-${species}`];
    const churchMode =
      pair && detectedChurchMode && pair.includes(detectedChurchMode)
        ? detectedChurchMode
        : undefined;
    matches.push({ species, root, churchMode });
  }
  return { root, matches };
}

export interface AbcModeDetection {
  /**
   * The canonical ChurchMode the melody's actual content supports, if any.
   * Undefined in two quite different situations, both of which are correct
   * answers rather than failures to detect: the content coheres at a final
   * this engine has no tone data for (e.g. G-Dorian), or it coheres as no
   * diatonic species at all. `matches` tells the two apart.
   *
   * At most one match can ever carry a churchMode, so this isn't an
   * arbitrary pick among several: CANONICAL_PAIR holds exactly one species
   * per root letter (D-Dorian, E-Phrygian, ...), so no two matching species
   * at the same root can both be canonical.
   */
  mode?: ChurchMode;
  /** Every species the content is consistent with -- see checkModeConsistency. */
  matches: ModeConsistencyMatch[];
  /** The melody's own final, reported even when nothing matched. */
  root: ModeRoot;
}

/**
 * Content-aware counterpart of modeDetect.ts's `detectMode`, for the
 * antiphon -> tone pipeline.
 *
 * `detectMode` reads the final note's bare letter and always names a mode --
 * it cannot see accidentals at all (abcjs's own diatonic `pitch` field is
 * accidental- and key-signature-blind; see walkAbcNotes). That makes it
 * confidently wrong on transposed chant: a G-final melody carrying a B-flat
 * is Dorian transposed, but `detectMode` reports mode 7/8 (Mixolydian),
 * because G is Mixolydian's canonical final and the flat is invisible to it.
 *
 * This asks what the notes actually support, and declines to name a mode
 * when they don't support one. Prefer it over `detectMode` wherever the raw
 * ABC text is available; `detectMode` remains correct for accidental-free
 * input and is still the primitive that resolves authentic vs. plagal.
 *
 * ABC only, for the same reason checkModeConsistency is -- GABC accidentals
 * aren't read anywhere in this engine yet (see output/gabc.ts's note).
 */
export function detectModeFromAbc(abcText: string): AbcModeDetection {
  const { root, matches } = analyzeConsistency(abcText);
  return { mode: matches.find((m) => m.churchMode !== undefined)?.churchMode, matches, root };
}
