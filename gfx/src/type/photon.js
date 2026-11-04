// Coherent light runs through waveguides under the type; letters diffract, then cool to ink.
export const css = `
.ty-photon .ty-c{color:transparent;-webkit-text-stroke:.012em var(--line)}
.ty-photon .ty-guide{position:absolute;left:0;height:1px;background:var(--line)}
.ty-photon .ty-ph{position:absolute;width:.34em;height:3px;border-radius:3px;background:#fff;box-shadow:0 0 10px 3px #29d3ff,0 0 24px 8px rgba(41,211,255,.45)}
.ty-photon .ty-flash{background:linear-gradient(90deg,rgba(41,211,255,0),rgba(41,211,255,.13) 50%,rgba(41,211,255,0));opacity:0;pointer-events:none}
`;

const TAIL = .32;
const FLASH_AT = .55;
const SECOND_START = .12;

// Hue and alpha are quantised so a char only touches the style when the result really changes.
function restyle(ch, s) {
  const key = s === 'ink' ? 'ink' : s === 'dark' ? 'dark' : `${Math.round(s.hue)}|${Math.round(s.mix * 40)}`;
  if (ch.ph === key) return;
  ch.ph = key;
  if (s === 'dark') return;
  const st = ch.style;
  if (s === 'ink') {
    st.color = 'inherit';
    st.webkitTextStroke = '0';
    st.textShadow = 'none';
    return;
  }
  const spectral = `hsl(${s.hue} 95% 48%)`;
  // Mixing toward the ink variable keeps the decay correct on both themes.
  st.color = `color-mix(in srgb, ${spectral} ${s.mix * 100}%, var(--ink))`;
  st.webkitTextStroke = '0';
  st.textShadow = `0 0 ${.18 * s.mix}em hsl(${s.hue} 95% 48% / ${.7 * s.mix})`;
}

export async function play(t) {
  const geo = t.lines.map((_, i) => {
    const chars = t.chars.filter((c) => c.line === i);
    const x0 = Math.min(...chars.map((c) => c.box.x));
    const x1 = Math.max(...chars.map((c) => c.box.x + c.box.w));
    return { chars, x0, x1, base: chars[0].box.base };
  });

  const ov = t.overlay('ty-photon-layer');
  const flash = t.overlay('ty-flash');
  flash.style.cssText = `right:auto;width:${t.textW}px`;
  const phW = t.fs * .34;

  const rails = geo.map((g, i) => {
    const guide = document.createElement('span');
    guide.className = 'ty-guide';
    guide.style.top = `${g.base}px`;
    guide.style.left = `${g.x0}px`;
    guide.style.width = `${g.x1 - g.x0}px`;
    const ph = document.createElement('span');
    ph.className = 'ty-ph';
    ph.style.left = '0';
    ph.style.top = `${g.base - 1}px`;
    ph.style.opacity = '0';
    ov.append(guide, ph);
    const rtl = i % 2 === 1;
    const start = rtl ? SECOND_START : 0;
    return { guide, ph, g, rtl, start, end: start + (FLASH_AT - SECOND_START) };
  });

  let flashed = false;
  let flashAnim = null;
  let faded = false;
  const fades = [];

  await t.frame(1500, (k) => {
    if (t.stopped) return;
    for (const r of rails) {
      // The front runs on past the guide's end, so the last letters still cool on schedule.
      const p = (k - r.start) / (r.end - r.start);
      const span = r.g.x1 - r.g.x0;
      const front = r.rtl ? r.g.x1 - p * span : r.g.x0 + p * span;
      const atGuide = t.clamp(front, r.g.x0, r.g.x1);
      r.ph.style.transform = `translate3d(${atGuide - phW / 2}px,0,0)`;
      // Light enters and leaves its guide softly so neither end pops.
      const inA = t.clamp(p / .06);
      const outA = t.clamp((1.04 - p) / .1);
      r.ph.style.opacity = k < r.start ? '0' : String(Math.min(inA, outA));

      for (const ch of r.g.chars) {
        const d = (r.rtl ? ch.box.cx - front : front - ch.box.cx) / t.W;
        if (k < r.start || d < 0) { restyle(ch, 'dark'); continue; }
        if (d >= TAIL) { restyle(ch, 'ink'); continue; }
        restyle(ch, { hue: 190 + d * 900, mix: 1 - t.glide(d / TAIL) });
      }
    }

    if (!flashed && k >= FLASH_AT) {
      flashed = true;
      flashAnim = t.animate(flash, [{ opacity: 0 }, { opacity: 1, offset: .4 }, { opacity: 0 }], { duration: 260, easing: 'ease-out' });
    }

    if (!faded && k >= .78) {
      faded = true;
      for (const r of rails) {
        fades.push(t.animate(r.guide, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, easing: 'ease-out' }).finished);
      }
    }
  });

  if (t.stopped) return;
  if (flashAnim) await flashAnim.finished.catch(() => {});
  await Promise.all(fades).catch(() => {});
  for (const r of rails) r.ph.style.opacity = '0';
  // Explicit final state, so the engine's swap to real text shows no jump.
  for (const ch of t.chars) {
    ch.style.color = 'inherit';
    ch.style.webkitTextStroke = '0';
    ch.style.textShadow = 'none';
    ch.style.opacity = '1';
    ch.style.transform = 'none';
  }
}
