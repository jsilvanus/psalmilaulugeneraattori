import abcjs from 'abcjs';

export interface RenderPaneSection {
  element: HTMLElement;
  render(abc: string, gabc: string): void;
  renderError(message: string): void;
}

export function createRenderPane(): RenderPaneSection {
  const container = document.createElement('div');
  container.className = 'render-pane';

  const notationHeading = document.createElement('h3');
  notationHeading.textContent = 'Notation (abcjs)';
  const notationDiv = document.createElement('div');
  notationDiv.className = 'abc-notation';

  const gabcHeading = document.createElement('h3');
  gabcHeading.textContent = 'GABC';
  const gabcPre = document.createElement('pre');
  gabcPre.className = 'gabc-text';

  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';

  container.append(notationHeading, notationDiv, gabcHeading, gabcPre, errorDiv);

  return {
    element: container,
    render(abc, gabc) {
      errorDiv.textContent = '';
      notationDiv.innerHTML = '';
      abcjs.renderAbc(notationDiv, abc);
      gabcPre.textContent = gabc;
    },
    renderError(message) {
      notationDiv.innerHTML = '';
      gabcPre.textContent = '';
      errorDiv.textContent = message;
    },
  };
}
