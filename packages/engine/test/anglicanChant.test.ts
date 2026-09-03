import { describe, expect, it } from 'vitest';
import { anglicanChantToneSet } from '../src/tone/toneSets/anglicanChant.js';
import { fitChordVerse } from '../src/tone/fitChord.js';
import { analyzeWord } from '../src/phonology/analyze.js';
import { emitAbcChordal } from '../src/output/abcChord.js';
import type { ChordToneFormula } from '../src/tone/chordTypes.js';

/** Every chord of a tone, in singing order. */
function allPoints(tone: ChordToneFormula) {
  return [
    ...tone.mediant.preparatory,
    tone.mediant.accentNote,
    ...tone.mediant.postAccent,
    ...tone.termination[0]!.preparatory,
    tone.termination[0]!.accentNote,
    ...tone.termination[0]!.postAccent,
  ];
}

describe('anglicanChantToneSet', () => {
  it('is registered under anglican-chant with all 5 formulas, tone 5 as two strains', () => {
    expect(anglicanChantToneSet.id).toBe('anglican-chant');
    expect(anglicanChantToneSet.tones.map((t) => t.id)).toEqual([
      'anglican-1',
      'anglican-2',
      'anglican-3',
      'anglican-4',
      'anglican-5a',
      'anglican-5b',
    ]);
  });

  it('never has a voice cross another, in any formula', () => {
    for (const tone of anglicanChantToneSet.tones) {
      for (const point of allPoints(tone)) {
        const { soprano, alto, tenor, bass } = point.chord;
        expect(soprano, tone.id).toBeGreaterThanOrEqual(alto);
        expect(alto, tone.id).toBeGreaterThanOrEqual(tenor);
        expect(tenor, tone.id).toBeGreaterThanOrEqual(bass);
      }
    }
  });

  it('has the pointing structure confirmed from the source in every formula: 2 preparatory chords in the mediant, 4 in the termination', () => {
    for (const tone of anglicanChantToneSet.tones) {
      expect(tone.mediant.preparatory, tone.id).toHaveLength(2);
      expect(tone.termination[0]!.preparatory, tone.id).toHaveLength(4);
      // No flex -- Anglican chant verses are always bipartite.
      expect(tone.flex, tone.id).toBeUndefined();
      // Each cadence's final whole note also carries any trailing unstressed
      // syllables, so postAccent repeats the accent's own chord.
      expect(tone.mediant.postAccent, tone.id).toEqual([tone.mediant.accentNote]);
      expect(tone.termination[0]!.postAccent, tone.id).toEqual([tone.termination[0]!.accentNote]);
    }
  });

  it('links tone 5 as a double chant whose two strains alternate and close the cycle', () => {
    const a = anglicanChantToneSet.tones.find((t) => t.id === 'anglican-5a')!;
    const b = anglicanChantToneSet.tones.find((t) => t.id === 'anglican-5b')!;
    expect(a.nextStrain).toBe('anglican-5b');
    expect(b.nextStrain).toBe('anglican-5a');
    // Both link targets actually exist in the set.
    for (const tone of [a, b]) {
      expect(anglicanChantToneSet.tones.some((t) => t.id === tone.nextStrain)).toBe(true);
    }
    // The cycle closes musically too: strain 2's final chord is strain 1's
    // opening chord, which is also how the shared degree normalisation was
    // cross-checked (see the file's own READING THE ABC note).
    expect(b.termination[0]!.accentNote.chord).toEqual(a.reciting);
  });

  it('leaves the single chants (tones 1-4) unlinked', () => {
    for (const id of ['anglican-1', 'anglican-2', 'anglican-3', 'anglican-4']) {
      const tone = anglicanChantToneSet.tones.find((t) => t.id === id)!;
      expect(tone.nextStrain, id).toBeUndefined();
    }
  });

  it("carries the sources' real accidentals, and only those", () => {
    const accidentalsOf = (id: string) =>
      allPoints(anglicanChantToneSet.tones.find((t) => t.id === id)!)
        .map((p) => p.accidental)
        .filter(Boolean);

    // Tone 1: one sharpened alto D on the mediant's second preparatory chord.
    expect(accidentalsOf('anglican-1')).toEqual([{ alto: 'sharp' }]);
    // Tones 2-4 write no individual accidentals at all.
    expect(accidentalsOf('anglican-2')).toEqual([]);
    expect(accidentalsOf('anglican-3')).toEqual([]);
    expect(accidentalsOf('anglican-4')).toEqual([]);
    // Tone 5 has five across its two strains: one alto + one bass in strain
    // 1/2's mediants, and two more alto in strain 2's termination.
    expect(accidentalsOf('anglican-5a')).toEqual([{ alto: 'sharp' }]);
    expect(accidentalsOf('anglican-5b')).toEqual([
      { alto: 'sharp' },
      { bass: 'sharp' },
      { alto: 'sharp' },
      { alto: 'sharp' },
    ]);
  });

  it('fits a real Finnish verse onto every formula end-to-end and emits valid chordal ABC', () => {
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
    for (const tone of anglicanChantToneSet.tones) {
      const pitched = fitChordVerse(cola, tone, true);
      expect(pitched, tone.id).toHaveLength(2);
      for (const colon of pitched) {
        for (const syllable of colon.syllables) {
          expect(syllable.chords.length, tone.id).toBeGreaterThan(0);
        }
      }
      expect(() => emitAbcChordal(pitched), tone.id).not.toThrow();
    }
  });
});
