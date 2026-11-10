/* The opening shot. While the page loads, the camera runs fast through empty space: the loading is the journey.
   When the load is done Earth appears dead ahead and grows, then down into the cloud, out over the Himalaya, across
   the foothills to the valley, round the city to one lit window and through it,
   where the press run takes over: someone at a desk, and their machine built in front of them. Raw WebGL on its own thread in a Web Worker, so the main thread can
   compile the whole 3D layer without this ever dropping a frame, and the heavy part of the load falls on the
   slowest part of the shot. */
import {EARTH_FS, STAR_VS, STAR_FS, FULL_VS, SKY_FS, GROUND_FS, BLD_VS, BLD_FS, MESH_VS, MESH_FS, VEIL_FS, CLOUD_FS, SHADOW_VS, SHADOW_FS, TERRAIN_FS, SEA_FS, GLOW_VS, GLOW_FS, STREAK_VS, STREAK_FS} from './shaders.js';
import {cityData, heroMesh, stupaMesh, riverMesh, buildPatch, heightAt, PATCHES, HERO, DESK} from './city.js';

const D2R = Math.PI / 180;
const dirOf = (lat, lon) => [Math.cos(lat * D2R) * Math.sin(lon * D2R), Math.sin(lat * D2R), Math.cos(lat * D2R) * Math.cos(lon * D2R)];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = a => mul(a, 1 / (Math.hypot(a[0], a[1], a[2]) || 1));
const mix = (a, b, k) => a + (b - a) * k;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };

const KTM = dirOf(27.7172, 85.324);
const NORTH = norm(sub([0, 1, 0], mul(KTM, KTM[1])));
const EAST = norm(cross([0, 1, 0], KTM));
/* a Sun high over the Arabian Sea, so the whole of the view from orbit is in daylight */
const SUN = norm(add(add(mul(KTM, .9), mul(EAST, -.08)), mul(NORTH, .1)));

/* the beats, in seconds */
const CLOUD_IN = 3.2, CUT = 5, CLOUD_OUT = 6.6, HOLD = 11.9, WINDOW = 12.6, END = 12.94;
/* how long deep space will wait for the Earth image, in ms, once the load is done, before going without it */
const EARTH_WAIT = 5000;

/* the drone over the world: time, eye, what it looks at */
const {winY: WY, z: WZ} = HERO, {sy: SY, sz: SZ} = DESK;
const SHOT = [
  [CUT, [29000, 10400, -41000], [14000, 5600, -27000]],
  [6.2, [22000, 10000, -39500], [8000, 5400, -25500]],
  [7.5, [14000, 9300, -34500], [4500, 4300, -19000]],
  [8.6, [8200, 6800, -21500], [3400, 1900, -8000]],
  [9.5, [4700, 2600, -8600], [900, 300, -1200]],
  [10.3, [2300, 900, -1700], [0, 60, 0]],
  [11.1, [340, 280, 900], [0, 40, 0]],
  [HOLD, [-58, 70, 168], [0, WY, WZ]],
  [12.32, [-5, 50, 40], [0, WY, WZ]],
  [WINDOW, [0, WY, WZ + 1.3], [0, WY - .3, 0]],
  /* through the window and no further: the room it cuts to is the press run's, where someone sits at a desk and
     their machine is built in front of them. Nothing in here is shown standing still first. */
  [END, [.12, WY - .12, WZ - 1.9], [-.04, SY, SZ]],
];
function shotAt(t) {
  let i = 0;
  while (i < SHOT.length - 2 && t > SHOT[i + 1][0]) i++;
  const a = SHOT[Math.max(0, i - 1)], b = SHOT[i], c = SHOT[i + 1], d = SHOT[Math.min(SHOT.length - 1, i + 2)];
  const u = clamp((t - b[0]) / (c[0] - b[0])), cr = (p0, p1, p2, p3) => .5 * (2 * p1 + (p2 - p0) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (3 * p1 - p0 - 3 * p2 + p3) * u * u * u);
  const v = k => [cr(a[k][0], b[k][0], c[k][0], d[k][0]), cr(a[k][1], b[k][1], c[k][1], d[k][1]), cr(a[k][2], b[k][2], c[k][2], d[k][2])];
  const eye = v(1);
  /* never into a mountainside */
  if (t < 10) eye[1] = Math.max(eye[1], heightAt(eye[0], eye[2]) + 1100);
  return {eye, look: v(2)};
}

