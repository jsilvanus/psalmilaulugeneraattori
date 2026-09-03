import type { Word } from '../phonology/types.js';
import type { ColonRole } from '../text/types.js';
import type {
  Chord,
  ChordCadenceFormula,
  ChordCadenceNote,
  ChordToneFormula,
} from './chordTypes.js';
import {
  extendAccentNote,
  fitColonGeneric,
  type ColonInput,
  type FitColonOptions,
} from './fitCore.js';

export interface PitchedChordSyllable {
  text: string;
  /** Usually one chord; more than one only when a short colon forces a small melisma. */
  chords: ChordCadenceNote[];
  isWordStart: boolean;
}

export interface PitchedChordColon {
  role: ColonRole;
  syllables: PitchedChordSyllable[];
}

export type ChordColonInput = ColonInput;
export type FitChordColonOptions = FitColonOptions;

/**
 * Chordal counterpart of fitColon in fit.ts -- the same "pointing"
 * algorithm (reciting chord for the bulk of the colon, cadence chords
 * aligned to the last stressed syllable and what follows, an optional
 * earlier secondaryAccent), just chord-valued throughout, via the shared
 * implementation in fitCore.ts. The one genuine difference from fit.ts is
 * the excess-trailing-syllable rule -- extendAccentNote, the Anglican-chant
 * convention (see fitCore.ts's own doc comment and refs/README.md).
 * fitCore.ts's generic result calls this field `notes`; renamed to `chords`
 * here since that's this module's own established, public field name.
 */
export function fitChordColon(
  words: Word[],
  formula: ChordCadenceFormula,
  recitingChord: Chord,
  intonation: ChordCadenceNote[] | undefined,
  options: FitChordColonOptions = {},
): PitchedChordSyllable[] {
  const syllables = fitColonGeneric(
    words,
    formula,
    { chord: recitingChord },
    intonation,
    extendAccentNote,
    options,
  );
  return syllables.map((s) => ({ text: s.text, chords: s.notes, isWordStart: s.isWordStart }));
}

function selectFormula(
  tone: ChordToneFormula,
  role: ColonRole,
  differentiaIndex: number,
): ChordCadenceFormula {
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

function selectReciting(tone: ChordToneFormula, role: ColonRole): Chord {
  if (role === 'termination' && tone.secondReciting !== undefined) return tone.secondReciting;
  return tone.reciting;
}

/**
 * Fits every colon of a verse (2 or 3 cola) onto the given chordal tone.
 * `differentiaIndex` picks which of the tone's termination endings
 * (differentiae) to use -- defaults to 0, the tone's default ending.
 */
export function fitChordVerse(
  cola: ChordColonInput[],
  tone: ChordToneFormula,
  isFirstVerseOfPsalm: boolean,
  differentiaIndex = 0,
): PitchedChordColon[] {
  return cola.map((colon, index) => {
    const formula = selectFormula(tone, colon.role, differentiaIndex);
    const recitingChord = selectReciting(tone, colon.role);
    const syllables = fitChordColon(colon.words, formula, recitingChord, tone.intonation, {
      isFirstColonOfFirstVerse: isFirstVerseOfPsalm && index === 0,
    });
    return { role: colon.role, syllables };
  });
}
