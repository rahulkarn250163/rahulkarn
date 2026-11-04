/* The opening shot, flown while the rest of the page loads: Earth from orbit, down through the cloud
   over Kathmandu, across the city with the Himalaya behind it, and in through one lit window to a dark
   room, where the press run takes over. Raw WebGL on its own thread in a Web Worker, so the main thread
   can compile the whole 3D layer without this ever dropping a frame. It holds outside the window until
   the page says it is ready. */
import {EARTH_FS, STAR_VS, STAR_FS, FULL_VS, SKY_FS, GROUND_FS, BLD_VS, BLD_FS, MESH_VS, MESH_FS, VEIL_FS, SHADOW_VS, SHADOW_FS} from './shaders.js';
import {cityData, heroMesh, stupaMesh, roomMesh, HERO} from './city.js';

const D2R = Math.PI / 180;
const dirOf = (lat, lon) => [Math.cos(lat * D2R) * Math.sin(lon * D2R), Math.sin(lat * D2R), Math.cos(lat * D2R) * Math.cos(lon * D2R)];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = a => mul(a, 1 / (Math.hypot(a[0], a[1], a[2]) || 1));
const mix = (a, b, k) => a + (b - a) * k;
const mixv = (a, b, k) => [mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)];
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };

const KTM = dirOf(27.7172, 85.324);
const NORTH = norm(sub([0, 1, 0], mul(KTM, KTM[1])));
const EAST = norm(cross([0, 1, 0], KTM));
/* a low morning Sun over Kathmandu, so half the planet is still dark as we arrive */
const SUN = norm(add(add(mul(KTM, .86), mul(EAST, .46)), mul(NORTH, .2)));

/* the beats, in seconds */
const CUT = 4.22, HOLD = 5.85, WINDOW = 6.62, END = 7.7;

/* the camera over the city: time, eye, what it looks at */
const SHOT = [
  [CUT, [-780, 600, 1200], [0, 20, 0]],
  [5.0, [-340, 262, 640], [0, 40, 0]],
  [HOLD, [-58, 70, 168], [0, HERO.winY, HERO.z]],
  [6.32, [-5, 50, 40], [0, HERO.winY, HERO.z]],
  [WINDOW, [0, HERO.winY, HERO.z + 1.3], [0, HERO.winY - .3, 0]],
  [7.18, [0, HERO.winY - .12, 4.6], [0, HERO.winY - .85, -3]],
  [END, [0, HERO.winY - .3, 1.5], [0, HERO.winY - 1.05, -3]],
];
function shotAt(t) {
  let i = 0;
  while (i < SHOT.length - 2 && t > SHOT[i + 1][0]) i++;
  const a = SHOT[Math.max(0, i - 1)], b = SHOT[i], c = SHOT[i + 1], d = SHOT[Math.min(SHOT.length - 1, i + 2)];
  const u = clamp((t - b[0]) / (c[0] - b[0])), cr = (p0, p1, p2, p3) => .5 * (2 * p1 + (p2 - p0) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (3 * p1 - p0 - 3 * p2 + p3) * u * u * u);
  const v = k => [cr(a[k][0], b[k][0], c[k][0], d[k][0]), cr(a[k][1], b[k][1], c[k][1], d[k][1]), cr(a[k][2], b[k][2], c[k][2], d[k][2])];
  return {eye: v(1), look: v(2)};
}

/* the camera in orbit, falling from far out to just above the cloud deck */
function orbitAt(t) {
  /* the height, in km, at each moment: long on the planet whole, quick through the last of the air */
  const AT = [0, 1.2, 2.2, 3.0, 3.6, CUT], KM = [17200, 8200, 2400, 650, 180, 44];
  let s = 0;
  while (s < AT.length - 2 && t > AT[s + 1]) s++;
  const alt = Math.exp(mix(Math.log(KM[s]), Math.log(KM[s + 1]), clamp((t - AT[s]) / (AT[s + 1] - AT[s])))) / 6371;
  const swing = 1 - smooth(0, 3, t), from = norm(add(mul(KTM, .62 + .38 * (1 - swing)), add(mul(EAST, -.74 * swing), mul(NORTH, -.34 * swing))));
  const eye = mul(from, 1 + alt);
  /* it looks at the planet's centre from far out, and tips up toward the Himalayan horizon as it falls */
  const tip = smooth(2.5, CUT, t), look = add(mul(KTM, mix(0, .999, smooth(.9, 3.4, t))), mul(NORTH, tip * alt * 2.1));
  return {eye, look, alt};
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

let gl, W = 1, H = 1, px = 1, T = 0, ready = false, rush = false, seek = null, doneSent = false, last = 0, hudAt = 0, dayTex = null, dayOn = 0, alive = true;
const P = {};
let par = null, started = false, worst = 0, shown = false;

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
const SPACE = ['earth', 'star', 'veil'], ALL = [...SPACE, 'sky', 'ground', 'shadow', 'bld', 'mesh'];
const allLinked = names => names.every(linked);

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

async function loadEarth() {
  try {
    const r = await fetch(new URL('earth.jpg', self.location.href));
    const bmp = await createImageBitmap(await r.blob());
    dayTex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, dayTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.SRGB8_ALPHA8, gl.RGBA, gl.UNSIGNED_BYTE, bmp);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    const aniso = gl.getExtension('EXT_texture_filter_anisotropic');
    if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, 8);
    bmp.close();
  } catch (e) { /* the planet stays a plain blue marble: the shot still flies */ }
}

