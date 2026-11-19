// Cover renderer: draws the multi-panel poster cover onto any 2D canvas.
// Photos are graded with a gradient map (luminance -> grade stops), then the
// title block, badge, heat stars, grain and vignette are painted on top so the
// lettering stays crisp. Everything is drawn, nothing is uploaded anywhere.
import { LAYOUTS, GRADES } from './state.js';

const GUTTER = 0.008; // white gutter between panels, as a fraction of the short side

function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0];
}

function gradeById(id) {
  return GRADES.find((g) => g.id === id) ?? GRADES[0];
}

/** Builds a 256-entry RGB lookup table from a grade's gradient stops. */
export function buildGradientLut(grade) {
  const lut = new Uint8Array(256 * 3);
  const stops = grade.stops;
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let a = stops[0];
    let b = stops[stops.length - 1];
    for (let s = 0; s < stops.length - 1; s++) {
      if (t >= stops[s][0] && t <= stops[s + 1][0]) { a = stops[s]; b = stops[s + 1]; break; }
    }
    const span = (b[0] - a[0]) || 1;
    const k = Math.max(0, Math.min(1, (t - a[0]) / span));
    lut[i * 3] = Math.round(a[1] + (b[1] - a[1]) * k);
    lut[i * 3 + 1] = Math.round(a[2] + (b[2] - a[2]) * k);
    lut[i * 3 + 2] = Math.round(a[3] + (b[3] - a[3]) * k);
  }
  return lut;
}

/** Maps every painted pixel of the layer through the grade's gradient map. */
export function applyGradeMap(ctx, w, h, grade) {
  const lut = buildGradientLut(grade);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 12) continue;
    const lum = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
    d[i] = lut[lum * 3];
    d[i + 1] = lut[lum * 3 + 1];
    d[i + 2] = lut[lum * 3 + 2];
  }
  ctx.putImageData(img, 0, 0);
}

/** Draws one photo into a panel rect, cover-fit, with zoom and pan offsets.
 *  The crop is anchored toward the top of the photo so faces near the top of
 *  a portrait stay in frame (the heavier the crop, the closer to the top),
 *  and tilted panels get a white frame. */
export function drawPhotoPanel(ctx, panel, img, W, H) {
  const px = panel.x * W;
  const py = panel.y * H;
  const pw = panel.w * W;
  const ph = panel.h * H;
  const cx = px + pw / 2;
  const cy = py + ph / 2;
  const rot = (panel.rot ?? 0) * Math.PI / 180;
  ctx.save();
  ctx.translate(cx, cy);
  if (rot) ctx.rotate(rot);
  ctx.translate(-cx, -cy);
  // White polaroid-style frame for tilted panels.
  if (panel.rot) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px - 5, py - 5, pw + 10, ph + 10);
  }
  ctx.beginPath();
  ctx.rect(px, py, pw, ph);
  ctx.clip();
  if (img) {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const zoom = panel.zoom ?? 1;
    const scale = Math.max(pw / iw, ph / ih) * zoom;
    const dw = iw * scale;
    const dh = ih * scale;
    // Anchor the crop toward the top of the photo so faces stay in frame;
    // the heavier the vertical crop, the closer to the top we anchor.
    const anchor = Math.max(0.08, Math.min(0.3, 0.3 - (dh / ph - 1) * 0.09));
    const dx = px + (pw - dw) / 2 + (panel.dx ?? 0) * pw;
    const dy = py + (ph - dh) * anchor + (panel.dy ?? 0) * ph;
    ctx.drawImage(img, dx, dy, dw, dh);
  } else {
    ctx.fillStyle = '#3a2158';
    ctx.fillRect(px, py, pw, ph);
  }
  ctx.restore();
}

/** Shrinks the font until the text fits maxWidth; returns the size used. */
export function fitFont(ctx, text, family, maxWidth, startSize, weight = '') {
  let size = startSize;
  const set = () => { ctx.font = `${weight} ${size}px ${family}`; };
  set();
  while (size > 10 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    set();
  }
  return size;
}

