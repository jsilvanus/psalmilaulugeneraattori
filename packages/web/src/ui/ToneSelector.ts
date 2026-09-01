import { listToneSets, type ToneFormula } from '@psalmigen/engine';

export interface ToneSelectorSection {
  element: HTMLElement;
  getTone(): ToneFormula;
  /** Index into the selected tone's `termination` array (0 for custom tones). */
  getDifferentiaIndex(): number;
  /** Programmatically selects a built-in tone and (optionally) one of its endings, e.g. from an antiphon-match suggestion. */
  selectTone(toneSetId: string, toneId: string, differentiaIndex?: number): void;
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
  const differentiaSelect = document.createElement('select');
  const customArea = document.createElement('textarea');
  customArea.rows = 10;
  customArea.placeholder = 'Paste a ToneFormula as JSON…';
  customArea.style.display = 'none';

  const toneLabel = labeled('Tone', toneSelect);
  const differentiaLabel = labeled('Ending (differentia)', differentiaSelect);

  function findTone(setId: string, toneId: string): ToneFormula | undefined {
    return toneSets.find((t) => t.id === setId)?.tones.find((t) => t.id === toneId);
  }

  function populateDifferentiae(setId: string, toneId: string): void {
    differentiaSelect.innerHTML = '';
    const tone = findTone(setId, toneId);
    if (!tone) return;
    tone.termination.forEach((differentia, index) => {
      const opt = document.createElement('option');
      opt.value = String(index);
      opt.textContent = `Ending ${differentia.label ?? `#${index + 1}`}`;
      differentiaSelect.appendChild(opt);
    });
  }

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
    if (ts.tones[0]) populateDifferentiae(setId, ts.tones[0].id);
  }

  if (toneSets[0]) populateTones(toneSets[0].id);

  setSelect.addEventListener('change', () => {
    const isCustom = setSelect.value === 'custom';
    toneLabel.style.display = isCustom ? 'none' : '';
    differentiaLabel.style.display = isCustom ? 'none' : '';
    customArea.style.display = isCustom ? '' : 'none';
    if (!isCustom) populateTones(setSelect.value);
  });

  toneSelect.addEventListener('change', () => {
    populateDifferentiae(setSelect.value, toneSelect.value);
  });

  container.append(
    labeled('Tone tradition', setSelect),
    toneLabel,
    differentiaLabel,
    labeled('Custom tone JSON', customArea),
  );

  return {
    element: container,
    getTone(): ToneFormula {
      if (setSelect.value === 'custom') {
        return JSON.parse(customArea.value) as ToneFormula;
      }
      const tone = findTone(setSelect.value, toneSelect.value);
      if (!tone) throw new Error('No tone selected.');
      return tone;
    },
    getDifferentiaIndex(): number {
      if (setSelect.value === 'custom' || !differentiaSelect.value) return 0;
      return Number(differentiaSelect.value);
    },
    selectTone(toneSetId, toneId, differentiaIndex = 0) {
      setSelect.value = toneSetId;
      toneLabel.style.display = '';
      differentiaLabel.style.display = '';
      customArea.style.display = 'none';
      populateTones(toneSetId);
      toneSelect.value = toneId;
      populateDifferentiae(toneSetId, toneId);
      differentiaSelect.value = String(differentiaIndex);
    },
  };
}
