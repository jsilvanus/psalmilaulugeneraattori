# Phase plan — tonal (Anglican-style) auto-matching

## Status

**Not started.** This is a plan, not a record of work done. It was produced in
a design session alongside the Glarean-modes and `checkModeConsistency` work
(both of which _are_ built — see `antiphon/modeDetect.ts` and
`antiphon/modeConsistency.ts`), and is written down here so the reasoning
survives the session that produced it.

## What this covers

An antiphon/melody auto-suggestion path for **tonal** (major/minor) chant
traditions — Anglican chant above all — analogous to the existing modal
pipeline (`antiphon/modeDetect.ts`'s `detectMode` → `antiphon/toneMatch.ts`'s
`matchTone`), but targeting `ChordToneSet`/`ChordToneFormula`
(`tone/chordTypes.ts`) rather than the modal `ToneSet`/`ToneFormula`
(`tone/types.ts`).

## Why it isn't simply "the same thing again"

The existing modal pipeline works because Gregorian office psalmody has a real,
documented convention tying an antiphon's mode to a numbered psalm tone, and a
real reason to pick a particular ending (the differentia hands off smoothly
back into the antiphon after the doxology). Anglican chant may not have an
equivalent convention at all: it's normally used to sing whole psalms and
canticles at Evensong/Mattins, frequently without the antiphon-hand-off
structure the differentia logic exists to serve.

Two load-bearing questions therefore have to be answered before any code, and
answered from sources rather than assumed — guessing here would violate the
practice every tone-set file in this repo follows (see each file's own DATA
SOURCE comment, and `refs/README.md`).

## Phase 0 — Foundational research

**Mode:** parallel (2 streams) · **Depends on:** nothing
**Goal:** both questions answered with real citations, or explicitly recorded
as unresolved.

**Stream A — liturgical convention.** Does Anglican chant practice use any
antiphon → chant selection convention analogous to Gregorian psalmody? In
particular, does the "ending chosen to lead back into the antiphon" concept —
the entire point of `matchTone`'s differentia-distance ranking — have any
Anglican analogue? Standard pointed psalters (the _Parish Psalter_, the
_Anglican Chant Psalter_ traditions) are the place to look. If research is
inconclusive, this is a question to put to the project owner rather than settle
by inference.

**Stream B — key-detection feasibility.** Can `detectMode`'s style of heuristic
(final + ambitus + most-frequent pitch) extend to major/minor detection, or is
that a materially different problem needing pitch-class-histogram correlation
against key profiles (Krumhansl-Schmuckler and relatives)? Note that those
algorithms were designed and validated on harmonically fuller material than a
short monophonic antiphon, so "the standard algorithm exists" is not the same
as "it works on this input." An honest "no reliable heuristic at this input
size" is a perfectly good outcome.

**Sync point:** both streams reported before Phase 1 begins. Either stream
returning a negative reshapes Phase 1 — that is the point of sequencing them
first, and is not a failure.

## Phase 1 — Decision gate

**Mode:** single task (human decision) · **Depends on:** Phase 0

The project owner picks a direction. This is a liturgical-practice and
product-scope judgement, not a technical one, so it is explicitly not Claude's
call. Likely branches:

1. **Full analogue** — build `detectKey`/`matchChordTone` genuinely paralleling
   the modal pipeline. Requires Stream A to confirm a convention _and_ Stream B
   to find a workable detector.
2. **Detection without hand-off matching** — if no antiphon-hand-off convention
   exists, key detection may still stand alone ("what key is this melody in")
   without the differentia-matching half.
3. **Manual selection only** — if both streams come back negative, the honest
   answer may be not to build this: let users pick a chant by hand, which the
   existing `ToneSelector` component already supports.
4. **Defer** — park it until more Anglican chant data exists (see the ongoing
   track below), since a "best match among N" feature is thin at N=1.

## Phase 2 — Scaffolding

**Mode:** sequential · **Depends on:** Phase 1 (branches 1 or 2 only)
**Goal:** types compile; no matching logic yet.

1. Add whatever `ChordToneSet` needs per the Phase 1 decision — e.g. an
   optional `defaultToneForKey` mirroring `ToneSet.defaultToneForMode`'s
   optionality (`finnishOtherToneSet` already demonstrates that a tone set may
   legitimately throw from that method rather than implement it).
2. If Stream B recommended a histogram-based detector, extend `MelodyAnalysis`
   (or add a sibling type) to carry a pitch-class histogram. Additive; leaves
   `detectMode`'s existing consumers alone.
3. No `anglicanChant.ts` changes — its single transcribed tone doesn't need a
   "pick the best of several" algorithm.

## Phase 3 — Minimal matcher and tests

**Mode:** sequential · **Depends on:** Phase 2
**Goal:** a real, tested detector/matcher pair, scoped to what Phase 0 actually
justified rather than a speculative full-featured one.

1. Implement the detector per the chosen approach.
2. Implement the chordal matcher — honestly degenerate at N=1 (it may simply
   validate and return the one tone rather than meaningfully rank endings).
3. Tests mirroring `modeDetect.test.ts`/`toneMatch.test.ts`'s structure:
   synthetic melodies with documented expected classifications.
4. Record the Phase 0 findings in `refs/README.md`'s "Anglican chant" section,
   the same way the Glarean and customary-B-flat research was recorded.

**Sync point:** `tsc --noEmit` clean, tests passing, and a doc comment stating
plainly that the matcher is validated against one tone only — the same
"known gap, not a silent inaccuracy" posture `output/gabc.ts` takes about
accidentals.

## Ongoing, non-blocking — more Anglican chant data

Transcribing formulas 2–5 (per `refs/README.md`'s recommended approach:
dictated directly as ABC, which is what worked for tone 1) is data work, not
engineering, and blocks nothing above. It is, however, what makes Phase 3
worth having: "best match among five" is a feature; "best match among one" is
a formality.

## Critical path

Phase 0 (both streams) → Phase 1 (decision) → Phase 2 → Phase 3

## Risks

- **Stream A returns "no such convention."** The largest risk to the feature's
  premise as originally framed. Mitigated by sequencing it first, before any
  code, and by Phase 1 having real branches (3 and 4) for that outcome.
- **Stream B returns "no reliable heuristic for short monophonic input."**
  Reasonably likely. Mitigated the same way: manual selection remains available
  regardless.
- **Scope creep into fabricating the missing four formulas** to make the
  matcher demonstrable. Against this project's whole practice. Phase 3 is
  written to be honest about N=1 rather than to backfill data for appearances.

## Recommended starting point

Phase 0, Stream A. It is the cheaper question (research or ask, rather than
build) and the one most likely to reshape or shrink everything downstream.
