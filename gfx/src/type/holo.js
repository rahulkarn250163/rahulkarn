// Holographic projection of a blueprint, locking into solid matter.

export const css = `
@property --ty-scan{syntax:'<number>';inherits:true;initial-value:1}
.ty-holo .ty-c,.ty-holo-a .ty-c{opacity:0}
.ty-holo .ty-l.ty-holo-m,.ty-holo-a .ty-l.ty-holo-m{
  -webkit-mask-image:repeating-linear-gradient(0deg,#000 0 2px,rgba(0,0,0,var(--ty-scan)) 2px 3.5px);
  mask-image:repeating-linear-gradient(0deg,#000 0 2px,rgba(0,0,0,var(--ty-scan)) 2px 3.5px);
  mask-clip:no-clip;
}
.ty-holo .ty-beam{
  position:absolute;left:0;top:-1px;display:block;height:2px;width:100%;
  background:linear-gradient(90deg,transparent,#00c8ff,#fff,#00c8ff,transparent);
  box-shadow:0 0 14px 3px rgba(0,190,255,.75);
}
`;

export const accents = '.pull-quote p';

const FLICKER = [0, .7, .15, .85, .35, 1];
const SPLIT = '-.035em 0 rgba(0,200,255,.9),.035em 0 rgba(255,40,110,.75)';
const SETTLE = 'cubic-bezier(.2,.7,.2,1)';

// Cancellation rejects .finished; the engine owns the restore in that case.
const done = (a) => a.finished.catch(() => {});

function charsOf(t, i) {
  return t.chars.filter((c) => c.line === i);
}

async function sweep(t, layer, chars, ms) {
  const top = Math.min(...chars.map((c) => c.box.y));
  const bottom = Math.max(...chars.map((c) => c.box.y + c.box.h));
  const beam = document.createElement('span');
  beam.className = 'ty-beam';
  beam.style.width = t.textW + 'px';
  layer.append(beam);
  await done(t.animate(beam, [
    { transform: `translateY(${top}px)`, opacity: 0, offset: 0 },
    { opacity: 1, offset: .12 },
    { opacity: 1, offset: .82 },
    { transform: `translateY(${bottom}px)`, opacity: 0, offset: 1 },
  ], { duration: ms, easing: 'linear' }));
  beam.remove();
}

// Timings are passed in so the headline and the shorter accent share one path.
async function project(t, line, chars, seed, o) {
  // Read before the inline colour lands, so the lock ends on the real inherited colour.
  const inks = chars.map((c) => getComputedStyle(c).color);
  const rnd = t.rng(seed);
  const frames = FLICKER.map((opacity, k) => {
    const last = k === FLICKER.length - 1;
    const x = last ? 0 : (rnd() * 2 - 1) * .02;
    return { opacity, transform: `translateX(${x}em)` };
  });

  line.style.setProperty('--ty-scan', '.3');
  line.classList.add('ty-holo-m');
  chars.forEach((c, i) => {
    c.style.opacity = '1';
    c.style.color = `color-mix(in srgb, ${inks[i]} 35%, transparent)`;
    c.style.textShadow = SPLIT;
  });

  const flicker = t.animate(line, frames, { duration: o.flicker, delay: o.lead, easing: 'linear' });
  const scan = t.animate(line, [{ '--ty-scan': .3 }, { '--ty-scan': 1 }], {
    duration: o.lock, delay: o.lockAt, easing: SETTLE,
  });
  const locks = chars.map((c, i) => t.animate(c, [
    { color: `color-mix(in srgb, ${inks[i]} 35%, transparent)`, textShadow: SPLIT },
    { color: inks[i], textShadow: 'none' },
  ], { duration: o.lock, delay: o.lockAt + i * o.gap, easing: SETTLE }));

  await Promise.all([flicker, scan, ...locks].map(done));
  if (t.stopped) return;

  // Inline styles go first so cancelling the fills cannot expose the projected state.
  chars.forEach((c) => {
    c.style.color = '';
    c.style.textShadow = '';
  });
  [flicker, scan, ...locks].forEach((a) => a.cancel());
  line.classList.remove('ty-holo-m');
  line.style.removeProperty('--ty-scan');
}

export async function play(t) {
  const layer = t.overlay('ty-holo-o');
  const runs = t.lines.map(async (line, i) => {
    const chars = charsOf(t, i);
    if (!chars.length) return;
    if (i) await t.wait(i * 420);
    if (t.stopped) return;
    await Promise.all([
      sweep(t, layer, chars, 340),
      // Lock at 720ms leaves the second line landing on the 1.7s total.
      project(t, line, chars, 41 + i, { lead: 60, flicker: 420, lockAt: 720, lock: 380, gap: 6 }),
    ]);
  });
  await Promise.all(runs);
  layer.remove();
}

export async function accent(t) {
  const n = t.lines.length;
  // A long quote compresses its stagger rather than overrunning 800ms.
  const stagger = n > 1 ? Math.min(120, 320 / (n - 1)) : 0;
  const span = 800 - stagger * (n - 1);
  const flicker = span * .4;
  const runs = t.lines.map(async (line, i) => {
    const chars = charsOf(t, i);
    if (!chars.length) return;
    if (i) await t.wait(i * stagger);
    if (t.stopped) return;
    const tail = span - flicker;
    const lock = tail * .6;
    const gap = (tail - lock) / chars.length;
    await project(t, line, chars, 73 + i, { lead: 0, flicker, lockAt: flicker, lock, gap });
  });
  await Promise.all(runs);
}
