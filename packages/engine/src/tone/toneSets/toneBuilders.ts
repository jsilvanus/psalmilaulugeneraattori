import type {
  AccentPoint,
  CadenceFormula,
  Differentia,
  ScaleDegree,
  ToneFormula,
} from '../types.js';

/**
 * Shared, terse constructors for writing ToneSet data (see
 * catholicGregorian.ts and finnishGregorian.ts) as plain ScaleDegree
 * numbers instead of nested `{ degree: N }` objects everywhere.
 */

export function note(degree: ScaleDegree): { degree: ScaleDegree } {
  return { degree };
}

export function accentPoint(
  preparatory: ScaleDegree[],
  accentNote: ScaleDegree,
  postAccent: ScaleDegree[],
): AccentPoint {
  return {
    preparatory: preparatory.map(note),
    accentNote: note(accentNote),
    postAccent: postAccent.map(note),
  };
}

export function cadence(
  preparatory: ScaleDegree[],
  accentNote: ScaleDegree,
  postAccent: ScaleDegree[],
  secondaryAccent?: AccentPoint,
): CadenceFormula {
  return { ...accentPoint(preparatory, accentNote, postAccent), secondaryAccent };
}

export function differentia(
  label: string | undefined,
  preparatory: ScaleDegree[],
  accentNote: ScaleDegree,
  postAccent: ScaleDegree[],
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
    intonation: spec.intonation?.map(note),
    flex: spec.flex,
    mediant: spec.mediant,
    termination: spec.termination,
  };
}
