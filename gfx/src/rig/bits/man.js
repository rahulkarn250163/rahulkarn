/* Whoever the flight found at the lit window: seated at the table, hands at the keys, seen from behind, while the
   machine is built in front of them. Plain rounded forms in dark cloth, so they read as a figure and not as a
   model of anyone. Every material is see-through from the start, because the figure fades as the camera takes
   their seat (a material that turns transparent later would recompile mid-shot). Centimetres, tabletop y = 0. */
import {THREE, rbox, merge, mesh, std} from '../../core.js';
import {TABLE} from './desk.js';

/* where they sit: in line with the keyboard's middle */
const X = 5;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
/* a rounded limb from a to b */
function limb(a, b, r) {
  const d = b.clone().sub(a), len = d.length();
  const g = new THREE.CapsuleGeometry(r, len, 6, 14);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize()));
  g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  return g;
}
const both = f => [-1, 1].map(f);

export function make() {
  const g = new THREE.Group(), mats = [];
  const cloth = (color, roughness = .86) => { const m = std({color, metalness: 0, roughness, envMapIntensity: .5, transparent: true}); mats.push(m); return m; };
  const shirt = cloth(0x2b2e35), trousers = cloth(0x16171b), skin = cloth(0xb08462, .62), hair = cloth(0x0c0c0d, .7), chairMat = cloth(0x101113, .6), metal = cloth(0x3a3c40, .4);
  const floor = TABLE.floor, seat = -28;
  const add = (geo, mat) => g.add(mesh(geo, mat, {cast: false, receive: false}));

  /* the chair: seat, back, column and a five-point base */
  add(merge([rbox(X - 24, seat - 7, 42, X + 24, seat, 86, 3), rbox(X - 22, seat + 2, 81, X + 22, seat + 58, 87, 3)]), chairMat);
  const base = [new THREE.CylinderGeometry(2.6, 2.6, 30, 16).translate(X, seat - 22, 64)];
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2 + .3;
    base.push(rbox(-2, -1.6, 0, 2, 1.6, 31, 1).rotateY(a).translate(X, floor + 6, 64));
    base.push(new THREE.SphereGeometry(2.6, 12, 8).translate(X + Math.sin(a) * 30, floor + 2.6, 64 + Math.cos(a) * 30));
  }
  add(merge(base), metal);

  /* the body, leaning a little toward the screen */
  const hip = V(X, seat + 8, 62), chest = V(X, 22, 55), neck = V(X, 34, 53);
  add(merge([
    limb(hip, chest, 16.5), limb(V(X - 13, 26, 55), V(X + 13, 26, 55), 9.5),
    ...both(s => limb(V(X + s * 21, 27, 55), V(X + s * 25, 4, 41), 5.4)),
    ...both(s => limb(V(X + s * 25, 4, 41), V(X + s * 12, 3.4, 24), 4.4)),
  ]), shirt);
  add(merge([
    ...both(s => limb(V(X + s * 9, seat + 5, 62), V(X + s * 10, seat + 3, 24), 7.6)),
    ...both(s => limb(V(X + s * 10, seat + 2, 24), V(X + s * 10, floor + 8, 27), 5.6)),
    ...both(s => rbox(X + s * 10 - 5, floor, 12, X + s * 10 + 5, floor + 7, 31, 2.5)),
  ]), trousers);
  add(merge([
    limb(V(X, 30, 53.5), neck.clone().add(V(0, 5, 0)), 5.2),
    new THREE.SphereGeometry(10.4, 28, 20).scale(.94, 1.1, 1).translate(X, 49, 52),
    ...both(s => new THREE.SphereGeometry(4.6, 14, 10).scale(1.1, .62, 1.5).translate(X + s * 10.5, 3.6, 19)),
    ...both(s => new THREE.SphereGeometry(2.3, 10, 8).scale(.5, 1, .8).translate(X + s * 10, 49, 52.5)),
  ]), skin);
  /* hair: a cap over the back and top of the head, which is what the camera sees */
  add(new THREE.SphereGeometry(10.9, 28, 20, 0, Math.PI * 2, 0, Math.PI * .62).scale(.96, 1.1, 1.03).rotateX(.34).translate(X, 50, 53.2), hair);

  g.userData.fade = k => {
    const o = k < 0 ? 0 : k > 1 ? 1 : k;
    g.visible = o > .004;
    for (const m of mats) m.opacity = o;
  };
  return g;
}
