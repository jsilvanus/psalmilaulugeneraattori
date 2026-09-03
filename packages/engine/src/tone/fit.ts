import type { Word } from '../phonology/types.js';
import type { ColonRole } from '../text/types.js';
import type { CadenceFormula, CadenceNote, ScaleDegree, ToneFormula } from './types.js';
import {
  fitColonGeneric,
  repeatLastPostAccent,
  type ColonInput,
  type FitColonOptions,
  type PitchedColonOf,
  type PitchedSyllableOf,
} from './fitCore.js';

export type PitchedSyllable = PitchedSyllableOf<CadenceNote>;
export type PitchedColon = PitchedColonOf<CadenceNote>;
export type { ColonInput, FitColonOptions };

/**
 * The classical psalm-tone "pointing" algorithm: the reciting note carries
 * everything up to the last stressed syllable of the colon, then the
 * cadence formula's notes align to that stressed syllable (the anchor) and
 * whatever unstressed syllables follow it. When the formula also defines a
 * `secondaryAccent` and the colon has an earlier stressed syllable in the
 * region that would otherwise be plain reciting tone, that region gets its
 * own accent point the same way, recursively. See fitCore.ts for the
 * shared implementation (also used by fitChord.ts's chordal counterpart);
 * this wrapper just supplies the Gregorian/Finnish excess-syllable rule
 * (repeatLastPostAccent) and wraps the bare reciting degree as a note.
 */
export function fitColon(
  words: Word[],
  formula: CadenceFormula,
  recitingDegree: ScaleDegree,
  intonation: CadenceNote[] | undefined,
  options: FitColonOptions = {},
): PitchedSyllable[] {
  return fitColonGeneric(
    words,
    formula,
    { degree: recitingDegree },
    intonation,
    repeatLastPostAccent,
    options,
  );
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
