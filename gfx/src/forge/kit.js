/* What every product is made with. A part is an object with a home position and a flight: the
   engine flies it in on its own clock and sets it down exactly at home, the way the computer's
   parts land in the press run. Anything that moves afterwards hangs inside a part and is moved
   by the product's tick(t), which only ever reads the clock, so a replay is just t running from 0. */
import {THREE, std, phys, mats, rbox, box, merge, canvasTex, rng} from '../core.js';

export {THREE, std, phys, mats, rbox, box, merge, canvasTex};

export const M = (geo, mat) => new THREE.Mesh(geo, mat);
export const clamp = k => (k < 0 ? 0 : k > 1 ? 1 : k);
export const glide = k => { k = clamp(k); return k * k * (3 - 2 * k); };
/* a little past home and back, for anything that swings open */
export const swing = k => { k = clamp(k); const c = 1.4; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
export const cyl = (rt, rb, h, seg = 40, open = false) => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open);
export const tor = (R, r, seg = 72) => new THREE.TorusGeometry(R, r, 10, seg);
export const ball = (r, seg = 32) => new THREE.SphereGeometry(r, seg, Math.round(seg * .7));
export const glowing = (c, power = 1) => { const m = new THREE.MeshBasicMaterial({color: new THREE.Color(c).multiplyScalar(power)}); m.userData.base = m.color.clone(); return m; };

/* the Lathe's axis is y; everything spun about x goes through alongX */
export const lathe = (pts, seg = 64, start = 0, len = Math.PI * 2) => new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), seg, start, len);
export const alongX = g => g.rotateZ(-Math.PI / 2);
/* A part turned on a lathe: flats stay flat and every corner is an edge. The Lathe smooths any corner that is
   not given twice, so each inner point of the profile is doubled. List the profile from the axis out along the
   underside, up the wall and back in along the top, and the faces look outward. */
export const hard = pts => pts.flatMap((p, i) => (i && i < pts.length - 1 ? [p, p] : [p]));
export const turned = (pts, seg = 96) => lathe(hard(pts), seg);
/* Metal that was turned: its grain runs round the axis, so light fans out across a face and runs in streaks down
   a wall. One program for all of them, whatever the colour. Only on a lathe: its u runs round the axis. */
const spun = new Map();
export function turnedMetal(color = 0xc4c7cb, roughness = .36) {
  const k = color + ':' + roughness;
  if (!spun.has(k)) spun.set(k, phys({color, metalness: 1, roughness, anisotropy: .85, anisotropyRotation: Math.PI / 2}));
  return spun.get(k);
}

/* a thin shape cut from sheet, with a small bevel to catch the light */
export function sheet(shape, depth = .02, bevel = .006) {
  const g = new THREE.ExtrudeGeometry(shape, {depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 12});
  g.translate(0, 0, -depth / 2);
  return g;
}

let blobTex = null;
/* the soft shadow a thing sits on, so it reads as standing on the paper */
export function blob(rx, rz, y, opacity = .26) {
  blobTex ??= canvasTex(128, 128, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(.55, 'rgba(0,0,0,.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.clearRect(0, 0, w, h); c.fillStyle = g; c.fillRect(0, 0, w, h);
  }, {mips: false});
  const m = new THREE.Mesh(new THREE.PlaneGeometry(rx * 2, rz * 2), new THREE.MeshBasicMaterial({map: blobTex, transparent: true, opacity, depthWrite: false, toneMapped: false}));
  m.rotation.x = -Math.PI / 2;
  m.position.y = y;
  m.renderOrder = -1;
  return m;
}

export function builder(seed) {
  const r = rng(seed), root = new THREE.Group(), pieces = [];
  const unit = v => { const n = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / n, v[1] / n, v[2] / n]; };
  return {
    root, pieces, r,
    /* at and dur in seconds; from is the direction it arrives from; tumble scales its spin in flight */
    part(obj, {at = 0, dur = .55, from = null, tumble = 1, heavy = false, parent = root} = {}) {
      parent.add(obj);
      pieces.push({
        obj, at, dur, heavy, from: unit(from || [r() * 2 - 1, r() * 1.4 - .3, r() * 2 - 1]),
        spin: [(r() - .5) * 2.4 * tumble, (r() - .5) * 2.4 * tumble, (r() - .5) * 2.4 * tumble],
        home: obj.position.clone(), rot: obj.rotation.clone(),
      });
      return obj;
    },
  };
}
