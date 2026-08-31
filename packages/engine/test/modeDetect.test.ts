import { describe, expect, it } from 'vitest';
import { analyzeMelody, detectMode } from '../src/antiphon/modeDetect.js';

// These are synthetic test melodies illustrating each mode's classic
// final/range/reciting-tone shape (not transcriptions of specific named
// chant-book antiphons), used to validate the mode-detection heuristic
// across both finals and the authentic/plagal distinction.

function detect(abc: string) {
  return detectMode(analyzeMelody(`X:1\nL:1/4\nK:C\n${abc}`));
}

describe('analyzeMelody + detectMode', () => {
  it('detects mode 1 (D authentic): range stays at or above the final', () => {
    const result = detect('D F A A A G F E D |]');
    expect(result).toEqual({ mode: 1, finalLetter: 'D' });
  });

  it('detects mode 2 (D plagal): range dips below the final, reciting a third above', () => {
    const result = detect('A, C D F F F E D |]');
    expect(result).toEqual({ mode: 2, finalLetter: 'D' });
  });

  it('detects mode 7 (G authentic): range stays at or above the final', () => {
    const result = detect('G B d d d c B A G |]');
    expect(result).toEqual({ mode: 7, finalLetter: 'G' });
  });

  it('detects mode 8 (G plagal): range dips below the final, reciting a fourth above', () => {
    const result = detect('D F G c c c B A G |]');
    expect(result).toEqual({ mode: 8, finalLetter: 'G' });
  });

  it('throws when the final is not one of the four standard finals', () => {
    // Final on A is not D/E/F/G -- mode detection needs a manual override.
    expect(() => detect('A B c c B A |]')).toThrow();
  });

  it('throws for an empty melody', () => {
    expect(() => analyzeMelody('X:1\nL:1/4\nK:C\n')).toThrow();
  });
});
