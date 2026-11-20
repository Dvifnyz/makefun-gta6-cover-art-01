// Cover Coast state: everything the editor changes, plus the history that
// lets it undo and redo. A state is plain JSON, so it can be copied and
// restored; the photos themselves live outside it, as loaded images keyed
// by name, and a panel only names which photo it shows.
export const SIZES = {
  square: { w: 1080, h: 1080, label: 'Square 1080 x 1080' },
  story: { w: 1080, h: 1350, label: 'Story 1080 x 1350' },
  wide: { w: 1920, h: 1080, label: 'Wide 1920 x 1080' },
};

export const GRADES = {
  sunset: {
    name: 'Vice Sunset', sky: ['#3a1350', '#140821'],
    tintTop: 'rgba(255, 110, 60, 0.20)', tintBottom: 'rgba(190, 40, 120, 0.38)',
    title: '#ffffff', accent: '#ffb347', band: 'rgba(22, 7, 34, 0.90)', gutter: '#160a24',
  },
  neon: {
    name: 'Neon Night', sky: ['#0a1030', '#04041a'],
    tintTop: 'rgba(255, 45, 149, 0.20)', tintBottom: 'rgba(0, 229, 255, 0.26)',
    title: '#eafcff', accent: '#00e5ff', band: 'rgba(4, 6, 26, 0.90)', gutter: '#05081f',
  },
  golden: {
    name: 'Golden Hour', sky: ['#4a2c08', '#1c0e04'],
    tintTop: 'rgba(255, 190, 60, 0.22)', tintBottom: 'rgba(255, 120, 20, 0.32)',
    title: '#fff7e0', accent: '#ffcf5c', band: 'rgba(30, 16, 4, 0.90)', gutter: '#241204',
  },
  teal: {
    name: 'Palm Teal', sky: ['#06333a', '#02181d'],
    tintTop: 'rgba(0, 220, 190, 0.18)', tintBottom: 'rgba(0, 140, 160, 0.30)',
    title: '#eafff8', accent: '#3ef2c0', band: 'rgba(2, 24, 28, 0.90)', gutter: '#032227',
  },
  noir: {
    name: 'Noir', sky: ['#1a1a1a', '#000000'],
    tintTop: 'rgba(255, 255, 255, 0.06)', tintBottom: 'rgba(0, 0, 0, 0.45)',
    title: '#ffffff', accent: '#ff3b30', band: 'rgba(0, 0, 0, 0.90)', gutter: '#0a0a0a',
  },
};

export const LAYOUTS = {
  duo: { name: 'Duo', panels: 2 },
  trio: { name: 'Trio', panels: 3 },
  hero: { name: 'Hero', panels: 3 },
  quad: { name: 'Quad', panels: 4 },
  strip: { name: 'Strip', panels: 2 },
  focus: { name: 'Focus', panels: 3 },
};

export function freshState() {
  return {
    size: 'square',
    layout: 'hero',
    grade: 'sunset',
    title: 'VICE CITY NIGHTS',
    subtitle: 'a cover coast story',
    badge: 'COVER COAST',
    heat: 4,
    selected: 0,
    panels: [
      { photo: 'sunset', zoom: 1, dx: 0, dy: 0 },
      { photo: 'neon', zoom: 1, dx: 0, dy: 0 },
      { photo: 'palms', zoom: 1, dx: 0, dy: 0 },
      { photo: 'sunset', zoom: 1, dx: 0, dy: 0 },
    ],
  };
}

export function panelCount(state) {
  return LAYOUTS[state.layout].panels;
}

export function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

// Layout geometry: each layout maps the cover (w by h) to panel rectangles
// in pixels, leaving a gutter between panels. The title band is drawn over
// the bottom of the cover, so no layout reserves space for it: the lettering
// sits on top of the art, poster style.
export function layoutRects(layout, w, h) {
  const g = Math.max(6, Math.round(Math.min(w, h) * 0.012));
  const col = (n) => (w - (n - 1) * g) / n;
  const row = (n) => (h - (n - 1) * g) / n;
  switch (layout) {
    case 'duo':
      return [
        { x: 0, y: 0, w: col(2), h },
        { x: col(2) + g, y: 0, w: col(2), h },
      ];
    case 'trio':
      return [0, 1, 2].map((i) => ({ x: i * (col(3) + g), y: 0, w: col(3), h }));
    case 'hero':
      return [
        { x: 0, y: 0, w, h: h * 0.62 - g / 2 },
        { x: 0, y: h * 0.62 + g / 2, w: col(2), h: h * 0.38 - g / 2 },
        { x: col(2) + g, y: h * 0.62 + g / 2, w: col(2), h: h * 0.38 - g / 2 },
      ];
    case 'quad':
      return [
        { x: 0, y: 0, w: col(2), h: row(2) },
        { x: col(2) + g, y: 0, w: col(2), h: row(2) },
        { x: 0, y: row(2) + g, w: col(2), h: row(2) },
        { x: col(2) + g, y: row(2) + g, w: col(2), h: row(2) },
      ];
    case 'strip':
      return [
        { x: 0, y: 0, w, h: row(2) },
        { x: 0, y: row(2) + g, w, h: row(2) },
      ];
    case 'focus':
    default:
      return [
        { x: 0, y: 0, w: w * 0.64 - g / 2, h },
        { x: w * 0.64 + g / 2, y: 0, w: w * 0.36 - g / 2, h: row(2) },
        { x: w * 0.64 + g / 2, y: row(2) + g, w: w * 0.36 - g / 2, h: row(2) },
      ];
  }
}

// The undo stack: plain snapshots of the state. A drag pushes one snapshot
// when it starts and one when it ends, never one per move.
export function makeHistory() {
  const past = [];
  const future = [];
  return {
    push(state) {
      past.push(JSON.stringify(state));
      if (past.length > 60) past.shift();
      future.length = 0;
    },
    undo(state) {
      if (!past.length) return null;
      future.push(JSON.stringify(state));
      return JSON.parse(past.pop());
    },
    redo(state) {
      if (!future.length) return null;
      past.push(JSON.stringify(state));
      return JSON.parse(future.pop());
    },
    canUndo() { return past.length > 0; },
    canRedo() { return future.length > 0; },
  };
}
