// Gravitational lensing: a mass crosses the headline and letters emerge from its Einstein ring.

export const css = `
.ty-lens .ty-c{opacity:0}
.ty-lens .ty-mass{position:absolute;left:0;top:0;width:.62em;height:.62em;margin:-.31em 0 0 -.31em;border-radius:50%;background:#050505;box-shadow:0 0 0 1px rgba(224,100,79,.95),0 0 .55em .12em rgba(224,100,79,.5)}
.ty-lens .ty-mass-core{position:absolute;inset:0;border-radius:50%;background:#fff;opacity:0}
.ty-lens .ty-mass-ring{position:absolute;left:0;top:0;width:.62em;height:.62em;margin:-.31em 0 0 -.31em;border-radius:50%;border:.05em solid #e0644f;box-sizing:border-box;box-shadow:0 0 .3em #e0644f;opacity:0}
`;

const HOT = '#e0644f';
const SETTLE_AT = 0.92;
const SETTLE_MS = 144;

const bounds = (chars) => {
  let left = Infinity;
  let right = -Infinity;
  let y = 0;
  for (const ch of chars) {
    left = Math.min(left, ch.box.x);
    right = Math.max(right, ch.box.x + ch.box.w);
    y += ch.box.cy;
  }
  return { left, right, y: y / chars.length };
};

export async function play(t) {
  const { chars, fs } = t;
  if (!chars.length) return;

  // Wrapped headlines still use one pass over the first line and one over the last;
  // the forced reveal below covers any middle line the mass never comes near.
  const top = bounds(chars.filter((ch) => ch.line === chars[0].line));
  const low = bounds(chars.filter((ch) => ch.line === chars[chars.length - 1].line));
  const startX = top.left - 0.3 * fs;
  const turnX = Math.max(top.right, low.right) + 0.3 * fs;
  const endX = low.left - 0.3 * fs;

  const layer = t.overlay('ty-lens-o');
  const mass = document.createElement('span');
  mass.className = 'ty-mass';
  const core = document.createElement('span');
  core.className = 'ty-mass-core';
  const ring = document.createElement('span');
  ring.className = 'ty-mass-ring';
  mass.appendChild(core);
  layer.append(ring, mass);

  // Each leg rests at the turn, so the vertical move there reads as one smooth curve.
  const pathAt = (k) => {
    const x = k < 0.5
      ? startX + (turnX - startX) * t.glide(k / 0.5)
      : turnX + (endX - turnX) * t.glide(t.clamp((k - 0.5) / (SETTLE_AT - 0.5)));
    const y = top.y + (low.y - top.y) * t.glide(t.clamp((k - 0.42) / 0.16));
    return { x, y };
  };

  const RE = 1.05 * fs;
  const revealedAt = new Map();
  const flashes = [];
  let collapsed = false;

  await t.frame(1800, (k, ms) => {
    if (t.stopped) return;
    const { x: mx, y: my } = pathAt(k);
    const fade = 1 - t.glide(t.clamp((k - SETTLE_AT) / (1 - SETTLE_AT)));
    const at = `translate(${mx.toFixed(2)}px,${my.toFixed(2)}px)`;

    if (k >= SETTLE_AT && !collapsed) {
      collapsed = true;
      flashes.push(
        t.animate(mass, [{ transform: `${at} scale(1)` }, { transform: `${at} scale(0)` }], { duration: SETTLE_MS, easing: 'cubic-bezier(.6,0,.9,.3)' }),
        t.animate(core, [{ opacity: 0 }, { opacity: 1, offset: 0.35 }, { opacity: 0 }], { duration: SETTLE_MS, easing: 'linear' }),
        t.animate(ring, [{ transform: `${at} scale(.8)`, opacity: 0.95 }, { transform: `${at} scale(2.6)`, opacity: 0 }], { duration: 180, easing: 'cubic-bezier(.2,.7,.3,1)' })
      );
    } else if (!collapsed) {
      mass.style.transform = at;
    }

    for (const ch of chars) {
      const vx = ch.box.cx - mx;
      const vy = ch.box.cy - my;
      const d = Math.max(Math.hypot(vx, vy), 0.001);
      if (!revealedAt.has(ch)) {
        if (d >= 1.7 * fs && fade === 1) continue;
        revealedAt.set(ch, ms);
      }

      // The settle term guarantees full opacity by the end, however late a char was reached.
      const shown = Math.max(t.glide(t.clamp((ms - revealedAt.get(ch)) / 200)), 1 - fade);
      ch.style.opacity = shown.toFixed(3);

      const push = Math.min((RE * RE) / d, 0.9 * RE) * Math.exp(-d / (2.2 * fs)) * fade;
      const dx = (vx / d) * push;
      const dy = (vy / d) * push;
      const s = 1 + ((0.55 * RE) / (d + RE)) * fade;
      const a = Math.atan2(vy, vx) + Math.PI / 2;
      ch.style.transform = `translate(${dx.toFixed(2)}px,${dy.toFixed(2)}px) rotate(${a.toFixed(2)}rad) scaleX(${s.toFixed(2)}) rotate(${(-a).toFixed(2)}rad)`;

      const off = Math.max(d - RE, 0) / (0.75 * RE);
      const heat = Math.exp(-off * off) * fade;
      // currentColor on the color property resolves to the inherited colour, so both themes settle right.
      ch.style.color = heat > 0.01 ? `color-mix(in srgb, ${HOT} ${(heat * 100).toFixed(1)}%, currentColor)` : '';
    }
  });

  if (t.stopped) return;
  for (const ch of chars) {
    ch.style.opacity = '1';
    ch.style.transform = 'none';
    ch.style.color = '';
  }
  await Promise.all(flashes.map((f) => f.finished.catch(() => {})));
  layer.remove();
}
