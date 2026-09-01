import { describe, expect, it } from 'vitest';
import { finnishOtherToneSet, getFinnishOtherTone } from '../src/tone/toneSets/finnishOther.js';
import { fitVerse } from '../src/tone/fit.js';
import { analyzeWord } from '../src/phonology/analyze.js';
import { emitGabc } from '../src/output/gabc.js';

describe('finnishOtherToneSet', () => {
  it('is registered under finnish-other with all 13 numbered tones', () => {
    expect(finnishOtherToneSet.id).toBe('finnish-other');
    expect(finnishOtherToneSet.tones.map((t) => t.id)).toEqual([
      'muita-1',
      'muita-2',
      'muita-3',
      'muita-4',
      'muita-5',
      'muita-6',
      'muita-7',
      'muita-8',
      'muita-9',
      'muita-10',
      'muita-11',
      'muita-12',
      'muita-13',
    ]);
  });

  it('every tone has final 0 by construction, one termination, and no secondaryAccent', () => {
    for (const tone of finnishOtherToneSet.tones) {
      expect(tone.final).toBe(0);
      expect(tone.termination).toHaveLength(1);
      expect(tone.mediant.secondaryAccent).toBeUndefined();
      expect(tone.termination[0]!.secondaryAccent).toBeUndefined();
    }
  });

  it('getFinnishOtherTone looks tones up by number', () => {
    expect(getFinnishOtherTone(1).id).toBe('muita-1');
    expect(getFinnishOtherTone(13).id).toBe('muita-13');
    expect(() => getFinnishOtherTone(14)).toThrow();
  });

  it('defaultToneForMode is not meaningful for this set and throws', () => {
    expect(() => finnishOtherToneSet.defaultToneForMode(1)).toThrow();
  });

  it('muita-3, muita-11, muita-12 and muita-13 recite the same note for mediant and termination', () => {
    for (const id of ['muita-3', 'muita-11', 'muita-12', 'muita-13']) {
      const tone = getFinnishOtherTone(Number(id.split('-')[1]));
      expect(tone.secondReciting).toBeUndefined();
    }
  });

  it('muita-1 recites D for the mediant and E for the termination', () => {
    const tone = getFinnishOtherTone(1);
    expect(tone.reciting).toBe(1);
    expect(tone.secondReciting).toBe(2);
  });

  it('muita-12 mediant is a bare reciting tone with no cadence figure', () => {
    const tone = getFinnishOtherTone(12);
    expect(tone.mediant.preparatory).toHaveLength(0);
    expect(tone.mediant.postAccent).toHaveLength(0);
    expect(tone.mediant.accentNote.degree).toBe(2);
  });

  it('fits a real Finnish verse onto muita-1 end-to-end and emits valid GABC', () => {
    const tone = getFinnishOtherTone(1);
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
