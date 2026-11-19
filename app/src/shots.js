// Fixed scenes for screenshots: ?shot=cover draws one exported cover full
// bleed, ?shot=editor opens the editor with sample photos loaded, ?shot=wide
// and ?shot=story draw the wide and portrait exports. All scenes use the
// bundled sample photos, never a network fetch.

export const SAMPLES = {
  sunset: './samples/sunset.jpg',
  neon: './samples/neon.jpg',
  lake: './samples/lake.jpg',
};

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('cannot load ' + url));
    img.src = url;
  });
}

async function loadFonts() {
  try {
    await Promise.all([
      document.fonts.load('400 100px Anton'),
      document.fonts.load('400 100px Pacifico'),
    ]);
    await document.fonts.ready;
  } catch (e) {
    // The cover still draws with the fallback fonts.
  }
}

// Runs one shot scene. `setup` receives the ready scene:
// { mode, photos, title, subtitle, badge, layout, grade, size: [w, h] }.
// Returns the scene so the caller can draw it.
export async function runShot(shot, query, setup) {
  const get = (k, d) => query.get(k) || d;
  const photos = await Promise.all([
    loadImage(SAMPLES.sunset),
    loadImage(SAMPLES.neon),
    loadImage(SAMPLES.lake),
  ]);
  await loadFonts();
  const scene = {
    mode: shot,
    photos,
    title: get('caption', 'Sunset Heist'),
    subtitle: get('subtitle', 'one last ride'),
    badge: get('badge', 'EST. 2026'),
    layout: get('layout', 'nine'),
    grade: get('grade', 'sunset'),
    size: [1080, 1080],
  };
  if (shot === 'wide') {
    scene.size = [1920, 1080];
    scene.layout = get('layout', 'hero');
    scene.grade = get('grade', 'neon');
    scene.title = get('caption', 'Neon Coast');
    scene.subtitle = get('subtitle', 'lights never sleep');
  } else if (shot === 'story') {
    scene.size = [1080, 1350];
    scene.layout = get('layout', 'strip');
    scene.grade = get('grade', 'golden');
    scene.title = get('caption', 'Golden Hour');
    scene.subtitle = get('subtitle', 'chasing the sun');
  } else if (shot === 'editor') {
    scene.layout = get('layout', 'hero');
    scene.grade = get('grade', 'sunset');
    scene.title = get('caption', 'Boulevard Queen');
    scene.subtitle = get('subtitle', 'queen of the coast');
  }
  setup(scene);
  return scene;
}
