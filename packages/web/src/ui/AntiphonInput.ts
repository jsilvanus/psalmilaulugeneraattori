import { analyzeMelody, detectMode, matchTone, catholicGregorianToneSet } from '@psalmigen/engine';

export interface AntiphonInputSection {
  element: HTMLElement;
  onApply(callback: (toneSetId: string, toneId: string) => void): void;
}

function labeled(text: string, el: HTMLElement): HTMLLabelElement {
  const wrap = document.createElement('label');
  wrap.textContent = text;
  wrap.appendChild(document.createElement('br'));
  wrap.appendChild(el);
  return wrap;
}

export function createAntiphonInput(): AntiphonInputSection {
  const container = document.createElement('div');
  container.className = 'antiphon-input';

  const textarea = document.createElement('textarea');
  textarea.rows = 4;
  textarea.placeholder = 'X:1\nL:1/4\nK:C\nD F A A G F E D |]';

  const analyzeButton = document.createElement('button');
  analyzeButton.type = 'button';
  analyzeButton.textContent = 'Analyze antiphon';

  const resultDiv = document.createElement('div');
  resultDiv.className = 'antiphon-result';

  const applyButton = document.createElement('button');
  applyButton.type = 'button';
  applyButton.textContent = 'Use this tone for rendering';
  applyButton.style.display = 'none';

  let applyCallback: ((toneSetId: string, toneId: string) => void) | undefined;
  let lastMatch: { toneSetId: string; toneId: string } | undefined;

  analyzeButton.addEventListener('click', () => {
    resultDiv.textContent = '';
    applyButton.style.display = 'none';
    lastMatch = undefined;
    try {
      const analysis = analyzeMelody(textarea.value);
      const { mode, finalLetter } = detectMode(analysis);
      // Mode detection is a standard simplification and can misclassify
      // irregular melodies -- this suggestion is a starting point, not a
      // verdict; there is no manual override control in v1 yet.
      const match = matchTone(catholicGregorianToneSet, mode, analysis);
      const alternates =
        match.alternates.length > 0
          ? ` (alternate differentiae: ${match.alternates.map((a) => `#${a.differentiaIndex + 1}`).join(', ')})`
          : '';
      resultDiv.textContent = `Detected mode ${mode} (final ${finalLetter}). Suggested tone: ${match.tone.name}, differentia #${match.differentiaIndex + 1}${alternates}`;
      lastMatch = { toneSetId: catholicGregorianToneSet.id, toneId: match.tone.id };
      applyButton.style.display = '';
    } catch (err) {
      resultDiv.textContent = err instanceof Error ? err.message : String(err);
    }
  });

  applyButton.addEventListener('click', () => {
    if (lastMatch && applyCallback) applyCallback(lastMatch.toneSetId, lastMatch.toneId);
  });

  container.append(labeled('Antiphon melody (ABC notation)', textarea), analyzeButton, resultDiv, applyButton);

  return {
    element: container,
    onApply(callback) {
      applyCallback = callback;
    },
  };
}
