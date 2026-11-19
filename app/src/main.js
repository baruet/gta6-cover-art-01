// Wires the page: photos, layout and grade pickers, per-panel crop and position,
// caption editing, undo/redo, one-step PNG export. A `?shot=` query sets up a
// fixed scene for a screenshot instead (./shots.js).
import { SIZES, LAYOUTS, GRADES, defaultState, defaultPanels, createHistory } from './state.js';
import { renderCover, exportCoverCanvas } from './cover.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const history = createHistory(defaultState());
let state = history.current;
let photos = []; // [{ name, img }]
let activePhoto = 0;
let dragging = null;

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function loadSamplePhotos() {
  const samples = [
    ['boulevard', 'samples/boulevard.jpg'],
    ['pier', 'samples/pier.jpg'],
  ];
  for (const [name, url] of samples) {
    if (photos.some((p) => p.name === name)) continue;
    try {
      const img = await loadImage(url);
      photos.push({ name, img });
    } catch { /* a missing sample just skips */ }
  }
  renderPhotoStrip();
}

function renderPhotoStrip() {
  const strip = $('photoStrip');
  strip.innerHTML = '';
  photos.forEach((p, i) => {
    const thumb = document.createElement('img');
    thumb.className = 'thumb' + (i === activePhoto ? ' active' : '');
    thumb.src = p.img.src;
    thumb.alt = p.name;
    thumb.title = p.name + ' — click, then click a panel to place it';
    thumb.addEventListener('click', () => { activePhoto = i; renderPhotoStrip(); });
    strip.appendChild(thumb);
  });
}

/** Tiny SVG diagram of a layout's panels, for the picker buttons. */
function layoutDiagram(layout) {
  const rects = layout.panels.map((p) =>
    `<rect x="${p.x * 100}" y="${p.y * 100}" width="${p.w * 100}" height="${p.h * 100}" rx="2" fill="#ff2e88" opacity="0.85"/>`).join('');
  const title = `<rect x="${layout.title.x * 100}" y="${layout.title.y * 100}" width="${layout.title.w * 100}" height="${layout.title.h * 100}" rx="2" fill="#ffd166" opacity="0.9"/>`;
  return `<svg class="diagram" viewBox="0 0 100 100" aria-hidden="true">${rects}${title}</svg>`;
}

function buildPickers() {
  const lg = $('layoutGrid');
  LAYOUTS.forEach((layout) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'layout-btn' + (layout.id === state.layout ? ' active' : '');
    btn.setAttribute('role', 'radio');
    btn.setAttribute('aria-checked', String(layout.id === state.layout));
    btn.innerHTML = layoutDiagram(layout) + layout.name;
    btn.addEventListener('click', () => {
      state = { ...state, layout: layout.id, panels: defaultPanels(layout.id), selectedPanel: layout.panels[0].id };
      history.commit(state);
      syncAll();
    });
    lg.appendChild(btn);
  });

  const gg = $('gradeGrid');
  GRADES.forEach((grade) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'grade-btn' + (grade.id === state.grade ? ' active' : '');
    btn.setAttribute('role', 'radio');
    btn.setAttribute('aria-checked', String(grade.id === state.grade));
    const stops = grade.stops.map((s) => `rgb(${s[1]},${s[2]},${s[3]}) ${Math.round(s[0] * 100)}%`).join(', ');
    btn.innerHTML = `<span class="swatch" style="background:linear-gradient(90deg, ${stops})"></span>${grade.name}`;
    btn.addEventListener('click', () => {
      state = { ...state, grade: grade.id };
      history.commit(state);
      syncAll();
    });
    gg.appendChild(btn);
  });

  const sg = $('sizeGrid');
  SIZES.forEach((size) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'size-btn' + (size.id === state.size ? ' active' : '');
    btn.setAttribute('role', 'radio');
    btn.setAttribute('aria-checked', String(size.id === state.size));
    btn.innerHTML = `<b>${size.dims}</b>${size.label}`;
    btn.addEventListener('click', () => {
      state = { ...state, size: size.id };
      history.commit(state);
      syncAll();
    });
    sg.appendChild(btn);
  });

  const stars = $('stars');
  for (let n = 1; n <= 5; n++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = '★';
    btn.setAttribute('role', 'radio');
    btn.setAttribute('aria-label', `${n} stars`);
    btn.addEventListener('click', () => {
      state = { ...state, stars: n };
      history.commit(state);
      syncAll();
    });
    stars.appendChild(btn);
  }
}

function currentSize() {
  return SIZES.find((s) => s.id === state.size) ?? SIZES[0];
}

function currentLayout() {
  return LAYOUTS.find((l) => l.id === state.layout) ?? LAYOUTS[0];
}

function redraw() {
  const size = currentSize();
  if (canvas.width !== size.w || canvas.height !== size.h) {
    canvas.width = size.w;
    canvas.height = size.h;
  }
  // The cover scene (?shot=cover) is the finished poster: no selection outline.
  const coverScene = document.body.classList.contains('shot-cover');
  renderCover(canvas, state, photos.map((p) => p.img), { showSelection: !coverScene });
}