/* the camera in orbit, falling from far out toward the cloud deck */
function orbitAt(t) {
  /* the height, in km, at each moment: long on the planet whole, then into the weather */
  const AT = [0, 1.3, 2.4, 3.2, CUT], KM = [17200, 8200, 2700, 880, 200];
  let s = 0;
  while (s < AT.length - 2 && t > AT[s + 1]) s++;
  const alt = Math.exp(mix(Math.log(KM[s]), Math.log(KM[s + 1]), clamp((t - AT[s]) / (AT[s + 1] - AT[s])))) / 6371;
  const swing = 1 - smooth(0, 3, t), from = norm(add(mul(KTM, .62 + .38 * (1 - swing)), add(mul(EAST, -.74 * swing), mul(NORTH, -.34 * swing))));
  const eye = mul(from, 1 + alt);
  /* it looks at the planet's centre from far out, and tips up toward the Himalayan horizon as it falls */
  const tip = smooth(2.7, CUT, t), look = add(mul(KTM, mix(0, .999, smooth(.9, 3.4, t))), mul(NORTH, tip * alt * 2.1));
  return {eye, look, alt};
}

/* the way in, once the load is done: how long it takes, in seconds, how far out Earth first shows, in Earth radii,
   and where the descent takes over */
const RUN = 2.8, D_FAR = 1200, FROM = norm(orbitAt(0).eye), D_NEAR = Math.hypot(...orbitAt(0).eye);
/* the distance closes by a fraction, so Earth swells rather than arrives, and it hands on at the descent's own speed */
function approach(k) {
  const k2 = k * k, k3 = k2 * k, u = 3 * k2 - 2 * k3 + .25 * (k3 - 2 * k2 + k) + .3 * (k3 - k2);
  return Math.exp(mix(Math.log(D_FAR), Math.log(D_NEAR), u));
}

function basis(eye, look, up) {
  const f = norm(sub(look, eye)), r = norm(cross(f, up)), u = cross(r, f);
  return {f, r, u};
}
function viewProj(eye, b, fov, asp, near, far) {
  const t = 1 / Math.tan(fov / 2), {r, u, f} = b, nf = 1 / (near - far);
  const P = [t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0];
  const V = [r[0], u[0], -f[0], 0, r[1], u[1], -f[1], 0, r[2], u[2], -f[2], 0, -dot(r, eye), -dot(u, eye), dot(f, eye), 1];
  const m = new Float32Array(16);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += P[i + k * 4] * V[k + j * 4]; m[i + j * 4] = s; }
  return m;
}

let gl, W = 1, H = 1, px = 1, T = 0, ready = false, rush = false, seek = null, doneSent = false, last = 0, hudAt = 0, dayTex = null, dayOn = 0, asiaOn = 0, asiaTex = null, alive = true;
const P = {};
let par = null, started = false, worst = 0, shown = false, earthDone = false, shownAt = 0, frames = 0, spanFrom = 0;
/* 'load' while the page loads, then 'run' as Earth comes up, then 'fly', the descent on T */
let stage = 'load', S = 0, loadP = 0, targetP = 0, loadedFor = 0;
/* the shortest time deep space is held, however fast the load, in seconds */
const LOAD_MIN = 1.4;
/* the page says when the load is done, but it may be too busy to say: after this long, in ms, the flight carries on
   and the page catches up behind it, which it can, since nothing on its thread can touch this one */
const LOAD_CAP = 8000;
const DUST_NEAR = 560, DUST_FAR = 520;
let streakVao, streakT = 0, streakFar = 0;

function program(name, vs, fs) {
  const p = gl.createProgram();
  [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]].forEach(([k, src]) => {
    const s = gl.createShader(k);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    gl.attachShader(p, s);
  });
  gl.linkProgram(p);
  P[name] = {p, u: null};
}
/* true once a program has finished linking; nothing asks it anything before then, or this thread would wait */
function linked(name) {
  const e = P[name];
  if (e.u) return true;
  if (par && !gl.getProgramParameter(e.p, par.COMPLETION_STATUS_KHR)) return false;
  if (!gl.getProgramParameter(e.p, gl.LINK_STATUS)) throw new Error(name + ': ' + gl.getProgramInfoLog(e.p));
  const u = {}, n = gl.getProgramParameter(e.p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(e.p, i); u[a.name] = gl.getUniformLocation(e.p, a.name); }
  e.u = u;
  return true;
}
const SPACE = ['star', 'veil', 'streak'], ALL = [...SPACE, 'glow', 'earth', 'cloud', 'sky', 'ground', 'shadow', 'bld', 'mesh', 'terrain', 'sea'];
const allLinked = names => names.every(n => P[n] && linked(n));

