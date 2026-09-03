import type { ChordToneFormula, ChordToneSet } from '../chordTypes.js';
import { buildChordTone, chord, chordCadence, chordDifferentia } from './chordBuilders.js';

/*
 * DATA SOURCE:
 *
 * Four-voice (SATB) harmonized variants of "muita" psalm tones 8 and 9
 * (see finnishOther.ts for the single-voice versions), transcribed by the
 * project owner from the same Kirkkokäsikirja appendix -- written on two
 * staves, soprano+alto in the G-clef (treble) staff, tenor+bass in the
 * F-clef (bass) staff.
 *
 * OCTAVE RECONSTRUCTION (the one real judgment call here): the dictation
 * gives each voice's notes as bare letter names (plus occasional explicit
 * "(lower)" markers for a one-off octave drop), the same convention as
 * finnishGregorian.ts/finnishOther.ts. For a single melodic line that's
 * unambiguous (the whole tune stays within a 5th or so), but stacking
 * four simultaneous voices genuinely needs real octave placement, which
 * bare letters alone don't carry.
 *
 * The values below were reconstructed, not guessed freehand: for each
 * voice, every distinct letter it uses got ONE consistent value (so e.g.
 * muita-9-satb's tenor and bass, both dictated as plain "a" at both the
 * mediant's and termination's final note, land on the exact same pitch
 * both times, as a recurring cadence note should), choosing octave
 * placement to keep that voice's own letters as close together as music
 * notation would read them (e.g. an
 * alto voice using H, C, D reads as a smooth H-C-D ascent, i.e. H just
 * below C -- not a 7th above it, which a flat "H=6 steps above C" table
 * would wrongly imply). An explicit "(lower)" always drops that one
 * occurrence a further octave below its voice's usual value for that
 * letter. Voices were then stacked so none of the four ever cross
 * (soprano >= alto >= tenor >= bass at every single chord), which is the
 * one hard constraint real four-part writing always satisfies.
 *
 * This reconstruction was NOT independently confirmed against the
 * source's actual clefs/ledger lines -- it should read as musically
 * plausible (it does: no crossings, both cadences land on a consistent
 * chord, no voice leaps beyond what "(lower)" marks), but treat the exact
 * octave register as a best-effort placeholder pending the project
 * owner's check against the real score.
 *
 * `reciting`/`secondReciting` are not separately given in this SATB
 * dictation (only the mediant+termination cadence figures were) --
 * filled in here as the mediant's/termination's own opening chord, same
 * as a single voice's reciting note is usually also its cadence's first
 * preparatory note.
 */

const tones: ChordToneFormula[] = [
  buildChordTone({
    id: 'muita-8-satb',
    name: 'Muu psalmisävelmä 8 (nelinäänisenä)',
    reciting: chord(14, 11, 7, 1),
    secondReciting: chord(15, 12, 9, 2),
    mediant: chordCadence([chord(14, 11, 7, 1), chord(15, 12, 9, 0)], chord(16, 13, 9, 3), [
      chord(16, 13, 9, 3),
      chord(16, 13, 9, 3),
    ]),
    termination: [
      chordDifferentia(
        undefined,
        [chord(15, 12, 9, 2), chord(17, 11, 8, 4), chord(16, 13, 8, 4)],
        chord(15, 12, 9, 2),
        [chord(15, 12, 9, 2), chord(15, 12, 9, 2)],
      ),
    ],
  }),
  buildChordTone({
    id: 'muita-9-satb',
    name: 'Muu psalmisävelmä 9 (nelinäänisenä)',
    reciting: chord(23, 19, 16, 0),
    secondReciting: chord(25, 18, 16, 9),
    // Bass's first two mediant notes are a single sustained "D (lower)"
    // in the dictation (one prep note, not two like the other voices) --
    // read here as the bass holding that pitch through both syllables.
    mediant: chordCadence([chord(23, 19, 16, 0), chord(22, 18, 16, 0)], chord(23, 19, 16, 11), [
      chord(23, 19, 16, 11),
      chord(23, 19, 16, 11),
    ]),
    termination: [
      chordDifferentia(
        undefined,
        [chord(25, 18, 16, 9), chord(23, 19, 16, 7), chord(21, 19, 14, 0)],
        chord(22, 18, 16, 11),
        [chord(22, 18, 16, 11), chord(22, 18, 16, 11)],
      ),
    ],
  }),
];

export const finnishOtherChordalToneSet: ChordToneSet = {
  id: 'finnish-other-satb',
  name: 'Muita suomalaisia psalmisävelmiä, nelinäänisenä (Kirkkokäsikirja)',
  tones,
};
