/* The world of the descent, in metres, with Kathmandu's tall building at the origin. The Himalaya stands to
   the north, foothills run down either side of a river's valley, a few thousand low brick and plaster blocks
   spread along it and out along its roads, and behind one lit window is a dark room with someone at a monitor. */
export const HERO = {half: 8, height: 62, z: 8, winY: 46, winW: 2.7, winH: 1.9};

const srgb = h => [(h >> 16 & 255) / 255, (h >> 8 & 255) / 255, (h & 255) / 255];
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };

/* ---- the land ---- */
function hash(ix, iz) {
  let h = Math.imul(ix, 374761393) + Math.imul(iz, 668265263) | 0;
  h = Math.imul(h ^ h >>> 13, 1274126177);
  return ((h ^ h >>> 16) >>> 0) / 4294967296;
}
function noise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
  const a = hash(ix, iz), b = hash(ix + 1, iz), c = hash(ix, iz + 1), d = hash(ix + 1, iz + 1);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}
function fbm(x, z, n) {
  let s = 0, a = .5, f = 1;
  for (let i = 0; i < n; i++) { s += noise(x * f + i * 7.1, z * f - i * 3.3) * a; a *= .5; f *= 2.03; }
  return s;
}
/* sharp ridgelines: each octave only adds where the last one was already high */
function ridged(x, z, n) {
  let s = 0, a = 1, f = 1, w = 1;
  for (let i = 0; i < n; i++) {
    let v = 1 - Math.abs(2 * noise(x * f + i * 17.3, z * f - i * 9.1) - 1);
    v *= v;
    v *= w;
    s += v * a;
    w = clamp(v * 1.7);
    a *= .5;
    f *= 2.07;
  }
  return s;
}
/* The valley is a river's: it comes down from the foot of the peaks, passes the city and carries on to the
   south-west, with side valleys joining it. u runs along it, up toward the peaks, and v across it, east positive. */
const UX = .34, UZ = -.94, VX = .94, VZ = .34;
const wander = u => (noise(u / 7000 + 31.7, 1.7) - .5) * 6200 + (noise(u / 2100 + 9.3, 4.1) - .5) * 1500;
const WANDER0 = wander(0);
const mid = u => wander(u) - WANDER0 + 500;
/* the river keeps to the east side, so the city stands on its west bank */
const riverV = u => mid(u) + 520 + (noise(u / 900 + 2.2, 6.6) - .5) * 520;
const onV = (u, v) => [u * UX + v * VX, u * UZ + v * VZ];
const ARMS = [
  {x: -600, z: 300, dx: -.93, dz: -.37, len: 9500, w0: 1250, w1: 360, s: 3.3},
  {x: 1500, z: -2400, dx: .95, dz: -.31, len: 8000, w0: 900, w1: 300, s: 7.7},
  {x: 800, z: 2200, dx: .72, dz: .69, len: 7000, w0: 900, w1: 300, s: 12.1},
];
const armBend = (a, s) => (noise(s / 2600 + a.s, a.s) - .5) * 1800 * smooth(0, 2500, s);
/* how far outside the valley floor a point is, in metres; negative is on it */
function offFloor(x, z) {
  const u = x * UX + z * UZ, v = x * VX + z * VZ;
  const half = 720 + 2300 * Math.exp(-(u * u) / (5200 * 5200)) + (noise(u / 3000, 8.8) - .5) * 900;
  let dn = Math.abs(v - mid(u)) - half + smooth(14000, 24000, u) * 6000 + smooth(20000, 34000, -u) * 6000;
  for (let i = 0; i < ARMS.length; i++) {
    const a = ARMS[i], s = (x - a.x) * a.dx + (z - a.z) * a.dz, n = -(x - a.x) * a.dz + (z - a.z) * a.dx - armBend(a, s);
    const w = a.w0 + (a.w1 - a.w0) * smooth(0, a.len, s);
    const d = (s < 0 ? Math.hypot(s, n) : Math.abs(n)) - w + smooth(a.len * .8, a.len * 1.4, s) * 5000;
    if (d < dn) dn = d;
  }
  return dn;
}
export function heightAt(x, z) {
  const floor = -4 + smooth(5000, 15000, Math.hypot(x, z)) * 640;
  /* the edge of the floor wanders at every scale: spurs run out into it and bays run back between them */
  const dn = offFloor(x, z) + (fbm(x / 1500, z / 1500, 3) - .44) * 2300;
  if (dn <= 0) return floor;
  const zr = z + 27000 + (noise(x / 15000, 3.1) - .5) * 7000, range = Math.exp(-(zr * zr) / (8600 * 8600));
  const foot = fbm(x / 5200, z / 5200, 5), hills = foot * foot * 3300 + ridged(x / 2800, z / 2800, 4) * 420 + ridged(x / 1150, z / 1150, 3) * 230;
  let high = 0;
  if (range > .01) high = range * (Math.pow(ridged(x / 15500, z / 15500, 7), 1.2) * 5300 + 1900);
  return floor + smooth(0, 4600, dn) * (hills + high);
}