function vbo(data, setup) {
  const v = gl.createVertexArray(), b = gl.createBuffer();
  gl.bindVertexArray(v);
  gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  setup();
  gl.bindVertexArray(null);
  return v;
}

/* a tiling noise tile, generated here, that every shader builds its detail from */
function noiseTex() {
  const S = 256, d = new Uint8Array(S * S);
  let seed = 1234567;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const layers = [[8, .5], [16, .27], [32, .14], [64, .09]].map(([n, amp]) => { const g = new Float32Array(n * n); for (let i = 0; i < n * n; i++) g[i] = rnd(); return {n, amp, g}; });
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      let v = 0;
      for (const {n, amp, g} of layers) {
        const fx = x / S * n, fy = y / S * n, ix = Math.floor(fx), iy = Math.floor(fy), ux = fx - ix, uy = fy - iy, sx = ux * ux * (3 - 2 * ux), sy = uy * uy * (3 - 2 * uy);
        const at = (a, b) => g[(((b + n) % n) * n + ((a + n) % n))];
        v += amp * mix(mix(at(ix, iy), at(ix + 1, iy), sx), mix(at(ix, iy + 1), at(ix + 1, iy + 1), sx), sy);
      }
      d[y * S + x] = Math.min(255, v * 255);
    }
  }
  const t = gl.createTexture();
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, S, S, 0, gl.RED, gl.UNSIGNED_BYTE, d);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.activeTexture(gl.TEXTURE0);
}

async function loadImage(file, unit, wrap) {
  const r = await fetch(new URL(file, self.location.href));
  const bmp = await createImageBitmap(await r.blob());
  const tex = gl.createTexture();
  gl.activeTexture(unit);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.SRGB8_ALPHA8, gl.RGBA, gl.UNSIGNED_BYTE, bmp);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const aniso = gl.getExtension('EXT_texture_filter_anisotropic');
  if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, 8);
  gl.activeTexture(gl.TEXTURE0);
  bmp.close();
  return tex;
}
async function loadEarth() {
  try {
    dayTex = await loadImage('earth.jpg', gl.TEXTURE0, gl.REPEAT);
    self.postMessage({t: 'earth'});
  } catch (e) { /* the planet stays a plain blue marble: the shot still flies */ }
  earthDone = true;
}
/* the sharp map of Asia comes last, once the page has what it needs, and fades in over whatever is showing */
async function loadAsia() {
  try { asiaTex = await loadImage('earth-asia.jpg', gl.TEXTURE2, gl.CLAMP_TO_EDGE); self.postMessage({t: 'asia'}); } catch (e) { /* the globe's own map carries on */ }
}

let stars, cityVao, cityCount, groundVao, heroVao, heroN, stupaVao, stupaN, riverVao, riverN, seaVao, emptyVao;
const land = [];
let landGen = null, landBuilt = false;

/* the land is built a little each frame, so the planet above it never stutters */
function buildLand(budget) {
  if (landBuilt) return;
  if (!landGen) landGen = (function* () {
    for (let i = 0; i < PATCHES.length; i++) {
      const out = {};
      yield* buildPatch(i, out);
      const vao = gl.createVertexArray(), vb = gl.createBuffer(), ib = gl.createBuffer();
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, vb);
      gl.bufferData(gl.ARRAY_BUFFER, out.verts, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, out.index, gl.STATIC_DRAW);
      gl.bindVertexArray(null);
      land.push({vao, n: out.index.length});
      yield;
    }
  })();
  const t0 = performance.now();
  while (performance.now() - t0 < budget) {
    if (landGen.next().done) { landBuilt = true; self.postMessage({t: 'land'}); return; }
  }
}

