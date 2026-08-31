export interface Syllable {
  text: string;
  hasStress: boolean;
  isPrimary: boolean;
}

export interface Word {
  original: string;
  syllables: Syllable[];
}

export type Lang = 'fi' | 'la';
