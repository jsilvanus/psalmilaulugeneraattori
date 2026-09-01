# refs/

Source/reference documents that are not themselves engine data, but that
future engine data (tone sets, differentiae, etc.) should be transcribed
from and cross-checked against.

## `jpkirja.doc`

**Jumalanpalvelusten kirja** (Kirkkokäsikirja I, 2000) — the Evangelical
Lutheran Church of Finland's official book of worship service orders and
liturgical propers. Copied from
[`jsilvanus/anno-api`](https://github.com/jsilvanus/anno-api)'s own
`refs/jpkirja.doc`, where it already serves as the source for that API's
liturgical-propers data (see its `src/parsers/parse-jpkirja.js` and
`docs/README.md`).

It's kept here because its psalm-tone appendix ("Psalttorisävelmät") is the
authoritative source this project needs for real tone-set data: it collects
the **Gregorian** (Solesmes/Catholic), **Anglican** (English chant-style),
and **Finnish** psalm-tone melodies used in the Finnish Lutheran liturgy —
exactly the kind of tradition-pluggable `ToneSet` data
`packages/engine/src/tone/toneSets/` is architected to hold (see
`docs/plan-v1.md`'s "Tone formula model"), and the real differentia
(termination-ending) data flagged as a placeholder in
`toneSets/catholicGregorian.ts`'s DATA ACCURACY NOTE.

Format: legacy binary `.doc` (Word 97-2003), 431 pages. This session had no
`.doc`-to-text converter available (`pandoc`/`antiword`/`catdoc`), so its
contents haven't been transcribed yet — that's future work, not done here.
`anno-api`'s own `CLAUDE.md` documents the intended path:

```bash
# convert .doc -> markdown first (e.g. with pandoc), then:
node src/parsers/parse-jpkirja.js refs/jpkirja.md src/data
```

For this project, the equivalent next step is: convert to text/markdown,
locate the psalm-tone appendix, and transcribe each tradition's tones
(including their multiple named differentiae — see
`packages/engine/src/tone/types.ts`'s `Differentia`) into a new `ToneSet`
(e.g. `finnish-lutheran`) or into corrected `catholicGregorian.ts` data,
registered via `tone/toneSets/registry.ts`.

This is the church's own published liturgical handbook, kept here for
internal reference/data-extraction use by this project, not for
redistribution.
