// Vice Coast Cover Studio — application state.
//
// This module owns every fact the cover is drawn from: which layout, grade
// and look are active, the caption words, which photo fills each panel and
// how it is cropped, plus the undo history and the seeded random source.
// Nothing here touches the DOM or a canvas; the renderer reads a plain
// snapshot of this state, and the UI module writes to it through commit().

export const LAYOUTS = [
  { id: 'key-art', name: 'Key Art', panels: 1, blurb: 'One large panel, title band below.' },
  { id: 'hero-three', name: 'Hero and Three', panels: 4, blurb: 'Wide hero on top, three panels beneath.' },
  { id: 'grid-4', name: 'Grid 4', panels: 4, blurb: 'Four equal panels, two by two.' },
  { id: 'grid-9', name: 'Grid 9', panels: 9, blurb: 'Nine equal panels, three by three.' },
  { id: 'poster-wall', name: 'Poster Wall', panels: 12, blurb: 'Twelve small panels with a title block.' },
  { id: 'sunset-strip', name: 'Sunset Strip', panels: 3, blurb: 'Three horizontal bands, sunset between them.' },
  { id: 'triptych', name: 'Triptych', panels: 3, blurb: 'Three tall vertical panels side by side.' },
  { id: 'full-bleed', name: 'Full Bleed', panels: 1, blurb: 'One photo edge to edge, caption overlaid.' },
  { id: 'tilted', name: 'Tilted Snaps', panels: 5, blurb: 'Overlapping prints at slight angles.' },
  { id: 'duo', name: 'Duo Split', panels: 2, blurb: 'Two vertical panels, title across the join.' },
  { id: 'magazine', name: 'Magazine Spread', panels: 4, blurb: 'Masthead on top, hero, three small panels.' },
];

// Each grade is a gradient map: a list of [position, colour] stops that a
// photo's brightness is remapped through, dark end first.
export const GRADES = [
  { id: 'sunset', name: 'Sunset', stops: [[0, '#160a2e'], [0.25, '#6d2358'], [0.5, '#c93a4e'], [0.75, '#ff7a3c'], [1, '#ffd98a']] },
  { id: 'neon', name: 'Neon', stops: [[0, '#0d0221'], [0.3, '#5b0a6e'], [0.55, '#e0218a'], [0.8, '#22d3ee'], [1, '#e8fbff']] },
  { id: 'vice', name: 'Vice', stops: [[0, '#12082e'], [0.3, '#4b2a85'], [0.55, '#8a4fb8'], [0.8, '#2ec4b6'], [1, '#d6fff6']] },
  { id: 'dusk', name: 'Dusk', stops: [[0, '#060d24'], [0.3, '#16294f'], [0.55, '#2f5d8a'], [0.8, '#7fa8c9'], [1, '#eaf3ff']] },
  { id: 'mono', name: 'Mono', stops: [[0, '#000000'], [0.35, '#3a3a3a'], [0.65, '#8f8f8f'], [0.85, '#d8d8d8'], [1, '#ffffff']] },
  { id: 'heatwave', name: 'Heatwave', stops: [[0, '#2b0d02'], [0.3, '#7a1e05'], [0.55, '#d94f04'], [0.8, '#ffb703'], [1, '#fff3b0']] },
  { id: 'lagoon', name: 'Lagoon', stops: [[0, '#022b2b'], [0.3, '#0a5c4d'], [0.55, '#17a398'], [0.8, '#7ee081'], [1, '#eaffea']] },
  { id: 'rose', name: 'Rose', stops: [[0, '#2e0a24'], [0.3, '#7a2e5d'], [0.55, '#c65d7b'], [0.8, '#f7a8b8'], [1, '#ffe9f0']] },
  { id: 'ultraviolet', name: 'Ultraviolet', stops: [[0, '#0b0033'], [0.3, '#3d0a9e'], [0.55, '#7b2ff7'], [0.8, '#b388ff'], [1, '#efe6ff']] },
  { id: 'ember', name: 'Ember', stops: [[0, '#0a0505'], [0.3, '#3d130a'], [0.55, '#8a2f0e'], [0.8, '#e85d04'], [1, '#ffc46b']] },
  { id: 'midnight', name: 'Midnight', stops: [[0, '#01020a'], [0.3, '#0b1530'], [0.55, '#1d3557'], [0.8, '#5a7ba6'], [1, '#dfe9f5']] },
];

