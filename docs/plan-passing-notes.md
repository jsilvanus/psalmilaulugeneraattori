# Phase plan — passing notes in Anglican chant

## Status

**Recorded, not scheduled. The project owner decided this work will not be
done.** This file exists so the analysis survives the session that produced it;
it is a plan on the shelf, not a backlog item. Nothing below has been started,
and nothing below should be started without the owner saying so.

Sibling of `docs/plan-tonal-matching.md`, which is likewise a recorded plan
rather than a record of work.

## The problem

Some of the transcribed Anglican chant formulas in
`packages/engine/src/tone/toneSets/anglicanChant.ts` contain **passing notes**:
places where a single voice subdivides its note while the other three hold.
They are visible in the verbatim ABC preserved in that file's DATA SOURCE
comment, but they are not in the degree tables — `ChordCadenceNote` has one
`Chord` per position, four numbers, no room for "and then the tenor moves".

Six of them, in two tiers:

**Tier 1 — on cadence chords** (four), reachable by extending
`ChordCadenceNote`:

- formula 2, tenor
- formula 5 strain 1, soprano
- formula 5 strain 2, tenor (×2)

**Tier 2 — on reciting chords** (two), not reachable that way:

- formula 2, bass
- formula 4, alto

## Why this is harder than it looks

The design constraint comes from the source itself:

> _"Sointukaavat on kirjoitettu nuottiarvoin, jotka eivät laulettaessa
> kuitenkaan ilmaise sävelten kestoa, vaan ainoastaan sävelkorkeutta"_ —
> the chord tables are written in note values which, when sung, express not
> the notes' duration but only their pitch.

So the model deliberately carries no rhythm, and that is correct: Anglican
chant is sung to speech rhythm on the reciting note, and the printed note
values are a pitch notation, not a metrical one.

But **multi-voice ABC aligns voices by duration.** The moment one voice
subdivides while three hold, the emitter has to produce durations that sum
correctly across all four staves — for a data model that has, on purpose, no
durations in it. That tension is the whole difficulty, and it lives in the
emitter rather than the model.

There is now one precedent worth knowing about: `CadenceNote.dotted` and
`abcPitch`'s `3/2` length multiplier (added for Solesmes mora dots in the
*melodic* model, `tone/types.ts` and `output/abc.ts`). It shows the project is
willing to let duration information reach the ABC emitter when a source
genuinely marks it — but it is single-voice, so it does not answer the
alignment question below. `ChordCadenceNote` is untouched by it.

## Phase 1 — De-risk the alignment problem

**Mode:** single task · **Depends on:** nothing · **Unblocked**
**Goal:** know whether uneven subdivision renders cleanly before building
anything that depends on it.

Hand-write a throwaway four-staff ABC by hand — `%%score (S A) (T B)`, four
`V:` lines — with at least one position where a single voice subdivides while
the other three hold. Render it through the app's own bundled abcjs (not an
online renderer; version differences are exactly the sort of thing that would
invalidate the result). Confirm the staves stay aligned with no drift across
the bar.

**Done when** either a working ABC shape is in hand to build Phase 3 on, or
Tier 1 is re-scoped in light of what abcjs actually does.

Existing evidence is mildly encouraging but does **not** settle it: abcjs
parsed every multi-voice source formula during transcription, and a `%%staves`
artifact rendered correctly in Chrome. Neither exercised uneven subdivision,
which is the case that matters.

This is a genuine go/no-go. A negative result here means Tier 1 is not worth
building, and that is a perfectly good outcome for a phase to produce.

## Phase 2 — Emitter core and Tier 1 data model

**Mode:** parallel (2 streams) · **Depends on:** Phase 1

