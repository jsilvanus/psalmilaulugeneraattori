import {
  parsePsalmText,
  analyzeWord,
  fitVerse,
  emitGabc,
  emitAbc,
  VerseParseError,
  type ColonInput,
  type PitchedColon,
} from '@psalmigen/engine';
import { createVerseInput } from './ui/VerseInput.js';
import { createToneSelector } from './ui/ToneSelector.js';
import { createAntiphonInput } from './ui/AntiphonInput.js';
import { createRenderPane } from './ui/RenderPane.js';

const app = document.getElementById('app');
if (!app) throw new Error('Missing #app root element.');

const heading = document.createElement('h1');
heading.textContent = 'psalmilaulugeneraattori';

const verseInput = createVerseInput();
const toneSelector = createToneSelector();
const antiphonInput = createAntiphonInput();
const renderPane = createRenderPane();

antiphonInput.onApply((toneSetId, toneId, differentiaIndex) =>
  toneSelector.selectTone(toneSetId, toneId, differentiaIndex),
);

const renderButton = document.createElement('button');
renderButton.textContent = 'Render';
renderButton.type = 'button';

app.append(
  heading,
  verseInput.element,
  toneSelector.element,
  antiphonInput.element,
  renderButton,
  renderPane.element,
);

renderButton.addEventListener('click', () => {
  try {
    const verses = parsePsalmText(verseInput.getText());
    const lang = verseInput.getLang();
    const tone = toneSelector.getTone();
    const differentiaIndex = toneSelector.getDifferentiaIndex();

    const allCola: PitchedColon[] = [];
    verses.forEach((verse, idx) => {
      const cola: ColonInput[] = verse.cola.map((colon) => ({
        role: colon.role,
        words: colon.text
          .split(/\s+/)
          .filter((w) => w.length > 0)
          .map((w) => analyzeWord(w, lang)),
      }));
      const isFirstVerseOfPsalm = verse.isFirstVerseOfPsalm ?? idx === 0;
      allCola.push(...fitVerse(cola, tone, isFirstVerseOfPsalm, differentiaIndex));
    });

    renderPane.render(emitAbc(allCola, { title: 'Psalm' }), emitGabc(allCola));
  } catch (err) {
    if (err instanceof VerseParseError) {
      renderPane.renderError(`Parse error: ${err.message} (in "${err.line}")`);
    } else {
      renderPane.renderError(err instanceof Error ? err.message : String(err));
    }
  }
});
