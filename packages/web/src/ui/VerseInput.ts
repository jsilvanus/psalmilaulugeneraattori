import {
  extractPsalm,
  parseBibleCsv,
  parseVerseReference,
  selectVerses,
  type BibleVerseRow,
  type Lang,
} from '@psalmigen/engine';

export interface VerseInputSection {
  element: HTMLElement;
  getText(): string;
  getLang(): Lang;
}

function labeled(text: string, el: HTMLElement): HTMLLabelElement {
  const wrap = document.createElement('label');
  wrap.textContent = text;
  wrap.appendChild(document.createElement('br'));
  wrap.appendChild(el);
  return wrap;
}

let cachedRows: BibleVerseRow[] | undefined;

async function loadBibleRows(): Promise<BibleVerseRow[]> {
  if (!cachedRows) {
    const response = await fetch('/raamattu.csv');
    if (!response.ok) {
      throw new Error(`Failed to fetch Bible data (HTTP ${response.status}).`);
    }
    cachedRows = parseBibleCsv(await response.text());
  }
  return cachedRows;
}

export function createVerseInput(): VerseInputSection {
  const container = document.createElement('div');
  container.className = 'verse-input';

  const textarea = document.createElement('textarea');
  textarea.rows = 8;
  textarea.value = [
    '1 Dixit Dominus Domino meo: * sede a dextris meis.',
    '2 Donec ponam † inimicos tuos * scabellum pedum tuorum.',
  ].join('\n');

  const langSelect = document.createElement('select');
  const languages: { value: Lang; label: string }[] = [
    { value: 'la', label: 'Latin' },
    { value: 'fi', label: 'Finnish' },
  ];
  for (const { value, label } of languages) {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = label;
    langSelect.appendChild(opt);
  }

  const referenceInput = document.createElement('input');
  referenceInput.type = 'text';
  referenceInput.placeholder = 'e.g. 3:1-4,6-8 or just 3 for the whole psalm';

  const importButton = document.createElement('button');
  importButton.type = 'button';
  importButton.textContent = 'Import from Bible';

  const importStatus = document.createElement('div');
  importStatus.className = 'import-status';

  importButton.addEventListener('click', () => {
    void (async () => {
      importStatus.textContent = 'Loading…';
      try {
        const { psalmNumber, ranges } = parseVerseReference(referenceInput.value);
        const rows = await loadBibleRows();
        const verses = selectVerses(extractPsalm(rows, psalmNumber), ranges);
        if (verses.length === 0) {
          throw new Error(`No verses found for psalm ${psalmNumber} in that range.`);
        }
        textarea.value = verses.map((v) => `${v.number} ${v.text}`).join('\n');
        langSelect.value = 'fi';
        importStatus.textContent =
          `Imported ${verses.length} verse(s) from Psalm ${psalmNumber}. ` +
          'This text has no chant caesura markup yet -- add * (and, for a ' +
          'tripartite verse, †) to each line before rendering.';
      } catch (err) {
        importStatus.textContent = err instanceof Error ? err.message : String(err);
      }
    })();
  });

  container.append(
    labeled('Psalm text (mark caesuras with * and, optionally, † or +)', textarea),
    labeled('Language', langSelect),
    labeled('Import psalm verses (Finnish Bible CSV)', referenceInput),
    importButton,
    importStatus,
  );

  return {
    element: container,
    getText: () => textarea.value,
    getLang: () => langSelect.value as Lang,
  };
}
