/* The 3D layer's entry. The loader imports this bundle and calls boot(): every part is
   built, every shader compiled and every texture uploaded before the page is shown, so
   nothing hitches later. Each figure then takes over from its Canvas 2D twin, which
   stays in the page as the fallback for machines that cannot run this. */
import {detectTier, breathe} from './core.js';
import * as introMod from './intro.js';
import * as helixMod from './helix.js';
import * as chipMod from './chip.js';
import * as plateMod from './plate.js';
import * as eclipseMod from './eclipse.js';
import * as dxMod from './dx.js';
import {prepare as prepareForge} from './forge/index.js';

const root = document.documentElement;
const themeNow = () => (root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');

/* Where each figure mounts: host gets the .gl class, twin is the element it sits over. */
const FIGS = [
  {key: 'helix', mod: helixMod, weight: 2, host: () => document.getElementById('genome'), twin: h => h.querySelector('canvas')},
  {key: 'chip', mod: chipMod, weight: 4, host: () => document.getElementById('reel'), twin: h => h.querySelector('.reel-chip')},
  {key: 'plate', mod: plateMod, weight: 4, host: () => document.querySelector('.cpu-view'), twin: () => null, bleed: .16},
  {key: 'dx', mod: dxMod, weight: 3, host: () => document.querySelector('.dx:not([hidden]) .dx-view'), twin: () => null, bleed: .1},
  {key: 'eclipse', mod: eclipseMod, weight: 1, host: () => document.querySelector('.eclipse'), twin: h => h.querySelector('svg')},
];

const api = window.__gfx = {tier: 'low', intro: null, stop() {}};
let observers = [], mounted = [];

/* The figure's canvas copies its twin's box, so the page's layout decides the size. */
function fit(entry) {
  const {canvas, twin, host, part, bleed = 0} = entry, b = twin || host, svg = twin instanceof SVGElement;
  const r = b.getBoundingClientRect(), w0 = svg ? r.width : b.clientWidth || r.width, h0 = svg ? r.height : b.clientHeight || r.height;
  if (!w0 || !h0) return;
  const o = svg ? host.getBoundingClientRect() : null, bx = Math.round(w0 * bleed), by = Math.round(h0 * bleed), w = w0 + 2 * bx, h = h0 + 2 * by;
  canvas.style.left = (svg ? r.left - o.left : twin ? twin.offsetLeft : -bx) + 'px';
  canvas.style.top = (svg ? r.top - o.top : twin ? twin.offsetTop : -by) + 'px';
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  part.resize(w, h);
}

async function prepareFig(fig, tier, report) {
  const host = fig.host();
  if (!host) return null;
  const twin = fig.twin(host), canvas = document.createElement('canvas');
  canvas.className = 'gl-fig';
  canvas.setAttribute('aria-hidden', 'true');
  if (twin) twin.after(canvas); else host.appendChild(canvas);
  const part = await fig.mod.create({canvas, tier, preserve: false, theme: themeNow()});
  const entry = {key: fig.key, host, twin, canvas, part, bleed: fig.bleed};
  fit(entry);
  await part.prepare();
  report(1);
  await breathe();
  return entry;
}

function mount(entry) {
  entry.host.classList.add('gl');
  fit(entry);
  api[entry.key] = {draw: state => entry.part.draw(state), part: entry.part};
  mounted.push(entry);
  const ro = new ResizeObserver(() => fit(entry));
  ro.observe(entry.twin || entry.host);
  observers.push(ro);
}

/* report(k) takes 0..1 across the whole GL load. Resolves once it is all warm. */
export async function boot({report = () => {}, wantIntro = true, press, word} = {}) {
  const tier = api.tier = detectTier();
  if (tier === 'low') return {three: false};
  /* key legends and chip text are drawn with the page's own type */
  try { await document.fonts.ready; } catch (e) { /* draw with the fallback */ }

  const wantForge = innerWidth >= 1024;
  const total = (wantIntro ? 10 : 0) + FIGS.reduce((s, f) => s + f.weight, 0) + (wantForge ? 5 : 0);
  let done = 0;
  const step = w => { done += w; report(done / total); };

  if (wantIntro && press) {
    try {
      const canvas = document.createElement('canvas');
      canvas.className = 'press-gl';
      canvas.setAttribute('aria-hidden', 'true');
      press.querySelector('.press-rig').after(canvas);
      const intro = await introMod.create({canvas, tier, press, word});
      await intro.prepare(k => report((done + k * 10) / total));
      step(10);
      /* a load past LOAD_MAX can finish after the press run has already cleared */
      if (press.isConnected) api.intro = intro; else intro.dispose();
    } catch (e) {
      console.error('intro', e);
      step(10);
    }
    await breathe();
  }

  const entries = [];
  for (const fig of FIGS) {
    try {
      const entry = await prepareFig(fig, tier, k => report((done + k * fig.weight) / total));
      if (entry) entries.push(entry);
    } catch (e) {
      console.error(fig.key, e);
    }
    step(fig.weight);
  }
  /* the products in the empty spaces, on the web only */
  let forge = null;
  if (wantForge) {
    try {
      forge = await prepareForge(k => report((done + k * 5) / total));
    } catch (e) {
      console.error('forge', e);
    }
    step(5);
  }
  /* Still or reduced motion arrived during the build: nothing mounts, the twins stay. */
  if (!root.classList.contains('motion')) {
    if (forge) forge.stop();
    entries.forEach(e => { try { e.part.dispose(); } catch (err) { /* the context may already be gone */ } e.canvas.remove(); });
    if (api.intro) { try { api.intro.dispose(); } catch (err) { /* same */ } api.intro = null; }
    return {three: false};
  }
  entries.forEach(mount);
  if (forge) forge.start();

  const themeObserver = new MutationObserver(() => {
    const t = themeNow();
    mounted.forEach(e => e.part.setTheme && e.part.setTheme(t));
  });
  themeObserver.observe(root, {attributes: true, attributeFilter: ['data-theme']});
  observers.push(themeObserver);

  /* The Still control and a reduced-motion change: every figure hands back to its twin. */
  api.stop = () => {
    if (forge) forge.stop();
    observers.forEach(o => o.disconnect());
    observers = [];
    mounted.forEach(e => {
      e.host.classList.remove('gl');
      delete api[e.key];
      try { e.part.dispose(); } catch (err) { /* the context may already be gone */ }
      e.canvas.remove();
    });
    mounted = [];
    if (api.intro) { try { api.intro.skip(); api.intro.dispose(); } catch (err) { /* same */ } api.intro = null; }
  };
  return {three: true, intro: !!api.intro, forge: !!forge};
}
