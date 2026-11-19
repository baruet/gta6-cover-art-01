// Vice Coast Cover Studio — cover rendering.
//
// Everything the poster looks like lives here: the eleven panel layouts,
// the gradient-map grades, the film grain, the title band with its retro
// sun, starburst badge, heat meter and halftone footer, and the two sticker
// drawings. The renderer only reads a state snapshot and an array of loaded
// photos; it never touches the page.

import { gradeById, layoutById, lookById, mulberry32 } from './state.js';

export function panelCount(layoutId) {
  return layoutById(layoutId).panels;
}

function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Build a 256-entry lookup table from a grade's gradient stops. */
export function gradeLut(stops) {
  const table = new Uint8Array(256 * 3);
  const parsed = stops.map(([t, c]) => [t, hexRgb(c)]);
  for (let i = 0; i < 256; i += 1) {
    const t = i / 255;
    let a = parsed[0];
    let b = parsed[parsed.length - 1];
    for (let k = 0; k < parsed.length - 1; k += 1) {
      if (t >= parsed[k][0] && t <= parsed[k + 1][0]) {
        a = parsed[k];
        b = parsed[k + 1];
        break;
      }
    }
    const span = b[0] - a[0] || 1;
    const f = Math.min(1, Math.max(0, (t - a[0]) / span));
    for (let ch = 0; ch < 3; ch += 1) {
      table[i * 3 + ch] = Math.round(a[1][ch] + (b[1][ch] - a[1][ch]) * f);
    }
  }
  return table;
}

function splitArea(rect, cols, rows, gap) {
  const out = [];
  const cw = (rect.w - gap * (cols - 1)) / cols;
  const ch = (rect.h - gap * (rows - 1)) / rows;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      out.push({ x: rect.x + c * (cw + gap), y: rect.y + r * (ch + gap), w: cw, h: ch, rot: 0 });
    }
  }
  return out;
}

/**
 * Geometry for a cover of W by H: the outer frame, the title zone and one
 * rectangle (plus an optional tilt angle) per panel.
 */
export function layoutGeometry(layoutId, W, H) {
  const m = Math.max(10, Math.round(W * 0.022));
  const inner = { x: m, y: m, w: W - 2 * m, h: H - 2 * m };
  const gap = Math.max(6, Math.round(W * 0.012));
  let title;
  let area;
  if (layoutId === 'magazine') {
    title = { x: inner.x, y: inner.y, w: inner.w, h: Math.round(inner.h * 0.15), kind: 'masthead' };
    area = { x: inner.x, y: title.y + title.h + gap, w: inner.w, h: inner.h - title.h - gap };
  } else if (layoutId === 'full-bleed') {
    title = { x: inner.x, y: inner.y + Math.round(inner.h * 0.74), w: inner.w, h: Math.round(inner.h * 0.26), kind: 'overlay' };
    area = { ...inner };
  } else {
    const frac = {
      'key-art': 0.2, 'hero-three': 0.16, 'grid-4': 0.15, 'grid-9': 0.14,
      'poster-wall': 0.13, 'sunset-strip': 0.15, triptych: 0.17, tilted: 0.16, duo: 0.18,
    }[layoutId] || 0.16;
    const th = Math.round(inner.h * frac);
    title = { x: inner.x, y: inner.y + inner.h - th, w: inner.w, h: th, kind: 'band' };
    area = { x: inner.x, y: inner.y, w: inner.w, h: inner.h - th - gap };
  }

  let panels = [];
  if (layoutId === 'key-art' || layoutId === 'full-bleed') {
    panels = [{ ...area, rot: 0 }];
  } else if (layoutId === 'hero-three') {
    const heroH = Math.round(area.h * 0.6);
    panels = [{ x: area.x, y: area.y, w: area.w, h: heroH, rot: 0 }];
    panels.push(...splitArea({ x: area.x, y: area.y + heroH + gap, w: area.w, h: area.h - heroH - gap }, 3, 1, gap));
  } else if (layoutId === 'grid-4') {
    panels = splitArea(area, 2, 2, gap);
  } else if (layoutId === 'grid-9') {
    panels = splitArea(area, 3, 3, gap);
  } else if (layoutId === 'poster-wall') {
    panels = splitArea(area, 4, 3, gap);
  } else if (layoutId === 'sunset-strip') {
    panels = splitArea(area, 1, 3, gap);
    panels[1].band = true;
  } else if (layoutId === 'triptych') {
    panels = splitArea(area, 3, 1, gap);
  } else if (layoutId === 'tilted') {
    const pw = area.w * 0.52;
    const ph = area.h * 0.58;
    const spots = [
      [0.02, 0.02, -6], [0.46, 0.0, 5], [0.24, 0.2, -3],
      [0.0, 0.42, 4], [0.48, 0.4, -5],
    ];
    panels = spots.map(([fx, fy, rot]) => ({
      x: area.x + fx * area.w, y: area.y + fy * area.h, w: pw, h: ph, rot,
    }));
  } else if (layoutId === 'duo') {
    const leftW = Math.round(area.w * 0.56);
    panels = [
      { x: area.x, y: area.y, w: leftW, h: area.h, rot: 0 },
      { x: area.x + leftW + gap, y: area.y, w: area.w - leftW - gap, h: Math.round(area.h * 0.78), rot: 0 },
    ];
  } else if (layoutId === 'magazine') {
    const heroH = Math.round(area.h * 0.62);
    panels = [{ x: area.x, y: area.y, w: area.w, h: heroH, rot: 0 }];
    panels.push(...splitArea({ x: area.x, y: area.y + heroH + gap, w: area.w, h: area.h - heroH - gap }, 3, 1, gap));
  }
  return { frame: m, inner, title, area, panels, gap };
}

