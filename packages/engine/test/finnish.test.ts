import { describe, expect, it } from 'vitest';
import { analyzeFinnishWord } from '../src/phonology/finnish.js';

function syllableTexts(word: string): string[] {
  return analyzeFinnishWord(word).syllables.map((s) => s.text);
}

function stressPattern(word: string): boolean[] {
  return analyzeFinnishWord(word).syllables.map((s) => s.hasStress);
}

describe('analyzeFinnishWord', () => {
  it('splits a single intervening consonant to the following syllable', () => {
    expect(syllableTexts('kala')).toEqual(['ka', 'la']);
  });

  it('splits a consonant cluster leaving one consonant on each side', () => {
    expect(syllableTexts('kukka')).toEqual(['kuk', 'ka']);
  });

  it('keeps a diphthong as one syllable nucleus', () => {
    expect(syllableTexts('taivas')).toEqual(['tai', 'vas']);
  });

  it('splits hiatus (non-diphthong vowel sequence) into separate syllables', () => {
    expect(syllableTexts('koettaa')).toEqual(['ko', 'et', 'taa']);
  });

  it('keeps identical adjacent vowels (long vowel) as one syllable', () => {
    expect(syllableTexts('maa')).toEqual(['maa']);
  });

  it('stresses only the first syllable of a disyllabic word', () => {
    expect(stressPattern('kala')).toEqual([true, false]);
  });

  it('adds secondary stress on odd syllables but never the final one', () => {
    // herralleni: her-ral-le-ni (4 syllables) -> stress on 1 and 3, not 4.
    expect(syllableTexts('herralleni')).toEqual(['her', 'ral', 'le', 'ni']);
    expect(stressPattern('herralleni')).toEqual([true, false, true, false]);
  });

  it('preserves leading and trailing punctuation on the outer syllables', () => {
    const word = analyzeFinnishWord('(herralleni:');
    expect(word.syllables[0]!.text).toBe('(her');
    expect(word.syllables.at(-1)!.text).toBe('ni:');
  });
});