function syncPickers() {
  document.querySelectorAll('.layout-btn').forEach((b, i) => {
    const on = LAYOUTS[i].id === state.layout;
    b.classList.toggle('active', on);
    b.setAttribute('aria-checked', String(on));
  });
  document.querySelectorAll('.grade-btn').forEach((b, i) => {
    const on = GRADES[i].id === state.grade;
    b.classList.toggle('active', on);
    b.setAttribute('aria-checked', String(on));
  });
  document.querySelectorAll('.size-btn').forEach((b, i) => {
    const on = SIZES[i].id === state.size;
    b.classList.toggle('active', on);
    b.setAttribute('aria-checked', String(on));
  });
  document.querySelectorAll('#stars button').forEach((b, i) => b.classList.toggle('on', i < state.stars));
  $('sizeLabel').textContent = `${currentSize().dims} · ${currentSize().label}`;
  $('layoutLabel').textContent = currentLayout().name;
  $('undo').disabled = !history.canUndo;
  $('redo').disabled = !history.canRedo;
}

function syncPanelControls() {
  const layout = currentLayout();
  const ps = state.panels[state.selectedPanel] || { photo: 0, zoom: 1, dx: 0, dy: 0 };
  $('panelName').textContent = `Panel ${state.selectedPanel} (${layout.panels.findIndex((p) => p.id === state.selectedPanel) + 1} of ${layout.panels.length})`;
  $('panelPhotoName').textContent = photos[ps.photo]?.name ?? 'no photo yet';
  $('zoom').value = ps.zoom;
  $('panX').value = ps.dx;
  $('panY').value = ps.dy;
}

function syncInputs() {
  if ($('title').value !== state.title) $('title').value = state.title;
  if ($('subtitle').value !== state.subtitle) $('subtitle').value = state.subtitle;
  if ($('badge').value !== state.badge) $('badge').value = state.badge;
  $('grain').checked = state.grain;
  $('vignette').checked = state.vignette;
}

function syncAll() {
  syncPickers();
  syncPanelControls();
  syncInputs();
  redraw();
}

function updatePanel(patch, commitIt = false) {
  const panels = { ...state.panels, [state.selectedPanel]: { ...state.panels[state.selectedPanel], ...patch } };
  state = { ...state, panels };
  if (commitIt) history.commit(state);
  syncPanelControls();
  redraw();
}

function panelAt(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const nx = (clientX - rect.left) / rect.width;
  const ny = (clientY - rect.top) / rect.height;
  const layout = currentLayout();
  return layout.panels.find((p) => nx >= p.x && nx <= p.x + p.w && ny >= p.y && ny <= p.y + p.h) ?? null;
}

function bindCanvas() {
  canvas.addEventListener('pointerdown', (e) => {
    const panel = panelAt(e.clientX, e.clientY);
    if (!panel) return;
    const wasSelected = state.selectedPanel === panel.id;
    state = { ...state, selectedPanel: panel.id };
    if (!wasSelected) syncPanelControls();
    // Clicking a panel with a photo chosen in the strip places that photo.
    if (photos.length && state.panels[panel.id]?.photo !== activePhoto && e.shiftKey) {
      updatePanel({ photo: activePhoto }, true);
    }
    dragging = { panel: panel.id, x: e.clientX, y: e.clientY, moved: false };
    canvas.setPointerCapture(e.pointerId);
    redraw();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const rect = canvas.getBoundingClientRect();
    const layout = currentLayout();
    const panel = layout.panels.find((p) => p.id === dragging.panel);
    if (!panel) return;
    const dx = (e.clientX - dragging.x) / rect.width / panel.w;
    const dy = (e.clientY - dragging.y) / rect.height / panel.h;
    if (Math.abs(dx) > 0.002 || Math.abs(dy) > 0.002) dragging.moved = true;
    const ps = state.panels[panel.id];
    updatePanel({ dx: Math.max(-0.5, Math.min(0.5, ps.dx + dx)), dy: Math.max(-0.5, Math.min(0.5, ps.dy + dy)) });
    dragging.x = e.clientX;
    dragging.y = e.clientY;
  });
  canvas.addEventListener('pointerup', () => {
    if (dragging?.moved) history.commit(state);
    dragging = null;
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const ps = state.panels[state.selectedPanel];
    if (!ps) return;
    const zoom = Math.max(1, Math.min(3, ps.zoom * (e.deltaY < 0 ? 1.08 : 0.93)));
    updatePanel({ zoom }, true);
  }, { passive: false });
  canvas.addEventListener('dblclick', (e) => {
    const panel = panelAt(e.clientX, e.clientY);
    if (!panel || !photos.length) return;
    const ps = state.panels[panel.id];
    updatePanel({ photo: (ps.photo + 1) % photos.length }, true);
    $('status').textContent = `Panel ${panel.id} now shows ${photos[state.panels[panel.id].photo].name}.`;
  });
}

