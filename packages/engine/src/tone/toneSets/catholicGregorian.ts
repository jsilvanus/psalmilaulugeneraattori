import type { CadenceFormula, ScaleDegree, ToneFormula, ToneSet } from '../types.js';
import {
  accentPoint,
  buildTone as buildToneBase,
  cadence,
  differentia,
  note,
} from './toneBuilders.js';
import type { ToneSpec } from './toneBuilders.js';

/*
 * DATA SOURCE:
 *
 * The mediant and termination (differentia) cadence shapes below are
 * transcribed from real Liber Usualis psalm-tone data -- specifically the
 * `g_tones` table in bbloomf/jgabc (https://github.com/bbloomf/jgabc,
 * `psalmtone.js`), a community-maintained GABC transcription/psalm-pointing
 * tool whose tone data is explicitly sourced from the 1961 Liber Usualis
 * (the same tool GregoBase credits for its own Liber Usualis psalm-tone
 * GABC files). The user separately supplied a PDF excerpt of the same
 * Liber Usualis table (see refs/liber-usualis-psalm-tones.pdf) with
 * matching differentia labels (D/D2/f/g/g2/g3/a/a2/a3 for Tonus I, etc.),
 * cross-confirming the source.
 *
 * CONVERSION METHOD: jgabc's tone strings use real GABC pitch letters
 * (a-m, one diatonic step apart -- the same alphabet output/gabc.ts uses)
 * tokenized exactly as jgabc's own `regexToneGabc` does: space-separated
 * tokens, an optional leading `'` marks the accented (stressed-syllable)
 * note, an optional trailing `r` marks an "open" (elidable/reciting-tone)
 * notehead, and non-pitch characters (x = oriscus, v = scale-run ligature
 * marker, . = mora dot, uppercase = same ligature convention, case-
 * insensitive pitch) are stripped. Each tone's `final` (scale degree 0) is
 * anchored to the LAST pitch of that tone's canonical termination -- for
 * tones with several labeled differentiae, the differentia whose own last
 * note matches the tone's number-name (e.g. Tonus I's "D") anchors it;
 * their other differentiae deliberately end elsewhere, which is the whole
 * point of a differentia (a smooth hand-off into whichever antiphon
 * follows -- see antiphon/toneMatch.ts). The reciting/tenor degree is the
 * pitch shared by that tone's "open"-marked notes. This was cross-checked
 * against tonus peregrinus's well-known asymmetric tenor (A for the first
 * half, G for the second) and independently reproduced it exactly, and
 * against Tonus I/II's well-known tenor-final intervals (a 5th and a 3rd
 * respectively) -- both matched precisely, giving good confidence in the
 * conversion method.
 *
 * Some tones' cadences have two accented tokens in jgabc's data (e.g. Tonus
 * I's mediant: "f gh hr 'ixi hr 'g hr h."), used when the colon has an
 * earlier stressed syllable too -- captured here via `secondaryAccent` (see
 * tone/types.ts), not dropped.
 *
 * NOT YET SOURCED from Liber Usualis: `intonation` (only the very first
 * colon of a psalm's first verse) and `flex` (only tripartite verses) are
 * still a structural placeholder scaled to each tone's reciting note --
 * jgabc's data doesn't carry these the same way, and they weren't in the
 * user-supplied PDF excerpt either. Replace with real sourced values
 * before relying on this for actual liturgical performance.
 */

// Placeholder (not yet sourced from Liber Usualis -- see DATA SOURCE note above).
function genericFlex(reciting: ScaleDegree): CadenceFormula {
  return { preparatory: [], accentNote: note(reciting - 1), postAccent: [] };
}

function buildTone(spec: Omit<ToneSpec, 'intonation' | 'flex'>): ToneFormula {
  return buildToneBase({
    ...spec,
    // Not yet sourced from Liber Usualis -- see DATA SOURCE note above.
    intonation: [spec.reciting - 2, spec.reciting - 1],
    flex: genericFlex(spec.reciting),
  });
}

