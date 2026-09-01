import { describe, expect, it } from 'vitest';
import { matchTone } from '../src/antiphon/toneMatch.js';
import { catholicGregorianToneSet } from '../src/tone/toneSets/catholicGregorian.js';
import type { ToneSet } from '../src/tone/types.js';
import type { MelodyAnalysis } from '../src/antiphon/modeDetect.js';

function analysis(overrides: Partial<MelodyAnalysis>): MelodyAnalysis {
  return {
    firstPitch: 0,
    finalPitch: 0,
    ambitusLow: 0,
    ambitusHigh: 0,
    mostFrequentPitch: 0,
    ...overrides,
  };
}

describe('matchTone', () => {
  it('uses the tone set default tone for the mode, offering its other differentiae as labeled alternates', () => {
    const result = matchTone(
      catholicGregorianToneSet,
      1,
      analysis({ firstPitch: 4, finalPitch: 0 }),
    );
    expect(result.tone.id).toBe('tonus-1');
    // Tonus I ships its real 9 Liber Usualis differentiae (D/D2/f/g/g2/g3/a/a2/a3).
    // An antiphon opening a 5th above its own final (relative degree 4) is
    // an exact match for the 'a'/'a2'/'a3' endings (which land on degree 4).
    expect(result.differentiaLabel).toBe('a');
    expect(result.alternates).toHaveLength(8);
    // Alternates are sorted best (smallest distance) first.
    for (let i = 1; i < result.alternates.length; i++) {
      expect(result.alternates[i]!.distance).toBeGreaterThanOrEqual(
        result.alternates[i - 1]!.distance,
      );
    }
  });

  it('never hardcodes the mode->tone pairing, deferring to the ToneSet', () => {
    const reversedToneSet: ToneSet = {
      id: 'reversed-test-set',
      name: 'Reversed test set',
      tones: catholicGregorianToneSet.tones,
      defaultToneForMode: () => catholicGregorianToneSet.tones.find((t) => t.id === 'tonus-8')!,
    };
    const result = matchTone(reversedToneSet, 1, analysis({ firstPitch: 0, finalPitch: 0 }));
    expect(result.tone.id).toBe('tonus-8');
  });

  it('picks the differentia whose final note is closest to the antiphon opening note, with sorted alternates', () => {
    const multiDifferentiaSet: ToneSet = {
      id: 'test-set',
      name: 'Test set',
      tones: [
        {
          id: 'test-tone',
          name: 'Test Tone',
          final: 0,
          reciting: 4,
          mediant: { preparatory: [], accentNote: { degree: 3 }, postAccent: [] },
          termination: [
            { preparatory: [], accentNote: { degree: 2 }, postAccent: [{ degree: 0 }] }, // final degree 0
            { preparatory: [], accentNote: { degree: 2 }, postAccent: [{ degree: 2 }] }, // final degree 2
            { preparatory: [], accentNote: { degree: 2 }, postAccent: [{ degree: -1 }] }, // final degree -1
          ],
        },
      ],
      defaultToneForMode: (m) => {
        if (m !== 1) throw new Error('unexpected mode');
        return multiDifferentiaSet.tones[0]!;
      },
    };

    // Antiphon opens a step above its own final (relative degree 1): that's
    // distance 1 from both index0 (degree 0) and index1 (degree 2), and
    // distance 2 from index2 (degree -1). Ties keep their original order,
    // so index0 wins as the default, with index1 then index2 as alternates.
    const result = matchTone(multiDifferentiaSet, 1, analysis({ firstPitch: 5, finalPitch: 4 }));
    expect(result.differentiaIndex).toBe(0);
    expect(result.alternates.map((a) => a.differentiaIndex)).toEqual([1, 2]);
    expect(result.alternates.map((a) => a.distance)).toEqual([1, 2]);
  });
});
