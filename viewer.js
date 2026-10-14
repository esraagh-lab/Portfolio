import * as pdfjsLib from 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.4.299/build/pdf.min.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.4.299/build/pdf.worker.min.mjs';

const PDF_URL = 'portfolio.pdf';

const canvas = document.getElementById('pdf-canvas');
const ctx = canvas.getContext('2d', { alpha: false });
const pageWrap = document.getElementById('page-wrap');
const linkLayer = document.getElementById('link-layer');

const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const zoomInBtn = document.getElementById('zoom-in');
const zoomOutBtn = document.getElementById('zoom-out');
const zoomLabel = document.getElementById('zoom-label');
const status = document.getElementById('page-status');
const stage = document.querySelector('.stage');

let pdfDoc = null;
let pageNum = 1;
let userZoom = 1;
let renderToken = 0;

function availableWidth() {
  const mobile = window.innerWidth <= 760;
  const sidePadding = mobile ? 20 : 160;
  return Math.max(280, window.innerWidth - sidePadding);
}

function availableHeight() {
  const topBottom = window.innerWidth <= 760 ? 100 : 145;
  return Math.max(250, window.innerHeight - topBottom);
}

async function renderPage() {
  if (!pdfDoc) return;

  const token = ++renderToken;
  const page = await pdfDoc.getPage(pageNum);
  const baseViewport = page.getViewport({ scale: 1 });

  const fitScale = Math.min(
    availableWidth() / baseViewport.width,
    availableHeight() / baseViewport.height
  );

  const cssScale = fitScale * userZoom;
  const viewport = page.getViewport({ scale: cssScale });

  const outputScale = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(viewport.width * outputScale);
  canvas.height = Math.floor(viewport.height * outputScale);
  canvas.style.width = `${viewport.width}px`;
  canvas.style.height = `${viewport.height}px`;

  pageWrap.style.width = `${viewport.width}px`;
  pageWrap.style.height = `${viewport.height}px`;
  linkLayer.style.width = `${viewport.width}px`;
  linkLayer.style.height = `${viewport.height}px`;

  const transform = outputScale !== 1
    ? [outputScale, 0, 0, outputScale, 0, 0]
    : null;

  await page.render({
    canvasContext: ctx,
    transform,
    viewport,
    background: '#ffffff'
  }).promise;

  if (token !== renderToken) return;

  // Keep URL links from the PDF clickable, including Vimeo links.
  linkLayer.innerHTML = '';
  const annotations = await page.getAnnotations({ intent: 'display' });

  for (const ann of annotations) {
    if (ann.subtype !== 'Link' || !ann.rect) continue;

    const rect = viewport.convertToViewportRectangle(ann.rect);
    const left = Math.min(rect[0], rect[2]);
    const top = Math.min(rect[1], rect[3]);
    const width = Math.abs(rect[2] - rect[0]);
    const height = Math.abs(rect[3] - rect[1]);

    const href = ann.url || ann.unsafeUrl;
    if (!href) continue;

    const a = document.createElement('a');
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.style.left = `${left}px`;
    a.style.top = `${top}px`;
    a.style.width = `${width}px`;
    a.style.height = `${height}px`;
    a.setAttribute('aria-label', 'Open link');
    linkLayer.appendChild(a);
  }

  status.textContent = `${pageNum} / ${pdfDoc.numPages}`;
  prevBtn.disabled = pageNum <= 1;
  nextBtn.disabled = pageNum >= pdfDoc.numPages;
  zoomLabel.textContent = `${Math.round(userZoom * 100)}%`;

  stage.scrollLeft = Math.max(0, (pageWrap.offsetWidth - stage.clientWidth) / 2);
  stage.scrollTop = 0;
}

function changePage(delta) {
  const next = pageNum + delta;
  if (!pdfDoc || next < 1 || next > pdfDoc.numPages) return;
  pageNum = next;
  renderPage();
}

prevBtn.addEventListener('click', () => changePage(-1));
nextBtn.addEventListener('click', () => changePage(1));

zoomInBtn.addEventListener('click', () => {
  userZoom = Math.min(2, userZoom + 0.1);
  renderPage();
});

zoomOutBtn.addEventListener('click', () => {
  userZoom = Math.max(0.6, userZoom - 0.1);
  renderPage();
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') changePage(-1);
  if (e.key === 'ArrowRight') changePage(1);
});

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(renderPage, 120);
});

pdfDoc = await pdfjsLib.getDocument(PDF_URL).promise;
await renderPage();
