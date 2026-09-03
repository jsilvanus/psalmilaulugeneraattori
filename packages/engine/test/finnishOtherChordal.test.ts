import { describe, expect, it } from 'vitest';
import { finnishOtherChordalToneSet } from '../src/tone/toneSets/finnishOtherChordal.js';
import { fitChordVerse } from '../src/tone/fitChord.js';
import { analyzeWord } from '../src/phonology/analyze.js';
import { emitAbcChordal } from '../src/output/abcChord.js';

describe('finnishOtherChordalToneSet', () => {
  it('is registered under finnish-other-satb with the two SATB variants transcribed so far', () => {
    expect(finnishOtherChordalToneSet.id).toBe('finnish-other-satb');
    expect(finnishOtherChordalToneSet.tones.map((t) => t.id)).toEqual([
      'muita-8-satb',
      'muita-9-satb',
    ]);
  });

  it('never has a voice cross another across mediant and termination', () => {
    for (const tone of finnishOtherChordalToneSet.tones) {
      const points = [
        ...tone.mediant.preparatory,
        tone.mediant.accentNote,
        ...tone.mediant.postAccent,
        ...tone.termination[0]!.preparatory,
        tone.termination[0]!.accentNote,
        ...tone.termination[0]!.postAccent,
      ];
      for (const point of points) {
        const { soprano, alto, tenor, bass } = point.chord;
        expect(soprano).toBeGreaterThanOrEqual(alto);
        expect(alto).toBeGreaterThanOrEqual(tenor);
        expect(tenor).toBeGreaterThanOrEqual(bass);
      }
    }
  });

  it('muita-9-satb\'s tenor and bass land on the same note for both cadences (both dictated as plain "a")', () => {
    const tone = finnishOtherChordalToneSet.tones.find((t) => t.id === 'muita-9-satb')!;
    const mediantFinal = tone.mediant.postAccent.at(-1)!.chord;
    const terminationFinal = tone.termination[0]!.postAccent.at(-1)!.chord;
    expect(terminationFinal.tenor).toBe(mediantFinal.tenor);
    expect(terminationFinal.bass).toBe(mediantFinal.bass);
  });

  it('fits a real Finnish verse onto muita-9-satb end-to-end and emits valid chordal ABC', () => {
    const tone = finnishOtherChordalToneSet.tones.find((t) => t.id === 'muita-9-satb')!;
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
    const pitched = fitChordVerse(cola, tone, true);
    expect(pitched).toHaveLength(2);
    for (const colon of pitched) {
      for (const syllable of colon.syllables) {
        expect(syllable.chords.length).toBeGreaterThan(0);
      }
    }
    expect(() => emitAbcChordal(pitched)).not.toThrow();
  });
});