export const PATCHES = [
  /* the whole region, coarse, then finer where the flight goes low past the peaks and over the hills */
  {x0: -56000, x1: 56000, z0: -66000, z1: 36000, nx: 400, nz: 365, drop: 60},
  {x0: -8000, x1: 40000, z0: -42000, z1: -11000, nx: 620, nz: 400, drop: 0},
  {x0: -14000, x1: 15000, z0: -11000, z1: 15000, nx: 430, nz: 385, drop: 0},
];
const inPatch = (p, x, z) => x > p.x0 && x < p.x1 && z > p.z0 && z < p.z1;

/* a patch of land, built a row at a time so the flight above it never waits: yields between rows */
export function* buildPatch(pi, out) {
  const p = PATCHES[pi], nx = p.nx, nz = p.nz, dx = (p.x1 - p.x0) / (nx - 1), dz = (p.z1 - p.z0) / (nz - 1), hs = new Float32Array(nx * nz);
  for (let j = 0; j < nz; j++) {
    const z = p.z0 + j * dz;
    for (let i = 0; i < nx; i++) {
      const x = p.x0 + i * dx;
      let h = heightAt(x, z);
      /* the coarse land sinks out of the way under the finer patches */
      if (p.drop && (inPatch(PATCHES[1], x, z) || inPatch(PATCHES[2], x, z))) h -= p.drop;
      hs[j * nx + i] = h;
    }
    yield;
  }
  const v = new Float32Array(nx * nz * 6);
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * nx + i, l = hs[j * nx + Math.max(i - 1, 0)], r = hs[j * nx + Math.min(i + 1, nx - 1)], d = hs[Math.max(j - 1, 0) * nx + i], u = hs[Math.min(j + 1, nz - 1) * nx + i];
      let n0 = (l - r) / (2 * dx), n2 = (d - u) / (2 * dz);
      const m = 1 / Math.hypot(n0, 1, n2);
      v.set([p.x0 + i * dx, hs[a], p.z0 + j * dz, n0 * m, m, n2 * m], a * 6);
    }
    if (j % 8 === 0) yield;
  }
  const ix = new Uint32Array((nx - 1) * (nz - 1) * 6);
  let k = 0;
  for (let j = 0; j < nz - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
      ix[k++] = a; ix[k++] = c; ix[k++] = b; ix[k++] = b; ix[k++] = c; ix[k++] = d;
    }
  }
  out.verts = v;
  out.index = ix;
}

