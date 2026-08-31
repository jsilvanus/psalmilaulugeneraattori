import type { Syllable, Word } from './types.js';
import { attachAffixes, extractWordCore, tokenizeClusters } from './syllableUtils.js';

const FI_VOWELS = new Set(['a', 'e', 'i', 'o', 'u', 'y', 'ä', 'ö', 'å']);

// The standard Finnish diphthong inventory. Any other adjacent vowel pair is
// hiatus (split into two syllables), as is a pair of non-identical vowels
// not in this list.
const FI_DIPHTHONGS = new Set([
  'ai', 'ei', 'oi', 'ui', 'yi', 'äi', 'öi',
  'au', 'eu', 'iu', 'ou',
  'ey', 'iy', 'äy', 'öy',
  'ie', 'uo', 'yö',
]);

function isFinnishVowel(ch: string): boolean {
  return FI_VOWELS.has(ch.toLowerCase());
}

// Known v1 limitation: a run of 3+ vowels is resolved greedily left-to-right
// (at most one diphthong pair recognized per pass), which covers the common
// cases but can be ambiguous for rare longer vowel runs.
function splitVowelCluster(vowels: string): string[] {
  const groups: string[] = [];
  let i = 0;
  while (i < vowels.length) {
    if (i + 1 < vowels.length) {
      const pair = vowels.slice(i, i + 2).toLowerCase();
      // A diphthong, or two identical vowels (a long vowel), stay in one syllable.
      if (FI_DIPHTHONGS.has(pair) || pair[0] === pair[1]) {
        groups.push(vowels.slice(i, i + 2));
        i += 2;
        continue;
      }
    }
    groups.push(vowels[i]!);
    i += 1;
  }
  return groups;
}

// Finnish consonant-cluster rule: of a cluster between two vowels, exactly
// one consonant (the last) moves to the following syllable's onset; the
// rest stay as the preceding syllable's coda (kukka -> kuk.ka; kala -> ka.la).
function buildSyllableTexts(core: string): string[] {
  const clusters = tokenizeClusters(core, (i) => isFinnishVowel(core[i]!));
  const syllables: string[] = [];
  let pendingOnset = '';
  let i = 0;

  if (clusters.length > 0 && clusters[0]!.type === 'C') {
    pendingOnset = clusters[0]!.text;
    i = 1;
  }

  while (i < clusters.length) {
    const vowelCluster = clusters[i]!;
    const nuclei = splitVowelCluster(vowelCluster.text);
    const hasConsonantAfter = i + 1 < clusters.length && clusters[i + 1]!.type === 'C';
    const consonantCluster = hasConsonantAfter ? clusters[i + 1]!.text : '';
    const isLastVowelCluster = i + 2 >= clusters.length;

    for (let n = 0; n < nuclei.length; n++) {
      let syll = pendingOnset + nuclei[n];
      pendingOnset = '';
      const isLastNucleusHere = n === nuclei.length - 1;
      if (isLastNucleusHere && consonantCluster.length > 0) {
        if (isLastVowelCluster) {
          // Word-final consonants: no following vowel to hand them to.
          syll += consonantCluster;
        } else {
          const codaLen = consonantCluster.length - 1;
          syll += consonantCluster.slice(0, codaLen);
          pendingOnset = consonantCluster.slice(codaLen);
        }
      }
      syllables.push(syll);
    }

    i += hasConsonantAfter ? 2 : 1;
  }

  return syllables.length > 0 ? syllables : [pendingOnset || core];
}

// Primary stress always on syllable 1; secondary stress on every subsequent
// odd syllable (3, 5, 7, ...), but never on the word's final syllable.
// Known v1 limitation: compound words get one stress domain for the whole
// orthographic word rather than one primary stress per component, since
// compound-boundary detection needs a lexicon beyond v1 scope.
function assignStress(texts: string[]): Syllable[] {
  const total = texts.length;
  return texts.map((text, idx) => {
    const position = idx + 1;
    const isFinal = idx === total - 1;
    const isPrimary = position === 1;
    const isSecondary = !isPrimary && !isFinal && position >= 3 && position % 2 === 1;
    return { text, hasStress: isPrimary || isSecondary, isPrimary };
  });
}

export function analyzeFinnishWord(word: string): Word {
  const { prefix, core, suffix } = extractWordCore(word);
  if (core.length === 0) {
    return { original: word, syllables: [{ text: word, hasStress: true, isPrimary: true }] };
  }
  const texts = buildSyllableTexts(core);
  const syllables = attachAffixes(assignStress(texts), prefix, suffix);
  return { original: word, syllables };
}
