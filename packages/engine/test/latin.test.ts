import { describe, expect, it } from 'vitest';
import { analyzeLatinWord } from '../src/phonology/latin.js';

function syllableTexts(word: string): string[] {
  return analyzeLatinWord(word).syllables.map((s) => s.text);
}

function stressedSyllable(word: string): string {
  const w = analyzeLatinWord(word);
  return w.syllables.find((s) => s.isPrimary)!.text;
}

describe('analyzeLatinWord', () => {
  it('treats qu+vowel as a single consonantal unit (qui = one syllable)', () => {
    expect(syllableTexts('qui')).toEqual(['qui']);
  });

  it('splits aqua as a.qua, keeping qu inseparable', () => {
    expect(syllableTexts('aqua')).toEqual(['a', 'qua']);
  });

  it('splits factum with only the last consonant moving on (not a legal onset cluster)', () => {
    expect(syllableTexts('factum')).toEqual(['fac', 'tum']);
  });

  it('moves a legal onset cluster (tr) entirely to the next syllable', () => {
    expect(syllableTexts('patris')).toEqual(['pa', 'tris']);
  });

  it('keeps a diphthong as one syllable nucleus', () => {
    expect(syllableTexts('saeculorum')).toEqual(['sae', 'cu', 'lo', 'rum']);
  });

  it('always stresses the penult in a disyllabic word', () => {
    expect(stressedSyllable('factum')).toBe('fac');
    expect(stressedSyllable('patris')).toBe('pa');
  });

  it('stresses the antepenult when the penult is a light (open, short) syllable', () => {
    // do.mi.nus: penult 'mi' is open/light -> stress moves to the antepenult 'do'.
    expect(syllableTexts('Dominus')).toEqual(['Do', 'mi', 'nus']);
    expect(stressedSyllable('Dominus')).toBe('Do');

    // om.ni.a: penult 'ni' is open/light -> antepenult 'om' stressed.
    expect(syllableTexts('omnia')).toEqual(['om', 'ni', 'a']);
    expect(stressedSyllable('omnia')).toBe('om');
  });

  it('stresses the penult when it is closed (heavy)', () => {
    // ad.ven.tus: penult 'ven' ends in a consonant -> heavy -> stress stays on it.
    expect(syllableTexts('adventus')).toEqual(['ad', 'ven', 'tus']);
    expect(stressedSyllable('adventus')).toBe('ven');
  });
});
