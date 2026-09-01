#!/usr/bin/env python3
"""
Converts bbloomf/jgabc's Liber Usualis psalm-tone GABC data
(https://github.com/bbloomf/jgabc/blob/master/psalmtone.js, `g_tones`) into
the ScaleDegree-based ToneFormula/Differentia shape
packages/engine/src/tone/toneSets/catholicGregorian.ts uses.

Fetch the source data first:
    curl -s https://raw.githubusercontent.com/bbloomf/jgabc/master/psalmtone.js -o psalmtone.js

Then transcribe the tones you need from its `g_tones` object into the
TONES dict below (mediant + terminations strings, verbatim), and run:
    python3 extract-liber-usualis-tones.py

This prints, per tone: the final/reciting pitch letters (for sanity-
checking against a real chart, e.g. refs/liber-usualis-psalm-tones.pdf) and
the parsed CadenceFormula/Differentia degrees ready to hand-transcribe into
catholicGregorian.ts's `cadence(...)`/`differentia(...)` calls.

Tokenization mirrors jgabc's own `regexToneGabc` exactly:
    /(')?(([^\\sr]+)(r)?)(?=$|\\s)/gi
Each space-separated token is one "note event": an optional leading `'`
marks the accented (stressed-syllable) note, an optional trailing `r`
marks an "open" (elidable/reciting-tone) notehead, and the token's pitch
letters are its GABC pitch alphabet characters (a-m, case-insensitive --
uppercase is jgabc's own scale-run ligature convention, same pitch meaning)
with non-pitch modifier characters (x = oriscus, v = ligature marker, . =
mora dot) stripped.

CADENCE EXTRACTION RULE: within a formula, the LAST accented token is the
structural accentNote (its first pitch); any pitches after it in that same
token are treated as immediately following the accent, prepended to
postAccent. preparatory is every pitch between the last "open" (reciting)
token before that accent and the accent itself. Everything after the
accent token (concatenated across tokens) is postAccent.

FINAL ANCHORING: `final_letter_of(...)` takes the last pitch of a formula
string. This is only meaningful for the tone's OWN canonical termination
(the one whose label matches the tone's number, e.g. Tonus I's "D") --
other differentiae deliberately end elsewhere (that's the whole point of a
differentia: a smooth hand-off into whichever antiphon follows). Always
pass that canonical termination's string as `final_ref` when parsing a
tone's mediant and its other differentiae.
"""

import re
import sys
import json

GABC_LETTERS = "abcdefghijklm"
TOKEN_RE = re.compile(r"(')?(([^\sr]+)(r)?)(?=$|\s)")


def tokenize(s):
    tokens = []
    for m in TOKEN_RE.finditer(s):
        accent = m.group(1) == "'"
        core = m.group(3)
        open_ = m.group(4) == "r"
        core_nodots = core.rstrip(".")
        pitches = [c.lower() for c in core_nodots if c.lower() in GABC_LETTERS]
        tokens.append({"accent": accent, "open": open_, "pitches": pitches})
    return tokens


def letter_degree(letter, final_letter):
    return GABC_LETTERS.index(letter) - GABC_LETTERS.index(final_letter)


def final_letter_of(formula_str):
    for t in reversed(tokenize(formula_str)):
        if t["pitches"]:
            return t["pitches"][-1]
    raise ValueError("no pitches found: " + formula_str)


def reciting_letter_of(formula_str):
    opens = [t for t in tokenize(formula_str) if t["open"] and t["pitches"]]
    if not opens:
        return None
    from collections import Counter

    c = Counter(t["pitches"][-1] for t in opens)
    return c.most_common(1)[0][0]


def parse_cadence(formula_str, final_letter):
    toks = tokenize(formula_str)
    accented_idx = [i for i, t in enumerate(toks) if t["accent"] and t["pitches"]]
    if not accented_idx:
        raise ValueError("no accented token: " + formula_str)
    ai = accented_idx[-1]
    accent_tok = toks[ai]
    accent_degree = letter_degree(accent_tok["pitches"][0], final_letter)
    post = [letter_degree(p, final_letter) for p in accent_tok["pitches"][1:]]

    open_before = [i for i in range(ai) if toks[i]["open"]]
    start = (open_before[-1] + 1) if open_before else 0
    prep = []
    for i in range(start, ai):
        prep.extend(letter_degree(p, final_letter) for p in toks[i]["pitches"])

    for i in range(ai + 1, len(toks)):
        post.extend(letter_degree(p, final_letter) for p in toks[i]["pitches"])

    return {"preparatory": prep, "accentNote": accent_degree, "postAccent": post}


