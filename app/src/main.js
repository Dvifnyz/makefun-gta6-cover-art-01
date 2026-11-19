// Cover Coast — wires the editor: photos in, caption typed, cover out.
// Photos are read on this machine only (FileReader / object URLs), never
// uploaded anywhere. The same drawCover engine paints the live preview and
// the exported PNGs, so what you see is what you share.
import { drawCover, LAYOUTS, GRADES, layoutGeometry } from './cover.js';
import { loadImage, runShot, SAMPLES } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('preview');
const ctx = canvas.getContext('2d');
const statusEl = $('status');

const SIZES = {
  square: { label: 'Square 1080 x 1080', w: 1080, h: 1080 },
  portrait: { label: 'Portrait 1080 x 1350', w: 1080, h: 1350 },
  wide: { label: 'Wide 1920 x 1080', w: 1920, h: 1080 },
};

function defaultPanels(layout, count) {
  const n = LAYOUTS[layout].panels;
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push({ photo: count > 0 ? i % count : 0, zoom: 1, ox: 0, oy: 0 });
  }
  return out;
}

function defaultState() {
  return {
    layout: 'nine',
    grade: 'sunset',
    title: 'Sunset Heist',
    subtitle: 'one last ride',
    badge: 'EST. 2026',
    stars: 4,
    grain: true,
    vignette: true,
    badgeOn: true,
    size: 'square',
    panels: defaultPanels('nine', 3),
  };
}

let state = defaultState();
let photos = []; // { img, name }
let selected = 0;
let geometry = null;
let undoStack = [];
let redoStack = [];
let shotMode = null;

function snapshot() {
  return JSON.stringify(state);
}

function pushHistory() {
  undoStack.push(snapshot());
  if (undoStack.length > 30) undoStack.shift();
  redoStack = [];
  syncUndoButtons();
}

function restore(json) {
  state = JSON.parse(json);
  syncControls();
  redraw();
}

function syncUndoButtons() {
  $('undo').disabled = undoStack.length === 0;
  $('redo').disabled = redoStack.length === 0;
}

function setStatus(msg) {
  statusEl.textContent = msg;
}

// --- preview ---------------------------------------------------------------

function previewSize() {
  const s = SIZES[state.size];
  const box = 620;
  const scale = Math.min(box / s.w, 460 / s.h);
  return { w: Math.round(s.w * scale), h: Math.round(s.h * scale) };
}

function redraw() {
  const { w, h } = previewSize();
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const imgs = photos.map((p) => p.img);
  geometry = drawCover(ctx, state, imgs, w, h);
  $('panelLabel').textContent = panelLabel();
}

function panelLabel() {
  const n = LAYOUTS[state.layout].panels;
  if (state.layout === 'nine' && selected === 4) return 'Title block (centre)';
  return `Panel ${selected + 1} of ${n}`;
}

// --- controls ---------------------------------------------------------------

function syncControls() {
  $('title').value = state.title;
  $('subtitle').value = state.subtitle;
  $('badgeText').value = state.badge;
  $('stars').value = String(state.stars);
  $('grain').checked = state.grain;
  $('vignette').checked = state.vignette;
  $('badgeOn').checked = state.badgeOn;
  document.querySelectorAll('#layouts button').forEach((b) => {
    b.classList.toggle('on', b.dataset.layout === state.layout);
  });
  document.querySelectorAll('#grades button').forEach((b) => {
    b.classList.toggle('on', b.dataset.grade === state.grade);
  });
  document.querySelectorAll('#sizes button').forEach((b) => {
    b.classList.toggle('on', b.dataset.size === state.size);
  });
  const p = state.panels[selected] || { zoom: 1, ox: 0, oy: 0 };
  $('zoom').value = p.zoom;
  $('offx').value = p.ox;
  $('offy').value = p.oy;
  $('zoomVal').textContent = `${Math.round(p.zoom * 100)}%`;
  syncUndoButtons();
}

function buildPicker(containerId, items, key, onPick) {
  const box = $(containerId);
  box.innerHTML = '';
  for (const [id, def] of Object.entries(items)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset[key] = id;
    b.textContent = def.name;
    b.title = def.blurb || def.name;
    b.addEventListener('click', () => {
      pushHistory();
      onPick(id);
      syncControls();
      redraw();
    });
    box.appendChild(b);
  }
}

function setLayout(id) {
  const keep = state.panels;
  state.layout = id;
  const n = LAYOUTS[id].panels;
  state.panels = [];
  for (let i = 0; i < n; i++) {
    state.panels.push(keep[i] ? { ...keep[i] } : { photo: photos.length ? i % photos.length : 0, zoom: 1, ox: 0, oy: 0 });
  }
  if (selected >= n) selected = 0;
  if (id === 'nine' && selected === 4) selected = 0;
}

