import {THREE, mats, rbox, merge, mesh, std} from '../../core.js';

const BLADES = 7, NU = 6, NV = 3, PITCH = 28 * Math.PI / 180;
const dark = () => std({color: 0x17181a, roughness: .6, metalness: .2});

// Blade surface in local coords: u runs root to tip, v runs across the chord.
function bladeGeometry(r) {
  const ri = r * .32, ro = r * .94, pos = [], idx = [];
  for (let b = 0; b < BLADES; b++) {
    const base = b / BLADES * Math.PI * 2, start = pos.length / 3;
    for (let i = 0; i <= NU; i++) {
      const u = i / NU, rad = ri + (ro - ri) * u;
      const sweep = .55 * u * u, width = (.52 + .1 * Math.sin(u * Math.PI)) * (2 * Math.PI / BLADES) * .62;
      const pitch = PITCH * (1.15 - .3 * u);
      for (let j = 0; j <= NV; j++) {
        const v = j / NV - .5, a = base + sweep + v * width;
        const chord = v * width * rad;
        const camber = (.25 - v * v) * r * .05;
        const dx = -chord * Math.sin(pitch) + camber;
        pos.push(dx, rad * Math.cos(a), rad * Math.sin(a));
      }
    }
    for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) {
      const p = start + i * (NV + 1) + j, q = p + NV + 1;
      idx.push(p, q, p + 1, p + 1, q, q + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

const xCyl = (r0, r1, len, at, y, z, seg = 40) => {
  const g = new THREE.CylinderGeometry(r0, r1, len, seg);
  g.rotateZ(Math.PI / 2);
  g.translate(at, y, z);
  return g;
};

export function makeFan(x, y, z, r, {frame = true} = {}) {
  const group = new THREE.Group();
  const blades = new THREE.Group();
  blades.position.set(x - .25, y, z);
  blades.add(mesh(bladeGeometry(r), std({color: 0x5a5c60, metalness: .35, roughness: .4, side: THREE.DoubleSide})));
  group.add(blades);

  group.add(mesh(xCyl(r * .3, r * .3, .34, x - .32, y, z), dark()));
  const ring = new THREE.TorusGeometry(r * .22, Math.max(.012, r * .012), 8, 48);
  ring.rotateY(Math.PI / 2);
  ring.translate(x - .5, y, z);
  group.add(mesh(ring, mats.lacquer(0xc22a14)));

  if (frame) {
    const h = r + .6, sr = h - .42;
    group.add(mesh(rbox(x - .3, y - h, z - h, x + 1.7, y + h, z + h, .4), mats.plastic(0x24252a)));
    const lip = new THREE.TorusGeometry(r + .06, .07, 10, 72);
    lip.rotateY(Math.PI / 2);
    lip.translate(x - .32, y, z);
    group.add(mesh(merge([xCyl(r + .02, r + .02, .1, x - .3, y, z, 64), lip]), dark()));
    const heads = [], s = [-1, 1];
    for (const a of s) for (const b of s) heads.push(xCyl(.15, .15, .08, x - .33, y + a * sr, z + b * sr, 16));
    group.add(mesh(merge(heads), mats.steel()));
  }
  return {group, blades};
}

export function spin(fan, t, power) { (fan.blades || fan).rotation.x = power * power * 14 * t; }
