import { describe, expect, it } from 'vitest';
import { finnishGregorianToneSet } from '../src/tone/toneSets/finnishGregorian.js';
import { fitVerse } from '../src/tone/fit.js';
import { analyzeWord } from '../src/phonology/analyze.js';
import { emitGabc } from '../src/output/gabc.js';

describe('finnishGregorianToneSet', () => {
  it('is registered under finnish-gregorian with the tones transcribed so far', () => {
    expect(finnishGregorianToneSet.id).toBe('finnish-gregorian');
    expect(finnishGregorianToneSet.tones.map((t) => t.id)).toEqual([
      'tonus-1',
      'tonus-2',
      'tonus-3',
      'tonus-4',
      'tonus-5',
      'tonus-6',
      'tonus-7',
      'tonus-8',
    ]);
  });

  it('every tone has final 0 by construction and at least one termination', () => {
    for (const tone of finnishGregorianToneSet.tones) {
      expect(tone.final).toBe(0);
      expect(tone.termination.length).toBeGreaterThan(0);
    }
  });

  it('tonus-3 recites on B (degree 4), not the Solesmes-raised C (degree 5)', () => {
    const tone = finnishGregorianToneSet.defaultToneForMode(3);
    expect(tone.reciting).toBe(4);
  });

  it('tonus-3 mediant and its "3" termination carry a real secondaryAccent (not dropped)', () => {
    const tone = finnishGregorianToneSet.defaultToneForMode(3);
    expect(tone.mediant.secondaryAccent).toBeDefined();
    expect(tone.termination.find((d) => d.label === '3')?.secondaryAccent).toBeDefined();
  });

  it('fits a real Finnish verse onto tonus-1 end-to-end and emits valid GABC', () => {
    const tone = finnishGregorianToneSet.defaultToneForMode(1);
    const cola = [
      {
        role: 'mediant' as const,
        words: 'Herra on minun paimeneni'.split(' ').map((w) => analyzeWord(w, 'fi')),
      },
      {
        role: 'termination' as const,
        words: 'ei minulta mitään puutu'.split(' ').map((w) => analyzeWord(w, 'fi')),
      },
    ];
    const pitched = fitVerse(cola, tone, true);
    expect(pitched).toHaveLength(2);
    for (const colon of pitched) {
      for (const syllable of colon.syllables) {
        expect(syllable.notes.length).toBeGreaterThan(0);
      }
    }
    expect(() => emitGabc(pitched)).not.toThrow();
  });
});