let stars, cityVao, cityCount, groundVao, heroVao, heroN, stupaVao, stupaN, roomVao, roomN, emptyVao;

function build() {
  program('earth', FULL_VS, EARTH_FS);
  program('star', STAR_VS, STAR_FS);
  program('sky', FULL_VS, SKY_FS);
  program('veil', FULL_VS, VEIL_FS);
  program('ground', MESH_VS, GROUND_FS);
  program('bld', BLD_VS, BLD_FS);
  program('mesh', MESH_VS, MESH_FS);
  program('shadow', SHADOW_VS, SHADOW_FS);
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
  const box = city.box;
  cityVao = gl.createVertexArray();
  gl.bindVertexArray(cityVao);
  const b0 = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, b0);
  gl.bufferData(gl.ARRAY_BUFFER, box, gl.STATIC_DRAW);
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
  const G = 9000;
  groundVao = mesh(new Float32Array([-G, 0, -G, 0, 0, 0, -G, 0, G, 0, 0, 0, G, 0, G, 0, 0, 0, -G, 0, -G, 0, 0, 0, G, 0, G, 0, 0, 0, G, 0, -G, 0, 0, 0]));
  const hero = heroMesh(), stupa = stupaMesh(), room = roomMesh();
  heroVao = mesh(hero); heroN = hero.length / 6;
  stupaVao = mesh(stupa); stupaN = stupa.length / 6;
  roomVao = mesh(room); roomN = room.length / 6;
}

function drawSpace(t, fade) {
  const {eye, look, alt} = orbitAt(t), asp = W / H, fov = mix(34, 62, smooth(2.2, CUT, t)) * D2R;
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
  gl.useProgram(P.earth.p);
  const u = P.earth.u, tn = Math.tan(fov / 2);
  gl.uniform3fv(u.uEye, eye); gl.uniform3fv(u.uR, b.r); gl.uniform3fv(u.uU, b.u); gl.uniform3fv(u.uF, b.f); gl.uniform3fv(u.uSun, SUN);
  gl.uniform1f(u.uTan, tn); gl.uniform1f(u.uAsp, asp); gl.uniform1f(u.uT, t); gl.uniform1f(u.uAlt, alt); gl.uniform1f(u.uH, H * px); gl.uniform1f(u.uDay, dayOn);
  gl.uniform1i(u.uTex, 0); gl.uniform1i(u.uN, 1);
  gl.bindVertexArray(emptyVao);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.bindVertexArray(null);
  void fade;
  return alt;
}

