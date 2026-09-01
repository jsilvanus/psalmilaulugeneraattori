import type { CadenceFormula, Differentia, ScaleDegree, ToneFormula, ToneSet } from '../types.js';

/*
 * DATA ACCURACY NOTE (see project plan's "known risks"):
 *
 * The finals and reciting/tenor degrees below (D/A, D/F, E/C, E/A, F/C,
 * F/A, G/D, G/C for tones I-VIII, and A-then-G for tonus peregrinus) are the
 * standard "simple psalm tone" values used throughout the Solesmes/Liber
 * Usualis tradition, cross-checked against multiple independent chant
 * references.
 *
 * The mediant/termination CADENCE SHAPES, however, use one generic simple
 * pattern scaled to each tone's own reciting note, rather than each tone's
 * distinct historical Solesmes melodic formula (which would need to be
 * transcribed directly from the Liber Usualis / Antiphonale, including its
 * proper set of differentiae). Treat these cadence shapes as a
 * structurally-correct placeholder, not as historically precise chant-book
 * data, and replace them with the real note-by-note formulas before relying
 * on this for actual liturgical performance.
 *
 * TERMINATION MULTIPLICITY: real chant books give each tone several named
 * endings ("differentiae" -- e.g. Tonus I's "D"/"a"/"g" endings), each
 * chosen by the choir to hand off smoothly into whichever antiphon follows
 * (see antiphon/toneMatch.ts). `genericTerminationSet` below models that
 * MULTIPLICITY -- three distinctly-shaped, labeled endings per tone -- but
 * the three shapes are still a structural placeholder, not yet the real
 * Solesmes (or Finnish Kirkkokäsikirja) figures for each named ending.
 * Replace with real note-by-note differentiae, transcribed from an
 * authoritative source (Liber Usualis / Antiphonale, or the Finnish
 * Kirkkokäsikirja I's own psalm-tone appendix -- see refs/jpkirja.doc),
 * before relying on this for actual liturgical performance.
 */

function genericMediant(reciting: ScaleDegree): CadenceFormula {
  return {
    preparatory: [{ degree: reciting }],
    accentNote: { degree: reciting - 1 },
    postAccent: [{ degree: reciting - 2 }],
  };
}

function genericTermination(
  reciting: ScaleDegree,
  endDegree: ScaleDegree,
  label: string,
): Differentia {
  return {
    label,
    preparatory: [{ degree: reciting }],
    accentNote: { degree: endDegree + 1 },
    postAccent: [{ degree: endDegree }],
  };
}

/** Three structurally-distinct, labeled placeholder endings -- see the DATA ACCURACY NOTE above. */
function genericTerminationSet(reciting: ScaleDegree, final: ScaleDegree): Differentia[] {
  return [
    genericTermination(reciting, final, 'a'),
    genericTermination(reciting, final + 2, 'b'),
    genericTermination(reciting, reciting - 1, 'c'),
  ];
}

function genericFlex(reciting: ScaleDegree): CadenceFormula {
  return {
    preparatory: [],
    accentNote: { degree: reciting - 1 },
    postAccent: [],
  };
}

function makeTone(id: string, name: string, reciting: ScaleDegree, hasBFlat = false): ToneFormula {
  const final = 0;
  return {
    id,
    name,
    final,
    reciting,
    hasBFlat,
    intonation: [{ degree: reciting - 2 }, { degree: reciting - 1 }],
    flex: genericFlex(reciting),
    mediant: genericMediant(reciting),
    termination: genericTerminationSet(reciting, final),
  };
}

const tonusPeregrinus: ToneFormula = {
  id: 'tonus-peregrinus',
  name: 'Tonus Peregrinus',
  final: 0,
  reciting: 4, // A, for the verse's first half
  secondReciting: 3, // G, for the verse's second half -- the tone's namesake asymmetry
  intonation: [{ degree: 2 }, { degree: 3 }],
  mediant: genericMediant(4),
  termination: genericTerminationSet(3, 0),
};

export const catholicGregorianToneSet: ToneSet = {
  id: 'catholic-gregorian',
  name: 'Catholic / Gregorian (Solesmes)',
  tones: [
    makeTone('tonus-1', 'Tonus I', 4),
    makeTone('tonus-2', 'Tonus II', 2),
    makeTone('tonus-3', 'Tonus III', 5),
    makeTone('tonus-4', 'Tonus IV', 3),
    makeTone('tonus-5', 'Tonus V', 4, true),
    makeTone('tonus-6', 'Tonus VI', 2, true),
    makeTone('tonus-7', 'Tonus VII', 4),
    makeTone('tonus-8', 'Tonus VIII', 3),
    tonusPeregrinus,
  ],
  defaultToneForMode(mode) {
    const tone = this.tones.find((t) => t.id === `tonus-${mode}`);
    if (!tone) throw new Error(`No default tone for mode ${mode} in tone set "${this.id}".`);
    return tone;
  },
};
