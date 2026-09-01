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
