'use strict';

const legalDialog = document.getElementById('legal-dialog');
const legalLinks = document.querySelector('[data-legal-links]');
if (legalDialog && legalLinks) {
  const content = document.getElementById('legal-dialog-content');
  const title = document.getElementById('legal-dialog-title');
  let requestId = 0;
  document
    .getElementById('close-legal-dialog')
    .addEventListener('click', () => legalDialog.close());
  legalDialog.addEventListener('close', () => {
    requestId += 1;
  });
  legalLinks.addEventListener('click', async (event) => {
    const link = event.target.closest('a');
    if (
      !link ||
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    const currentRequest = ++requestId;
    title.textContent = link.textContent;
    content.textContent = 'Dokumentum betöltése…';
    legalDialog.showModal();
    try {
      const response = await fetch(link.href);
      if (!response.ok) throw new Error('Document request failed');
      const html = await response.text();
      if (currentRequest !== requestId) return;
      const documentPage = new DOMParser().parseFromString(html, 'text/html');
      const documentContent = documentPage.querySelector('.legal-document');
      if (!documentContent) throw new Error('Document content missing');
      documentContent.querySelector(':scope > a')?.remove();
      content.replaceChildren(documentContent);
    } catch {
      if (currentRequest !== requestId) return;
      content.textContent = 'A dokumentumot nem sikerült betölteni. Próbáld újra.';
    }
  });
}
