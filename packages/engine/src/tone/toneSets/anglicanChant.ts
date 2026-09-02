import type { ChordToneFormula, ChordToneSet } from '../chordTypes.js';
import { buildChordTone, chord, chordCadence, chordDifferentia } from './chordBuilders.js';

/*
 * DATA SOURCE:
 *
 * Anglikaanisen tyylin mukaiset psalmisävelmät (Kirkkokäsikirja I, p. 387) --
 * see refs/jpkirja-musiikkia-psalmeihin.pdf and refs/README.md's "Anglican
 * chant" section for the extraction history (an earlier attempt to read
 * these programmatically from the source PDF didn't reach a trustworthy
 * confidence level; this tone was instead transcribed directly by the
 * project owner as ABC notation, which is exact, not reconstructed).
 *
 * The project owner's own ABC source for tone 1 (kept verbatim for
 * reference):
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
 * T1/T2 (the two upper, "treble-staff" voices = soprano/alto) are notated
 * with clef=treble-8 purely so the source can write them legibly on a
 * treble-shaped staff without excessive ledger lines -- confirmed NOT to
 * be an extra octave transposition for our purposes (i.e. the ABC pitch
 * letters are read directly, same octave rules as B1/B2): reading it that
 * way, and only that way, produces a voicing with soprano >= alto >= tenor
 * >= bass at every one of the 10 chords (verified programmatically); the
 * alternative reading (treating -8 as a real down-an-octave transposition
 * for T1/T2) produces alto dipping below tenor at multiple chords, which
 * doesn't happen in real four-part harmony from a source that's otherwise
 * internally consistent. Degrees below use the standard ABC letter-octave
 * convention (uppercase, no marks = one octave below lowercase, no marks;
 * each comma/apostrophe shifts by one more octave), on the project's usual
 * C=0..B=6 diatonic scale, shifted so the tune's lowest note is 0.
 *
 * STRUCTURE matches the pointing convention documented in refs/README.md,
 * confirmed directly from the barlines in the ABC above: mediant =
 * [reciting whole note] + [2 preparatory half notes] + [final whole note];
 * termination = [reciting whole note] + [4 preparatory half notes (two
 * half-note bars)] + [final whole note]. No flex (Anglican chant verses
 * are always bipartite).
 *
 * Key signature (G major, one sharp) and the individual accidentals
 * (^d, =d) are not modelled -- same as everywhere else in this project,
 * only the diatonic scale-degree/staff-position is encoded.
 */

const tones: ChordToneFormula[] = [
  buildChordTone({
    id: 'anglican-1',
    name: 'Anglikaaninen sävelmä 1',
    reciting: chord(16, 12, 7, 5), // mediant's reciting chord
    secondReciting: chord(14, 11, 9, 0), // termination's reciting chord
    mediant: chordCadence([chord(14, 12, 9, 5), chord(15, 13, 10, 1)], chord(13, 11, 9, 2), [
      chord(13, 11, 9, 2),
    ]),
    termination: [
      chordDifferentia(
        undefined,
        [chord(12, 11, 7, 3), chord(13, 10, 6, 1), chord(12, 9, 7, 2), chord(11, 9, 6, 2)],
        chord(12, 9, 7, 5),
        [chord(12, 9, 7, 5)],
      ),
    ],
  }),
];

export const anglicanChantToneSet: ChordToneSet = {
  id: 'anglican-chant',
  name: 'Anglikaanisen tyylin mukaiset psalmisävelmät (Kirkkokäsikirja)',
  tones,
};