function build() {
  /* only deep space stands between the page and its first frame; the rest compile once it is up */
  program('star', STAR_VS, STAR_FS);
  program('veil', FULL_VS, VEIL_FS);
  program('streak', STREAK_VS, STREAK_FS);
  {
    /* two layers of dust, near and far, running out from the point ahead */
    const sn = DUST_NEAR + DUST_FAR, sd = new Float32Array(sn * 8);
    let sdv = 4711;
    const r = () => { sdv = (sdv * 1664525 + 1013904223) >>> 0; return sdv / 4294967296; };
    for (let i = 0; i < sn; i++) {
      const a = r() * Math.PI * 2, d = .1 + Math.pow(r(), .6) * 1.1, x = Math.cos(a) * d, y = Math.sin(a) * d, ph = r();
      sd.set([x, y, ph, 0, x, y, ph, 1], i * 8);
    }
    streakVao = vbo(sd, () => { gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 16, 0); });
  }
  noiseTex();
  emptyVao = gl.createVertexArray();

  const n = 5200, sd = new Float32Array(n * 5);
  let seed = 77;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < n; i++) {
    const z = rnd() * 2 - 1, a = rnd() * Math.PI * 2, s = Math.sqrt(1 - z * z);
    sd.set([Math.cos(a) * s, z, Math.sin(a) * s, .75 + Math.pow(rnd(), 9) * 2.1, .25 + Math.pow(rnd(), 3) * .75], i * 5);
  }
  stars = vbo(sd, () => {
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 20, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 20, 12);
  });

  const city = cityData();
  cityCount = city.count;
  {
    /* where the town and the roads are, for the ground under them */
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG8, city.mapSize, city.mapSize, 0, gl.RG, gl.UNSIGNED_BYTE, city.map);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.activeTexture(gl.TEXTURE0);
  }
  cityVao = gl.createVertexArray();
  gl.bindVertexArray(cityVao);
  const b0 = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, b0);
  gl.bufferData(gl.ARRAY_BUFFER, city.box, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
  gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
  const b1 = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, b1);
  gl.bufferData(gl.ARRAY_BUFFER, city.inst, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 32, 0); gl.vertexAttribDivisor(2, 1);
  gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 4, gl.FLOAT, false, 32, 16); gl.vertexAttribDivisor(3, 1);
  gl.bindVertexArray(null);

  const mesh = data => vbo(data, () => {
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
  });
  const quad = (G, y, z0, z1) => mesh(new Float32Array([-G, y, z0, 0, 0, 0, -G, y, z1, 0, 0, 0, G, y, z1, 0, 0, 0, -G, y, z0, 0, 0, 0, G, y, z1, 0, 0, 0, G, y, z0, 0, 0, 0]));
  groundVao = quad(9000, 0, -9000, 9000);
  seaVao = quad(70000, 4700, -70000, -9000);
  const hero = heroMesh(), stupa = stupaMesh(), river = riverMesh();
  heroVao = mesh(hero); heroN = hero.length / 6;
  stupaVao = mesh(stupa); stupaN = stupa.length / 6;
  riverVao = mesh(river); riverN = river.length / 6;
}

function drawSpace(t) {
  const {eye, look, alt} = orbitAt(t), asp = W / H, fov = mix(34, 62, smooth(2.4, CUT, t)) * D2R;
  const b = basis(eye, look, NORTH);
  gl.disable(gl.DEPTH_TEST);
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  /* the stars sit on a sphere round the camera */
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE);
  gl.useProgram(P.star.p);
  gl.uniformMatrix4fv(P.star.u.uVP, false, viewProj([0, 0, 0], b, fov, asp, .1, 10));
  gl.uniform1f(P.star.u.uPx, px * Math.max(1, H / 900));
  gl.uniform1f(P.star.u.uFade, 1 - smooth(1.8, 3.3, t));
  gl.bindVertexArray(stars);
  gl.drawArrays(gl.POINTS, 0, 5200);

  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  earthPass(eye, b, fov, t, alt);
  return alt;
}

