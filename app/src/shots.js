// Fixed scenes for screenshots: ?shot=editor shows the editor with sample photos
// loaded; ?shot=cover shows the cover alone, full frame. Query params:
//   layout, grade, size, title, subtitle, badge, stars, photo (comma list of
//   sample names, in panel order), fill (photo index to fill every panel).
// window.__shotReady is set once the scene has painted.
import { SIZES, LAYOUTS, GRADES, defaultPanels } from './state.js';
import { loadImage } from './main.js';

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, Number(n) || lo));
}

export async function runShot(shot, query, app) {
  const next = { ...app.getState() };

  const layout = LAYOUTS.find((l) => l.id === query.get('layout'));
  if (layout) {
    next.layout = layout.id;
    next.panels = defaultPanels(layout.id);
    next.selectedPanel = layout.panels[0].id;
  }
  const grade = GRADES.find((g) => g.id === query.get('grade'));
  if (grade) next.grade = grade.id;
  const size = SIZES.find((s) => s.id === query.get('size'));
  if (size) next.size = size.id;
  if (query.get('title') !== null) next.title = query.get('title');
  if (query.get('subtitle') !== null) next.subtitle = query.get('subtitle');
  if (query.get('badge') !== null) next.badge = query.get('badge');
  if (query.get('stars') !== null) next.stars = clamp(query.get('stars'), 0, 5);

  // Photos: load the named samples in order, then map panels to them.
  const names = (query.get('photo') || 'boulevard,pier').split(',').map((s) => s.trim()).filter(Boolean);
  const loaded = [];
  for (const name of names) {
    try {
      loaded.push({ name, img: await loadImage(`samples/${name}.jpg`) });
    } catch { /* missing sample skips */ }
  }
  if (loaded.length) app.setPhotos(loaded);

  const fill = query.get('fill');
  const layoutPanels = LAYOUTS.find((l) => l.id === next.layout).panels;
  layoutPanels.forEach((panel, i) => {
    const pick = fill !== null ? clamp(fill, 0, loaded.length - 1) : (i % Math.max(1, loaded.length));
    next.panels[panel.id] = { ...(next.panels[panel.id] || {}), photo: pick, zoom: 1, dx: 0, dy: 0 };
  });

  app.setState(next);

  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
  } else {
    document.body.classList.add('shot-editor');
  }
  await document.fonts.ready;
  app.redraw();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
