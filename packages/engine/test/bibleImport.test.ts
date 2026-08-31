import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { extractPsalm, parseBibleCsv, PSALMS_BOOK_NUMBER } from '../src/text/bibleImport.js';

describe('parseBibleCsv', () => {
  it('parses quoted, semicolon-delimited rows', () => {
    const csv = '"1";"1";"1";"Alussa loi Jumala taivaan ja maan. "\r\n"1";"1";"2";"Ja maa oli autio. "';
    expect(parseBibleCsv(csv)).toEqual([
      { book: 1, chapter: 1, verse: 1, text: 'Alussa loi Jumala taivaan ja maan. ' },
      { book: 1, chapter: 1, verse: 2, text: 'Ja maa oli autio. ' },
    ]);
  });

  it('unescapes doubled quotes inside a quoted field', () => {
    const csv = '"1";"1";"3";"Ja Jumala sanoi: ""Tulkoon valkeus"". Ja valkeus tuli. "';
    expect(parseBibleCsv(csv)).toEqual([
      { book: 1, chapter: 1, verse: 3, text: 'Ja Jumala sanoi: "Tulkoon valkeus". Ja valkeus tuli. ' },
    ]);
  });

  it('ignores blank lines', () => {
    const csv = '"1";"1";"1";"a"\r\n\r\n"1";"1";"2";"b"\r\n';
    expect(parseBibleCsv(csv)).toHaveLength(2);
  });

  it('throws on a malformed row', () => {
    expect(() => parseBibleCsv('"1";"1";"only three fields"')).toThrow();
  });
});

describe('extractPsalm', () => {
  it('filters by book and chapter, sorts by verse, and strips cross-references', () => {
    const rows = parseBibleCsv(
      [
        '"19";"3";"1";"Daavidin virsi. (3:2) Herra, kuinka paljon minulla on vihollisia. "',
        '"19";"3";"2";"(3:3) Monet sanovat minusta. "',
        '"19";"4";"1";"Should not appear (different chapter). "',
        '"18";"3";"1";"Should not appear (different book). "',
      ].join('\r\n'),
    );

    expect(extractPsalm(rows, 3, 19)).toEqual([
      { number: 1, text: 'Daavidin virsi. Herra, kuinka paljon minulla on vihollisia.' },
      { number: 2, text: 'Monet sanovat minusta.' },
    ]);
  });

  it('defaults to the Psalms book number', () => {
    const rows = parseBibleCsv('"19";"1";"1";"Autuas se mies. "');
    expect(extractPsalm(rows, 1)).toEqual([{ number: 1, text: 'Autuas se mies.' }]);
    expect(PSALMS_BOOK_NUMBER).toBe(19);
  });
});

describe('extractPsalm against the real committed Bible CSV', () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const csvPath = path.join(here, '../../../data/raamattu.csv');
  const rows = parseBibleCsv(readFileSync(csvPath, 'utf-8'));

  it('extracts all 6 verses of Psalm 1, matching the known opening line', () => {
    const psalm1 = extractPsalm(rows, 1);
    expect(psalm1).toHaveLength(6);
    expect(psalm1[0]!.text).toMatch(/^Autuas se mies, joka ei vaella/);
  });

  it('extracts Psalm 150 (the final psalm) with no residual cross-reference markup', () => {
    const psalm150 = extractPsalm(rows, 150);
    expect(psalm150.length).toBeGreaterThan(0);
    for (const verse of psalm150) {
      expect(verse.text).not.toMatch(/^\(\d+:\d+\)/);
    }
  });

  it('strips the embedded cross-reference from Psalm 3, which has a superscription', () => {
    const psalm3 = extractPsalm(rows, 3);
    expect(psalm3[0]!.text).not.toMatch(/\(\d+:\d+\)/);
    expect(psalm3[1]!.text).not.toMatch(/^\(\d+:\d+\)/);
  });
});
