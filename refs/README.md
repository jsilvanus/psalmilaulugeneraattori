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

### Anglican chant (pp. 387-388): tone 1 transcribed, 2-5 remaining

The engine has a chordal (SATB) data model and fitting pipeline built
specifically for this (`chordTypes.ts`, `chordBuilders.ts`, `fitChord.ts`,
`output/abcChord.ts` — proven out already on `finnishOtherChordal.ts`'s
tones 8/9 SATB variants). `anglicanChant.ts` now has real data for formula
1 (see its own DATA SOURCE comment) — transcribed by the project owner
directly as ABC notation (exact, not reconstructed), after an earlier
attempt to extract it programmatically from the source PDF, and then a
voice-dictated draft, both fell short of a trustworthy confidence level.
The ABC source for tone 1 is kept verbatim in `anglicanChant.ts`'s own
comment; the general findings below (from the earlier attempts) remain
useful for transcribing formulas 2-5:

- **Single vs. double chant**: formulas 1-4 are single chants (one
  grand-staff system, i.e. one mediant+termination pair reused every
  verse). Formula 5 is a **double chant** (two systems/strains, used
  alternately across two consecutive verses) — confirmed by cross-checking
  against "esimerkki 1" (uses formula 5's first strain alone, i.e. formula
  5 used as a single chant for one verse) and "esimerkki 2" (uses _both_
  of formula 5's strains, one per verse, with real underlaid text). A
  double chant doesn't fit the engine's existing bipartite (mediant +
  termination) `ColonRole` shape as one `ChordToneFormula` — model it as
  two linked strains (two `ChordToneFormula`s, alternated by the
  verse-fitting caller) rather than extending `ColonRole`.
- **Pointing convention**, confirmed both from the book's own prose (p. 387) and empirically from "esimerkki 1"'s real text underlay
  (`Palvelkaa hän-tä iloiten, tulkaa hä-nen eteen-sä riemuiten.`) and from
  formula 1's own barlines (see `anglicanChant.ts`): each half
  (mediant/termination) is **[reciting whole note, absorbing every leading
  unstressed syllable] + [N preparatory half notes] + [a final whole note
  carrying the colon's last stressed syllable, plus up to two more
  trailing unstressed syllables]**. (An earlier, less certain read of
  formula 1 guessed its mediant ends directly in a half-note pair with no
  separate final whole note -- formula 1's real ABC source shows that's
  wrong: it has the same [recit]+[2 prep]+[final] / [recit]+[4 prep]+[final]
  shape as formula 5. Whether any formula genuinely omits the final whole
  note isn't confirmed either way yet.)
  **The exact overflow rule for the "up to two trailing syllables" case is
  the one real correction this needed**, quoted almost verbatim from the
  book (p. 387): _"If three syllables (one accented and two unaccented)
  fall onto a bar marked with half notes, the first syllables are sung on
  the first half note, and the last syllable on the second half note."_
  I.e. when a cadence has fewer defined `postAccent` chords than there are
  actual trailing syllables, the **excess syllables extend the accent's
  own chord**, while the chords that _are_ written stay anchored to the
  true end of the colon -- not (as `fitChord.ts` originally, incorrectly,
  did by mirroring `fit.ts`'s Gregorian behaviour) repeating the
  last-defined `postAccent` chord for the excess. This is now fixed in
  `fitChord.ts`'s `applyChordAccent` (see its excess branch and the
  matching test in `fitChord.test.ts`) -- deliberately _not_ changed in
  `fit.ts`, since the book's own Gregorian-section prose doesn't describe
  this rule and `fit.ts`'s "repeat the last postAccent degree" behaviour
  is already established, tested, and used by all the committed Gregorian
  data. For formula 5: N=2 preparatory chords for the mediant, N=4 for the
  termination (read off "esimerkki 1"'s syllable-to-chord alignment). For
  formula 1 (now transcribed): the same N=2/N=4 shape exactly.
- **What was tried and didn't reach a committable confidence level, before
  the project owner just wrote out the ABC directly**: (a) reading the
  embedded font's text/glyph codes directly — the `capella` font's glyphs
  are Private Use Area codepoints keyed to specific noteheads, but
  `pdftotext -bbox`'s reported glyph bounding boxes are padded to a
  constant per-glyph height that doesn't track pitch, and adjacent glyphs
  sometimes get merged into one "word", losing per-notehead resolution;
  (b) connected-component notehead detection on 600dpi renders (erasing
  the detected staff-line rows first so they stop merging every symbol
  into one blob) — works well for some chords (clean integer line/space
  readings) but noisy for others, likely from touching ink between
  adjacent voices/accidentals/stems; (c) direct visual reading of zoomed
  crops — reliable for isolated chords sitting cleanly on staff lines, but
  not fast or reliable enough across a whole formula to trust without the
  project owner's own eyes on it; (d) voice dictation (spoken description
  of each chord's staff position, transcribed to text) — got most of a
  formula right but garbled one chord badly enough to need a re-check, and
  still needed real music-theory judgment (nearest-neighbour octave
  placement, no-crossing constraints) to turn into absolute pitches.
- **Accidentals**: the tone/chord data model now carries a per-note
  `accidental` field (`CadenceNote.accidental` in `types.ts`,
  `ChordCadenceNote.accidental` in `chordTypes.ts`), rendered in ABC output
  as the standard `^`/`_`/`=` prefix (see `output/abc.ts`'s `abcPitch`);
  `ToneFormula.hasBFlat`/`AbcMeta.hasBFlat` similarly now actually switches
  the ABC header to `K:F` instead of sitting inert. GABC output still
  doesn't render either, deliberately — see `output/gabc.ts`'s own note.
  `anglicanChant.ts`'s one real individual accidental (the source's `^d,4`
  on the alto voice) is now encoded this way; see its DATA SOURCE comment
  for why the matching `=d,8` resolution isn't (a courtesy natural on a
  reused reciting chord, not a real accidental).
- **What worked**: the project owner writing the tone out directly as ABC
  notation (see `anglicanChant.ts`'s DATA SOURCE comment for tone 1's
  source verbatim) — exact, no reconstruction needed. One real gotcha:
  the source uses `clef=treble-8` for the two upper (soprano/alto) voices,
  which turned out to be purely an engraving choice (so those voices fit
  legibly on a treble-shaped staff), not an actual extra octave
  transposition to apply when computing scale degrees — confirmed by
  checking that only the "read literally, no -8 shift" interpretation
  keeps every voice non-crossing (soprano >= alto >= tenor >= bass) across
  all 10 chords; the other reading puts alto below tenor repeatedly, which
  doesn't happen in genuine four-part harmony. Worth checking again if
  formulas 2-5 use the same `clef=treble-8` convention.
- **Recommended next step**: the project owner dictating formulas 2-5 the
  same way, directly as ABC (fastest and most exact so far), or via the
  spoken-description approach used for tone 1's rough draft if ABC isn't
  convenient at the time.