function earthPass(eye, b, fov, t, alt) {
  if (!P.earth || !linked('earth')) return;
  gl.useProgram(P.earth.p);
  const u = P.earth.u, tn = Math.tan(fov / 2);
  gl.uniform3fv(u.uEye, eye); gl.uniform3fv(u.uR, b.r); gl.uniform3fv(u.uU, b.u); gl.uniform3fv(u.uF, b.f); gl.uniform3fv(u.uSun, SUN);
  gl.uniform1f(u.uTan, tn); gl.uniform1f(u.uAsp, W / H); gl.uniform1f(u.uT, t); gl.uniform1f(u.uAlt, alt); gl.uniform1f(u.uH, H * px); gl.uniform1f(u.uDay, dayOn); gl.uniform1f(u.uAsia, asiaOn);
  gl.uniform1i(u.uTex, 0); gl.uniform1i(u.uN, 1); gl.uniform1i(u.uHi, 2);
  gl.bindVertexArray(emptyVao);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.bindVertexArray(null);
}

/* deep space: while the page loads, only the stars and the dust going past (p is how far the load has got);
   then Earth, dead ahead, from a point of light to the planet the descent starts from (k runs 0 to 1) */
function drawDeep(p, k) {
  const d = k > 0 ? approach(k) : D_FAR, eye = mul(FROM, d), asp = W / H, fov = mix(48, 34, smooth(.35, 1, k)) * D2R, tn = Math.tan(fov / 2);
  const b = basis(eye, [0, 0, 0], NORTH);
  gl.disable(gl.DEPTH_TEST);
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE);
  gl.useProgram(P.star.p);
  gl.uniformMatrix4fv(P.star.u.uVP, false, viewProj([0, 0, 0], b, fov, asp, .1, 10));
  gl.uniform1f(P.star.u.uPx, px * Math.max(1, H / 900));
  gl.uniform1f(P.star.u.uFade, 1);
  gl.bindVertexArray(stars);
  gl.drawArrays(gl.POINTS, 0, 5200);

  /* the dust, thinning out as Earth comes up */
  const dust = 1 - smooth(.5, .92, k);
  if (dust > 0) {
    const u = P.streak.u;
    gl.useProgram(P.streak.p);
    gl.uniform1f(u.uAsp, asp);
    gl.bindVertexArray(streakVao);
    gl.uniform1f(u.uT, streakT); gl.uniform1f(u.uLen, .09); gl.uniform1f(u.uA, dust * .95);
    gl.drawArrays(gl.LINES, 0, DUST_NEAR * 2);
    gl.uniform1f(u.uT, streakFar); gl.uniform1f(u.uLen, .04); gl.uniform1f(u.uA, dust * .4);
    gl.drawArrays(gl.LINES, DUST_NEAR * 2, DUST_FAR * 2);
  }

  if (k > 0) {
    /* far off, Earth is a point of light before it is a planet */
    const halo = smooth(0, .22, k) * (1 - smooth(.45, .8, k));
    if (halo > 0 && P.glow && linked('glow')) {
      const t0 = 1 / tn, n = .5, f = d * 3, nf = 1 / (n - f), u = P.glow.u;
      gl.useProgram(P.glow.p);
      gl.uniformMatrix4fv(u.uP, false, new Float32Array([t0 / asp, 0, 0, 0, 0, t0, 0, 0, 0, 0, (f + n) * nf, -1, 0, 0, 2 * f * n * nf, 0]));
      gl.uniform3f(u.uC, 0, 0, -d); gl.uniform1f(u.uS, d * tn * .075); gl.uniform3f(u.uCol, .5, .72, 1); gl.uniform1f(u.uA, halo * .9);
      gl.bindVertexArray(emptyVao);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    earthPass(eye, b, fov, 0, Math.max(d - 1, 2.7));
  }
  gl.bindVertexArray(null);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  return k > 0 ? (d - 1) * 6371 : Math.exp(mix(Math.log(5e9), Math.log((D_FAR - 1) * 6371), p));
}

