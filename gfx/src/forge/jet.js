/* Experience: "Nine years in production, from premium engine to platform." The section opens on the whole aircraft,
   the role held now, and reading down takes it apart in the reverse of how it was built: skin panels peel off the
   frames, the wings shed their slats, flaps and ribs, some three hundred pieces in the space of a few scrolls, until
   only the engine is left, cut away so you can see into it, where the work began. Reading back up builds the jet.
   The scroll is the clock: t is 0 at the engine and END at the finished aircraft.

   Every skin is cut from one smooth surface: the hull, each wing and the tail are functions, and a panel is a patch
   of its function with normals taken from the function, so panels meet with no line and the finished aircraft is
   seamless, however many pieces it came from. */
import {THREE, std, phys, mats, merge, M, cyl, lathe, alongX, builder, glide, glowing} from './kit.js';

const END = 9.6, TAU = Math.PI * 2, R = 1.12, TOP = Math.PI * 1.5;
/* how far down the section the whole build is spent, in px, so it stays dense however long the section is */
const SPAN = 1100, HOLD = 70;
const log = Math.log;
const mix = (a, b, k) => a + (b - a) * k;
const clamp01 = k => Math.max(0, Math.min(1, k));
/* where the engine hangs, and so where the camera starts */
const ENGINE = [-2.2, -1.5, 3.4];

/* ---- the surfaces ---- */
/* the hull: phi 0 is the +z side, a quarter turn on is the belly. The nose droops and the tail sweeps up */
const radiusAt = x => (x < -7.2 ? R * Math.pow(Math.max(0, 1 - Math.pow((-7.2 - x) / 3.4, 2.15)), .58) : x > 5 ? R * (1 - Math.pow((x - 5) / 6.4, 1.9)) : R);
const centreAt = x => (x < -7.2 ? -.42 * Math.pow((-7.2 - x) / 3.4, 2) : x > 5 ? .85 * Math.pow((x - 5) / 6, 2) : 0);
const hullAt = (x, phi, off = 0) => {
  const r = radiusAt(x) + off, s = Math.sin(phi);
  return [x, centreAt(x) - r * s * (1.01 - .03 * s), r * Math.cos(phi)];
};
/* half the thickness of a symmetrical wing section, per unit of chord and of thickness */
const naca = c => { c = clamp01(c); return 5 * (.2969 * Math.sqrt(c) - .126 * c - .3516 * c * c + .2843 * c * c * c - .1036 * c * c * c * c); };

/* a patch of a surface f(u, v), with its normals from the surface itself. inside(u, v) is a point within the solid,
   which settles which way is out */
function patch(f, u0, u1, v0, v1, nu, nv, inside) {
  const n = (nu + 1) * (nv + 1), pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), idx = [];
  const e = 1e-3, du = u1 - u0, dv = v1 - v0;
  const um = u0 + du / 2, vm = v0 + dv / 2, pm = f(um, vm), a0 = f(um + e, vm), b0 = f(um - e, vm), c0 = f(um, vm + e), d0 = f(um, vm - e), q = inside(um, vm);
  const ax = a0[0] - b0[0], ay = a0[1] - b0[1], az = a0[2] - b0[2], bx = c0[0] - d0[0], by = c0[1] - d0[1], bz = c0[2] - d0[2];
  const sign = ((ay * bz - az * by) * (pm[0] - q[0]) + (az * bx - ax * bz) * (pm[1] - q[1]) + (ax * by - ay * bx) * (pm[2] - q[2])) >= 0 ? 1 : -1;
  let k = 0;
  for (let j = 0; j <= nv; j++) {
    const v = v0 + dv * j / nv;
    for (let i = 0; i <= nu; i++) {
      const u = u0 + du * i / nu, p = f(u, v), a = f(u + e, v), b = f(u - e, v), c = f(u, v + e), d = f(u, v - e);
      const x1 = a[0] - b[0], y1 = a[1] - b[1], z1 = a[2] - b[2], x2 = c[0] - d[0], y2 = c[1] - d[1], z2 = c[2] - d[2];
      let nx = (y1 * z2 - z1 * y2) * sign, ny = (z1 * x2 - x1 * z2) * sign, nz = (x1 * y2 - y1 * x2) * sign;
      const m = Math.hypot(nx, ny, nz);
      if (m > 1e-12) { nx /= m; ny /= m; nz /= m; } else { nx = p[0] - q[0]; ny = p[1] - q[1]; nz = p[2] - q[2]; const w = Math.hypot(nx, ny, nz) || 1; nx /= w; ny /= w; nz /= w; }
      pos.set(p, k * 3);
      nor[k * 3] = nx; nor[k * 3 + 1] = ny; nor[k * 3 + 2] = nz;
      uv[k * 2] = i / nu; uv[k * 2 + 1] = j / nv;
      k++;
    }
  }
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
      if (sign > 0) idx.push(a, b, d, a, d, c); else idx.push(a, d, b, a, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}
