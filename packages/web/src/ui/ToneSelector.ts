import { listToneSets, type ToneFormula } from '@psalmigen/engine';

export interface ToneSelectorSection {
  element: HTMLElement;
  getTone(): ToneFormula;
  /** Programmatically selects a built-in tone (e.g. from an antiphon-match suggestion). */
  selectTone(toneSetId: string, toneId: string): void;
}

function labeled(text: string, el: HTMLElement): HTMLLabelElement {
  const wrap = document.createElement('label');
  wrap.textContent = text;
  wrap.appendChild(document.createElement('br'));
  wrap.appendChild(el);
  return wrap;
}

export function createToneSelector(): ToneSelectorSection {
  const container = document.createElement('div');
  container.className = 'tone-selector';

  const toneSets = listToneSets();

  const setSelect = document.createElement('select');
  for (const ts of toneSets) {
    const opt = document.createElement('option');
    opt.value = ts.id;
    opt.textContent = ts.name;
    setSelect.appendChild(opt);
  }
  const customOpt = document.createElement('option');
  customOpt.value = 'custom';
  customOpt.textContent = 'Custom (JSON)';
  setSelect.appendChild(customOpt);

  const toneSelect = document.createElement('select');
  const customArea = document.createElement('textarea');
  customArea.rows = 10;
  customArea.placeholder = 'Paste a ToneFormula as JSON…';
  customArea.style.display = 'none';

  const toneLabel = labeled('Tone', toneSelect);

  function populateTones(setId: string): void {
    toneSelect.innerHTML = '';
    const ts = toneSets.find((t) => t.id === setId);
    if (!ts) return;
    for (const tone of ts.tones) {
      const opt = document.createElement('option');
      opt.value = tone.id;
      opt.textContent = tone.name;
      toneSelect.appendChild(opt);
    }
  }

  if (toneSets[0]) populateTones(toneSets[0].id);

  setSelect.addEventListener('change', () => {
    const isCustom = setSelect.value === 'custom';
    toneLabel.style.display = isCustom ? 'none' : '';
    customArea.style.display = isCustom ? '' : 'none';
    if (!isCustom) populateTones(setSelect.value);
  });

  container.append(labeled('Tone tradition', setSelect), toneLabel, labeled('Custom tone JSON', customArea));

  return {
    element: container,
    getTone(): ToneFormula {
      if (setSelect.value === 'custom') {
        return JSON.parse(customArea.value) as ToneFormula;
      }
      const ts = toneSets.find((t) => t.id === setSelect.value);
      const tone = ts?.tones.find((t) => t.id === toneSelect.value);
      if (!tone) throw new Error('No tone selected.');
      return tone;
    },
    selectTone(toneSetId, toneId) {
      setSelect.value = toneSetId;
      toneLabel.style.display = '';
      customArea.style.display = 'none';
      populateTones(toneSetId);
      toneSelect.value = toneId;
    },
  };
}
