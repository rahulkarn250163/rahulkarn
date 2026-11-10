/* Every topic forms something. On each section's stage (a .stage box in the page) a real product is put
   together piece by piece as the reader arrives, the way the computer's parts land in the press run, and it
   plays again on every arrival. It turns with the scroll, the reader can take hold of its stage and turn it by
   hand, and a hard scroll shakes it apart until the page settles.
   A product with a scrub() is run by the scroll instead of the clock: where you are in the section is how far
   it has been built, in either direction.
   One renderer draws them all and copies each to its own canvas in the page, so the browser
   scrolls it with the type and no frame of ours can hold the scroll up, while everything is compiled
   only once. All of it is built during the load, like every other figure. Web widths only. */
import {THREE, createStage, studioEnv, breathe} from '../core.js';
import * as vault from './vault.js';
import * as tower from './tower.js';
import * as stack from './stack.js';
import * as trio from './trio.js';
import * as orrery from './orrery.js';
import * as jet from './jet.js';
import * as scholar from './scholar.js';
import * as satellite from './satellite.js';

const MIN_WIDTH = 1024, FOV = 20;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const mix = (a, b, k) => a + (b - a) * k;
const smooth = x => x * x * (3 - 2 * x);

/* ---- where each one goes: the empty space, measured from the page's own type ---- */
const docOf = el => {
  const b = el.getBoundingClientRect();
  return {l: b.left + scrollX, t: b.top + scrollY, r: b.right + scrollX, b: b.bottom + scrollY};
};
/* how far right the words really reach: block boxes run the full column, so this reads the text itself */
function inkRight(els) {
  let m = 0;
  const range = document.createRange();
  els.forEach(el => {
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) {
      if (!w.currentNode.nodeValue.trim()) continue;
      range.selectNodeContents(w.currentNode);
      for (const b of range.getClientRects()) m = Math.max(m, b.right);
    }
  });
  return m + scrollX;
}
const pageRight = () => document.documentElement.clientWidth - 4;
const box = (l, r, t, b) => ({cx: (l + r) / 2, w: r - l, h: b - t, cy: (t + b) / 2});

/* a model's stage in the page, drawn in by pad so its captions and corner marks stay clear */
const stageOf = id => document.querySelector('.stage[data-stage="' + id + '"]');
function staged(id, pad = .09) {
  const el = stageOf(id);
  if (!el || !el.getClientRects().length) return null;
  const b = docOf(el), px = (b.r - b.l) * pad, py = (b.b - b.t) * pad;
  return {r0: box(b.l + px, b.r - px, b.t + py, b.b - py)};
}
/* a stage, and then a column left free beside the section's rows that the model follows the reader down */
function pinned(id, secId, rows) {
  const b = staged(id), sec = document.getElementById(secId);
  if (!b || !sec) return b;
  const col = inkRight([...document.querySelectorAll(rows)]) + 30, w = pageRight() - col, H = innerHeight;
  if (w < 230) return b;
  const r1 = box(col, pageRight(), 0, Math.min(H * .74, w * 1.25));
  return {r0: b.r0, r1, y0: b.r0.cy, y1: Math.max(b.r0.cy, docOf(sec).b - r1.h / 2 - 16)};
}

const DEFS = [
  {id: 'hero', mod: vault, place: () => staged('hero', .03)},
  {id: 'about', mod: tower, place: () => staged('about')},
  {id: 'skills', mod: stack, place() {
    const b = staged('skills', .05);
    if (!b) return null;
    /* a small window where the code is written, and the stack forming beside it */
    const r = b.r0, l = r.cx - r.w / 2, top = r.cy - r.h / 2, ww = Math.min(268, Math.round(r.w * .52)), wh = 180;
    if (r.w < ww + 180) return b;
    return {r0: box(l + ww + 8, l + r.w, top, top + r.h), win: {x: Math.round(l), y: Math.round(r.cy - wh / 2), w: ww}};
  }},
  {id: 'cases', mod: trio, place: () => staged('cases', .06)},
  {id: 'oss', mod: orrery, place: () => staged('oss', .05)},
  {id: 'exp', mod: jet, place: () => pinned('exp', 'experience', '#experience .timeline-block')},
  {id: 'edu', mod: scholar, place: () => pinned('edu', 'education', '#education .edu-card')},
  {id: 'contact', mod: satellite, place: () => staged('contact', .07)},
];

/* room round the empty space for the parts still in the air */
const AIR = .3;

