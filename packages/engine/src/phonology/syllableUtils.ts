import type { Syllable } from './types.js';

export interface ClusterToken {
  type: 'V' | 'C';
  text: string;
}

/**
 * Splits `core` into a strictly alternating sequence of vowel/consonant
 * clusters, using a per-index vowel predicate (Latin needs this to be
 * positional, since qu/gu reclassify a specific 'u' as a consonant).
 */
export function tokenizeClusters(core: string, isVowelAt: (index: number) => boolean): ClusterToken[] {
  const tokens: ClusterToken[] = [];
  let i = 0;
  while (i < core.length) {
    const type: 'V' | 'C' = isVowelAt(i) ? 'V' : 'C';
    let j = i + 1;
    while (j < core.length && (isVowelAt(j) ? 'V' : 'C') === type) j++;
    tokens.push({ type, text: core.slice(i, j) });
    i = j;
  }
  return tokens;
}

/**
 * Splits leading/trailing punctuation off a word so syllabification only
 * has to deal with letters; the affixes are re-attached to the first/last
 * syllable afterward via `attachAffixes`.
 */
export function extractWordCore(word: string): { prefix: string; core: string; suffix: string } {
  const leadingMatch = /^[^\p{L}]+/u.exec(word);
  const prefix = leadingMatch ? leadingMatch[0] : '';
  const rest = word.slice(prefix.length);
  const trailingMatch = /[^\p{L}]+$/u.exec(rest);
  const suffix = trailingMatch ? trailingMatch[0] : '';
  const core = suffix.length > 0 ? rest.slice(0, rest.length - suffix.length) : rest;
  return { prefix, core, suffix };
}

export function attachAffixes(syllables: Syllable[], prefix: string, suffix: string): Syllable[] {
  if (syllables.length === 0) return syllables;
  const result = syllables.slice();
  const lastIdx = result.length - 1;
  result[0] = { ...result[0]!, text: prefix + result[0]!.text };
  result[lastIdx] = { ...result[lastIdx]!, text: result[lastIdx]!.text + suffix };
  return result;
}
