// The reel's 3D chip: wires board, traces, labels and sand to reel progress.
import {THREE, createStage, studioEnv, detectTier} from './core.js';
import {buildLayout, GROUPS} from './chip/layout.js';
import {makeBoard} from './chip/board.js';
import {makeTraces} from './chip/traces.js';
import {makeLabels} from './chip/labels.js';
import {makeSand} from './sand.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = k => 1 - Math.pow(1 - clamp(k), 3);
const FIT = 124, RAD = Math.PI / 180;

export async function create({canvas, tier, preserve, theme}) {
  const stage = createStage(canvas, {alpha: true, preserve, exposure: 1.15, fov: 24});
  const {scene, camera, renderer} = stage;
  const high = (tier || detectTier()) === 'high';
  let L, board, traces, labels, sand, ring, built = false, W = 1, H = 1;

  function build() {
    if (built) return;
    built = true;
    scene.environment = studioEnv(renderer);
    /* the board lies in the XY plane: turn the studio so its softbox is overhead of the die */
    scene.environmentRotation.set(1.15, 0, .35);
    scene.environmentIntensity = .42;
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(-60, 90, 160);
    scene.add(sun);
    L = buildLayout();
    board = makeBoard(L); traces = makeTraces(L); labels = makeLabels(L, canvas);
    const groups = [{rect: [-35, -35, 70, 70], count: high ? 12000 : 4000, spread: 110, color: '#e9dcc0'}];
    L.groups.forEach(g => g.pads.forEach(p => groups.push({rect: [p.px - 6, p.py - 6, 12, 12], count: 400, spread: 70, color: '#e9dcc0'})));
    sand = makeSand(groups);
    const h = 124;
    ring = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints([[-h, -h], [h, -h], [h, h], [-h, h]].map(([x, z]) => new THREE.Vector3(x, z, 1))),
      new THREE.LineBasicMaterial({color: 0xff6a45, transparent: true, opacity: 0}));
    for (const o of [board, traces, labels, sand]) { const n = o.group || o.object || o.points; if (n) scene.add(n); }
    scene.add(ring);
    setTheme(theme);
  }

  function setTheme(t) { theme = t; for (const o of [board, traces, labels]) o?.setTheme?.(t); }

  function resize(w, h) { W = w; H = h; stage.size(w, h); labels?.size(); }

  function placeCamera(P, N) {
    /* a clear three-quarter view that eases toward plan as the board completes; no drift, so the type holds still */
    const k = clamp(P / N), tilt = (30 - 14 * k) * RAD, az = -.2 + .2 * k;
    const dist = FIT / Math.tan(camera.fov * RAD / 2) * Math.max(1, 1 / Math.max(camera.aspect, .001));
    camera.position.set(Math.sin(az) * Math.sin(tilt) * dist, -Math.cos(az) * Math.sin(tilt) * dist, Math.cos(tilt) * dist);
    camera.lookAt(0, -6 * (1 - k), 0);
  }

  function draw({W: w, H: h, P, N, cur, t}) {
    build();
    if (w !== W || h !== H) resize(w, h);
    placeCamera(P, N);
    const die = clamp((clamp(P / .32, 0, 1.2) - .55) / .4);
    const done = ease((P - (N - .25)) / .25);
    board.setDie(die);
    sand.setProgress(0, clamp(P / .32, 0, 1.2));
    labels.setVisible(w >= 300);
    labels.setDie('RAHUL KARN', done > .5 ? 'Solution Architect' : GROUPS[cur].name.toLowerCase() + ' · ' + (cur + 1) + ' of ' + N, die);
    let si = 1;
    L.groups.forEach((g, gi) => {
      const l = clamp(P - gi), a = ease(l / .4), tr = ease((l - .18) / .4), fade = gi === cur ? 1 : .62;
      g.pads.forEach((_, i) => {
        const pf = clamp(l / .45 - i * .06, 0, 1.2);
        board.setPads(gi, i, clamp((pf - .6) / .35));
        sand.setProgress(si++, pf);
        traces.setTrace(gi, i, clamp(tr * 1.15 - i * .05));
        labels.setPad(gi, i, clamp((l - .3 - i * .04) * 6) * (gi === cur ? .95 : .6));
      });
      board.setPins(gi, a);
      if (gi === cur) traces.setSignals(gi, 3, t, tr);
    });
    board.setParts(done);
    board.setHeat(P / N);
    ring.material.opacity = done * (.35 + .25 * Math.sin(t * 3));
    ring.visible = done > 0;
    /* grains only exist while something is forming */
    sand.points.visible = P < N && (P < .4 || P % 1 < .72);
    stage.render();
    labels.project(camera, w, h);
  }

  async function prepare() {
    build();
    await document.fonts.ready;
    await stage.warm();
  }

  function dispose() { for (const o of [board, traces, labels, sand]) o?.dispose?.(); ring?.geometry.dispose(); ring?.material.dispose(); stage.dispose?.(); }

  return {stage, prepare, resize, draw, setTheme, dispose};
}

export const mockState = (w, h) => ({W: w, H: h, P: 3.4, N: 4, cur: 3, t: 1});