/* ---- the city ---- */
export function cityData() {
  /* a unit block: x and z from -.5 to .5, y from 0 to 1, position and normal */
  const faces = [
    [[1, 0, 0], [[.5, 0, -.5], [.5, 1, -.5], [.5, 1, .5], [.5, 0, -.5], [.5, 1, .5], [.5, 0, .5]]],
    [[-1, 0, 0], [[-.5, 0, .5], [-.5, 1, .5], [-.5, 1, -.5], [-.5, 0, .5], [-.5, 1, -.5], [-.5, 0, -.5]]],
    [[0, 0, 1], [[.5, 0, .5], [.5, 1, .5], [-.5, 1, .5], [.5, 0, .5], [-.5, 1, .5], [-.5, 0, .5]]],
    [[0, 0, -1], [[-.5, 0, -.5], [-.5, 1, -.5], [.5, 1, -.5], [-.5, 0, -.5], [.5, 1, -.5], [.5, 0, -.5]]],
    [[0, 1, 0], [[-.5, 1, -.5], [-.5, 1, .5], [.5, 1, .5], [-.5, 1, -.5], [.5, 1, .5], [.5, 1, -.5]]],
    [[0, -1, 0], [[-.5, 0, .5], [-.5, 0, -.5], [.5, 0, -.5], [-.5, 0, .5], [.5, 0, -.5], [.5, 0, .5]]],
  ];
  const box = [];
  faces.forEach(([n, pts]) => pts.forEach(p => box.push(...p, ...n)));

  let seed = 2118;
  const r = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const walls = [0xa8593c, 0xb86f4c, 0x96492f, 0xc6a176, 0xdccdb2, 0xe6dfcf, 0x8c8a82, 0xb5855f, 0xd2b48c, 0x7f4a3a].map(srgb);
  const tank = srgb(0x1b1c1f), out = [], put = (x, z, w, d, h, c) => out.push(x, z, w, d, h, c[0], c[1], c[2]);
  /* maps of the valley floor, 12 km across: the roads, how close each point is to one, and where the town is */
  const M = 512, EXT = 6000, PX = EXT * 2 / M, road = new Float32Array(M * M), town = new Float32Array(M * M);
  const texel = (x, z) => { const i = Math.floor((x + EXT) / PX), j = Math.floor((z + EXT) / PX); return i < 0 || j < 0 || i >= M || j >= M ? -1 : j * M + i; };
  const at = (a, x, z) => { const k = texel(x, z); return k < 0 ? 0 : a[k]; };
  const line = (x0, z0, x1, z1) => {
    const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / (PX * .5));
    for (let i = 0; i <= n; i++) { const k = texel(x0 + (x1 - x0) * i / n, z0 + (z1 - z0) * i / n); if (k >= 0) road[k] = 1; }
  };
  const blur = (a, rad) => {
    const b = new Float32Array(a.length), w = 2 * rad + 1;
    for (let pass = 0; pass < 2; pass++) {
      for (let j = 0; j < M; j++) { let s = 0; for (let i = -rad; i < M; i++) { s += a[j * M + Math.min(i + rad, M - 1)] - (i > rad ? a[j * M + i - rad - 1] : 0); if (i >= 0) b[j * M + i] = s / w; } }
      for (let i = 0; i < M; i++) { let s = 0; for (let j = -rad; j < M; j++) { s += b[Math.min(j + rad, M - 1) * M + i] - (j > rad ? b[(j - rad - 1) * M + i] : 0); if (j >= 0) a[j * M + i] = s / w; } }
    }
    return a;
  };
  /* the old road beside the river, and one up each side valley, joined at the middle of town */
  let was = null;
  for (let u = -9000; u <= 9000; u += 60) {
    const q = onV(u, mid(u) - 200 + (noise(u / 1200, 3.3) - .5) * 500);
    if (was) line(was[0], was[1], q[0], q[1]);
    was = q;
  }
  const armAt = (a, s) => { const n = armBend(a, s); return [a.x + s * a.dx - n * a.dz, a.z + s * a.dz + n * a.dx]; };
  ARMS.forEach(a => {
    was = [Math.min(a.x * .2, 200), a.z * .2];
    for (let s = 0; s <= a.len * .7; s += 60) { const q = armAt(a, s); line(was[0], was[1], q[0], q[1]); was = q; }
  });
  const near = blur(road.slice(), 7);
  let top = 0;
  for (let i = 0; i < near.length; i++) if (near[i] > top) top = near[i];
  /* villages further out, each at a bend of a road */
  const VIL = [[...onV(3900, mid(3900)), 400], [...onV(-3700, mid(-3700)), 430], [...armAt(ARMS[0], 3000), 380], [...armAt(ARMS[1], 1500), 320], [...armAt(ARMS[2], 1500), 340], [-2100, -1500, 260], [-1800, 2500, 300]];
  const CELL = 38, N = 150;
  for (let i = -N; i <= N; i++) {
    for (let j = -N; j <= N; j++) {
      const c0 = i * CELL, z0 = j * CELL, dist0 = c0 * c0 + z0 * z0;
      /* clear the street the camera comes in along, and the ground round the tall building */
      if (dist0 < 34 * 34) continue;
      /* the old town: long down the valley, and blotchy */
      const u0 = c0 * UX + z0 * UZ, v0 = c0 * VX + z0 * VZ, e0 = Math.hypot(u0 / 2.1, v0 / .92), rn = at(near, c0, z0) / top;
      let vil = 0;
      for (let k = 0; k < VIL.length; k++) { const dx = c0 - VIL[k][0], dz = z0 - VIL[k][1], rv = VIL[k][2] * 1.5; if (dx * dx + dz * dz < rv * rv) vil = 1; }
      if (e0 > 2500 && rn < .015 && !vil) continue;
      const blot = fbm(c0 / 700, z0 / 700, 3), dist = Math.sqrt(dist0);
      const core = 1 - smooth(650, 1850, e0 + (blot - .44) * 1500);
      const tendril = Math.min(1, rn * 1.5) * (1 - smooth(2000, 5400, dist)) * .92;
      let village = 0;
      if (vil) for (let k = 0; k < VIL.length; k++) village = Math.max(village, 1 - smooth(VIL[k][2] * .35, VIL[k][2] * 1.2, Math.hypot(c0 - VIL[k][0], z0 - VIL[k][1]) + (blot - .44) * 380));
      /* fields come right into the edges of town */
      const want = Math.max(core, tendril, village * .85) * smooth(.26, .4, fbm(c0 / 380, z0 / 380, 2) + core * .24);
      if (r() > want * want * .55 + want * .45) continue;
      /* the blocks keep to the grid near the tall building, and away from it the streets bend */
      const bend = smooth(500, 1400, dist) * 70, cx = c0 + (noise(c0 / 500, z0 / 500) - .5) * bend, cz = z0 + (noise(c0 / 500 + 7.7, z0 / 500 + 3.1) - .5) * bend;
      /* not in the river, and not up the side of a hill */
      if (Math.abs(cx * VX + cz * VZ - riverV(cx * UX + cz * UZ)) < 90 || heightAt(cx, cz) > -1) continue;
      const parts = 1 + Math.floor(r() * (1.2 + core * 1.8));
      for (let k = 0; k < parts; k++) {
        const w = 11 + r() * 14, d = 11 + r() * 14, x = cx + (r() - .5) * (CELL - w - 6), z = cz + (r() - .5) * (CELL - d - 6);
        const tall = Math.pow(r(), 3.2), h = 7 + tall * 24 * (.3 + .7 * core) + r() * 7 + (dist < 500 ? r() * 9 : 0);
        put(x, z, w, d, h, walls[Math.floor(r() * walls.length)]);
        const q = texel(x, z);
        if (q >= 0) town[q] += w * d / (PX * PX);
        if (r() < .55 && core > .3) put(x + (r() - .5) * (w - 3), z + (r() - .5) * (d - 3), 1.9, 1.9, h + 1.9, tank);
      }
    }
  }
  blur(town, 3);
  /* the tall building itself, in the paper and ink of the page */
  put(0, 0, HERO.half * 2, HERO.half * 2, HERO.height, srgb(0xe9e4d8));
  /* the ground reads these: red is town, green is road */
  const map = new Uint8Array(M * M * 2);
  for (let i = 0; i < M * M; i++) { map[i * 2] = Math.min(255, town[i] * 420); map[i * 2 + 1] = road[i] * 255; }
  return {box: new Float32Array(box), inst: new Float32Array(out), count: out.length / 8, map, mapSize: M, mapExtent: EXT};
}

