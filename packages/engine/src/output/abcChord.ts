import type { PitchedChordColon } from '../tone/fitChord.js';
import type { Chord } from '../tone/chordTypes.js';
import { abcPitch } from './abc.js';

// One ABC "chord" per note position, bracketed ([CEGc]) -- a single voice
// sounding all four parts at once, rather than four separate staves. See
// PitchedChordColon: each voice keeps its own degree, so a future
// choir-ready (four-staff) emitter can read the exact same fitted data;
// this is just today's simpler rendering choice, not a data-model limit.
function emitChord(chord: Chord): string {
  return `[${abcPitch(chord.soprano)}${abcPitch(chord.alto)}${abcPitch(chord.tenor)}${abcPitch(chord.bass)}]`;
}

function emitColonNotes(colon: PitchedChordColon): string {
  let out = '';
  colon.syllables.forEach((syllable, idx) => {
    const piece = syllable.chords.map(emitChord).join('');
    out += idx > 0 && syllable.isWordStart ? ` ${piece}` : piece;
  });
  return out;
}

export interface AbcChordMeta {
  title?: string;
}

/**
 * Renders a fitted chordal (Anglican-chant-style) verse as ABC notation:
 * free rhythm (M:none), one line per colon, each note a bracketed 4-note
 * chord -- see emitChord. Mirrors output/abc.ts's emitAbc.
 */
export function emitAbcChordal(cola: PitchedChordColon[], meta: AbcChordMeta = {}): string {
  const header = ['X:1', meta.title ? `T:${meta.title}` : undefined, 'L:1/4', 'M:none', 'K:C']
    .filter((line): line is string => line !== undefined)
    .join('\n');

  const lines = cola.map((colon, idx) => {
    const isLast = idx === cola.length - 1;
    return `${emitColonNotes(colon)} ${isLast ? '|]' : '|'}`;
  });

  return `${header}\n${lines.join('\n')}`;
}
