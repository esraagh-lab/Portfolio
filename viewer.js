import * as pdfjsLib from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';

const PDF_URL = './portfolio.pdf';

const spreadWrap = document.getElementById('spread-wrap');
const leftSlot = document.getElementById('left-slot');
const rightSlot = document.getElementById('right-slot');
const leftCanvas = document.getElementById('left-canvas');
const rightCanvas = document.getElementById('right-canvas');
const leftLinks = document.getElementById('left-links');
const rightLinks = document.getElementById('right-links');

const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const zoomInBtn = document.getElementById('zoom-in');
const zoomOutBtn = document.getElementById('zoom-out');
const zoomLabel = document.getElementById('zoom-label');
const status = document.getElementById('page-status');
const stage = document.querySelector('.stage');
const errorBox = document.getElementById('error-box');

let pdfDoc = null;
let spreadIndex = 0; // 0 = cover, 1 = pages 2-3, 2 = pages 4-5, ...
let userZoom = 1;
let renderId = 0;

function isMobile() {
  return window.innerWidth <= 760;
}

function spreadPages() {
  if (isMobile()) {
    return [Math.min(spreadIndex + 1, pdfDoc.numPages), null];
  }

  if (spreadIndex === 0) return [1, null];

  const left = spreadIndex * 2;
  const right = left + 1;
  return [left <= pdfDoc.numPages ? left : null,
          right <= pdfDoc.numPages ? right : null];
}

function maxSpreadIndex() {
  if (isMobile()) return pdfDoc ? pdfDoc.numPages - 1 : 0;
  return pdfDoc ? Math.ceil((pdfDoc.numPages - 1) / 2) : 0;
}

function availableWidth() {
  return Math.max(300, window.innerWidth - (isMobile() ? 28 : 170));
}

function availableHeight() {
  return Math.max(300, window.innerHeight - (isMobile() ? 105 : 135));
}

async function preparePage(pageNumber) {
  if (!pageNumber) return null;
  const page = await pdfDoc.getPage(pageNumber);
  const unit = page.getViewport({ scale: 1 });
  return { pageNumber, page, unit };
}

function fitScale(items) {
  const live = items.filter(Boolean);
  if (!live.length) return 1;

  if (isMobile()) {
    const p = live[0].unit;
    return Math.min(availableWidth() / p.width, availableHeight() / p.height);
  }

  const gap = live.length === 2 ? 10 : 0;
  const totalWidth = live.reduce((sum, x) => sum + x.unit.width, 0) + gap;
  const maxHeight = Math.max(...live.map(x => x.unit.height));

  return Math.min(
    availableWidth() / totalWidth,
    availableHeight() / maxHeight
  );
}

async function renderInto(item, canvas, slot, links, scale) {
  if (!item) {
    slot.classList.add('hidden');
    canvas.width = 1;
    canvas.height = 1;
    links.innerHTML = '';
    return;
  }

  slot.classList.remove('hidden');

  const viewport = item.page.getViewport({ scale });
  const outputScale = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = Math.max(1, Math.floor(viewport.width * outputScale));
  canvas.height = Math.max(1, Math.floor(viewport.height * outputScale));
  canvas.style.width = `${viewport.width}px`;
  canvas.style.height = `${viewport.height}px`;

  slot.style.width = `${viewport.width}px`;
  slot.style.height = `${viewport.height}px`;
  links.style.width = `${viewport.width}px`;
  links.style.height = `${viewport.height}px`;

  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  const transform = outputScale !== 1
    ? [outputScale, 0, 0, outputScale, 0, 0]
    : null;

  await item.page.render({
    canvasContext: ctx,
    transform,
    viewport,
    background: '#ffffff'
  }).promise;

  links.innerHTML = '';
  const annotations = await item.page.getAnnotations({ intent: 'display' });

  for (const ann of annotations) {
    if (ann.subtype !== 'Link' || !ann.rect) continue;
    const href = ann.url || ann.unsafeUrl;
    if (!href) continue;

    const rect = viewport.convertToViewportRectangle(ann.rect);
    const left = Math.min(rect[0], rect[2]);
    const top = Math.min(rect[1], rect[3]);
    const width = Math.abs(rect[2] - rect[0]);
    const height = Math.abs(rect[3] - rect[1]);

    const a = document.createElement('a');
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.style.left = `${left}px`;
    a.style.top = `${top}px`;
    a.style.width = `${width}px`;
    a.style.height = `${height}px`;
    a.setAttribute('aria-label', 'Open link');
    links.appendChild(a);
  }
}

async function renderSpread() {
  if (!pdfDoc) return;

  const myId = ++renderId;
  errorBox.hidden = true;
  spreadWrap.style.display = 'flex';

  const [leftNum, rightNum] = spreadPages();
  const [left, right] = await Promise.all([
    preparePage(leftNum),
    preparePage(rightNum)
  ]);

  if (myId !== renderId) return;

  const scale = fitScale([left, right]) * userZoom;

  await Promise.all([
    renderInto(left, leftCanvas, leftSlot, leftLinks, scale),
    renderInto(right, rightCanvas, rightSlot, rightLinks, scale)
  ]);

  if (myId !== renderId) return;

  if (isMobile()) {
    status.textContent = `${leftNum} / ${pdfDoc.numPages}`;
  } else if (rightNum) {
    status.textContent = `${leftNum}–${rightNum} / ${pdfDoc.numPages}`;
  } else {
    status.textContent = `${leftNum} / ${pdfDoc.numPages}`;
  }

  prevBtn.disabled = spreadIndex <= 0;
  nextBtn.disabled = spreadIndex >= maxSpreadIndex();
  zoomLabel.textContent = `${Math.round(userZoom * 100)}%`;

  requestAnimationFrame(() => {
    stage.scrollLeft = Math.max(0, (spreadWrap.scrollWidth - stage.clientWidth) / 2);
    stage.scrollTop = 0;
  });
}

function changeSpread(delta) {
  const next = Math.max(0, Math.min(maxSpreadIndex(), spreadIndex + delta));
  if (next === spreadIndex) return;
  spreadIndex = next;
  renderSpread();
}

prevBtn.addEventListener('click', () => changeSpread(-1));
nextBtn.addEventListener('click', () => changeSpread(1));

zoomInBtn.addEventListener('click', () => {
  userZoom = Math.min(1.8, +(userZoom + 0.1).toFixed(1));
  renderSpread();
});

zoomOutBtn.addEventListener('click', () => {
  userZoom = Math.max(0.6, +(userZoom - 0.1).toFixed(1));
  renderSpread();
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') changeSpread(-1);
  if (e.key === 'ArrowRight') changeSpread(1);
});

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    // Keep position sensible when switching desktop/mobile.
    spreadIndex = Math.min(spreadIndex, maxSpreadIndex());
    renderSpread();
  }, 150);
});

async function start() {
  try {
    status.textContent = 'Loading portfolio…';

    pdfDoc = await pdfjsLib.getDocument({
      url: PDF_URL,
      cMapPacked: true
    }).promise;

    await renderSpread();
  } catch (err) {
    console.error(err);
    spreadWrap.style.display = 'none';
    errorBox.hidden = false;
    errorBox.innerHTML =
      '<strong>The portfolio could not be loaded.</strong><br><br>' +
      'Please refresh the page. If the problem remains, make sure ' +
      '<code>portfolio.pdf</code> is in the same folder as <code>index.html</code>.';
    status.textContent = 'Error';
  }
}

start();
