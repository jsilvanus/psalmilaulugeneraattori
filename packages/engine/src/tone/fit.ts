import type { Word } from '../phonology/types.js';
import type { ColonRole } from '../text/types.js';
import type { AccentPoint, CadenceFormula, ScaleDegree, ToneFormula } from './types.js';

export interface PitchedSyllable {
  text: string;
  /** Usually one note; more than one only when a short colon forces a small melisma. */
  notes: ScaleDegree[];
  /** True for a word's first syllable; lets output emitters group syllables by word. */
  isWordStart: boolean;
}

export interface PitchedColon {
  role: ColonRole;
  syllables: PitchedSyllable[];
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
 * Fits one accent point's preparatory/accentNote/postAccent notes onto
 * `syllables[0..rangeEnd)`, anchored at `anchor`, mutating `result` in
 * place. Returns the count of syllables (from index 0) left over before
 * this accent's own preparatory notes -- callers fill that region with the
 * plain reciting tone, or recurse into it for an earlier accent.
 */
function applyAccent(
  result: PitchedSyllable[],
  syllables: FlatSyllable[],
  rangeEnd: number,
  anchor: number,
  point: AccentPoint,
): number {
  // 1. Trailing (post-accent) syllables, up to rangeEnd.
  const trailing = syllables.slice(anchor + 1, rangeEnd);
  const expectedPost = point.postAccent;
  if (trailing.length === expectedPost.length) {
    trailing.forEach((_, i) => {
      result[anchor + 1 + i]!.notes.push(expectedPost[i]!.degree);
    });
  } else if (trailing.length < expectedPost.length) {
    // Shortfall: the extra cadence notes become a short melisma on the
    // accent syllable itself; any actual trailing syllables still take the
    // LAST expected degrees, in order.
    const deficit = expectedPost.length - trailing.length;
    result[anchor]!.notes.push(...expectedPost.slice(0, deficit).map((n) => n.degree));
    trailing.forEach((_, i) => {
      result[anchor + 1 + i]!.notes.push(expectedPost[deficit + i]!.degree);
    });
  } else {
    // More trailing syllables than expected: pair up the expected degrees
    // 1:1, then repeat the last expected degree for the extras. If the
    // formula expects no postAccent notes at all (e.g. a flex, which has
    // none), the extras simply stay on the accent's own pitch.
    const fallbackDegree =
      expectedPost.length > 0
        ? expectedPost[expectedPost.length - 1]!.degree
        : point.accentNote.degree;
    trailing.forEach((_, i) => {
      const degree = i < expectedPost.length ? expectedPost[i]!.degree : fallbackDegree;
      result[anchor + 1 + i]!.notes.push(degree);
    });
  }

  // 2. Accent syllable (placed first, ahead of any merged shortfall notes above).
  result[anchor]!.notes.unshift(point.accentNote.degree);

  // 3. Preparatory notes, walking backward from the accent; whatever's left
  // before them (from index 0) is this accent point's "reciting" region.
  const beforeAnchor = anchor; // count of syllables strictly before the anchor
  const prep = point.preparatory;

  if (beforeAnchor >= prep.length) {
    const recitingCount = beforeAnchor - prep.length;
    for (let i = 0; i < prep.length; i++) {
      result[recitingCount + i]!.notes.push(prep[i]!.degree);
    }
    return recitingCount;
  }
  // Too few syllables to fit the full preparatory cadence: use only the
  // trailing slice of `preparatory` that fits, dropping the leading notes.
  const startIdx = prep.length - beforeAnchor;
  for (let i = 0; i < beforeAnchor; i++) {
    result[i]!.notes.push(prep[startIdx + i]!.degree);
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
 * own accent point the same way, recursively.
 */
export function fitColon(
  words: Word[],
  formula: CadenceFormula,
  recitingDegree: ScaleDegree,
  intonation: { degree: ScaleDegree }[] | undefined,
  options: FitColonOptions = {},
): PitchedSyllable[] {
  const syllables = flattenWords(words);
  if (syllables.length === 0) return [];

  const result: PitchedSyllable[] = syllables.map((s) => ({
    text: s.text,
    notes: [],
    isWordStart: s.isWordStart,
  }));

  // No stressed syllable found (shouldn't normally happen): anchor to the last syllable.
  const anchor = findLastStressedIndex(syllables, syllables.length);
  const primaryAnchor = anchor === -1 ? syllables.length - 1 : anchor;
  let recitingCount = applyAccent(result, syllables, syllables.length, primaryAnchor, formula);

  if (formula.secondaryAccent && recitingCount > 0) {
    const secondaryAnchor = findLastStressedIndex(syllables, recitingCount);
    if (secondaryAnchor !== -1) {
      recitingCount = applyAccent(
        result,
        syllables,
        recitingCount,
        secondaryAnchor,
        formula.secondaryAccent,
      );
    }
  }

  for (let i = 0; i < recitingCount; i++) {
    result[i]!.notes.push(recitingDegree);
  }

  // Intonation: only for the first colon of a psalm's first verse, and only
  // for the syllables strictly before the primary accent (never overrides
  // the accent/cadence itself, secondary accent included).
  if (options.isFirstColonOfFirstVerse && intonation && intonation.length > 0) {
    const count = Math.min(intonation.length, primaryAnchor);
    for (let i = 0; i < count; i++) {
      result[i]!.notes = [intonation[i]!.degree];
    }
  }

  return result;
}

function selectFormula(
  tone: ToneFormula,
  role: ColonRole,
  differentiaIndex: number,
): CadenceFormula {
  if (role === 'flex') {
    if (!tone.flex) {
      throw new Error(`Tone "${tone.id}" has no flex formula defined for a tripartite verse.`);
    }
    return tone.flex;
  }
  if (role === 'mediant') return tone.mediant;
  const differentia = tone.termination[differentiaIndex];
  if (!differentia) {
    throw new Error(`Tone "${tone.id}" has no differentia at index ${differentiaIndex}.`);
  }
  return differentia;
}

function selectReciting(tone: ToneFormula, role: ColonRole): ScaleDegree {
  if (role === 'termination' && tone.secondReciting !== undefined) return tone.secondReciting;
  return tone.reciting;
}

/**
 * Fits every colon of a verse (2 or 3 cola) onto the given tone.
 * `differentiaIndex` picks which of the tone's termination endings
 * (differentiae) to use -- defaults to 0, the tone's default ending.
 */
export function fitVerse(
  cola: ColonInput[],
  tone: ToneFormula,
  isFirstVerseOfPsalm: boolean,
  differentiaIndex = 0,
): PitchedColon[] {
  return cola.map((colon, index) => {
    const formula = selectFormula(tone, colon.role, differentiaIndex);
    const recitingDegree = selectReciting(tone, colon.role);
    const syllables = fitColon(colon.words, formula, recitingDegree, tone.intonation, {
      isFirstColonOfFirstVerse: isFirstVerseOfPsalm && index === 0,
    });
    return { role: colon.role, syllables };
  });
}
