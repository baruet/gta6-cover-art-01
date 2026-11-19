// Cover state: layouts, colour grades, export sizes and the undo/redo history.
// A layout is a set of panels in normalised (0..1) coordinates plus a title zone.
// A grade is a gradient map (dark -> light) plus overlay tint, grain and vignette.

export const SIZES = [
  { id: 'square', label: 'Square', dims: '1080 × 1080', w: 1080, h: 1080 },
  { id: 'portrait', label: 'Portrait', dims: '1080 × 1350', w: 1080, h: 1350 },
  { id: 'wide', label: 'Wide', dims: '1920 × 1080', w: 1920, h: 1080 },
  { id: 'story', label: 'Story', dims: '1080 × 1920', w: 1080, h: 1920 },
];

export const LAYOUTS = [
  {
    id: 'hero-three', name: 'Hero & Three',
    panels: [
      { id: 'hero', x: 0.02, y: 0.02, w: 0.63, h: 0.66 },
      { id: 'top', x: 0.67, y: 0.02, w: 0.31, h: 0.21 },
      { id: 'mid', x: 0.67, y: 0.245, w: 0.31, h: 0.21 },
      { id: 'low', x: 0.67, y: 0.47, w: 0.31, h: 0.21 },
    ],
    title: { x: 0.02, y: 0.70, w: 0.96, h: 0.28, align: 'left' },
    badge: { x: 0.84, y: 0.70, w: 0.14, h: 0.14 },
  },
  {
    id: 'grid-4', name: 'Grid 4',
    panels: [
      { id: 'a', x: 0.02, y: 0.02, w: 0.475, h: 0.32 },
      { id: 'b', x: 0.505, y: 0.02, w: 0.475, h: 0.32 },
      { id: 'c', x: 0.02, y: 0.345, w: 0.475, h: 0.32 },
      { id: 'd', x: 0.505, y: 0.345, w: 0.475, h: 0.32 },
    ],
    title: { x: 0.02, y: 0.685, w: 0.96, h: 0.295, align: 'center' },
    badge: { x: 0.86, y: 0.685, w: 0.12, h: 0.12 },
  },
  {
    id: 'grid-9', name: 'Grid 9',
    panels: [
      { id: 'a', x: 0.015, y: 0.015, w: 0.315, h: 0.21 },
      { id: 'b', x: 0.345, y: 0.015, w: 0.315, h: 0.21 },
      { id: 'c', x: 0.675, y: 0.015, w: 0.31, h: 0.21 },
      { id: 'd', x: 0.015, y: 0.24, w: 0.315, h: 0.21 },
      { id: 'e', x: 0.345, y: 0.24, w: 0.315, h: 0.21 },
      { id: 'f', x: 0.675, y: 0.24, w: 0.31, h: 0.21 },
      { id: 'g', x: 0.015, y: 0.465, w: 0.315, h: 0.21 },
      { id: 'h', x: 0.345, y: 0.465, w: 0.315, h: 0.21 },
      { id: 'i', x: 0.675, y: 0.465, w: 0.31, h: 0.21 },
    ],
    title: { x: 0.015, y: 0.69, w: 0.97, h: 0.295, align: 'center' },
    badge: { x: 0.865, y: 0.69, w: 0.12, h: 0.12 },
  },
  {
    id: 'full-bleed', name: 'Full Bleed',
    panels: [{ id: 'hero', x: 0, y: 0, w: 1, h: 0.72 }],
    title: { x: 0.03, y: 0.70, w: 0.94, h: 0.28, align: 'left', band: true },
    badge: { x: 0.83, y: 0.045, w: 0.13, h: 0.13 },
  },
  {
    id: 'tilted', name: 'Tilted Snapshots',
    panels: [
      { id: 'a', x: 0.03, y: 0.03, w: 0.44, h: 0.30, rot: -4 },
      { id: 'b', x: 0.52, y: 0.02, w: 0.44, h: 0.30, rot: 3 },
      { id: 'c', x: 0.08, y: 0.36, w: 0.40, h: 0.30, rot: 2.5 },
      { id: 'd', x: 0.54, y: 0.37, w: 0.40, h: 0.30, rot: -3 },
    ],
    title: { x: 0.02, y: 0.69, w: 0.96, h: 0.29, align: 'center' },
    badge: { x: 0.86, y: 0.69, w: 0.12, h: 0.12 },
  },
  {
    id: 'triptych', name: 'Triptych',
    panels: [
      { id: 'a', x: 0.02, y: 0.02, w: 0.31, h: 0.66 },
      { id: 'b', x: 0.345, y: 0.02, w: 0.31, h: 0.66 },
      { id: 'c', x: 0.67, y: 0.02, w: 0.31, h: 0.66 },
    ],
    title: { x: 0.02, y: 0.70, w: 0.96, h: 0.28, align: 'center' },
    badge: { x: 0.86, y: 0.70, w: 0.12, h: 0.12 },
  },
  {
    id: 'duo-strip', name: 'Duo Strip',
    panels: [
      { id: 'a', x: 0.02, y: 0.02, w: 0.475, h: 0.42 },
      { id: 'b', x: 0.505, y: 0.02, w: 0.475, h: 0.42 },
      { id: 'c', x: 0.02, y: 0.455, w: 0.96, h: 0.225 },
    ],
    title: { x: 0.02, y: 0.695, w: 0.96, h: 0.285, align: 'left' },
    badge: { x: 0.85, y: 0.695, w: 0.13, h: 0.13 },
  },
];