const HAZE = [.76, .78, .82];
function drawWorld(t) {
  const {eye, look} = shotAt(t), asp = W / H, indoors = t > WINDOW + .02;
  const fov = (t < 10.6 ? 56 : mix(56, 50, smooth(10.6, 11.4, t))) * D2R;
  const b = basis(eye, look, [0, 1, 0]), near = indoors ? .05 : t < 10.8 ? 8 : .4, far = indoors ? 40 : 170000;
  const vp = viewProj(eye, b, fov, asp, near, far), sun = norm([.72, .36, .42]);
  /* the air thickens as the camera comes down to the city */
  const fog = mix(.000045, .00017, smooth(9.6, 10.9, t)), hillFog = mix(.000045, .00011, smooth(9.6, 10.9, t));
  gl.clearColor(HAZE[0], HAZE[1], HAZE[2], 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.disable(gl.BLEND);
  gl.disable(gl.DEPTH_TEST);
  let u;
  if (!indoors) {
    gl.useProgram(P.sky.p);
    u = P.sky.u;
    gl.uniform3fv(u.uR, b.r); gl.uniform3fv(u.uU, b.u); gl.uniform3fv(u.uF, b.f); gl.uniform3fv(u.uSun, sun); gl.uniform3fv(u.uHaze, HAZE);
    gl.uniform1f(u.uTan, Math.tan(fov / 2)); gl.uniform1f(u.uAsp, asp);
    gl.bindVertexArray(emptyVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.enable(gl.DEPTH_TEST);

    /* the ground of the valley, under the mountains */
    gl.useProgram(P.ground.p);
    u = P.ground.u;
    gl.uniformMatrix4fv(u.uVP, false, vp); gl.uniform3fv(u.uEye, eye); gl.uniform3fv(u.uHaze, HAZE); gl.uniform1i(u.uN, 1); gl.uniform1i(u.uTown, 3); gl.uniform1f(u.uT, t); gl.uniform1f(u.uFog, fog);
    gl.bindVertexArray(groundVao);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.useProgram(P.terrain.p);
    u = P.terrain.u;
    gl.uniformMatrix4fv(u.uVP, false, vp); gl.uniform3fv(u.uEye, eye); gl.uniform3fv(u.uHaze, HAZE); gl.uniform3fv(u.uSun, norm([.56, .62, -.2])); gl.uniform1i(u.uN, 1); gl.uniform1f(u.uT, t); gl.uniform1f(u.uFog, hillFog);
    land.forEach(l => { gl.bindVertexArray(l.vao); gl.drawElements(gl.TRIANGLES, l.n, gl.UNSIGNED_INT, 0); });

    if (t > 9.3) {
      /* the shadows go down first, darkening the ground once however many fall on it. Every block's
         shadow is a long quad: from high up they cannot be seen and they are most of the frame's cost */
      if (eye[1] < 420) {
        gl.useProgram(P.shadow.p);
        u = P.shadow.u;
        gl.uniformMatrix4fv(u.uVP, false, vp); gl.uniform3fv(u.uEye, eye); gl.uniform3fv(u.uHaze, HAZE); gl.uniform3fv(u.uSun, sun); gl.uniform1f(u.uFog, fog);
        gl.enable(gl.BLEND);
        gl.blendEquation(gl.MIN);
        gl.depthMask(false);
        gl.bindVertexArray(cityVao);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 36, cityCount);
        gl.depthMask(true);
        gl.blendEquation(gl.FUNC_ADD);
        gl.disable(gl.BLEND);
      }

      gl.enable(gl.CULL_FACE);
      gl.useProgram(P.bld.p);
      u = P.bld.u;
      gl.uniformMatrix4fv(u.uVP, false, vp); gl.uniform3fv(u.uEye, eye); gl.uniform3fv(u.uHaze, HAZE); gl.uniform3fv(u.uSun, sun); gl.uniform1i(u.uN, 1); gl.uniform1f(u.uT, t); gl.uniform1f(u.uFog, fog);
      gl.bindVertexArray(cityVao);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 36, cityCount);
      gl.disable(gl.CULL_FACE);
    }

    /* the sea of cloud round the peaks, thinning out to the south */
    if (t < 9.6) {
      gl.useProgram(P.sea.p);
      u = P.sea.u;
      gl.uniformMatrix4fv(u.uVP, false, vp); gl.uniform3fv(u.uEye, eye); gl.uniform3fv(u.uHaze, HAZE); gl.uniform3fv(u.uSun, sun); gl.uniform1i(u.uN, 1); gl.uniform1f(u.uT, t); gl.uniform1f(u.uOn, 1 - smooth(8.4, 9.5, t));
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
      gl.bindVertexArray(seaVao);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
    }
  } else {
    gl.enable(gl.DEPTH_TEST);
  }

  gl.useProgram(P.mesh.p);
  u = P.mesh.u;
  gl.uniformMatrix4fv(u.uVP, false, vp); gl.uniform3fv(u.uEye, eye); gl.uniform3fv(u.uHaze, HAZE);
  if (!indoors) {
    /* the river, held just proud of the ground however far off it is */
    gl.uniform1f(u.uFog, hillFog);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(-4, -4);
    gl.bindVertexArray(riverVao);
    gl.drawArrays(gl.TRIANGLES, 0, riverN);
    gl.disable(gl.POLYGON_OFFSET_FILL);
  }
  if (!indoors && t > 9.3) {
    gl.uniform1f(u.uFog, fog);
    gl.bindVertexArray(stupaVao);
    gl.drawArrays(gl.TRIANGLES, 0, stupaN);
    gl.bindVertexArray(heroVao);
    gl.drawArrays(gl.TRIANGLES, 0, heroN);
  }
  gl.disable(gl.DEPTH_TEST);
  gl.bindVertexArray(null);
  return eye[1];
}

