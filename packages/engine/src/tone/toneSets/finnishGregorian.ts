import type { ToneFormula, ToneSet } from '../types.js';
import { buildTone, cadence, differentia } from './toneBuilders.js';

/*
 * DATA SOURCE:
 *
 * Transcribed by the project owner directly from the Evangelical Lutheran
 * Church of Finland's Kirkkokäsikirja I (Jumalanpalvelusten kirja, 2000),
 * "Musiikkia psalmeihin" / "Gregoriaanisen tyylin mukaiset psalmisävelmät"
 * (pp. 381+) -- see refs/jpkirja-musiikkia-psalmeihin.pdf. This is the
 * Finnish Lutheran tradition's own Gregorian-style psalm tones, distinct
 * from (though related to) the Catholic/Solesmes set in
 * catholicGregorian.ts -- confirmed to differ from it in places (this is
 * not just a re-transcription of the same Liber Usualis data).
 *
 * Unlike catholicGregorian.ts, there was no independent published source to
 * cross-check this transcription against, so it rests on the project
 * owner's own reading of the notation, dictated as note letters + relative
 * position. Real note letters (not GABC-style position letters) were used,
 * so scale degrees here are computed the ordinary way: diatonic distance
 * from each tone's final (C..B cycling, one step per letter).
 *
 * TERMINATION LABELS: the Kirkkokäsikirja labels each tone's termination
 * differentiae by NUMBER (1, 2, 3, ...), not by letter/final-note the way
 * the Liber Usualis does (D/a/g/...).
 *
 * WORK IN PROGRESS: only as many tones/differentiae as have been
 * transcribed so far are included below. Tones/endings not yet here should
 * be added the same way once transcribed, not guessed at.
 */

