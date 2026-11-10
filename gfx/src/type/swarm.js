export const css = `.ty-swarm .ty-c{opacity:0}`;

const MAX_POINTS = 5200;
const ALPHA_STEPS = 4;
const SIZE = 1.5;

// Rasterise char by char so targets inherit the engine's exact kerning.
function targets(t) {
  const off = document.createElement('canvas');
  off.width = Math.max(1, Math.ceil(t.W));
  off.height = Math.max(1, Math.ceil(t.H));
  const ctx = off.getContext('2d', { willReadFrequently: true });
  const fonts = {};
  for (const ch of t.chars) {
    const key = ch.closest('em') ? 'em' : 'roman';
    // The font shorthand reads back empty for this variable face, so it is built by hand.
    if (!fonts[key]) { const s = getComputedStyle(ch); fonts[key] = `${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`; }
    ctx.font = fonts[key];
    ctx.fillText(ch.textContent, ch.box.x, ch.box.base);
  }
  const { data } = ctx.getImageData(0, 0, off.width, off.height);
  const found = [];
  for (let y = 0; y < off.height; y += 2) {
    for (let x = 0; x < off.width; x += 2) {
      if (data[(y * off.width + x) * 4 + 3] > 120) found.push(x, y);
    }
  }
  const count = found.length / 2;
  const step = Math.max(1, count / MAX_POINTS);
  const points = [];
  for (let i = 0; i < count; i += step) {
    const at = Math.floor(i) * 2;
    points.push({ x: found[at], y: found[at + 1] });
  }
  return points;
}

// Descenders hang below the baseline, so the test allows for them.
function lineFinder(t) {
  const bases = [];
  for (const ch of t.chars) {
    bases[ch.line] = Math.max(bases[ch.line] || 0, ch.box.base);
  }
  const slack = t.fs * 0.3;
  return (y) => {
    for (let i = 0; i < bases.length; i++) {
      if (bases[i] !== undefined && y <= bases[i] + slack) return i;
    }
    return bases.length - 1;
  };
}

export async function play(t) {
  const c = t.canvas(2);
  const ink = getComputedStyle(t.el).color;
  const rand = t.rng(52);
  const lineOf = lineFinder(t);
  const reach = t.fs * 1.4;

  const swarm = targets(t).map(({ x, y }) => {
    const sx = rand() * c.W - c.ox;
    const sy = rand() * (c.H + reach * 2) - reach - c.oy;
    const dist = Math.hypot(x - sx, y - sy) || 1;
    return {
      x, y, sx, sy,
      px: -(y - sy) / dist,
      py: (x - sx) / dist,
      seed: rand() * Math.PI * 2,
      red: rand() < 0.08,
      // Wrapped narrow layouts can run past two lines; all follow the first.
      delay: (x / t.W) * 650 + (lineOf(y) > 0 ? 200 : 0),
      dx: 0, dy: 0, bucket: -1,
    };
  });

  const passes = ALPHA_STEPS * 2;
  const draw = (k, ms) => {
    if (t.stopped) return;
    const { ctx } = c;
    ctx.clearRect(0, 0, c.W, c.H);
    for (const p of swarm) {
      const raw = t.clamp((ms - p.delay) / 620);
      if (ms < p.delay) {
        p.bucket = -1;
        continue;
      }
      const eased = 1 - Math.pow(1 - raw, 3);
      const curl = Math.sin(raw * Math.PI * 2 + p.seed) * (1 - raw) * 18;
      p.dx = p.sx + (p.x - p.sx) * eased + p.px * curl;
      p.dy = p.sy + (p.y - p.sy) * eased + p.py * curl;
      const level = Math.max(1, Math.ceil(t.clamp(raw / 0.15) * ALPHA_STEPS));
      p.bucket = level - 1 + (p.red && raw < 1 ? ALPHA_STEPS : 0);
    }
    // Stepped alpha keeps thousands of rects to a handful of fills.
    for (let b = 0; b < passes; b++) {
      ctx.beginPath();
      for (const p of swarm) {
        if (p.bucket === b) {
          ctx.rect(c.ox + p.dx - SIZE / 2, c.oy + p.dy - SIZE / 2, SIZE, SIZE);
        }
      }
      ctx.globalAlpha = (0.9 * ((b % ALPHA_STEPS) + 1)) / ALPHA_STEPS;
      ctx.fillStyle = b < ALPHA_STEPS ? ink : '#ff6a45';
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  const runs = [t.frame(1300, draw)];
  for (const ch of t.chars) {
    runs.push(t.animate(ch, [{ opacity: 0 }, { opacity: 1 }], {
      duration: 220,
      delay: 850 + (ch.box.x / t.W) * 350,
      easing: 'linear',
    }).finished);
  }
  runs.push(t.animate(c.canvas, [{ opacity: 1 }, { opacity: 0 }], {
    duration: 250,
    delay: 1250,
    easing: 'linear',
  }).finished);

  await Promise.all(runs);
}
