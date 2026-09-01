import type {
  Chord,
  ChordAccentPoint,
  ChordCadenceFormula,
  ChordDifferentia,
  ChordToneFormula,
} from '../chordTypes.js';

/**
 * Terse constructors for writing ChordToneSet data as plain [S,A,T,B]
 * tuples instead of nested Chord objects everywhere -- the chordal
 * counterpart of toneBuilders.ts.
 */

export function chord(soprano: number, alto: number, tenor: number, bass: number): Chord {
  return { soprano, alto, tenor, bass };
}

export function chordNote(c: Chord) {
  return { chord: c };
}

export function chordAccentPoint(
  preparatory: Chord[],
  accentNote: Chord,
  postAccent: Chord[],
): ChordAccentPoint {
  return {
    preparatory: preparatory.map(chordNote),
    accentNote: chordNote(accentNote),
    postAccent: postAccent.map(chordNote),
  };
}

export function chordCadence(
  preparatory: Chord[],
  accentNote: Chord,
  postAccent: Chord[],
  secondaryAccent?: ChordAccentPoint,
): ChordCadenceFormula {
  return { ...chordAccentPoint(preparatory, accentNote, postAccent), secondaryAccent };
}

export function chordDifferentia(
  label: string | undefined,
  preparatory: Chord[],
  accentNote: Chord,
  postAccent: Chord[],
  secondaryAccent?: ChordAccentPoint,
): ChordDifferentia {
  return { label, ...chordCadence(preparatory, accentNote, postAccent, secondaryAccent) };
}

export interface ChordToneSpec {
  id: string;
  name: string;
  reciting: Chord;
  secondReciting?: Chord;
  intonation?: Chord[];
  flex?: ChordCadenceFormula;
  mediant: ChordCadenceFormula;
  termination: ChordDifferentia[];
}

export function buildChordTone(spec: ChordToneSpec): ChordToneFormula {
  return {
    id: spec.id,
    name: spec.name,
    reciting: spec.reciting,
    secondReciting: spec.secondReciting,
    intonation: spec.intonation?.map(chordNote),
    flex: spec.flex,
    mediant: spec.mediant,
    termination: spec.termination,
  };
}