const tones: ToneFormula[] = [
  buildTone({
    id: 'tonus-1',
    name: 'I sävelmä (doorinen)',
    reciting: 4, // A
    intonation: [2, 3], // f g
    flex: cadence([], 4, [3, 3]), // a/ (g) g
    mediant: cadence([], 3, [4, 4], {
      preparatory: [],
      accentNote: { degree: 5 }, // B/
      postAccent: [{ degree: 4 }, { degree: 4 }], // (a) a
    }),
    termination: [
      differentia('1', [3, 2], 3, [4, 4]), // g f g/ (a) a
      differentia('2', [3, 2], 3, [3, 3]), // g f g/ (g) g
      differentia('3', [3, 2], 4, [3, 3]), // g f a/ (g) g
      differentia('4', [3, 4], 2, [3, 3]), // g a f/ (g) g
      differentia('5', [3, 2, 3], 3, [4, 3]), // g f [(g) ga]/ g
      differentia('6', [3, 2, 3], 3, [4, 3]), // g f [(g) ga]/ g (as dictated -- same shape as "5")
      differentia('7', [3, 2, 3], 3, [4, 4, 3]), // g f [(g) ga]/ ag
      differentia('8', [3, 2, 3], 3, [2, 0]), // g f [(g) gf]/ d
    ],
  }),
  buildTone({
    id: 'tonus-2',
    name: 'II sävelmä (hypodoorinen)',
    reciting: 2, // F
    intonation: [-1, 0], // c d
    flex: cadence([], 2, [0, 0]), // f/ d d
    mediant: cadence([2], 3, [2, 2]), // F g/ (f) f
    termination: [
      differentia('1', [2, 1], -1, [0, 0]), // F e c/ (d) d
      differentia('2', [2, 1, -1], -1, [0, 0]), // F e [(c) cd]/ d
    ],
  }),
  buildTone({
    id: 'tonus-3',
    name: 'III sävelmä (fryyginen)',
    // Reciting on B (not the Solesmes-raised C): the Kirkkokäsikirja here
    // preserves the pre-medieval reciting tone for tone III, unlike the
    // Catholic/Solesmes tradition -- a genuine, confirmed difference, not
    // a transcription error.
    reciting: 4, // H (=B natural)
    intonation: [2, 3], // g a
    flex: cadence([], 4, [3, 3]), // H h/ (a) a
    // Mediant has two accents ("H d/ (c) c [(c) ha]/ c"); the split
    // between the secondary accent's own postAccent and the primary
    // accent's preparatory notes isn't marked explicitly in the dictation
    // -- read here as secondaryAccent absorbing the "(c) c" run in full,
    // leaving the bracket's own internal "(c)" as the primary's one
    // preparatory note. Flagged for a second look.
    mediant: cadence([5], 4, [3, 5], {
      preparatory: [],
      accentNote: { degree: 6 }, // d/
      postAccent: [{ degree: 5 }, { degree: 5 }], // (c) c
    }),
    termination: [
      // H c/ (a) a c/ (c) h
      differentia('1', [], 5, [5, 4], {
        preparatory: [],
        accentNote: { degree: 5 }, // c/ (first)
        postAccent: [{ degree: 3 }, { degree: 3 }], // (a) a
      }),
      // H c/ (a) a c/ (c) ha
      differentia('2', [], 5, [5, 4, 3], {
        preparatory: [],
        accentNote: { degree: 5 },
        postAccent: [{ degree: 3 }, { degree: 3 }],
      }),
      // H c/ (a) ah a/ (g) g -- same ambiguity as the mediant: "ah" (no
      // explicit accent mark) is read here as trailing onto the secondary
      // accent's own postAccent. Flagged for a second look.
      differentia('3', [], 3, [2, 2], {
        preparatory: [],
        accentNote: { degree: 5 }, // c/
        postAccent: [{ degree: 3 }, { degree: 3 }, { degree: 4 }], // (a) ah
      }),
    ],
  }),
  buildTone({
    id: 'tonus-4',
    name: 'IV sävelmä (hypofryyginen)',
    reciting: 3, // A
    intonation: [0, 2], // e g
    flex: cadence([], 3, [2, 2]), // A a/ (g) g
    mediant: cadence([2, 3], 4, [3, 3]), // A g a h/ (a) a
    termination: [
      differentia('1', [2, 3, 4], 2, [0, 0]), // A g a h g/ (e) e
      differentia('2', [2, 3, 4], 2, [3, 3]), // A g a h g/ (a) a
      differentia('3', [], 3, [2, 2]), // A a/ (g) g
      differentia('4', [2, 3, 4, 3, 2], 2, [1, 0]), // A g a ha [(g) gf]/ e
    ],
  }),
  buildTone({
    id: 'tonus-5',
    name: 'V sävelmä (lyydinen)',
    reciting: 4, // C
    intonation: [0, 2], // f a
    flex: cadence([], 4, [2, 2]), // C c/ (a) a
    mediant: cadence([], 5, [4, 4]), // C d/ (c) c
    termination: [
      // C d/ (h) h c/ (a) a
      differentia('1', [], 4, [2, 2], {
        preparatory: [],
        accentNote: { degree: 5 }, // d/
        postAccent: [{ degree: 3 }, { degree: 3 }], // (h) h
      }),
      // C d/ (h) h c/ (a) ag
      differentia('2', [], 4, [2, 2, 1], {
        preparatory: [],
        accentNote: { degree: 5 },
        postAccent: [{ degree: 3 }, { degree: 3 }],
      }),
    ],
  }),
  buildTone({
    id: 'tonus-6',
    name: 'VI sävelmä (hypolyydinen)',
    reciting: 2, // A
    intonation: [0, 1], // f g
    flex: cadence([], 2, [1, 1]), // A a/ (g) g
    mediant: cadence([1], 2, [0, 0]), // A g a/ (f) f
    termination: [
      differentia('1', [0, 1, 2], 1, [0, 0]), // A f ga g/ (f) f
    ],
  }),
  buildTone({
    id: 'tonus-7',
    name: 'VII sävelmä (miksolyydinen)',
    // No intonation for this tone (confirmed) -- omitted, not defaulted.
    reciting: 4, // D
    flex: cadence([], 4, [3, 3]), // D d/ (c) c
    mediant: cadence([], 4, [6, 6], {
      preparatory: [],
      accentNote: { degree: 6 }, // f/
      postAccent: [{ degree: 5 }, { degree: 5 }], // (e) e
    }),
    termination: [
      // D e/ (d) d c/ (c) ha
      differentia('1', [], 3, [3, 2, 1], {
        preparatory: [],
        accentNote: { degree: 5 }, // e/
        postAccent: [{ degree: 4 }, { degree: 4 }], // (d) d
      }),
      // D e/ (d) d c/ (c) hc
      differentia('2', [], 3, [3, 2, 3], {
        preparatory: [],
        accentNote: { degree: 5 },
        postAccent: [{ degree: 4 }, { degree: 4 }],
      }),
      // D e/ (d) d c/ (c) dc
      differentia('3', [], 3, [3, 4, 3], {
        preparatory: [],
        accentNote: { degree: 5 },
        postAccent: [{ degree: 4 }, { degree: 4 }],
      }),
      // D e/ (e) c d/ (d) d -- lone "(e)" read as an echo of the secondary
      // accent's own pitch (as confirmed by "5"/"6" below), leaving "c" as
      // the primary's preparatory note.
      differentia('4', [3], 4, [4, 4], {
        preparatory: [],
        accentNote: { degree: 5 }, // e/
        postAccent: [{ degree: 5 }], // (e)
      }),
      // D c/ (c) a c/ (d) d
      differentia('5', [1], 3, [4, 4], {
        preparatory: [],
        accentNote: { degree: 3 }, // c/ (first)
        postAccent: [{ degree: 3 }], // (c)
      }),
      // D c/ (c) a [(c) cd]/ d
      differentia('6', [1, 3], 3, [4, 4], {
        preparatory: [],
        accentNote: { degree: 3 },
        postAccent: [{ degree: 3 }],
      }),
    ],
  }),
  buildTone({
    id: 'tonus-8',
    name: 'VIII sävelmä (hypomiksolyydinen)',
    reciting: 3, // C
    intonation: [0, 1], // g a
    flex: cadence([], 3, [1, 1]), // C c/ a a
    mediant: cadence([], 4, [3, 3]), // C d/ (c) c
    termination: [
      differentia('1', [2, 3], 1, [0, 0]), // C h c a/ (g) g
      differentia('2', [2, 3], 1, [0, 0, 1]), // C h c a/ (g) ga
      differentia('3', [1, 3], 4, [3, 3]), // C a c d/ (c) c
      differentia('4', [1, 3], 2, [1, 1]), // C a c h/ (a) a
      differentia('5', [1, 2], 0, [1, 1]), // C a h g/ (a) a
      differentia('6', [1, 2, 0], 0, [1, 1]), // C a h [(g) ga]/ a
    ],
  }),
  buildTone({
    id: 'tonus-peregrinus',
    name: 'Tonus peregrinus',
    // No intonation given.
    reciting: 4, // A, for the flex/mediant
    secondReciting: 3, // G, for the termination -- the tone's namesake asymmetry
    flex: cadence([], 4, [3, 3]), // A a/ (g) g
    mediant: cadence([3, 5, 4], 3, [2, 2]), // A g b a g/ (f) f
    termination: [differentia('1', [0], 2, [2, 1, 0])], // G d f/ f ed
  }),
  buildTone({
    id: 'tonus-irregularis',
    name: 'Tonus irregularis',
    // No intonation given (not explicitly confirmed absent, unlike tonus-7
    // -- flagging in case one was just missed).
    reciting: 4, // A
    flex: cadence([], 4, [3, 3]), // A a/ g g
    mediant: cadence([], 3, [2, 2]), // A g/ (f) f
    termination: [
      // A b/ (g) g b/ (a) a
      differentia('1', [], 5, [4, 4], {
        preparatory: [],
        accentNote: { degree: 5 }, // b/ (first)
        postAccent: [{ degree: 3 }, { degree: 3 }], // (g) g
      }),
    ],
  }),
];

export const finnishGregorianToneSet: ToneSet = {
  id: 'finnish-gregorian',
  name: 'Finnish Lutheran / Gregorian style (Kirkkokäsikirja)',
  tones,
  defaultToneForMode(mode) {
    const tone = this.tones.find((t) => t.id === `tonus-${mode}`);
    if (!tone) {
      throw new Error(
        `No default tone for mode ${mode} in tone set "${this.id}" -- not yet transcribed from the Kirkkokäsikirja.`,
      );
    }
    return tone;
  },
};