const grainCache = new Map();

/** A tile of seeded film grain; the same seed always makes the same tile. */
function grainPattern(ctx, seed) {
  if (grainCache.has(seed)) return grainCache.get(seed);
  const size = 180;
  const tile = document.createElement('canvas');
  tile.width = size;
  tile.height = size;
  const tctx = tile.getContext('2d');
  const img = tctx.createImageData(size, size);
  const rand = mulberry32(seed);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rand() * 256);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  tctx.putImageData(img, 0, 0);
  const pattern = ctx.createPattern(tile, 'repeat');
  grainCache.set(seed, pattern);
  return pattern;
}

/** Draw one photo into a panel rect, honouring its crop (zoom and pan).
 *  Pan is a fraction of the photo's slack, so an extreme crop can still
 *  reach every edge; a very wide photo stays anchored at its centre. */
function drawPhotoInto(ctx, img, rect, crop) {
  const zoom = Math.max(1, crop.zoom || 1);
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const slackX = Math.max(0, (dw - rect.w) / 2);
  const slackY = Math.max(0, (dh - rect.h) / 2);
  const dx = rect.x + (rect.w - dw) / 2 + (crop.panX || 0) * slackX;
  const dy = rect.y + (rect.h - dh) / 2 + (crop.panY || 0) * slackY;
  ctx.drawImage(img, dx, dy, dw, dh);
}

/** Remap a panel-sized canvas through the grade's gradient map. */
function gradeCanvas(canvas, lut) {
  const ctx = canvas.getContext('2d');
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
    const k = lum * 3;
    d[i] = Math.round(lut[k] * 0.92 + d[i] * 0.08);
    d[i + 1] = Math.round(lut[k + 1] * 0.92 + d[i + 1] * 0.08);
    d[i + 2] = Math.round(lut[k + 2] * 0.92 + d[i + 2] * 0.08);
  }
  ctx.putImageData(img, 0, 0);
}

function drawPanel(ctx, img, rect, crop, lut, vignette) {
  const w = Math.max(2, Math.round(rect.w));
  const h = Math.max(2, Math.round(rect.h));
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  const octx = off.getContext('2d');
  if (img) {
    drawPhotoInto(octx, img, { x: 0, y: 0, w, h }, crop);
  } else {
    const g = octx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#3d1a5e');
    g.addColorStop(1, '#ff7a3c');
    octx.fillStyle = g;
    octx.fillRect(0, 0, w, h);
  }
  gradeCanvas(off, lut);
  ctx.drawImage(off, rect.x, rect.y, rect.w, rect.h);
  if (vignette) {
    const vg = ctx.createRadialGradient(
      rect.x + rect.w / 2, rect.y + rect.h / 2, Math.min(rect.w, rect.h) * 0.32,
      rect.x + rect.w / 2, rect.y + rect.h / 2, Math.max(rect.w, rect.h) * 0.72,
    );
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(8,2,18,0.42)');
    ctx.fillStyle = vg;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }
}

