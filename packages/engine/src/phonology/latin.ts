import type { Syllable, Word } from './types.js';
import { attachAffixes, extractWordCore, tokenizeClusters } from './syllableUtils.js';

const LA_VOWELS = new Set(['a', 'e', 'i', 'o', 'u', 'y']);

// The main classical diphthongs; rarer ones (ei, ui) are omitted per plan.
const LA_DIPHTHONGS = new Set(['ae', 'oe', 'au', 'eu']);

// Clusters that stay together as a single syllable onset: liquid/stop and
// s+stop combinations, common Greek-derived digraphs, and qu/gu (which are
// always inseparable once the 'u' has been reclassified as a consonant).
const LA_ONSET_CLUSTERS = new Set([
  'pr', 'br', 'tr', 'dr', 'cr', 'gr', 'fr',
  'pl', 'bl', 'cl', 'gl', 'fl',
  'sp', 'st', 'sc', 'sm', 'sn', 'sq',
  'ph', 'th', 'ch', 'gn',
  'qu', 'gu',
]);

function isLatinVowelLetter(ch: string): boolean {
  return LA_VOWELS.has(ch.toLowerCase());
}

// 'qu'/'gu' immediately followed by a vowel form a single consonantal unit;
// the 'u' does not itself act as a syllable nucleus (qui -> one syllable,
// aqua -> a.qua).
function computeVowelFlags(core: string): boolean[] {
  const flags = Array.from(core, (ch) => isLatinVowelLetter(ch));
  for (let i = 0; i < core.length - 2; i++) {
    const first = core[i]!.toLowerCase();
    const second = core[i + 1]!.toLowerCase();
    if ((first === 'q' || first === 'g') && second === 'u' && isLatinVowelLetter(core[i + 2]!)) {
      flags[i + 1] = false;
    }
  }
  return flags;
}

interface SyllableInfo {
  text: string;
  nucleusLength: number;
  endsInConsonant: boolean;
}

// Of a consonant cluster between two vowels: a single consonant moves fully
// to the next syllable's onset (amo -> a.mo); of a longer cluster, the last
// two consonants move together only if they're a legal onset (patris ->
// pa.tris), otherwise just the last one does (factum -> fac.tum).
function splitConsonantCluster(cluster: string): { coda: string; onset: string } {
  if (cluster.length === 0) return { coda: '', onset: '' };
  if (cluster.length === 1) return { coda: '', onset: cluster };
  const lastTwo = cluster.slice(-2).toLowerCase();
  if (LA_ONSET_CLUSTERS.has(lastTwo)) {
    return { coda: cluster.slice(0, cluster.length - 2), onset: cluster.slice(cluster.length - 2) };
  }
  return { coda: cluster.slice(0, cluster.length - 1), onset: cluster.slice(cluster.length - 1) };
}

function splitVowelCluster(vowels: string): string[] {
  const groups: string[] = [];
  let i = 0;
  while (i < vowels.length) {
    if (i + 1 < vowels.length && LA_DIPHTHONGS.has(vowels.slice(i, i + 2).toLowerCase())) {
      groups.push(vowels.slice(i, i + 2));
      i += 2;
      continue;
    }
    groups.push(vowels[i]!);
    i += 1;
  }
  return groups;
}

function buildSyllableInfos(core: string): SyllableInfo[] {
  const flags = computeVowelFlags(core);
  const clusters = tokenizeClusters(core, (i) => flags[i]!);
  const syllables: SyllableInfo[] = [];
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
      const nucleus = nuclei[n]!;
      let text = pendingOnset + nucleus;
      pendingOnset = '';
      let endsInConsonant = false;
      const isLastNucleusHere = n === nuclei.length - 1;
      if (isLastNucleusHere && consonantCluster.length > 0) {
        if (isLastVowelCluster) {
          text += consonantCluster;
          endsInConsonant = true;
        } else {
          const { coda, onset } = splitConsonantCluster(consonantCluster);
          text += coda;
          endsInConsonant = coda.length > 0;
          pendingOnset = onset;
        }
      }
      syllables.push({ text, nucleusLength: nucleus.length, endsInConsonant });
    }

    i += hasConsonantAfter ? 2 : 1;
  }

  return syllables.length > 0 ? syllables : [{ text: pendingOnset || core, nucleusLength: 0, endsInConsonant: false }];
}

// Penultimate law, using the standard macron-free simplification: a syllable
// is "heavy" if it's closed (ends in a consonant) or its nucleus is a
// diphthong. Known v1 limitation: a long vowel in an open syllable is
// invisible without macrons and may mis-stress to the antepenult.
function assignStress(infos: SyllableInfo[]): Syllable[] {
  const n = infos.length;
  if (n <= 2) {
    return infos.map((info, idx) => ({ text: info.text, hasStress: idx === 0, isPrimary: idx === 0 }));
  }
  const penultIndex = n - 2;
  const penult = infos[penultIndex]!;
  const penultIsHeavy = penult.nucleusLength === 2 || penult.endsInConsonant;
  const stressedIndex = penultIsHeavy ? penultIndex : penultIndex - 1;
  return infos.map((info, idx) => ({
    text: info.text,
    hasStress: idx === stressedIndex,
    isPrimary: idx === stressedIndex,
  }));
}

export function analyzeLatinWord(word: string): Word {
  const { prefix, core, suffix } = extractWordCore(word);
  if (core.length === 0) {
    return { original: word, syllables: [{ text: word, hasStress: true, isPrimary: true }] };
  }
  const infos = buildSyllableInfos(core);
  const syllables = attachAffixes(assignStress(infos), prefix, suffix);
  return { original: word, syllables };
}