function bindControls() {
  $('photoFiles').addEventListener('change', async (e) => {
    for (const file of e.target.files) {
      const url = URL.createObjectURL(file);
      try {
        const img = await loadImage(url);
        photos.push({ name: file.name.replace(/\.[^.]+$/, ''), img });
      } catch { /* unreadable file skips */ }
    }
    activePhoto = photos.length - 1;
    renderPhotoStrip();
    redraw();
    $('status').textContent = `${photos.length} photo${photos.length === 1 ? '' : 's'} loaded.`;
  });
  $('fillAll').addEventListener('click', () => {
    if (!photos.length) return;
    const panels = {};
    for (const [id, ps] of Object.entries(state.panels)) panels[id] = { ...ps, photo: activePhoto };
    state = { ...state, panels };
    history.commit(state);
    syncAll();
    $('status').textContent = `All panels filled with ${photos[activePhoto].name}.`;
  });
  $('samplePhotos').addEventListener('click', async () => {
    await loadSamplePhotos();
    redraw();
    $('status').textContent = 'Sample photos loaded.';
  });
  $('zoom').addEventListener('input', (e) => updatePanel({ zoom: Number(e.target.value) }));
  $('zoom').addEventListener('change', () => history.commit(state));
  $('panX').addEventListener('input', (e) => updatePanel({ dx: Number(e.target.value) }));
  $('panX').addEventListener('change', () => history.commit(state));
  $('panY').addEventListener('input', (e) => updatePanel({ dy: Number(e.target.value) }));
  $('panY').addEventListener('change', () => history.commit(state));
  $('resetPanel').addEventListener('click', () => {
    updatePanel({ zoom: 1, dx: 0, dy: 0 }, true);
  });
  $('swapPhoto').addEventListener('click', () => {
    if (!photos.length) return;
    const ps = state.panels[state.selectedPanel];
    updatePanel({ photo: (ps.photo + 1) % photos.length }, true);
    syncPanelControls();
  });
  $('grain').addEventListener('change', (e) => { state = { ...state, grain: e.target.checked }; history.commit(state); redraw(); });
  $('vignette').addEventListener('change', (e) => { state = { ...state, vignette: e.target.checked }; history.commit(state); redraw(); });
  $('title').addEventListener('input', (e) => { state = { ...state, title: e.target.value }; redraw(); });
  $('title').addEventListener('change', () => history.commit(state));
  $('subtitle').addEventListener('input', (e) => { state = { ...state, subtitle: e.target.value }; redraw(); });
  $('subtitle').addEventListener('change', () => history.commit(state));
  $('badge').addEventListener('input', (e) => { state = { ...state, badge: e.target.value }; redraw(); });
  $('badge').addEventListener('change', () => history.commit(state));
  $('undo').addEventListener('click', () => {
    const prev = history.undo();
    if (prev) { state = prev; syncAll(); }
  });
  $('redo').addEventListener('click', () => {
    const next = history.redo();
    if (next) { state = next; syncAll(); }
  });
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); $('undo').click(); }
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); $('redo').click(); }
  });
  $('randomize').addEventListener('click', () => {
    const grade = GRADES[Math.floor(Math.random() * GRADES.length)];
    const layout = LAYOUTS[Math.floor(Math.random() * LAYOUTS.length)];
    state = { ...state, grade: grade.id, layout: layout.id, panels: defaultPanels(layout.id), selectedPanel: layout.panels[0].id };
    history.commit(state);
    syncAll();
    $('status').textContent = `Surprise: ${layout.name} in ${grade.name}.`;
  });
  $('export').addEventListener('click', () => exportPng());
}

/** Renders the cover at the chosen export size and downloads it as a PNG. */
export function exportPng() {
  const size = currentSize();
  const out = exportCoverCanvas(state, photos.map((p) => p.img), size.w, size.h);
  out.toBlob((blob) => {
    if (!blob) { $('status').textContent = 'Export failed.'; return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neon-coast-cover-${size.w}x${size.h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    $('status').textContent = `Saved neon-coast-cover-${size.w}x${size.h}.png`;
    window.__exported = { w: size.w, h: size.h, name: a.download };
  }, 'image/png');
}

async function init() {
  buildPickers();
  bindControls();
  bindCanvas();
  await document.fonts.load("16px 'Anton'");
  await document.fonts.load("16px 'Pacifico'");
  await document.fonts.load("16px 'Bebas Neue'");
  await document.fonts.ready;
  await loadSamplePhotos();
  syncAll();
  const shot = new URLSearchParams(location.search).get('shot');
  if (shot) {
    await runShot(shot, new URLSearchParams(location.search), {
      photos, setPhotos: (list) => { photos = list; },
      getState: () => state,
      setState: (next) => { state = next; history.commit(state); syncAll(); },
      redraw,
    });
  }
  window.__appReady = true;
}

init();