/** Halftone dot field, dots growing from left to right. */
export function drawHalftone(ctx, x, y, w, h, color) {
  const step = Math.max(10, h / 9);
  ctx.save();
  ctx.fillStyle = color;
  for (let row = 0; row * step < h; row++) {
    for (let col = 0; col * step < w; col++) {
      const cx = x + col * step + step / 2;
      const cy = y + row * step + step / 2;
      const r = (step * 0.32 * (cx - x)) / w + 0.6;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** A small pre-rendered noise tile, reused for grain. */
let noiseTile = null;
export function grainTile() {
  if (noiseTile) return noiseTile;
  noiseTile = document.createElement('canvas');
  noiseTile.width = 160;
  noiseTile.height = 160;
  const nctx = noiseTile.getContext('2d');
  const img = nctx.createImageData(160, 160);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(Math.random() * 255);
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v;
    img.data[i + 3] = 28;
  }
  nctx.putImageData(img, 0, 0);
  return noiseTile;
}

/** The circular badge ribbon (rotated, gold ring, Bebas Neue text). */
export function drawBadge(ctx, zone, text, W, H) {
  const cx = (zone.x + zone.w / 2) * W;
  const cy = (zone.y + zone.h / 2) * H;
  const r = Math.min(zone.w * W, zone.h * H) / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.14);
  ctx.fillStyle = '#ffd166';
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#160a26';
  ctx.lineWidth = Math.max(2, r * 0.08);
  ctx.beginPath(); ctx.arc(0, 0, r * 0.86, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#160a26';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const words = (text || 'VICE NIGHTS').toUpperCase().split(/\s+/);
  const size = fitFont(ctx, words.reduce((a, b) => (a.length > b.length ? a : b), ''), "'Bebas Neue', sans-serif", r * 1.25, r * 0.62);
  words.forEach((word, i) => {
    ctx.fillText(word, 0, (i - (words.length - 1) / 2) * size * 1.05);
  });
  ctx.restore();
}

/** The title block: halftone band, sunset-gradient Anton title, neon script subtitle, stars. */
export function drawTitleBlock(ctx, layout, state, W, H) {
  const z = layout.title;
  const x = z.x * W;
  const y = z.y * H;
  const w = z.w * W;
  const h = z.h * H;
  const grade = gradeById(state.grade);

  // Band: dark wash over the bottom, deeper on the left.
  const band = ctx.createLinearGradient(x, y, x + w, y);
  band.addColorStop(0, 'rgba(12, 4, 26, 0.92)');
  band.addColorStop(1, 'rgba(12, 4, 26, 0.55)');
  ctx.fillStyle = band;
  ctx.fillRect(x, y, w, h);
  drawHalftone(ctx, x, y, w, h * 0.45, 'rgba(255, 120, 180, 0.10)');
  // Sunset rule line above the title.
  const rule = ctx.createLinearGradient(x, 0, x + w, 0);
  rule.addColorStop(0, '#ff9a3c');
  rule.addColorStop(0.5, '#ff2e88');
  rule.addColorStop(1, '#2ee6ff');
  ctx.fillStyle = rule;
  ctx.fillRect(x, y, w, Math.max(3, H * 0.004));

  const title = (state.title || 'NEON COAST').trim().toUpperCase();
  const align = z.align === 'center' ? 'center' : 'left';
  // Keep the title clear of the badge ribbon at the right of the title zone.
  const titleMaxW = state.badge
    ? Math.min(w * 0.94, (layout.badge.x * W - x - w * 0.03))
    : w * 0.94;
  const tx = align === 'center' ? x + titleMaxW / 2 : x + w * 0.02;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  const titleSize = fitFont(ctx, title, "'Anton', sans-serif", titleMaxW, h * 0.46);
  const titleY = y + h * 0.52;
  const grad = ctx.createLinearGradient(tx - (align === 'center' ? titleMaxW / 2 : 0), 0, tx + (align === 'center' ? titleMaxW / 2 : titleMaxW), 0);
  grad.addColorStop(0, '#ffb347');
  grad.addColorStop(0.35, '#ff5e62');
  grad.addColorStop(0.7, '#ff2e88');
  grad.addColorStop(1, '#b537f2');
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(10, 2, 20, 0.9)';
  ctx.lineWidth = Math.max(2, titleSize * 0.09);
  ctx.strokeText(title, tx, titleY);
  ctx.fillStyle = grad;
  ctx.fillText(title, tx, titleY);

  // Neon script subtitle.
  const sub = (state.subtitle || '').trim();
  if (sub) {
    const subSize = fitFont(ctx, sub, "'Pacifico', cursive", w * 0.8, h * 0.17);
    ctx.save();
    ctx.shadowColor = grade.tint;
    ctx.shadowBlur = titleSize * 0.22;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(sub, tx, y + h * 0.78);
    ctx.restore();
  }

  // Heat meter: gold stars under the subtitle, or right of the title when centred.
  const stars = Math.max(0, Math.min(5, state.stars || 0));
  if (stars > 0) {
    const starSize = h * 0.12;
    ctx.font = `${starSize}px sans-serif`;
    ctx.fillStyle = '#ffd166';
    ctx.shadowColor = 'rgba(255, 209, 102, 0.8)';
    ctx.shadowBlur = starSize * 0.3;
    const starText = '★'.repeat(stars) + '☆'.repeat(5 - stars);
    const sx = align === 'center' ? x + titleMaxW / 2 : x + w * 0.02;
    ctx.fillText(starText, sx, y + h * 0.96);
    ctx.shadowBlur = 0;
  }

  if (state.badge) drawBadge(ctx, layout.badge, state.badge, W, H);
}

/** Renders the whole cover onto `canvas` at its own pixel size. */
export function renderCover(canvas, state, photos, opts = {}) {
  const W = canvas.width;
  const H = canvas.height;
  const ctx = canvas.getContext('2d');
  const layout = layoutById(state.layout);
  const grade = gradeById(state.grade);
  const short = Math.min(W, H);

  ctx.fillStyle = '#160a26';
  ctx.fillRect(0, 0, W, H);

  // Photo layer: panels painted, then graded as one image.
  const layer = document.createElement('canvas');
  layer.width = W;
  layer.height = H;
  const lctx = layer.getContext('2d');
  const panelState = state.panels || {};
  for (const panel of layout.panels) {
    const ps = panelState[panel.id] || { photo: 0, zoom: 1, dx: 0, dy: 0 };
    const img = photos[ps.photo] ?? photos[0] ?? null;
    drawPhotoPanel(lctx, { ...panel, zoom: ps.zoom, dx: ps.dx, dy: ps.dy }, img, W, H);
  }
  applyGradeMap(lctx, W, H, grade);
  // Warm tint wash on top of the grade.
  lctx.globalAlpha = grade.tintAlpha;
  lctx.fillStyle = grade.tint;
  lctx.fillRect(0, 0, W, H);
  lctx.globalAlpha = 1;
  ctx.drawImage(layer, 0, 0);

  // White poster gutters around every panel (tilted panels carry their own
  // white frame from drawPhotoPanel, so they are skipped here).
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(2, short * GUTTER);
  for (const panel of layout.panels) {
    if (panel.rot) continue;
    ctx.strokeRect(panel.x * W, panel.y * H, panel.w * W, panel.h * H);
  }

  drawTitleBlock(ctx, layout, state, W, H);

  // Grain + vignette last, over everything but the lettering's glow.
  if (state.grain) {
    const pattern = ctx.createPattern(grainTile(), 'repeat');
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  if (state.vignette) {
    const vg = ctx.createRadialGradient(W / 2, H / 2, short * 0.35, W / 2, H / 2, short * 0.85);
    vg.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vg.addColorStop(1, 'rgba(5, 0, 15, 0.42)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }

  // Selection outline in the live preview only.
  if (opts.showSelection && state.selectedPanel) {
    const sel = layout.panels.find((p) => p.id === state.selectedPanel);
    if (sel) {
      ctx.save();
      ctx.strokeStyle = '#2ee6ff';
      ctx.lineWidth = Math.max(3, short * 0.006);
      ctx.setLineDash([Math.max(8, short * 0.012), Math.max(6, short * 0.008)]);
      ctx.strokeRect(sel.x * W, sel.y * H, sel.w * W, sel.h * H);
      ctx.restore();
    }
  }
}

/** Builds a fresh canvas of the export size and renders the cover into it. */
export function exportCoverCanvas(state, photos, w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  renderCover(canvas, state, photos, {});
  return canvas;
}