/* position and colour, six floats a vertex, with light baked in */
function builder() {
  const v = [];
  const tri = (a, b, c, ca, cb = ca, cc = ca) => v.push(...a, ...ca, ...b, ...cb, ...c, ...cc);
  const quad = (a, b, c, d, ca, cb = ca, cc = cb, cd = ca) => { tri(a, b, c, ca, cb, cc); tri(a, c, d, ca, cc, cd); };
  const dim = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
  /* an outside box, lit from the low Sun */
  const solid = (x0, y0, z0, x1, y1, z1, c) => {
    quad([x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [x0, y0, z1], dim(c, .92));
    quad([x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1], dim(c, 1.16));
    quad([x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [x0, y0, z0], dim(c, .46));
    quad([x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0], dim(c, .5));
    quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], dim(c, 1.05));
  };
  return {v, tri, quad, dim, solid};
}

/* the river, a ribbon on the valley floor, tapering away at both ends */
export function riverMesh() {
  const b = builder(), a = srgb(0x6f8690), c = srgb(0x5c747f);
  let prev = null;
  for (let u = -19000; u <= 13500; u += 90) {
    const v = riverV(u), [x, z] = onV(u, v), y = Math.max(heightAt(x, z), 0) + 1.2;
    const w = (13 + noise(u / 700, 1.1) * 15) * smooth(13500, 11000, u) * smooth(-19000, -16000, u);
    const L = [x - VX * w, y, z - VZ * w], R = [x + VX * w, y, z + VZ * w];
    if (prev) b.quad(prev[0], L, R, prev[1], a, c, c, a);
    prev = [L, R];
  }
  return new Float32Array(b.v);
}