const hullInside = x => [x, centreAt(x), 0];
const hullPatch = (x0, x1, p0, p1, nx, np, off = 0) => patch((x, phi) => hullAt(x, phi, off), x0, x1, p0, p1, nx, np, x => hullInside(x));

/* a lifting surface, from where its edges run and how it stands; side is +1 or -1 across the aircraft */
function foil({le, te, y, t, z}) {
  const X = (s, c) => mix(le(s), te(s), c), chord = s => te(s) - le(s);
  const skin = up => (s, c) => [X(s, c), y(s) + chord(s) * t(s) * naca(c) * (up ? 1.08 : -.72), z(s)];
  const inside = (s, c) => [X(s, c), y(s), z(s)];
  return {
    X, chord, inside,
    /* both skins of a stretch of it, closed */
    both: (s0, s1, c0, c1, ns = 2, nc = 4) => merge([patch(skin(true), s0, s1, c0, c1, ns, nc, inside), patch(skin(false), s0, s1, c0, c1, ns, nc, inside)]),
    top: (s0, s1, c0, c1, ns = 2, nc = 3) => patch(skin(true), s0, s1, c0, c1, ns, nc, inside),
    under: (s0, s1, c0, c1, ns = 2, nc = 3) => patch(skin(false), s0, s1, c0, c1, ns, nc, inside),
  };
}
/* a fin stands on its edge: the same section, with z and y changing places */
function finFoil({le, te, t}) {
  const X = (s, c) => mix(le(s), te(s), c), chord = s => te(s) - le(s), inside = (s, c) => [X(s, c), s, 0];
  const skin = side => (s, c) => [X(s, c), s, side * chord(s) * t(s) * naca(c)];
  return {X, inside, both: (s0, s1, c0, c1, ns = 2, nc = 4) => merge([patch(skin(1), s0, s1, c0, c1, ns, nc, inside), patch(skin(-1), s0, s1, c0, c1, ns, nc, inside)])};
}

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
  const b = builder(17), r = b.r, body = new THREE.Group();
  b.root.add(body);
  const ti = std({color: 0xb7bbc1, metalness: 1, roughness: .26}), hot = std({color: 0x7f6a55, metalness: 1, roughness: .34}), dark = mats.blackAnodised(), steel = mats.steel(), chrome = mats.chrome(), copper = mats.copper();
  /* the paint: a white gloss over the top, a pearl grey belly and wings, and the page's red */
  const gloss = {clearcoat: 1, clearcoatRoughness: .14, side: THREE.DoubleSide};
  const paint = phys({color: 0xf2f0ea, metalness: 0, roughness: .42, ...gloss}), belly = phys({color: 0xaeb2b8, metalness: .1, roughness: .44, ...gloss});
  const wing = phys({color: 0xcdd0d4, metalness: .25, roughness: .42, ...gloss}), flapPaint = phys({color: 0x9fa4aa, metalness: .35, roughness: .46, ...gloss}), red = phys({color: 0x9e1c1c, metalness: .1, roughness: .34, ...gloss});
  const inner = std({color: 0x2a2c30, metalness: .7, roughness: .5, side: THREE.DoubleSide}), core = std({color: 0x4b4d52, metalness: .9, roughness: .4, side: THREE.DoubleSide}), edge = std({color: 0xd9dbdd, metalness: 1, roughness: .2, side: THREE.DoubleSide});
  const pane = phys({color: 0x10161d, metalness: .4, roughness: .08, clearcoat: 1, clearcoatRoughness: .04, side: THREE.DoubleSide}), seam = std({color: 0x85878a, metalness: .2, roughness: .6, side: THREE.DoubleSide});
  const navGreen = glowing(0x46ff8e, 1.8), navRed = glowing(0xff3b30, 1.8), beacon = glowing(0xff2a20, 2.4);
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
  const fanFace = () => {
    const g = new THREE.Group(), cone = M(alongX(lathe([[0, -.25], [.07, -.2], [.13, -.1], [.17, 0], [.18, .05], [0, .05]], 40)), chrome);
    g.position.x = -.96;
    g.add(spun(M(cyl(.2, .2, .08, 44).rotateZ(Math.PI / 2), steel), M(bladeRing(22, .18, .76, .15, .78, .009), ti), cone));
    return g;
  };
  fixed(fanFace());
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
  const plug = () => { const m = M(alongX(lathe([[.17, 0], [.15, .16], [.09, .34], [0, .5]], 36)), dark); m.position.x = .92; return m; };
  fixed(plug());
  /* the nacelle, a high-bypass turbofan's: polished lip, long fan cowl, then the core under it. The works show through
     the near side until those runs close over them */
  const half = (pts, mat, start = Math.PI / 2 + .5) => M(alongX(lathe(pts, 48, start, Math.PI + .1)), mat);
  const LIP = [[.7, -1.3], [.75, -1.29], [.81, -1.25], [.86, -1.17], [.885, -1.07]];
  const COWL = [
    {out: [[.885, -1.07], [.9, -.9], [.895, -.6], [.86, -.3]], in: [[.71, -1.3], [.77, -1.2], [.795, -1.02], [.8, -.72], [.77, -.35]], mat: paint},
    {out: [[.86, -.3], [.79, -.02], [.68, .22], [.58, .42]], in: [[.77, -.35], [.69, -.05], [.6, .2], [.53, .42]], mat: paint},
    {out: [[.5, .36], [.5, .6], [.45, .86], [.38, 1.06], [.27, 1.26]], in: [[.47, .36], [.47, .6], [.42, .86], [.35, 1.06], [.25, 1.25]], mat: core},
  ];
  const BAND = [[.901, -.66], [.899, -.6], [.894, -.54]];
  fixed(half(LIP, edge));
  COWL.forEach(c => { fixed(half(c.out, c.mat)); fixed(half(c.in, inner)); });
  fixed(half(BAND, red));

  /* ---- the near side of the cowl closes ---- */
  const NEAR = Math.PI * 1.5 + .4;
  on(half(LIP, edge, NEAR), .02, FLY * .8, [-.1, .4, 1], 2.6, {parent: engine});
  COWL.forEach((c, i) => {
    on(half(c.in, inner, NEAR), .04 + i * .06, FLY * .8, [.1, .2, 1], 2.6, {parent: engine});
    on(half(c.out, c.mat, NEAR), .1 + i * .07, FLY * .8, [.1, .3, 1], 3, {parent: engine});
  });
  on(half(BAND, red, NEAR), .34, FLY * .7, [-.1, .6, 1], 2.4, {parent: engine});

  /* the pylon: a blade, deep at the wing and fine at both ends */
  const pylon = (side, at) => {
    const f = (u, v) => {
      const x = mix(-3.05, -.2, u), low = -.72 + u * .02, high = mix(-.62, -.14, Math.pow(clamp01(u * 1.5), .7)), w = .012 + .085 * Math.pow(Math.sin(Math.PI * Math.pow(clamp01(u), .72)), .6);
      return [x, (low + high) / 2 + (high - low) / 2 * Math.sin(v), side * ENGINE[2] + w * Math.cos(v)];
    };
    const inside = u => [mix(-3.05, -.2, u), -.5, side * ENGINE[2]];
    on(M(patch(f, 0, .5, 0, TAU, 8, 12, inside), paint), at, FLY * .7, [.1, 1, .4 * side], 3);
    on(M(patch(f, .5, 1, 0, TAU, 8, 12, inside), paint), at + .08, FLY * .7, [.3, 1, .4 * side], 3.4);
  };
  pylon(1, .45);

  /* ---- a wing: spars, then ribs, the skin under and over them, and the moving surfaces ---- */
  function buildWing(side, t0) {
    const le = s => (s < 4.4 ? mix(-3.1, -.6, (s - .9) / 3.5) : mix(-.6, 3.5, (s - 4.4) / 5.6));
    const te = s => (s < 4.4 ? mix(1.2, 1.78, (s - .9) / 3.5) : mix(1.78, 4.1, (s - 4.4) / 5.6));
    const yy = s => -.56 + s * .092;
    const f = foil({le, te, y: yy, t: s => mix(.14, .085, clamp01((s - .9) / 9.1)), z: s => side * s});
    let n = 0;
    /* inside: two spars and the ribs, hidden once the skin is on */
    [.2, .62].forEach(c => [[.9, 4.4], [4.4, 10]].forEach(([s0, s1]) => {
      const g = new THREE.BoxGeometry(1, 1, 1), a = g.attributes.position;
      for (let i = 0; i < a.count; i++) {
        const ss = a.getZ(i) > 0 ? s1 : s0, q = c + (a.getX(i) > 0 ? .012 : -.012), thick = f.chord(ss) * .05;
        a.setXYZ(i, f.X(ss, q), yy(ss) + (a.getY(i) > 0 ? thick : -thick * .6), side * ss);
      }
      g.computeVertexNormals();
      on(M(g, steel), t0 + n++ * .06, FLY, [.04, .25, side], 8, {tumble: .1});
    }));
    const RIBS = 11, S = i => .9 + i * 9.1 / (RIBS - 1);
    for (let i = 0; i < RIBS; i++) {
      const s = S(i), c = f.chord(s), g = new THREE.BoxGeometry(c * .74, c * .055, .022).translate(f.X(s, .46), yy(s), side * s);
      on(M(g, steel), t0 + .22 + i * .035, FLY * .8, [.1, 1, side * .25], 3.4);
    }
    /* the underside, in three, and the top in two panels a bay */
    [[.9, 4.4], [4.4, 7.2], [7.2, 10]].forEach(([s0, s1], i) => on(M(f.under(s0, s1, .13, .76, 3, 4), belly), t0 + .5 + i * .05, FLY, [.1, -1, side * .15], 3.6));
    for (let i = 0; i < RIBS - 1; i++) {
      on(M(f.top(S(i), S(i + 1), .13, .44), wing), t0 + .62 + i * .04 + r() * .05, FLY * .8, [(r() - .5) * .5, 1, side * (.1 + r() * .3)], 3 + r() * 2.2);
      on(M(f.top(S(i), S(i + 1), .44, .76), wing), t0 + .68 + i * .04 + r() * .05, FLY * .8, [.2 + r() * .4, 1, side * (.1 + r() * .3)], 3 + r() * 2.2);
    }
    /* the polished leading edge in six slats, and the flaps and aileron behind */
    for (let i = 0; i < 6; i++) { const s0 = .9 + i * 9.1 / 6, s1 = s0 + 9.1 / 6; on(M(f.both(s0, s1, 0, .13, 2, 6), edge), t0 + 1.02 + i * .03, FLY * .7, [-.15, .4, side * .5], 2.2); }
    [[.9, 2.7], [2.7, 4.4], [4.4, 6.2], [6.2, 7.9]].forEach(([s0, s1], i) => on(M(f.both(s0, s1, .76, 1, 2, 3), flapPaint), t0 + 1.08 + i * .04, FLY * .7, [.6, -.5, side * .3], 2.8));
    on(M(f.both(7.9, 10, .76, 1, 2, 3), red), t0 + 1.25, FLY * .7, [.6, .4, side * .4], 2.6);
    /* the canoes under the wing that the flaps run on */
    [2.2, 4.4, 6.4].forEach((s, i) => on(M(new THREE.SphereGeometry(1, 14, 10).scale(.82 - i * .1, .07, .075).translate(f.X(s, .82) + .3, yy(s) - .11, side * s), belly), t0 + 1.2 + i * .03, FLY * .6, [.5, -1, 0], 2));
    /* the winglet: the tip blends upward and back, and carries a navigation light */
    const wl = (u, c) => {
      const k = glide(u), x0 = mix(le(10), le(10) + 1.05, u), x1 = mix(te(10), te(10) + .62, u);
      return {x: mix(x0, x1, c), y: yy(10) + k * 1.22, z: side * (10 + Math.sin(u * Math.PI / 2) * .26), thick: mix(.05, .014, u) * naca(c)};
    };
    const wskin = s => (u, c) => { const q = wl(u, c); return [q.x, q.y, q.z + s * q.thick]; };
    const winside = (u, c) => { const q = wl(u, c); return [q.x, q.y, q.z]; };
    on(M(merge([patch(wskin(1), 0, 1, 0, 1, 8, 4, winside), patch(wskin(-1), 0, 1, 0, 1, 8, 4, winside)]), red), t0 + 1.32, FLY * .7, [.1, 1, side * .4], 3);
    on(M(new THREE.SphereGeometry(.05, 10, 8).translate(f.X(10, .1), yy(10) + .02, side * 10.04), side > 0 ? navGreen : navRed), t0 + 1.38, FLY * .5, [0, .6, side], 1.4);
  }
  buildWing(1, .7);

  /* ---- the fuselage: the fairing where the wings join, the frames from the middle out, then the skin ---- */
  on(M(new THREE.SphereGeometry(1, 32, 20).scale(3.7, .68, 1.2).translate(-.7, -.56, 0), belly), 2.15, FLY, [.1, -1, .1], 3.6, {tumble: .1});
  const STATIONS = [];
  for (let i = 0; i <= 11; i++) STATIONS.push(-7.2 + i * 12.2 / 11);
  [...STATIONS].sort((p, q) => Math.abs(p) - Math.abs(q)).forEach((x, i) => {
    on(M(new THREE.TorusGeometry(R * .94, .028, 6, 36).rotateY(Math.PI / 2).translate(x, 0, 0), steel), 2.25 + i * .05, FLY * .8, [.05, 1, .25], 5);
  });
  [[-7, -1.8], [-1.8, 2.2], [2.2, 4.9]].forEach(([x0, x1], i) => on(M(new THREE.BoxGeometry(x1 - x0, .035, 1.8).translate((x0 + x1) / 2, -.34, 0), dark), 2.45 + i * .06, FLY * .8, [.4, 1, .3], 4));
  for (let i = 0; i < 6; i++) {
    const a = .5 + i / 6 * TAU;
    on(M(new THREE.BoxGeometry(12.2, .026, .026).translate(-1.1, -Math.sin(a) * R * .93, Math.cos(a) * R * .93), steel), 2.55 + i * .03, FLY * .8, [1, .1 * Math.cos(a), .1], 5, {tumble: .03});
  }
  /* a run of skin: white panels over the top and pearl grey under the belly line, each leaving along its own normal */
  const BELLY0 = .52, BELLY1 = Math.PI - .52;
  const leave = m => [(r() - .5) * .3, -Math.sin(m) + .28, Math.cos(m)];
  const skinRing = (x0, x1, panels, at, step, stagger, nx = 2) => {
    const upper = TAU - (BELLY1 - BELLY0), cut = [BELLY1];
    for (let k = 1; k < panels; k++) cut.push(BELLY1 + upper * (k + stagger) / panels);
    cut.push(BELLY0 + TAU);
    for (let k = 0; k < cut.length - 1; k++) {
      const g = hullPatch(x0, x1, cut[k], cut[k + 1], nx, Math.max(4, Math.ceil((cut[k + 1] - cut[k]) * 6)));
      on(M(g, paint), at + r() * step, FLY * .85, leave((cut[k] + cut[k + 1]) / 2), 3.2 + r() * 2.4, {tumble: .36});
    }
    const mid = Math.PI / 2 + (stagger - .25) * .5;
    [[BELLY0, mid], [mid, BELLY1]].forEach(([p0, p1]) => on(M(hullPatch(x0, x1, p0, p1, nx, 5), belly), at + r() * step, FLY * .85, leave((p0 + p1) / 2), 3 + r() * 2, {tumble: .3}));
  };
  const rings = [];
  for (let i = 0; i < 11; i++) rings.push([STATIONS[i], STATIONS[i + 1], (i % 2) * .5]);
  [...rings].sort((p, q) => Math.abs(p[0] + p[1]) - Math.abs(q[0] + q[1])).forEach(([x0, x1, off], i) => skinRing(x0, x1, 4, 2.95 + i * .13, .1, off));

  /* ---- the other wing, and the other engine, closed up ---- */
  buildWing(-1, 4.2);
  pylon(-1, 5.4);
  const other = new THREE.Group();
  other.position.set(ENGINE[0], ENGINE[1], -ENGINE[2]);
  body.add(other);
  on(M(alongX(lathe(LIP, 40)), edge), 5.5, FLY * .7, [.1, -.5, -.8], 2.4, {parent: other});
  COWL.forEach((c, i) => {
    on(M(alongX(lathe(c.in, 32)), inner), 5.52 + i * .04, FLY * .8, [.3, -1, -.3], 3.2, {parent: other});
    [0, Math.PI].forEach((a0, k) => on(M(alongX(lathe(c.out, 24, a0 + 1, Math.PI)), c.mat), 5.58 + i * .05 + k * .03, FLY * .8, [.25, k ? 1 : -1, k ? .5 : -.5], 3.4, {parent: other}));
  });
  on(M(alongX(lathe(BAND, 40)), red), 5.78, FLY * .6, [.3, .8, -.5], 2, {parent: other});
  on(fanFace(), 5.75, FLY * .8, [.2, -.3, -.9], 2.4, {parent: other});
  on(plug(), 5.8, FLY * .6, [1, -.3, -.2], 2.4, {parent: other});

  /* ---- the nose ---- */
  [-8.4, -9.2].forEach((x, i) => on(M(new THREE.TorusGeometry(radiusAt(x) * .93, .028, 6, 32).rotateY(Math.PI / 2).translate(x, centreAt(x), 0), steel), 5.85 + i * .05, FLY * .8, [0, 1, .25], 4));
  const NOSE = [-7.2, -8, -8.7, -9.3, -9.85];
  for (let i = 0; i < 4; i++) skinRing(NOSE[i + 1], NOSE[i], Math.max(2, 3 - i), 6 + i * .1, .08, i % 2 ? .4 : 0, 4);
  on(M(hullPatch(-10.597, -9.85, 0, TAU, 12, 28), paint), 6.42, FLY * .8, [-.1, 1, .3], 3.4, {tumble: .1});

  /* ---- the tail cone, which sweeps up, and the exhaust of the power unit in its tip ---- */
  [6.2, 7.6, 9].forEach((x, i) => on(M(new THREE.TorusGeometry(radiusAt(x) * .92, .026, 6, 30).rotateY(Math.PI / 2).translate(x, centreAt(x), 0), steel), 6.3 + i * .05, FLY * .8, [.5, 1, .2], 4));
  const AFT = [5, 6.2, 7.6, 9, 10.2, 10.94];
  for (let i = 0; i < 5; i++) skinRing(AFT[i], AFT[i + 1], Math.max(2, 4 - i), 6.45 + i * .1, .08, i % 2 ? .4 : 0, 4);
  on(M(alongX(lathe([[.15, 10.92], [.13, 11.02], [.1, 11.05]], 20)).translate(0, centreAt(10.95), 0), dark), 6.95, FLY * .6, [1, .2, 0], 1.8);

  /* ---- the fin and tailplane, bay by bay ---- */
  const fin = finFoil({le: s => mix(6.5, 9.75, (s - .7) / 4.4), te: s => mix(9.95, 10.9, (s - .7) / 4.4), t: s => mix(.095, .075, clamp01((s - .7) / 4.4))});
  {
    /* the fin's spar, inside its section from root to tip */
    const g = new THREE.BoxGeometry(1, 1, 1), a = g.attributes.position;
    for (let i = 0; i < a.count; i++) { const s = a.getY(i) > 0 ? 5.05 : .75; a.setXYZ(i, fin.X(s, a.getX(i) > 0 ? .5 : .3), s, a.getZ(i) > 0 ? .012 : -.012); }
    g.computeVertexNormals();
    on(M(g, steel), 7.05, FLY * .8, [.1, 1, .1], 5, {tumble: .08});
  }
  const FB = 7;
  for (let i = 0; i < FB; i++) { const s0 = mix(.7, 5.1, i / FB), s1 = mix(.7, 5.1, (i + 1) / FB); on(M(fin.both(s0, s1, 0, .74, 2, 5), red), 7.12 + i * .07, FLY * .8, [.25, .7, i % 2 ? .7 : -.7], 3.2 + r() * 1.4); }
  on(M(fin.both(.7, 2.9, .74, 1, 2, 3), red), 7.62, FLY * .7, [1, .3, .4], 2.6);
  on(M(fin.both(2.9, 5.1, .74, 1, 2, 3), red), 7.68, FLY * .7, [1, .3, -.4], 2.6);
  /* the fillet running forward from the root of the fin */
  const fillet = s => (x, c) => { const k = clamp01((x - 4.9) / 2.9); return [x, radiusAt(x) + centreAt(x) - .05 + k * k * .55 * c, s * mix(.05, .16, k) * Math.sqrt(1 - c * c * .98)]; };
  const filletIn = x => [x, radiusAt(x) + centreAt(x) - .1, 0];
  on(M(merge([patch(fillet(1), 4.9, 7.8, 0, 1, 8, 4, filletIn), patch(fillet(-1), 4.9, 7.8, 0, 1, 8, 4, filletIn)]), red), 7.7, FLY * .7, [.1, 1, .2], 2.4);
  const tailplane = (side, t0) => {
    const f = foil({le: s => mix(8.2, 10.2, (s - .3) / 3.7), te: s => mix(10.2, 11, (s - .3) / 3.7), y: s => .72 + s * .1, t: () => .09, z: s => side * s});
    for (let i = 0; i < 5; i++) { const s0 = mix(.3, 4, i / 5), s1 = mix(.3, 4, (i + 1) / 5); on(M(f.both(s0, s1, 0, .72, 2, 5), wing), t0 + i * .05, FLY * .75, [.3, .6, side * .8], 3 + r() * 1.4); }
    on(M(f.both(.3, 2.15, .72, 1, 2, 3), flapPaint), t0 + .28, FLY * .7, [.8, .4, side * .4], 2.4);
    on(M(f.both(2.15, 4, .72, 1, 2, 3), flapPaint), t0 + .33, FLY * .7, [.8, -.3, side * .4], 2.4);
  };
  tailplane(1, 7.55);
  tailplane(-1, 7.72);

  /* ---- last, the paint and the small things that make it read as an aircraft ---- */
  /* the red rising out of the fin onto the top of the tail */
  const sweep = (x, v) => hullAt(x, TOP + v * mix(.12, 1.25, Math.pow(clamp01((x - 6) / 4.9), 1.3)), .004);
  [[6, 7.6], [7.6, 9.2], [9.2, 10.9]].forEach(([x0, x1], i) => on(M(patch(sweep, x0, x1, -1, 1, 6, 8, x => hullInside(x)), red), 7.85 + i * .05, FLY * .6, [.2, 1, .3], 2.2));
  /* a fine red line down each side, a run at a time */
  [...rings, [5, 6.2], [6.2, 7.2]].forEach(([x0, x1], i) => [[.15, .195], [Math.PI - .195, Math.PI - .15]].forEach(([p0, p1], k) => {
    on(M(hullPatch(x0, x1, p0, p1, 3, 1, .004), red), 8.05 + i * .02 + k * .01, FLY * .5, [0, .2, k ? -1 : 1], 1.6, {tumble: .04});
  }));
  /* the windows, a run at a time, small and close, leaving room for the doors */
  const DOORS = [-6.75, -.9, 4.65];
  const clear = x => DOORS.every(d => Math.abs(x - d) > .3);
  rings.forEach(([x0, x1], i) => [1, -1].forEach(s => {
    const panes = [], phi = s > 0 ? -.27 : Math.PI + .27;
    for (let x = x0 + .05; x < x1 - .1; x += .264) if (clear(x) && x < 4.95) panes.push(hullPatch(x, x + .13, phi - .075, phi + .075, 1, 1, .005));
    if (panes.length) on(M(merge(panes), pane), 8.2 + i * .03 + (s > 0 ? 0 : .02), FLY * .5, [0, .3, s], 1.6, {tumble: .05});
  }));
  /* the doors, drawn as fine lines in the skin, each with its own window */
  DOORS.forEach((d, i) => [1, -1].forEach(s => {
    const phi = s > 0 ? -.13 : Math.PI + .13, w = .19, up = .44, down = .34, o = .0055, th = .011, tp = .012;
    const p0 = phi - up * s, p1 = phi + down * s, lo = Math.min(p0, p1), hi = Math.max(p0, p1);
    const lines = [hullPatch(d - w, d + w, lo, lo + tp, 2, 1, o), hullPatch(d - w, d + w, hi - tp, hi, 2, 1, o), hullPatch(d - w, d - w + th, lo, hi, 1, 3, o), hullPatch(d + w - th, d + w, lo, hi, 1, 3, o)];
    on(M(merge(lines), seam), 8.55 + i * .03, FLY * .45, [0, .3, s], 1.4, {tumble: .05});
    on(M(hullPatch(d - .06, d + .06, phi - s * .27 - .06, phi - s * .27 + .06, 1, 1, .006), pane), 8.6 + i * .03, FLY * .45, [0, .3, s], 1.4, {tumble: .05});
  }));
  /* the flight deck: a windscreen that wraps round the nose, three panes a side, with a slim pillar between them */
  const deck = (x0, x1, x2, x3, a0, a1) => (u, v) => { const xa = mix(x0, x1, u), xb = mix(x3, x2, u); return hullAt(mix(xa, xb, v), TOP + mix(a0, a1, u), .007); };
  [1, -1].forEach(s => [[-9.58, -9.3, -9.02, -9.34, .035, .46], [-9.27, -8.96, -8.74, -9.0, .49, .86], [-8.93, -8.56, -8.42, -8.72, .89, 1.14]].forEach(([x0, x1, x2, x3, a0, a1], i) => {
    const f = deck(x0, x1, x2, x3, a0 * s, a1 * s);
    on(M(patch(f, 0, 1, 0, 1, 5, 4, () => hullInside(mix(x0, x2, .5))), pane), 8.62 + i * .04, FLY * .5, [-.1, 1, s * .4], 1.6, {tumble: .1});
  }));
  /* aerials, the beacon on top and under, and the white tail light */
  [[-3.2, TOP, .3], [1.2, TOP, .22], [-5, Math.PI / 2, .2]].forEach(([x, phi, h], i) => {
    const p = hullAt(x, phi), up = phi === TOP ? 1 : -1;
    on(M(new THREE.BoxGeometry(.2, h, .018).translate(x, p[1] + up * h / 2, 0), dark), 8.9 + i * .03, FLY * .4, [0, up, 0], 1.2, {tumble: .05});
  });
  [[-1.4, TOP], [-.6, Math.PI / 2]].forEach(([x, phi]) => { const p = hullAt(x, phi, .03); on(M(new THREE.SphereGeometry(.045, 10, 8).translate(p[0], p[1], p[2]), beacon), 8.98, FLY * .4, [0, 1, 0], 1.2); });
  on(M(new THREE.SphereGeometry(.04, 8, 6).translate(11.06, centreAt(10.95), 0), glowing(0xfff2d8, 1.8)), 9, FLY * .4, [1, 0, 0], 1.2);

  /* the camera: close on the engine, drawing back as the aircraft grows round it */
  const pull = t => glide(t / 4.6);
  const view = {ex: 1.46, ey: .92, pitch: .16, yaw: .52, roll: 0, dx: 0, dy: 0};
  return {
    root: b.root, pieces: b.pieces, ex: 12, ey: 6, pitch: .34, yaw: .62, reach: 6, turn: .3,
    /* the build is spent in the first stretch of the section, and the engine holds down the rest of it */
    scrub: (p, px) => END * (1 - clamp01((px - HOLD) / SPAN)),
    view(t, clock) {
      const k = pull(t);
      /* the finished aircraft's outline from this angle is wider on the side of the near wing, so it sits a little left */
      view.ex = Math.exp(mix(log(1.46), log(12.4), k));
      view.ey = Math.exp(mix(log(.95), log(5.4), k));
      view.pitch = mix(.16, .24, k);
      view.yaw = mix(.52, .78, k);
      /* the finished aircraft flies in as the section arrives, then holds a shallow climb, banked toward you */
      const whole = glide((t - END + 1.2) / 1.2), inb = whole * Math.pow(1 - glide(clock / 1.5), 2);
      body.position.set(-ENGINE[0] * (1 - k), -ENGINE[1] * (1 - k) - k * .55, -ENGINE[2] * (1 - k));
      body.rotation.x = k * (.13 + inb * .3 + whole * Math.sin(clock * .6) * .02);
      view.dx = inb * 24 - k * .9;
      view.dy = inb * 5 + whole * Math.sin(clock * .9) * .08;
      view.roll = -.09 * k + inb * -.2;
      return view;
    },
    tick(t, clock) {
      const a = clock * 8;
      rotors.forEach((o, i) => { o.rotation.x = a + i * .3; });
      fire.color.copy(fire.userData.base).multiplyScalar(.95 + .1 * Math.sin(clock * 17));
      /* the beacons flash, twice in every second and a bit */
      const ph = clock % 1.25, flash = ph < .09 || (ph > .2 && ph < .29) ? 1.3 : .18;
      beacon.color.copy(beacon.userData.base).multiplyScalar(flash);
    },
  };
}
