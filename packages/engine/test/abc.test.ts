import { describe, expect, it } from 'vitest';
import { emitAbc } from '../src/output/abc.js';
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

describe('emitAbc', () => {
  it('emits a free-rhythm ABC tune, one line per colon, notes only', () => {
    expect(emitAbc(cola)).toBe(['X:1', 'L:1/4', 'M:none', 'K:C', 'G,G, G,F,E, |', 'D,C, |]'].join('\n'));
  });

  it('includes an optional title header', () => {
    const out = emitAbc(cola, { title: 'Psalm 109' });
    expect(out.split('\n')).toEqual(['X:1', 'T:Psalm 109', 'L:1/4', 'M:none', 'K:C', 'G,G, G,F,E, |', 'D,C, |]']);
  });

  it('throws for a scale degree outside the supported ABC pitch range', () => {
    const outOfRange: PitchedColon[] = [
      { role: 'termination', syllables: [{ text: 'x', notes: [50], isWordStart: true }] },
    ];
    expect(() => emitAbc(outOfRange)).toThrow();
  });
});
