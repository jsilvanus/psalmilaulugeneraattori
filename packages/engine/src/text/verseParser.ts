import type { Colon, ColonRole, PsalmVerse } from './types.js';
import { VerseParseError } from './types.js';

const VERSE_NUMBER_PATTERN = /^\s*(\d+)\s+(.*)$/s;

function normalizeFlexMarker(line: string): string {
  // '+' is accepted on input as a plain-keyboard alias for the flex marker '†'.
  return line.replace(/\+/g, '†');
}

function countOccurrences(text: string, char: string): number {
  let count = 0;
  for (const c of text) {
    if (c === char) count++;
  }
  return count;
}

function splitOnFirst(text: string, marker: string): [string, string] {
  const index = text.indexOf(marker);
  return [text.slice(0, index), text.slice(index + marker.length)];
}

function makeColon(role: ColonRole, text: string): Colon {
  return { role, text: text.trim() };
}

/**
 * Parses a single psalm verse line, already marked with the classic psalter
 * caesura symbols: '*' (required, mediant split) and optionally '†' or its
 * plain-keyboard alias '+' (flex, making the verse tripartite).
 */
export function parseVerseLine(rawLine: string): PsalmVerse {
  const normalized = normalizeFlexMarker(rawLine);
  const numberMatch = VERSE_NUMBER_PATTERN.exec(normalized);
  const number = numberMatch ? Number(numberMatch[1]) : undefined;
  const body = numberMatch ? numberMatch[2]! : normalized;

  const flexCount = countOccurrences(body, '†');
  if (flexCount > 1) {
    throw new VerseParseError('A verse may contain at most one flex marker (†/+).', rawLine);
  }

  let cola: Colon[];
  if (flexCount === 1) {
    const [flexPart, rest] = splitOnFirst(body, '†');
    const starCount = countOccurrences(rest, '*');
    if (starCount !== 1) {
      throw new VerseParseError(
        'A tripartite verse (with †/+) must contain exactly one * marker after the flex.',
        rawLine,
      );
    }
    const [mediantPart, terminationPart] = splitOnFirst(rest, '*');
    cola = [
      makeColon('flex', flexPart),
      makeColon('mediant', mediantPart),
      makeColon('termination', terminationPart),
    ];
  } else {
    const starCount = countOccurrences(body, '*');
    if (starCount === 0) {
      throw new VerseParseError('A verse must contain a * marker for the mediant caesura.', rawLine);
    }
    if (starCount > 1) {
      throw new VerseParseError('A bipartite verse must contain exactly one * marker.', rawLine);
    }
    const [mediantPart, terminationPart] = splitOnFirst(body, '*');
    cola = [makeColon('mediant', mediantPart), makeColon('termination', terminationPart)];
  }

  for (const colon of cola) {
    if (colon.text.length === 0) {
      throw new VerseParseError(`Colon "${colon.role}" is empty.`, rawLine);
    }
  }

  return { number, cola };
}

/**
 * Parses a whole psalm's worth of verse lines (one verse per line). The
 * first non-blank line is flagged as the psalm's first verse, which drives
 * intonation handling during tone-fitting.
 */
export function parsePsalmText(text: string): PsalmVerse[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return lines.map((line, index) => ({
    ...parseVerseLine(line),
    isFirstVerseOfPsalm: index === 0,
  }));
}
