import type {
  Chord,
  ChordAccentPoint,
  ChordCadenceFormula,
  ChordCadenceNote,
  ChordDifferentia,
  ChordToneFormula,
  VoiceAccidentals,
} from '../chordTypes.js';

/**
 * Terse constructors for writing ChordToneSet data as plain [S,A,T,B]
 * tuples instead of nested Chord objects everywhere -- the chordal
 * counterpart of toneBuilders.ts.
 */

export function chord(soprano: number, alto: number, tenor: number, bass: number): Chord {
  return { soprano, alto, tenor, bass };
}

export function chordNote(c: Chord, accidental?: VoiceAccidentals): ChordCadenceNote {
  return accidental ? { chord: c, accidental } : { chord: c };
}

/**
 * A cadence-array element: either a plain Chord (the common case), or a
 * ChordCadenceNote when that particular chord needs a per-voice accidental
 * (see anglicanChant.ts's mediant preparatory chord for a real example).
 */
type ChordNoteInput = Chord | ChordCadenceNote;

function normalizeChordNote(input: ChordNoteInput): ChordCadenceNote {
  return 'chord' in input ? input : chordNote(input);
}

export function chordAccentPoint(
  preparatory: ChordNoteInput[],
  accentNote: ChordNoteInput,
  postAccent: ChordNoteInput[],
): ChordAccentPoint {
  return {
    preparatory: preparatory.map(normalizeChordNote),
    accentNote: normalizeChordNote(accentNote),
    postAccent: postAccent.map(normalizeChordNote),
  };
}

export function chordCadence(
  preparatory: ChordNoteInput[],
  accentNote: ChordNoteInput,
  postAccent: ChordNoteInput[],
  secondaryAccent?: ChordAccentPoint,
): ChordCadenceFormula {
  return { ...chordAccentPoint(preparatory, accentNote, postAccent), secondaryAccent };
}

export function chordDifferentia(
  label: string | undefined,
  preparatory: ChordNoteInput[],
  accentNote: ChordNoteInput,
  postAccent: ChordNoteInput[],
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
  /** Double-chant link -- see ChordToneFormula.nextStrain. */
  nextStrain?: string;
}

export function buildChordTone(spec: ChordToneSpec): ChordToneFormula {
  return {
    id: spec.id,
    name: spec.name,
    reciting: spec.reciting,
    secondReciting: spec.secondReciting,
    intonation: spec.intonation?.map((c) => chordNote(c)),
    flex: spec.flex,
    mediant: spec.mediant,
    termination: spec.termination,
    nextStrain: spec.nextStrain,
  };
}
