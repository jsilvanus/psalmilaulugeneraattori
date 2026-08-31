import type { Lang, Word } from './types.js';
import { analyzeFinnishWord } from './finnish.js';
import { analyzeLatinWord } from './latin.js';

export function analyzeWord(word: string, lang: Lang): Word {
  switch (lang) {
    case 'fi':
      return analyzeFinnishWord(word);
    case 'la':
      return analyzeLatinWord(word);
  }
}
