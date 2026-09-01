export type ScaleDegree = number;

export interface CadenceNote {
  degree: ScaleDegree;
}

export interface CadenceFormula {
  /** Notes for syllables strictly before the accent, closest-to-accent last. */
  preparatory: CadenceNote[];
  /** The note on the colon's last stressed syllable. */
  accentNote: CadenceNote;
  /** Notes for the colon's trailing unstressed syllables, in order. */
  postAccent: CadenceNote[];
}

/**
 * One named termination ending. Both the Catholic/Gregorian and Finnish
 * Lutheran traditions give a single tone several such endings ("differentiae")
 * -- the choir picks whichever one hands off smoothly into the antiphon that
 * follows -- so a tone's terminations are always a labeled collection, never
 * a single fixed cadence. `label` is optional only so hand-written/custom
 * tone JSON (see the web UI's "Custom (JSON)" tone option) isn't forced to
 * name each ending.
 */
export interface Differentia extends CadenceFormula {
  /** Chant-book identifier for this ending (e.g. "a", "b", "D"). */
  label?: string;
}

export type ChurchMode = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface ToneFormula {
  id: string;
  name: string;
  /** Diatonic scale degree of the tone's final; 0 by construction. */
  final: ScaleDegree;
  /** Tenor/reciting-note degree, relative to `final`. */
  reciting: ScaleDegree;
  /**
   * Only tonus peregrinus (among the classic 8 + peregrinus) recites on a
   * different note for the verse's second half than its first; when set,
   * this degree is used instead of `reciting` for the termination colon.
   */
  secondReciting?: ScaleDegree;
  /** Whether this tone conventionally uses a B-flat (tones 5/6-style signature). */
  hasBFlat?: boolean;
  /** Notes prepended only to the very first colon of a psalm's first verse. */
  intonation?: CadenceNote[];
  /** Only present for tones used on tripartite verses. */
  flex?: CadenceFormula;
  mediant: CadenceFormula;
  /** One or more named differentiae (endings); index 0 is the default. */
  termination: Differentia[];
}

/**
 * A named collection of ToneFormulas representing one tradition (e.g.
 * Catholic/Gregorian vs. Finnish Lutheran). Nothing outside this module may
 * assume a specific ToneSet's contents or the standard Gregorian layout —
 * fit.ts, gabc.ts, and abc.ts only ever consume ToneFormula values.
 */
export interface ToneSet {
  id: string;
  name: string;
  tones: ToneFormula[];
  defaultToneForMode: (mode: ChurchMode) => ToneFormula;
}