// A look bundles the lettering, frame and badge colours that go with a grade.
export const LOOKS = [
  { id: 'vice-rush', name: 'Vice Rush', title: ['#ff5e8a', '#ffb703'], titleInk: '#2b0a3d', sub: '#22d3ee', accent: '#e0218a', frame: '#ffffff', badge: '#e0218a' },
  { id: 'golden-mile', name: 'Golden Mile', title: ['#ffb703', '#ff7a3c'], titleInk: '#3d130a', sub: '#ff5e8a', accent: '#ff7a3c', frame: '#fff8e7', badge: '#d94f04' },
  { id: 'heatwave', name: 'Heatwave', title: ['#ffd60a', '#e85d04'], titleInk: '#2b0d02', sub: '#ffb703', accent: '#e85d04', frame: '#fff3d6', badge: '#d94f04' },
  { id: 'night-shift', name: 'Night Shift', title: ['#e8fbff', '#7dd3fc'], titleInk: '#01020a', sub: '#22d3ee', accent: '#38bdf8', frame: '#0b1530', badge: '#22d3ee' },
  { id: 'pier-pressure', name: 'Pier Pressure', title: ['#7ee081', '#17a398'], titleInk: '#022b2b', sub: '#ffd60a', accent: '#17a398', frame: '#eaffea', badge: '#0a5c4d' },
  { id: 'boulevard-queen', name: 'Boulevard Queen', title: ['#ffe9f0', '#f7a8b8'], titleInk: '#2e0a24', sub: '#c65d7b', accent: '#c65d7b', frame: '#ffffff', badge: '#7a2e5d' },
  { id: 'sunset-boulevard', name: 'Sunset Boulevard', title: ['#ffd98a', '#ff7a3c'], titleInk: '#3d130a', sub: '#ffb703', accent: '#ff7a3c', frame: '#fff8e7', badge: '#c93a4e', longShadow: true },
  { id: 'neon-vice', name: 'Neon Vice', title: ['#22d3ee', '#e0218a'], titleInk: '#0d0221', sub: '#22d3ee', accent: '#e0218a', frame: '#0d0221', badge: '#e0218a', neon: true },
];

// One-click presets: a layout, grade, look and caption tuned to go together.
export const RECIPES = [
  { id: 'vice-nights', name: 'Vice Nights', layout: 'magazine', grade: 'neon', look: 'neon-vice', title: 'VICE NIGHTS', subtitle: 'chase the neon', tagline: 'ONE CITY. EVERY LIGHT TELLS A STORY.' },
  { id: 'golden-hour', name: 'Golden Hour', layout: 'sunset-strip', grade: 'sunset', look: 'golden-mile', title: 'GOLDEN HOUR', subtitle: 'chase the sunset', tagline: 'THE BOULEVARD AT ITS BEST LIGHT.' },
  { id: 'street-heat', name: 'Street Heat', layout: 'duo', grade: 'ember', look: 'heatwave', title: 'STREET HEAT', subtitle: 'run it hot', tagline: 'TWO LANES. NO BRAKES. ALL SUMMER.' },
  { id: 'night-drive', name: 'Night Drive', layout: 'full-bleed', grade: 'midnight', look: 'night-shift', title: 'NIGHT DRIVE', subtitle: 'lights out, city on', tagline: 'THE COAST NEVER SLEEPS.' },
  { id: 'pier-lights', name: 'Pier Lights', layout: 'hero-three', grade: 'lagoon', look: 'pier-pressure', title: 'PIER LIGHTS', subtitle: 'salt air, neon glare', tagline: 'WHERE THE BOARDWALK MEETS THE BAY.' },
  { id: 'palm-noir', name: 'Palm Noir', layout: 'triptych', grade: 'mono', look: 'boulevard-queen', title: 'PALM NOIR', subtitle: 'in black and white', tagline: 'SHADOWS, PALMS AND ONE LONG NIGHT.' },
];

// Curated grade-plus-look pairings for the Randomize button. Stepping through
// this fixed ring always lands on a combination that was tuned to look
// deliberate, never a random clash.
export const GRADE_LOOK_RING = [
  ['sunset', 'sunset-boulevard'],
  ['neon', 'neon-vice'],
  ['vice', 'vice-rush'],
  ['heatwave', 'heatwave'],
  ['lagoon', 'pier-pressure'],
  ['ember', 'heatwave'],
  ['midnight', 'night-shift'],
  ['dusk', 'night-shift'],
  ['rose', 'boulevard-queen'],
  ['mono', 'boulevard-queen'],
  ['ultraviolet', 'neon-vice'],
];

export const SIZES = [
  { id: 'square', name: 'Square post', label: 'Square 1080 × 1080', w: 1080, h: 1080 },
  { id: 'portrait', name: 'Portrait post', label: 'Portrait 1080 × 1350', w: 1080, h: 1350 },
  { id: 'landscape', name: 'Landscape post', label: 'Landscape 1920 × 1080', w: 1920, h: 1080 },
  { id: 'story', name: 'Story', label: 'Story 1080 × 1920', w: 1080, h: 1920 },
];

export const STICKERS = [
  { id: 'sun', name: 'Sun badge', w: 1080, h: 1080 },
  { id: 'strip', name: 'Title strip', w: 1080, h: 1080 },
];

