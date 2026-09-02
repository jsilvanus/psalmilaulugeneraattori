import { parseOnly } from 'abcjs';
import type { AccidentalName } from 'abcjs';
import type { Accidental, ChurchMode } from '../tone/types.js';

export interface MelodyAnalysis {
  firstPitch: number;
  finalPitch: number;
  ambitusLow: number;
  ambitusHigh: number;
  /** A proxy for the melody's reciting tone: its single most common pitch. */
  mostFrequentPitch: number;
}

export interface AbcNoteEvent {
  /** Bare diatonic letter (octave marks and accidental prefix stripped), uppercase. */
  letter: string;
  /** This note's own diatonic pitch -- the same step-count convention MelodyAnalysis uses. */
  pitch: number;
  /** The accidental actually written on this specific note, if any. */
  explicitAccidental?: Accidental;
  /** The enclosing staff's key-signature accidental for this letter, if the signature alters it. */
  keySignatureAccidental?: Accidental;
}

// This engine's own Accidental type only covers sharp/flat/natural (the
// only ones any diatonic mode -- or any tone/chord data in this project --
// ever needs); a double sharp/flat or quarter-tone is real ABC syntax but
// outside what a 7-note diatonic mode can represent, so it's rejected
// explicitly rather than silently mishandled.
function toAccidental(name: AccidentalName): Accidental {
  if (name === 'sharp' || name === 'flat' || name === 'natural') return name;
  throw new Error(
    `Accidental "${name}" (double sharp/flat or quarter-tone) is outside the diatonic modes this engine models.`,
  );
}

/**
 * Walks a parsed ABC tune's note events, pairing each with its own bare
 * letter, explicit accidental, and its staff's key-signature accidental for
 * that letter -- shared by collectPitches below (which only needs the bare
 * diatonic pitch) and modeConsistency.ts's checkModeConsistency (which also
 * needs the accidental/key information to resolve true sounding pitches).
 */
export function* walkAbcNotes(abcText: string): Generator<AbcNoteEvent> {
  const tunes = parseOnly(abcText);
  const tune = tunes[0];
  if (!tune) {
    throw new Error('Could not parse the ABC melody.');
  }

  for (const line of tune.lines) {
    for (const staff of line.staff ?? []) {
      const keyAccidentals = new Map<string, Accidental>();
      for (const acc of staff.key?.accidentals ?? []) {
        keyAccidentals.set(acc.note.toUpperCase(), toAccidental(acc.acc));
      }
      for (const voice of staff.voices ?? []) {
        for (const item of voice) {
          if (item.el_type === 'note' && item.pitches && item.pitches.length > 0) {
            const p = item.pitches[0]!;
            const letter = p.name.replace(/[^A-Ga-g]/g, '').toUpperCase();
            yield {
              letter,
              pitch: p.pitch,
              explicitAccidental: p.accidental ? toAccidental(p.accidental) : undefined,
              keySignatureAccidental: keyAccidentals.get(letter),
            };
          }
        }
      }
    }
  }
}

function collectPitches(abcText: string): number[] {
  return Array.from(walkAbcNotes(abcText), (e) => e.pitch);
}

function summarizePitches(pitches: number[]): MelodyAnalysis {
  if (pitches.length === 0) {
    throw new Error('The melody has no notes to analyze.');
  }

  const frequency = new Map<number, number>();
  for (const p of pitches) frequency.set(p, (frequency.get(p) ?? 0) + 1);
  let mostFrequentPitch = pitches[0]!;
  let bestCount = 0;
  for (const [pitch, count] of frequency) {
    if (count > bestCount) {
      bestCount = count;
      mostFrequentPitch = pitch;
    }
  }

  return {
    firstPitch: pitches[0]!,
    finalPitch: pitches[pitches.length - 1]!,
    ambitusLow: Math.min(...pitches),
    ambitusHigh: Math.max(...pitches),
    mostFrequentPitch,
  };
}

/**
 * Parses a user-supplied ABC antiphon melody (reusing abcjs's own parser
 * rather than a second one) and extracts the handful of facts mode
 * detection needs: the first and final pitch, the melody's range, and its
 * most common pitch as a proxy for the reciting tone.
 */
export function analyzeMelody(abcText: string): MelodyAnalysis {
  return summarizePitches(collectPitches(abcText));
}

// GABC pitch letters run 'a' (lowest) to 'm' (highest), one diatonic step
// apart -- same alphabet output/gabc.ts emits. Line 1 (bottom) sits at 'b',
// each staff line two letters higher than the last (line n -> index 2n-1),
// matching real square-notation engraving.
const GABC_LETTERS = 'abcdefghijklm';

