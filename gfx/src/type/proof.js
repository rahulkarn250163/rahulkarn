// A Merkle tree verifies the headline, then the verified text appears.
const NS = 'http://www.w3.org/2000/svg';
const RED = '#ff6a45';
const EASE = 'cubic-bezier(.4,0,.2,1)';
const RISE = 'cubic-bezier(.2,.7,.2,1)';

export const css = `
.ty-proof .ty-c{opacity:0}
.ty-proof .pf-svg{position:absolute;left:0;top:0;overflow:visible;pointer-events:none}
.ty-proof .pf-cell{fill:none;stroke:var(--line);stroke-width:1}
.ty-proof .pf-join{fill:none;stroke:var(--gray);stroke-width:1;stroke-dasharray:1}
.ty-proof .pf-root{fill:none;stroke:var(--gray);stroke-width:1;transform-box:fill-box;transform-origin:center}
.ty-proof .pf-tick{fill:none;stroke:${RED};stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1}
.ty-proof-a .ty-c{opacity:0}
.ty-proof-a .pf-hex{display:flex;align-items:center;font-size:.28em;line-height:1;white-space:nowrap;color:var(--gray);font-variant-numeric:tabular-nums}
`;

function node(svg, tag, cls, attrs) {
  const el = document.createElementNS(NS, tag);
  el.setAttribute('class', cls);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  svg.appendChild(el);
  return el;
}

export const accents = '.lr-figure';

export async function play(t) {
  const em = t.fs;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'pf-svg');
  svg.setAttribute('width', t.W);
  svg.setAttribute('height', t.H);
  t.overlay('pf-layer').appendChild(svg);

  // 1. Leaves. The stagger shrinks on long headlines so the phase keeps its 300ms.
  const stagger = Math.min(9, 240 / Math.max(1, t.chars.length));
  const cellOf = new Map();
  t.chars.forEach((ch, i) => {
    const b = ch.box;
    const cell = node(svg, 'rect', 'pf-cell', {
      x: b.x, y: b.base - .32 * em, width: b.w, height: .14 * em,
    });
    cellOf.set(ch, cell);
    t.animate(cell, [{ opacity: 0 }, { opacity: 1 }], { duration: 60, delay: i * stagger, easing: 'linear' });
  });
  await t.wait(300);
  if (t.stopped) return;

  // 2. Tree. An unpaired node rises unjoined, so its word is reached a level sooner.
  const words = t.words
    .map((w) => t.chars.filter((c) => w.contains(c)))
    .filter((cs) => cs.length);
  let row = words.map((cs, word) => {
    const a = cs[0].box;
    const z = cs[cs.length - 1].box;
    return { x: (a.x + z.x + z.w) / 2, y: a.y, word };
  });
  const joins = [];
  const depthOf = new Map();
  for (let d = 1; row.length > 1; d++) {
    const next = [];
    const level = [];
    for (let i = 0; i < row.length; i += 2) {
      const a = row[i];
      const b = row[i + 1];
      if (!b) { next.push(a); continue; }
      const p = { x: (a.x + b.x) / 2, y: -(.1 + d * .085) * em };
      for (const c of [a, b]) {
        level.push(node(svg, 'path', 'pf-join', {
          d: `M${c.x} ${c.y}V${p.y}H${p.x}`, pathLength: 1,
        }));
        if (c.word !== undefined) depthOf.set(c.word, d);
      }
      next.push(p);
    }
    joins.push(level);
    row = next;
  }
  const L = joins.length;
  const levelMs = Math.min(130, 600 / Math.max(1, L));
  joins.forEach((level, i) => level.forEach((path) => {
    t.animate(path, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], {
      duration: levelMs, delay: i * levelMs, easing: EASE,
    });
  }));
  await t.wait(600);
  if (t.stopped) return;

  // 3. Root and tick.
  const root = row[0];
  const circle = node(svg, 'circle', 'pf-root', { cx: root.x, cy: root.y, r: .09 * em });
  t.animate(circle, [{ opacity: 0, transform: 'scale(.4)' }, { opacity: 1, transform: 'scale(1)' }], {
    duration: 90, easing: RISE,
  });
  const tx = root.x + .17 * em;
  const tick = node(svg, 'path', 'pf-tick', {
    d: `M${tx} ${root.y}l${.05 * em} ${.05 * em}l${.11 * em} ${-.13 * em}`, pathLength: 1,
  });
  t.animate(tick, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 110, delay: 90, easing: EASE });
  await t.wait(200);
  if (t.stopped) return;

  // 4. Verified. Reveal length takes what the pulse leaves, so the phase ends at 600ms.
  const step = Math.min(90, 400 / Math.max(1, L));
  const reveal = 600 - L * step;
  const paint = [{ stroke: 'var(--gray)' }, { stroke: RED }];
  t.animate(circle, paint, { duration: step, easing: 'linear' });
  joins.forEach((level, i) => level.forEach((path) => {
    t.animate(path, paint, { duration: step, delay: (L - 1 - i) * step, easing: 'linear' });
  }));
  words.forEach((cs, word) => {
    const arrive = depthOf.has(word) ? (L - depthOf.get(word) + 1) * step : 0;
    cs.forEach((ch) => {
      t.animate(ch, [
        { opacity: 0, transform: `translateY(${.06 * em}px)` },
        { opacity: 1, transform: 'none' },
      ], { duration: reveal, delay: arrive, easing: RISE });
      t.animate(cellOf.get(ch), [{ opacity: 1 }, { opacity: 0 }], { duration: 160, delay: arrive, easing: 'linear' });
    });
  });
  await t.wait(600);
  if (t.stopped) return;

  // 5. The proof has done its work; only the text stays.
  t.animate(svg, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, easing: 'linear' });
  await t.wait(300);
}

export async function accent(t) {
  const hex = t.overlay('pf-hex');
  hex.style.left = t.chars[0].box.x + 'px';
  const rnd = t.rng(t.text.length + 7);
  let last = -1;
  await t.frame(320, (k, ms) => {
    const tick = Math.floor(ms / 60);
    if (tick === last) return;
    last = tick;
    let s = '';
    for (let i = 0; i < 8; i++) s += Math.floor(rnd() * 16).toString(16);
    hex.textContent = s;
  });
  hex.textContent = '';
  if (t.stopped) return;

  // Ends on the computed colour so the swap to real text cannot jump.
  t.chars.forEach((ch) => {
    const ink = getComputedStyle(ch).color;
    t.animate(ch, [{ opacity: 1, color: RED }, { opacity: 1, color: ink }], { duration: 300, easing: 'linear' });
  });
  await t.wait(300);
}