function makeEntry(def) {
  const host = document.createElement('div'), canvas = document.createElement('canvas');
  host.className = 'forge-host';
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = 'position:absolute;z-index:6;pointer-events:none';
  canvas.style.cssText = 'position:sticky;display:block;pointer-events:none;visibility:hidden';
  host.appendChild(canvas);
  document.body.appendChild(host);
  /* spin and tilt are what the reader's hand has added; vspin carries the turn on after they let go */
  return {def, prod: null, host, canvas, ctx: canvas.getContext('2d'), t0: null, play: null, ok: false, shown: false, r0: null, r1: null, y0: 0, y1: 0, left: 0, cw: 1, ch: 1, pw: 1, ph: 1,
    stage: stageOf(def.id), spin: 0, tilt: 0, vspin: 0, held: false, apart: 0};
}

function layout(e, W, H, dpr) {
  const m = e.def.place();
  e.ok = !!(m && m.r0.w >= 150 && m.r0.h >= 110);
  if (!e.ok) { e.host.style.display = 'none'; return; }
  e.host.style.display = 'block';
  e.r0 = m.r0;
  e.r1 = m.r1 || m.r0;
  e.y0 = m.y0 === undefined ? m.r0.cy : m.y0;
  e.y1 = m.y1 === undefined ? e.y0 : m.y1;
  const w = Math.max(e.r0.w, e.r1.w), h = Math.max(e.r0.h, e.r1.h), left = Math.max(0, Math.floor(e.r0.cx - e.r0.w / 2 - e.r0.w * AIR)), right = Math.min(W, Math.ceil(Math.max(e.r0.cx, e.r1.cx) + w / 2 + w * AIR));
  const cw = right - left, ch = Math.min(Math.ceil(h * (1 + AIR * 2)), Math.ceil(H * 1.15));
  e.left = left;
  /* the host spans the stretch the product travels; the canvas sticks in the middle of the screen along it */
  e.host.style.left = left + 'px';
  const hostTop = Math.round(e.y0 - ch / 2);
  e.host.style.top = hostTop + 'px';
  e.hostTop = hostTop;
  if (e.prod.place) e.prod.place(m.win ? {x: m.win.x - left, y: m.win.y - hostTop, w: m.win.w} : null);
  e.host.style.width = cw + 'px';
  e.host.style.height = Math.round(e.y1 - e.y0 + ch) + 'px';
  e.canvas.style.top = Math.round((H - ch) / 2) + 'px';
  e.canvas.style.width = cw + 'px';
  e.canvas.style.height = ch + 'px';
  e.cw = cw;
  e.ch = ch;
  const pw = Math.round(cw * dpr), ph = Math.round(ch * dpr);
  if (pw !== e.pw || ph !== e.ph) { e.pw = pw; e.ph = ph; e.canvas.width = pw; e.canvas.height = ph; }
}

function pose(prod, t, spread, clock = t, where = null) {
  for (const c of prod.pieces) {
    const reach = c.reach || prod.reach || 2.4;
    const k = (t - c.at) / c.dur;
    if (k <= 0) { c.obj.visible = false; continue; }
    c.obj.visible = true;
    const f = c.from, h = c.home;
    c.size ??= c.obj.scale.clone();
    if (k >= 1) {
      c.obj.position.set(h.x + f[0] * spread, h.y + f[1] * spread, h.z + f[2] * spread);
      c.obj.rotation.copy(c.rot);
      c.obj.scale.copy(c.size);
      continue;
    }
    const a = Math.pow(1 - k, c.heavy ? 2.6 : 3.6), b = Math.pow(1 - k, 2.4) * 3, d = a * reach + spread, grow = Math.min(1, k * 7);
    c.obj.position.set(h.x + f[0] * d, h.y + f[1] * d, h.z + f[2] * d);
    c.obj.rotation.set(c.rot.x + c.spin[0] * b, c.rot.y + c.spin[1] * b, c.rot.z + c.spin[2] * b);
    c.obj.scale.set(c.size.x * grow, c.size.y * grow, c.size.z * grow);
  }
  /* where: {u, s, H}, the stage's place on screen, the scroll and the screen's height, for a product the scroll works */
  if (prod.tick) prod.tick(t, clock, where);
}

