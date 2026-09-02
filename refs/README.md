# refs/

Source/reference documents that are not themselves engine data, but that
engine data (tone sets, differentiae, etc.) is transcribed from and
cross-checked against.

## `liber-usualis-psalm-tones.pdf`

"Office Psalm Tones from the Liber usualis, with various termination
formulae" — a one-page chart of the standard 8 Gregorian psalm tones plus
tonus peregrinus, each with its labeled termination differentiae (e.g.
Tonus I's D/D2/f/g/g2/g3/a/a2/a3 endings), supplied by the project owner.

This is the source `packages/engine/src/tone/toneSets/catholicGregorian.ts`
is built from — see that file's own DATA SOURCE comment for exactly how.
In practice the real transcription came from
[`bbloomf/jgabc`](https://github.com/bbloomf/jgabc)'s `psalmtone.js`
(a community-maintained GABC psalm-pointing tool whose tone table is
explicitly sourced from the 1961 Liber Usualis, and whose differentia
labels match this PDF exactly), since it's already in a directly-parseable
GABC-letter format; this PDF served as the independent cross-check that the
labels and structure line up. Kept here as the canonical citation for that
data, and in case `jgabc`'s data ever needs re-verifying by eye.

## `jpkirja.doc`

**Jumalanpalvelusten kirja** (Kirkkokäsikirja I, 2000) — the Evangelical
Lutheran Church of Finland's official book of worship service orders and
liturgical propers. Copied from
[`jsilvanus/anno-api`](https://github.com/jsilvanus/anno-api)'s own
`refs/jpkirja.doc`, where it already serves as the source for that API's
liturgical-propers data (see its `src/parsers/parse-jpkirja.js` and
`docs/README.md`).

It's kept here because its psalm-tone appendix ("Musiikkia psalmeihin",
p. ~377+) is the authoritative source this project needs for the tone data
the Liber Usualis PDF above doesn't cover: it collects the
**Gregoriaanisen tyylin mukaiset psalmisävelmät** (Gregorian-style, in the
Finnish Lutheran tradition — confirmed to differ from the Latin Liber
Usualis in some particulars), **Anglikaanisen tyylin mukaisia
psalmisävelmiä** (Anglican-style, 5 numbered formulas + 2 examples), and
**Muita psalmisävelmiä** (13 other/Finnish tones) — exactly the kind of
tradition-pluggable `ToneSet` data `packages/engine/src/tone/toneSets/` is
architected to hold (see `docs/plan-v1.md`'s "Tone formula model").

Format: legacy binary `.doc` (Word 97-2003), 431 pages. Its psalm-tone
notation is a set of embedded WMF images using the **Capella** font (see
https://kirkkokasikirja.fi/ohjejanuotti.html, which also links the actual
`capella.ttf` font file) rather than plain text, so it can't be read with a
`.doc`-to-text converter alone — extracting it needs installing that font
and either rendering the WMFs to images for visual transcription, or
decoding the WMF `EXTTEXTOUT` records' pitch-letter bytes/coordinates
directly (both approaches were prototyped and work; a session found the
appendix's exact section boundaries and image groupings per tone/
differentia, but full note-by-note transcription across all three
traditions — 89 images — is substantial remaining work, deliberately not
rushed). This is real, obscure, unpublished-elsewhere data (unlike the
Catholic set, no ready-made community GABC transcription exists for it), so
it's worth extracting carefully rather than approximating.

This is the church's own published liturgical handbook, kept here for
internal reference/data-extraction use by this project, not for
redistribution.

## `jpkirja-musiikkia-psalmeihin.pdf`

The same "Musiikkia psalmeihin" appendix as in `jpkirja.doc` above, but as
its own clean 10-page PDF from kirkkokasikirja.fi
(`https://kirkkokasikirja.fi/jp/381_gregps.pdf`), found via web search after
`jpkirja.doc`'s embedded WMF images proved too unreliable to transcribe
automatically with confidence. Unlike the `.doc`, this PDF is genuinely
vector-rendered (confirmed via `pdftotext -bbox`/`pdffonts`: real glyph
bounding boxes in the embedded `DPAKEP+capella` font, not raster scans), so
it's the PDF actually used for `finnishGregorian.ts` and `finnishOther.ts`'s
transcription (both done by the project owner reading it directly and
dictating note letters) and for the Anglican-chant extraction attempt below.

Pages 381-386: Gregorian-style tones (source for `finnishGregorian.ts`,
tones I-VIII + peregrinus + irregularis). Pages 387-388: Anglican-style
tones (5 numbered formulas + 2 worked examples — see next section). Pages
389+: "Muita psalmisävelmiä", 13 numbered tones (source for
`finnishOther.ts`) plus SATB variants for tones 8 and 9 (source for
`finnishOtherChordal.ts`).

### Anglican chant (pp. 387-388): structure confirmed, pitch data not yet transcribed

The engine has a chordal (SATB) data model and fitting pipeline built
specifically for this (`chordTypes.ts`, `chordBuilders.ts`, `fitChord.ts`,
`output/abcChord.ts` — proven out already on `finnishOtherChordal.ts`'s
tones 8/9 SATB variants), but **no `anglicanChant.ts` tone set exists yet**
— an attempt to extract the 5 formulas' actual pitches programmatically
(since the project owner was unavailable to dictate them, unlike every
other tone set here) did not reach a confidence level worth committing as
real data. What *is* confirmed, worth preserving so the next attempt (by
either better tooling or dictation) doesn't have to redo it:

- **Single vs. double chant**: formulas 1-4 are single chants (one
  grand-staff system, i.e. one mediant+termination pair reused every
  verse). Formula 5 is a **double chant** (two systems/strains, used
  alternately across two consecutive verses) — confirmed by cross-checking
  against "esimerkki 1" (uses formula 5's first strain alone, i.e. formula
  5 used as a single chant for one verse) and "esimerkki 2" (uses *both*
  of formula 5's strains, one per verse, with real underlaid text). A
  double chant doesn't fit the engine's existing bipartite (mediant +
  termination) `ColonRole` shape as one `ChordToneFormula` — model it as
  two linked strains (two `ChordToneFormula`s, alternated by the
  verse-fitting caller) rather than extending `ColonRole`.
- **Pointing convention**, confirmed both from the book's own prose (p.
  387: "the barline corresponds to the Gregorian tone's accent mark; the
  colon's last accented syllable goes on the ending whole note, followed
  by up to two unaccented syllables") and empirically from "esimerkki
  1"'s real text underlay (`Palvelkaa hän-tä iloiten, tulkaa hä-nen
  eteen-sä riemuiten.`): each half (mediant/termination) is **[reciting
  whole-note chord, absorbing every leading unstressed syllable] + [N
  preparatory half-note chords] + [1 final whole-note chord = the last
  stressed syllable, which also absorbs up to 2 more trailing unstressed
  syllables on that same held chord]**. This maps directly onto the
  existing `ChordCadenceFormula` shape (`preparatory` + `accentNote` +
  `postAccent: [accentNote]`, relying on `fitChord.ts`'s existing overflow
  handling for the "up to 2 more syllables" part) — no engine changes
  needed once real chord data exists. For formula 5 specifically: N=2 for
  the mediant, N=4 for the termination (read off "esimerkki 1"'s
  syllable-to-chord alignment).
- **One spot-confirmed data point** (formula 5 / esimerkki 1's very first
  chord, the mediant's reciting chord): soprano B4, alto G4 (both sit
  exactly on staff lines — treble clef, key signature one sharp/G major),
  tenor and bass close to D3/C3.
- **What was tried and didn't reach a committable confidence level**:
  (a) reading the embedded font's text/glyph codes directly — the
  `capella` font's glyphs are Private Use Area codepoints keyed to
  specific noteheads, but `pdftotext -bbox`'s reported glyph bounding
  boxes are padded to a constant per-glyph height that doesn't track
  pitch, and adjacent glyphs sometimes get merged into one "word",
  losing per-notehead resolution; (b) connected-component notehead
  detection on 600dpi renders (erasing the detected staff-line rows first
  so they stop merging every symbol into one blob) — works well for some
  chords (clean integer line/space readings) but noisy for others,
  likely from touching ink between adjacent voices/accidentals/stems;
  (c) direct visual reading of zoomed crops — reliable for isolated
  chords sitting cleanly on staff lines (see the one confirmed data point
  above), but not fast or reliable enough across all ~18 chords across
  formula 5's two strains (let alone formulas 1-4) to trust without the
  project owner's own eyes on it.
- **Recommended next step**: now that the pointing convention is fully
  understood, the fastest reliable path is very likely the project owner
  dictating the 5 formulas the same way they dictated `finnishOtherChordal.ts`'s
  tune 8/9 SATB variants (bare note letters per voice, case for the
  reciting marker, `(lower)` for octave drops) — now shorter than before
  since only the reciting chord + N prep chords + final chord need
  stating per half, not a full syllable-by-syllable figure.
