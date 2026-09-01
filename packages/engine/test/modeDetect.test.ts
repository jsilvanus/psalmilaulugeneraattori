import { describe, expect, it } from 'vitest';
import { analyzeMelody, analyzeMelodyGabc, detectMode } from '../src/antiphon/modeDetect.js';

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

describe('analyzeMelodyGabc + detectMode', () => {
  it('detects mode 1 (D authentic) from a GABC melody on a c3 clef', () => {
    // Same melody as the ABC mode-1 test above ("D F A A A G F E D"),
    // transposed to GABC pitch letters under a c3 clef (line 3 = C = "f").
    const result = detectMode(
      analyzeMelodyGabc('(c3) a(g) b(i) c(k) d(k) e(k) f(j) g(i) h(h) i(g)'),
    );
    expect(result).toEqual({ mode: 1, finalLetter: 'D' });
  });

  it('detects mode 7 (G authentic) from a GABC melody on a c1 clef', () => {
    // Same melody as the ABC mode-7 test above ("G B d d d c B A G"),
    // transposed to GABC pitch letters under a c1 clef (line 1 = C = "b").
    const result = detectMode(
      analyzeMelodyGabc('(c1) a(f) b(h) c(j) d(j) e(j) f(i) g(h) h(g) i(f)'),
    );
    expect(result).toEqual({ mode: 7, finalLetter: 'G' });
  });

  it("reads pitch letters relative to the score's own clef declaration", () => {
    // f3 clef: line 3 = F = letter "f" itself; "h" sits a third above (line 4 = A).
    const analysis = analyzeMelodyGabc('(f3) a(f) b(h)');
    expect(analysis.firstPitch).toBe(3);
    expect(analysis.finalPitch).toBe(5);
    expect(analysis.ambitusLow).toBe(3);
    expect(analysis.ambitusHigh).toBe(5);
  });

  it('throws when the score has no clef declaration', () => {
    expect(() => analyzeMelodyGabc('a(g) b(i)')).toThrow();
  });

  it('throws for a GABC melody with no notes', () => {
    expect(() => analyzeMelodyGabc('(c3)')).toThrow();
  });
});
