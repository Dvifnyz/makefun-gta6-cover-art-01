// Cover Coast — the cover engine: draws a multi-panel GTA-style poster cover
// onto any 2D canvas at any size. Pure drawing, no network, no DOM writes.
// A cover state is { layout, grade, title, subtitle, badge, stars, grain,
// vignette, badgeOn, panels: [{ photo, zoom, ox, oy }] } where panels[i].photo
// is an index into the photos array passed beside the state.

export const LAYOUTS = {
  nine: { name: 'Nine panel', panels: 9, blurb: 'Classic 3 x 3 poster grid' },
  hero: { name: 'Hero + three', panels: 4, blurb: 'One big hero, three stacked' },
  full: { name: 'Full bleed', panels: 1, blurb: 'One photo, edge to edge' },
  tilt: { name: 'Tilted snaps', panels: 3, blurb: 'Overlapping tilted snapshots' },
  strip: { name: 'Film strip', panels: 3, blurb: 'Three stacked frames' },
  duo: { name: 'Duo', panels: 2, blurb: 'Two tall frames side by side' },
};

export const GRADES = {
  sunset: {
    name: 'Vice Sunset', wash: ['#ff9a3d', '#ff4d6d', '#7b2ff7'],
    washAlpha: 0.40, title: ['#ffe259', '#ff7e5f', '#ff4d9d'],
    accent: '#ffd166',
  },
  neon: {
    name: 'Neon Night', wash: ['#00f5d4', '#ff2e88', '#7b2ff7'],
    washAlpha: 0.44, title: ['#7ef9ff', '#ff5ce1', '#b967ff'],
    accent: '#00f5d4',
  },
  golden: {
    name: 'Golden Hour', wash: ['#ffd76a', '#ff9a3d', '#c96f2e'],
    washAlpha: 0.30, title: ['#fff3b0', '#ffc46b', '#ff8c42'],
    accent: '#ffe259',
  },
  teal: {
    name: 'Palm Teal', wash: ['#2ec4b6', '#118ab2', '#073b4c'],
    washAlpha: 0.34, title: ['#caf0f8', '#90e0ef', '#48cae4'],
    accent: '#90e0ef',
  },
  noir: {
    name: 'Noir', wash: ['#e5e5e5', '#8d99ae', '#2b2d42'],
    washAlpha: 0.22, title: ['#ffffff', '#e0e0e0', '#ff3b30'],
    accent: '#ff3b30',
  },
};

// Panel rectangles for a layout, in cover pixels. Every rect is { x, y, w, h }
// plus an optional rotation in radians for the tilted layout. The title zone
// is where the caption block lives: { x, y, w, h }.
export function layoutGeometry(layout, W, H) {
  const g = Math.round(Math.min(W, H) * 0.008); // panel gap
  const P = [];
  let title = null;
  if (layout === 'nine') {
    const cw = (W - g * 4) / 3;
    const ch = (H - g * 4) / 3;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        P.push({ x: g + c * (cw + g), y: g + r * (ch + g), w: cw, h: ch });
      }
    }
    title = { ...P[4], inset: true }; // centre cell is the title block
  } else if (layout === 'hero') {
    const hw = W * 0.62 - g * 1.5;
    const rw = W - hw - g * 3;
    const rh = (H - g * 4) / 3;
    P.push({ x: g, y: g, w: hw, h: H - g * 2 });
    for (let r = 0; r < 3; r++) {
      P.push({ x: hw + g * 2, y: g + r * (rh + g), w: rw, h: rh });
    }
    title = { x: g, y: H * 0.74, w: hw, h: H * 0.26 - g, band: true };
  } else if (layout === 'full') {
    P.push({ x: 0, y: 0, w: W, h: H });
    title = { x: 0, y: H * 0.70, w: W, h: H * 0.30, band: true };
  } else if (layout === 'tilt') {
    const pw = W * 0.52;
    const ph = H * 0.46;
    P.push({ x: W * 0.05, y: H * 0.30, w: pw, h: ph, rot: -0.10 });
    P.push({ x: W * 0.42, y: H * 0.24, w: pw, h: ph, rot: 0.07 });
    P.push({ x: W * 0.24, y: H * 0.52, w: pw, h: ph, rot: -0.03 });
    title = { x: 0, y: H * 0.04, w: W, h: H * 0.20, top: true };
  } else if (layout === 'strip') {
    const ph = (H * 0.78 - g * 4) / 3;
    for (let r = 0; r < 3; r++) {
      P.push({ x: g, y: g + r * (ph + g), w: W - g * 2, h: ph });
    }
    title = { x: 0, y: H * 0.80, w: W, h: H * 0.20, band: true };
  } else { // duo
    const pw = (W - g * 3) / 2;
    P.push({ x: g, y: g, w: pw, h: H * 0.74 });
    P.push({ x: g * 2 + pw, y: g, w: pw, h: H * 0.74 });
    title = { x: 0, y: H * 0.76, w: W, h: H * 0.24 - g, band: true };
  }
  return { panels: P, title, gap: g };
}

