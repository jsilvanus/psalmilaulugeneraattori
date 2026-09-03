import { describe, expect, it } from 'vitest';
import { checkModeConsistency, detectModeFromAbc } from '../src/antiphon/modeConsistency.js';
import { analyzeMelody, detectMode } from '../src/antiphon/modeDetect.js';

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

  it('a D-final melody mixing B-natural and B-flat is still (only) Dorian, not rejected or reclassified', () => {
    // The "mi contra fa" tritone-avoidance rule: B was customarily
    // flattened in modes I/II (Dorian) under certain melodic conditions,
    // without the chant ceasing to be Dorian -- confirmed via real chant
    // theory sources (see refs/README.md's "Customary B-flat" section).
    // This melody uses BOTH forms of B and should still match Dorian.
    // D-Aeolian, notably, does NOT also match: the flexibility exemption
    // is specific to the two sourced (root, species) pairs, so the B
    // natural in this melody still strictly rules out Aeolian (whose 6th
    // degree is flat B only) -- mixing both forms doesn't manufacture a
    // false ambiguity with a species that was never granted the exemption.
    const matches = checkModeConsistency('X:1\nL:1/4\nK:C\nD E F G A B _B A G F E D |]');
    expect(matches).toHaveLength(1);
    expect(matches[0]).toEqual({ species: 'Dorian', root: { letter: 'D' }, churchMode: 1 });
  });

  it('catches "I thought this was Dorian" when an F# sneaks in: not Dorian, and not saved by the B-flexibility exemption', () => {
    // A raised 3rd (F# instead of Dorian's minor 3rd, F) isn't any
    // documented customary Dorian inflection -- the B-flexibility
    // exemption only ever excuses the B degree specifically, never F.
    const matches = checkModeConsistency('X:1\nL:1/4\nK:C\nD E ^F G A B A G ^F E D |]');
    expect(matches.map((m) => m.species)).not.toContain('Dorian');
  });

  it('extends the same B-flexibility to Lydian (F final), the more usual customary case per the sources', () => {
    // F Lydian's own 4th degree is B (its famous "raised 4th"); flattening
    // it is the more commonly documented case of the two -- and flattening
    // it fully would make the tune indistinguishable from Ionian (see
    // catholicGregorian.ts's own hasBFlat/mode-11-12 reuse comment), but a
    // melody that uses BOTH forms should still read as Lydian, not get
    // rejected or bounced to Ionian-only.
    const matches = checkModeConsistency('X:1\nL:1/4\nK:C\nF G A B c B _B A G F |]');
    const lydian = matches.find((m) => m.species === 'Lydian');
    expect(lydian?.churchMode).toBe(5);
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

describe('detectModeFromAbc', () => {
  it('names the mode when the content actually supports it', () => {
    const result = detectModeFromAbc('X:1\nL:1/4\nK:C\nD E F G A B A G F E D |]');
    expect(result.mode).toBe(1);
    expect(result.root).toEqual({ letter: 'D' });
    expect(result.matches.map((m) => m.species)).toEqual(['Dorian']);
  });

  it('declines to name a mode for a transposed final this engine has no tone data for', () => {
    // G-Dorian (Bb key signature). detectMode, which only sees the bare
    // final letter, confidently calls this mode 7 (G being Mixolydian's
    // canonical final) -- it cannot see the flat at all. This is the whole
    // point of the content-aware path, so assert the contrast directly.
    const abc = 'X:1\nL:1/4\nK:Gdor\nG A B c d e d c B A G |]';
    expect(detectMode(analyzeMelody(abc)).mode).toBe(7);

    const result = detectModeFromAbc(abc);
    expect(result.mode).toBeUndefined();
    expect(result.matches.map((m) => m.species)).toEqual(['Dorian']);
    expect(result.root).toEqual({ letter: 'G' });
  });

  it('never reports more than one canonical churchMode among its matches', () => {
    // The web UI splits matches into "the one that was named" and "the ones
    // the melody can't rule out" (AntiphonInput.ts), which is only coherent
    // because CANONICAL_PAIR holds exactly one species per root letter.
    // Locking that here so the split can't silently start dropping a second
    // named mode if that table ever grows.
    const melodies = [
      'X:1\nL:1/4\nK:C\nD E F G A B A G F E D |]',
      'X:1\nL:1/4\nK:C\nD F A A A G F E D |]',
      'X:1\nL:1/4\nK:C\nC D E D C |]',
      'X:1\nL:1/4\nK:C\nA, C D F F F E D |]',
      'X:1\nL:1/4\nK:C\nF G A B c B _B A G F |]',
      'X:1\nL:1/4\nK:Gdor\nG A B c d e d c B A G |]',
      'X:1\nL:1/4\nK:C\nE F G A B A G F E |]',
    ];
    for (const abc of melodies) {
      const named = detectModeFromAbc(abc).matches.filter((m) => m.churchMode !== undefined);
      expect(named.length).toBeLessThanOrEqual(1);
    }
  });

  it('declines to name a mode, and reports the final, when the content fits no species at all', () => {
    const result = detectModeFromAbc('X:1\nL:1/4\nK:C\nC D E ^F _B C |]');
    expect(result.mode).toBeUndefined();
    expect(result.matches).toEqual([]);
    // Still reports WHICH final the content failed to cohere at.
    expect(result.root).toEqual({ letter: 'C' });
  });
});
