// Quantum: every letter is a probability cloud until the measurement line reaches it.

const FLASH = '#ff6a45';
const GHOST_ALPHA = 0.2;
const CORE_ALPHA = 0.22;

export const css = `
.ty-quantum .ty-c,.ty-quantum-a .ty-c{opacity:0;position:relative}
.ty-quantum .ty-gh,.ty-quantum-a .ty-gh{position:absolute;left:0;top:0;pointer-events:none;white-space:pre}
`;

export const accents = '.case-figure';

// Ghosts live inside the char, so the low alpha sits on an inner core span.
// Dimming the char itself would multiply into the ghosts and erase them.
function build(t, count) {
  const rng = t.rng(137);
  const between = (a, b) => a + (b - a) * rng();
  return t.chars.map((ch) => {
    const glyph = ch.textContent;
    const core = document.createElement('span');
    core.textContent = glyph;
    core.style.opacity = CORE_ALPHA;
    ch.textContent = '';
    ch.append(core);
    const ghosts = [];
    for (let i = 0; i < count; i++) {
      const el = document.createElement('span');
      el.className = 'ty-gh';
      el.textContent = glyph;
      el.setAttribute('aria-hidden', 'true');
      el.style.opacity = 0;
      ch.append(el);
      ghosts.push({
        el,
        dx: between(-0.42, 0.42) * t.fs,
        dy: between(-0.22, 0.22) * t.fs,
        p: between(0, Math.PI * 2),
        w: between(0.004, 0.011),
      });
    }
    ch.style.opacity = 1;
    return { ch, glyph, core, ghosts, start: 0, settled: false };
  });
}

function drift(g, ms, reach) {
  const x = g.dx * Math.cos(g.w * ms + g.p) * reach;
  const y = g.dy * Math.sin(g.w * ms + g.p) * reach;
  g.el.style.transform = `translate(${x.toFixed(2)}px,${y.toFixed(2)}px)`;
}

// Restoring the bare text node leaves nothing behind for the swap to reveal.
function settle(q) {
  q.ch.textContent = q.glyph;
  q.ch.style.color = '';
  q.ch.style.opacity = 1;
  q.settled = true;
}

async function run(t, o) {
  const cloud = build(t, o.ghosts);

  // Sweep over the set text, not the block, or a short line would leave the clock idling.
  const a = Math.min(...t.chars.map((c) => c.box.x));
  const b = Math.max(...t.chars.map((c) => c.box.x + c.box.w));
  const span = Math.max(1, b - a);
  for (const q of cloud) q.start = ((q.ch.box.cx - a) / span) * o.sweep;

  await t.frame(o.hold, (k, ms) => {
    if (t.stopped) return;
    const alpha = GHOST_ALPHA * t.glide(t.clamp(ms / o.fade));
    for (const q of cloud) {
      for (const g of q.ghosts) {
        drift(g, ms, 1);
        g.el.style.opacity = alpha;
      }
    }
  });
  if (t.stopped) return;

  let line = null;
  if (o.line) {
    line = t.overlay('ty-q-line');
    Object.assign(line.style, {
      inset: '-.2em auto -.2em 0',
      width: '1px',
      background: FLASH,
      pointerEvents: 'none',
    });
  }

  await t.frame(o.measure, (k, ms) => {
    if (t.stopped) return;
    if (line) {
      // Linear on purpose: a measurement should not appear to hesitate.
      line.style.transform = `translateX(${(a + span * t.clamp(ms / o.sweep)).toFixed(2)}px)`;
      line.style.opacity = 1 - t.clamp((ms - o.sweep) / (o.measure - o.sweep));
    }
    for (const q of cloud) {
      if (q.settled) continue;
      const e = t.glide(t.clamp((ms - q.start) / o.fall));
      if (e >= 1) {
        settle(q);
        continue;
      }
      for (const g of q.ghosts) {
        drift(g, o.hold + ms, 1 - e);
        g.el.style.opacity = GHOST_ALPHA * (1 - e);
      }
      if (ms < q.start) continue;
      q.core.style.opacity = CORE_ALPHA + (1 - CORE_ALPHA) * e;
      // In the color property currentColor resolves to the inherited value,
      // so this lands on the ink in either theme without reading it.
      q.core.style.color = `color-mix(in srgb, ${FLASH} ${((1 - e) * 100).toFixed(1)}%, currentColor)`;
    }
  });
  if (t.stopped) return;

  // The last frame can fall just short of a collapse end, so close them all here.
  for (const q of cloud) if (!q.settled) settle(q);
  if (line) line.remove();
}

export async function play(t) {
  // 800 cloud + 800 sweep + 200 last collapse + 100 line fade = 1.9s.
  await run(t, { ghosts: 4, hold: 800, fade: 200, sweep: 800, fall: 200, measure: 1100, line: true });
}

export async function accent(t) {
  await run(t, { ghosts: 2, hold: 350, fade: 120, sweep: 120, fall: 180, measure: 300, line: false });
}
