import { describe, expect, it } from 'vitest';
import { anglicanChantToneSet } from '../src/tone/toneSets/anglicanChant.js';
import { fitChordVerse } from '../src/tone/fitChord.js';
import { analyzeWord } from '../src/phonology/analyze.js';
import { emitAbcChordal } from '../src/output/abcChord.js';

describe('anglicanChantToneSet', () => {
  it('is registered under anglican-chant with tone 1 transcribed', () => {
    expect(anglicanChantToneSet.id).toBe('anglican-chant');
    expect(anglicanChantToneSet.tones.map((t) => t.id)).toEqual(['anglican-1']);
  });

  it('never has a voice cross another across mediant and termination', () => {
    const tone = anglicanChantToneSet.tones[0]!;
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
  });

  it('has the pointing structure confirmed from the source: 2 preparatory chords in the mediant, 4 in the termination', () => {
    const tone = anglicanChantToneSet.tones[0]!;
    expect(tone.mediant.preparatory).toHaveLength(2);
    expect(tone.termination[0]!.preparatory).toHaveLength(4);
    // No flex -- Anglican chant verses are always bipartite.
    expect(tone.flex).toBeUndefined();
  });

  it('fits a real Finnish verse onto anglican-1 end-to-end and emits valid chordal ABC', () => {
    const tone = anglicanChantToneSet.tones[0]!;
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
