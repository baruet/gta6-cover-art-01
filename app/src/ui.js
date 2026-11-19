// Vice Coast Cover Studio — user-interface wiring.
//
// Builds the sidebar controls from the state tables, loads the user's
// photos (and the two bundled samples), keeps the live preview drawing,
// and handles every export. The fixed screenshot scenes (?shot=cover and
// ?shot=editor) live here too: they pick a recipe and a size from the
// query, load the samples, paint once the fonts are ready, and then raise
// window.__shotReady for the screenshot tool.

import {
  LAYOUTS, GRADES, LOOKS, RECIPES, SIZES, STICKERS, GRADE_LOOK_RING,
  createState, fitPanels, applyRecipe, randomizeGrade, shufflePhotos,
  snapshot, createHistory, historyPush, historyUndo, historyRedo,
  layoutById, gradeById, lookById, recipeById, sizeById,
} from './state.js';
import { drawCover, layoutGeometry, renderCover, renderSticker, panelCount } from './cover.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const ctx = canvas.getContext('2d');
const state = createState();
const history = createHistory();
const photos = [];
let beforeEdit = null;

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

function beginEdit() {
  beforeEdit = snapshot(state);
}

function endEdit() {
  if (!beforeEdit) return;
  history.past.push(beforeEdit);
  if (history.past.length > 80) history.past.shift();
  history.future.length = 0;
  beforeEdit = null;
  syncControls();
}

function commit(mutate) {
  historyPush(history, state);
  mutate();
  fitPanels(state);
  redraw();
  syncControls();
}

function previewSize() {
  const size = sizeById(state.size);
  const max = 880;
  const scale = Math.min(1, max / Math.max(size.w, size.h));
  return { w: Math.round(size.w * scale), h: Math.round(size.h * scale) };
}

function redraw() {
  const { w, h } = previewSize();
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  drawCover(ctx, w, h, state, photos);
  $('status').textContent = `${layoutById(state.layout).name} · ${gradeById(state.grade).name} grade · ${lookById(state.look).name} look · ${photos.length} photo${photos.length === 1 ? '' : 's'}`;
}

function chipGroup(el, items, activeId, onPick, labelOf) {
  el.innerHTML = '';
  items.forEach((item) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (item.id === activeId ? ' active' : '');
    b.textContent = labelOf(item);
    b.setAttribute('aria-pressed', item.id === activeId ? 'true' : 'false');
    b.addEventListener('click', () => onPick(item.id));
    el.appendChild(b);
  });
}

function syncControls() {
  chipGroup($('recipes'), RECIPES, state.recipe, (id) => commit(() => applyRecipe(state, id)), (r) => r.name);
  chipGroup($('layouts'), LAYOUTS, state.layout, (id) => commit(() => { state.layout = id; state.recipe = ''; }), (l) => l.name);
  chipGroup($('grades'), GRADES, state.grade, (id) => commit(() => { state.grade = id; state.recipe = ''; }), (g) => g.name);
  chipGroup($('looks'), LOOKS, state.look, (id) => commit(() => { state.look = id; state.recipe = ''; }), (l) => l.name);
  document.querySelectorAll('input[name="size"]').forEach((radio) => {
    radio.checked = radio.value === state.size;
  });
  $('title').value = state.title;
  $('subtitle').value = state.subtitle;
  $('tagline').value = state.tagline;
  $('credit').value = state.credit;
  $('heat').value = String(state.heat);
  $('layout-blurb').textContent = layoutById(state.layout).blurb;
  $('undo').disabled = history.past.length === 0;
  $('redo').disabled = history.future.length === 0;
  buildPanelPicker();
  syncCropControls();
}

function buildPanelPicker() {
  const n = panelCount(state.layout);
  const box = $('panels');
  box.innerHTML = '';
  for (let i = 0; i < n; i += 1) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (i === state.selectedPanel ? ' active' : '');
    b.textContent = `Panel ${i + 1}`;
    b.addEventListener('click', () => {
      state.selectedPanel = i;
      syncControls();
      redraw();
    });
    box.appendChild(b);
  }
  const sel = $('panel-photo');
  sel.innerHTML = '';
  photos.forEach((img, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = img.dataset.name || `Photo ${i + 1}`;
    sel.appendChild(opt);
  });
  sel.value = String(state.panelPhotos[state.selectedPanel] || 0);
}