// Gradient map stops: [position, r, g, b] from shadows to highlights.
export const GRADES = [
  { id: 'sunset', name: 'Sunset', stops: [[0, 18, 8, 38], [0.35, 120, 30, 90], [0.65, 255, 110, 60], [1, 255, 220, 150]], tint: '#ff7a3c', tintAlpha: 0.10 },
  { id: 'neon', name: 'Neon', stops: [[0, 6, 8, 40], [0.35, 40, 20, 110], [0.65, 255, 45, 140], [1, 120, 240, 255]], tint: '#2ee6ff', tintAlpha: 0.10 },
  { id: 'vice', name: 'Vice', stops: [[0, 20, 6, 34], [0.35, 150, 30, 110], [0.65, 255, 80, 160], [1, 255, 190, 220]], tint: '#ff2e88', tintAlpha: 0.12 },
  { id: 'dusk', name: 'Dusk', stops: [[0, 8, 12, 30], [0.4, 50, 60, 110], [0.7, 200, 120, 90], [1, 255, 210, 140]], tint: '#7a5cff', tintAlpha: 0.10 },
  { id: 'palm', name: 'Palm', stops: [[0, 10, 30, 22], [0.35, 30, 110, 80], [0.65, 255, 190, 80], [1, 255, 250, 200]], tint: '#ffd166', tintAlpha: 0.10 },
  { id: 'noir', name: 'Noir', stops: [[0, 5, 5, 8], [0.5, 70, 70, 80], [1, 245, 240, 230]], tint: '#ffffff', tintAlpha: 0.05 },
];

export function defaultPanels(layoutId) {
  const layout = LAYOUTS.find((l) => l.id === layoutId) ?? LAYOUTS[0];
  const panels = {};
  layout.panels.forEach((p, i) => {
    panels[p.id] = { photo: i % 2, zoom: 1, dx: 0, dy: 0 };
  });
  return panels;
}

export function defaultState() {
  return {
    layout: 'hero-three',
    grade: 'sunset',
    size: 'square',
    title: 'NEON COAST',
    subtitle: 'chase the sunset',
    badge: 'VICE NIGHTS',
    stars: 4,
    grain: true,
    vignette: true,
    selectedPanel: 'hero',
    panels: defaultPanels('hero-three'),
  };
}

/** Small undo/redo stack over JSON snapshots of the cover state. */
export function createHistory(initial) {
  let past = [];
  let future = [];
  let current = JSON.parse(JSON.stringify(initial));
  return {
    get current() { return current; },
    get canUndo() { return past.length > 0; },
    get canRedo() { return future.length > 0; },
    commit(next) {
      past.push(current);
      if (past.length > 60) past.shift();
      future = [];
      current = JSON.parse(JSON.stringify(next));
    },
    undo() {
      if (!past.length) return null;
      future.push(current);
      current = past.pop();
      return JSON.parse(JSON.stringify(current));
    },
    redo() {
      if (!future.length) return null;
      past.push(current);
      current = future.pop();
      return JSON.parse(JSON.stringify(current));
    },
  };
}
