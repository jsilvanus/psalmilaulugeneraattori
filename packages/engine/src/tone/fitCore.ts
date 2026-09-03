import type { Word } from '../phonology/types.js';
import type { ColonRole } from '../text/types.js';
import type { AccentPointOf, CadenceFormulaOf } from './cadence.js';

/**
 * The shared "pointing" fitting algorithm, generic over the note value
 * (TNote): a single ScaleDegree-wrapping CadenceNote for the monophonic
 * Gregorian/Finnish tradition (see fit.ts), or a Chord-wrapping
 * ChordCadenceNote for the homophonic SATB/Anglican tradition (see
 * fitChord.ts). The algorithm never inspects a note's internals -- it only
 * ever moves whole TNote values into place -- so one implementation serves
 * both traditions; only the excess-trailing-syllable overflow rule
 * genuinely differs between them (see ExcessStrategy below), and that's
 * threaded through as a parameter rather than duplicated.
 */

export interface PitchedSyllableOf<TNote> {
  text: string;
  /** Usually one note; more than one only when a short colon forces a small melisma. */
  notes: TNote[];
  /** True for a word's first syllable; lets output emitters group syllables by word. */
  isWordStart: boolean;
}

export interface PitchedColonOf<TNote> {
  role: ColonRole;
  syllables: PitchedSyllableOf<TNote>[];
}

export interface ColonInput {
  role: ColonRole;
  words: Word[];
}

interface FlatSyllable {
  text: string;
  hasStress: boolean;
  isWordStart: boolean;
}

function flattenWords(words: Word[]): FlatSyllable[] {
  return words.flatMap((word) =>
    word.syllables.map((s, idx) => ({
      text: s.text,
      hasStress: s.hasStress,
      isWordStart: idx === 0,
    })),
  );
}

/** Last stressed syllable index within [0, rangeEnd), or -1 if none. */
function findLastStressedIndex(syllables: FlatSyllable[], rangeEnd: number): number {
  for (let i = rangeEnd - 1; i >= 0; i--) {
    if (syllables[i]!.hasStress) return i;
  }
  return -1;
}

/**
 * How to assign notes to trailing syllables when a colon has MORE trailing
 * syllables than the cadence's postAccent defines. Given how many trailing
 * syllables there are, the cadence's own postAccent notes, and its accent
 * note, returns exactly `trailingCount` notes, one per trailing syllable,
 * in order. The two traditions disagree here, each per its own book's own
 * worked examples -- see the two implementations below -- so this is a
 * parameter, not shared logic.
 */
export type ExcessStrategy<TNote> = (
  trailingCount: number,
  expectedPost: TNote[],
  accentNote: TNote,
) => TNote[];

/**
 * The classical Gregorian/Finnish rule: pair the expected postAccent notes
 * 1:1 with the first trailing syllables, then repeat the LAST expected note
 * for any further extras. If the formula expects no postAccent notes at all
 * (e.g. a flex, which has none), the extras simply stay on the accent's own
 * note. Used by fit.ts; deliberately NOT used by fitChord.ts -- see
 * extendAccentNote below and refs/README.md's "Anglican chant" section.
 */
export function repeatLastPostAccent<TNote>(
  trailingCount: number,
  expectedPost: TNote[],
  accentNote: TNote,
): TNote[] {
  const fallback = expectedPost.length > 0 ? expectedPost[expectedPost.length - 1]! : accentNote;
  return Array.from({ length: trailingCount }, (_, i) =>
    i < expectedPost.length ? expectedPost[i]! : fallback,
  );
}

/**
 * The Anglican-chant rule (see refs/README.md's "Anglican chant" section,
 * quoting the source book directly, p.387): the *excess* syllables -- the
 * ones right after the accent -- extend the accent's own held note, while
 * the notes actually written stay anchored to the true end of the colon.
 * E.g. a 2-note cadence (accent + one postAccent note) fitting 3 trailing
 * syllables sings the first two on the accent's note and only the last on
 * the second note -- the opposite of repeatLastPostAccent's rule, which
 * would put the last two both on the second note. Used by fitChord.ts.
 */
export function extendAccentNote<TNote>(
  trailingCount: number,
  expectedPost: TNote[],
  accentNote: TNote,
): TNote[] {
  const excess = trailingCount - expectedPost.length;
  return Array.from({ length: trailingCount }, (_, i) =>
    i < excess ? accentNote : expectedPost[i - excess]!,
  );
}

/**
 * Fits one accent point's preparatory/accentNote/postAccent notes onto
 * `syllables[0..rangeEnd)`, anchored at `anchor`, mutating `result` in
 * place. Returns the count of syllables (from index 0) left over before
 * this accent's own preparatory notes -- callers fill that region with the
 * plain reciting note, or recurse into it for an earlier accent.
 */
