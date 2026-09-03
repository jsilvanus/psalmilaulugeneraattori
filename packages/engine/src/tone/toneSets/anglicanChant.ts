import type { ChordToneFormula, ChordToneSet } from '../chordTypes.js';
import {
  buildChordTone,
  chord,
  chordCadence,
  chordDifferentia,
  chordNote,
} from './chordBuilders.js';

/*
 * DATA SOURCE:
 *
 * Anglikaanisen tyylin mukaiset psalmisävelmät (Kirkkokäsikirja I, p. 387) --
 * see refs/jpkirja-musiikkia-psalmeihin.pdf and refs/README.md's "Anglican
 * chant" section for the extraction history. An earlier attempt to read
 * these programmatically from the source PDF didn't reach a trustworthy
 * confidence level, and a voice-dictated draft garbled a chord; all five
 * formulas below were instead transcribed directly by the project owner as
 * ABC notation, which is exact rather than reconstructed.
 *
 * The project owner's own ABC is kept verbatim below. It is the real
 * record: anything the homophonic Chord model can't hold -- passing notes
 * above all, see PASSING NOTES -- survives here even though the encoded
 * data drops it.
 *
 * TONE 1 (L defaults, so 8 = whole note and 4 = half note; tones 2-5 write
 * the same durations under an explicit L:1/2, where 2 = whole and a bare
 * note = half):
 *
 *   X:1
 *   %%score (T1 T2) (B1 B2)
 *   V:T1           clef=treble-8  name="1"
 *   V:T2          clef=treble-8  name="2"
 *   V:B1  middle=d clef=bass      name="3"
 *   V:B2  middle=d clef=bass      name="4"
 *   K: G
 *   [V:T1] b,8  | g,4 a,4 | f,8 || g,8 | e,4 f,4 | e,4 ^d,4 | e,8 |]
 *   [V:T2] e,8  | e,4 f,4 | ^d,8 || =d,8 | d,4 c,4 | b,,4 b,,4 | b,,8 |]
 *   [V:B1] g,,8 | b,,4 c,4 | b,,8 || b,,8 | g,,4 f,,4 | g,,4 f,,4 | g,,8 |]
 *   [V:B2] e,,8 | e,,4 a,,,4 | b,,,8 || g,,,8 | c,,4 a,,,4 | b,,,4 b,,,4 | e,,8 |]
 *
 * TONE 2 (K: E):
 *
 *   [V:T1] b,2  | e c     | a,2  || f,2           | b, g,   | f, f,            | e,2  |]
 *   [V:T2] g,2  | g, g,   | f,2  || d,2           | e, e,   | e, d,            | e,2  |]
 *   [V:B1] b,,2 | a,, a,, | a,,2 || b,,2          | b,, b,, | c, b,,1/2 a,,1/2 | g,,2 |]
 *   [V:B2] e,,2 | c,, e,, | f,,2 || b,,3/2 a,,1/2 | g,, e,, | a,,, b,,, e,,2          |]
 *
 * (B2's last bar as dictated runs the penultimate bar's two half notes and
 * the final whole note together without the barline between them. The
 * durations still total the same 7 whole notes as every other voice, so it
 * reads unambiguously and is transcribed as written -- flagged only in case
 * the source itself wants tidying.)
 *
 * TONE 3 (K: F):
 *
 *   [V:T1] c2   | d c     | a,2  || g,2  | c a,     | g, f,   | a,2  |]
 *   [V:T2] f,2  | f, g,   | f,2  || d,2  | c, e,    | e, d,   | c,2  |]
 *   [V:B1] a,,2 | a,, c,  | c,2  || b,,2 | g,, a,,  | b,, a,, | a,,2 |]
 *   [V:B2] f,,2 | d,, e,, | f,,2 || f,,2 | e,, c,,  | d,, d,, | f,,2 |]
 *
 * TONE 4 (K: A):
 *
 *   [V:T1] c2   | b, a,   | g,2  || b,2          | e, a,   | a, g,   | a,2   |]
 *   [V:T2] e,2  | f, f,   | e,2  || e,3/2 d,1/2  | c, c,   | f, e,   | e,2   |]
 *   [V:B1] c,2  | d, c,   | b,,2 || b,,2         | a,, a,, | b,, b,, | c,2   |]
 *   [V:B2] a,,2 | d,, d,, | e,,2 || g,,2         | a,, f,, | d,, e,, | a,,,2 |]
 *
 * TONE 5 (K: G) -- a DOUBLE chant: two strains, sung on alternate verses.
 * The `% 5` line is the project owner's own separator between them:
 *
 *   [V:T1] e,2  | f, f,       | g,2  || a,2  | b,e     | d3/2 c1/2 | b,2   ||
 *   [V:T2] e,2  | e, ^d,      | e,2  | f,2   | g, g,   | g, f,     | g,2   ||
 *   [V:B1] g,,2 | b,, b,,     | b,,2 || d,2  | d, c,   | b,, a,,   | g,,2  ||
 *   [V:B2] e,,2 | b,,, b,,,   | e,,2 || d,,2 | g,, c,, | d,, d,,   | g,,,2 ||
 *   % 5
 *   [V:T1] b,2  | a, b,       | g,2  || a,2  | a, g,            | g, f,            | e,2  |]
 *   [V:T2] d,2  | ^d, f,      | e,2  || e,2  | ^d, e,           | e, ^d,           | e,2  |]
 *   [V:B1] b,,2 | b,, b,,     | b,,2 || a,,2 | f,, g,,1/2 a,,1/2 | b,,3/2 a,,1/2   | g,,2 |]
 *   [V:B2] g,,2 | f,, ^d,,    | e,,2 || c,,2 | b,,, e,,          | b,,, b,,,       | e,,2 |]
 *
 * (Strain 1's T2 writes a single `|` where the other three voices write the
 * `||` at the mediant division. The position is identical in every voice,
 * so nothing is ambiguous; noted for tidying only.)
 *
 * READING THE ABC: T1/T2 (the two upper, "treble-staff" voices =
 * soprano/alto) are notated with clef=treble-8 purely so the source can
 * write them legibly on a treble-shaped staff without excessive ledger
 * lines -- confirmed NOT to be an extra octave transposition for our
 * purposes (i.e. the ABC pitch letters are read directly, same octave
 * rules as B1/B2). Reading it that way, and only that way, produces a
 * voicing with soprano >= alto >= tenor >= bass at every chord of every
 * formula. Verified programmatically for all five: the literal reading
 * crosses nowhere, while the alternative (treating -8 as a real
 * down-an-octave transposition for T1/T2) makes alto dip below tenor at 9
 * or 10 of each formula's 10 chords. Degrees below use the standard ABC
 * letter-octave convention (uppercase, no marks = one octave below
 * lowercase, no marks; each comma/apostrophe shifts by one more octave),
 * on the project's usual C=0..B=6 diatonic scale, shifted so each tune's
 * own lowest note is 0. That shift is per tune, so degrees are comparable
 * within a tone but not across tones -- with one deliberate exception:
 * tone 5's two strains share a single shift, since they are one chant and
 * must stay in the same degree space. (A pleasing confirmation of that:
 * strain 2's final chord comes out identical to strain 1's opening chord,
 * chord(12, 12, 7, 5) -- the cycle closes where it began.)
 *
 * STRUCTURE matches the pointing convention documented in refs/README.md,
 * confirmed directly from the barlines -- and identically for all five
 * formulas, and for both of tone 5's strains: mediant = [reciting whole
 * note] + [2 preparatory half notes] + [final whole note]; termination =
 * [reciting whole note] + [4 preparatory half notes (two half-note bars)] +
 * [final whole note]. Ten chord positions per strain. No flex (Anglican
 * chant verses are always bipartite).
 *
 * Tones 1-4 are SINGLE chants, repeating every verse. Tone 5 is a DOUBLE
 * chant, its two strains alternating verse by verse -- exactly as
 * refs/README.md predicted from cross-checking the book's own worked
 * examples, now confirmed by the source itself having two systems. The two
 * strains are encoded as two linked ChordToneFormulas (see
 * ChordToneFormula.nextStrain) rather than by extending ColonRole, since
 * the alternation is a dimension ACROSS verses while ColonRole describes
 * parts WITHIN one.
 *
 * KEY SIGNATURES are not modelled (tone 1 G major, 2 E, 3 F, 4 A, 5 G) --
 * same as everywhere else in this project, only the diatonic
 * scale-degree/staff-position is encoded. Individual accidentals ARE
 * modelled where the source writes them, via `chordNote`'s accidental
 * option: tone 1 has one (`^d,4`, alto), tone 5 has five (four alto, one
 * bass, spread across both strains). Tones 2, 3 and 4 write none at all.
 * Tone 1's `=d,8` (alto, termination's reciting chord) is a courtesy
 * natural rather than a real accidental -- D carries no sharp or flat in G
 * major's own signature, so it needs no marking, and `secondReciting` is a
 * plain Chord reused across however many syllables the reciting region
 * needs, so marking it would spam the symbol on every one of them rather
 * than showing it once as the source does.
 *
 * PASSING NOTES: six notes across tones 2, 4 and 5 don't begin on a chord
 * position -- they are shorter steps decorating the move out of a chord
 * into the next one (tone 2: tenor and bass; tone 4: alto; tone 5: soprano
 * in strain 1, tenor twice in strain 2). The Chord model here is strictly
 * homophonic (one chord per syllable, four voices moving together), so it
 * cannot represent one voice subdividing against the others: the encoded
 * chords use each voice's PRINCIPAL note at each of the ten positions and
 * the passing notes are dropped. That is a real, if small, loss of
 * fidelity, not a transcription doubt -- the verbatim ABC above keeps them,
 * and a future emitter that models per-voice melisma can recover them from
 * there. Where a voice sustains across a position rather than rearticulating
 * (tone 5 strain 1's soprano at the termination's 4th preparatory chord,
 * strain 2's tenor at the same place), the sustained note is the chord's
 * value at that position, which is what a singer would actually be holding.
 */