function selectPanel(i) {
  if (state.layout === 'nine' && i === 4) {
    setStatus('The centre cell is the title block — pick a photo panel around it.');
    return;
  }
  selected = i;
  syncControls();
  redraw();
}

// --- photos -----------------------------------------------------------------

function addPhoto(img, name) {
  photos.push({ img, name });
  renderTray();
}

function renderTray() {
  const tray = $('tray');
  tray.innerHTML = '';
  photos.forEach((p, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'thumb';
    b.title = `${p.name} — click to put it in the selected panel`;
    const im = document.createElement('img');
    im.src = p.img.src;
    im.alt = p.name;
    b.appendChild(im);
    b.addEventListener('click', () => {
      pushHistory();
      state.panels[selected].photo = i;
      state.panels[selected].zoom = 1;
      state.panels[selected].ox = 0;
      state.panels[selected].oy = 0;
      setStatus(`Panel ${selected + 1} now shows ${p.name}.`);
      syncControls();
      redraw();
    });
    tray.appendChild(b);
  });
  $('fillAll').disabled = photos.length === 0;
}

async function loadSamples() {
  const have = new Set(photos.map((p) => p.name));
  for (const [name, url] of Object.entries(SAMPLES)) {
    if (have.has(name)) continue;
    try {
      const img = await loadImage(url);
      addPhoto(img, name);
    } catch (e) {
      setStatus(`Could not load sample ${name}.`);
    }
  }
  if (photos.length) {
    state.panels = defaultPanels(state.layout, photos.length);
    selected = 0;
    syncControls();
    redraw();
  }
}

// --- export ------------------------------------------------------------------

