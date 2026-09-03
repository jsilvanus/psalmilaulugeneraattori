import { describe, expect, it } from 'vitest';
import { emitGabc } from '../src/output/gabc.js';
import type { PitchedColon } from '../src/tone/fit.js';
import { note } from '../src/tone/toneSets/toneBuilders.js';

const cola: PitchedColon[] = [
  {
    role: 'mediant',
    syllables: [
      { text: 'Di', notes: [note(4)], isWordStart: true },
      { text: 'xit', notes: [note(4)], isWordStart: false },
      { text: 'Do', notes: [note(4)], isWordStart: true },
      { text: 'mi', notes: [note(3)], isWordStart: false },
      { text: 'nus', notes: [note(2)], isWordStart: false },
    ],
  },
  {
    role: 'termination',
    syllables: [
      { text: 'se', notes: [note(1)], isWordStart: true },
      { text: 'de', notes: [note(0)], isWordStart: false },
    ],
  },
];

describe('emitGabc', () => {
  it('emits syllable(notes) groups, concatenated within a word, spaced between words', () => {
    expect(emitGabc(cola)).toBe('Di(l)xit(l) Do(l)mi(k)nus(j) : se(i)de(h) ::');
  });

  it('throws for a scale degree outside the supported GABC pitch range', () => {
    const outOfRange: PitchedColon[] = [
      { role: 'termination', syllables: [{ text: 'x', notes: [note(50)], isWordStart: true }] },
    ];
    expect(() => emitGabc(outOfRange)).toThrow();
  });
});
