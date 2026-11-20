// Wires Cover Coast: the pickers, the photo upload, the canvas drag-to-pan
// and scroll-to-zoom, undo and redo, and the PNG exports. A `?shot=` query
// sets up a fixed scene for a screenshot instead (./shots.js).
import { drawCover } from './cover.js';
import {
  GRADES, LAYOUTS, SIZES, cloneState, freshState, layoutRects,
  makeHistory, panelCount,
} from './state.js';
import { runShot } from './shots.js';

const SAMPLES = ['sunset', 'neon', 'palms'];
const $ = (id) => document.getElementById(id);

const canvas = $('cover');
const statusEl = $('status');
const titleInput = $('title');
const subtitleInput = $('subtitle');
const badgeInput = $('badge');
const zoomInput = $('zoom');

let state = freshState();
const history = makeHistory();
const images = new Map();
let uploadCount = 0;

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function ensureImage(name) {
  if (!images.has(name)) images.set(name, await loadImage(`samples/${name}.jpg`));
  return images.get(name);
}

// Draws the dashed outline around the selected panel on the preview only;
// the exported PNG never carries it.
function drawSelection() {
  const ctx = canvas.getContext('2d');
  const rects = layoutRects(state.layout, canvas.width, canvas.height);
  const rect = rects[state.selected];
  if (!rect) return;
  ctx.save();
  ctx.setLineDash([14, 10]);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(3, canvas.width * 0.004);
  ctx.strokeRect(rect.x + 4, rect.y + 4, rect.w - 8, rect.h - 8);
  ctx.restore();
}

function syncControls() {
  document.querySelectorAll('#layouts button').forEach((b) => {
    b.classList.toggle('active', b.dataset.value === state.layout);
  });
  document.querySelectorAll('#grades button').forEach((b) => {
    b.classList.toggle('active', b.dataset.value === state.grade);
  });
  document.querySelectorAll('#sizes button').forEach((b) => {
    b.classList.toggle('active', b.dataset.value === state.size);
  });
  document.querySelectorAll('#samples button').forEach((b) => {
    b.classList.toggle('active', b.dataset.value === state.panels[state.selected].photo);
  });
  document.querySelectorAll('#heat button').forEach((b, i) => {
    b.classList.toggle('filled', i < state.heat);
  });
  if (document.activeElement !== titleInput) titleInput.value = state.title;
  if (document.activeElement !== subtitleInput) subtitleInput.value = state.subtitle;
  if (document.activeElement !== badgeInput) badgeInput.value = state.badge;
  zoomInput.value = String(Math.round(state.panels[state.selected].zoom * 100));
  $('zoomValue').textContent = `${Math.round(state.panels[state.selected].zoom * 100)}%`;
  $('panelLabel').textContent = `Panel ${state.selected + 1} of ${panelCount(state)}`;
  $('undo').disabled = !history.canUndo();
  $('redo').disabled = !history.canRedo();
}

function redraw() {
  drawCover(canvas, state, images);
  if (!document.body.classList.contains('shot-cover')) drawSelection();
  syncControls();
}

// Records the state before a change, applies it, and repaints: every
// undoable edit goes through this one helper.
function change(fn) {
  history.push(state);
  fn();
  redraw();
}