function syncCropControls() {
  const crop = state.crops[state.selectedPanel] || { zoom: 1, panX: 0, panY: 0 };
  $('zoom').value = String(crop.zoom);
  $('panx').value = String(crop.panX);
  $('pany').value = String(crop.panY);
  $('zoom-val').textContent = `${Math.round(crop.zoom * 100)}%`;
  $('panx-val').textContent = crop.panX.toFixed(2);
  $('pany-val').textContent = crop.panY.toFixed(2);
}

function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

function canvasBlob(c) {
  return new Promise((resolve) => c.toBlob(resolve, 'image/png'));
}

async function exportSize(sizeId) {
  const size = sizeById(sizeId);
  const blob = await canvasBlob(renderCover(size.w, size.h, state, photos));
  download(blob, `vice-coast-${size.id}-${size.w}x${size.h}.png`);
  $('status').textContent = `Saved vice-coast-${size.id}-${size.w}x${size.h}.png`;
  return blob;
}

async function exportSticker(kind) {
  const blob = await canvasBlob(renderSticker(kind, 1080, state));
  download(blob, `vice-coast-sticker-${kind}-1080x1080.png`);
  $('status').textContent = `Saved vice-coast-sticker-${kind}-1080x1080.png`;
  return blob;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function batchExport() {
  $('status').textContent = 'Batch export: building 6 files…';
  for (const size of SIZES) {
    await exportSize(size.id);
    await sleep(250);
  }
  for (const sticker of STICKERS) {
    await exportSticker(sticker.id);
    await sleep(250);
  }
  $('status').textContent = 'Batch export done: 4 covers + 2 stickers.';
}

function bindControls() {
  document.querySelectorAll('input[name="size"]').forEach((radio) => {
    radio.addEventListener('change', () => commit(() => { state.size = radio.value; }));
  });
  const textBind = (id, key) => {
    const el = $(id);
    el.addEventListener('focus', beginEdit);
    el.addEventListener('input', () => {
      state[key] = el.value;
      state.recipe = key === 'title' || key === 'subtitle' || key === 'tagline' ? '' : state.recipe;
      redraw();
    });
    el.addEventListener('change', endEdit);
  };
  textBind('title', 'title');
  textBind('subtitle', 'subtitle');
  textBind('tagline', 'tagline');
  textBind('credit', 'credit');
  $('heat').addEventListener('focus', beginEdit);
  $('heat').addEventListener('input', () => {
    state.heat = Number($('heat').value);
    redraw();
  });
  $('heat').addEventListener('change', endEdit);

  $('photos').addEventListener('change', async (e) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      const img = await loadImage(URL.createObjectURL(file));
      img.dataset.name = file.name;
      photos.push(img);
    }
    if (files.length) {
      commit(() => {
        state.panelPhotos = state.panelPhotos.map((_, i) => (photos.length - files.length + (i % files.length)) % photos.length);
      });
    }
    e.target.value = '';
  });
  $('use-samples').addEventListener('click', async () => {
    await loadSamples(['boulevard', 'pier']);
    commit(() => {
      state.panelPhotos = state.panelPhotos.map((_, i) => i % photos.length);
    });
  });
  $('randomize').addEventListener('click', () => commit(() => randomizeGrade(state)));
  $('shuffle').addEventListener('click', () => commit(() => shufflePhotos(state, photos.length)));
  $('undo').addEventListener('click', () => {
    if (historyUndo(history, state)) {
      fitPanels(state);
      redraw();
      syncControls();
    }
  });
  $('redo').addEventListener('click', () => {
    if (historyRedo(history, state)) {
      fitPanels(state);
      redraw();
      syncControls();
    }
  });
  document.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (!mod || e.target.matches('input, textarea, select')) return;
    if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
      e.preventDefault();
      $('undo').click();
    } else if ((e.key.toLowerCase() === 'y') || (e.key.toLowerCase() === 'z' && e.shiftKey)) {
      e.preventDefault();
      $('redo').click();
    }
  });

  const cropBind = (id, key) => {
    const el = $(id);
    el.addEventListener('pointerdown', beginEdit);
    el.addEventListener('focus', beginEdit);
    el.addEventListener('input', () => {
      state.crops[state.selectedPanel][key] = Number(el.value);
      redraw();
      syncCropControls();
    });
    el.addEventListener('change', endEdit);
  };
  cropBind('zoom', 'zoom');
  cropBind('panx', 'panX');
  cropBind('pany', 'panY');

  $('panel-photo').addEventListener('focus', beginEdit);
  $('panel-photo').addEventListener('change', () => {
    state.panelPhotos[state.selectedPanel] = Number($('panel-photo').value);
    endEdit();
    redraw();
  });

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const geo = layoutGeometry(state.layout, canvas.width, canvas.height);
    const hit = geo.panels.findIndex((p) => x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h);
    if (hit >= 0) {
      state.selectedPanel = hit;
      syncControls();
      redraw();
    }
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    beginEdit();
    const crop = state.crops[state.selectedPanel];
    crop.zoom = Math.min(3, Math.max(1, crop.zoom + (e.deltaY < 0 ? 0.1 : -0.1)));
    endEdit();
    redraw();
  }, { passive: false });
  let dragging = null;
  canvas.addEventListener('pointerdown', (e) => {
    dragging = { x: e.clientX, y: e.clientY };
    beginEdit();
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const rect = canvas.getBoundingClientRect();
    const crop = state.crops[state.selectedPanel];
    crop.panX = Math.min(1, Math.max(-1, crop.panX + ((e.clientX - dragging.x) / rect.width) * 2));
    crop.panY = Math.min(1, Math.max(-1, crop.panY + ((e.clientY - dragging.y) / rect.height) * 2));
    dragging = { x: e.clientX, y: e.clientY };
    redraw();
    syncCropControls();
  });
  canvas.addEventListener('pointerup', () => {
    dragging = null;
    endEdit();
  });

  $('export').addEventListener('click', () => exportSize(state.size));
  $('batch').addEventListener('click', batchExport);
  $('export-sun').addEventListener('click', () => exportSticker('sun'));
  $('export-strip').addEventListener('click', () => exportSticker('strip'));
}

