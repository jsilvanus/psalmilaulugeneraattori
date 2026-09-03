import type {
  AccentPoint,
  Accidental,
  CadenceFormula,
  CadenceNote,
  Differentia,
  ScaleDegree,
  ToneFormula,
} from '../types.js';

/**
 * Shared, terse constructors for writing ToneSet data (see
 * catholicGregorian.ts and finnishGregorian.ts) as plain ScaleDegree
 * numbers instead of nested `{ degree: N }` objects everywhere.
 */

export function note(degree: ScaleDegree, accidental?: Accidental): CadenceNote {
  return accidental ? { degree, accidental } : { degree };
}

/**
 * A cadence-array element: either a plain ScaleDegree (the common case), or
 * an already-built CadenceNote when that particular note needs an
 * accidental (mirrors chordBuilders.ts's ChordNoteInput/normalizeChordNote,
 * the chordal counterpart of this pattern).
 */
type CadenceNoteInput = ScaleDegree | CadenceNote;

function normalizeCadenceNote(input: CadenceNoteInput): CadenceNote {
  return typeof input === 'number' ? note(input) : input;
}

/**
 * Marks a cadence-array element (a bare degree or an already-built
 * CadenceNote) as carrying an augmentation ("mora") dot -- see
 * CadenceNote.dotted.
 */
export function dot(input: CadenceNoteInput): CadenceNote {
  return { ...normalizeCadenceNote(input), dotted: true };
}

export function accentPoint(
  preparatory: CadenceNoteInput[],
  accentNote: CadenceNoteInput,
  postAccent: CadenceNoteInput[],
): AccentPoint {
  return {
    preparatory: preparatory.map(normalizeCadenceNote),
    accentNote: normalizeCadenceNote(accentNote),
    postAccent: postAccent.map(normalizeCadenceNote),
  };
}

export function cadence(
  preparatory: CadenceNoteInput[],
  accentNote: CadenceNoteInput,
  postAccent: CadenceNoteInput[],
  secondaryAccent?: AccentPoint,
): CadenceFormula {
  return { ...accentPoint(preparatory, accentNote, postAccent), secondaryAccent };
}

export function differentia(
  label: string | undefined,
  preparatory: CadenceNoteInput[],
  accentNote: CadenceNoteInput,
  postAccent: CadenceNoteInput[],
  secondaryAccent?: AccentPoint,
): Differentia {
  return { label, ...cadence(preparatory, accentNote, postAccent, secondaryAccent) };
}

export interface ToneSpec {
  id: string;
  name: string;
  reciting: ScaleDegree;
  secondReciting?: ScaleDegree;
  hasBFlat?: boolean;
  intonation?: ScaleDegree[];
  flex?: CadenceFormula;
  mediant: CadenceFormula;
  termination: Differentia[];
}

export function buildTone(spec: ToneSpec): ToneFormula {
  return {
    id: spec.id,
    name: spec.name,
    final: 0,
    reciting: spec.reciting,
    secondReciting: spec.secondReciting,
    hasBFlat: spec.hasBFlat,
    intonation: spec.intonation?.map((d) => note(d)),
    flex: spec.flex,
    mediant: spec.mediant,
    termination: spec.termination,
  };
}
