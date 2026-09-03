import {
  analyzeMelody,
  analyzeMelodyGabc,
  detectMode,
  detectModeFromAbc,
  matchTone,
  catholicGregorianToneSet,
  type ChurchMode,
  type MelodyAnalysis,
  type ModeConsistencyMatch,
  type ModeRoot,
} from '@psalmigen/engine';

const ACCIDENTAL_SYMBOL = { sharp: '♯', flat: '♭', natural: '♮' } as const;

function formatRoot(root: ModeRoot): string {
  return root.accidental ? `${root.letter}${ACCIDENTAL_SYMBOL[root.accidental]}` : root.letter;
}

function formatMatch(match: ModeConsistencyMatch): string {
  return `${formatRoot(match.root)} ${match.species}`;
}

export type AntiphonFormat = 'abc' | 'gabc';

export interface AntiphonInputSection {
  element: HTMLElement;
  onApply(callback: (toneSetId: string, toneId: string, differentiaIndex: number) => void): void;
}

function labeled(text: string, el: HTMLElement): HTMLLabelElement {
  const wrap = document.createElement('label');
  wrap.textContent = text;
  wrap.appendChild(document.createElement('br'));
  wrap.appendChild(el);
  return wrap;
}

const PLACEHOLDER: Record<AntiphonFormat, string> = {
  abc: 'X:1\nL:1/4\nK:C\nD F A A G F E D |]',
  gabc: '(c3) A(g) F(i) A(k) A(k) G(j) F(i) E(h) D(g) ::',
};

const HELP_HTML: Record<AntiphonFormat, string> = {
  abc: `
    <strong>ABC notation</strong> -- only the pitches matter here, not the rhythm.
    <ul>
      <li>Start with a header: <code>X:1</code>, then <code>L:1/4</code> (note length), then a key, e.g. <code>K:C</code>.</li>
      <li>Notes are the letters <code>C D E F G A B</code>. Uppercase is the base octave;
        lowercase (<code>c d e f g a b</code>) is one octave higher.</li>
      <li>A comma after a note drops it an octave (<code>C,</code>); an apostrophe raises it (<code>c'</code>).</li>
      <li>Separate notes with spaces; use <code>|</code> between phrases and end with <code>|]</code>.</li>
    </ul>
    <p>Example: <code>X:1</code> / <code>L:1/4</code> / <code>K:C</code> / <code>D F A A G F E D |]</code></p>`,
  gabc: `
    <strong>GABC notation</strong> (the format used by Gregorio/square-note chant editors).
    <ul>
      <li>Start with a clef in parentheses, e.g. <code>(c3)</code> (a "do" clef on staff line 3)
        or <code>(f3)</code> (a "fa" clef on staff line 3) -- the clef fixes which pitch letter is C or F.</li>
      <li>Then write <code>syllable(notes)</code> pairs: pitch letters run <code>a</code> (lowest) to
        <code>m</code> (highest), each one diatonic step apart.</li>
      <li>Use <code>:</code> for a minor division (mediant/flex) and <code>::</code> for the final bar.</li>
    </ul>
    <p>Example: <code>(c3) A(g) F(i) A(k) A(k) G(j) F(i) E(h) D(g) ::</code></p>
    <p>Only the leading clef is read; a clef change mid-score is not yet supported.</p>`,
};

