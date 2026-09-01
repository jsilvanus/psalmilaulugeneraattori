import type { ScaleDegree } from './types.js';

/**
 * Anglican chant is four-part harmony (SATB), homophonic: all four voices
 * move together, one chord per syllable, unlike the single-line Gregorian
 * tone formulas in types.ts. A Chord is just one scale degree per voice --
 * each voice's own degree, not tied to a shared "final=0" the way a modal
 * chant tone is, since each voice has its own natural resting pitch.
 */
export interface Chord {
  soprano: ScaleDegree;
  alto: ScaleDegree;
  tenor: ScaleDegree;
  bass: ScaleDegree;
}

export interface ChordCadenceNote {
  chord: Chord;
}

/**
 * One accent point for a homophonic chordal cadence -- same shape as
 * AccentPoint in types.ts (preparatory/accentNote/postAccent), just
 * chord-valued. Kept as a deliberate, separate mirror of the monophonic
 * types rather than a generic rewrite of them: the two note shapes (one
 * degree vs. four) are different enough that sharing code isn't worth the
 * indirection, and this keeps the existing single-line tone sets
 * completely unaffected.
 */
export interface ChordAccentPoint {
  preparatory: ChordCadenceNote[];
  accentNote: ChordCadenceNote;
  postAccent: ChordCadenceNote[];
}

export interface ChordCadenceFormula extends ChordAccentPoint {
  /** An earlier accent point -- see CadenceFormula.secondaryAccent in types.ts. */
  secondaryAccent?: ChordAccentPoint;
}

export interface ChordDifferentia extends ChordCadenceFormula {
  /** Chant-book identifier for this ending (e.g. "1", "2"). */
  label?: string;
}

export interface ChordToneFormula {
  id: string;
  name: string;
  reciting: Chord;
  /** Only for tones that recite on a different chord for the termination than the mediant. */
  secondReciting?: Chord;
  intonation?: ChordCadenceNote[];
  flex?: ChordCadenceFormula;
  mediant: ChordCadenceFormula;
  termination: ChordDifferentia[];
}

/** A named collection of ChordToneFormulas -- the chordal counterpart of ToneSet in types.ts. */
export interface ChordToneSet {
  id: string;
  name: string;
  tones: ChordToneFormula[];
}
