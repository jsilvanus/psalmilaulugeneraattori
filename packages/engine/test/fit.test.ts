import { describe, expect, it } from 'vitest';
import { fitColon, fitVerse } from '../src/tone/fit.js';
import type { CadenceFormula } from '../src/tone/types.js';
import type { Word } from '../src/phonology/types.js';
import { catholicGregorianToneSet } from '../src/tone/toneSets/catholicGregorian.js';

function word(syllables: { text: string; hasStress: boolean }[]): Word {
  return {
    original: syllables.map((s) => s.text).join(''),
    syllables: syllables.map((s) => ({ text: s.text, hasStress: s.hasStress, isPrimary: s.hasStress })),
  };
}

// One word per test colon is enough; fitColon flattens across words anyway.
function colon(syllables: { text: string; hasStress: boolean }[]): Word[] {
  return [word(syllables)];
}

describe('fitColon', () => {
  it('assigns notes 1:1 when trailing syllables exactly match postAccent length', () => {
    const formula: CadenceFormula = {
      preparatory: [{ degree: 1 }],
      accentNote: { degree: 0 },
      postAccent: [{ degree: -1 }],
    };
    const result = fitColon(
      colon([
        { text: 'a', hasStress: false },
        { text: 'MI', hasStress: true },
        { text: 'nus', hasStress: false },
      ]),
      formula,
      5,
      undefined,
    );
    expect(result.map((s) => s.notes)).toEqual([[1], [0], [-1]]);
  });

  it('merges a postAccent shortfall onto the accent syllable as a melisma', () => {
    const formula: CadenceFormula = {
      preparatory: [],
      accentNote: { degree: 0 },
      postAccent: [{ degree: -1 }, { degree: -2 }],
    };
    const result = fitColon(
      colon([
        { text: 'a', hasStress: false },
        { text: 'MEN', hasStress: true },
      ]),
      formula,
      5,
      undefined,
    );
    expect(result.map((s) => s.notes)).toEqual([[5], [0, -1, -2]]);
  });

  it('repeats the last postAccent degree for extra trailing syllables', () => {
    const formula: CadenceFormula = {
      preparatory: [],
      accentNote: { degree: 0 },
      postAccent: [{ degree: -1 }],
    };
    const result = fitColon(
      colon([
        { text: 'MI', hasStress: true },
        { text: 'ri', hasStress: false },
        { text: 'am', hasStress: false },
      ]),
      formula,
      5,
      undefined,
    );
    expect(result.map((s) => s.notes)).toEqual([[0], [-1], [-1]]);
  });

  it('falls back to the accent pitch for excess trailing syllables when postAccent is empty', () => {
    // A flex-style formula has no postAccent notes at all; trailing
    // syllables after the accent must not crash and should stay on the
    // accent's own pitch.
    const formula: CadenceFormula = {
      preparatory: [],
      accentNote: { degree: 2 },
      postAccent: [],
    };
    const result = fitColon(
      colon([
        { text: 'DO', hasStress: true },
        { text: 'nec', hasStress: false },
        { text: 'po', hasStress: false },
        { text: 'nam', hasStress: false },
      ]),
      formula,
      5,
      undefined,
    );
    expect(result.map((s) => s.notes)).toEqual([[2], [2], [2], [2]]);
  });

  it('puts extra syllables before the preparatory notes on the plain reciting tone', () => {
    const formula: CadenceFormula = {
      preparatory: [{ degree: 1 }],
      accentNote: { degree: 0 },
      postAccent: [],
    };
    const result = fitColon(
      colon([
        { text: 'a', hasStress: false },
        { text: 'be', hasStress: false },
        { text: 'MUS', hasStress: true },
      ]),
      formula,
      5,
      undefined,
    );
    expect(result.map((s) => s.notes)).toEqual([[5], [1], [0]]);
  });

  it('drops the leading preparatory notes when the colon is too short to fit them all', () => {
    const formula: CadenceFormula = {
      preparatory: [{ degree: 5 }, { degree: 1 }],
      accentNote: { degree: 0 },
      postAccent: [],
    };
    const result = fitColon(
      colon([
        { text: 'a', hasStress: false },
        { text: 'MEN', hasStress: true },
      ]),
      formula,
      5,
      undefined,
    );
    // Only the trailing slice of `preparatory` that fits (the last note) is used.
    expect(result.map((s) => s.notes)).toEqual([[1], [0]]);
  });

  it('handles a single-syllable colon by dropping prep/reciting entirely', () => {
    const formula: CadenceFormula = {
      preparatory: [{ degree: 5 }],
      accentNote: { degree: 0 },
      postAccent: [],
    };
    const result = fitColon(colon([{ text: 'DEUS', hasStress: true }]), formula, 5, undefined);
    expect(result.map((s) => s.notes)).toEqual([[0]]);
  });

  it('applies intonation only before the accent, and only when requested', () => {
    const formula: CadenceFormula = {
      preparatory: [{ degree: 1 }],
      accentNote: { degree: 0 },
      postAccent: [],
    };
    const syllables = colon([
      { text: 'a', hasStress: false },
      { text: 'be', hasStress: false },
      { text: 'MUS', hasStress: true },
    ]);
    const intonation = [{ degree: -3 }, { degree: -2 }];

    const withIntonation = fitColon(syllables, formula, 5, intonation, {
      isFirstColonOfFirstVerse: true,
    });
    expect(withIntonation.map((s) => s.notes)).toEqual([[-3], [-2], [0]]);

    const withoutIntonation = fitColon(syllables, formula, 5, intonation, {
      isFirstColonOfFirstVerse: false,
    });
    expect(withoutIntonation.map((s) => s.notes)).toEqual([[5], [1], [0]]);
  });
});

describe('fitVerse', () => {
  it('uses secondReciting for the termination colon of tonus peregrinus', () => {
    const tone = catholicGregorianToneSet.tones.find((t) => t.id === 'tonus-peregrinus')!;
    const sixSyllables = colon([
      { text: 'a', hasStress: false },
      { text: 'be', hasStress: false },
      { text: 'ce', hasStress: false },
      { text: 'de', hasStress: false },
      { text: 'FEC', hasStress: true },
      { text: 'it', hasStress: false },
    ]);

    const [mediant, termination] = fitVerse(
      [
        { role: 'mediant', words: sixSyllables },
        { role: 'termination', words: sixSyllables },
      ],
      tone,
      false,
    );

    // Mediant: reciting = 4 (A) throughout the prep/reciting portion.
    expect(mediant!.syllables.slice(0, 4).map((s) => s.notes)).toEqual([[4], [4], [4], [4]]);
    // Termination: reciting = secondReciting = 3 (G), not tone.reciting.
    expect(termination!.syllables.slice(0, 4).map((s) => s.notes)).toEqual([[3], [3], [3], [3]]);
  });
});
