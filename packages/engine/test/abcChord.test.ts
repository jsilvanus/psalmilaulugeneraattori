import { describe, expect, it } from 'vitest';
import { emitAbcChordal } from '../src/output/abcChord.js';
import type { PitchedChordColon } from '../src/tone/fitChord.js';
import type { Chord, ChordCadenceNote } from '../src/tone/chordTypes.js';

function chord(soprano: number, alto: number, tenor: number, bass: number): Chord {
  return { soprano, alto, tenor, bass };
}

function chordNote(c: Chord): ChordCadenceNote {
  return { chord: c };
}

// Each chord spaces the lower voices a 2nd/3rd/4th below soprano (alto =
// soprano-2, tenor = soprano-5, bass = soprano-9), a plausible SATB spread
// that stays within the ABC pitch table for these small degrees.
const cola: PitchedChordColon[] = [
  {
    role: 'mediant',
    syllables: [
      { text: 'Di', chords: [chordNote(chord(4, 2, -1, -5))], isWordStart: true },
      { text: 'xit', chords: [chordNote(chord(3, 1, -2, -6))], isWordStart: false },
    ],
  },
  {
    role: 'termination',
    syllables: [{ text: 'se', chords: [chordNote(chord(2, 0, -3, -7))], isWordStart: true }],
  },
];

describe('emitAbcChordal', () => {
  it('emits a free-rhythm ABC tune with one bracketed [SATB] chord per note', () => {
    expect(emitAbcChordal(cola)).toBe(
      ['X:1', 'L:1/4', 'M:none', 'K:C', '[G,E,B,,E,,][F,D,A,,D,,] |', '[E,C,G,,C,,] |]'].join('\n'),
    );
  });

  it('includes an optional title header', () => {
    const out = emitAbcChordal(cola, { title: 'Psalm 109' });
    expect(out.split('\n')[1]).toBe('T:Psalm 109');
  });

  it('throws for a chord voice outside the supported ABC pitch range', () => {
    const outOfRange: PitchedChordColon[] = [
      {
        role: 'termination',
        syllables: [{ text: 'x', chords: [chordNote(chord(50, 0, 0, 0))], isWordStart: true }],
      },
    ];
    expect(() => emitAbcChordal(outOfRange)).toThrow();
  });

  it('renders a per-voice accidental as an ABC prefix on just that voice', () => {
    const withAccidental: PitchedChordColon[] = [
      {
        role: 'termination',
        syllables: [
          {
            text: 'x',
            chords: [{ chord: chord(4, 2, -1, -5), accidental: { alto: 'sharp' } }],
            isWordStart: true,
          },
        ],
      },
    ];
    const out = emitAbcChordal(withAccidental);
    expect(out.split('\n')[4]).toBe('[G,^E,B,,E,,] |]');
  });
});