/* the tall building's trim and the one window that matters */
export function heroMesh() {
  const b = builder(), {half: S, height: T, z: Z, winY: Y, winW: W, winH: H} = HERO, red = srgb(0x9e1c1c), ink = srgb(0x17171a);
  /* a red band round the top floor, and a mast */
  b.solid(-S - .15, T - 3.6, -S - .15, S + .15, T - 1.5, S + .15, red);
  b.solid(-S * .4, T, -S * .4, S * .4, T + 2.4, S * .4, ink);
  b.solid(-.14, T + 2.4, -.14, .14, T + 15, .14, srgb(0x9c9ea2));
  /* the frame and the warm light in it */
  const f = .24;
  b.quad([W / 2 + f, Y - H / 2 - f, Z + .02], [W / 2 + f, Y + H / 2 + f, Z + .02], [-W / 2 - f, Y + H / 2 + f, Z + .02], [-W / 2 - f, Y - H / 2 - f, Z + .02], ink);
  const warm = [1, .86, .58], core = [1, .96, .84];
  b.quad([W / 2, Y - H / 2, Z + .04], [W / 2, Y + H / 2, Z + .04], [-W / 2, Y + H / 2, Z + .04], [-W / 2, Y - H / 2, Z + .04], warm, core, core, warm);
  return new Float32Array(b.v);
}

/* a stupa on the way in: white dome, gold spire, on stepped terraces */
export function stupaMesh() {
  const b = builder(), X = -300, Z = 300, white = srgb(0xf1ece0), gold = srgb(0xd4a53a), SEG = 36, sun = [.72, .36, .42];
  const lit = (n, c) => b.dim(c, .44 + Math.max(0, n[0] * sun[0] + n[1] * sun[1] + n[2] * sun[2]) * .92);
  for (let k = 0; k < 3; k++) { const r = 38 - k * 8; b.solid(X - r, k * 2.2, Z - r, X + r, (k + 1) * 2.2, Z + r, white); }
  const y0 = 6.6, R = 20;
  for (let i = 0; i < SEG; i++) {
    const a0 = i / SEG * Math.PI * 2, a1 = (i + 1) / SEG * Math.PI * 2;
    for (let j = 0; j < 10; j++) {
      const t0 = j / 10 * Math.PI / 2, t1 = (j + 1) / 10 * Math.PI / 2;
      const P = (a, t) => [X + Math.cos(a) * Math.cos(t) * R, y0 + Math.sin(t) * R * .72, Z + Math.sin(a) * Math.cos(t) * R];
      const Nr = (a, t) => [Math.cos(a) * Math.cos(t), Math.sin(t), Math.sin(a) * Math.cos(t)];
      b.quad(P(a0, t0), P(a0, t1), P(a1, t1), P(a1, t0), lit(Nr(a0, t0), white), lit(Nr(a0, t1), white), lit(Nr(a1, t1), white), lit(Nr(a1, t0), white));
    }
  }
  const top = y0 + R * .72;
  b.solid(X - 4.2, top - .4, Z - 4.2, X + 4.2, top + 4.6, Z + 4.2, gold);
  for (let i = 0; i < 12; i++) {
    const a0 = i / 12 * Math.PI * 2, a1 = (i + 1) / 12 * Math.PI * 2, rr = 3.6, h = 15, base = top + 4.6;
    b.tri([X + Math.cos(a0) * rr, base, Z + Math.sin(a0) * rr], [X, base + h, Z], [X + Math.cos(a1) * rr, base, Z + Math.sin(a1) * rr], lit([Math.cos(a0), .3, Math.sin(a0)], gold));
  }
  return new Float32Array(b.v);
}

