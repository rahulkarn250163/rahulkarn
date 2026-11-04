/* Experience: "Nine years in production, from premium engine to platform." A jet engine, cut away
   so you can see into it, with one compressor stage for each year, spinning up once it is whole. */
import {THREE, std, mats, merge, M, cyl, lathe, alongX, builder, glide, glowing} from './kit.js';

/* a ring of blades round the x axis, one draw call */
function bladeRing(n, r0, r1, chord, pitch, thick = .006) {
  const list = [];
  for (let i = 0; i < n; i++) {
    const g = new THREE.BoxGeometry(chord, r1 - r0, thick, 1, 4, 1), p = g.attributes.position;
    /* a blade twists as it runs out from the root */
    for (let k = 0; k < p.count; k++) {
      const u = (p.getY(k) + (r1 - r0) / 2) / (r1 - r0), tw = pitch + u * .5, x = p.getX(k), z = p.getZ(k);
      p.setXYZ(k, x * Math.cos(tw) - z * Math.sin(tw), p.getY(k), x * Math.sin(tw) + z * Math.cos(tw));
    }
    g.translate(0, (r0 + r1) / 2, 0);
    g.rotateX(i / n * Math.PI * 2);
    list.push(g);
  }
  return merge(list);
}

export function make() {
  const b = builder(17), ti = std({color: 0xb7bbc1, metalness: 1, roughness: .26}), hot = std({color: 0x7f6a55, metalness: 1, roughness: .34}), dark = mats.blackAnodised(), steel = mats.steel(), chrome = mats.chrome(), copper = mats.copper();
  const rotors = [];
  const spun = (...kids) => { const inner = new THREE.Group(); inner.add(...kids); rotors.push(inner); return inner; };

  /* the shaft, the backbone everything slides on */
  b.part(M(cyl(.05, .05, 2.5, 24).rotateZ(Math.PI / 2), steel), {at: 0, dur: .5, from: [-1, 0, 0], tumble: 0, heavy: true});

  /* nine compressor stages, tightening toward the fire */
  for (let i = 0; i < 9; i++) {
    const rOut = .5 - i * .022, spot = new THREE.Group();
    spot.position.x = -.68 + i * .098;
    spot.add(spun(M(cyl(rOut * .55, rOut * .55, .034, 40).rotateZ(Math.PI / 2), i % 2 ? steel : ti), M(bladeRing(30 + i * 2, rOut * .54, rOut, .058, .62), ti)));
    b.part(spot, {at: .16 + i * .09, dur: .42, from: [i % 2 ? 1 : -1, 0, 0], tumble: 0});
  }

  /* the fan up front, broad blades and a chrome spinner */
  const fan = new THREE.Group(), nose = M(alongX(lathe([[0, -.2], [.09, -.1], [.15, 0], [.16, .05], [0, .05]], 40)), chrome);
  fan.position.x = -.96;
  nose.position.x = -.05;
  fan.add(spun(M(cyl(.2, .2, .08, 44).rotateZ(Math.PI / 2), steel), M(bladeRing(20, .18, .76, .15, .78, .009), ti), nose));
  b.part(fan, {at: 1.0, dur: .52, from: [-1, 0, 0], tumble: 0, heavy: true});

  /* the combustor: a copper drum, and the burner cans glowing round it */
  const burn = new THREE.Group(), fire = glowing(0xff7a2e, 1.6), cans = [];
  burn.position.x = .32;
  burn.add(M(alongX(lathe([[.2, -.15], [.27, -.1], [.28, .1], [.21, .16]], 48)), copper));
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, c = new THREE.CylinderGeometry(.018, .018, .18, 10).rotateZ(Math.PI / 2); c.translate(0, Math.cos(a) * .286, Math.sin(a) * .286); cans.push(c); }
  burn.add(M(merge(cans), fire));
  b.part(burn, {at: 1.12, dur: .46, from: [0, 1, 0], tumble: .2, heavy: true});

  /* three turbine stages, heat-blued, and the tail cone */
  for (let i = 0; i < 3; i++) {
    const spot = new THREE.Group();
    spot.position.x = .58 + i * .095;
    spot.add(spun(M(cyl(.19, .19, .04, 36).rotateZ(Math.PI / 2), hot), M(bladeRing(30, .17, .34 + i * .022, .06, -.62), hot)));
    b.part(spot, {at: 1.24 + i * .08, dur: .42, from: [1, 0, 0], tumble: 0});
  }
  const tail = M(alongX(lathe([[.17, 0], [.13, .22], [.06, .36], [0, .42]], 36)), dark);
  tail.position.x = .9;
  b.part(tail, {at: 1.5, dur: .44, from: [1, 0, 0], tumble: 0});

  /* the casing: the far half only, so the works stay in view */
  const half = (pts, mat) => M(alongX(lathe(pts, 64, Math.PI / 2 + .5, Math.PI + .1)), mat);
  const casing = new THREE.Group();
  const shell = std({color: 0xe9e6de, metalness: .35, roughness: .36, side: THREE.DoubleSide}), inner = std({color: 0x2a2c30, metalness: .7, roughness: .5, side: THREE.DoubleSide});
  casing.add(half([[.82, -1.24], [.85, -1.08], [.84, -.82], [.76, -.6], [.6, -.36], [.56, -.1], [.46, .26], [.46, .6], [.48, .92], [.4, 1.3]], shell));
  casing.add(half([[.79, -1.2], [.81, -1.06], [.8, -.84], [.72, -.62], [.56, -.38], [.52, -.1], [.42, .26], [.42, .6], [.44, .92], [.37, 1.28]], inner));
  b.part(casing, {at: 1.62, dur: .55, from: [0, .1, -1], tumble: .12, heavy: true});
  b.part(half([[.85, -.82], [.855, -.72], [.82, -.66]], mats.lacquer(0x9e1c1c)), {at: 1.9, dur: .4, from: [0, 1, -.4], tumble: .1});

  /* it spins up once it is whole: the angle is the integral of a speed that eases in */
  const angle = t => { const k = t - 1.9; return k <= 0 ? 0 : k < 1.6 ? 7 * k * k / 3.2 : 5.6 + 3.5 * (k - 1.6) * 2; };
  return {
    root: b.root, pieces: b.pieces, ex: 1.46, ey: .92, pitch: .16, yaw: .52, reach: 2.2,
    tick(t) {
      const a = angle(t);
      rotors.forEach((r, i) => { r.rotation.x = a + i * .3; });
      fire.color.copy(fire.userData.base).multiplyScalar(.5 + .5 * glide((t - 1.9) / 1.2) + .1 * Math.sin(t * 17));
    },
  };
}