function buildRest() {
  program('glow', GLOW_VS, GLOW_FS);
  program('earth', FULL_VS, EARTH_FS);
  program('cloud', FULL_VS, CLOUD_FS);
  program('sky', FULL_VS, SKY_FS);
  program('ground', MESH_VS, GROUND_FS);
  program('bld', BLD_VS, BLD_FS);
  program('mesh', MESH_VS, MESH_FS);
  program('shadow', SHADOW_VS, SHADOW_FS);
  program('terrain', MESH_VS, TERRAIN_FS);
  program('sea', MESH_VS, SEA_FS);
}

function veil(v, r, g, b) {
  if (v <= 0) return;
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.useProgram(P.veil.p);
  gl.uniform1f(P.veil.u.uV, v); gl.uniform3f(P.veil.u.uC, r, g, b);
  gl.bindVertexArray(emptyVao);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.bindVertexArray(null);
}

function draw(t) {
  gl.viewport(0, 0, Math.round(W * px), Math.round(H * px));
  gl.activeTexture(gl.TEXTURE0);
  if (dayTex) gl.bindTexture(gl.TEXTURE_2D, dayTex);
  const world = t >= CUT && allLinked(ALL) && landBuilt;
  const hud = !world ? {alt: orbitAt(t).alt * 6371, unit: 'km'} : null;
  let y = 0;
  if (!world) drawSpace(Math.min(t, CUT)); else y = drawWorld(t);
  /* the cloud deck: this is the cut from the planet to the world below it */
  const inCloud = smooth(CLOUD_IN, CLOUD_IN + .75, t) * (1 - smooth(CLOUD_OUT - .95, CLOUD_OUT, t));
  if (inCloud > 0 && P.cloud && linked('cloud')) {
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(P.cloud.p);
    const u = P.cloud.u;
    gl.uniform1f(u.uV, inCloud); gl.uniform1f(u.uT, t); gl.uniform1f(u.uAsp, W / H); gl.uniform1i(u.uN, 1);
    gl.bindVertexArray(emptyVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  }
  /* Past the pane there is only its light: it fills the frame, then dims to the near black the press run's lights
     come up from. No room is drawn here, so nobody is seen sitting still before the one who is built for. */
  veil(smooth(WINDOW - .09, WINDOW + .01, t), 1, .93, .74);
  veil(smooth(WINDOW + .03, END - .04, t), .0235, .0235, .0235);
  return hud || {alt: y, unit: 'm'};
}

function frame(now) {
  if (!alive) return;
  schedule();
  const dt = Math.min(.05, (now - last) / 1000 || .016);
  last = now;
  if (started) buildLand(stage === 'load' ? 9 : 5);
  if (dayTex) dayOn = Math.min(1, dayOn + dt * 2.4);
  if (asiaTex) asiaOn = Math.min(1, asiaOn + dt * 1.6);
  worst = Math.max(worst, now - (self.__prev || now));
  self.__prev = now;
  /* nothing to show until deep space's programs are done; the screen is plain black until then */
  if (!started) {
    if (!allLinked(SPACE)) { gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT); return; }
    started = true;
    buildRest();
    self.postMessage({t: 'first'});
    last = now;
  }
  gl.viewport(0, 0, Math.round(W * px), Math.round(H * px));
  gl.activeTexture(gl.TEXTURE0);
  if (dayTex) gl.bindTexture(gl.TEXTURE_2D, dayTex);
  /* the dust: fast all through the load, then easing off as Earth comes up */
  const pace = stage === 'load' ? mix(.85, 1.25, loadP) : mix(1.4, .25, smooth(.2, .95, S / RUN));
  streakT = (streakT + dt * pace) % 1;
  streakFar = (streakFar + dt * pace * .5) % 1;
  let h;
  if (seek !== null) {
    /* for checking: below -RUN is the load (down to -RUN-3), -RUN to 0 Earth coming up, 0 and up the descent */
    if (seek < -RUN) h = {alt: drawDeep(clamp((seek + RUN + 3) / 3), 0), unit: 'km'};
    else if (seek < 0) h = {alt: drawDeep(1, (RUN + seek) / RUN), unit: 'km'};
    else { T = seek; h = draw(T); }
  } else if (stage === 'load') {
    if (shown) {
      loadedFor += dt;
      /* the bar sets the pace: smoothly, whatever the bar is doing */
      loadP += (targetP - loadP) * (1 - Math.exp(-dt / .35));
      /* a slow connection may still have the Earth image on the way: it may take the time, up to a limit */
      if ((ready || now - shownAt > LOAD_CAP) && loadedFor >= LOAD_MIN && allLinked(ALL) && landBuilt && (earthDone || now - shownAt > EARTH_WAIT)) {
        stage = 'run';
        S = 0;
        if (!ready) { ready = true; loadAsia(); }
      }
    }
    h = {alt: drawDeep(loadP, 0), unit: 'km'};
    veil((1 - smooth(0, .7, loadedFor)) * .6, 0, 0, 0);
  } else if (stage === 'run') {
    S += dt * (rush ? 2.4 : 1);
    if (S >= RUN) { stage = 'fly'; T = 0; }
    h = {alt: drawDeep(1, Math.min(S, RUN) / RUN), unit: 'km'};
  } else {
    T += dt * (rush ? 2.4 : mix(1.5, 1, smooth(CLOUD_OUT - .6, CLOUD_OUT + .2, T)));
    if (T > CUT - .1 && !(allLinked(ALL) && landBuilt)) T = CUT - .1;
    h = draw(T);
  }
  frames++;
  if (now - hudAt > 120) {
    hudAt = now;
    self.postMessage({t: 'hud', alt: h.alt, unit: h.unit, at: stage === 'fly' ? T : stage === 'run' ? S - RUN : -RUN - 1 + loadP, worst: Math.round(worst), frames, span: now - spanFrom});
    worst = 0;
    frames = 0;
    spanFrom = now;
  }
  if (stage === 'fly' && T >= END && !doneSent && seek === null) {
    doneSent = true;
    self.postMessage({t: 'done'});
  }
}
const schedule = () => { if (self.requestAnimationFrame) self.requestAnimationFrame(frame); else setTimeout(() => frame(performance.now()), 16); };