function fitFont(ctx, text, family, weight, maxWidth, startSize) {
  let size = startSize;
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > 10 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

/** A retro sun: a warm disc cut by horizontal slits that widen downwards. */
export function drawSun(ctx, cx, cy, r, slitColour) {
  const g = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
  g.addColorStop(0, '#ffd98a');
  g.addColorStop(0.55, '#ff7a3c');
  g.addColorStop(1, '#e0218a');
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = g;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.fillStyle = slitColour;
  const slits = [0.02, 0.22, 0.42, 0.62];
  slits.forEach((f, i) => {
    const y = cy + r * f;
    const half = Math.sqrt(Math.max(0, r * r - (y - cy) * (y - cy)));
    ctx.fillRect(cx - half, y, half * 2, 2 + i * 1.6);
  });
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = Math.max(2, r * 0.05);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
}

/** A spiky starburst badge with a short label inside. */
function drawStarburst(ctx, cx, cy, r, colour, label) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.14);
  ctx.beginPath();
  const spikes = 16;
  for (let i = 0; i < spikes * 2; i += 1) {
    const ang = (i * Math.PI) / spikes - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.72;
    const x = Math.cos(ang) * rad;
    const y = Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = colour;
  ctx.fill();
  ctx.lineWidth = Math.max(2, r * 0.05);
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  ctx.rotate(0.14);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const size = fitFont(ctx, label, 'Anton, sans-serif', '', r * 0.9, r * 1.15);
  ctx.fillText(label, 0, 0);
  ctx.restore();
}

