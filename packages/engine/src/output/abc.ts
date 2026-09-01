import type { PitchedColon } from '../tone/fit.js';
import type { ScaleDegree } from '../tone/types.js';

// Natural-note ABC pitch tokens across several octaves (comma = down an
// octave, apostrophe = up an octave), each entry one diatonic step apart.
const ABC_STEPS = [
  'C,,',
  'D,,',
  'E,,',
  'F,,',
  'G,,',
  'A,,',
  'B,,',
  'C,',
  'D,',
  'E,',
  'F,',
  'G,',
  'A,',
  'B,',
  'C',
  'D',
  'E',
  'F',
  'G',
  'A',
  'B',
  'c',
  'd',
  'e',
  'f',
  'g',
  'a',
  'b',
  "c'",
  "d'",
  "e'",
  "f'",
  "g'",
  "a'",
  "b'",
];
// Anchoring the final at 'C,' keeps typical chant ranges within the "C,-c"
// window (see plan), rather than at the array's true middle.
const FINAL_INDEX = ABC_STEPS.indexOf('C,');

// NOTE: hasBFlat tones are not yet reflected here -- see the matching note
// in gabc.ts; K:C (no accidentals) is used unconditionally in v1.
// Exported for reuse by output/abcChord.ts (chordal/Anglican rendering).
export function abcPitch(degree: ScaleDegree): string {
  const token = ABC_STEPS[FINAL_INDEX + degree];
  if (token === undefined) {
    throw new Error(`Scale degree ${degree} is out of the supported ABC pitch range.`);
  }
  return token;
}

function emitColonNotes(colon: PitchedColon): string {
  let out = '';
  colon.syllables.forEach((syllable, idx) => {
    const piece = syllable.notes.map(abcPitch).join('');
    out += idx > 0 && syllable.isWordStart ? ` ${piece}` : piece;
  });
  return out;
}

export interface AbcMeta {
  title?: string;
}

/**
 * Renders a fitted verse as ABC notation: free rhythm (M:none), one line
 * per colon, notes only -- no lyric (w:) underlay in v1, per the locked-in
 * decision to show syllable text alongside the rendered melody instead.
 */
export function emitAbc(cola: PitchedColon[], meta: AbcMeta = {}): string {
  const header = ['X:1', meta.title ? `T:${meta.title}` : undefined, 'L:1/4', 'M:none', 'K:C']
    .filter((line): line is string => line !== undefined)
    .join('\n');

  const lines = cola.map((colon, idx) => {
    const isLast = idx === cola.length - 1;
    return `${emitColonNotes(colon)} ${isLast ? '|]' : '|'}`;
  });

  return `${header}\n${lines.join('\n')}`;
}
