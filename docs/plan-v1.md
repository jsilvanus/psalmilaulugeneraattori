# psalmilaulugeneraattori — v1 plan

## Context

The repo is currently empty (just a README title, one commit). The long-term
vision is large — Finnish/English/Latin psalm processing, Gregorian and
arbitrary formulaic psalm tones, GABC/ABC notation output, antiphon mode
detection, a multi-user publishing platform, divine-hours assembly, and audio
— far too much for one build. This plan scopes **v1**: a single-user, local
web app with a pure TypeScript "engine" that takes psalm verse text, splits it
into cola, determines vowel/stress per syllable, fits a chosen psalm tone onto
each colon, and renders the result visually via abcjs (with GABC text shown
alongside). Accounts, sharing/publishing, catalogs, divine-hours assembly, and
audio synthesis are explicitly deferred to later phases.

**Decisions locked in with the user:**
- Stack: Node/TypeScript, single repo, no backend/DB needed yet.
- Languages in v1: Finnish and Latin (English deferred).
- Verse input: text must already carry the classic psalter caesura markers —
  `*` (required, mediant split) and optional `†` or `+` (flex, making the
  verse tripartite; `+` is accepted as a plain-keyboard alias for `†` and
  normalized to it on parse). No automatic unmarked-text splitting in v1.
