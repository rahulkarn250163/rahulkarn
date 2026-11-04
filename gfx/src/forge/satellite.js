/* Contact: "Open to..." A satellite put together in orbit: the gold body, the dish, then the solar
   wings unfolding panel by panel, and an open signal going out from it for as long as you stay. */
import {THREE, std, mats, rbox, box, merge, canvasTex, M, cyl, tor, ball, lathe, swing, glide, builder, glowing} from './kit.js';
import {normalFromHeight, speckleCanvas} from '../core.js';

const PW = .36, PH = .66;

function cells(c, w, h) {
  c.fillStyle = '#0b1a3a'; c.fillRect(0, 0, w, h);
  const nx = 8, ny = 14;
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ny; j++) {
      const v = 34 + ((i * 7 + j * 13) % 9) * 3;
      c.fillStyle = `rgb(${v * .32},${v * .55},${v * 1.5})`;
      c.fillRect(i / nx * w + 1.5, j / ny * h + 1.5, w / nx - 3, h / ny - 3);
    }
  }
  c.fillStyle = '#c7ccd4';
  for (let i = 1; i < nx; i += 2) c.fillRect(i / nx * w - .5, 0, 1, h);
}

function wing(b, side, cellMat, frame, at) {
  const root = new THREE.Group(), boom = M(box(.24, -.012, -.012, .4, .012, .012), frame);
  root.rotation.y = side > 0 ? 0 : Math.PI;
  root.add(boom);
  const panel = () => {
    const g = new THREE.Group();
    g.add(M(box(0, -PH / 2, -.006, PW, PH / 2, .006), cellMat));
    g.add(M(merge([box(0, -PH / 2 - .008, -.008, PW, -PH / 2, .008), box(0, PH / 2, -.008, PW, PH / 2 + .008, .008), box(-.004, -PH / 2, -.008, .004, PH / 2, .008), box(PW - .004, -PH / 2, -.008, PW + .004, PH / 2, .008)]), frame));
    return g;
  };
  /* nested, so each hinge carries the panels beyond it */
  const p1 = panel(), p2 = panel(), p3 = panel();
  p1.position.x = .4;
  p2.position.x = PW;
  p3.position.x = PW;
  p2.add(p3);
  p1.add(p2);
  root.add(p1);
  b.part(root, {at, dur: .5, from: [side, .3, .3], tumble: .45});
  return k => {
    p1.rotation.y = -Math.PI / 2 * (1 - k);
    p2.rotation.y = Math.PI * (1 - k) * .96;
    p3.rotation.y = -Math.PI * (1 - k) * .96;
  };
}

export function make() {
  const b = builder(53);
  const foil = std({color: 0xcda548, metalness: 1, roughness: .34, normalMap: normalFromHeight(speckleCanvas(256, 5, 40), 2.2, {repeat: [2, 3]}), normalScale: new THREE.Vector2(.9, .9)});
  const frame = mats.aluminium(), deck = mats.blackAnodised(), white = std({color: 0xf1efe9, roughness: .42, metalness: .05, side: THREE.DoubleSide});
  const cellMat = std({map: canvasTex(256, 448, cells), metalness: .72, roughness: .24});
  const craft = new THREE.Group();
  b.root.add(craft);
  const part = (o, opts) => b.part(o, {parent: craft, ...opts});

  part(M(rbox(-.24, -.36, -.24, .24, .36, .24, .018), foil), {at: 0, dur: .55, from: [0, -1, .2], tumble: .5, heavy: true});
  [.38, -.38].forEach((y, i) => {
    const d = M(rbox(-.27, -.022, -.27, .27, .022, .27, .008), deck);
    d.position.y = y;
    part(d, {at: .18 + i * .1, dur: .4, from: [0, y, .2], tumble: .2});
  });

  /* thrusters and a star tracker */
  [[-.15, -.15], [.15, -.15], [.15, .15], [-.15, .15]].forEach(([x, z], i) => {
    const n = M(cyl(.03, .058, .1, 20, true), mats.steel());
    n.material.side = THREE.DoubleSide;
    n.position.set(x, -.45, z);
    part(n, {at: .36 + i * .04, dur: .35, from: [x, -1, z], tumble: .2});
  });
  const tracker = new THREE.Group();
  tracker.position.set(.17, .45, .17);
  const lens = M(ball(.024, 18), mats.gloss(0x05070a));
  lens.position.y = .058;
  tracker.add(M(cyl(.036, .044, .1, 18), deck), lens);
  part(tracker, {at: .52, dur: .35, from: [1, 1, 1], tumble: .5});

  /* the dish on its boom, tipped toward the reader */
  const dish = new THREE.Group();
  dish.position.set(0, .4, -.02);
  const mast = M(cyl(.016, .022, .26, 12), frame);
  mast.position.y = .13;
  dish.add(mast);
  const bowl = new THREE.Group();
  bowl.position.y = .28;
  bowl.rotation.x = .68;
  const pts = [];
  for (let i = 0; i <= 26; i++) { const r = i / 26 * .44; pts.push([r, r * r * .95]); }
  bowl.add(M(lathe(pts, 72), white));
  bowl.add(M(tor(.44, .007).rotateX(Math.PI / 2).translate(0, .184, 0), frame));
  const struts = [];
  [0, 1, 2].forEach(i => {
    const a = i / 3 * Math.PI * 2, x = Math.cos(a) * .41, z = Math.sin(a) * .41;
    const g = new THREE.CylinderGeometry(.0045, .0045, 1, 6), from = new THREE.Vector3(x, .16, z), to = new THREE.Vector3(0, .36, 0), d = to.clone().sub(from);
    g.scale(1, d.length(), 1);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()));
    g.translate((from.x + to.x) / 2, (from.y + to.y) / 2, (from.z + to.z) / 2);
    struts.push(g);
  });
  bowl.add(M(merge(struts), frame));
  const horn = M(cyl(.012, .036, .06, 16), deck);
  horn.position.y = .37;
  bowl.add(horn);
  dish.add(bowl);
  part(dish, {at: .62, dur: .6, from: [-.2, 1, .5], tumble: .9, heavy: true});

  /* the signal, going out from the horn */
  const rings = [0, 1, 2].map(() => {
    const m = new THREE.MeshBasicMaterial({color: 0xc92c25, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide});
    const r = M(tor(.5, .008).rotateX(Math.PI / 2), m);
    bowl.add(r);
    return r;
  });

  const beacon = glowing(0xe0443a, 2.4), lamp = M(ball(.016, 10), beacon);
  lamp.position.set(-.2, .44, -.2);
  craft.add(lamp);

  const left = wing(b, -1, cellMat, frame, .98), right = wing(b, 1, cellMat, frame, .9);
  return {
    root: b.root, pieces: b.pieces, ex: 1.54, ey: 1.16, pitch: .1, yaw: .42, reach: 2.5, turn: .8,
    tick(t) {
      const r = swing((t - 1.3) / .9), l = swing((t - 1.42) / .9);
      right(r);
      left(l);
      craft.rotation.z = Math.sin(t * .45) * .05;
      craft.position.y = Math.sin(t * .7) * .02;
      beacon.color.copy(beacon.userData.base).multiplyScalar(Math.sin(t * 2.7) > .3 ? 1 : .12);
      rings.forEach((m, i) => {
        const k = t < 2.3 ? 0 : ((t - 2.3) * .42 + i / 3) % 1;
        m.position.y = .38 + k * 1.15;
        m.scale.setScalar(.3 + k * 1.05);
        m.material.opacity = t < 2.3 ? 0 : .85 * Math.pow(1 - k, 1.4) * glide(k / .1);
      });
    },
  };
}
