// Time-slicing: ghost layers of each line fold out of the past into the present.
const PAST = '#ff6a45';
const FOLD = 'cubic-bezier(.16,.84,.24,1)';
const LINE_GAP = 240;
const STAGGER = 48;
const FADE_IN = 200;

export const css = `
.ty-echo .ty-c,.ty-echo-a .ty-c{opacity:0}
.ty-echo .ty-sl,.ty-echo-a .ty-sl{position:absolute;left:0;top:0;white-space:nowrap;pointer-events:none}
.ty-echo .ty-sl .ty-c,.ty-echo-a .ty-sl .ty-c{opacity:1}
.ty-echo .ty-yr{position:absolute;font-variant-numeric:tabular-nums lining-nums;letter-spacing:.08em;color:${PAST}}
`;

// A cancelled animation rejects .finished; cancellation is not a failure here.
const settled = (anims) => Promise.all(anims.map((a) => a.finished)).catch(() => {});

async function foldLine(t, line, delay, { count, step, duration }) {
  if (delay) await t.wait(delay);
  if (t.stopped) return;

  // Query and copy before any clone goes in, so slices never nest or get revealed.
  const chars = [...line.querySelectorAll('.ty-c')];
  const source = line.cloneNode(true);
  const clones = [];
  const anims = [];

  for (let i = 0; i < count; i++) {
    const age = count - i;
    const clone = source.cloneNode(true);
    clone.className = 'ty-sl';
    clone.setAttribute('aria-hidden', 'true');
    const past = count > 1 ? (1 - i / (count - 1)) * 100 : 0;
    clone.style.color = `color-mix(in srgb, ${PAST} ${past.toFixed(1)}%, var(--ink))`;
    line.appendChild(clone);
    clones.push(clone);

    const start = STAGGER * age;
    const strength = 0.05 + i * 0.05;
    anims.push(t.animate(clone, [
      { transform: `translateX(${(-age * step).toFixed(2)}em) skewX(${(-age * 0.8).toFixed(1)}deg)` },
      { transform: 'translateX(0) skewX(0deg)' }
    ], { duration, delay: start, easing: FOLD }));
    // Separate and linear, because a fold easing would warp the keyframe offsets
    // and the fade would no longer cover the final 25% of the time.
    anims.push(t.animate(clone, [
      { opacity: strength, offset: 0 },
      { opacity: strength, offset: 0.75 },
      { opacity: 0, offset: 1 }
    ], { duration, delay: start, easing: 'linear' }));
  }

  // The newest slice has the shortest delay, so older, fainter ghosts still trail in.
  const landed = STAGGER + duration;
  for (const ch of chars) {
    anims.push(t.animate(ch, [{ opacity: 0 }, { opacity: 1 }], {
      duration: FADE_IN,
      delay: landed,
      easing: 'linear'
    }));
  }

  await settled(anims);
  clones.forEach((clone) => clone.remove());
}

function foldAll(t, options) {
  return Promise.all(t.lines.map((line, n) => foldLine(t, line, n * LINE_GAP, options)));
}

async function countYears(t, span) {
  const overlay = t.overlay('ty-echo-o');
  const year = document.createElement('span');
  year.className = 'ty-yr';
  year.textContent = '2017';
  const spot = t.beside(1.2 * t.fs);
  year.style.cssText = `right:auto;left:${spot.left}px;top:${spot.top}px;font-size:${Math.max(10, .3 * t.fs)}px`;
  overlay.appendChild(year);

  // Ten equal buckets give every year the same hold, including the last.
  await t.frame(span, (k) => {
    year.textContent = String(2017 + Math.min(9, Math.floor(k * 10)));
  });
  if (!t.stopped) {
    await settled([t.animate(year, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, easing: 'linear' })]);
  }
  overlay.remove();
}

export async function play(t) {
  const options = { count: 9, step: 0.36, duration: 620 };
  // Runs until the oldest slice of the last line lands.
  const span = (t.lines.length - 1) * LINE_GAP + options.count * STAGGER + options.duration;
  await Promise.all([foldAll(t, options), countYears(t, span)]);
}

export const accents = '.tl-date';

export async function accent(t) {
  await foldAll(t, { count: 3, step: 0.12, duration: 420 });
}