export function createAntiphonInput(): AntiphonInputSection {
  const container = document.createElement('div');
  container.className = 'antiphon-input';

  let format: AntiphonFormat = 'abc';

  const formatFieldset = document.createElement('fieldset');
  const formatLegend = document.createElement('legend');
  formatLegend.textContent = 'Antiphon melody format';
  formatFieldset.appendChild(formatLegend);

  const radios: Record<AntiphonFormat, HTMLInputElement> = { abc: null!, gabc: null! };
  (['abc', 'gabc'] as const).forEach((fmt, idx) => {
    const radioLabel = document.createElement('label');
    radioLabel.style.display = 'inline-block';
    radioLabel.style.marginRight = '1.5rem';
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'antiphon-format';
    radio.value = fmt;
    radio.checked = idx === 0;
    radios[fmt] = radio;
    radioLabel.append(radio, ` ${fmt.toUpperCase()}`);
    formatFieldset.appendChild(radioLabel);
  });

  const helpDiv = document.createElement('div');
  helpDiv.className = 'antiphon-format-help';

  const textarea = document.createElement('textarea');
  textarea.rows = 4;

  function applyFormat(fmt: AntiphonFormat): void {
    format = fmt;
    textarea.placeholder = PLACEHOLDER[fmt];
    helpDiv.innerHTML = HELP_HTML[fmt];
  }
  applyFormat('abc');

  (['abc', 'gabc'] as const).forEach((fmt) => {
    radios[fmt].addEventListener('change', () => {
      if (radios[fmt].checked) applyFormat(fmt);
    });
  });

  const analyzeButton = document.createElement('button');
  analyzeButton.type = 'button';
  analyzeButton.textContent = 'Analyze antiphon';

  const resultDiv = document.createElement('div');
  resultDiv.className = 'antiphon-result';

  const applyButton = document.createElement('button');
  applyButton.type = 'button';
  applyButton.textContent = 'Use this tone for rendering';
  applyButton.style.display = 'none';

  let applyCallback:
    ((toneSetId: string, toneId: string, differentiaIndex: number) => void) | undefined;
  let lastMatch: { toneSetId: string; toneId: string; differentiaIndex: number } | undefined;

  // Mode detection is a standard simplification and can misclassify
  // irregular melodies -- this suggestion is a starting point, not a
  // verdict; there is no manual override control in v1 yet.
  function suggestTone(mode: ChurchMode, analysis: MelodyAnalysis, headline: string): void {
    const match = matchTone(catholicGregorianToneSet, mode, analysis);
    const alternates =
      match.alternates.length > 0
        ? ` (alternate endings: ${match.alternates.map((a) => a.label).join(', ')})`
        : '';
    resultDiv.textContent = `${headline} Suggested tone: ${match.tone.name}, ending ${match.differentiaLabel}${alternates}`;
    lastMatch = {
      toneSetId: catholicGregorianToneSet.id,
      toneId: match.tone.id,
      differentiaIndex: match.differentiaIndex,
    };
    applyButton.style.display = '';
  }

  analyzeButton.addEventListener('click', () => {
    resultDiv.textContent = '';
    applyButton.style.display = 'none';
    lastMatch = undefined;
    try {
      if (format === 'abc') {
        // Content-aware path: reads the melody's actual accidentals and key
        // signature, so it won't mistake a transposed chant for whatever
        // mode its bare final letter suggests, and won't name a mode the
        // notes don't support. See the engine's detectModeFromAbc.
        const detection = detectModeFromAbc(textarea.value);
        if (detection.mode === undefined) {
          resultDiv.textContent =
            detection.matches.length === 0
              ? `The notes used don't fit any diatonic mode ending on ${formatRoot(detection.root)} -- check for an accidental that doesn't belong, or a final you didn't intend.`
              : `This reads as ${detection.matches.map(formatMatch).join(' or ')} -- a real mode, but not one this engine has psalm-tone data for, so there's no tone to suggest.`;
          return;
        }
        // At most one match is ever canonical (see AbcModeDetection.mode),
        // so this reads as a single name; the rest are what the melody
        // doesn't say enough to rule out.
        const named = detection.matches.filter((m) => m.churchMode !== undefined);
        const others = detection.matches.filter((m) => m.churchMode === undefined);
        const ambiguity =
          others.length > 0
            ? ` The melody doesn't use enough of the scale to rule out ${others.map(formatMatch).join(' or ')}.`
            : '';
        suggestTone(
          detection.mode,
          analyzeMelody(textarea.value),
          `Detected mode ${detection.mode} (${named.map(formatMatch).join(', ')}).${ambiguity}`,
        );
      } else {
        // GABC accidentals aren't read anywhere in the engine yet (see
        // output/gabc.ts), so this input can only be classified by its
        // final -- a transposed chant would be misread here.
        const analysis = analyzeMelodyGabc(textarea.value);
        const { mode, finalLetter } = detectMode(analysis);
        suggestTone(
          mode,
          analysis,
          `Detected mode ${mode} (final ${finalLetter}; GABC accidentals aren't read yet, so this is inferred from the final alone).`,
        );
      }
    } catch (err) {
      resultDiv.textContent = err instanceof Error ? err.message : String(err);
    }
  });

  applyButton.addEventListener('click', () => {
    if (lastMatch && applyCallback) {
      applyCallback(lastMatch.toneSetId, lastMatch.toneId, lastMatch.differentiaIndex);
    }
  });

  container.append(
    formatFieldset,
    helpDiv,
    labeled('Antiphon melody', textarea),
    analyzeButton,
    resultDiv,
    applyButton,
  );

  return {
    element: container,
    onApply(callback) {
      applyCallback = callback;
    },
  };
}
