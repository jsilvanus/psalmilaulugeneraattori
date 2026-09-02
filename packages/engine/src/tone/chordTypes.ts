import type { AccentPointOf, CadenceFormulaOf, DifferentiaOf } from './cadence.js';
import type { Accidental, ScaleDegree } from './types.js';

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

export type VoiceName = 'soprano' | 'alto' | 'tenor' | 'bass';

/** Per-voice accidentals for one chord, beyond the tune's own key signature. */
export type VoiceAccidentals = Partial<Record<VoiceName, Accidental>>;

export interface ChordCadenceNote {
  chord: Chord;
  /** Only set where one or more voices need an accidental for this chord. */
  accidental?: VoiceAccidentals;
}

/**
 * One accent point for a homophonic chordal cadence -- the same generic
 * shape as AccentPoint in types.ts (see cadence.ts's AccentPointOf), just
 * specialized to chord-valued notes instead of single degrees. Both sides
 * share the one fitting algorithm in fitCore.ts.
 */
export type ChordAccentPoint = AccentPointOf<ChordCadenceNote>;

export type ChordCadenceFormula = CadenceFormulaOf<ChordCadenceNote>;

/** Chordal counterpart of Differentia in types.ts -- see cadence.ts's DifferentiaOf. */
export type ChordDifferentia = DifferentiaOf<ChordCadenceNote>;

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
