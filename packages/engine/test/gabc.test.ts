import { describe, expect, it } from 'vitest';
import { emitGabc } from '../src/output/gabc.js';
import type { PitchedColon } from '../src/tone/fit.js';

const cola: PitchedColon[] = [
  {
    role: 'mediant',
    syllables: [
      { text: 'Di', notes: [4], isWordStart: true },
      { text: 'xit', notes: [4], isWordStart: false },
      { text: 'Do', notes: [4], isWordStart: true },
      { text: 'mi', notes: [3], isWordStart: false },
      { text: 'nus', notes: [2], isWordStart: false },
    ],
  },
  {
    role: 'termination',
    syllables: [
      { text: 'se', notes: [1], isWordStart: true },
      { text: 'de', notes: [0], isWordStart: false },
    ],
  },
];

describe('emitGabc', () => {
  it('emits syllable(notes) groups, concatenated within a word, spaced between words', () => {
    expect(emitGabc(cola)).toBe('Di(l)xit(l) Do(l)mi(k)nus(j) : se(i)de(h) ::');
  });

  it('throws for a scale degree outside the supported GABC pitch range', () => {
    const outOfRange: PitchedColon[] = [
      { role: 'termination', syllables: [{ text: 'x', notes: [50], isWordStart: true }] },
    ];
    expect(() => emitGabc(outOfRange)).toThrow();
  });
});
