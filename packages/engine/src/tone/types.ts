export type ScaleDegree = number;

/**
 * An accidental applied to one note, independent of the tune's own key
 * signature (see `ToneFormula.hasBFlat`) -- e.g. a courtesy or cadential
 * sharp/natural that doesn't belong to the tune's overall signature.
 */
export type Accidental = 'sharp' | 'flat' | 'natural';

export interface CadenceNote {
  degree: ScaleDegree;
  /** Only set where a note needs an accidental beyond the tune's key signature. */
  accidental?: Accidental;
}

/**
 * An accent point within a cadence: the note for one stressed syllable,
 * flanked by preparatory notes (just before it) and postAccent notes
 * (trailing unstressed syllables right after it, before the next accent
 * or the reciting tone takes over).
 */
export interface AccentPoint {
  /** Notes for syllables strictly before the accent, closest-to-accent last. */
  preparatory: CadenceNote[];
  /** The note on the stressed syllable itself. */
  accentNote: CadenceNote;
  /** Notes for the syllables right after this accent, in order. */
  postAccent: CadenceNote[];
}

export interface CadenceFormula extends AccentPoint {
  /**
   * An earlier accent point, used only when the colon has a second
   * stressed syllable within the region that would otherwise sit on the
   * plain reciting tone (i.e. before this accent's own preparatory notes).
   * Real psalm-tone books -- both Catholic and Finnish -- give some
   * cadences two accent positions this way, to accommodate verses with an
   * extra early stress; when the colon has no stressed syllable there, or
   * the formula doesn't define one, that region just stays on the
   * reciting tone as usual.
   */
  secondaryAccent?: AccentPoint;
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