const tones: ToneFormula[] = [
  buildTone({
    id: 'tonus-1',
    name: 'Tonus I',
    reciting: 4,
    mediant: cadence([], 3, [4, 4], accentPoint([], 5, [5, 4])),
    termination: [
      differentia('D', [3, 2], 3, [4, 3, 3, 2, 1, 0]),
      differentia('D2', [], 3, [2, 0]),
      differentia('f', [3, 2], 3, [4, 3, 3, 2]),
      differentia('g', [3, 2], 3, [4, 3, 3]),
      differentia('g2', [3, 2], 3, [3, 3, 4, 3]),
      differentia('g3', [3, 2], 3, [3, 3]),
      differentia('a', [3, 2], 3, [4, 4]),
      differentia('a2', [3, 2], 3, [3, 3, 4]),
      differentia('a3', [3, 2], 3, [4, 3, 3, 4]),
    ],
  }),
  buildTone({
    id: 'tonus-2',
    name: 'Tonus II',
    reciting: 2,
    mediant: cadence([], 3, [2, 2]),
    termination: [differentia(undefined, [1], -1, [0, 0])],
  }),
  buildTone({
    id: 'tonus-3',
    name: 'Tonus III',
    reciting: 1,
    mediant: cadence([], 0, [-1, 1], accentPoint([], 2, [1, 1])),
    termination: [
      differentia('b', [-1], 1, [1, 0]),
      differentia('a', [-1], 1, [1, 0, -1]),
      differentia('a2', [1, 0, -1, 0], -1, [-2, -2, -1]),
      differentia('g', [1, 0, -1, 0], -1, [-2, -2]),
      differentia('g2', [-1, 1, 0], -1, [-2, -2]),
    ],
  }),
  buildTone({
    id: 'tonus-4',
    name: 'Tonus IV',
    reciting: 1,
    mediant: cadence([0, 1], 2, [1, 1]),
    termination: [differentia('g', [], 1, [0, 0]), differentia('E', [], 0, [-1, -2])],
  }),
  buildTone({
    id: 'tonus-5',
    name: 'Tonus V',
    reciting: 2,
    hasBFlat: true,
    mediant: cadence([], 3, [2, 2]),
    termination: [differentia(undefined, [], 2, [0, 0], accentPoint([], 3, [1]))],
  }),
  buildTone({
    id: 'tonus-6',
    name: 'Tonus VI',
    reciting: 2,
    hasBFlat: true,
    mediant: cadence([], 1, [2, 2], accentPoint([], 3, [3, 2])),
    termination: [differentia(undefined, [0, 1, 2], 1, [0, 0])],
  }),
  buildTone({
    id: 'tonus-7',
    name: 'Tonus VII',
    reciting: 4,
    mediant: cadence([], 3, [4, 4], accentPoint([], 5, [4])),
    termination: [
      differentia('a', [], 2, [2, 1, 0], accentPoint([], 4, [3])),
      differentia('b', [], 2, [2, 1], accentPoint([], 4, [3])),
      differentia('c', [], 2, [2, 1, 2], accentPoint([], 4, [3])),
      differentia('c2', [], 2, [2, 3, 2], accentPoint([], 4, [3])),
      differentia('d', [], 2, [2, 1, 3], accentPoint([], 4, [3])),
    ],
  }),
  buildTone({
    id: 'tonus-8',
    name: 'Tonus VIII',
    reciting: 3,
    mediant: cadence([], 4, [3, 3]),
    termination: [
      differentia('G', [2, 3], 1, [0, 0]),
      differentia('G*', [2, 3], 1, [0, 0, 1]),
      differentia('c', [1, 3], 4, [3, 3]),
    ],
  }),
];

const tonusPeregrinus: ToneFormula = buildTone({
  id: 'tonus-peregrinus',
  name: 'Tonus Peregrinus',
  reciting: 4, // A, for the verse's first half
  secondReciting: 3, // G, for the verse's second half -- the tone's namesake asymmetry
  mediant: cadence([3, 5, 5, 4], 3, [2, 2]),
  termination: [differentia(undefined, [0], 2, [2, 1, 0])],
});

export const catholicGregorianToneSet: ToneSet = {
  id: 'catholic-gregorian',
  name: 'Catholic / Gregorian (Solesmes)',
  tones: [...tones, tonusPeregrinus],
  defaultToneForMode(mode) {
    // Modes 11/12 (Ionian/Hypoionian, Glarean's 1547 additions -- see
    // types.ts's ChurchMode doc comment) aren't separately transcribed:
    // Tone 5/6 (Lydian/Hypolydian) WITH the customary B-flat already has
    // this engine's Ionian interval pattern exactly (that's what hasBFlat
    // marks below), so they're reused directly rather than duplicated.
    // Modes 9/10 (Aeolian/Hypoaeolian) have no such equivalent among 1-8 --
    // no single customary accidental turns any of them into natural minor
    // -- and no sourced psalm-tone cadence data exists to transcribe for
    // them either, so they fall through to the same "not found" error
    // rather than guessing at an approximation.
    const effectiveMode = mode === 11 ? 5 : mode === 12 ? 6 : mode;
    const tone = this.tones.find((t) => t.id === `tonus-${effectiveMode}`);
    if (!tone) throw new Error(`No default tone for mode ${mode} in tone set "${this.id}".`);
    return tone;
  },
};