const tones: ChordToneFormula[] = [
  buildChordTone({
    id: 'anglican-1',
    name: 'Anglikaaninen sävelmä 1',
    reciting: chord(16, 12, 7, 5), // mediant's reciting chord
    secondReciting: chord(14, 11, 9, 0), // termination's reciting chord
    mediant: chordCadence(
      [chord(14, 12, 9, 5), chordNote(chord(15, 13, 10, 1), { alto: 'sharp' })],
      chord(13, 11, 9, 2),
      [chord(13, 11, 9, 2)],
    ),
    termination: [
      chordDifferentia(
        undefined,
        [chord(12, 11, 7, 3), chord(13, 10, 6, 1), chord(12, 9, 7, 2), chord(11, 9, 6, 2)],
        chord(12, 9, 7, 5),
        [chord(12, 9, 7, 5)],
      ),
    ],
  }),
  buildChordTone({
    id: 'anglican-2',
    name: 'Anglikaaninen sävelmä 2',
    reciting: chord(15, 13, 8, 4),
    secondReciting: chord(12, 10, 8, 8),
    mediant: chordCadence([chord(18, 13, 7, 2), chord(16, 13, 7, 4)], chord(14, 12, 7, 5), [
      chord(14, 12, 7, 5),
    ]),
    termination: [
      chordDifferentia(
        undefined,
        [chord(15, 11, 8, 6), chord(13, 11, 8, 4), chord(12, 11, 9, 0), chord(12, 10, 8, 1)],
        chord(11, 11, 6, 4),
        [chord(11, 11, 6, 4)],
      ),
    ],
  }),
  buildChordTone({
    id: 'anglican-3',
    name: 'Anglikaaninen sävelmä 3',
    reciting: chord(14, 10, 5, 3),
    secondReciting: chord(11, 8, 6, 3),
    mediant: chordCadence([chord(15, 10, 5, 1), chord(14, 11, 7, 2)], chord(12, 10, 7, 3), [
      chord(12, 10, 7, 3),
    ]),
    termination: [
      chordDifferentia(
        undefined,
        [chord(14, 7, 4, 2), chord(12, 9, 5, 0), chord(11, 9, 6, 1), chord(10, 8, 5, 1)],
        chord(12, 7, 5, 3),
        [chord(12, 7, 5, 3)],
      ),
    ],
  }),
  buildChordTone({
    id: 'anglican-4',
    name: 'Anglikaaninen sävelmä 4',
    reciting: chord(16, 11, 9, 7),
    secondReciting: chord(15, 11, 8, 6),
    mediant: chordCadence([chord(15, 12, 10, 3), chord(14, 12, 9, 3)], chord(13, 11, 8, 4), [
      chord(13, 11, 8, 4),
    ]),
    termination: [
      chordDifferentia(
        undefined,
        [chord(11, 9, 7, 7), chord(14, 9, 7, 5), chord(14, 12, 8, 3), chord(13, 11, 8, 4)],
        chord(14, 11, 9, 0),
        [chord(14, 11, 9, 0)],
      ),
    ],
  }),
  // Tone 5 is a double chant: these two strains alternate verse by verse.
  buildChordTone({
    id: 'anglican-5a',
    name: 'Anglikaaninen sävelmä 5 (1. jakso)',
    nextStrain: 'anglican-5b',
    reciting: chord(12, 12, 7, 5),
    secondReciting: chord(15, 13, 11, 4),
    mediant: chordCadence(
      [chord(13, 12, 9, 2), chordNote(chord(13, 11, 9, 2), { alto: 'sharp' })],
      chord(14, 12, 9, 5),
      [chord(14, 12, 9, 5)],
    ),
    termination: [
      chordDifferentia(
        undefined,
        [chord(16, 14, 11, 7), chord(19, 14, 10, 3), chord(18, 14, 9, 4), chord(18, 13, 8, 4)],
        chord(16, 14, 7, 0),
        [chord(16, 14, 7, 0)],
      ),
    ],
  }),
  buildChordTone({
    id: 'anglican-5b',
    name: 'Anglikaaninen sävelmä 5 (2. jakso)',
    nextStrain: 'anglican-5a',
    reciting: chord(16, 11, 9, 7),
    secondReciting: chord(15, 12, 8, 3),
    mediant: chordCadence(
      [
        chordNote(chord(15, 11, 9, 6), { alto: 'sharp' }),
        chordNote(chord(16, 13, 9, 4), { bass: 'sharp' }),
      ],
      chord(14, 12, 9, 5),
      [chord(14, 12, 9, 5)],
    ),
    termination: [
      chordDifferentia(
        undefined,
        [
          chordNote(chord(15, 11, 6, 2), { alto: 'sharp' }),
          chord(14, 12, 7, 5),
          chord(14, 12, 9, 2),
          chordNote(chord(13, 11, 9, 2), { alto: 'sharp' }),
        ],
        chord(12, 12, 7, 5),
        [chord(12, 12, 7, 5)],
      ),
    ],
  }),
];

export const anglicanChantToneSet: ChordToneSet = {
  id: 'anglican-chant',
  name: 'Anglikaanisen tyylin mukaiset psalmisävelmät (Kirkkokäsikirja)',
  tones,
};