function applyAccentGeneric<TNote>(
  result: PitchedSyllableOf<TNote>[],
  syllables: FlatSyllable[],
  rangeEnd: number,
  anchor: number,
  point: AccentPointOf<TNote>,
  excessStrategy: ExcessStrategy<TNote>,
): number {
  // 1. Trailing (post-accent) syllables, up to rangeEnd.
  const trailing = syllables.slice(anchor + 1, rangeEnd);
  const expectedPost = point.postAccent;
  if (trailing.length === expectedPost.length) {
    trailing.forEach((_, i) => {
      result[anchor + 1 + i]!.notes.push(expectedPost[i]!);
    });
  } else if (trailing.length < expectedPost.length) {
    // Shortfall: the extra cadence notes become a short melisma on the
    // accent syllable itself; any actual trailing syllables still take the
    // LAST expected notes, in order.
    const deficit = expectedPost.length - trailing.length;
    result[anchor]!.notes.push(...expectedPost.slice(0, deficit));
    trailing.forEach((_, i) => {
      result[anchor + 1 + i]!.notes.push(expectedPost[deficit + i]!);
    });
  } else {
    // More trailing syllables than expected -- see ExcessStrategy.
    const notes = excessStrategy(trailing.length, expectedPost, point.accentNote);
    trailing.forEach((_, i) => {
      result[anchor + 1 + i]!.notes.push(notes[i]!);
    });
  }

  // 2. Accent syllable (placed first, ahead of any merged shortfall notes above).
  result[anchor]!.notes.unshift(point.accentNote);

  // 3. Preparatory notes, walking backward from the accent; whatever's left
  // before them (from index 0) is this accent point's "reciting" region.
  const beforeAnchor = anchor; // count of syllables strictly before the anchor
  const prep = point.preparatory;

  if (beforeAnchor >= prep.length) {
    const recitingCount = beforeAnchor - prep.length;
    for (let i = 0; i < prep.length; i++) {
      result[recitingCount + i]!.notes.push(prep[i]!);
    }
    return recitingCount;
  }
  // Too few syllables to fit the full preparatory cadence: use only the
  // trailing slice of `preparatory` that fits, dropping the leading notes.
  const startIdx = prep.length - beforeAnchor;
  for (let i = 0; i < beforeAnchor; i++) {
    result[i]!.notes.push(prep[startIdx + i]!);
  }
  return 0;
}

export interface FitColonOptions {
  isFirstColonOfFirstVerse?: boolean;
}

/**
 * The classical psalm-tone "pointing" algorithm: the reciting note carries
 * everything up to the last stressed syllable of the colon, then the
 * cadence formula's notes align to that stressed syllable (the anchor) and
 * whatever unstressed syllables follow it. When the formula also defines a
 * `secondaryAccent` and the colon has an earlier stressed syllable in the
 * region that would otherwise be plain reciting tone, that region gets its
 * own accent point the same way, recursively. See fit.ts/fitChord.ts for
 * the tradition-specific wrappers that supply `reciting` and the right
 * ExcessStrategy.
 */
export function fitColonGeneric<TNote>(
  words: Word[],
  formula: CadenceFormulaOf<TNote>,
  reciting: TNote,
  intonation: TNote[] | undefined,
  excessStrategy: ExcessStrategy<TNote>,
  options: FitColonOptions = {},
): PitchedSyllableOf<TNote>[] {
  const syllables = flattenWords(words);
  if (syllables.length === 0) return [];

  const result: PitchedSyllableOf<TNote>[] = syllables.map((s) => ({
    text: s.text,
    notes: [],
    isWordStart: s.isWordStart,
  }));

  // No stressed syllable found (shouldn't normally happen): anchor to the last syllable.
  const anchor = findLastStressedIndex(syllables, syllables.length);
  const primaryAnchor = anchor === -1 ? syllables.length - 1 : anchor;
  let recitingCount = applyAccentGeneric(
    result,
    syllables,
    syllables.length,
    primaryAnchor,
    formula,
    excessStrategy,
  );

  if (formula.secondaryAccent && recitingCount > 0) {
    const secondaryAnchor = findLastStressedIndex(syllables, recitingCount);
    if (secondaryAnchor !== -1) {
      recitingCount = applyAccentGeneric(
        result,
        syllables,
        recitingCount,
        secondaryAnchor,
        formula.secondaryAccent,
        excessStrategy,
      );
    }
  }

  for (let i = 0; i < recitingCount; i++) {
    result[i]!.notes.push(reciting);
  }

  // Intonation: only for the first colon of a psalm's first verse, and only
  // for the syllables strictly before the primary accent (never overrides
  // the accent/cadence itself, secondary accent included).
  if (options.isFirstColonOfFirstVerse && intonation && intonation.length > 0) {
    const count = Math.min(intonation.length, primaryAnchor);
    for (let i = 0; i < count; i++) {
      result[i]!.notes = [intonation[i]!];
    }
  }

  return result;
}
