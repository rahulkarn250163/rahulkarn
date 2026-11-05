/* Experience: "Nine years in production, from premium engine to platform." The section opens on the whole aircraft,
   the role held now, and reading down takes it apart in the reverse of how it was built: skin panels peel off the
   frames, the wings shed their slats, flaps and ribs, some three hundred pieces in the space of a few scrolls, until
   only the engine is left, cut away so you can see into it, where the work began. Reading back up builds the jet.
   The scroll is the clock: t is 0 at the engine and END at the finished aircraft. */
import {THREE, std, mats, merge, M, cyl, lathe, alongX, builder, glide, glowing} from './kit.js';

const END = 9.6, TAU = Math.PI * 2, R = 1.12;
/* how far down the section the whole build is spent, in px, so it stays dense however long the section is */
const SPAN = 1100, HOLD = 70;
const log = Math.log;
const mix = (a, b, k) => a + (b - a) * k;
/* where the engine hangs, and so where the camera starts */
const ENGINE = [-2.2, -1.55, 3.4];

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

/* a plate from the four corners of one face and its thickness: a box with its corners moved, so hundreds stay cheap */
function slab(a, b, c, d, n) {
  const g = new THREE.BoxGeometry(1, 1, 1), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const q = p.getX(i) > 0 ? (p.getZ(i) > 0 ? c : b) : (p.getZ(i) > 0 ? d : a), s = p.getY(i) > 0 ? .5 : -.5;
    p.setXYZ(i, q[0] + n[0] * s, q[1] + n[1] * s, q[2] + n[2] * s);
  }
  g.computeVertexNormals();
  return g;
}

/* the tail sweeps up behind the cabin */
const rise = x => { const k = Math.max(0, x - 5) / 6; return k * k * .85; };
const swept = g => { const a = g.attributes.position; for (let i = 0; i < a.count; i++) a.setY(i, a.getY(i) + rise(a.getX(i))); a.needsUpdate = true; return g; };
/* the fuselage's radius along its length: the cabin is constant, and nose and tail close smoothly */
const noseR = x => R * Math.pow(Math.max(0, 1 - Math.pow((-7.2 - x) / 3.4, 2.4)), .62);
const tailR = x => R * (1 - Math.pow(Math.max(0, x - 5) / 6.4, 1.9));

