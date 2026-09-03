import type { ToneFormula, ToneSet } from '../types.js';
import { buildTone, cadence, differentia } from './toneBuilders.js';

/*
 * DATA SOURCE:
 *
 * Transcribed by the project owner from the Evangelical Lutheran Church of
 * Finland's Kirkkokäsikirja I (Jumalanpalvelusten kirja, 2000), "Musiikkia
 * psalmeihin" / "Muita psalmisävelmiä" (pp. 389+) -- see
 * refs/jpkirja-musiikkia-psalmeihin.pdf. These 13 tones are a separate,
 * numbered collection alongside the 8 Gregorian-style tones + peregrinus +
 * irregularis in finnishGregorian.ts: they are not tied to the 8 church
 * modes, each has exactly one termination ending (no named differentiae),
 * and -- per the project owner -- use only a single accent per cadence
 * (no secondaryAccent), unlike some of the Gregorian-style set.
 *
 * TRANSCRIPTION NOTATION differs slightly from finnishGregorian.ts's: the
 * project owner used a trailing underscore (e.g. "d_") instead of
 * parentheses (e.g. "(d)") to mark an elidable/optional note, purely for
 * speed of dictation -- it carries the same meaning, and (as with the
 * parenthesized notes elsewhere) is folded into the plain preparatory/
 * postAccent sequence here, since the data model has no separate concept
 * of "optional".
 *
 * DEGREE ANCHORING: unlike the 8 Gregorian-style tones, no modal "final"
 * was given or implied for these (they aren't identified by church mode/
 * final at all) -- the source book presumably writes each on its own
 * staff position, but that wasn't dictated. Degrees here are computed on
 * a fixed diatonic letter cycle (C=0, D=1, E=2, F=3, G=4, A=5, H=B=6 --
 * H/B share a slot, since accidental doesn't affect scale-degree count,
 * per the same convention as finnishGregorian.ts), then shifted per tone
 * so its lowest note is degree 0. This keeps every tone's internal note
 * relationships correct (which is all `final: 0` actually guarantees --
 * see ToneFormula.final's doc comment -- nothing downstream reads a
 * tone's `final` for anything beyond that), but it is NOT necessarily
 * each tune's true chant-theoretical final; treat `final: 0` here as a
 * bookkeeping anchor, not a confirmed modal fact.
 *
 * KEY SIGNATURES (not yet modelled): several of these are written with a
 * key signature in the source (flats and/or SHARPS -- ToneFormula only
 * has a single `hasBFlat` flag today, with no sharps support at all).
 * The project owner has said they'll explain their typesetting convention
 * for this later ("they are usually typeset in a certain way ... note
 * that it needs to be added"), so none of that is encoded below; see the
 * per-tone comments for what was stated. This affects the accidental
 * only, not the diatonic scale-degree numbers used here.
 *
 * OPEN ITEMS:
 *   - Tones 8 and 9 each have a 4-voice (SATB) variant mentioned but not
 *     yet transcribed.
 *   - Tone 5's key signature ("one b") and tone 7's termination reciting
 *     note ("H?") were flagged by the transcriber as uncertain -- see the
 *     per-tone comments. Neither affects the scale-degree values used
 *     here (H and B share a degree), only the (unmodelled) accidental.
 *   - No intonation was dictated for tones 1-10 and 13 (unlike tone 7 in
 *     finnishGregorian.ts, this wasn't explicitly confirmed absent).
 *
 * WORK IN PROGRESS: only as many tones as have been transcribed so far
 * are included below.
 */