const HAZE = [.82, .74, .66];
function drawCity(t) {
  const {eye, look} = shotAt(t), asp = W / H, fov = mix(50, 58, smooth(5.4, 6.6, t)) * D2R;
  const b = basis(eye, look, [0, 1, 0]), vp = viewProj(eye, b, fov, asp, .4, 16000), sun = norm([.72, .36, .42]);
  gl.clearColor(HAZE[0], HAZE[1], HAZE[2], 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.disable(gl.BLEND);
  gl.disable(gl.DEPTH_TEST);
  gl.useProgram(P.sky.p);
  let u = P.sky.u;
  gl.uniform3fv(u.uR, b.r); gl.uniform3fv(u.uU, b.u); gl.uniform3fv(u.uF, b.f); gl.uniform3fv(u.uSun, sun); gl.uniform3fv(u.uHaze, HAZE);
  gl.uniform1f(u.uTan, Math.tan(fov / 2)); gl.uniform1f(u.uAsp, asp); gl.uniform1i(u.uN, 1); gl.uniform1f(u.uT, t);
  gl.bindVertexArray(emptyVao);
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  gl.enable(gl.DEPTH_TEST);
  gl.useProgram(P.ground.p);
  u = P.ground.u;
  gl.uniformMatrix4fv(u.uVP, false, vp); gl.uniform3fv(u.uEye, eye); gl.uniform3fv(u.uHaze, HAZE); gl.uniform1i(u.uN, 1); gl.uniform1f(u.uT, t);
  gl.bindVertexArray(groundVao);
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  /* the shadows go down first, darkening the ground once however many fall on it */
  gl.useProgram(P.shadow.p);
  u = P.shadow.u;
  gl.uniformMatrix4fv(u.uVP, false, vp); gl.uniform3fv(u.uEye, eye); gl.uniform3fv(u.uHaze, HAZE); gl.uniform3fv(u.uSun, sun);
  gl.enable(gl.BLEND);
  gl.blendEquation(gl.MIN);
  gl.depthMask(false);
  gl.bindVertexArray(cityVao);
  gl.drawArraysInstanced(gl.TRIANGLES, 0, 36, cityCount);
  gl.depthMask(true);
  gl.blendEquation(gl.FUNC_ADD);
  gl.disable(gl.BLEND);

  gl.enable(gl.CULL_FACE);
  gl.useProgram(P.bld.p);
  u = P.bld.u;
  gl.uniformMatrix4fv(u.uVP, false, vp); gl.uniform3fv(u.uEye, eye); gl.uniform3fv(u.uHaze, HAZE); gl.uniform3fv(u.uSun, sun); gl.uniform1i(u.uN, 1); gl.uniform1f(u.uT, t);
  gl.bindVertexArray(cityVao);
  gl.drawArraysInstanced(gl.TRIANGLES, 0, 36, cityCount);

  gl.useProgram(P.mesh.p);
  u = P.mesh.u;
  gl.uniformMatrix4fv(u.uVP, false, vp); gl.uniform3fv(u.uEye, eye); gl.uniform3fv(u.uHaze, HAZE);
  gl.uniform1f(u.uFog, 1);
  gl.bindVertexArray(stupaVao);
  gl.drawArrays(gl.TRIANGLES, 0, stupaN);
  gl.bindVertexArray(heroVao);
  gl.drawArrays(gl.TRIANGLES, 0, heroN);
  if (t > 6.05) {
    gl.uniform1f(u.uFog, 0);
    gl.bindVertexArray(roomVao);
    gl.drawArrays(gl.TRIANGLES, 0, roomN);
  }
  gl.disable(gl.CULL_FACE);
  gl.disable(gl.DEPTH_TEST);
  gl.bindVertexArray(null);
  return eye[1];
}

function veil(v, r, g, b, t, streak) {
  if (v <= 0) return;
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.useProgram(P.veil.p);
  const u = P.veil.u;
  gl.uniform1f(u.uV, v); gl.uniform3f(u.uC, r, g, b); gl.uniform1f(u.uT, t); gl.uniform1f(u.uS, streak); gl.uniform1i(u.uN, 1); gl.uniform1f(u.uAsp, W / H);
  gl.bindVertexArray(emptyVao);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.bindVertexArray(null);
}

function draw(t) {
  gl.viewport(0, 0, Math.round(W * px), Math.round(H * px));
  gl.activeTexture(gl.TEXTURE0);
  if (dayTex) gl.bindTexture(gl.TEXTURE_2D, dayTex);
  const hud = t < CUT ? {alt: orbitAt(t).alt * 6371, unit: 'km'} : null;
  let y = 0;
  if (t < CUT || !allLinked(ALL)) drawSpace(Math.min(t, CUT - .01)); else y = drawCity(t);
  /* through the cloud deck: this is the cut from the planet to the city */
  const white = smooth(3.42, CUT - .1, t) * (1 - smooth(CUT + .03, CUT + .62, t));
  veil(white, .9, .92, .95, t, 1);
  veil((1 - smooth(0, .5, t)) * .6, 0, 0, 0, t, 0);
  /* into the dark room: the same near black the press run's lights come up from */
  veil(smooth(7.28, END - .04, t), .0235, .0235, .0235, t, 0);
  return hud || {alt: y, unit: 'm'};
}

function frame(now) {
  if (!alive) return;
  schedule();
  const dt = Math.min(.05, (now - last) / 1000 || .016);
  last = now;
  if (dayTex) dayOn = Math.min(1, dayOn + dt * 2.4);
  worst = Math.max(worst, now - (self.__prev || now));
  self.__prev = now;
  /* nothing to show until the planet's programs are done; the screen is black space until then */
  if (!started) {
    if (!allLinked(SPACE)) { gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT); return; }
    started = true;
    self.postMessage({t: 'first'});
    last = now;
  }
  /* the planet waits on the first frame until the page has actually painted it */
  if (!shown && seek === null) { draw(0); last = now; return; }
  if (seek !== null) {
    T = seek;
  } else {
    /* it eases to a slow drift just outside the window until the page is ready for the room */
    const over = T - (HOLD - .5);
    const brake = !ready && over > 0 ? Math.max(.012, 1 - smooth(0, .5, over)) : 1;
    T = !ready && T >= HOLD ? T : T + dt * brake * (rush && T < HOLD ? 3 : 1);
    /* the cloud deck waits for the city, should its programs still be compiling on a slow machine */
    if (T > CUT - .1 && !allLinked(ALL)) T = CUT - .1;
  }
  const h = draw(T);
  if (now - hudAt > 120) {
    hudAt = now;
    self.postMessage({t: 'hud', alt: h.alt, unit: h.unit, at: T, worst: Math.round(worst)});
    worst = 0;
  }
  if (T >= END && !doneSent && seek === null) {
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
      loadEarth();
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
  if (m.ready) ready = true;
  if (m.shown) shown = true;
  if (m.rush) rush = true;
  if (m.seek !== undefined) seek = m.seek;
  if (m.stop) alive = false;
};