export function make() {
  const b = builder(17), r = b.r, body = new THREE.Group();
  b.root.add(body);
  const ti = std({color: 0xb7bbc1, metalness: 1, roughness: .26}), hot = std({color: 0x7f6a55, metalness: 1, roughness: .34}), dark = mats.blackAnodised(), steel = mats.steel(), chrome = mats.chrome(), copper = mats.copper(), red = mats.lacquer(0x9e1c1c);
  const shell = std({color: 0xe9e6de, metalness: .35, roughness: .36, side: THREE.DoubleSide}), inner = std({color: 0x2a2c30, metalness: .7, roughness: .5, side: THREE.DoubleSide}), wing = std({color: 0xb9bbbd, metalness: .55, roughness: .42, side: THREE.DoubleSide});
  const rotors = [];
  const spun = (...kids) => { const g = new THREE.Group(); g.add(...kids); rotors.push(g); return g; };
  /* every fragment turns about its own middle in flight, not about the aircraft's */
  const on = (obj, at, dur, from, reach, opt = {}) => {
    if (obj.isMesh) {
      obj.geometry.computeBoundingBox();
      const c = obj.geometry.boundingBox.getCenter(new THREE.Vector3());
      obj.geometry.translate(-c.x, -c.y, -c.z);
      obj.position.add(c);
    }
    b.part(obj, {at, dur, from, tumble: opt.tumble ?? .3, heavy: opt.heavy ?? true, parent: opt.parent || body});
    b.pieces[b.pieces.length - 1].reach = reach;
    return obj;
  };
  const FLY = 1.15;

  /* ---- the engine: there from the start, whatever the scroll ---- */
  const engine = new THREE.Group();
  engine.position.set(...ENGINE);
  body.add(engine);
  const fixed = obj => { engine.add(obj); return obj; };
  fixed(M(cyl(.05, .05, 2.5, 24).rotateZ(Math.PI / 2), steel));
  /* nine compressor stages, one for each year, tightening toward the fire */
  for (let i = 0; i < 9; i++) {
    const rOut = .5 - i * .022, spot = new THREE.Group();
    spot.position.x = -.68 + i * .098;
    spot.add(spun(M(cyl(rOut * .55, rOut * .55, .034, 40).rotateZ(Math.PI / 2), i % 2 ? steel : ti), M(bladeRing(30 + i * 2, rOut * .54, rOut, .058, .62), ti)));
    fixed(spot);
  }
  const fan = new THREE.Group(), nose = M(alongX(lathe([[0, -.2], [.09, -.1], [.15, 0], [.16, .05], [0, .05]], 40)), chrome);
  fan.position.x = -.96;
  nose.position.x = -.05;
  fan.add(spun(M(cyl(.2, .2, .08, 44).rotateZ(Math.PI / 2), steel), M(bladeRing(20, .18, .76, .15, .78, .009), ti), nose));
  fixed(fan);
  /* the combustor: a copper drum, and the burner cans glowing round it */
  const burn = new THREE.Group(), fire = glowing(0xff7a2e, 1.6), cans = [];
  burn.position.x = .32;
  burn.add(M(alongX(lathe([[.2, -.15], [.27, -.1], [.28, .1], [.21, .16]], 48)), copper));
  for (let i = 0; i < 14; i++) { const a = i / 14 * TAU, c = new THREE.CylinderGeometry(.018, .018, .18, 10).rotateZ(Math.PI / 2); c.translate(0, Math.cos(a) * .286, Math.sin(a) * .286); cans.push(c); }
  burn.add(M(merge(cans), fire));
  fixed(burn);
  for (let i = 0; i < 3; i++) {
    const spot = new THREE.Group();
    spot.position.x = .58 + i * .095;
    spot.add(spun(M(cyl(.19, .19, .04, 36).rotateZ(Math.PI / 2), hot), M(bladeRing(30, .17, .34 + i * .022, .06, -.62), hot)));
    fixed(spot);
  }
  const tail = M(alongX(lathe([[.17, 0], [.13, .22], [.06, .36], [0, .42]], 36)), dark);
  tail.position.x = .9;
  fixed(tail);
  /* the casing: the far half only, so the works stay in view; the same three runs of it close up the near side */
  const half = (pts, mat, start = Math.PI / 2 + .5) => M(alongX(lathe(pts, 48, start, Math.PI + .1)), mat);
  const COWL = [
    {out: [[.82, -1.24], [.85, -1.08], [.84, -.82]], in: [[.79, -1.2], [.81, -1.06], [.8, -.84]]},
    {out: [[.84, -.82], [.76, -.6], [.6, -.36], [.56, -.1]], in: [[.8, -.84], [.72, -.62], [.56, -.38], [.52, -.1]]},
    {out: [[.56, -.1], [.46, .26], [.46, .6], [.48, .92], [.4, 1.3]], in: [[.52, -.1], [.42, .26], [.42, .6], [.44, .92], [.37, 1.28]]},
  ];
  const LIP = [[.85, -.82], [.855, -.72], [.82, -.66]];
  COWL.forEach(c => { fixed(half(c.out, shell)); fixed(half(c.in, inner)); });
  fixed(half(LIP, red));

  /* ---- the near side of the cowl closes and the pylon comes down onto it ---- */
  const NEAR = Math.PI * 1.5 + .4;
  COWL.forEach((c, i) => {
    on(half(c.in, inner, NEAR), .02 + i * .07, FLY * .8, [.1, .2, 1], 2.6, {parent: engine});
    on(half(c.out, shell, NEAR), .1 + i * .07, FLY * .8, [.1, .3, 1], 3, {parent: engine});
  });
  on(half(LIP, red, NEAR), .34, FLY * .7, [-.1, .6, 1], 2.4, {parent: engine});
  /* the pylon is a blade: two skins and a spar */
  const blade = (side, at) => {
    const q = (a, c, d, e, f) => M(new THREE.BoxGeometry(a, c, .1).translate(d, e, side * 3.4 + f), shell);
    on(q(2.3, .22, -1.85, -.62, 0), at, FLY * .7, [.1, 1, .4 * side], 3);
    on(q(2, .24, -1.5, -.4, 0), at + .08, FLY * .7, [.1, 1, .4 * side], 3.4);
  };
  blade(1, .45);

  /* ---- a wing: spars, then ribs, the skin under and over them, and the moving surfaces ---- */
  function buildWing(side, t0) {
    const LE = s => (s < 4.4 ? mix(-3, -.6, (s - .9) / 3.5) : mix(-.6, 3.45, (s - 4.4) / 5.6));
    const TE = s => (s < 4.4 ? mix(1.15, 1.75, (s - .9) / 3.5) : mix(1.75, 4.15, (s - 4.4) / 5.6));
    const Y = s => -.55 + s * .085;
    const P = (s, f, off) => [mix(LE(s), TE(s), f), Y(s) + off, side * s];
    const bay = (s0, s1, f0, f1, off, thick, mat) => {
      const u = side > 0 ? s0 : s1, v = side > 0 ? s1 : s0;
      return M(slab(P(u, f0, off), P(u, f1, off), P(v, f1, off), P(v, f0, off), [0, thick, 0]), mat);
    };
    let n = 0;
    [.25, .68].forEach(f => [[.9, 4.4], [4.4, 10]].forEach(([s0, s1]) => on(bay(s0, s1, f - .03, f + .03, 0, .09, steel), t0 + n++ * .06, FLY, [.04, .25, side], 8, {tumble: .1})));
    /* the ribs */
    const RIBS = 11;
    for (let i = 0; i < RIBS; i++) {
      const s = .9 + i * 9.1 / (RIBS - 1), l = LE(s), e = TE(s);
      on(M(new THREE.BoxGeometry(e - l, .1 - i * .005, .028).translate((l + e) / 2, Y(s), side * s), steel), t0 + .22 + i * .035, FLY * .8, [.1, 1, side * .25], 3.4);
    }
    /* the underside, then the top in two panels a bay, fore and aft */
    [[.9, 4.4], [4.4, 7.2], [7.2, 10]].forEach(([s0, s1], i) => on(bay(s0, s1, 0, 1, -.055, .018, wing), t0 + .5 + i * .05, FLY, [.1, -1, side * .15], 3.6));
    for (let i = 0; i < RIBS - 1; i++) {
      const s0 = .9 + i * 9.1 / (RIBS - 1), s1 = .9 + (i + 1) * 9.1 / (RIBS - 1);
      on(bay(s0, s1, 0, .5, .055, .018, wing), t0 + .62 + i * .04 + r() * .05, FLY * .8, [(r() - .5) * .5, 1, side * (.1 + r() * .3)], 3 + r() * 2.2);
      on(bay(s0, s1, .5, 1, .055, .018, wing), t0 + .68 + i * .04 + r() * .05, FLY * .8, [.2 + r() * .4, 1, side * (.1 + r() * .3)], 3 + r() * 2.2);
    }
    /* slats along the front, flaps and an aileron behind */
    for (let i = 0; i < 6; i++) {
      const s0 = 1 + i * 1.55, s1 = s0 + 1.5;
      on(bay(s0, s1, -.075, -.004, -.01, .05, wing), t0 + 1.02 + i * .03, FLY * .7, [-.15, .4, side * .5], 2.2);
    }
    [[1.1, 2.7], [2.75, 4.3], [4.5, 6.2], [6.25, 7.8]].forEach(([s0, s1], i) => on(bay(s0, s1, 1.01, 1.17 - i * .015, -.015, .045, steel), t0 + 1.08 + i * .04, FLY * .7, [.6, -.5, side * .3], 2.8));
    on(bay(7.9, 9.7, 1.01, 1.2, -.012, .04, red), t0 + 1.25, FLY * .7, [.6, .4, side * .4], 2.6);
    /* the turned-up tip */
    const a = [3.42, .32 + .29, side * 10.02], w = [4.18, .32 + .29, side * 10.02], u = [4.68, 1.3, side * 10.02], v = [4.28, 1.3, side * 10.02];
    on(M(side > 0 ? slab(v, u, w, a, [0, 0, .035]) : slab(a, w, u, v, [0, 0, .035]), red), t0 + 1.32, FLY * .7, [.1, 1, side * .4], 3);
  }
  buildWing(1, .7);

  /* ---- the fuselage: the belly fairing, the frames from the middle out, then the skin over them ---- */
  on(M(new THREE.SphereGeometry(1, 24, 16).scale(2.9, .5, 1.05).translate(-.8, -.92, 0), wing), 2.15, FLY, [.1, -1, .1], 3.6, {tumble: .1});
  const STATIONS = [];
  for (let i = 0; i <= 11; i++) STATIONS.push(-7.2 + i * 12.2 / 11);
  [...STATIONS].sort((p, q) => Math.abs(p) - Math.abs(q)).forEach((x, i) => {
    on(M(new THREE.TorusGeometry(R * .985, .032, 6, 36).rotateY(Math.PI / 2).translate(x, 0, 0), steel), 2.25 + i * .05, FLY * .8, [.05, 1, .25], 5);
  });
  [[-7, -1.8], [-1.8, 2.2], [2.2, 4.9]].forEach(([x0, x1], i) => on(M(new THREE.BoxGeometry(x1 - x0, .035, 1.85).translate((x0 + x1) / 2, -.34, 0), dark), 2.45 + i * .06, FLY * .8, [.4, 1, .3], 4));
  for (let i = 0; i < 6; i++) {
    const a = .5 + i / 6 * TAU;
    on(M(new THREE.BoxGeometry(12.2, .028, .028).translate(-1.1, -Math.sin(a) * R * .97, Math.cos(a) * R * .97), steel), 2.55 + i * .03, FLY * .8, [1, .1 * Math.cos(a), .1], 5, {tumble: .03});
  }
  /* a run of skin round the fuselage, in panels that leave along their own normals */
  const skinRing = (x0, x1, radius, n, at, step, sweep, offset = 0) => {
    const pts = [];
    for (let j = 0; j <= 3; j++) { const x = mix(x0, x1, j / 3); pts.push([radius(x), x]); }
    for (let k = 0; k < n; k++) {
      const a0 = offset + k / n * TAU, len = TAU / n - .008, m = a0 + len / 2;
      let g = alongX(lathe(pts, Math.max(5, Math.round(44 / n)), a0, len));
      if (sweep) g = swept(g);
      on(M(g, shell), at + r() * step, FLY * .85, [(r() - .5) * .3, -Math.sin(m) + .28, Math.cos(m)], 3.2 + r() * 2.4, {tumble: .36});
    }
  };
  const cabin = () => R;
  const rings = [];
  for (let i = 0; i < 11; i++) rings.push([STATIONS[i], STATIONS[i + 1], i * .55]);
  [...rings].sort((p, q) => Math.abs(p[0] + p[1]) - Math.abs(q[0] + q[1])).forEach(([x0, x1, off], i) => skinRing(x0, x1, cabin, 6, 2.95 + i * .13, .1, false, off));

  /* ---- the other wing, and the other engine, closed up ---- */
  buildWing(-1, 4.2);
  blade(-1, 5.4);
  const other = new THREE.Group();
  other.position.set(ENGINE[0], ENGINE[1], -ENGINE[2]);
  body.add(other);
  COWL.forEach((c, i) => {
    on(M(alongX(lathe(c.in, 32)), inner), 5.5 + i * .04, FLY * .8, [.3, -1, -.3], 3.2, {parent: other});
    [0, Math.PI].forEach((a0, k) => on(M(alongX(lathe(c.out, 24, a0 + 1, Math.PI)), shell), 5.56 + i * .05 + k * .03, FLY * .8, [.25, k ? 1 : -1, k ? .5 : -.5], 3.4, {parent: other}));
  });
  on(M(alongX(lathe(LIP, 40)), red), 5.72, FLY * .7, [.1, -.5, -.8], 2.4, {parent: other});
  const face = new THREE.Group();
  face.position.x = -.96;
  face.add(spun(M(cyl(.2, .2, .08, 44).rotateZ(Math.PI / 2), steel), M(bladeRing(20, .18, .76, .15, .78, .009), ti), M(alongX(lathe([[0, -.25], [.09, -.15], [.15, -.05], [.16, 0], [0, 0]], 40)), chrome)));
  on(face, 5.75, FLY * .8, [.2, -.3, -.9], 2.4, {parent: other});

  /* ---- the nose ---- */
  [-8.4, -9.2].forEach((x, i) => on(M(new THREE.TorusGeometry(noseR(x) * .98, .03, 6, 32).rotateY(Math.PI / 2).translate(x, 0, 0), steel), 5.85 + i * .05, FLY * .8, [0, 1, .25], 4));
  const noseStations = [-7.2, -8, -8.7, -9.3, -9.8];
  for (let i = 0; i < 4; i++) skinRing(noseStations[i + 1], noseStations[i], noseR, 5 - Math.min(i, 2), 6 + i * .1, .08, false, i * .4);
  const domePts = [];
  for (let j = 0; j <= 9; j++) { const x = mix(-10.6, -9.8, j / 9); domePts.push([Math.max(.001, noseR(x)), x]); }
  on(M(alongX(lathe(domePts, 40)), shell), 6.42, FLY * .8, [-.1, 1, .3], 3.4, {tumble: .1});

  /* ---- the tail cone, which sweeps up ---- */
  [6.2, 7.6, 9].forEach((x, i) => on(M(new THREE.TorusGeometry(tailR(x) * .97, .028, 6, 30).rotateY(Math.PI / 2).translate(x, rise(x), 0), steel), 6.3 + i * .05, FLY * .8, [.5, 1, .2], 4));
  const tailStations = [5, 6.2, 7.6, 9, 10.2, 10.95];
  for (let i = 0; i < 5; i++) skinRing(tailStations[i], tailStations[i + 1], tailR, [5, 5, 4, 3, 1][i], 6.45 + i * .1, .08, true, i * .5);

  /* ---- the fin and tailplane, bay by bay ---- */
  const FIN = (v, f) => [mix(mix(6.5, 9.55, v), mix(9.9, 10.75, v), f), mix(.8, 5, v), 0];
  const finBay = (v0, v1, f0, f1, mat, t = .12) => M(slab(FIN(v1, f0), FIN(v1, f1), FIN(v0, f1), FIN(v0, f0), [0, 0, t]), mat);
  on(finBay(0, 1, .3, .36, steel, .05), 7.05, FLY * .8, [.1, 1, .1], 5, {tumble: .08});
  for (let i = 0; i < 7; i++) on(finBay(i / 7, (i + 1) / 7, 0, .74, red), 7.12 + i * .07, FLY * .8, [.25, .7, i % 2 ? .7 : -.7], 3.2 + r() * 1.4);
  on(finBay(0, .5, .75, 1, red, .08), 7.62, FLY * .7, [1, .3, .4], 2.6);
  on(finBay(.5, 1, .75, 1, red, .08), 7.68, FLY * .7, [1, .3, -.4], 2.6);
  const tailplane = (side, t0) => {
    const Pt = (s, f) => [mix(mix(8.3, 10.1, (s - .3) / 3.6), mix(10.15, 10.95, (s - .3) / 3.6), f), .62 + s * .09, side * s];
    const plate = (s0, s1, f0, f1, mat) => { const u = side > 0 ? s0 : s1, v = side > 0 ? s1 : s0; return M(slab(Pt(u, f0), Pt(u, f1), Pt(v, f1), Pt(v, f0), [0, .07, 0]), mat); };
    for (let i = 0; i < 5; i++) { const s0 = .3 + i * .72, s1 = s0 + .72; on(plate(s0, s1, 0, .72, wing), t0 + i * .05, FLY * .75, [.3, .6, side * .8], 3 + r() * 1.4); }
    on(plate(.3, 2.1, .73, 1, steel), t0 + .28, FLY * .7, [.8, .4, side * .4], 2.4);
    on(plate(2.1, 3.9, .73, 1, steel), t0 + .33, FLY * .7, [.8, -.3, side * .4], 2.4);
  };
  tailplane(1, 7.55);
  tailplane(-1, 7.72);

  /* ---- last, what makes it read as an aircraft: the windows a run at a time, the flight deck and the band ---- */
  rings.forEach(([x0, x1], i) => [1, -1].forEach(s => {
    const panes = [];
    for (let x = x0 + .12; x < x1 - .05; x += .36) { const g = new THREE.BoxGeometry(.2, .27, .02); g.translate(0, 0, R); g.rotateX(s > 0 ? -.2 : Math.PI + .2); g.translate(x, 0, 0); panes.push(g); }
    if (panes.length) on(M(merge(panes), dark), 8.15 + i * .035 + (s > 0 ? 0 : .02), FLY * .55, [0, .3, s], 1.8, {tumble: .05});
  }));
  [[-.72, .32], [-.26, .34], [.26, .34], [.72, .32]].forEach(([phi, w], i) => {
    const g = new THREE.BoxGeometry(.5, .24, w);
    g.rotateZ(-.48);
    g.translate(0, 1.0, 0);
    g.rotateX(phi);
    g.translate(-8.92, -.05, 0);
    on(M(g, dark), 8.6 + i * .04, FLY * .55, [-.1, 1, phi], 1.6, {tumble: .1});
  });
  for (let k = 0; k < 6; k++) {
    const a0 = k / 6 * TAU, m = a0 + TAU / 12;
    on(M(alongX(lathe([[R + .012, 3.9], [R + .012, 4.32]], 10, a0, TAU / 6 - .004)), red), 8.78 + k * .04, FLY * .55, [.1, -Math.sin(m), Math.cos(m)], 2);
  }

  /* the camera: close on the engine, drawing back as the aircraft grows round it */
  const pull = t => glide(t / 4.6);
  const view = {ex: 1.46, ey: .92, pitch: .16, yaw: .52, roll: 0, dx: 0, dy: 0};
  return {
    root: b.root, pieces: b.pieces, ex: 12, ey: 6, pitch: .34, yaw: .62, reach: 6, turn: .3,
    /* the build is spent in the first stretch of the section, and the engine holds down the rest of it */
    scrub: (p, px) => END * (1 - Math.min(1, Math.max(0, (px - HOLD) / SPAN))),
    view(t, clock) {
      const k = pull(t);
      view.ex = Math.exp(mix(log(1.46), log(10.8), k));
      view.ey = Math.exp(mix(log(.95), log(5.5), k));
      view.pitch = mix(.16, .36, k);
      view.yaw = mix(.52, .62, k);
      body.position.set(-ENGINE[0] * (1 - k), -ENGINE[1] * (1 - k) - k * 1.55, -ENGINE[2] * (1 - k));
      /* the finished aircraft flies in as the section arrives, and rides the air a little */
      const whole = glide((t - END + 1.2) / 1.2), inb = whole * Math.pow(1 - glide(clock / 1.5), 2);
      view.dx = inb * 24;
      view.dy = inb * 5 + whole * Math.sin(clock * .9) * .1;
      view.roll = inb * -.32 + whole * Math.sin(clock * .6) * .025;
      return view;
    },
    tick(t, clock) {
      const a = clock * 8;
      rotors.forEach((o, i) => { o.rotation.x = a + i * .3; });
      fire.color.copy(fire.userData.base).multiplyScalar(.95 + .1 * Math.sin(clock * 17));
    },
  };
}