/* The room, in the monitor's light and the last of the window's. */
export const DESK = (() => {
  const F = HERO.winY - 1.5;
  return {F, sy: F + 1.1, sz: -2.26, sw: .56, sh: .33};
})();

export function roomMesh() {
  const b = builder(), {winY: Y, z: Z} = HERO, F = DESK.F, C = Y + 1.7, X = 4.2, back = -3.6, front = Z - .02;
  const {sy: MY, sz: MZ, sw: MW, sh: MH} = DESK;
  const glow = [.62, .78, 1];

  /* how a surface takes the light here: the screen in front of it, the window behind, a little from everywhere */
  const shade = (p, n, base) => {
    const lx = 0 - p[0], ly = MY - p[1], lz = MZ - p[2], d = Math.hypot(lx, ly, lz) || 1;
    const fromScreen = Math.max(0, (n[0] * lx + n[1] * ly + n[2] * lz) / d) * 1.5 / (1 + d * d * .55);
    const fromWindow = Math.max(0, n[2] * .8 + n[1] * .3) * .34;
    /* the rim that outlines someone against a bright screen */
    const rim = Math.pow(1 - Math.max(0, n[2]), 3) * .55 / (1 + d * .55);
    return [
      base[0] * (.035 + fromWindow * 1 + fromScreen * glow[0]) + rim * glow[0] * .5,
      base[1] * (.032 + fromWindow * .82 + fromScreen * glow[1]) + rim * glow[1] * .5,
      base[2] * (.034 + fromWindow * .62 + fromScreen * glow[2]) + rim * glow[2] * .5,
    ];
  };
  /* a smooth lump between two points: heads, shoulders, arms */
  const blob = (cx, cy, cz, rx, ry, rz, base, seg = 20, rings = 14) => {
    const P = (a, t) => [cx + Math.cos(a) * Math.cos(t) * rx, cy + Math.sin(t) * ry, cz + Math.sin(a) * Math.cos(t) * rz];
    const Q = (a, t) => { const n = [Math.cos(a) * Math.cos(t) / rx, Math.sin(t) / ry, Math.sin(a) * Math.cos(t) / rz], m = 1 / Math.hypot(n[0], n[1], n[2]); return [n[0] * m, n[1] * m, n[2] * m]; };
    for (let i = 0; i < seg; i++) {
      for (let j = 0; j < rings; j++) {
        const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2, t0 = -Math.PI / 2 + j / rings * Math.PI, t1 = -Math.PI / 2 + (j + 1) / rings * Math.PI;
        const pa = P(a0, t0), pb = P(a0, t1), pc = P(a1, t1), pd = P(a1, t0);
        b.quad(pa, pb, pc, pd, shade(pa, Q(a0, t0), base), shade(pb, Q(a0, t1), base), shade(pc, Q(a1, t1), base), shade(pd, Q(a1, t0), base));
      }
    }
  };
  /* a limb: a tube from one point to another */
  const limb = (p, q, r0, r1, base, seg = 12) => {
    const d = [q[0] - p[0], q[1] - p[1], q[2] - p[2]], L = Math.hypot(d[0], d[1], d[2]), w = [d[0] / L, d[1] / L, d[2] / L];
    const up = Math.abs(w[1]) > .9 ? [1, 0, 0] : [0, 1, 0], u0 = [w[1] * up[2] - w[2] * up[1], w[2] * up[0] - w[0] * up[2], w[0] * up[1] - w[1] * up[0]], ul = 1 / Math.hypot(u0[0], u0[1], u0[2]), u = [u0[0] * ul, u0[1] * ul, u0[2] * ul];
    const v2 = [w[1] * u[2] - w[2] * u[1], w[2] * u[0] - w[0] * u[2], w[0] * u[1] - w[1] * u[0]];
    const ring = (c, r, a) => [c[0] + (u[0] * Math.cos(a) + v2[0] * Math.sin(a)) * r, c[1] + (u[1] * Math.cos(a) + v2[1] * Math.sin(a)) * r, c[2] + (u[2] * Math.cos(a) + v2[2] * Math.sin(a)) * r];
    const nn = a => [u[0] * Math.cos(a) + v2[0] * Math.sin(a), u[1] * Math.cos(a) + v2[1] * Math.sin(a), u[2] * Math.cos(a) + v2[2] * Math.sin(a)];
    for (let i = 0; i < seg; i++) {
      const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2, pa = ring(p, r0, a0), pb = ring(q, r1, a0), pc = ring(q, r1, a1), pd = ring(p, r0, a1);
      b.quad(pa, pb, pc, pd, shade(pa, nn(a0), base), shade(pb, nn(a0), base), shade(pc, nn(a1), base), shade(pd, nn(a1), base));
    }
    blob(q[0], q[1], q[2], r1, r1, r1, base, 10, 6);
  };
  /* a box in this room's light */
  const room = (x0, y0, z0, x1, y1, z1, base) => {
    const f = (a, c, d, e, n) => b.quad(a, c, d, e, shade(a, n, base), shade(c, n, base), shade(d, n, base), shade(e, n, base));
    f([x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [x0, y0, z1], [0, 0, 1]);
    f([x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1], [1, 0, 0]);
    f([x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [x0, y0, z0], [-1, 0, 0]);
    f([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0]);
  };

  /* the walls, floor and ceiling */
  const wall = [.17, .155, .145], wallFar = [.07, .07, .078];
  const floorNear = [.36, .27, .19], floorFar = [.06, .054, .05];
  b.quad([-X, F, front], [X, F, front], [X, F, back], [-X, F, back], floorNear, floorNear, floorFar, floorFar);
  b.quad([-X, C, back], [X, C, back], [X, C, front], [-X, C, front], wallFar, wallFar, wall, wall);
  b.quad([-X, F, back], [X, F, back], [X, C, back], [-X, C, back], wallFar);
  b.quad([-X, F, front], [-X, F, back], [-X, C, back], [-X, C, front], wall, wallFar, wallFar, wall);
  b.quad([X, F, back], [X, F, front], [X, C, front], [X, C, back], wallFar, wall, wall, wallFar);
  /* the screen's glow on the wall behind it */
  const halo = [.26, .33, .44];
  const hc = [0, MY, back + .012], SEG = 28;
  for (let i = 0; i < SEG; i++) {
    const a0 = i / SEG * Math.PI * 2, a1 = (i + 1) / SEG * Math.PI * 2;
    b.tri(hc, [Math.cos(a0) * 2.5, MY + Math.sin(a0) * 1.25, back + .012], [Math.cos(a1) * 2.5, MY + Math.sin(a1) * 1.25, back + .012], halo, wallFar, wallFar);
  }

  /* the window's patch of light across the floor, with the shadow of its bars */
  const sun = [.74, .55, .36], fade = [.3, .23, .16], bar = [.11, .085, .065];
  b.quad([-.95, F + .004, Z - .6], [.95, F + .004, Z - .6], [1.45, F + .004, .9], [-1.45, F + .004, .9], sun, sun, fade, fade);
  b.quad([-.05, F + .006, Z - .6], [.05, F + .006, Z - .6], [.08, F + .006, .9], [-.08, F + .006, .9], bar);
  b.quad([-1.1, F + .006, Z - 3.9], [1.1, F + .006, Z - 3.9], [1.14, F + .006, Z - 4.1], [-1.14, F + .006, Z - 4.1], bar);

  /* the desk, the keyboard, the monitor on its stand */
  const wood = [.42, .33, .25], black = [.07, .07, .08], grey = [.2, .2, .22], D0 = -2.86, D1 = -1.56, TOP = F + .74;
  room(-1.25, TOP - .04, D0, 1.25, TOP, D1, wood);
  [[-1.18, D1 + .07], [1.18, D1 + .07], [-1.18, D0 + .07], [1.18, D0 + .07]].forEach(([x, z]) => room(x - .03, F, z - .03, x + .03, TOP - .04, z + .03, grey));
  room(-.24, TOP, -1.92, .22, TOP + .018, -1.74, grey);
  room(.3, TOP, -1.86, .37, TOP + .022, -1.76, grey);
  room(-.17, TOP, MZ - .13, .17, TOP + .014, MZ + .05, grey);
  room(-.024, TOP, MZ - .05, .024, MY - MH, MZ - .022, grey);
  const e = .018;
  room(-MW - e, MY - MH - e, MZ - .03, MW + e, MY + MH + e, MZ - .004, black);

  /* the screen itself: a dark page of code, the brightest thing in the room */
  const S = [.06, .08, .13], sz = MZ + .001;
  b.quad([MW, MY - MH, sz], [MW, MY + MH, sz], [-MW, MY + MH, sz], [-MW, MY - MH, sz], [.09, .12, .19], S, S, [.09, .12, .19]);
  const lines = [[.1, .55, 0], [.15, .4, 1], [.15, .62, 2], [.2, .3, 3], [.2, .5, 1], [.15, .36, 2], [.1, .2, 0], [.1, .64, 1], [.15, .46, 3], [.2, .52, 2], [.15, .26, 1], [.1, .48, 0], [.1, .34, 3]];
  const inks = [[1, .78, .46], [.5, .84, 1], [.56, .94, .7], [.96, .56, .52]];
  lines.forEach(([ind, len, c], i) => {
    const y1 = MY + MH * .86 - i * MH * .135, y0 = y1 - MH * .062, x0 = -MW * .88 + ind * MW, x1 = x0 + len * MW * 1.45;
    b.quad([x1, y0, sz + .001], [x1, y1, sz + .001], [x0, y1, sz + .001], [x0, y0, sz + .001], inks[c]);
  });

  /* the chair */
  const seatZ = -.72;
  limb([0, F, seatZ], [0, F + .4, seatZ], .03, .03, black);
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; limb([0, F + .05, seatZ], [Math.cos(a) * .3, F + .04, seatZ + Math.sin(a) * .3], .022, .018, black, 8); }
  blob(0, F + .44, seatZ, .25, .05, .24, black);
  limb([0, F + .46, seatZ + .24], [0, F + .72, seatZ + .28], .025, .025, black, 8);
  blob(0, F + .9, seatZ + .29, .21, .25, .045, black);

  /* the person, from behind: a dark jumper, dark hair, leaning in toward the screen */
  const top = [.15, .165, .21], skin = [.62, .45, .35], hair = [.05, .045, .05], legs = [.1, .11, .14];
  const hip = [0, F + .54, seatZ - .03], chest = [0, F + .98, seatZ - .15], neck = [0, F + 1.13, seatZ - .2];
  limb(hip, chest, .17, .185, top, 18);
  blob(chest[0], chest[1] - .02, chest[2], .225, .15, .135, top, 22, 14);
  limb(chest, neck, .055, .05, skin, 10);
  blob(0, F + 1.235, seatZ - .225, .1, .125, .11, skin, 20, 14);
  blob(0, F + 1.26, seatZ - .205, .104, .115, .112, hair, 20, 14);
  /* both arms to the keyboard and the mouse */
  const shL = [-.22, F + 1.01, seatZ - .15], shR = [.22, F + 1.01, seatZ - .15];
  limb(shL, [-.27, F + .8, seatZ - .42], .06, .052, top, 12);
  limb([-.27, F + .8, seatZ - .42], [-.14, TOP + .04, -1.72], .052, .036, top, 12);
  limb(shR, [.28, F + .8, seatZ - .42], .06, .052, top, 12);
  limb([.28, F + .8, seatZ - .42], [.33, TOP + .04, -1.68], .052, .036, top, 12);
  blob(-.14, TOP + .03, -1.76, .035, .018, .05, skin, 10, 6);
  blob(.33, TOP + .03, -1.72, .035, .018, .05, skin, 10, 6);
  /* the legs, under the desk */
  limb([-.1, F + .5, seatZ - .08], [-.14, F + .5, seatZ - .5], .075, .06, legs, 10);
  limb([.1, F + .5, seatZ - .08], [.14, F + .5, seatZ - .5], .075, .06, legs, 10);
  limb([-.14, F + .5, seatZ - .5], [-.15, F + .06, seatZ - .55], .055, .04, legs, 10);
  limb([.14, F + .5, seatZ - .5], [.15, F + .06, seatZ - .55], .055, .04, legs, 10);
  return new Float32Array(b.v);
}