// Deterministic pseudo-random stream (LCG) so the grain looks the same in
// every export of the same cover.
function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

let grainTile = null;
function getGrainTile() {
  if (grainTile) return grainTile;
  const t = document.createElement('canvas');
  t.width = 128;
  t.height = 128;
  const c = t.getContext('2d');
  const img = c.createImageData(128, 128);
  const rnd = lcg(20261119);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rnd() * 255);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  grainTile = t;
  return t;
}

// Draws one photo into a panel rect, cover-fit, with the panel's own
// crop transform (zoom, ox, oy are fractions of the panel size).
function drawPhotoPanel(ctx, img, rect, t) {
  if (!img) return;
  const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
  const scale = base * (t.zoom || 1);
  const pw = img.naturalWidth * scale;
  const ph = img.naturalHeight * scale;
  const cx = rect.x + rect.w / 2 + (t.ox || 0) * rect.w;
  const cy = rect.y + rect.h / 2 + (t.oy || 0) * rect.h;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(img, cx - pw / 2, cy - ph / 2, pw, ph);
  ctx.restore();
}

function fitFont(ctx, text, maxWidth, startSize, family) {
  let size = startSize;
  ctx.font = `${size}px ${family}`;
  while (size > 10 && ctx.measureText(text).width > maxWidth) {
    size = Math.max(10, size - 2);
    ctx.font = `${size}px ${family}`;
  }
  return size;
}

function drawStars(ctx, cx, y, size, count) {
  const total = 5 * size * 1.4;
  ctx.save();
  ctx.translate(cx - total / 2, y + size / 2);
  for (let i = 0; i < 5; i++) {
    const x = i * size * 1.4 + size / 2;
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const r = k % 2 === 0 ? size / 2 : size / 5;
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      const px = x + Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = i < count ? '#ffd166' : 'rgba(255,255,255,0.25)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = Math.max(1, size * 0.06);
    ctx.stroke();
  }
  ctx.restore();
}

// Wraps a title into at most two lines at the largest size that fits.
function wrapTitle(ctx, text, maxW, startSize, family) {
  const words = text.split(/\s+/).filter(Boolean);
  for (let size = startSize; size > 10; size -= 2) {
    ctx.font = `${size}px ${family}`;
    const lines = [];
    let line = '';
    for (const w of words) {
      const t = line ? `${line} ${w}` : w;
      if (ctx.measureText(t).width <= maxW) line = t;
      else {
        if (line) lines.push(line);
        line = w;
      }
    }
    if (line) lines.push(line);
    if (lines.length <= 2 && lines.every((l) => ctx.measureText(l).width <= maxW)) {
      return { size, lines };
    }
  }
  ctx.font = `10px ${family}`;
  return { size: 10, lines: [text] };
}

