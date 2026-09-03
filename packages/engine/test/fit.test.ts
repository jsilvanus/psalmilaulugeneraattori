import { describe, expect, it } from 'vitest';
import { fitColon, fitVerse } from '../src/tone/fit.js';
import type { CadenceFormula, CadenceNote } from '../src/tone/types.js';
import type { Word } from '../src/phonology/types.js';
import { catholicGregorianToneSet } from '../src/tone/toneSets/catholicGregorian.js';
import { note } from '../src/tone/toneSets/toneBuilders.js';

function notes(...degrees: number[]): CadenceNote[] {
  return degrees.map((d) => note(d));
}

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
    expect(result.map((s) => s.notes)).toEqual([notes(1), notes(0), notes(-1)]);
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
    expect(result.map((s) => s.notes)).toEqual([notes(5), notes(0, -1, -2)]);
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
    expect(result.map((s) => s.notes)).toEqual([notes(0), notes(-1), notes(-1)]);
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
    expect(result.map((s) => s.notes)).toEqual([notes(2), notes(2), notes(2), notes(2)]);
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
    expect(result.map((s) => s.notes)).toEqual([notes(5), notes(1), notes(0)]);
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
    expect(result.map((s) => s.notes)).toEqual([notes(1), notes(0)]);
  });

  it('handles a single-syllable colon by dropping prep/reciting entirely', () => {
    const formula: CadenceFormula = {
      preparatory: [{ degree: 5 }],
      accentNote: { degree: 0 },
      postAccent: [],
    };
    const result = fitColon(colon([{ text: 'DEUS', hasStress: true }]), formula, 5, undefined);
    expect(result.map((s) => s.notes)).toEqual([notes(0)]);
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
    expect(withIntonation.map((s) => s.notes)).toEqual([notes(-3), notes(-2), notes(0)]);

    const withoutIntonation = fitColon(syllables, formula, 5, intonation, {
      isFirstColonOfFirstVerse: false,
    });
    expect(withoutIntonation.map((s) => s.notes)).toEqual([notes(5), notes(1), notes(0)]);
  });

  it('applies a secondaryAccent to an earlier stressed syllable in the reciting-tone region', () => {
    const formula: CadenceFormula = {
      preparatory: [],
      accentNote: { degree: 0 },
      postAccent: [{ degree: -1 }, { degree: -2 }],
      secondaryAccent: {
        preparatory: [],
        accentNote: { degree: 5 },
        postAccent: [{ degree: 4 }, { degree: 3 }],
      },
    };
    const result = fitColon(
      colon([
        { text: 'PRI', hasStress: true },
        { text: 'mus', hasStress: false },
        { text: 'a', hasStress: false },
        { text: 'SE', hasStress: true },
        { text: 'cun', hasStress: false },
        { text: 'dus', hasStress: false },
      ]),
      formula,
      9,
      undefined,
    );
    expect(result.map((s) => s.notes)).toEqual([
      notes(5),
      notes(4),
      notes(3),
      notes(0),
      notes(-1),
      notes(-2),
    ]);
  });

  it('leaves the secondaryAccent region on the plain reciting tone when it has no stressed syllable', () => {
    const formula: CadenceFormula = {
      preparatory: [{ degree: 1 }],
      accentNote: { degree: 0 },
      postAccent: [],
      secondaryAccent: { preparatory: [], accentNote: { degree: 9 }, postAccent: [] },
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
    expect(result.map((s) => s.notes)).toEqual([notes(5), notes(1), notes(0)]);
  });

  it('never applies secondaryAccent when the primary preparatory notes already consume the whole colon', () => {
    const formula: CadenceFormula = {
      preparatory: [{ degree: 5 }],
      accentNote: { degree: 0 },
      postAccent: [],
      secondaryAccent: { preparatory: [], accentNote: { degree: 9 }, postAccent: [] },
    };
    const result = fitColon(
      colon([
        { text: 'PRI', hasStress: true },
        { text: 'MEN', hasStress: true },
      ]),
      formula,
      5,
      undefined,
    );
    // The single preparatory note exactly fills the one syllable before the
    // accent, leaving recitingCount at 0 -- no room for a secondaryAccent.
    expect(result.map((s) => s.notes)).toEqual([notes(5), notes(0)]);
  });
});

describe('fitColon accidental support', () => {
  it('carries a per-note accidental through fitting instead of dropping it', () => {
    // Regression test: PitchedSyllable.notes used to be bare ScaleDegree[],
    // so a CadenceNote.accidental set on any cadence note would silently
    // vanish during fitting. Now it survives, matching the chordal
    // (fitChord.ts) pipeline's existing behaviour.
    const formula: CadenceFormula = {
      preparatory: [],
      accentNote: note(0, 'sharp'),
      postAccent: [],
    };
    const result = fitColon(colon([{ text: 'MI', hasStress: true }]), formula, 5, undefined);
    expect(result[0]!.notes).toEqual([note(0, 'sharp')]);
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

    // Mediant: its real Liber Usualis preparatory shape is 4 notes long
    // ([3, 5, 5, 4], the tone's decorative approach to the cadence), which
    // exactly fills the 4 syllables before this colon's accent.
    expect(mediant!.syllables.slice(0, 4).map((s) => s.notes)).toEqual([
      notes(3),
      notes(5),
      notes(5),
      notes(4),
    ]);
    // Termination: reciting = secondReciting = 3 (G), not tone.reciting,
    // for the syllables before its (1-note) preparatory shape.
    expect(termination!.syllables.slice(0, 4).map((s) => s.notes)).toEqual([
      notes(3),
      notes(3),
      notes(3),
      notes(0),
    ]);
  });
});
