// Fixed scenes for screenshots: a `?shot=` query sets up one cover instead
// of the editor, so the same page draws the same art every time it loads.
// `photo` picks the sample (samples/<photo>.jpg) and `caption` the title.
// window.__shotReady is set once the scene has painted.
export async function runShot(shot, query, api) {
  const photo = query.get('photo') ?? 'sunset';
  const caption = query.get('caption') ?? 'VICE CITY NIGHTS';
  if (shot === 'cover' || shot === 'story' || shot === 'wide') {
    document.body.classList.add('shot-cover');
    api.setSize(shot === 'story' ? 'story' : shot === 'wide' ? 'wide' : 'square');
    api.setLayout(shot === 'wide' ? 'strip' : shot === 'story' ? 'duo' : 'hero');
    api.setGrade(shot === 'story' ? 'teal' : shot === 'wide' ? 'golden' : 'sunset');
    api.setHeat(shot === 'wide' ? 5 : 4);
  } else {
    // The editor scene: the whole app, a photo loaded, a neon grade and a
    // trio layout, so the controls and the art are both in frame.
    api.setSize('square');
    api.setLayout('trio');
    api.setGrade('neon');
    api.setHeat(5);
  }
  await api.loadSample(photo, caption);
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