function drawTitleBlock(ctx, state, zone, grade, W, H) {
  const text = (state.title || '').trim().toUpperCase();
  const sub = (state.subtitle || '').trim();
  if (!text && !sub) return;
  const pad = Math.min(W, H) * 0.03;
  if (zone.inset) {
    ctx.save();
    ctx.fillStyle = '#14091f';
    ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
    ctx.restore();
  }
  if (zone.band) {
    const bg = ctx.createLinearGradient(0, zone.y - zone.h * 0.4, 0, zone.y + zone.h);
    bg.addColorStop(0, 'rgba(10,4,20,0)');
    bg.addColorStop(1, 'rgba(10,4,20,0.82)');
    ctx.fillStyle = bg;
    ctx.fillRect(zone.x, zone.y - zone.h * 0.4, zone.w, zone.h * 1.4);
  }
  const cx = zone.x + zone.w / 2;
  const maxW = zone.w - pad * 2;
  // Size the whole caption block, then shrink it as one unit until it fits
  // inside its zone — a two-line title must never push the subtitle or the
  // stars off the foot of the cover.
  let wrapped = null;
  let subSize = 0;
  let starSize = 0;
  let blockH = 0;
  let scale = 1;
  for (let attempt = 0; attempt < 4; attempt++) {
    const titleSize = Math.min(zone.h * 0.42, maxW * 0.24) * scale;
    wrapped = text ? wrapTitle(ctx, text, maxW, titleSize, 'Anton, "Arial Narrow", sans-serif') : null;
    subSize = sub ? fitFont(ctx, sub, maxW, Math.min(zone.h * 0.20, 64) * scale, 'Pacifico, cursive') : 0;
    starSize = state.stars > 0 ? Math.min(zone.h * 0.11, 34) * scale : 0;
    blockH =
      (wrapped ? wrapped.lines.length * wrapped.size * 1.05 : 0) +
      (sub ? subSize * 1.5 : 0) +
      (starSize ? starSize + zone.h * 0.04 : 0);
    if (blockH <= zone.h || scale < 0.35) break;
    scale *= zone.h / blockH;
  }
  // Inset title blocks (the nine-panel centre) centre their content;
  // band titles sit on the photo's foot.
  let cursor = zone.inset ? zone.y + Math.max(pad, (zone.h - blockH) / 2) : zone.y + pad;
  if (wrapped) {
    const grad = ctx.createLinearGradient(0, cursor, 0, cursor + wrapped.lines.length * wrapped.size);
    grad.addColorStop(0, grade.title[0]);
    grad.addColorStop(0.55, grade.title[1]);
    grad.addColorStop(1, grade.title[2]);
    ctx.font = `${wrapped.size}px Anton, "Arial Narrow", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#160a24';
    ctx.lineWidth = Math.max(2, wrapped.size * 0.14);
    for (const line of wrapped.lines) {
      ctx.strokeText(line, cx, cursor);
      ctx.fillStyle = grad;
      ctx.fillText(line, cx, cursor);
      cursor += wrapped.size * 1.05;
    }
  }
  if (sub) {
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = grade.accent;
    ctx.shadowBlur = subSize * 0.35;
    ctx.fillText(sub, cx, cursor);
    ctx.shadowBlur = 0;
    cursor += subSize * 1.5;
  }
  if (starSize) {
    drawStars(ctx, cx, cursor + zone.h * 0.02, starSize, state.stars);
  }
}

function drawBadge(ctx, state, W, H) {
  if (!state.badgeOn || !(state.badge || '').trim()) return;
  const label = state.badge.trim().toUpperCase();
  const size = Math.round(Math.min(W, H) * 0.032);
  ctx.save();
  ctx.font = `${size}px Anton, "Arial Narrow", sans-serif`;
  const tw = ctx.measureText(label).width + size * 1.6;
  const th = size * 1.9;
  ctx.translate(W - tw / 2 - Math.min(W, H) * 0.02, th * 0.9);
  ctx.rotate(0.10);
  ctx.fillStyle = '#ff2e88';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(2, size * 0.10);
  ctx.beginPath();
  ctx.rect(-tw / 2, -th / 2, tw, th);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 0, size * 0.06);
  ctx.restore();
}

// Draws the whole cover. Returns the panel rects in cover pixels so the
// editor can hit-test clicks and drags against them.
export function drawCover(ctx, state, photos, W, H) {
  const grade = GRADES[state.grade] || GRADES.sunset;
  const geo = layoutGeometry(state.layout, W, H);
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  // Backdrop: deep dusk gradient behind the panels.
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#2b1055');
  bg.addColorStop(0.5, '#7597de');
  bg.addColorStop(1, '#ff7e5f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < geo.panels.length; i++) {
    const rect = geo.panels[i];
    const panel = state.panels[i] || { photo: 0, zoom: 1, ox: 0, oy: 0 };
    const img = photos[panel.photo] || null;
    ctx.save();
    if (rect.rot) {
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate(rect.rot);
      ctx.translate(-rect.w / 2, -rect.h / 2);
      drawPhotoPanel(ctx, img, { x: 0, y: 0, w: rect.w, h: rect.h }, panel);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(3, Math.min(W, H) * 0.012);
      ctx.strokeRect(0, 0, rect.w, rect.h);
      // Snapshot caption strip along the foot of the tilted frame.
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, rect.h - rect.h * 0.10, rect.w, rect.h * 0.10);
      ctx.restore();
    } else {
      drawPhotoPanel(ctx, img, rect, panel);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(2, geo.gap * 0.9);
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
      ctx.restore();
    }
  }

  // Colour grade: a diagonal wash in overlay, then a warm foot.
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  const wash = ctx.createLinearGradient(0, 0, W, H);
  wash.addColorStop(0, grade.wash[0]);
  wash.addColorStop(0.55, grade.wash[1]);
  wash.addColorStop(1, grade.wash[2]);
  ctx.globalAlpha = grade.washAlpha;
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  ctx.save();
  const foot = ctx.createLinearGradient(0, H * 0.55, 0, H);
  foot.addColorStop(0, 'rgba(20,6,32,0)');
  foot.addColorStop(1, 'rgba(20,6,32,0.38)');
  ctx.fillStyle = foot;
  ctx.fillRect(0, H * 0.55, W, H * 0.45);
  ctx.restore();

  // Caption block, badge ribbon, grain and vignette on top.
  drawTitleBlock(ctx, state, geo.title, grade, W, H);
  drawBadge(ctx, state, W, H);
  if (state.grain) {
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.fillStyle = ctx.createPattern(getGrainTile(), 'repeat');
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  if (state.vignette) {
    const v = ctx.createRadialGradient(
      W / 2, H / 2, Math.min(W, H) * 0.42,
      W / 2, H / 2, Math.max(W, H) * 0.75,
    );
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.34)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
  return { panels: geo.panels, title: geo.title };
}
