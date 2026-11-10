const HOT = '#ff6a45';
const EASE = 'cubic-bezier(.2,.9,.2,1)';
const STEP = 1.5;
const TAU = Math.PI * 2;

export const css = `
.ty-signal .ty-c,.ty-signal-a .ty-c{opacity:0;transform-origin:50% 100%}
.motion .ty-open{display:inline-block;width:.16em;height:.16em;margin-left:.22em;border-radius:50%;background:#ff6a45;vertical-align:.12em;animation:ty-open-beat 1.6s ease-in-out infinite}
@keyframes ty-open-beat{50%{opacity:.3;transform:scale(.72)}}
`;

function buildTraces(t) {
  const byLine = new Map();
  for (const ch of t.chars) {
    if (!byLine.has(ch.line)) byLine.set(ch.line, []);
    byLine.get(ch.line).push(ch);
  }
  const sigma = t.fs * .06;
  return [...byLine.keys()].sort((a, b) => a - b).map((key, n) => {
    const chars = byLine.get(key).sort((a, b) => a.box.cx - b.box.cx);
    const x0 = Math.min(...chars.map((ch) => ch.box.x));
    const x1 = Math.max(...chars.map((ch) => ch.box.x + ch.box.w));
    const y = Math.max(...chars.map((ch) => ch.box.base)) + t.fs * .13;
    // Sampled once so the frame loop never walks every char per point.
    const spike = new Float32Array(Math.ceil((x1 - x0) / STEP) + 2);
    for (const ch of chars) {
      const mid = (ch.box.cx - x0) / STEP;
      const reach = Math.ceil(sigma * 3 / STEP);
      const from = Math.max(0, Math.floor(mid - reach));
      const to = Math.min(spike.length - 1, Math.ceil(mid + reach));
      for (let i = from; i <= to; i++) {
        const u = (i - mid) * STEP / sigma;
        spike[i] = Math.max(spike[i], Math.exp(-u * u));
      }
    }
    const rng = t.rng(41 + n * 7);
    return {
      chars, x0, x1, y, spike,
      L: Math.max(1, x1 - x0),
      next: 0,
      phases: [rng() * TAU, rng() * TAU, rng() * TAU],
    };
  });
}

async function run(t, ms, fade, keepDot) {
  const c = t.canvas(.6);
  const { ctx, ox, oy } = c;
  const fs = t.fs;
  const traces = buildTraces(t);
  const span = .96 / Math.max(1, traces.length);
  const waves = [[.9, .5, .0031], [.37, .3, -.0047], [.19, .2, .0073]];
  const settling = [];

  const decode = (ch) => {
    const color = getComputedStyle(ch).color;
    const a = t.animate(ch, [
      { opacity: 0, transform: 'translateY(.3em) scaleY(.2)', color: HOT },
      { opacity: 1, transform: 'none', color },
    ], { duration: 240, easing: EASE });
    settling.push(a.finished.catch(() => {}));
  };

  const draw = (tr, hx, now) => {
    const at = (x) => {
      const d = Math.max(0, hx - x);
      const calm = Math.exp(-d / (fs * 1.8));
      let noise = 0;
      for (let i = 0; i < waves.length; i++) {
        const w = waves[i];
        noise += w[1] * Math.sin(x * TAU / (w[0] * fs) + tr.phases[i] + now * w[2]);
      }
      const s = tr.spike[Math.round((x - tr.x0) / STEP)] || 0;
      return tr.y + (noise * fs * .1 - s * fs * .55) * calm;
    };
    const end = Math.min(hx, tr.x1);
    ctx.beginPath();
    ctx.moveTo(ox + tr.x0, oy + at(tr.x0));
    for (let x = tr.x0 + STEP; x < end; x += STEP) ctx.lineTo(ox + x, oy + at(x));
    ctx.lineTo(ox + end, oy + at(end));
    const g = ctx.createLinearGradient(ox + hx - tr.L, 0, ox + hx, 0);
    g.addColorStop(0, 'rgba(224,100,79,0)');
    g.addColorStop(.72, HOT);
    ctx.strokeStyle = g;
    ctx.lineWidth = 1.25;
    ctx.lineJoin = 'round';
    ctx.shadowColor = HOT;
    ctx.shadowBlur = 8;
    ctx.stroke();
    return at(end);
  };

  t.animate(c.canvas, [{ opacity: 1 }, { opacity: 0 }], { duration: fade, delay: ms - fade });

  await t.frame(ms, (k, now) => {
    if (t.stopped) return;
    ctx.clearRect(0, 0, c.W, c.H);
    traces.forEach((tr, n) => {
      const p = (k - n * span) / span;
      if (p <= 0) return;
      // The head runs on past the line end so a finished trace calms and fades out.
      const hx = tr.x0 + tr.L * p;
      while (tr.next < tr.chars.length && tr.chars[tr.next].box.cx <= hx) {
        decode(tr.chars[tr.next++]);
      }
      if (p >= 2) return;
      const hy = draw(tr, hx, now);
      if (p < 1) {
        ctx.beginPath();
        ctx.arc(ox + hx, oy + hy, 2.5, 0, TAU);
        ctx.fillStyle = '#ff5a3c';
        ctx.shadowColor = '#ff5a3c';
        ctx.shadowBlur = 14;
        ctx.fill();
      }
    });
  });
  if (t.stopped) return;
  // A very short final line can leave chars past the last sampled frame.
  traces.forEach((tr) => {
    while (tr.next < tr.chars.length) decode(tr.chars[tr.next++]);
  });
  await Promise.all(settling);
  if (t.stopped || !keepDot) return;
  t.keep(() => {
    const dot = document.createElement('span');
    dot.className = 'ty-open';
    dot.setAttribute('aria-hidden', 'true');
    t.el.appendChild(dot);
  });
}

export async function play(t) {
  await run(t, 1900, 200, true);
}

export const accents = '.ad-head';

export async function accent(t) {
  // 200ms of fade would swallow most of a 700ms pass, so the accent fades faster.
  await run(t, 700, 120, false);
}
