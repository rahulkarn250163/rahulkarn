/* About: "Owns the architecture." An architect's model of a twisting tower, floor by floor. */
import {THREE, std, mats, rbox, box, merge, M, cyl, ball, glowing, blob, builder} from './kit.js';

const FLOORS = 17, RISE = .118, Y0 = -.95;

export function make() {
  const b = builder(41);
  b.root.add(blob(1.05, .8, Y0 - .16));

  /* the plinth, and a few trees on it */
  const base = new THREE.Group();
  base.add(M(rbox(-.86, Y0 - .15, -.62, .86, Y0 - .05, .62, .025), mats.blackAnodised()));
  base.add(M(rbox(-.82, Y0 - .05, -.58, .82, Y0 - .03, .58, .008), std({color: 0xe7e3da, roughness: .75, metalness: 0})));
  b.part(base, {at: 0, dur: .55, from: [0, -1, 0], tumble: .2, heavy: true});

  const leaf = std({color: 0x5f7d57, roughness: .8, metalness: 0}), bark = std({color: 0x4b3a2c, roughness: .8, metalness: 0});
  [[-.68, .42], [-.56, -.44], [.66, .46], [.7, -.3], [-.7, -.1], [.46, .5]].forEach(([x, z], i) => {
    const t = new THREE.Group();
    t.position.set(x, Y0 - .03, z);
    t.add(M(cyl(.008, .012, .07, 8), bark)).children[0].position.y = .035;
    t.add(M(ball(.05 + (i % 3) * .008, 12), leaf)).children[1].position.y = .1;
    b.part(t, {at: .12 + i * .03, dur: .4, from: [x, 1, z], tumble: .3});
  });

  /* each floor: a slab, a band of glass, thin columns at the corners, a line of lit windows */
  const slab = std({color: 0xece9e1, roughness: .55, metalness: 0}), glass = std({color: 0x1b3346, metalness: .9, roughness: .14, envMapIntensity: 1.6});
  const shine = [glowing(0xffcf8a, 1.5), glowing(0xffe2b4, 1.2), glowing(0xffb86b, 1.4)];
  const slabG = rbox(-.34, 0, -.34, .34, .024, .34, .01);
  const glassG = box(-.31, .024, -.31, .31, RISE, .31);
  const postG = merge([[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, z]) => box(x * .322 - .006, .024, z * .322 - .006, x * .322 + .006, RISE, z * .322 + .006)));
  /* a row of windows on each face, standing just proud of the glass */
  const rowsG = [0, 1, 2].map(k => {
    const list = [];
    for (let f = 0; f < 4; f++) {
      for (let i = 0; i < 5; i++) {
        if ((i + k) % 3 === 0) continue;
        const u = -.25 + i * .125, y0 = .046, y1 = RISE - .018;
        const g = f < 2 ? box(u - .036, y0, -.0015, u + .036, y1, .0015) : box(-.0015, y0, u - .036, .0015, y1, u + .036);
        if (f === 0) g.translate(0, 0, .3115); else if (f === 1) g.translate(0, 0, -.3115); else if (f === 2) g.translate(.3115, 0, 0); else g.translate(-.3115, 0, 0);
        list.push(g);
      }
    }
    return merge(list);
  });

  const steel = mats.steel();
  for (let i = 0; i < FLOORS; i++) {
    const f = new THREE.Group(), taper = 1 - i * .017;
    f.position.y = Y0 - .03 + i * RISE;
    f.rotation.y = i * .075;
    f.scale.set(taper, 1, taper);
    f.add(M(slabG, slab), M(glassG, glass), M(postG, steel), M(rowsG[i % 3], shine[i % 3]));
    b.part(f, {at: .28 + i * .082, dur: .5, from: [i % 2 ? 1 : -1, .35, ((i % 3) - 1) * .6], tumble: .42});
  }

  /* the roof, the spire and its beacon */
  const top = new THREE.Group(), beacon = glowing(0xe0443a, 2.4);
  top.position.y = Y0 - .03 + FLOORS * RISE;
  top.rotation.y = FLOORS * .075;
  top.add(M(rbox(-.2, 0, -.2, .2, .03, .2, .01), slab));
  top.add(M(rbox(-.1, .03, -.1, .1, .1, .1, .008), mats.blackAnodised()));
  const spire = M(cyl(.004, .016, .24, 10), mats.chrome()), lamp = M(ball(.016, 12), beacon);
  spire.position.y = .22;
  lamp.position.y = .345;
  top.add(spire, lamp);
  b.part(top, {at: 1.78, dur: .5, from: [0, 1, 0], tumble: .3});

  return {
    root: b.root, pieces: b.pieces, ex: .98, ey: 1.5, pitch: .3, yaw: .55, reach: 2.7,
    tick(t) {
      beacon.color.copy(beacon.userData.base).multiplyScalar(Math.sin(t * 3.1) > .2 ? 1 : .12);
      shine.forEach((m, i) => { m.color.copy(m.userData.base).multiplyScalar(.82 + .18 * Math.sin(t * (.9 + i * .37) + i * 2.1)); });
    },
  };
}