interface GabcClef {
  letter: 'c' | 'f';
  line: number;
  /** Index just past the clef declaration's closing ")", for slicing it out of the score before scanning for notes. */
  afterIndex: number;
}

function parseGabcClef(gabcText: string): GabcClef {
  const match = /\(\s*([cf])b?([1-4])\s*\)/.exec(gabcText);
  if (!match) {
    throw new Error(
      'No clef (e.g. "(c3)") found in the GABC score -- mode detection needs it to read pitches.',
    );
  }
  return {
    letter: match[1] as 'c' | 'f',
    line: Number(match[2]),
    afterIndex: match.index + match[0].length,
  };
}

function gabcLetterToPitch(letter: string, clef: GabcClef): number {
  const letterIndex = GABC_LETTERS.indexOf(letter);
  const clefLetterIndex = 2 * clef.line - 1; // line n -> 'b'/'d'/'f'/'h' at index 1/3/5/7
  const clefNoteIndex = clef.letter === 'c' ? 0 : 3; // C=0, F=3, matching abcjs's own pitch-number convention below
  return clefNoteIndex + (letterIndex - clefLetterIndex);
}

function collectGabcPitches(gabcText: string): number[] {
  const clef = parseGabcClef(gabcText);
  // Drop the leading clef declaration itself so its "c"/"f" letter is never
  // mistaken for a pitch letter (both fall inside the a-m alphabet).
  const afterClef = gabcText.slice(clef.afterIndex);

  const pitches: number[] = [];
  const noteGroup = /\(([^)]*)\)/g;
  let match: RegExpExecArray | null;
  while ((match = noteGroup.exec(afterClef))) {
    for (const ch of match[1]!) {
      if (ch >= 'a' && ch <= 'm') pitches.push(gabcLetterToPitch(ch, clef));
    }
  }
  return pitches;
}

/**
 * Parses a user-supplied GABC antiphon melody and extracts the same facts
 * `analyzeMelody` does for ABC, so mode detection and tone matching work
 * identically regardless of which notation the user pasted. Pitch letters
 * are read relative to the score's own clef declaration (e.g. "(c3)",
 * "(f4)") -- see gabcLetterToPitch. Known v1 simplification: only the
 * score's first/leading clef is honored; a mid-score clef change is not
 * tracked (matching the clef-agnostic simplifications already documented
 * in output/gabc.ts).
 */
export function analyzeMelodyGabc(gabcText: string): MelodyAnalysis {
  return summarizePitches(collectGabcPitches(gabcText));
}

const NOTE_LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

// abcjs's `pitch` field is a diatonic step count from its internal
// reference (0 = middle-line C for an unmodified K:C), so pitch % 7 gives
// the note letter directly.
function pitchClassLetter(pitch: number): string {
  const idx = ((pitch % 7) + 7) % 7;
  return NOTE_LETTERS[idx]!;
}

const MODE_PAIR_FOR_FINAL: Record<string, [ChurchMode, ChurchMode]> = {
  D: [1, 2],
  E: [3, 4],
  F: [5, 6],
  G: [7, 8],
  // Glarean's 1547 additions (see types.ts's ChurchMode doc comment):
  // Aeolian/Hypoaeolian (final A) and Ionian/Hypoionian (final C).
  A: [9, 10],
  C: [11, 12],
};

export interface ModeDetectionResult {
  mode: ChurchMode;
  finalLetter: string;
}

/**
 * Standard simplification: classify authentic vs. plagal by whether the
 * melody dips notably below the final (plagal) or stays mostly above it
 * (authentic), using the most-frequent pitch as a reciting-tone proxy. Real
 * chant scholarship uses finer criteria; irregular melodies can misclassify,
 * so callers should offer a manual override rather than trusting this blindly.
 */
export function detectMode(analysis: MelodyAnalysis): ModeDetectionResult {
  const finalLetter = pitchClassLetter(analysis.finalPitch);
  const pair = MODE_PAIR_FOR_FINAL[finalLetter];
  if (!pair) {
    throw new Error(
      `Antiphon final "${finalLetter}" is not one of the six supported finals (D, E, F, G, A, C); ` +
        'mode detection needs a manual override for this melody.',
    );
  }

  const belowFinal = analysis.finalPitch - analysis.ambitusLow;
  const aboveMostFrequent = analysis.mostFrequentPitch - analysis.finalPitch;
  const isPlagal = belowFinal >= 2 && aboveMostFrequent <= 3;

  return { mode: pair[isPlagal ? 1 : 0], finalLetter };
}
