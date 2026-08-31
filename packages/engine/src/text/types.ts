export type ColonRole = 'flex' | 'mediant' | 'termination';

export interface Colon {
  role: ColonRole;
  text: string;
}

export interface PsalmVerse {
  number?: number;
  cola: Colon[];
  isFirstVerseOfPsalm?: boolean;
}

export class VerseParseError extends Error {
  constructor(
    message: string,
    public readonly line: string,
  ) {
    super(message);
    this.name = 'VerseParseError';
  }
}