# Transcribed verbatim from bbloomf/jgabc's psalmtone.js `g_tones` (tones
# 1-8 + peregrinus only; see that file for the antiquo/alt/monasticus
# variants and irregularis, not currently used here).
TONES = {
    "1": {
        "mediant": "f gh hr 'ixi hr 'g hr h.",
        "terminations": {
            "D": "hr g f 'gh gr gvFED.",
            "D2": "hr g f gr 'gf d.",
            "f": "hr g f 'gh gr gf..",
            "g": "hr g f 'gh gr g.",
            "g2": "hr g f 'g gr ghg.",
            "g3": "hr g f 'g gr g.",
            "a": "hr g f 'g hr h.",
            "a2": "hr g f 'g gr gh..",
            "a3": "hr g f 'gh gr gh..",
        },
    },
    "2": {"mediant": "e f hr 'i hr h.", "terminations": {"default": "hr g 'e fr f."}},
    "3": {
        "mediant": "g hj jr 'k jr jr 'ih j.",
        "terminations": {
            "b": "jr h 'j jr i.",
            "a": "jr h 'j jr ih..",
            "a2": "jr ji hi 'h gr gh..",
            "g": "jr ji hi 'h gr g.",
            "g2": "jr h j i 'h gr g.",
        },
    },
    "4": {
        "mediant": "h gh hr g h 'i hr h.",
        "terminations": {"g": "hr 'h gr g.", "E": "hr g h ih gr 'gf e."},
    },
    "5": {"mediant": "d f hr 'i hr h.", "terminations": {"default": "hr 'i gr 'h fr f."}},
    "6": {"mediant": "f gh hr 'ixi hr 'g hr h.", "terminations": {"default": "hr f gh 'g fr f."}},
    "7": {
        "mediant": "hg hi ir 'k jr 'i jr j.",
        "terminations": {
            "a": "ir 'j ir 'h hr gf..",
            "b": "ir 'j ir 'h hr g.",
            "c": "ir 'j ir 'h hr gh..",
            "c2": "ir 'j ir 'h hr ih..",
            "d": "ir 'j ir 'h hr gi..",
        },
    },
    "8": {
        "mediant": "g h jr 'k jr j.",
        "terminations": {"G": "jr i j 'h gr g.", "G*": "jr i j 'h gr gh..", "c": "jr h j 'k jr j."},
    },
    "peregrinus": {
        "mediant": "ixhi hr g ixi h 'g fr f.",
        "terminations": {"default": "gr d 'f fr ed.."},
    },
}


def build_tone(name, data):
    first_term = next(iter(data["terminations"].values()))
    final_letter = final_letter_of(first_term)
    reciting_letter = reciting_letter_of(data["mediant"]) or reciting_letter_of(first_term)

    result = {
        "final_letter": final_letter,
        "reciting_letter": reciting_letter,
        "reciting_degree": letter_degree(reciting_letter, final_letter),
        "mediant": parse_cadence(data["mediant"], final_letter),
        "terminations": [
            {"label": label, **parse_cadence(s, final_letter)}
            for label, s in data["terminations"].items()
        ],
    }
    if name == "peregrinus":
        # peregrinus's termination recites on a DIFFERENT note than its
        # mediant (secondReciting) -- the tone's namesake asymmetry.
        second_reciting_letter = reciting_letter_of(first_term)
        result["second_reciting_letter"] = second_reciting_letter
        result["second_reciting_degree"] = letter_degree(second_reciting_letter, final_letter)
    return result


if __name__ == "__main__":
    out = {name: build_tone(name, data) for name, data in TONES.items()}
    print(json.dumps(out, indent=2))