- Psalm text is ingested from the user's Finnish Bible, which turned out to
  be a semicolon-delimited CSV (`data/raamattu.csv`, ~5.3MB, committed to the
  repo), not XML as first assumed — one row per verse: `"book";"chapter";
  "verse";"text"`, quoted fields with doubled-quote escaping. Psalms is book
  19 (all 150 psalms, 2461 verses present). The importer (`text/
  bibleImport.ts`) parses this format and extracts one psalm's verses,
  stripping an embedded Masoretic/Hebrew cross-reference some verses carry
  mid-text (e.g. `"...Absalomia. (3:2) Herra..."`, from this edition not
  counting a psalm's superscription as verse 1 while Hebrew numbering does).
  The source has **no** chant caesura markup at all (plain prose) — the
  importer only produces clean raw verse text; turning that into
  `*`/`†`-marked, chantable cola is deliberately left as later work ("we'll
  need to further enhance this data later"), not attempted here.
- Tone/mode data must **not** be hardcoded to one tradition. The Finnish
  Evangelical Lutheran Church uses different classic tone/mode variants than
  the Catholic (Solesmes/Gregorian) tradition — exact Lutheran tone data to
  be supplied later. The architecture must support multiple named, pluggable
  "tone sets" from day one, even though only the Catholic/Gregorian set ships
  with real data in v1.
- ABC rendering: notes only; syllable text is shown alongside as plain text,
  not as aligned lyric underlay (`w:` lines deferred).
- No audio in v1.
- GABC-style square-notation rendering (via e.g. `exsurge.js`) is a stretch
  goal behind a feature flag, not a hard requirement — abcjs + raw GABC text
  is the guaranteed v1 output.

## Repo / module structure

npm workspaces, two packages:

```
psalmilaulugeneraattori/
  package.json                 # root workspace manifest
  tsconfig.base.json
  eslint.config.js
  .prettierrc
  packages/
    engine/                    # pure TS, zero DOM deps, fully unit-testable
      src/
        index.ts               # public API barrel
        text/
          types.ts              # PsalmVerse, Colon, ColonRole
          verseParser.ts        # * / † (or +) splitting -> PsalmVerse
          bibleImport.ts        # parses data/raamattu.csv, extracts one psalm's raw verses
        phonology/
          types.ts              # Syllable, Word, Lang
          finnish.ts             # analyzeWord for 'fi'
          latin.ts               # analyzeWord for 'la'
          analyze.ts             # dispatch by Lang
        tone/
          types.ts               # ToneFormula, CadenceFormula, CadenceNote, ToneSet
          toneSets/
            catholicGregorian.ts # tones 1-8 + tonus peregrinus (data)
            registry.ts          # named ToneSet registry, pluggable, no hardcoded assumptions
          fit.ts                 # the pointing/fitting algorithm (ToneSet-agnostic)
        output/
          gabc.ts                # PitchedVerse -> GABC string
          abc.ts                 # PitchedVerse -> ABC string
        antiphon/
          modeDetect.ts          # abcjs tune object -> mode number
          toneMatch.ts           # mode -> tone + differentia selection
      test/                      # vitest, one file per module above
    web/                        # Vite app, thin UI only
      index.html
      src/
        main.ts
        ui/
          VerseInput.ts
          ToneSelector.ts
          AntiphonInput.ts
          RenderPane.ts          # wraps abcjs; exsurge.js behind a feature flag
        styles.css
```

Tooling: TypeScript strict mode, Vitest, ESLint (`@typescript-eslint`) +
Prettier, Vite for `web` only. `engine` has zero runtime dependencies beyond
TS itself so it stays portable (browser now, a future backend later).

## Data model and algorithms

### Verse parsing (`text/`)
```ts
type ColonRole = 'flex' | 'mediant' | 'termination';
interface Colon { role: ColonRole; text: string; }
interface PsalmVerse {
  number?: number;
  cola: Colon[];                  // 2 (bipartite) or 3 (tripartite) entries
  isFirstVerseOfPsalm?: boolean;  // drives intonation in tone/fit.ts
}
```
Normalize `+` to `†` as a first pass (plain-keyboard alias for the flex
marker), then parse each line: if it contains `†`, split flex/mediant/
termination on `†` then `*` (both required together); otherwise require
exactly one `*` and split into mediant/termination. Multiple `*`, or `†`
without `*`, are parse errors surfaced with position — don't silently guess.

### Bible CSV import (`text/bibleImport.ts`)
Turned out to be CSV, not XML: `data/raamattu.csv`, one row per verse,
semicolon-delimited, every field double-quoted with doubled-quote escaping
(`"1";"1";"3";"Ja Jumala sanoi: ""Tulkoon valkeus"". Ja valkeus tuli. "`).
No header row. Psalms is book 19 (confirmed: all 150 psalms, 2461 verses).
```ts
interface BibleVerseRow { book: number; chapter: number; verse: number; text: string; }
interface RawImportedVerse { number: number; text: string; } // no * / † markup -- see below
const PSALMS_BOOK_NUMBER = 19;
function parseBibleCsv(csvText: string): BibleVerseRow[];
function extractPsalm(rows: BibleVerseRow[], psalmNumber: number, bookNumber?: number): RawImportedVerse[];
```
`extractPsalm` filters by book+chapter, sorts by verse, and strips an
embedded Masoretic/Hebrew verse-number cross-reference some verses carry
mid-text (e.g. Psalm 3:1 ends its superscription with `"...Absalomia. (3:2)
Herra, kuinka..."` — this edition doesn't count the superscription as verse
1 while Hebrew numbering does, so the marker can land mid-verse, not just at
the start; the regex strips it wherever it occurs). The source is plain
prose with **no** caesura markup anywhere — `extractPsalm` deliberately only
produces clean raw text; turning that into `*`/`†`-marked cola is left as
later "enhance this data" work, not attempted by this importer. Do not let
that future step leak into `verseParser.ts`, which stays a pure
marker-based parser.

### Phonology (`phonology/`)
```ts
interface Syllable { text: string; hasStress: boolean; isPrimary: boolean; }
interface Word { original: string; syllables: Syllable[]; }
type Lang = 'fi' | 'la';
function analyzeWord(word: string, lang: Lang): Word;
```
- **Finnish**: syllabify via vowel/consonant clustering (single intervening
  consonant starts the next syllable; clusters split one-consonant-stays,
  rest-moves-on), split adjacent vowels into separate syllables unless they
  form one of the standard Finnish diphthongs (ai, ei, oi, ui, yi, äi, öi, au,
  eu, iu, ou, ey, iy, äy, öy, ie, uo, yö) or are identical (long vowel).
  Stress: primary always syllable 1; secondary on every odd syllable (3, 5,
  7, …) **except never on the word's final syllable**. Known v1 limitation
  (document in code): compound words get one primary stress for the whole
  orthographic word rather than one per component — no lexicon-based
  compound-boundary detection in v1.
- **Latin**: collapse diphthongs (ae, oe, au, eu) and qu/gu+vowel into single
  nuclei; split consonant clusters between vowels using a small onset-cluster
  whitelist (liquid/stop and s+stop clusters attach to the following
  syllable). Stress (penultimate law): 1-2 syllables trivial; 3+ syllables
  stress the penult if it's heavy (closed syllable, i.e. followed by 2+
  consonants before the next vowel, or a diphthong nucleus), else the
  antepenult. Known v1 limitation: no macrons in plain text, so a long vowel
  in an open syllable is invisible to this heuristic and may mis-stress to
  antepenult — document this, don't build a workaround/exception list for
  v1.

### Tone formula model (`tone/`)
Single generic schema covers both classic Gregorian tones and arbitrary
formulaic tones — the fitting algorithm is written once:
```ts
type ScaleDegree = number; // diatonic step relative to the tone's final

interface CadenceNote { degree: ScaleDegree; }
interface CadenceFormula {
  preparatory: CadenceNote[];  // notes just before the accent, closest-last
  accentNote: CadenceNote;     // note on the colon's last stressed syllable
  postAccent: CadenceNote[];   // notes for trailing unstressed syllables
}
interface ToneFormula {
  id: string; name: string;
  final: ScaleDegree;          // 0 by construction
  reciting: ScaleDegree;       // tenor/reciting note
  hasBFlat?: boolean;          // tones 5/6-style signature, for GABC/ABC emission
  intonation?: CadenceNote[];  // only colon 1 of verse 1
  flex?: CadenceFormula;       // tripartite verses only
  mediant: CadenceFormula;
  termination: CadenceFormula[]; // one or more differentiae, index 0 = default
}

// A "tradition" of psalm tones — Catholic/Gregorian and Finnish Lutheran are
// each just a ToneSet value. Nothing in fit.ts, gabc.ts, or abc.ts may assume
// a specific ToneSet's contents or the standard 8-tone/4-final Gregorian
// layout; they only consume ToneFormula values, whichever set they came from.
interface ToneSet {
  id: string;               // 'catholic-gregorian', 'finnish-lutheran', ...
  name: string;
  tones: ToneFormula[];
  defaultToneForMode: (mode: 1|2|3|4|5|6|7|8) => ToneFormula; // mapping is per-ToneSet, not global
}
```
`toneSets/catholicGregorian.ts` ships tones 1–8 + tonus peregrinus with a
default mediant and at least one termination each, as one `ToneSet` value.
**Cross-check the actual scale-degree numbers against an authoritative table
(e.g. Liber Usualis / a standard Solesmes psalm-tone chart) while
implementing — do not hand-wave remembered numbers into shipped data.** A
`toneSets/registry.ts` module holds a simple lookup (`Map<string, ToneSet>`
or similar) so a `finnish-lutheran` set (data to be supplied later) or any
custom/arbitrary formulaic tone set (e.g. Anglican-chant style) can be added
as a new `ToneSet` value with zero changes to `fit.ts`, `gabc.ts`, or
`abc.ts` — the mode→default-tone mapping is deliberately a property of each
`ToneSet`, since the Finnish Lutheran tradition may pair modes to tones
differently than the Catholic table does.

**Fitting algorithm** (`fit.ts`), given a colon's syllabified words and a
`CadenceFormula` + `reciting` degree:
1. Find the last stressed syllable of the colon (its final word's main
   accent) — this is the anchor.
2. Trailing syllables after the anchor get `postAccent` notes 1:1. If the
   count doesn't match: fewer trailing syllables than expected → the
   shortfall's notes become a short melisma merged onto the accent syllable;
   more than expected → repeat the last `postAccent` degree for the extras.
3. The anchor syllable gets `accentNote`.
4. Walking backward from the anchor, the last `preparatory.length` syllables
   before it get the `preparatory` notes (last note of `preparatory` lands
   immediately before the accent); everything earlier in the colon sits on
   the plain `reciting` note. If the colon has fewer syllables before the
   anchor than `preparatory` expects, use only the trailing slice of
   `preparatory` that fits, and write an explicit unit test for the 1- and
   2-syllable-colon edge cases so this fallback is pinned down rather than
   guessed at implementation time.
5. Intonation notes prepend only when `verse.isFirstVerseOfPsalm` and the
   colon is the verse's first (mediant or flex), consuming the first 1-2
   syllables in place of the reciting note.

### Output (`output/`)
- **GABC**: build a degree→GABC-pitch-letter table once per (tone final,
  clef) by walking GABC's diatonic letter sequence from the final; apply a
  post-pass substituting the flatted pitch letter for `hasBFlat` tones.
  Emit `word(notes)` per syllable, joined with `:` at mediant/flex boundaries
  and `::` at the verse's termination.
- **ABC**: `L:1/4`, `M:none` (free rhythm, all syllables get equal note
  value in v1 — no rhythmic nuance), one abc line per colon for readability.
  Build a parallel degree→abc-pitch-letter+octave table anchored so typical
  chant ranges land near the `C,`–`c` window. Render notes only; show the
  syllable/word text as plain text next to the rendered melody (per the
  locked-in decision above) rather than as `w:` lyric underlay.

### Antiphon input, mode detection, tone matching (`antiphon/`)
User pastes the antiphon as ABC text (reuse `abcjs.parseOnly()`'s tune object
rather than writing a second ABC parser). From the note events, compute final
pitch, ambitus (low/high), and most-frequent pitch (reciting-tone proxy):
```ts
interface MelodyAnalysis { finalPitch: number; ambitusLow: number; ambitusHigh: number; mostFrequentPitch: number; }
function analyzeMelody(tuneObj): MelodyAnalysis;
function detectMode(a: MelodyAnalysis): { mode: 1|2|3|4|5|6|7|8 };
```
Mode detection: map the final to one of the four finals (D/E/F/G); classify
authentic vs. plagal by whether the range sits mostly above the final
(authentic) or centers roughly a fourth below it with reciting tone a third
above the final (plagal); `{D:[1,2], E:[3,4], F:[5,6], G:[7,8]}[final][plagal?1:0]`
gives the mode. This is a standard simplification (real chant scholarship
uses finer criteria) — good enough for v1, but the UI must let the user
override the detected mode manually, since irregular melodies can misclassify.

Tone matching: call the active `ToneSet.defaultToneForMode(mode)` (for the
Catholic/Gregorian set this defaults mode *N* to `Tonus N`, with tonus
peregrinus offered as a manual alternative for mode 7/8 antiphons rather than
auto-selected) — never hardcode the mode→tone pairing outside the `ToneSet`,
since a Finnish Lutheran set may map differently.
Differentia selection: for each of the tone's `termination[]` candidates,
compute its final absolute pitch and pick the one closest to (ideally equal
to) the antiphon's very first note — the standard choir-book rule for a
smooth hand-off back into the antiphon. Show runner-up terminations in the UI
as alternatives.

## Web UI (`packages/web`)
Vanilla TS + Vite, no framework (not enough surface area here to justify
one). Four sections wired directly to the engine:
- **VerseInput** — textarea for `*`/`†`-marked text + language selector,
  surfaces parser errors inline. Also includes an "Import from Bible" flow:
  a reference input (`"3:1-4,6-8"`, `"3:5"`, or just `"3"` for the whole
  psalm, parsed by `parseVerseReference`/`selectVerses` in `bibleImport.ts`)
  that lazily fetches `/raamattu.csv` (served via Vite's `publicDir`
  pointing at the repo-root `data/` folder), extracts and filters the
  requested verses, and drops the raw (still unmarked) text into the
  textarea, auto-switching the language selector to Finnish.
- **ToneSelector** — a tone-set selector (initially just "Catholic/
  Gregorian", with room to add "Finnish Lutheran" later with no code
  changes) plus a tone dropdown scoped to the selected set, and a "custom"
  option with a raw JSON textarea for defining a one-off `ToneFormula` (no
  visual tone editor in v1).
- **AntiphonInput** — textarea for ABC antiphon text, "Analyze" button
  running `analyzeMelody` → `detectMode` → `toneMatch`, with the suggested
  tone/differentia editable before it's applied.
- **RenderPane** — `emitAbc(...)` piped into `abcjs.renderAbc(...)`, GABC
  text shown alongside in a `<pre>`. `exsurge.js` square-notation rendering
  is wired behind a try/catch feature flag so its absence never blocks the
  abcjs path — spike whether it even installs cleanly in a modern Vite setup
  before investing more in it.

## Build order

1. Scaffold workspaces, tsconfig, eslint/prettier, vitest — no logic yet.
2. `text/verseParser.ts` + tests.
3. `phonology/finnish.ts` and `phonology/latin.ts` + tests (independent of
   each other and of tone logic; testable against plain word lists).
4. `tone/types.ts`, `tone/toneSets/registry.ts`, `tone/toneSets/
   catholicGregorian.ts` (verify against a reference table), `tone/fit.ts`
   (written against `ToneFormula`/`ToneSet` only, never against the
   Catholic/Gregorian data specifically) + tests covering short-colon edge
   cases explicitly.
5. `output/gabc.ts`, `output/abc.ts` + golden-file tests (known verse+tone →
   expected string).
6. Wire minimal `packages/web` UI for verse+tone → abcjs rendering — first
   end-to-end demoable milestone.
7. `antiphon/modeDetect.ts`, `antiphon/toneMatch.ts` + tests against a
   handful of real chant-book antiphon incipits with known correct modes.
8. Wire AntiphonInput into the rendering flow.
9. Done: `data/raamattu.csv` committed, `text/bibleImport.ts`
   (`parseBibleCsv`, `extractPsalm`, `parseVerseReference`, `selectVerses`)
   implemented and tested against inline fixtures and the real committed
   file; Vite's `publicDir` serves the CSV to the browser; VerseInput's
   "Import from Bible" flow (reference string → fetch/parse/select → raw
   text into the textarea, language auto-set to Finnish) is wired and
   verified end-to-end in a real browser. Turning the imported plain text
   into `*`/`†`-marked cola remains deliberately deferred (see above) — the
   import flow's status message reminds the user to add the marks by hand.
10. (Stretch) `exsurge.js` spike + integration behind the feature flag.

## Phase right after v1: ecumenical daily psalter

Not part of v1 itself, but the next priority immediately afterward: order
the psalms into an "ecumenical psalter" — a day-by-day cycle through the
year — with each day's psalm(s) pre-set to a melody (tone) and antiphon,
built on top of the v1 engine rather than duplicating it. Scope this as its
own short planning pass once v1 is working, since it introduces a new data
concept (a `PsalterDay` / calendar-cycle schedule mapping dates or cycle-days
to psalm numbers + chosen `ToneFormula` + antiphon) but does not need
accounts, sharing, or full divine-hours office assembly — those stay
deferred. Treat this as the natural bridge between the single-verse engine
and the eventual divine-hours feature, and revisit the module layout above
(likely a new `packages/engine/src/psalter/` area) at that time rather than
speculatively designing it now.

## Verification

- `vitest run` across both packages after each build-order step; every
  module above ships with unit tests, and steps 4–5 use golden-file
  fixtures (verse + tone → exact expected GABC/ABC string) so regressions
  are caught mechanically.
- After step 6: run `npm run dev` in `packages/web`, paste a real Finnish or
  Latin psalm verse (with `*`/optional `†`), pick a built-in tone, and
  confirm abcjs renders a plausible chant line and the GABC text looks
  sane — check this in an actual browser, not just via tests.
- After step 8: paste a known antiphon incipit (a handful with published,
  known modes from a real chant book) and confirm the detected mode and
  suggested tone/differentia match; confirm manual override works when it
  doesn't.
- Before trusting `toneSets/catholicGregorian.ts` data, cross-check the
  shipped scale-degree numbers against an authoritative psalm-tone table
  (flagged above as a real risk — remembered numbers should not go
  unverified into shipped data).
- Done: the Bible source turned out to be CSV, not XML. Confirmed structure
  (book;chapter;verse;text, Psalms = book 19, 150 psalms/2461 verses, no
  caesura markup, and the mid-verse Masoretic cross-reference quirk) and
  `bibleImport.ts` is implemented and tested against it. Turning the plain
  imported text into `*`/`†`-marked, chantable cola remains open, explicitly
  deferred as future "enhance this data" work.
- When the Finnish Lutheran tone/mode data is supplied later, it should slot
  in as a new `ToneSet` in `toneSets/registry.ts` with no changes needed to
  `fit.ts`, `gabc.ts`, or `abc.ts` — if adding it ever requires touching
  those files, the abstraction has leaked and should be revisited.