async function loadSamples(names) {
  for (const name of names) {
    if (photos.some((p) => p.dataset.name === `${name}.jpg`)) continue;
    const img = await loadImage(`samples/${name}.jpg`);
    img.dataset.name = `${name}.jpg`;
    photos.push(img);
  }
}

async function warmFonts() {
  try {
    await Promise.all([
      document.fonts.load('40px Anton'),
      document.fonts.load('40px Pacifico'),
      document.fonts.load('40px "Bebas Neue"'),
    ]);
    await document.fonts.ready;
  } catch {
    // Fall back to system fonts; the cover still draws.
  }
}

/** Fixed screenshot scenes driven by the query string. */
async function runShot(query) {
  const shot = query.get('shot') || 'editor';
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const recipe = query.get('recipe');
  if (recipe && recipeById(recipe)) applyRecipe(state, recipe);
  if (query.get('layout')) state.layout = query.get('layout');
  if (query.get('grade')) state.grade = query.get('grade');
  if (query.get('look')) state.look = query.get('look');
  if (query.get('title')) state.title = query.get('title');
  if (query.get('subtitle')) state.subtitle = query.get('subtitle');
  if (query.get('tagline')) state.tagline = query.get('tagline');
  if (query.get('size')) state.size = query.get('size');
  fitPanels(state);
  const names = (query.get('photo') || 'pier,boulevard').split(',').map((s) => s.trim()).filter(Boolean);
  await loadSamples(names);
  state.panelPhotos = state.panelPhotos.map((_, i) => i % photos.length);
  await warmFonts();
  redraw();
  syncControls();
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  window.__shotReady = true;
}

window.__viceCoast = {
  state,
  photos,
  exportSize,
  exportSticker,
  batchExport,
  redraw,
  applyRecipe,
  GRADE_LOOK_RING,
};

const query = new URLSearchParams(location.search);
bindControls();
if (query.get('shot')) {
  await loadSamples(['boulevard', 'pier']);
  await runShot(query);
} else {
  await loadSamples(['boulevard', 'pier']);
  state.panelPhotos = state.panelPhotos.map((_, i) => i % photos.length);
  await warmFonts();
  redraw();
  syncControls();
}
