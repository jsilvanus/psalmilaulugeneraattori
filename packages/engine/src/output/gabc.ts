import type { PitchedColon } from '../tone/fit.js';
import type { CadenceNote, ScaleDegree } from '../tone/types.js';

// GABC pitch letters run 'a' (lowest) to 'm' (highest), each one diatonic
// step apart; the clef then fixes what absolute pitch a letter represents.
// We anchor the tone's final at 'h' (index 7), giving room for roughly a
// 7th below and a 5th above, which comfortably covers the ranges used here.
const GABC_LETTERS = 'abcdefghijklm';
const FINAL_LETTER_INDEX = GABC_LETTERS.indexOf('h');

// NOTE: hasBFlat tones (5/6-style signature) and per-note CadenceNote.accidental
// values are not yet reflected in the emitted pitch letters, even though both
// are now modelled at the type level (see tone/types.ts) and rendered in ABC
// output (output/abc.ts) -- GABC's accidental syntax needs to be verified
// against the Gregorio spec before it's implemented here, rather than guessed.
// This is a known v1 gap, not a silent inaccuracy: no accidental is ever emitted.
function gabcPitchLetter(degree: ScaleDegree): string {
  const index = FINAL_LETTER_INDEX + degree;
  const letter = GABC_LETTERS[index];
  if (letter === undefined) {
    throw new Error(`Scale degree ${degree} is out of the supported GABC pitch range.`);
  }
  return letter;
}

// GABC marks an augmentation (mora) dot with a literal "." directly after
// the pitch letter it lengthens -- see catholicGregorian.ts's DATA SOURCE
// comment for the source convention this mirrors.
function gabcNote(n: CadenceNote): string {
  const letter = gabcPitchLetter(n.degree);
  return n.dotted ? `${letter}.` : letter;
}

function emitSyllable(text: string, notes: CadenceNote[]): string {
  return `${text}(${notes.map(gabcNote).join('')})`;
}

const BOUNDARY_MARKER: Record<PitchedColon['role'], string> = {
  flex: ':',
  mediant: ':',
  termination: '::',
};

function emitColon(colon: PitchedColon): string {
  let out = '';
  colon.syllables.forEach((syllable, idx) => {
    const piece = emitSyllable(syllable.text, syllable.notes);
    out += idx > 0 && syllable.isWordStart ? ` ${piece}` : piece;
  });
  return `${out} ${BOUNDARY_MARKER[colon.role]}`;
}

/** Renders a fitted verse (its cola, already pitched by fit.ts) as GABC text. */
export function emitGabc(cola: PitchedColon[]): string {
  return cola.map(emitColon).join(' ');
}
