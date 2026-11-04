// Digital transformation, as a scene: a pile of policy paper becomes one platform.
// The sheets fly out and settle into six modules, a gateway rises between them, the links
// carry signals, the modules lift away as services, and the whole opens onto what is next.
import {THREE, createStage, studioEnv} from './core.js';
import {makeTextLayer} from './labels.js';
import {makeSheets} from './dx/sheets.js';
import {makeModules} from './dx/modules.js';
import {makeLinks} from './dx/links.js';
import {makeHub} from './dx/hub.js';
import {makeFuture} from './dx/future.js';
import {makeFloor} from './dx/floor.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const glide = k => { k = clamp(k); return k * k * (3 - 2 * k); };
const NAMES = ['Policy issuance', 'Claims', 'Payments', 'Identity', 'Agents', 'Customers'];
const R = 54, HUB = 1.5, DEG = Math.PI / 180;
const MODS = NAMES.map((name, i) => {
  const a = (i * 60 + 30) * DEG;
  return {name, x: Math.round(Math.cos(a) * R), z: Math.round(Math.sin(a) * R * .8), w: 36, d: 22};
});

export async function create({canvas, tier, preserve, theme}) {
  const stage = createStage(canvas, {alpha: true, preserve, exposure: 1.2, fov: 26, near: 10, far: 1500});
  const {scene, camera, renderer} = stage;
  const high = tier === 'high';
  scene.environment = studioEnv(renderer);
  scene.environmentIntensity = 1;
  const key = new THREE.DirectionalLight(0xfff1e0, 2);
  key.position.set(-60, 130, 90);
  scene.add(key);

  const floor = makeFloor(), sheets = makeSheets(MODS, {count: high ? 300 : 220}), mods = makeModules(MODS);
  const hub = makeHub(), hubAt = new THREE.Group(), hubRim = new THREE.Vector3(0, 12 * HUB, 0), links = makeLinks(6), future = makeFuture({count: high ? 900 : 500});
  hubAt.scale.setScalar(HUB);
  hubAt.add(hub.group);
  scene.add(hubAt);
  [floor, sheets, mods, links, future].forEach(p => scene.add(p.group));

  let text = null, W = 1, H = 1;
  const to = i => mods.top(i), edge = i => mods.edge(i);

  function layout() {
    text = makeTextLayer(canvas, 'dx-labels');
    MODS.forEach((m, i) => text.add('m' + i, [['b', m.name]], .5, .5));
    text.add('hub', [['b', 'Gateway']], .5, .5, 'hub');
    text.size();
  }

  function camFor(s) {
    const k = clamp(s / 6), yaw = (24 - 22 * glide(k)) * DEG, pit = (46 - 16 * glide((s - 3.6) / 2.4)) * DEG;
    /* the frame closes in on the pile, then pulls back to take in what the platform opens onto */
    const fit = 44 + 46 * glide(s / 1.3) + 16 * glide((s - 4.2) / 1.4), dist = fit / Math.tan(camera.fov * DEG / 2) / Math.min(1, camera.aspect * 1.05);
    camera.position.set(-Math.sin(yaw) * Math.cos(pit) * dist, Math.sin(pit) * dist, Math.cos(yaw) * Math.cos(pit) * dist);
    camera.lookAt(0, 6 + 14 * glide((s - 3.8) / 1.6), 0);
    camera.updateMatrixWorld();
    return fit;
  }

  function apply(s, cur, t) {
    const fly = clamp(s / 1.1), form = clamp((s - .85) / .6), hubK = clamp((s - 1.5) / .5), reveal = clamp((s - 1.9) / .7);
    const lift = glide((s - 3.8) / .9), fut = clamp((s - 4.8) / .9), speed = .22 + .5 * clamp((s - 2.9) / .6);
    /* the grid keeps its size in the frame, so it always melts away before the canvas edge */
    floor.group.scale.setScalar(camFor(s) / 96);
    floor.set(clamp(s / .4) * .62);
    sheets.set(fly, 1 - clamp((s - 1.05) / .4));
    mods.set(form, lift, -1);
    hub.set(hubK, t);
    links.set(reveal, speed, t, hubRim, 7.6 * HUB, edge);
    future.set(fut, t);
    return {form, hubK};
  }

  return {
    stage,
    async prepare() {
      layout();
      apply(5.6, -1, 1);
      await stage.warm();
      apply(0, -1, 0);
    },
    resize(w, h) { W = w; H = h; stage.size(w, h); text?.size(); },
    draw({s, cur, t}) {
      const {form, hubK} = apply(s, cur, t);
      stage.render();
      MODS.forEach((m, i) => {
        const p = to(i), o = clamp((form - .55 - i * .05) / .3);
        /* flat on the block's top, reading along it */
        text.onPlane('m' + i, p.x, p.y + .02, p.z, 1, 0, 0, 0, 0, -1, camera, W, H, o, null, m.w * .86);
      });
      text.onPlane('hub', 0, 12.4 * HUB + .02, 0, 1, 0, 0, 0, 0, -1, camera, W, H, clamp((hubK - .7) / .3), null, 18);
    },
    setTheme() {},
    dispose() { text?.dispose(); stage.dispose(); },
  };
}
export const mockState = () => ({s: 3.2, N: 6, cur: 2, t: 1});
