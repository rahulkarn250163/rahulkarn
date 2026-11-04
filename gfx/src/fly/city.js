/* Kathmandu, roughly: a few thousand low brick and plaster blocks on a loose street grid, a white stupa,
   one tall building with one lit window, and the dark room behind that window. Units are metres. */
export const HERO = {half: 8, height: 62, z: 8, winY: 46, winW: 2.7, winH: 1.9};

const srgb = h => [(h >> 16 & 255) / 255, (h >> 8 & 255) / 255, (h & 255) / 255];

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
  const CELL = 38, N = 62;
  for (let i = -N; i <= N; i++) {
    for (let j = -N; j <= N; j++) {
      const cx = i * CELL, cz = j * CELL, dist = Math.hypot(cx, cz);
      if (dist > 2350 || r() < .05 + dist / 2350 * .3) continue;
      /* clear the street the camera comes in along, and the ground round the tall building */
      if (Math.hypot(cx, cz) < 34) continue;
      const parts = 1 + Math.floor(r() * 3);
      for (let k = 0; k < parts; k++) {
        const w = 11 + r() * 14, d = 11 + r() * 14, x = cx + (r() - .5) * (CELL - w - 6), z = cz + (r() - .5) * (CELL - d - 6);
        const tall = Math.pow(r(), 3.2), h = 7 + tall * 24 + r() * 7 + (dist < 500 ? r() * 9 : 0);
        put(x, z, w, d, h, walls[Math.floor(r() * walls.length)]);
        if (r() < .55 && dist < 1400) put(x + (r() - .5) * (w - 3), z + (r() - .5) * (d - 3), 1.9, 1.9, h + 1.9, tank);
      }
    }
  }
  /* the tall building itself, in the paper and ink of the page */
  put(0, 0, HERO.half * 2, HERO.half * 2, HERO.height, srgb(0xe9e4d8));
  return {box: new Float32Array(box), inst: new Float32Array(out), count: out.length / 8};
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

/* the room: nearly dark, light from the window falling across the floor, a desk waiting at the far side */
export function roomMesh() {
  const b = builder(), {winY: Y, z: Z} = HERO, F = Y - 1.5, C = Y + 1.7, X = 4.2, back = -3.6, front = Z - .02;
  const floorNear = [.46, .34, .23], floorFar = [.05, .044, .04], wall = [.12, .105, .095], wallFar = [.042, .04, .04];
  b.quad([-X, F, front], [X, F, front], [X, F, back], [-X, F, back], floorNear, floorNear, floorFar, floorFar);
  b.quad([-X, C, back], [X, C, back], [X, C, front], [-X, C, front], wallFar, wallFar, wall, wall);
  b.quad([-X, F, back], [X, F, back], [X, C, back], [-X, C, back], wallFar);
  b.quad([-X, F, front], [-X, F, back], [-X, C, back], [-X, C, front], wall, wallFar, wallFar, wall);
  b.quad([X, F, back], [X, F, front], [X, C, front], [X, C, back], wallFar, wall, wall, wallFar);
  /* the desk, in silhouette, with the window's light along its top */
  const dark = [.02, .02, .022], lit = [.36, .29, .22], dim = [.09, .08, .07];
  b.quad([-2, F + .72, back + 2.1], [2, F + .72, back + 2.1], [2, F + .72, back + 1.05], [-2, F + .72, back + 1.05], lit, lit, dim, dim);
  b.quad([-2, F, back + 2.1], [2, F, back + 2.1], [2, F + .72, back + 2.1], [-2, F + .72, back + 2.1], dark);
  /* the window's patch of light, lying across the floor toward the desk */
  const glow = [.82, .62, .4], fade = [.34, .26, .18];
  b.quad([-.95, F + .004, Z - .6], [.95, F + .004, Z - .6], [1.5, F + .004, back + 3.4], [-1.5, F + .004, back + 3.4], glow, glow, fade, fade);
  /* with the shadow of the window's bars across it */
  const bar = [.12, .09, .07];
  b.quad([-.05, F + .006, Z - .6], [.05, F + .006, Z - .6], [.08, F + .006, back + 3.4], [-.08, F + .006, back + 3.4], bar);
  b.quad([-1.2, F + .006, Z - 4.1], [1.2, F + .006, Z - 4.1], [1.24, F + .006, Z - 4.3], [-1.24, F + .006, Z - 4.3], bar);
  /* a pale patch on the back wall, where the desk's light will fall */
  const pale = [.2, .17, .15];
  b.quad([-2.6, F + .72, back + .01], [2.6, F + .72, back + .01], [2.6, C - .35, back + .01], [-2.6, C - .35, back + .01], pale, pale, wallFar, wallFar);
  return new Float32Array(b.v);
}
