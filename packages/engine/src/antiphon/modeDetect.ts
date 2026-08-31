import { parseOnly } from 'abcjs';
import type { ChurchMode } from '../tone/types.js';

export interface MelodyAnalysis {
  firstPitch: number;
  finalPitch: number;
  ambitusLow: number;
  ambitusHigh: number;
  /** A proxy for the melody's reciting tone: its single most common pitch. */
  mostFrequentPitch: number;
}

function collectPitches(abcText: string): number[] {
  const tunes = parseOnly(abcText);
  const tune = tunes[0];
  if (!tune) {
    throw new Error('Could not parse the ABC melody.');
  }

  const pitches: number[] = [];
  for (const line of tune.lines) {
    for (const staff of line.staff ?? []) {
      for (const voice of staff.voices ?? []) {
        for (const item of voice) {
          if (item.el_type === 'note' && item.pitches && item.pitches.length > 0) {
            pitches.push(item.pitches[0]!.pitch);
          }
        }
      }
    }
  }
  return pitches;
}

/**
 * Parses a user-supplied ABC antiphon melody (reusing abcjs's own parser
 * rather than a second one) and extracts the handful of facts mode
 * detection needs: the first and final pitch, the melody's range, and its
 * most common pitch as a proxy for the reciting tone.
 */
export function analyzeMelody(abcText: string): MelodyAnalysis {
  const pitches = collectPitches(abcText);
  if (pitches.length === 0) {
    throw new Error('The ABC melody has no notes to analyze.');
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
      `Antiphon final "${finalLetter}" is not one of the four standard finals (D, E, F, G); ` +
        'mode detection needs a manual override for this melody.',
    );
  }

  const belowFinal = analysis.finalPitch - analysis.ambitusLow;
  const aboveMostFrequent = analysis.mostFrequentPitch - analysis.finalPitch;
  const isPlagal = belowFinal >= 2 && aboveMostFrequent <= 3;

  return { mode: pair[isPlagal ? 1 : 0], finalLetter };
}
