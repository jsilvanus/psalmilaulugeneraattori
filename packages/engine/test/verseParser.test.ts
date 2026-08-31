import { describe, expect, it } from 'vitest';
import { parsePsalmText, parseVerseLine } from '../src/text/verseParser.js';
import { VerseParseError } from '../src/text/types.js';

describe('parseVerseLine', () => {
  it('splits a bipartite verse on *', () => {
    const verse = parseVerseLine('Dixit Dominus Domino meo: * sede a dextris meis.');
    expect(verse.cola).toEqual([
      { role: 'mediant', text: 'Dixit Dominus Domino meo:' },
      { role: 'termination', text: 'sede a dextris meis.' },
    ]);
  });

  it('extracts a leading verse number', () => {
    const verse = parseVerseLine('1 Herra sanoi minun herralleni: * istu minun oikealle puolelleni.');
    expect(verse.number).toBe(1);
    expect(verse.cola[0]!.text).toBe('Herra sanoi minun herralleni:');
  });

  it('splits a tripartite verse on † then *', () => {
    const verse = parseVerseLine('Donec ponam † inimicos tuos * scabellum pedum tuorum.');
    expect(verse.cola).toEqual([
      { role: 'flex', text: 'Donec ponam' },
      { role: 'mediant', text: 'inimicos tuos' },
      { role: 'termination', text: 'scabellum pedum tuorum.' },
    ]);
  });

  it('accepts + as a plain-keyboard alias for †', () => {
    const verse = parseVerseLine('Donec ponam + inimicos tuos * scabellum pedum tuorum.');
    expect(verse.cola[0]!.role).toBe('flex');
    expect(verse.cola[0]!.text).toBe('Donec ponam');
  });

  it('rejects a verse with no * marker', () => {
    expect(() => parseVerseLine('Dixit Dominus Domino meo sede a dextris meis.')).toThrow(
      VerseParseError,
    );
  });

  it('rejects a verse with more than one * marker', () => {
    expect(() => parseVerseLine('a * b * c')).toThrow(VerseParseError);
  });

  it('rejects a tripartite verse missing the *', () => {
    expect(() => parseVerseLine('a † b c')).toThrow(VerseParseError);
  });

  it('rejects a verse with more than one flex marker', () => {
    expect(() => parseVerseLine('a † b † c * d')).toThrow(VerseParseError);
  });

  it('rejects an empty colon', () => {
    expect(() => parseVerseLine('* only termination')).toThrow(VerseParseError);
  });
});

describe('parsePsalmText', () => {
  it('parses multiple verses and flags the first', () => {
    const verses = parsePsalmText(
      [
        '1 Dixit Dominus Domino meo: * sede a dextris meis.',
        '2 Donec ponam † inimicos tuos * scabellum pedum tuorum.',
      ].join('\n'),
    );
    expect(verses).toHaveLength(2);
    expect(verses[0]!.isFirstVerseOfPsalm).toBe(true);
    expect(verses[1]!.isFirstVerseOfPsalm).toBe(false);
    expect(verses[1]!.cola).toHaveLength(3);
  });

  it('ignores blank lines', () => {
    const verses = parsePsalmText('\n1 a * b\n\n2 c * d\n\n');
    expect(verses).toHaveLength(2);
  });
});