self.onmessage = e => {
  const m = e.data;
  if (m.canvas) {
    try {
      W = m.w; H = m.h; px = m.px;
      m.canvas.width = Math.round(W * px);
      m.canvas.height = Math.round(H * px);
      gl = m.canvas.getContext('webgl2', {alpha: false, antialias: true, depth: true, stencil: false, powerPreference: 'high-performance', desynchronized: false});
      if (!gl) throw new Error('no webgl2');
      self.canvas = m.canvas;
      par = gl.getExtension('KHR_parallel_shader_compile');
      build();
      last = performance.now();
      schedule();
    } catch (err) {
      self.postMessage({t: 'fail', why: String(err && err.message || err)});
    }
  }
  if (m.size) {
    W = m.size[0]; H = m.size[1];
    self.canvas.width = Math.round(W * px);
    self.canvas.height = Math.round(H * px);
  }
  if (m.ready && !ready) { ready = true; loadAsia(); }
  if (m.p !== undefined) targetP = Math.max(targetP, m.p);
  if (m.rush) rush = true;
  /* deep space needs no map, so the page gets the connection to itself until it has painted */
  if (m.shown && !shown) { shown = true; shownAt = performance.now(); loadEarth(); }
  if (m.seek !== undefined) seek = m.seek;
  if (m.stop) alive = false;
};
