import type { Word } from '../phonology/types.js';
import type { ColonRole } from '../text/types.js';
import type {
  Chord,
  ChordAccentPoint,
  ChordCadenceFormula,
  ChordCadenceNote,
  ChordToneFormula,
} from './chordTypes.js';

export interface PitchedChordSyllable {
  text: string;
  /** Usually one chord; more than one only when a short colon forces a small melisma. */
  chords: Chord[];
  isWordStart: boolean;
}

export interface PitchedChordColon {
  role: ColonRole;
  syllables: PitchedChordSyllable[];
}

export interface ChordColonInput {
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
 * Chordal counterpart of applyAccent in fit.ts -- identical algorithm,
 * chord-valued. See fit.ts for the rationale of each step.
 */
function applyChordAccent(
  result: PitchedChordSyllable[],
  syllables: FlatSyllable[],
  rangeEnd: number,
  anchor: number,
  point: ChordAccentPoint,
): number {
  const trailing = syllables.slice(anchor + 1, rangeEnd);
  const expectedPost = point.postAccent;
  if (trailing.length === expectedPost.length) {
    trailing.forEach((_, i) => {
      result[anchor + 1 + i]!.chords.push(expectedPost[i]!.chord);
    });
  } else if (trailing.length < expectedPost.length) {
    const deficit = expectedPost.length - trailing.length;
    result[anchor]!.chords.push(...expectedPost.slice(0, deficit).map((n) => n.chord));
    trailing.forEach((_, i) => {
      result[anchor + 1 + i]!.chords.push(expectedPost[deficit + i]!.chord);
    });
  } else {
    // More trailing syllables than this cadence defines postAccent notes
    // for. Per the Anglican-chant convention (see refs/README.md's
    // "Anglican chant" section, quoting the source book directly): the
    // *excess* syllables -- the ones right after the accent -- extend the
    // accent's own held note, while the notes actually written stay
    // anchored to the true end of the colon. E.g. a 2-note cadence
    // (accent + one postAccent note) fitting 3 trailing syllables sings
    // the first two on the accent's note and only the last on the second
    // note -- not (as a naive "repeat the last note" rule would give) the
    // last two both on the second note.
    const excess = trailing.length - expectedPost.length;
    trailing.forEach((_, i) => {
      const chord = i < excess ? point.accentNote.chord : expectedPost[i - excess]!.chord;
      result[anchor + 1 + i]!.chords.push(chord);
    });
  }

  result[anchor]!.chords.unshift(point.accentNote.chord);

  const beforeAnchor = anchor;
  const prep = point.preparatory;

  if (beforeAnchor >= prep.length) {
    const recitingCount = beforeAnchor - prep.length;
    for (let i = 0; i < prep.length; i++) {
      result[recitingCount + i]!.chords.push(prep[i]!.chord);
    }
    return recitingCount;
  }
  const startIdx = prep.length - beforeAnchor;
  for (let i = 0; i < beforeAnchor; i++) {
    result[i]!.chords.push(prep[startIdx + i]!.chord);
  }
  return 0;
}

export interface FitChordColonOptions {
  isFirstColonOfFirstVerse?: boolean;
}

/**
 * Chordal counterpart of fitColon in fit.ts -- the same "pointing"
 * algorithm (reciting chord for the bulk of the colon, cadence chords
 * aligned to the last stressed syllable and what follows, an optional
 * earlier secondaryAccent), just chord-valued throughout. See fit.ts for
 * the full rationale.
 */
export function fitChordColon(
  words: Word[],
  formula: ChordCadenceFormula,
  recitingChord: Chord,
  intonation: ChordCadenceNote[] | undefined,
  options: FitChordColonOptions = {},
): PitchedChordSyllable[] {
  const syllables = flattenWords(words);
  if (syllables.length === 0) return [];

  const result: PitchedChordSyllable[] = syllables.map((s) => ({
    text: s.text,
    chords: [],
    isWordStart: s.isWordStart,
  }));

  const anchor = findLastStressedIndex(syllables, syllables.length);
  const primaryAnchor = anchor === -1 ? syllables.length - 1 : anchor;
  let recitingCount = applyChordAccent(result, syllables, syllables.length, primaryAnchor, formula);

  if (formula.secondaryAccent && recitingCount > 0) {
    const secondaryAnchor = findLastStressedIndex(syllables, recitingCount);
    if (secondaryAnchor !== -1) {
      recitingCount = applyChordAccent(
        result,
        syllables,
        recitingCount,
        secondaryAnchor,
        formula.secondaryAccent,
      );
    }
  }

  for (let i = 0; i < recitingCount; i++) {
    result[i]!.chords.push(recitingChord);
  }

  if (options.isFirstColonOfFirstVerse && intonation && intonation.length > 0) {
    const count = Math.min(intonation.length, primaryAnchor);
    for (let i = 0; i < count; i++) {
      result[i]!.chords = [intonation[i]!.chord];
    }
  }

  return result;
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