/** A small seeded generator (mulberry32): every "random" thing in the app
 *  comes from here, so the same state always renders byte-identical. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) || LAYOUTS[0];
}

export function gradeById(id) {
  return GRADES.find((g) => g.id === id) || GRADES[0];
}

export function lookById(id) {
  return LOOKS.find((l) => l.id === id) || LOOKS[0];
}

export function recipeById(id) {
  return RECIPES.find((r) => r.id === id) || null;
}

export function sizeById(id) {
  return SIZES.find((s) => s.id === id) || SIZES[0];
}

function defaultCrop() {
  return { zoom: 1, panX: 0, panY: 0 };
}

/** The fresh default state: the Golden Hour recipe's mood, two sample slots. */
export function createState() {
  return {
    layout: 'magazine',
    grade: 'neon',
    look: 'neon-vice',
    recipe: 'vice-nights',
    title: 'VICE NIGHTS',
    subtitle: 'chase the neon',
    tagline: 'ONE CITY. EVERY LIGHT TELLS A STORY.',
    credit: 'A VICE COAST ORIGINAL',
    heat: 5,
    size: 'landscape',
    seed: 20261119,
    ringStep: 0,
    panelPhotos: [0, 1, 0, 1],
    crops: [defaultCrop(), defaultCrop(), defaultCrop(), defaultCrop()],
    selectedPanel: 0,
  };
}

/** Grow or trim the per-panel arrays so they match the active layout. */
export function fitPanels(state) {
  const n = layoutById(state.layout).panels;
  while (state.panelPhotos.length < n) state.panelPhotos.push((state.panelPhotos.length + 1) % 2);
  while (state.crops.length < n) state.crops.push(defaultCrop());
  state.panelPhotos.length = n;
  state.crops.length = n;
  if (state.selectedPanel >= n) state.selectedPanel = 0;
  return state;
}

/** Apply a recipe: layout, grade, look and caption all change at once. */
export function applyRecipe(state, recipeId) {
  const recipe = recipeById(recipeId);
  if (!recipe) return state;
  state.recipe = recipe.id;
  state.layout = recipe.layout;
  state.grade = recipe.grade;
  state.look = recipe.look;
  state.title = recipe.title;
  state.subtitle = recipe.subtitle;
  state.tagline = recipe.tagline;
  return fitPanels(state);
}

/** Step to the next curated grade-plus-look pairing. */
export function randomizeGrade(state) {
  state.ringStep = (state.ringStep + 1) % GRADE_LOOK_RING.length;
  const pair = GRADE_LOOK_RING[state.ringStep];
  state.grade = pair[0];
  state.look = pair[1];
  state.recipe = '';
  return state;
}

/** Re-deal the photos across the panels with the seeded generator. */
export function shufflePhotos(state, photoCount) {
  if (photoCount < 2) return state;
  const rand = mulberry32(state.seed);
  state.seed = (state.seed + 7919) >>> 0;
  const order = state.panelPhotos.slice();
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = order[i];
    order[i] = order[j];
    order[j] = tmp;
  }
  // Never leave a shuffle that changed nothing visible.
  if (order.every((v, i) => v === state.panelPhotos[i])) {
    const first = order[0];
    order[0] = order[1];
    order[1] = first;
  }
  state.panelPhotos = order;
  return state;
}

/** A plain snapshot of everything the renderer needs (photos excluded). */
export function snapshot(state) {
  return JSON.parse(JSON.stringify({
    layout: state.layout,
    grade: state.grade,
    look: state.look,
    recipe: state.recipe,
    title: state.title,
    subtitle: state.subtitle,
    tagline: state.tagline,
    credit: state.credit,
    heat: state.heat,
    size: state.size,
    seed: state.seed,
    ringStep: state.ringStep,
    panelPhotos: state.panelPhotos,
    crops: state.crops,
    selectedPanel: state.selectedPanel,
  }));
}

export function restore(state, snap) {
  const fresh = createState();
  const merged = { ...fresh, ...snap };
  merged.crops = (snap.crops || []).map((c) => ({ ...defaultCrop(), ...c }));
  merged.panelPhotos = (snap.panelPhotos || []).slice();
  Object.assign(state, merged);
  return fitPanels(state);
}

/** Undo/redo stacks of snapshots. Every committed change pushes once. */
export function createHistory() {
  return { past: [], future: [] };
}

export function historyPush(history, state) {
  history.past.push(snapshot(state));
  if (history.past.length > 80) history.past.shift();
  history.future.length = 0;
}

export function historyUndo(history, state) {
  if (history.past.length === 0) return false;
  history.future.push(snapshot(state));
  restore(state, history.past.pop());
  return true;
}

export function historyRedo(history, state) {
  if (history.future.length === 0) return false;
  history.past.push(snapshot(state));
  restore(state, history.future.pop());
  return true;
}