function drawHeatStars(ctx, cx, cy, size, heat, accent) {
  ctx.font = `${size}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const gap = size * 1.15;
  const total = gap * 4;
  for (let i = 0; i < 5; i += 1) {
    const x = cx - total / 2 + i * gap;
    ctx.fillStyle = i < heat ? accent : 'rgba(0,0,0,0.18)';
    ctx.fillText('★', x, cy);
  }
}

/** The halftone footer: print-shop dots shrinking towards the right edge. */
function drawHalftone(ctx, x, y, w, maxR, colour) {
  const n = Math.max(8, Math.floor(w / (maxR * 2.4)));
  for (let i = 0; i < n; i += 1) {
    const f = i / (n - 1);
    const r = maxR * (1 - f * 0.82);
    ctx.beginPath();
    ctx.arc(x + (f * w), y, Math.max(0.6, r), 0, Math.PI * 2);
    ctx.fillStyle = colour;
    ctx.globalAlpha = 0.85 - f * 0.35;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawTitleZone(ctx, zone, W, state, look) {
  const { title, subtitle, tagline, credit, heat } = state;
  const bandBg = zone.kind === 'overlay' ? null : look.frame;
  if (bandBg) {
    ctx.fillStyle = bandBg;
    ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
  } else {
    const shade = ctx.createLinearGradient(0, zone.y, 0, zone.y + zone.h);
    shade.addColorStop(0, 'rgba(8,2,18,0)');
    shade.addColorStop(1, 'rgba(8,2,18,0.82)');
    ctx.fillStyle = shade;
    ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
  }
  const onDark = zone.kind === 'overlay' || look.frame === '#0d0221' || look.frame === '#0b1530';
  const ink = onDark ? '#ffffff' : look.titleInk;
  const subColour = look.sub;
  const pad = Math.max(10, zone.w * 0.02);
  const sunR = zone.h * 0.34;
  const sunX = zone.x + pad + sunR;
  const sunY = zone.y + zone.h * 0.42;
  drawSun(ctx, sunX, sunY, sunR, bandBg || '#160a26');
  const burstR = zone.h * 0.36;
  const burstX = zone.x + zone.w - pad - burstR;
  const burstY = zone.y + zone.h * 0.42;
  drawStarburst(ctx, burstX, burstY, burstR, look.badge, 'VICE COAST');

  const textX = sunX + sunR + pad;
  const textW = (burstX - burstR) - textX - pad;
  const cx = textX + textW / 2;

  // Big gradient title, with a long shadow for the Sunset Boulevard look
  // and a neon glow for the Neon Vice look.
  const titleSize = fitFont(ctx, title.toUpperCase(), 'Anton, sans-serif', '', textW, zone.h * 0.52);
  const grad = ctx.createLinearGradient(textX, zone.y, textX + textW, zone.y + zone.h * 0.5);
  grad.addColorStop(0, look.title[0]);
  grad.addColorStop(1, look.title[1]);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const titleY = zone.y + zone.h * 0.52;
  if (look.longShadow) {
    ctx.fillStyle = 'rgba(61,19,10,0.35)';
    for (let s = 1; s <= 6; s += 1) ctx.fillText(title.toUpperCase(), cx + s * 2, titleY + s * 2);
  }
  if (look.neon) {
    ctx.shadowColor = look.accent;
    ctx.shadowBlur = titleSize * 0.35;
  }
  ctx.fillStyle = grad;
  ctx.fillText(title.toUpperCase(), cx, titleY);
  ctx.shadowBlur = 0;

  // Neon script subtitle, kept clear of the strip below it.
  const subSize = fitFont(ctx, subtitle, 'Pacifico, cursive', '', textW * 0.8, zone.h * 0.2);
  ctx.fillStyle = subColour;
  if (look.neon) {
    ctx.shadowColor = subColour;
    ctx.shadowBlur = subSize * 0.5;
  }
  ctx.fillText(subtitle, cx, zone.y + zone.h * 0.7);
  ctx.shadowBlur = 0;

  // Tagline chip + heat meter + credit, on the band's lower strip. The
  // tagline font shrinks until the words fit inside the chip.
  const stripY = zone.y + zone.h - Math.max(14, zone.h * 0.14);
  let tagSize = Math.max(9, Math.round(zone.h * 0.1));
  ctx.font = `${tagSize}px "Bebas Neue", sans-serif`;
  while (tagSize > 8 && ctx.measureText(tagline).width > textW * 0.54) {
    tagSize -= 1;
    ctx.font = `${tagSize}px "Bebas Neue", sans-serif`;
  }
  const chipW = Math.min(ctx.measureText(tagline).width + pad, textW * 0.58);
  ctx.fillStyle = onDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)';
  const chipX = textX;
  const chipH = zone.h * 0.13;
  ctx.beginPath();
  ctx.roundRect(chipX, stripY - chipH / 2, chipW, chipH, chipH / 2);
  ctx.fill();
  ctx.fillStyle = ink;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(tagline, chipX + pad * 0.6, stripY, chipW - pad);
  drawHeatStars(ctx, chipX + chipW + pad * 2.2, stripY, chipH * 1.15, heat, look.accent);
  ctx.textAlign = 'right';
  ctx.font = `${Math.max(8, Math.round(zone.h * 0.085))}px "Bebas Neue", sans-serif`;
  ctx.fillStyle = onDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.55)';
  ctx.fillText(credit, zone.x + zone.w - pad, stripY);

  // Halftone dot footer along the very bottom of the band.
  drawHalftone(ctx, zone.x + pad, zone.y + zone.h - Math.max(3, zone.h * 0.045), zone.w - pad * 2, Math.max(2.5, zone.h * 0.055), look.accent);
}

/** Draw the whole cover onto ctx at W by H. */
export function drawCover(ctx, W, H, state, photos) {
  const look = lookById(state.look);
  const grade = gradeById(state.grade);
  const lut = gradeLut(grade.stops);
  const geo = layoutGeometry(state.layout, W, H);

  ctx.fillStyle = look.frame;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#160a26';
  ctx.fillRect(geo.inner.x, geo.inner.y, geo.inner.w, geo.inner.h);

  geo.panels.forEach((rect, i) => {
    const img = photos[state.panelPhotos[i] % Math.max(1, photos.length)] || null;
    const crop = state.crops[i] || { zoom: 1, panX: 0, panY: 0 };
    ctx.save();
    if (rect.rot) {
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate((rect.rot * Math.PI) / 180);
      ctx.translate(-rect.w / 2, -rect.h / 2);
      ctx.beginPath();
      ctx.rect(0, 0, rect.w, rect.h);
      ctx.clip();
      drawPanel(ctx, img, { x: 0, y: 0, w: rect.w, h: rect.h }, crop, lut, true);
      ctx.restore();
      ctx.save();
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate((rect.rot * Math.PI) / 180);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(3, W * 0.006);
      ctx.strokeRect(-rect.w / 2, -rect.h / 2, rect.w, rect.h);
      ctx.strokeStyle = 'rgba(10,4,20,0.85)';
      ctx.lineWidth = Math.max(2, W * 0.003);
      ctx.strokeRect(-rect.w / 2 - 4, -rect.h / 2 - 4, rect.w + 8, rect.h + 8);
      ctx.restore();
      return;
    }
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    if (rect.band) {
      const g = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y);
      g.addColorStop(0, '#ff7a3c');
      g.addColorStop(0.5, '#e0218a');
      g.addColorStop(1, '#22d3ee');
      ctx.fillStyle = g;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      drawSun(ctx, rect.x + rect.w * 0.82, rect.y + rect.h * 0.5, rect.h * 0.36, '#ff7a3c');
    } else {
      drawPanel(ctx, img, rect, crop, lut, true);
    }
    ctx.restore();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(3, W * 0.006);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.strokeStyle = 'rgba(10,4,20,0.85)';
    ctx.lineWidth = Math.max(2, W * 0.003);
    ctx.strokeRect(rect.x - 4, rect.y - 4, rect.w + 8, rect.h + 8);
  });

  // Duo Split leaves a step below the shorter right panel: fill that step
  // with a sunset gradient and a small sun, so it reads as design, not a hole.
  if (state.layout === 'duo') {
    const right = geo.panels[1];
    const fill = {
      x: right.x, y: right.y + right.h + geo.gap,
      w: right.w, h: (geo.area.y + geo.area.h) - (right.y + right.h + geo.gap),
    };
    if (fill.h > 8) {
      const g = ctx.createLinearGradient(fill.x, fill.y, fill.x + fill.w, fill.y + fill.h);
      g.addColorStop(0, look.title[0]);
      g.addColorStop(1, look.title[1]);
      ctx.fillStyle = g;
      ctx.fillRect(fill.x, fill.y, fill.w, fill.h);
      drawSun(ctx, fill.x + fill.w / 2, fill.y + fill.h / 2, Math.min(fill.w, fill.h) * 0.3, look.title[0]);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(3, W * 0.006);
      ctx.strokeRect(fill.x, fill.y, fill.w, fill.h);
    }
  }

  drawTitleZone(ctx, geo.title, W, state, look);

  // Seeded film grain over the whole poster, then a darkened edge.
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = grainPattern(ctx, state.seed);
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(8,2,18,0.34)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = look.frame;
  ctx.lineWidth = geo.frame;
  ctx.strokeRect(geo.frame / 2, geo.frame / 2, W - geo.frame, H - geo.frame);
}

/** Render a cover to a fresh canvas at exactly w by h. */
export function renderCover(w, h, state, photos) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  drawCover(canvas.getContext('2d'), w, h, state, photos);
  return canvas;
}

/** Render one of the two transparent stickers at a square size. */
export function renderSticker(kind, size, state) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const look = lookById(state.look);
  if (kind === 'sun') {
    const cx = size / 2;
    const cy = size * 0.42;
    const r = size * 0.3;
    drawSun(ctx, cx, cy, r, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = '#000000';
    [0.05, 0.25, 0.45, 0.65].forEach((f, i) => {
      const y = cy + r * f;
      const half = Math.sqrt(Math.max(0, r * r - (y - cy) * (y - cy)));
      ctx.fillRect(cx - half, y, half * 2, 3 + i * 2);
    });
    ctx.restore();
    ctx.fillStyle = look.accent;
    ctx.textAlign = 'center';
    const label = state.title.toUpperCase();
    fitFont(ctx, label, 'Anton, sans-serif', '', size * 0.86, size * 0.11);
    ctx.fillText(label, cx, size * 0.86);
    ctx.font = `${Math.round(size * 0.05)}px Pacifico, cursive`;
    ctx.fillStyle = look.sub;
    ctx.fillText(state.subtitle, cx, size * 0.93);
  } else {
    const grad = ctx.createLinearGradient(size * 0.07, 0, size * 0.93, 0);
    grad.addColorStop(0, look.title[0]);
    grad.addColorStop(1, look.title[1]);
    ctx.textAlign = 'center';
    const label = state.title.toUpperCase();
    fitFont(ctx, label, 'Anton, sans-serif', '', size * 0.86, size * 0.16);
    ctx.fillStyle = grad;
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = size * 0.01;
    ctx.shadowOffsetY = size * 0.008;
    ctx.fillText(label, size / 2, size * 0.52);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.font = `${Math.round(size * 0.07)}px Pacifico, cursive`;
    ctx.fillStyle = look.sub;
    ctx.fillText(state.subtitle, size / 2, size * 0.64);
    drawHalftone(ctx, size * 0.1, size * 0.72, size * 0.8, size * 0.012, look.accent);
  }
  return canvas;
}
