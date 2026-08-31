import type { Word } from '../phonology/types.js';
import type { ColonRole } from '../text/types.js';
import type { CadenceFormula, ScaleDegree, ToneFormula } from './types.js';

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
    word.syllables.map((s, idx) => ({ text: s.text, hasStress: s.hasStress, isWordStart: idx === 0 })),
  );
}

function findAnchorIndex(syllables: FlatSyllable[]): number {
  for (let i = syllables.length - 1; i >= 0; i--) {
    if (syllables[i]!.hasStress) return i;
  }
  // No stressed syllable found (shouldn't normally happen): anchor to the last syllable.
  return syllables.length - 1;
}

export interface FitColonOptions {
  isFirstColonOfFirstVerse?: boolean;
}

/**
 * The classical psalm-tone "pointing" algorithm: the reciting note carries
 * everything up to the last stressed syllable of the colon, then the
 * cadence formula's notes align to that stressed syllable (the anchor) and
 * whatever unstressed syllables follow it.
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

  const anchor = findAnchorIndex(syllables);
  const result: PitchedSyllable[] = syllables.map((s) => ({
    text: s.text,
    notes: [],
    isWordStart: s.isWordStart,
  }));

  // 1. Trailing (post-accent) syllables.
  const trailing = syllables.slice(anchor + 1);
  const expectedPost = formula.postAccent;
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
    const fallbackDegree = expectedPost.length > 0 ? expectedPost[expectedPost.length - 1]!.degree : formula.accentNote.degree;
    trailing.forEach((_, i) => {
      const degree = i < expectedPost.length ? expectedPost[i]!.degree : fallbackDegree;
      result[anchor + 1 + i]!.notes.push(degree);
    });
  }

  // 2. Accent syllable (placed first, ahead of any merged shortfall notes above).
  result[anchor]!.notes.unshift(formula.accentNote.degree);

  // 3. Preparatory notes, then plain reciting tone, walking backward from the accent.
  const beforeAnchor = anchor; // count of syllables strictly before the anchor
  const prep = formula.preparatory;
  let recitingCount: number;

  if (beforeAnchor >= prep.length) {
    recitingCount = beforeAnchor - prep.length;
    for (let i = 0; i < prep.length; i++) {
      result[recitingCount + i]!.notes.push(prep[i]!.degree);
    }
  } else {
    // Too few syllables to fit the full preparatory cadence: use only the
    // trailing slice of `preparatory` that fits, dropping the leading notes.
    recitingCount = 0;
    const startIdx = prep.length - beforeAnchor;
    for (let i = 0; i < beforeAnchor; i++) {
      result[i]!.notes.push(prep[startIdx + i]!.degree);
    }
  }

  for (let i = 0; i < recitingCount; i++) {
    result[i]!.notes.push(recitingDegree);
  }

  // Intonation: only for the first colon of a psalm's first verse, and only
  // for the syllables strictly before the anchor (never overrides the
  // accent/cadence itself).
  if (options.isFirstColonOfFirstVerse && intonation && intonation.length > 0) {
    const count = Math.min(intonation.length, beforeAnchor);
    for (let i = 0; i < count; i++) {
      result[i]!.notes = [intonation[i]!.degree];
    }
  }

  return result;
}

function selectFormula(tone: ToneFormula, role: ColonRole): CadenceFormula {
  if (role === 'flex') {
    if (!tone.flex) {
      throw new Error(`Tone "${tone.id}" has no flex formula defined for a tripartite verse.`);
    }
    return tone.flex;
  }
  if (role === 'mediant') return tone.mediant;
  const [defaultTermination] = tone.termination;
  if (!defaultTermination) {
    throw new Error(`Tone "${tone.id}" has no termination formula.`);
  }
  return defaultTermination;
}

function selectReciting(tone: ToneFormula, role: ColonRole): ScaleDegree {
  if (role === 'termination' && tone.secondReciting !== undefined) return tone.secondReciting;
  return tone.reciting;
}

/** Fits every colon of a verse (2 or 3 cola) onto the given tone. */
export function fitVerse(cola: ColonInput[], tone: ToneFormula, isFirstVerseOfPsalm: boolean): PitchedColon[] {
  return cola.map((colon, index) => {
    const formula = selectFormula(tone, colon.role);
    const recitingDegree = selectReciting(tone, colon.role);
    const syllables = fitColon(colon.words, formula, recitingDegree, tone.intonation, {
      isFirstColonOfFirstVerse: isFirstVerseOfPsalm && index === 0,
    });
    return { role: colon.role, syllables };
  });
}
