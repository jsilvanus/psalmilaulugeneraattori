/**
 * Generic cadence shapes, shared between the monophonic (types.ts) and
 * chordal (chordTypes.ts) tone models. The two traditions' note values
 * differ (a single ScaleDegree vs. a four-voice Chord), but the shape that
 * holds them -- an accent point flanked by preparatory/postAccent notes,
 * optionally with an earlier secondaryAccent, optionally labeled as a named
 * differentia -- is identical, so it's defined once here and specialized by
 * each side via the TNote type parameter. types.ts/chordTypes.ts alias
 * these under their own established names (AccentPoint, ChordAccentPoint,
 * etc.) so nothing consuming those names needs to change.
 */

export interface AccentPointOf<TNote> {
  /** Notes for syllables strictly before the accent, closest-to-accent last. */
  preparatory: TNote[];
  /** The note on the stressed syllable itself. */
  accentNote: TNote;
  /** Notes for the syllables right after this accent, in order. */
  postAccent: TNote[];
}

export interface CadenceFormulaOf<TNote> extends AccentPointOf<TNote> {
  /**
   * An earlier accent point, used only when the colon has a second
   * stressed syllable within the region that would otherwise sit on the
   * plain reciting tone/chord (i.e. before this accent's own preparatory
   * notes). Real psalm-tone books give some cadences two accent positions
   * this way, to accommodate verses with an extra early stress; when the
   * colon has no stressed syllable there, or the formula doesn't define
   * one, that region just stays on the reciting tone/chord as usual.
   */
  secondaryAccent?: AccentPointOf<TNote>;
}

/**
 * One named termination ending. Traditions give a single tone several such
 * endings ("differentiae") -- the choir picks whichever one hands off
 * smoothly into whatever follows -- so a tone's terminations are always a
 * labeled collection, never a single fixed cadence. `label` is optional
 * only so hand-written/custom tone JSON isn't forced to name each ending.
 */
export interface DifferentiaOf<TNote> extends CadenceFormulaOf<TNote> {
  /** Chant-book identifier for this ending (e.g. "a", "b", "D", "1"). */
  label?: string;
}