The two streams touch disjoint files and are genuinely independent. (This
revises an earlier sketch in which the emitter had to come strictly first —
it doesn't.)

### Stream A — four-staff emitter

A new function in or beside `packages/engine/src/output/abcChord.ts`, **added
alongside `emitAbcChordal`, not replacing it**. The single-staff bracketed-chord
output stays useful, and `test/abcChord.test.ts` pins its exact output.

- Name it so it cannot be confused with `emitAbcChordal` — `emitAbcFourStaff`
  or `emitAbcChoirScore`. **Not** `emitAbcChoral`, which is one keystroke from
  the existing name and would be a maintenance trap.
- Emit `%%score (S A) (T B)`, four `V:` declarations (treble for S/A, bass for
  T/B), one line per voice per colon.
- Reuse `abcPitch` from `output/abc.ts` — already exported, already accidental-
  and duration-aware.
- Its own test file.

### Stream B — Tier 1 data model

Add to `ChordCadenceNote` in `packages/engine/src/tone/chordTypes.ts`:

```ts
passing?: Partial<Record<VoiceName, ScaleDegree[]>>
```

meaning *"extra notes this voice sings on the same syllable, after the
principal note"* — deliberately mirroring the shape of the existing
`accidental` field (`VoiceAccidentals`), so the two read as siblings.

- Extend `chordNote()` in `toneSets/chordBuilders.ts` to take it. Watch the
  `.map(chordNote)` index-leak trap: adding an optional parameter makes
  `Array.prototype.map`'s index argument bind to it. Every call site must be
  `.map((c) => chordNote(c))`.
- Encode the four Tier 1 passing notes in `anglicanChant.ts` and update its
  PASSING NOTES comment to say which are now modelled and which remain
  Tier 2.
- **Verify — do not assume — that `fitChordVerse` carries the new field
  through untouched.** It should: `fitCore.ts`'s `fitColonGeneric` never
  inspects note internals, it moves whole `TNote` values, which is precisely
  why added fields ride along for free. Prove it with a round-trip test rather
  than trusting the argument.

### Sync point

- `pnpm -r exec tsc --noEmit` clean
- full vitest green
- four-staff output renders in the browser
- all four passing notes survive a `fitChordVerse` round-trip
- existing single-staff output **byte-identical** to before

## Phase 3 — Join them, and surface it

**Mode:** sequential · **Depends on:** Phase 2

1. Teach the four-staff emitter to render `passing`, with durations that sum
   to the single note the other three voices hold at that position.
2. End-to-end test on formula 5 strain 2 (two tenor passing notes, the richest
   case). Assert on **durations summing per voice**, not merely on substrings
   appearing in the output — a substring test would pass on output that
   renders as garbage.
3. Decide how the four-staff score reaches `RenderPane` in `packages/web`:
   replace the single-staff rendering, or offer a toggle.

## Gate — Tier 2 design decision

**Blocked · owner decision · decide once, for both cases**

`reciting` and `secondReciting` are plain `Chord`, with nowhere to hang a
passing note. Worse, the semantics don't fit even if there were: a reciting
chord is held over arbitrarily many syllables, while the decoration happens
exactly once, on the last syllable of the run.

Two separate things hit this same wall:

- the two remaining Tier 2 passing notes (formula 2 bass, formula 4 alto)
- formula 1's `=d` courtesy natural, already left deliberately unencoded for
  this exact reason

Options:

1. Promote `reciting`/`secondReciting` from `Chord` to `ChordCadenceNote`.
2. Add an explicit "exit decoration" concept — something that attaches to the
   *end* of a reciting run rather than to the reciting chord itself.
3. Decide the fidelity isn't worth the complexity, and document that
   permanently rather than leaving it as an implied gap.

Whichever is chosen should be chosen for **both** cases at once. Solving the
passing notes narrowly and stranding the `=d` natural would leave the codebase
with two nearly-identical unmodelled cases and one ad-hoc mechanism.

## Phase 4 — Tier 2 implementation

**Depends on:** the gate. Its shape depends entirely on which option is
chosen, so there is nothing useful to plan here in advance.

## Critical path

Phase 1 → Phase 2 (Stream A) → Phase 3 → [gate] → Phase 4

Stream B is off the critical path.

## Risks

- **Uneven subdivision may not align cleanly in abcjs.** The premise risk.
  Mitigated by making Phase 1 a real go/no-go before any dependent work.
- **Scope creep into modelling rhythm.** The source is explicit that note
  values express pitch only. Durations must stay emitter-local — a rendering
  detail, never a field the tone tables carry.
- **Emitter naming collision** with `emitAbcChordal`. Mitigated by the naming
  rule in Stream A.
- **Tier 2 solved narrowly**, stranding the `=d` courtesy natural. Mitigated
  by the gate deciding both together.
- **Low payoff overall.** Nothing is actually *lost* today: the verbatim ABC
  preserved in `anglicanChant.ts`'s DATA SOURCE comment is the authoritative
  record of every passing note, and the degree tables never claimed to be
  engraving-complete. This work improves rendering fidelity, not correctness —
  which is a large part of why the owner decided against doing it.

## Recommended starting point, if this is ever revived

Phase 1, treated as a genuine go/no-go rather than a formality.
