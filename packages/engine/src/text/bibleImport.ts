export interface BibleVerseRow {
  book: number;
  chapter: number;
  verse: number;
  text: string;
}

export interface RawImportedVerse {
  /** Verse number in this edition's own numbering (see cross-reference note below). */
  number: number;
  /** May lack chant caesura markup (the `*` / `†` marks) entirely -- this source has none. */
  text: string;
}

/** Psalms is book 19 in this CSV's numbering (standard Protestant book order). */
export const PSALMS_BOOK_NUMBER = 19;

/**
 * Parses the specific semicolon-delimited, quoted CSV export this project's
 * Finnish Bible text comes in: every field is wrapped in double quotes, one
 * verse per line, with embedded double quotes escaped by doubling (`""` ->
 * `"`). Not a general-purpose CSV parser -- this format only.
 */
export function parseBibleCsv(csvText: string): BibleVerseRow[] {
  const rows: BibleVerseRow[] = [];
  for (const line of csvText.split(/\r?\n/)) {
    if (line.trim().length === 0) continue;
    const fields = parseCsvLine(line);
    if (fields.length < 4) {
      throw new Error(`Malformed Bible CSV row (expected 4 fields, got ${fields.length}): ${line}`);
    }
    const [book, chapter, verse, text] = fields as [string, string, string, string];
    rows.push({ book: Number(book), chapter: Number(chapter), verse: Number(verse), text });
  }
  return rows;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] !== '"') {
      throw new Error(`Expected a quoted field at position ${i} in line: ${line}`);
    }
    i++; // skip opening quote
    let value = '';
    while (i < line.length) {
      if (line[i] === '"') {
        if (line[i + 1] === '"') {
          value += '"';
          i += 2;
          continue;
        }
        i++; // skip closing quote
        break;
      }
      value += line[i];
      i++;
    }
    fields.push(value);
    if (line[i] === ';') i++;
  }
  return fields;
}

// Some verses embed an alternate (Masoretic/Hebrew) verse-number
// cross-reference in their text, e.g. "...Absalomia. (3:2) Herra, kuinka...".
// This happens because this edition doesn't count a psalm's superscription
// as verse 1 while the Hebrew numbering does, drifting the numbering by one
// in psalms that have a title -- so the marker can appear mid-verse (right
// after the superscription), not only at the start. Strip it wherever it
// occurs before use.
const CROSS_REFERENCE_PATTERN = /\(\d+:\d+\)\s*/g;

function cleanVerseText(text: string): string {
  return text.replace(CROSS_REFERENCE_PATTERN, '').trim();
}

/**
 * Extracts one psalm's verses from already-parsed Bible CSV rows, cleaned
 * of the cross-reference clutter above. The text still has no chant
 * caesura markup (the `*` / `†` marks) -- this source is plain prose, not a
 * pointed psalter, so verseParser.parseVerseLine will reject it as-is until
 * marked up (by hand, or by a future automatic splitter); that step is
 * deliberately left out of this importer, per the project plan.
 */
export function extractPsalm(
  rows: BibleVerseRow[],
  psalmNumber: number,
  bookNumber = PSALMS_BOOK_NUMBER,
): RawImportedVerse[] {
  return rows
    .filter((row) => row.book === bookNumber && row.chapter === psalmNumber)
    .sort((a, b) => a.verse - b.verse)
    .map((row) => ({ number: row.verse, text: cleanVerseText(row.text) }));
}

export interface VerseRange {
  start: number;
  end: number;
}

export interface VerseReference {
  psalmNumber: number;
  /** Empty means "the whole psalm" -- no restriction. */
  ranges: VerseRange[];
}

function parsePositiveInt(text: string, label: string): number {
  if (!/^\d+$/.test(text)) {
    throw new Error(`Invalid ${label}: expected a positive integer, got "${text}".`);
  }
  const n = Number(text);
  if (n < 1) {
    throw new Error(`Invalid ${label}: must be at least 1.`);
  }
  return n;
}

/**
 * Parses a psalm/verse-range reference such as "3:1-4,6-8", "3:5" (a single
 * verse), or just "3" (the whole psalm). Multiple ranges are comma-separated
 * and need not be in verse order -- selectVerses always returns them in
 * ascending verse order regardless of how the ranges were listed.
 */
export function parseVerseReference(spec: string): VerseReference {
  const trimmed = spec.trim();
  if (trimmed.length === 0) {
    throw new Error('Empty verse reference.');
  }

  const colonIndex = trimmed.indexOf(':');
  const psalmPart = colonIndex === -1 ? trimmed : trimmed.slice(0, colonIndex);
  const rangesPart = colonIndex === -1 ? undefined : trimmed.slice(colonIndex + 1);

  const psalmNumber = parsePositiveInt(psalmPart.trim(), `psalm number "${psalmPart}"`);

  if (rangesPart === undefined || rangesPart.trim().length === 0) {
    return { psalmNumber, ranges: [] };
  }

  const ranges = rangesPart.split(',').map((segment) => {
    const part = segment.trim();
    if (part.length === 0) {
      throw new Error(`Empty verse range in reference "${spec}".`);
    }
    const dashIndex = part.indexOf('-');
    if (dashIndex === -1) {
      const n = parsePositiveInt(part, `verse "${part}"`);
      return { start: n, end: n };
    }
    const start = parsePositiveInt(
      part.slice(0, dashIndex).trim(),
      `verse range start in "${part}"`,
    );
    const end = parsePositiveInt(part.slice(dashIndex + 1).trim(), `verse range end in "${part}"`);
    if (start > end) {
      throw new Error(`Verse range "${part}" has a start greater than its end.`);
    }
    return { start, end };
  });

  return { psalmNumber, ranges };
}

/** Filters verses to the given ranges (or all of them, if ranges is empty), preserving verse order. */
export function selectVerses(verses: RawImportedVerse[], ranges: VerseRange[]): RawImportedVerse[] {
  if (ranges.length === 0) return verses;
  return verses.filter((v) => ranges.some((r) => v.number >= r.start && v.number <= r.end));
}