const tones: ToneFormula[] = [
  buildTone({
    id: 'muita-1',
    name: 'Muu psalmisävelmä 1',
    reciting: 1, // D
    secondReciting: 2, // E
    mediant: cadence([1, 0], 1, [1, 1]), // D c d/ (d) d
    termination: [differentia(undefined, [2, 3, 4], 1, [2, 2])], // E f g d/ (e) e
  }),
  buildTone({
    id: 'muita-2',
    name: 'Muu psalmisävelmä 2',
    reciting: 4, // A
    secondReciting: 3, // G
    mediant: cadence([4, 3], 4, [1, 1]), // A g a/ (e) e
    termination: [differentia(undefined, [3, 1, 0], 1, [1, 1])], // G e d e/ (e) e
  }),
  buildTone({
    id: 'muita-3',
    name: 'Muu psalmisävelmä 3',
    reciting: 3, // G (same for mediant and termination)
    mediant: cadence([3, 0], 2, [2, 1]), // G d f/ (f) e
    termination: [differentia(undefined, [3, 1, 3], 4, [4, 3])], // G e g a/ (a) g
  }),
  buildTone({
    id: 'muita-4',
    name: 'Muu psalmisävelmä 4',
    reciting: 2, // E
    secondReciting: 3, // F
    mediant: cadence([2, 1], 2, [0, 0]), // E d e/ (c) c
    termination: [differentia(undefined, [3, 2, 0], 1, [1, 1])], // F e c d/ (d) d
  }),
  buildTone({
    id: 'muita-5',
    name: 'Muu psalmisävelmä 5',
    // Key signature "one b" noted, but the transcriber wasn't sure how to
    // read it -- not modelled (see file header); doesn't affect the
    // degree numbers below.
    reciting: 4, // A
    secondReciting: 3, // G
    mediant: cadence([4, 2], 1, [1, 1]), // A f e/ (e) e
    termination: [differentia(undefined, [3, 2, 3], 1, [1, 0])], // G f g e/ (e) d
  }),
  buildTone({
    id: 'muita-6',
    name: 'Muu psalmisävelmä 6',
    // Key signature "one #" noted -- not modelled (no sharps support; see
    // file header).
    reciting: 1, // E
    secondReciting: 3, // G
    mediant: cadence([1, 2], 3, [3, 2]), // E f g/ (g) f
    termination: [differentia(undefined, [3, 2, 0], 2, [2, 1])], // G f d f/ (f) e
  }),
  buildTone({
    id: 'muita-7',
    name: 'Muu psalmisävelmä 7',
    // Key signature "one #" noted -- not modelled (see file header). The
    // termination's reciting note was dictated as "H?" -- transcriber
    // unsure of the exact pitch; doesn't affect the degree value used
    // here (H and B share a scale degree regardless of accidental).
    reciting: 2, // G
    secondReciting: 4, // H(?)
    mediant: cadence([2, 3], 1, [1, 1]), // G a f/ (f) f
    termination: [differentia(undefined, [4, 3, 4], 0, [1, 1])], // H? a h e/ (f) f
  }),
  buildTone({
    id: 'muita-8',
    name: 'Muu psalmisävelmä 8',
    // Key signature "two ##" noted -- not modelled (see file header). Has
    // a 4-voice (SATB) variant not yet transcribed.
    reciting: 0, // D
    secondReciting: 1, // E
    mediant: cadence([0, 1], 2, [2, 2]), // D e f/ (f) f
    termination: [differentia(undefined, [1, 3, 2], 1, [1, 1])], // E g f e/ (e) e
  }),
  buildTone({
    id: 'muita-9',
    name: 'Muu psalmisävelmä 9',
    // Key signature "two ##" noted -- not modelled (see file header). Has
    // a 4-voice (SATB) variant not yet transcribed.
    reciting: 2, // F
    secondReciting: 4, // A
    mediant: cadence([2, 1], 2, [2, 2]), // F e f/ (f) f
    termination: [differentia(undefined, [4, 2, 0], 1, [1, 1])], // A f d e/ (e) e
  }),
  buildTone({
    id: 'muita-10',
    name: 'Muu psalmisävelmä 10',
    // Key signature "three b" noted -- not modelled (see file header).
    reciting: 2, // G
    secondReciting: 3, // A
    mediant: cadence([2, 0], 1, [1, 1]), // G e f/ (f) f
    termination: [differentia(undefined, [3, 2, 3], 1, [2, 2])], // A g a f/ (g) g
  }),
  buildTone({
    id: 'muita-11',
    name: 'Muu psalmisävelmä 11',
    reciting: 4, // A (same for mediant and termination)
    intonation: [0, 1], // f g
    mediant: cadence([4, 3], 5, [4, 4]), // A g b/ (a) a
    termination: [differentia(undefined, [4, 3, 2], 3, [0, 0])], // A g f g/ (d) d
  }),
  buildTone({
    id: 'muita-12',
    name: 'Muu psalmisävelmä 12',
    reciting: 2, // A (same for mediant and termination)
    intonation: [0, 1], // f g
    mediant: cadence([], 2, []), // A -- bare reciting tone, no cadence figure
    termination: [differentia(undefined, [2, 3], 1, [0, 0])], // A b g/ (f) f
  }),
  buildTone({
    id: 'muita-13',
    name: 'Muu psalmisävelmä 13',
    reciting: 3, // F (same for mediant and termination)
    // Mediant's postAccent has no elided note (dictated as plain "g g",
    // unlike every other tone here) -- as given, not an omission.
    mediant: cadence([3, 4, 5], 4, [4, 4]), // F g a g/ g g
    termination: [differentia(undefined, [3, 2, 0], 1, [1, 1])], // F e c d/ (d) d
  }),
];

/** Looks up one of these numbered tones by its number (1-13). */
export function getFinnishOtherTone(number: number): ToneFormula {
  const tone = tones.find((t) => t.id === `muita-${number}`);
  if (!tone) {
    throw new Error(
      `No "muita" tone number ${number} -- not yet transcribed from the Kirkkokäsikirja.`,
    );
  }
  return tone;
}

export const finnishOtherToneSet: ToneSet = {
  id: 'finnish-other',
  name: 'Muita suomalaisia psalmisävelmiä (Kirkkokäsikirja)',
  tones,
  // Unlike finnishGregorian.ts, these 13 tones are selected by their own
  // number (1-13), not by ChurchMode -- see getFinnishOtherTone.
  defaultToneForMode(mode) {
    throw new Error(
      `Tone set "${this.id}" is not organized by church mode -- its tones are picked by number (see getFinnishOtherTone), mode ${mode} does not apply.`,
    );
  },
};
