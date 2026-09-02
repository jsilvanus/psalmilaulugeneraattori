import { describe, expect, it } from 'vitest';
import { checkModeConsistency } from '../src/antiphon/modeConsistency.js';

describe('checkModeConsistency', () => {
  it('confirms a clean D-final melody using only naturals as Dorian, with churchMode 1', () => {
    // Uses every scale degree (including the natural 6th, B) so it
    // actually disambiguates Dorian from D-Aeolian (which differs only in
    // a flat 6th) -- a melody that never touches the 6th degree at all
    // would be genuinely ambiguous between them, not a Dorian-only match.
    const matches = checkModeConsistency('X:1\nL:1/4\nK:C\nD E F G A B A G F E D |]');
    expect(matches).toHaveLength(1);
    expect(matches[0]).toEqual({ species: 'Dorian', root: { letter: 'D' }, churchMode: 1 });
  });

  it('catches "I thought this was Dorian" when a flat 6th sneaks in: not Dorian, matches D-Aeolian instead with no churchMode', () => {
    // Dorian's 6th above D is natural B; a Bb here is Dorian's classic
    // real-world confusion with (natural) minor -- exactly the mistake
    // described in conversation: landed the final on D assuming Dorian,
    // but the actual content isn't really Dorian.
    const matches = checkModeConsistency('X:1\nL:1/4\nK:C\nD E F G A _B A G F E D |]');
    const species = matches.map((m) => m.species);
    expect(species).not.toContain('Dorian');
    expect(species).toContain('Aeolian');
    // D-Aeolian isn't one of this engine's 6 canonical (natural-final)
    // pairs (Aeolian's canonical final is A, not D) -- correctly reported
    // as a real match with no churchMode, not silently forced into one.
    const aeolian = matches.find((m) => m.species === 'Aeolian')!;
    expect(aeolian.churchMode).toBeUndefined();
  });

  it('recognizes a transposed mode via its key signature: G Dorian (Bb key signature), no churchMode', () => {
    // The final itself (G) isn't altered -- only B is, per the Gdor
    // signature -- so the root is plain G; it's the *content* (a Bb, not
    // G's own letter) that makes this Dorian rather than Mixolydian
    // (G-Mixolydian's natural final, which this would misreport as
    // without reading the key signature at all). Touches the 6th degree
    // (E) too, so it disambiguates from G-Aeolian the same way the D-final
    // tests above need a B to disambiguate from D-Aeolian.
    const matches = checkModeConsistency('X:1\nL:1/4\nK:Gdor\nG A B c d e d c B A G |]');
    expect(matches).toHaveLength(1);
    expect(matches[0]).toEqual({
      species: 'Dorian',
      root: { letter: 'G' },
      churchMode: undefined,
    });
  });

  it('reports several matches honestly when the melody is too simple to disambiguate', () => {
    // Only C, D, E used -- consistent with any species-at-C that includes
    // those three degrees as its 1st/2nd/3rd (Ionian and Lydian both do;
    // Mixolydian also shares scale degrees 1/2/3 with Ionian).
    const matches = checkModeConsistency('X:1\nL:1/4\nK:C\nC D E D C |]');
    expect(matches.length).toBeGreaterThan(1);
    expect(matches.map((m) => m.species)).toContain('Ionian');
  });

  it('reports zero matches when the content fits no diatonic species at that final', () => {
    // A tritone's worth of alterations against a C final -- no 7-note
    // diatonic species built on C contains both F# and Bb together with
    // C, D, E.
    const matches = checkModeConsistency('X:1\nL:1/4\nK:C\nC D E ^F _B C |]');
    expect(matches).toEqual([]);
  });

  it('resolves the plagal pairing too, matching detectMode', () => {
    // Same melody as modeDetect.test.ts's mode-2 (D plagal) case.
    const matches = checkModeConsistency('X:1\nL:1/4\nK:C\nA, C D F F F E D |]');
    const dorian = matches.find((m) => m.species === 'Dorian');
    expect(dorian?.churchMode).toBe(2);
  });

  it('throws for an empty melody', () => {
    expect(() => checkModeConsistency('X:1\nL:1/4\nK:C\n')).toThrow();
  });
});