function buildPickers() {
  const layoutsEl = $('layouts');
  for (const [key, layout] of Object.entries(LAYOUTS)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.value = key;
    b.textContent = layout.name;
    b.addEventListener('click', () => change(() => {
      state.layout = key;
      state.selected = 0;
    }));
    layoutsEl.appendChild(b);
  }
  const gradesEl = $('grades');
  for (const [key, grade] of Object.entries(GRADES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.value = key;
    b.textContent = grade.name;
    b.style.background = `linear-gradient(135deg, ${grade.sky[0]}, ${grade.sky[1]})`;
    b.style.setProperty('--grade-accent', grade.accent);
    b.addEventListener('click', () => change(() => { state.grade = key; }));
    gradesEl.appendChild(b);
  }
  const sizesEl = $('sizes');
  for (const [key, size] of Object.entries(SIZES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.value = key;
    b.textContent = size.label;
    b.addEventListener('click', () => change(() => { state.size = key; }));
    sizesEl.appendChild(b);
  }
  const samplesEl = $('samples');
  for (const name of SAMPLES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.value = name;
    b.textContent = name;
    b.style.backgroundImage = `url(samples/${name}.jpg)`;
    b.addEventListener('click', () => change(() => {
      state.panels[state.selected].photo = name;
    }));
    samplesEl.appendChild(b);
  }
  const heatEl = $('heat');
  for (let i = 0; i < 5; i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = '★';
    b.setAttribute('aria-label', `${i + 1} stars`);
    b.addEventListener('click', () => change(() => { state.heat = i + 1; }));
    heatEl.appendChild(b);
  }
}

function panelAt(clientX, clientY) {
  const box = canvas.getBoundingClientRect();
  const x = ((clientX - box.left) / box.width) * canvas.width;
  const y = ((clientY - box.top) / box.height) * canvas.height;
  const rects = layoutRects(state.layout, canvas.width, canvas.height);
  return { x, y, index: rects.findIndex((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) };
}

function wireCanvas() {
  let dragging = false;
  let pushed = false;
  let lastX = 0;
  let lastY = 0;
  canvas.addEventListener('pointerdown', (e) => {
    const hit = panelAt(e.clientX, e.clientY);
    if (hit.index < 0) return;
    if (hit.index !== state.selected) {
      state.selected = hit.index;
      redraw();
    }
    dragging = true;
    pushed = false;
    lastX = hit.x;
    lastY = hit.y;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const hit = panelAt(e.clientX, e.clientY);
    if (!pushed) {
      history.push(state);
      pushed = true;
    }
    const panel = state.panels[state.selected];
    panel.dx += hit.x - lastX;
    panel.dy += hit.y - lastY;
    lastX = hit.x;
    lastY = hit.y;
    redraw();
  });
  const endDrag = () => { dragging = false; };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  let wheelPushedAt = 0;
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const now = Date.now();
    if (now - wheelPushedAt > 600) {
      history.push(state);
      wheelPushedAt = now;
    }
    const panel = state.panels[state.selected];
    panel.zoom = Math.min(3, Math.max(0.5, panel.zoom * (e.deltaY < 0 ? 1.08 : 0.93)));
    redraw();
  }, { passive: false });
}

function wireControls() {
  $('upload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const key = `up${++uploadCount}`;
    images.set(key, await loadImage(URL.createObjectURL(file)));
    change(() => { state.panels[state.selected].photo = key; });
    statusEl.textContent = `Loaded ${file.name} into panel ${state.selected + 1}.`;
  });
  titleInput.addEventListener('change', () => change(() => { state.title = titleInput.value; }));
  subtitleInput.addEventListener('change', () => change(() => { state.subtitle = subtitleInput.value; }));
  badgeInput.addEventListener('change', () => change(() => { state.badge = badgeInput.value; }));
  let zoomPushed = false;
  zoomInput.addEventListener('focus', () => {
    if (!zoomPushed) {
      history.push(state);
      zoomPushed = true;
    }
  });
  zoomInput.addEventListener('input', () => {
    state.panels[state.selected].zoom = Number(zoomInput.value) / 100;
    redraw();
  });
  zoomInput.addEventListener('change', () => {
    zoomPushed = false;
    redraw();
  });
  $('undo').addEventListener('click', () => {
    const prev = history.undo(state);
    if (prev) {
      state = prev;
      redraw();
    }
  });
  $('redo').addEventListener('click', () => {
    const next = history.redo(state);
    if (next) {
      state = next;
      redraw();
    }
  });
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      e.preventDefault();
      $('undo').click();
    } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
      e.preventDefault();
      $('redo').click();
    }
  });
}

// Renders the cover at `sizeKey` on a fresh canvas and downloads it as a PNG.
function exportPNG(sizeKey) {
  const size = SIZES[sizeKey];
  const off = document.createElement('canvas');
  const saved = state.size;
  state.size = sizeKey;
  drawCover(off, state, images);
  state.size = saved;
  redraw();
  off.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cover-coast-${size.w}x${size.h}.png`;
    a.click();
    statusEl.textContent = `Saved cover-coast-${size.w}x${size.h}.png`;
  }, 'image/png');
}

function wireExport() {
  for (const key of Object.keys(SIZES)) {
    $(`export-${key}`).addEventListener('click', () => exportPNG(key));
  }
}

buildPickers();
wireCanvas();
wireControls();
wireExport();

// The display fonts arrive as local files; wait for them before the first
// paint so the title is never drawn in a fallback font.
const query = new URLSearchParams(location.search);
const shot = query.get('shot');
Promise.all(SAMPLES.map(ensureImage)).then(async () => {
  try {
    await Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('60px Pacifico'),
    ]);
  } catch {
    // A missing font falls back to sans-serif; the cover still draws.
  }
  if (shot) {
    await runShot(shot, query, {
      setSize: (s) => { state.size = s; },
      setLayout: (l) => { state.layout = l; state.selected = 0; },
      setGrade: (g) => { state.grade = g; },
      setHeat: (n) => { state.heat = n; },
      loadSample: async (photo, caption) => {
        await ensureImage(photo);
        const start = SAMPLES.indexOf(photo);
        state.panels.forEach((p, i) => {
          p.photo = SAMPLES[(start + i) % SAMPLES.length];
        });
        state.title = caption;
        redraw();
      },
    });
  } else {
    redraw();
  }
});
