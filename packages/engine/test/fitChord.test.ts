import { describe, expect, it } from 'vitest';
import { fitChordColon, fitChordVerse } from '../src/tone/fitChord.js';
import type { ChordCadenceFormula, ChordToneFormula } from '../src/tone/chordTypes.js';
import type { Word } from '../src/phonology/types.js';
import { chord } from '../src/tone/toneSets/chordBuilders.js';

function word(syllables: { text: string; hasStress: boolean }[]): Word {
  return {
    original: syllables.map((s) => s.text).join(''),
    syllables: syllables.map((s) => ({
      text: s.text,
      hasStress: s.hasStress,
      isPrimary: s.hasStress,
    })),
  };
}

function colon(syllables: { text: string; hasStress: boolean }[]): Word[] {
  return [word(syllables)];
}

const A = chord(4, 2, -1, -5);
const B = chord(3, 1, -2, -6);
const RECITING = chord(5, 3, 0, -4);

describe('fitChordColon', () => {
  it('assigns chords 1:1 when trailing syllables exactly match postAccent length', () => {
    const formula: ChordCadenceFormula = {
      preparatory: [],
      accentNote: { chord: A },
      postAccent: [{ chord: B }],
    };
    const result = fitChordColon(
      colon([
        { text: 'MI', hasStress: true },
        { text: 'nus', hasStress: false },
      ]),
      formula,
      RECITING,
      undefined,
    );
    expect(result.map((s) => s.chords)).toEqual([[A], [B]]);
  });

  it('merges a postAccent shortfall onto the accent syllable as a melisma', () => {
    const C = chord(2, 0, -3, -7);
    const formula: ChordCadenceFormula = {
      preparatory: [],
      accentNote: { chord: A },
      postAccent: [{ chord: B }, { chord: C }],
    };
    const result = fitChordColon(
      colon([{ text: 'MEN', hasStress: true }]),
      formula,
      RECITING,
      undefined,
    );
    expect(result.map((s) => s.chords)).toEqual([[A, B, C]]);
  });

  it('extends the accent chord for excess trailing syllables, keeping postAccent anchored to the true end (Anglican convention)', () => {
    // Straight from refs/jpkirja-musiikkia-psalmeihin.pdf p.387: "If three
    // syllables (one accented and two unaccented) fall onto a bar marked
    // with half notes, the first syllables are sung on the first half
    // note, and the last syllable on the second half note." So excess
    // trailing syllables pile onto the accent's own chord, not repeat the
    // last-defined postAccent chord -- the opposite of fit.ts's melodic
    // Gregorian behaviour (see fit.test.ts's "repeats the last postAccent
    // degree" case), which is a deliberate, separately-tested difference.
    const formula: ChordCadenceFormula = {
      preparatory: [],
      accentNote: { chord: A },
      postAccent: [{ chord: B }],
    };
    const result = fitChordColon(
      colon([
        { text: 'i', hasStress: true },
        { text: 'loi', hasStress: false },
        { text: 'ten', hasStress: false },
      ]),
      formula,
      RECITING,
      undefined,
    );
    expect(result.map((s) => s.chords)).toEqual([[A], [A], [B]]);
  });

  it('falls back to the accent chord for excess trailing syllables when postAccent is empty', () => {
    const formula: ChordCadenceFormula = {
      preparatory: [],
      accentNote: { chord: A },
      postAccent: [],
    };
    const result = fitChordColon(
      colon([
        { text: 'DO', hasStress: true },
        { text: 'nec', hasStress: false },
        { text: 'po', hasStress: false },
      ]),
      formula,
      RECITING,
      undefined,
    );
    expect(result.map((s) => s.chords)).toEqual([[A], [A], [A]]);
  });

  it('puts extra syllables before the preparatory notes on the plain reciting chord', () => {
    const formula: ChordCadenceFormula = {
      preparatory: [{ chord: B }],
      accentNote: { chord: A },
      postAccent: [],
    };
    const result = fitChordColon(
      colon([
        { text: 'a', hasStress: false },
        { text: 'ex', hasStress: false },
        { text: 'MI', hasStress: true },
      ]),
      formula,
      RECITING,
      undefined,
    );
    expect(result.map((s) => s.chords)).toEqual([[RECITING], [B], [A]]);
  });

  it('drops leading preparatory chords when there are fewer syllables than prep slots', () => {
    const C = chord(2, 0, -3, -7);
    const formula: ChordCadenceFormula = {
      preparatory: [{ chord: C }, { chord: B }],
      accentNote: { chord: A },
      postAccent: [],
    };
    const result = fitChordColon(
      colon([
        { text: 'ex', hasStress: false },
        { text: 'MI', hasStress: true },
      ]),
      formula,
      RECITING,
      undefined,
    );
    expect(result.map((s) => s.chords)).toEqual([[B], [A]]);
  });

  it('applies a secondaryAccent to an earlier stressed syllable within the plain reciting region', () => {
    const C = chord(2, 0, -3, -7);
    const D = chord(6, 4, 1, -3);
    const formula: ChordCadenceFormula = {
      preparatory: [],
      accentNote: { chord: A },
      postAccent: [],
      secondaryAccent: { preparatory: [], accentNote: { chord: D }, postAccent: [{ chord: C }] },
    };
    const result = fitChordColon(
      colon([
        { text: 'a', hasStress: false },
        { text: 'PRI', hasStress: true },
        { text: 'or', hasStress: false },
        { text: 'MEN', hasStress: true },
      ]),
      formula,
      RECITING,
      undefined,
    );
    expect(result.map((s) => s.chords)).toEqual([[RECITING], [D], [C], [A]]);
  });
});

describe('fitChordVerse', () => {
  const tone: ChordToneFormula = {
    id: 'test-tone',
    name: 'Test tone',
    reciting: RECITING,
    mediant: { preparatory: [], accentNote: { chord: A }, postAccent: [{ chord: B }] },
    termination: [
      {
        label: undefined,
        preparatory: [{ chord: B }],
        accentNote: { chord: A },
        postAccent: [{ chord: B }],
      },
    ],
  };

  it('fits every colon of a verse and reuses the tone final chord across colons', () => {
    const cola = [
      {
        role: 'mediant' as const,
        words: colon([
          { text: 'MI', hasStress: true },
          { text: 'nus', hasStress: false },
        ]),
      },
      {
        role: 'termination' as const,
        words: colon([
          { text: 'DO', hasStress: true },
          { text: 'mi', hasStress: false },
        ]),
      },
    ];
    const pitched = fitChordVerse(cola, tone, false);
    expect(pitched).toHaveLength(2);
    expect(pitched[0]!.role).toBe('mediant');
    expect(pitched[1]!.role).toBe('termination');
    for (const colon of pitched) {
      for (const syllable of colon.syllables) {
        expect(syllable.chords.length).toBeGreaterThan(0);
      }
    }
  });
});
