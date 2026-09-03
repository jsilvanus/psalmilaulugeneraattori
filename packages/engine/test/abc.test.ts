import { describe, expect, it } from 'vitest';
import { abcPitch, emitAbc } from '../src/output/abc.js';
import type { PitchedColon } from '../src/tone/fit.js';
import { dot, note } from '../src/tone/toneSets/toneBuilders.js';

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

describe('emitAbc', () => {
  it('emits a free-rhythm ABC tune, one line per colon, notes only', () => {
    expect(emitAbc(cola)).toBe(
      ['X:1', 'L:1/4', 'M:none', 'K:C', 'G,G, G,F,E, |', 'D,C, |]'].join('\n'),
    );
  });

  it('includes an optional title header', () => {
    const out = emitAbc(cola, { title: 'Psalm 109' });
    expect(out.split('\n')).toEqual([
      'X:1',
      'T:Psalm 109',
      'L:1/4',
      'M:none',
      'K:C',
      'G,G, G,F,E, |',
      'D,C, |]',
    ]);
  });

  it('throws for a scale degree outside the supported ABC pitch range', () => {
    const outOfRange: PitchedColon[] = [
      { role: 'termination', syllables: [{ text: 'x', notes: [note(50)], isWordStart: true }] },
    ];
    expect(() => emitAbc(outOfRange)).toThrow();
  });

  it('emits K:F instead of K:C when the tone has hasBFlat set', () => {
    const out = emitAbc(cola, { hasBFlat: true });
    expect(out.split('\n')[3]).toBe('K:F');
  });

  it("renders a syllable's own CadenceNote.accidental as an ABC prefix", () => {
    const withAccidental: PitchedColon[] = [
      {
        role: 'termination',
        syllables: [{ text: 'x', notes: [note(4, 'sharp')], isWordStart: true }],
      },
    ];
    const out = emitAbc(withAccidental);
    expect(out.split('\n')[4]).toBe('^G, |]');
  });

  it("renders a syllable's dotted CadenceNote with ABC's 3/2 length multiplier", () => {
    const withDot: PitchedColon[] = [
      { role: 'termination', syllables: [{ text: 'x', notes: [dot(4)], isWordStart: true }] },
    ];
    const out = emitAbc(withDot);
    expect(out.split('\n')[4]).toBe('G,3/2 |]');
  });
});

describe('abcPitch', () => {
  it('prefixes the standard ABC accidental symbol before the pitch token', () => {
    expect(abcPitch(4)).toBe('G,');
    expect(abcPitch(4, 'sharp')).toBe('^G,');
    expect(abcPitch(4, 'flat')).toBe('_G,');
    expect(abcPitch(4, 'natural')).toBe('=G,');
  });

  it("appends ABC's 3/2 length multiplier for a dotted note", () => {
    expect(abcPitch(4, undefined, true)).toBe('G,3/2');
    expect(abcPitch(4, 'sharp', true)).toBe('^G,3/2');
  });
});
