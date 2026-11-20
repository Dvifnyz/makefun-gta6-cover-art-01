// Draws the cover: the photo panels in their layout, the colour grade over
// them, and the poster lettering — badge, stars, script subtitle and the big
// title. It draws onto whatever canvas it is given, at that canvas's own
// size, so the editor preview and the exported PNG are the same drawing.
import { GRADES, SIZES, layoutRects, panelCount } from './state.js';

// Draws `photo` (an image, or null) into `rect`, filling it edge to edge,
// with the panel's zoom and pan applied around the photo's centre.
function drawPhoto(ctx, photo, rect, panel) {
  if (!photo) {
    ctx.fillStyle = '#241a33';
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 2;
    for (let x = -rect.h; x < rect.w; x += 26) {
      ctx.beginPath();
      ctx.moveTo(rect.x + x, rect.y + rect.h);
      ctx.lineTo(rect.x + x + rect.h, rect.y);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.font = `700 ${Math.max(14, rect.w * 0.045)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('ADD A PHOTO', rect.x + rect.w / 2, rect.y + rect.h / 2);
    return;
  }
  const scale = Math.max(rect.w / photo.naturalWidth, rect.h / photo.naturalHeight) * panel.zoom;
  const pw = photo.naturalWidth * scale;
  const ph = photo.naturalHeight * scale;
  const cx = rect.x + rect.w / 2 + panel.dx;
  const cy = rect.y + rect.h / 2 + panel.dy;
  ctx.drawImage(photo, cx - pw / 2, cy - ph / 2, pw, ph);
}

// One five-pointed star, centred at (cx, cy) with outer radius r.
function starPath(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

// Fits the title to the cover: start large, shrink until it fits the width.
function fitTitle(ctx, text, w, startSize) {
  let size = startSize;
  ctx.font = `${size}px Anton, sans-serif`;
  while (ctx.measureText(text).width > w * 0.92 && size > 24) {
    size -= 2;
    ctx.font = `${size}px Anton, sans-serif`;
  }
  return size;
}

/** Draws the whole cover for `state` onto `canvas`, using `images` (a Map
 *  from photo name to a loaded image) for the panels. Deterministic: the
 *  same state and images always draw the same pixels. */
export function drawCover(canvas, state, images) {
  const size = SIZES[state.size];
  const grade = GRADES[state.grade];
  canvas.width = size.w;
  canvas.height = size.h;
  const ctx = canvas.getContext('2d');
  const w = size.w;
  const h = size.h;

  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, grade.sky[0]);
  sky.addColorStop(1, grade.sky[1]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const rects = layoutRects(state.layout, w, h);
  const count = panelCount(state);
  for (let i = 0; i < count; i++) {
    const rect = rects[i];
    const panel = state.panels[i];
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    drawPhoto(ctx, images.get(panel.photo) ?? null, rect, panel);
    const tint = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
    tint.addColorStop(0, grade.tintTop);
    tint.addColorStop(1, grade.tintBottom);
    ctx.fillStyle = tint;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.lineWidth = Math.max(2, w * 0.002);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  }

  // Vignette: the edges fall off a little so the middle of the art pops.
  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, 'rgba(0, 0, 0, 0.28)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  // Badge ribbon, top left: the app's own mark, never anyone else's logo.
  const badgePad = w * 0.028;
  const badgeH = h * 0.052;
  ctx.font = `${Math.round(badgeH * 0.52)}px Anton, sans-serif`;
  const badgeW = ctx.measureText(state.badge.toUpperCase()).width + badgePad * 2;
  ctx.fillStyle = grade.accent;
  ctx.beginPath();
  ctx.roundRect(w * 0.035, h * 0.035, badgeW, badgeH, badgeH / 2);
  ctx.fill();
  ctx.fillStyle = '#160a24';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(state.badge.toUpperCase(), w * 0.035 + badgePad, h * 0.035 + badgeH / 2 + 1);

  // Heat meter, top right: five stars, filled up to the heat value.
  const starR = h * 0.026;
  const starGap = starR * 2.5;
  const starsW = starR * 2 * 5 + starGap * 4;
  const starsX = w - w * 0.035 - starsW;
  const starsY = h * 0.035 + badgeH / 2;
  for (let i = 0; i < 5; i++) {
    const cx = starsX + starR + i * (starR * 2 + starGap);
    starPath(ctx, cx, starsY, starR);
    if (i < state.heat) {
      ctx.fillStyle = grade.accent;
      ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = Math.max(2, starR * 0.12);
      ctx.stroke();
    }
  }

  // Title band: a dark wash rising from the bottom, then the script subtitle
  // and the big title in Anton, left aligned like a poster caption.
  const bandH = h * 0.27;
  const band = ctx.createLinearGradient(0, h - bandH, 0, h);
  band.addColorStop(0, 'rgba(0, 0, 0, 0)');
  band.addColorStop(0.45, grade.band);
  band.addColorStop(1, grade.band);
  ctx.fillStyle = band;
  ctx.fillRect(0, h - bandH, w, bandH);

  const margin = w * 0.045;
  const titleText = state.title.trim().toUpperCase();
  const subText = state.subtitle.trim();
  let titleSize = fitTitle(ctx, titleText || 'UNTITLED', w, h * 0.105);
  const titleY = h - h * 0.055;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  if (subText) {
    const subSize = Math.round(h * 0.042);
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.fillStyle = grade.accent;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = subSize * 0.25;
    ctx.fillText(subText, margin, titleY - titleSize * 0.95);
    ctx.shadowBlur = 0;
  }
  ctx.font = `${titleSize}px Anton, sans-serif`;
  ctx.fillStyle = grade.title;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = titleSize * 0.14;
  ctx.shadowOffsetY = titleSize * 0.04;
  ctx.fillText(titleText || 'UNTITLED', margin, titleY);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  // Accent rule under the title.
  ctx.fillStyle = grade.accent;
  ctx.fillRect(margin, titleY + h * 0.016, w * 0.16, Math.max(4, h * 0.006));
}