/* Built during the load: every product, its programs and its buffers, so none of it hitches later. */
export async function prepare(report = () => {}) {
  const sheet = document.createElement('style');
  sheet.textContent = `@media print{.forge-host{display:none!important}}
.fg-win{position:absolute;box-sizing:border-box;z-index:1;background:var(--bg);border:1px solid var(--line);border-radius:6px;box-shadow:0 12px 30px rgba(0,0,0,.14);overflow:hidden;contain:layout paint;font:11px/17px ui-monospace,"Cascadia Code",Consolas,Menlo,monospace;color:var(--text);opacity:0}
.fg-bar{display:flex;align-items:center;gap:5px;height:24px;padding:0 10px;border-bottom:1px solid var(--line);background:var(--wash);color:var(--mid);font-size:10px}
.fg-bar i{width:7px;height:7px;border-radius:50%;background:var(--line)}
.fg-bar i:first-child{background:var(--red)}
.fg-bar span{margin-left:6px}
.fg-code{padding:7px 0 8px}
.fg-l{height:17px;padding:0 10px;white-space:pre}
.fg-l.on{background:var(--wash)}
.fg-l.on::after{content:'';display:inline-block;width:6px;height:12px;margin-left:1px;vertical-align:-2px;background:var(--red)}
.fg-k{color:var(--red)}
.fg-m{font-weight:700;color:var(--ink)}
.fg-s{color:var(--mid)}
.fg-beam{position:absolute;left:0;top:0;width:1px;height:1px;background:var(--red);transform-origin:0 50%;opacity:0;will-change:transform}`;
  document.head.appendChild(sheet);
  const W = () => document.documentElement.clientWidth, H = () => document.documentElement.clientHeight;

  /* the one renderer, which never goes in the page */
  const stage = createStage(document.createElement('canvas'), {alpha: true, fov: FOV, exposure: 1.02, near: 1, far: 100});
  const {scene, camera, renderer} = stage;
  scene.environment = studioEnv(renderer, {mood: 'paper'});
  scene.environmentIntensity = 1.05;
  const key = new THREE.DirectionalLight(0xfff4e6, 2.3), rim = new THREE.DirectionalLight(0xdfe8ff, 1.2);
  key.position.set(4, 7, 6);
  rim.position.set(-6, 3, -5);
  scene.add(key, rim);
  renderer.setScissorTest(true);

  const live = [];
  let bufW = 1, bufH = 1;
  function measure() {
    const w = W(), h = H(), dpr = Math.min(devicePixelRatio || 1, 2);
    live.forEach(e => layout(e, w, h, dpr));
    /* the drawing buffer holds the largest of them; each draws into its corner */
    const mw = Math.max(1, ...live.filter(e => e.ok).map(e => e.cw)), mh = Math.max(1, ...live.filter(e => e.ok).map(e => e.ch));
    if (mw !== bufW || mh !== bufH) { bufW = mw; bufH = mh; stage.size(mw, mh); }
  }

  /* set one product where it belongs in its canvas, at the size its space allows */
  const where = {u: 0, s: 0, H: 1};
  function aim(e, x, w, h, u, t, spread, clock = t) {
    const {prod} = e, v = prod.view ? prod.view(t, clock) : prod, scale = Math.min(w / 2 / v.ex, h / 2 / v.ey), D = (e.ch / (2 * Math.tan(FOV * Math.PI / 360))) / scale;
    where.u = u; where.s = view.s; where.H = view.H;
    pose(prod, t, spread, clock, where);
    prod.root.rotation.set(v.pitch + u * .24 + e.tilt, v.yaw - u * 1.15 * (prod.turn || 1) + Math.sin(clock * .35) * .06 + e.spin, v.roll || 0);
    prod.root.position.set(v.dx || 0, v.dy || 0, 0);
    camera.position.set(0, 0, D);
    camera.near = Math.max(.5, D * .25);
    camera.far = D * 4;
    camera.aspect = e.cw / e.ch;
    camera.setViewOffset(e.cw, e.ch, e.cw / 2 - (x - e.left), 0, e.cw, e.ch);
  }
  /* draw it in the buffer's bottom left corner, and copy that to its canvas */
  function shoot(e) {
    live.forEach(o => { if (o.prod) o.prod.root.visible = o === e; });
    renderer.setViewport(0, 0, e.cw, e.ch);
    renderer.setScissor(0, 0, e.cw, e.ch);
    renderer.render(scene, camera);
    const src = renderer.domElement;
    e.ctx.clearRect(0, 0, e.pw, e.ph);
    e.ctx.drawImage(src, 0, src.height - e.ph, e.pw, e.ph, 0, 0, e.pw, e.ph);
  }
  /* where a point of the product falls in its host, for anything in the page drawn to meet it */
  const seen = new THREE.Vector3();
  const projector = {t: 0, e: null, at(v) {
    seen.copy(v).applyMatrix4(this.e.prod.root.matrixWorld).project(camera);
    return {x: (seen.x + 1) / 2 * this.e.cw, y: (1 - seen.y) / 2 * this.e.ch};
  }};

  for (let i = 0; i < DEFS.length; i++) {
    const e = makeEntry(DEFS[i]);
    e.prod = DEFS[i].mod.make();
    /* the stage's caption counts the parts that were really made */
    const meta = e.stage && e.stage.querySelector('.stage-meta');
    if (meta) meta.textContent = e.prod.pieces.length + ' parts';
    if (e.prod.mount) e.prod.mount(e.host);
    scene.add(e.prod.root);
    live.push(e);
    report((i + 1) / DEFS.length * .7);
    await breathe();
  }
  measure();
  /* all of them showing and landed, from far enough back to see them all, so everything compiles and uploads once */
  live.forEach(e => { pose(e.prod, 99, 0); e.prod.root.visible = true; });
  camera.position.set(0, 0, 40);
  camera.far = 200;
  camera.clearViewOffset();
  camera.aspect = bufW / bufH;
  camera.updateProjectionMatrix();
  renderer.setViewport(0, 0, bufW, bufH);
  renderer.setScissor(0, 0, bufW, bufH);
  await stage.warm();
  report(1);

  let raf = 0, alive = true, prevS = scrollY, prevT = 0, lag = 0, job = null;
  /* nothing is put together behind the opening's sheet: the clocks start when the page is really there */
  let open = !(document.documentElement.classList.contains('intro') && document.querySelector('.press'));
  const state = {frames: 0, cost: 0, on: []};
  const lit = (e, on) => { if (e.stage) e.stage.classList.toggle('on', on); };
  const hide = e => { if (e.shown) { e.shown = false; e.canvas.style.visibility = 'hidden'; lit(e, false); if (e.prod.show) e.prod.show(false); } };
  /* what the page's motor read for this frame, so nothing here reads the layout after someone has written to it */
  const view = {s: 0, g: 0, H: 0, W: 0};

  function frame(now) {
    raf = 0;
    view.s = view.g = scrollY; view.H = H(); view.W = innerWidth;
    if (draw(now)) raf = requestAnimationFrame(frame);
  }
  function draw(now) {
    if (!alive) return false;
    if (view.W < MIN_WIDTH) { live.forEach(hide); return false; }
    const c0 = performance.now(), s = view.s, dt = Math.min(64, now - prevT || 16), HH = view.H;
    prevT = now;
    lag += (clamp((s - prevS) / dt / 2.4, -1, 1) - lag) * (1 - Math.exp(-dt / 130));
    prevS = s;
    /* the turn follows the glided scroll, so a wheel step turns a product in one smooth push */
    const spread = Math.abs(lag) * .3, glide = s - view.g;
    state.on.length = 0;
    for (const e of live) {
      if (!e.ok) continue;
      const cy = clamp(s + HH / 2, e.y0, Math.max(e.y0, e.y1));
      const m = e.y1 > e.y0 ? smooth(clamp((cy - e.y0) / Math.min(HH * .36, e.y1 - e.y0))) : 0;
      const w = mix(e.r0.w, e.r1.w, m), h = mix(e.r0.h, e.r1.h, m), x = mix(e.r0.cx, e.r1.cx, m), y = cy - s;
      const top = y - h / 2, bottom = y + h / 2;
      /* entirely gone: it starts over on the next arrival */
      if (bottom < -60 || top > HH + 60) { e.t0 = null; e.play = null; e.spin = e.tilt = e.vspin = e.apart = 0; hide(e); continue; }
      if (e.t0 === null && open && y < HH * .86 && bottom > HH * .12) e.t0 = now;
      if (e.t0 === null) continue;
      if (!e.shown) { e.shown = true; e.canvas.style.visibility = 'visible'; lit(e, true); if (e.prod.show) e.prod.show(true); }
      /* let go of, a model coasts to rest and stands back up; in the hand it follows the hand, and comes a little
         apart along the lines its parts flew in on, so a reader holding it can look between them */
      if (!e.held) {
        e.spin += e.vspin * dt;
        e.vspin *= Math.exp(-dt / 320);
        e.tilt *= Math.exp(-dt / 700);
      }
      e.apart += ((e.held ? 1 : 0) - e.apart) * (1 - Math.exp(-dt / (e.held ? 260 : 170)));
      const clock = (now - e.t0) / 1000;
      let t = clock, shake = e.prod.steady ? 0 : Math.max(spread, e.apart * (e.prod.open || .3));
      if (e.prod.scrub) {
        /* how far through the section the reader is, eased so a wheel's steps do not show. With no column to travel
           down, the product builds across the time it is on screen */
        const p = e.y1 > e.y0 ? clamp((cy - e.y0) / (e.y1 - e.y0)) : clamp((s + HH * .6 - e.y0) / (HH * .7)), want = e.prod.scrub(p, e.y1 > e.y0 ? cy - e.y0 : p * 1300);
        e.play = e.play === null ? want : e.play + (want - e.play) * (1 - Math.exp(-dt / 150));
        t = e.play;
        shake = 0;
      }
      aim(e, x, w, h, (y + glide) / HH - .5, t, shake, clock);
      shoot(e);
      if (e.prod.after) { projector.t = t; projector.e = e; e.prod.after(projector); }
      state.on.push(e.def.id);
    }
    if (state.on.length) {
      state.frames++;
      state.cost += performance.now() - c0;
    }
    return state.on.length > 0;
  }
  const wake = () => {
    if (!alive) return;
    if (job) window.__motor.wake(job);
    else if (!raf) raf = requestAnimationFrame(frame);
  };

  let timer = 0;
  const relayout = () => { clearTimeout(timer); timer = setTimeout(() => { measure(); wake(); }, 150); };
  let ro = null;

  /* Taking hold of a stage turns its model: across for the turn, up and down for a little tilt. The canvas itself
     takes no pointer, so the page under it still scrolls and its links still work. */
  const grips = [];
  function grip(e) {
    const el = e.stage;
    if (!el) return;
    let id = null, x = 0, y = 0, at = 0;
    const down = ev => {
      if (ev.button || !e.shown) return;
      id = ev.pointerId; x = ev.clientX; y = ev.clientY; at = ev.timeStamp;
      e.held = true; e.vspin = 0;
      try { el.setPointerCapture(id); } catch (err) { /* the pointer is already gone */ }
      el.classList.add('held');
      wake();
    };
    const move = ev => {
      if (ev.pointerId !== id) return;
      const dx = ev.clientX - x, dy = ev.clientY - y, ms = Math.max(1, ev.timeStamp - at);
      x = ev.clientX; y = ev.clientY; at = ev.timeStamp;
      e.spin += dx * .011;
      e.tilt = clamp(e.tilt + dy * .006, -.55, .55);
      e.vspin = clamp(dx * .011 / ms, -.012, .012);
      wake();
    };
    const up = ev => {
      if (ev.pointerId !== id) return;
      id = null; e.held = false;
      el.classList.remove('held');
      wake();
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    grips.push(() => { el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); el.classList.remove('held', 'on'); });
  }
  const onPressOff = () => { open = true; relayout(); };

  const api = window.__forge = {
    state, measure,
    scenes: () => live.filter(e => e.ok).map(e => ({id: e.def.id, y0: e.y0, y1: e.y1, w: Math.round(e.r0.w), h: Math.round(e.r0.h), cx: Math.round(e.r0.cx), r1w: Math.round(e.r1.w), r1h: Math.round(e.r1.h), cw: e.cw, ch: e.ch, pieces: e.prod.pieces.length})),
    start() {
      ro = new ResizeObserver(relayout);
      ro.observe(document.body);
      /* on the page's motor when there is one: its read pass gives the scroll, the glide and the viewport */
      const motor = window.__motor;
      if (motor) job = motor.add({name: 'forge', scroll: true, glide: true, z: 2, read(m) { view.s = m.y; view.g = m.gy; view.H = H(); view.W = innerWidth; }, write: m => draw(m.t)});
      else addEventListener('scroll', wake, {passive: true});
      addEventListener('resize', relayout, {passive: true});
      document.addEventListener('press:off', onPressOff, {once: true});
      /* the sheet may have cleared while this was still building */
      if (!document.querySelector('.press')) open = true;
      live.forEach(grip);
      measure();
      wake();
    },
    stop() {
      alive = false;
      cancelAnimationFrame(raf);
      if (job) { window.__motor.remove(job); job = null; }
      clearTimeout(timer);
      if (ro) ro.disconnect();
      removeEventListener('scroll', wake);
      removeEventListener('resize', relayout);
      document.removeEventListener('press:off', onPressOff);
      grips.forEach(off => off());
      live.forEach(e => e.host.remove());
      live.length = 0;
      try { stage.dispose(); } catch (err) { /* the context may already be gone */ }
    },
  };
  return api;
}
