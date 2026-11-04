/* Every section's headline is set by a different technology of the future, and each one chosen
   for what that headline says. Its own small bundle: no shaders, and it never holds up the load.
   An effect is one file exporting css, play(t) and, if it wants them, accents with accent(t), or
   arm(t, play) to decide for itself when to run. Whatever it does, the real text comes back. */
import {setType} from './kit.js';
import * as swarm from './swarm.js';
import * as stream from './stream.js';
import * as holo from './holo.js';
import * as proof from './proof.js';
import * as photon from './photon.js';
import * as quantum from './quantum.js';
import * as lens from './lens.js';
import * as echo from './echo.js';
import * as train from './train.js';
import * as signal from './signal.js';

const FX = {swarm, stream, holo, proof, photon, quantum, lens, echo, train, signal};
const MAX_MS = 8000;
/* A headline starts at the reading line, not as it edges in at the foot of the screen, where it would
   be over before the reader got to it. A reader who stops short of the line gets it once they settle. */
const LINE = '-28%', FOOT = '-12%', STILL_MS = 600;

const BASE = `
.ty-on{position:relative}
.ty-l{display:block;position:relative;white-space:nowrap}
.ty-w,.ty-c,.ty-s{display:inline-block}
.ty-w{position:relative;white-space:nowrap}
.ty-o{position:absolute;inset:0;display:block;pointer-events:none}
`;

const entries = [];
const waiting = new Set();
let armed = false, io = null, near = null, off = null, idle = 0, stopped = false;
/* phones keep it simple: each effect plays once there */
const again = () => innerWidth >= 1024;

function finish(e) {
  if (e.t && !e.finished) e.t.restore();
  e.finished = true;
  e.el.classList.remove('ty-run');
  e.el.classList.add('in');
}

async function go(e) {
  if (e.played || stopped) return;
  e.played = true;
  waiting.delete(e);
  if (io) { io.unobserve(e.el); near.unobserve(e.el); }
  e.el.classList.add('ty-run');
  const run = e.accent ? e.mod.accent : e.mod.play, t = e.t;
  try {
    await Promise.race([run(t), new Promise(res => setTimeout(res, MAX_MS * (window.__typeSlow || 1)))]);
  } catch (err) {
    console.error('type', e.name, err);
  }
  /* a replay may have prepared this element again since this run began */
  if (e.t !== t) return;
  finish(e);
  rearm(e);
}

/* Nothing here plays only once: when an effect has left the screen entirely it is set up again, to
   play on the reader's next arrival, from above or below. A caption in the reel never leaves the
   screen as such, so its effect says when it has gone. */
function rearm(e) {
  if (stopped || !io || !again()) return;
  if (e.mod.leave && !e.accent) e.mod.leave(e.t, () => { if (!stopped && e.t) prepare(e); });
  else off.observe(e.el);
}

function back(e) {
  if (stopped || !again()) return;
  prepare(e);
  if (!e.t) return;
  near.observe(e.el);
  if (!e.accent) io.observe(e.el);
}

function prepare(e) {
  e.played = false;
  e.finished = false;
  e.el.classList.remove('ty-done', 'in');
  /* whatever the last play left behind, such as the open channel's dot, goes before the type is set again */
  e.el.querySelectorAll('.ty-open').forEach(n => n.remove());
  /* not laid out here, such as a heading hidden at this width: leave it as plain text */
  if (!e.el.getClientRects().length) { e.t = null; e.played = e.finished = true; e.el.classList.add('ty-done'); return; }
  e.t = setType(e.el, e.name, e.accent);
  if (!e.t) { e.played = e.finished = true; e.el.classList.add('ty-done'); return; }
  if (e.mod.arm && !e.accent) e.mod.arm(e.t, () => go(e));
}

function settle() {
  clearTimeout(idle);
  idle = setTimeout(() => waiting.forEach(e => go(e)), STILL_MS);
}

function watch() {
  const entry = el => entries.find(y => y.el === el);
  const opts = margin => ({rootMargin: `0px 0px ${margin} 0px`, threshold: .15});
  io = new IntersectionObserver(list => {
    list.forEach(x => { if (x.isIntersecting) go(entry(x.target)); });
  }, opts(LINE));
  let lifted = false;
  near = new IntersectionObserver(list => {
    list.forEach(x => {
      const e = entry(x.target);
      /* an accent sits among rows that are already showing, so it never waits for the line */
      if (x.isIntersecting && e.accent) go(e);
      else if (x.isIntersecting) waiting.add(e);
      else waiting.delete(e);
    });
    /* whatever is on screen as the press run clears plays at once: nobody is scrolling yet */
    if (!lifted) { lifted = true; waiting.forEach(e => go(e)); }
    else if (waiting.size) settle();
  }, opts(FOOT));
  off = new IntersectionObserver(list => {
    list.forEach(x => {
      if (x.isIntersecting) return;
      off.unobserve(x.target);
      back(entry(x.target));
    });
  });
  entries.forEach(e => {
    if (e.played || (e.mod.arm && !e.accent)) return;
    near.observe(e.el);
    if (!e.accent) io.observe(e.el);
  });
  addEventListener('scroll', () => { if (waiting.size) settle(); }, {passive: true});
}

/* the page calls this once the press run has cleared */
function arm() {
  if (armed) return;
  armed = true;
  watch();
}

function stop() {
  stopped = true;
  clearTimeout(idle);
  waiting.clear();
  if (io) { io.disconnect(); near.disconnect(); off.disconnect(); }
  entries.forEach(finish);
}

export async function start() {
  try { await document.fonts.ready; } catch (err) { /* measure with what there is */ }
  const sheet = document.createElement('style');
  sheet.textContent = BASE + Object.values(FX).map(m => m.css || '').join('\n');
  document.head.appendChild(sheet);

  document.querySelectorAll('[data-type]').forEach(el => {
    const mod = FX[el.dataset.type];
    if (mod) entries.push({el, name: el.dataset.type, mod, accent: false});
  });
  for (const name in FX) {
    const mod = FX[name];
    if (mod.accents && mod.accent) document.querySelectorAll(mod.accents).forEach(el => entries.push({el, name, mod, accent: true}));
  }
  entries.forEach(prepare);

  /* a width change before an effect has run: measure it again */
  let w = innerWidth, timer = 0;
  addEventListener('resize', () => {
    if (innerWidth === w) return;
    w = innerWidth;
    clearTimeout(timer);
    timer = setTimeout(() => entries.forEach(e => {
      if (e.played || !e.t || stopped) return;
      e.t.restore();
      prepare(e);
    }), 200);
  }, {passive: true});
  addEventListener('beforeprint', stop);

  window.__type = {
    stop,
    arm,
    /* for checking an effect: replay('swarm'), or replay() for all that are on screen */
    replay(name) {
      entries.filter(e => !name || e.name === name).forEach(e => {
        finish(e);
        prepare(e);
        go(e);
      });
    },
  };
  if (window.__typeArmed) arm();
}