async function exportCover(sizeId) {
  const s = SIZES[sizeId];
  await document.fonts.ready;
  const off = document.createElement('canvas');
  off.width = s.w;
  off.height = s.h;
  const octx = off.getContext('2d');
  drawCover(octx, { ...state, size: sizeId }, photos.map((p) => p.img), s.w, s.h);
  return new Promise((resolve) => {
    off.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `cover-coast-${s.w}x${s.h}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      setStatus(`Saved cover-coast-${s.w}x${s.h}.png`);
      resolve();
    }, 'image/png');
  });
}

// --- pointer crop on the preview --------------------------------------------

function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * canvas.width,
    y: ((e.clientY - r.top) / r.height) * canvas.height,
  };
}

function hitPanel(x, y) {
  if (!geometry) return -1;
  for (let i = geometry.panels.length - 1; i >= 0; i--) {
    const p = geometry.panels[i];
    if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) return i;
  }
  return -1;
}

let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const pt = canvasPoint(e);
  const i = hitPanel(pt.x, pt.y);
  if (i < 0) return;
  if (state.layout === 'nine' && i === 4) {
    setStatus('The centre cell is the title block — pick a photo panel around it.');
    return;
  }
  selected = i;
  syncControls();
  drag = { x: pt.x, y: pt.y, ox: state.panels[i].ox, oy: state.panels[i].oy };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const pt = canvasPoint(e);
  const p = state.panels[selected];
  const rect = geometry.panels[selected];
  p.ox = drag.ox + (pt.x - drag.x) / rect.w;
  p.oy = drag.oy + (pt.y - drag.y) / rect.h;
  p.ox = Math.max(-0.6, Math.min(0.6, p.ox));
  p.oy = Math.max(-0.6, Math.min(0.6, p.oy));
  redraw();
  syncControls();
});
canvas.addEventListener('pointerup', () => {
  if (drag) {
    pushHistory();
    drag = null;
  }
});
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const pt = canvasPoint(e);
  const i = hitPanel(pt.x, pt.y);
  if (i < 0 || (state.layout === 'nine' && i === 4)) return;
  pushHistory();
  const p = state.panels[i];
  p.zoom = Math.max(1, Math.min(3, p.zoom * Math.exp(-e.deltaY * 0.0012)));
  selected = i;
  syncControls();
  redraw();
}, { passive: false });

// --- wire the controls -------------------------------------------------------

buildPicker('layouts', LAYOUTS, 'layout', (id) => setLayout(id));
buildPicker('grades', GRADES, 'grade', (id) => { state.grade = id; });
buildPicker('sizes', SIZES, 'size', (id) => { state.size = id; });

$('title').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
$('title').addEventListener('change', pushHistory);
$('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
$('subtitle').addEventListener('change', pushHistory);
$('badgeText').addEventListener('input', (e) => { state.badge = e.target.value; redraw(); });
$('badgeText').addEventListener('change', pushHistory);
$('stars').addEventListener('change', (e) => { pushHistory(); state.stars = Number(e.target.value); redraw(); });
$('grain').addEventListener('change', (e) => { pushHistory(); state.grain = e.target.checked; redraw(); });
$('vignette').addEventListener('change', (e) => { pushHistory(); state.vignette = e.target.checked; redraw(); });
$('badgeOn').addEventListener('change', (e) => { pushHistory(); state.badgeOn = e.target.checked; redraw(); });

$('zoom').addEventListener('input', (e) => {
  state.panels[selected].zoom = Number(e.target.value);
  $('zoomVal').textContent = `${Math.round(state.panels[selected].zoom * 100)}%`;
  redraw();
});
$('zoom').addEventListener('change', pushHistory);
$('offx').addEventListener('input', (e) => { state.panels[selected].ox = Number(e.target.value); redraw(); });
$('offx').addEventListener('change', pushHistory);
$('offy').addEventListener('input', (e) => { state.panels[selected].oy = Number(e.target.value); redraw(); });
$('offy').addEventListener('change', pushHistory);
$('resetCrop').addEventListener('click', () => {
  pushHistory();
  state.panels[selected] = { ...state.panels[selected], zoom: 1, ox: 0, oy: 0 };
  syncControls();
  redraw();
});

$('upload').addEventListener('change', async (e) => {
  for (const file of e.target.files) {
    if (!file.type.startsWith('image/')) continue;
    const img = await loadImage(URL.createObjectURL(file));
    addPhoto(img, file.name);
  }
  if (photos.length) {
    state.panels = defaultPanels(state.layout, photos.length);
    selected = 0;
    setStatus(`${e.target.files.length} photo(s) loaded — click a panel, then a thumbnail to place it.`);
    syncControls();
    redraw();
  }
  e.target.value = '';
});
$('samples').addEventListener('click', async () => {
  await loadSamples();
  setStatus('Sample photos loaded — click a panel, then a thumbnail to place it.');
});
$('fillAll').addEventListener('click', () => {
  if (!photos.length) return;
  pushHistory();
  const i = state.panels[selected].photo;
  state.panels.forEach((p) => { p.photo = i; p.zoom = 1; p.ox = 0; p.oy = 0; });
  setStatus('Every panel now shows the same photo.');
  redraw();
});

$('undo').addEventListener('click', () => {
  if (!undoStack.length) return;
  redoStack.push(snapshot());
  restore(undoStack.pop());
});
$('redo').addEventListener('click', () => {
  if (!redoStack.length) return;
  undoStack.push(snapshot());
  restore(redoStack.pop());
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

document.querySelectorAll('#exports button[data-export]').forEach((b) => {
  b.addEventListener('click', () => exportCover(b.dataset.export));
});
$('exportAll').addEventListener('click', async () => {
  for (const id of Object.keys(SIZES)) await exportCover(id);
  setStatus('All three sizes exported.');
});

// --- shot scenes --------------------------------------------------------------

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  shotMode = shot;
  // Cover shots fill the window with the cover alone; the editor shot keeps
  // the full editor chrome so the screenshot shows the app at work.
  if (shot !== 'editor') document.body.classList.add('shot');
  runShot(shot, new URLSearchParams(location.search), (scene) => {
    photos = scene.photos.map((img, i) => ({ img, name: Object.keys(SAMPLES)[i] }));
    state = {
      ...defaultState(),
      layout: scene.layout,
      grade: scene.grade,
      title: scene.title,
      subtitle: scene.subtitle,
      badge: scene.badge,
      stars: 4,
      panels: defaultPanels(scene.layout, photos.length),
    };
    if (shot === 'editor') {
      syncControls();
      renderTray();
      redraw();
      setStatus('Sample photos loaded — click a panel, then a thumbnail to place it.');
      return;
    }
    // Cover scenes: the canvas fills the window, no editor chrome.
    const [w, h] = scene.size;
    const scale = Math.min(window.innerWidth / w, window.innerHeight / h);
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    canvas.style.width = `${canvas.width}px`;
    canvas.style.height = `${canvas.height}px`;
    drawCover(ctx, state, photos.map((p) => p.img), canvas.width, canvas.height);
    document.title = 'shot-ready';
  });
} else {
  syncControls();
  renderTray();
  redraw();
  document.fonts.ready.then(redraw);
}
