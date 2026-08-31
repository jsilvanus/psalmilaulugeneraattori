import type { Lang } from '@psalmigen/engine';

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

  container.append(
    labeled('Psalm text (mark caesuras with * and, optionally, † or +)', textarea),
    labeled('Language', langSelect),
  );

  return {
    element: container,
    getText: () => textarea.value,
    getLang: () => langSelect.value as Lang,
  };
}
