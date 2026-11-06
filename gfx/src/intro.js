/* The director. After the loader lifts, the studio lights come up and the parts of the
   computer fly in on their own clocks while the camera drifts round the desk. When the
   last part is down the machine powers on, the camera turns to face the screen, the
   name is stamped on it (DOM, in the press run's CSS) and the camera pushes through the
   glass until the lit screen fills the frame, and only then does the page fade up.
   The lit screen itself is a DOM sheet in the page's own paper colour, so it matches
   the page exactly whatever the tone mapping does. Times are seconds after the lift
   and must stay in step with the press run's CSS beats. On the page the run is a job on the page's motor
   (window.__motor), one frame with everything else that moves; the lab, which has no motor, gets a loop. */
import {THREE, createStage, studioEnv, breathe, canvasTex} from './core.js';
import {buildRig, SCREEN} from './rig/index.js';
import {addLights} from './rig/bits/lights.js';
import {makeMirror} from './rig/mirror.js';

const LIGHTS_UP = [0, .7], DRIFT = [-.1, 2.4], TURN = [2.35, 3.05], POWER = 2.48, PUSH = [3.4, 4.25], WIRES = [1.8, 2.4];
const REFLECTED = ['chassis', 'front', 'roof', 'shell', 'panel', 'foot', 'neck', 'deck', 'mouse'];
const NO_SHADOW = /^(key-|board|boardparts|cpu|ram|drive|psu)/;
const SW = SCREEN.x1 - SCREEN.x0, SH = SCREEN.y1 - SCREEN.y0, SCX = (SCREEN.x0 + SCREEN.x1) / 2, SCY = (SCREEN.y0 + SCREEN.y1) / 2;
const clamp01 = k => (k < 0 ? 0 : k > 1 ? 1 : k);
const glide = k => { k = clamp01(k); return k * k * (3 - 2 * k); };
const snap = k => { k = clamp01(k); return k < .5 ? 16 * k * k * k * k * k : 1 - Math.pow(2 - 2 * k, 5) / 2; };
const paperColour = () => getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();

export async function create({canvas, tier, press, word, preserve = false}) {
  const stage = createStage(canvas, {
    shadows: true, exposure: tier === 'high' ? 1.05 : 1.12, fov: 18, near: 3, far: 5000, preserve,
    post: tier === 'high' ? {ao: true, aoRadius: 3, trail: true, bloom: {strength: .16, radius: .5, threshold: 1.05}} : null,
  });
  const {scene, camera, renderer} = stage;
  const BACK = new THREE.Color(0x060606);
  scene.background = BACK;
  scene.fog = new THREE.Fog(BACK, 520, 1000);

  const pivots = [];
  /* the glow round the lit screen, without a bloom pass */
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(SW * 1.5, SH * 1.8), new THREE.MeshBasicMaterial({
    map: canvasTex(256, 256, (c, w, h) => {
      c.clearRect(0, 0, w, h);
      c.filter = 'blur(26px)'; c.fillStyle = '#fff';
      c.fillRect(w * .17, h * .22, w * .66, h * .56);
    }, {mips: false}),
    transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xfff4e6,
  }));
  halo.position.set(SCX, SCY, SCREEN.z + .06);
  halo.visible = false;
  scene.add(halo);

  let ticks = 0, mirror = null, parts = [], lights = null, panelPart = null, cablesPart = null, ticking = false, done = false;
  /* the clock: seconds since play(), capped at the end of the push, or a frame held by seek() */
  let t0 = 0, held = -1, job = null, raf = 0;
  const time = () => (held >= 0 ? held : t0 ? Math.min((performance.now() - t0) / 1000, PUSH[1] + .4) : 0);
  let vw = 1, vh = 1, fpx = 1, D0 = 430, Dface = 120, Dfill = 90, reach = 100, fitted = false, lastNow = 0, base = {};
  const lit = press ? press.querySelector('.press-lit') : null;
  const v = new THREE.Vector3(), T = new THREE.Vector3();

  function size() {
    vw = innerWidth || 1280; vh = innerHeight || 800;
    stage.size(vw, vh);
    fpx = vh / (2 * Math.tan(camera.fov * Math.PI / 360));
    const s0 = Math.min(vw * .88 / 108, vh * .72 / 66);
    D0 = fpx / s0;
    scene.fog.near = D0 * 1.1;
    scene.fog.far = D0 * 1.6;
    if (mirror) mirror.size(vw, vh, stage.dpr);
    reach = Math.max(vw, vh) / s0 * .78;
    Dfill = fpx / (Math.max(vw / SW, vh / SH) * 1.04);
    fitted = false;
  }
  /* The screen is sized to the name; on a short window the name comes down to fit. */
  function fitFace() {
    fitted = true;
    const w = (word && word.offsetWidth) || vw * .6, sf = Math.min(w / .76 / SW, .94 * vw / SW, .72 * vh / SH);
    Dface = fpx / sf;
    if (word && w > sf * SW * .84) {
      const fs = parseFloat(getComputedStyle(word).fontSize) * sf * SW * .84 / w;
      [press, word.parentNode].forEach(el => el && el.style.setProperty('--pf', fs.toFixed(1) + 'px'));
    }
  }

  function placeCamera(t) {
    const a = glide((t - DRIFT[0]) / (DRIFT[1] - DRIFT[0]));
    let yaw = (60 - 14 * a) * Math.PI / 180, pit = (24 - 7 * a) * Math.PI / 180, D = D0 * (1.12 - .12 * a);
    T.set(-11, 19, -2);
    const b = snap((t - TURN[0]) / (TURN[1] - TURN[0]));
    if (b > 0) {
      if (!fitted) fitFace();
      yaw *= 1 - b; pit *= 1 - b;
      T.lerp(v.set(SCX, SCY, SCREEN.z), b);
      D = Math.exp(Math.log(D) + (Math.log(Dface) - Math.log(D)) * b);
      const c = snap((t - PUSH[0]) / (PUSH[1] - PUSH[0]));
      if (c > 0) D = Math.exp(Math.log(Dface) + (Math.log(Dfill) - Math.log(Dface)) * c);
    }
    for (const p of pivots) {
      if (!p.part.flight || !p.part.flight.heavy) continue;
      const h = t - p.part.flight.at - p.part.flight.dur;
      if (h > 0 && h < .5) T.y += .3 * Math.exp(-h * 11) * Math.sin(h * 46);
    }
    camera.position.set(T.x - Math.sin(yaw) * Math.cos(pit) * D, T.y + Math.sin(pit) * D, T.z + Math.cos(yaw) * Math.cos(pit) * D);
    camera.lookAt(T);
    /* a tight near plane keeps depth precision, so close-set surfaces cannot fight */
    camera.near = Math.max(3, D * .2);
    camera.far = D * 9;
    camera.updateProjectionMatrix();
    return D;
  }

  function placeParts(t) {
    for (const p of pivots) {
      const f = p.part.flight;
      if (!f) continue;
      const k = (t - f.at) / f.dur;
      if (k <= 0) { p.pivot.visible = false; continue; }
      p.pivot.visible = true;
      if (k >= 1) {
        if (!p.home) { p.pivot.position.copy(p.c); p.pivot.rotation.set(0, 0, 0); p.home = true; }
        continue;
      }
      p.home = false;
      const a = Math.pow(1 - k, f.heavy ? 2.6 : 3.6), b = Math.pow(1 - k, 2.4) * 3;
      p.pivot.position.set(p.c.x + f.from[0] * a * reach, p.c.y + f.from[1] * a * reach, p.c.z + f.from[2] * a * reach);
      p.pivot.rotation.set(f.tumble[0] * b, f.tumble[1] * b, f.tumble[2] * b);
    }
  }

  const corner = (x, y) => { v.set(x, y, SCREEN.z).project(camera); return [(v.x * .5 + .5) * vw, (-v.y * .5 + .5) * vh]; };
  function placeScreen(t) {
    const on = clamp01((t - POWER) / .3);
    if (panelPart && panelPart.group.userData.setLit) panelPart.group.userData.setLit(on, 1.2, 1.16, 1.1);
    if (stage.fx.bloom) stage.fx.bloom.strength = .16 - .1 * on;
    halo.material.opacity = .55 * on * (1 - clamp01((t - PUSH[0]) / .5));
    halo.visible = on > 0;
    if (!lit) return;
    if (on <= 0) { lit.style.display = 'none'; return; }
    /* a CRT coming on: width first, then height */
    const w = clamp01(on / .42), h = clamp01((on - .42) / .58), hw = SW / 2 * w, hh = Math.max(.14, SH / 2 * h * h);
    const q = [corner(SCX - hw, SCY + hh), corner(SCX + hw, SCY + hh), corner(SCX + hw, SCY - hh), corner(SCX - hw, SCY - hh)];
    const pts = q.map(p => p[0].toFixed(1) + 'px ' + p[1].toFixed(1) + 'px');
    lit.style.display = 'block';
    lit.style.clipPath = 'polygon(' + pts.join(',') + ')';
  }

  function apply(t) {
    const up = glide((t - LIGHTS_UP[0]) / (LIGHTS_UP[1] - LIGHTS_UP[0])), pw = clamp01((t - POWER) / .3);
    scene.environmentIntensity = .08 + .92 * up;
    if (lights) {
      lights.key.intensity = base.key * up;
      lights.rim.intensity = base.rim * up;
      if (lights.led) lights.led.intensity = 1100 * up;
    }
    placeCamera(t);
    placeParts(t);
    if (cablesPart && cablesPart.group.userData.setDraw) cablesPart.group.userData.setDraw(clamp01((t - WIRES[0]) / (WIRES[1] - WIRES[0])));
    for (const p of pivots) if (p.part.tick) p.part.tick(t, pw);
    placeScreen(t);
  }

  function frame() {
    if (done) return;
    if (!canvas.isConnected) { api.dispose(); return; }
    const now = performance.now();
    if (lastNow) stage.tune(now - lastNow);
    const dt = lastNow ? now - lastNow : 16.7;
    lastNow = now;
    const t = time();
    apply(t);
    /* parts in the air smear; the turn barely; from switch-on the frame must stay crisp for the hole */
    if (stage.fx.trail) stage.fx.trail.damp = Math.pow(t < TURN[0] ? .45 : t < POWER ? .25 : 0, dt / 16.7);
    /* the shadow only has to follow parts in the air: every other frame, then not at all */
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = t < WIRES[1] + .1 && (ticks++ % 2 === 0);
    /* the lit screen is opaque DOM by now: once it fills the frame there is nothing left to draw */
    if (t < PUSH[1] - .03) {
      if (mirror && t < PUSH[0]) mirror.update();
      stage.render();
    }
    if (t >= PUSH[1] + .4) stopTicking();
  }
  function stopTicking() {
    ticking = false;
    if (job && window.__motor) window.__motor.remove(job);
    job = null;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  const api = {
    stage, duration: PUSH[1],
    async prepare(report = () => {}) {
      size();
      scene.environment = studioEnv(renderer);
      lights = addLights(scene, {shadow: tier === 'high' ? 2048 : 1024});
      base = {key: lights.key.intensity, rim: lights.rim.intensity};
      await breathe();
      parts = await buildRig({THREE, renderer, stage, tier}, k => report(k * .7));
      const desk = parts.find(p => p.name === 'desk');
      if (desk) { mirror = makeMirror(stage, desk.group, {strength: 1.7, lod: 1.2, scale: tier === 'high' ? .5 : .4}); stage.fx.mirror = mirror; mirror.size(vw, vh, stage.dpr); }
      const box = new THREE.Box3();
      for (const part of parts) {
        if (!part.flight) {
          scene.add(part.group);
          if (part.name === 'cables') cablesPart = part;
          continue;
        }
        if (part.name === 'panel') panelPart = part;
        box.setFromObject(part.group);
        const c = box.getCenter(new THREE.Vector3()), pivot = new THREE.Group();
        pivot.position.copy(c);
        part.group.position.sub(c);
        pivot.add(part.group);
        scene.add(pivot);
        pivots.push({part, pivot, c, home: false});
      }
      /* The reflection sees only the big shapes, and small parts cast no shadow: both passes
         would otherwise repeat every one of the 190 draws, every frame. */
      scene.traverse(o => { if (o.isLight) o.layers.enable(1); });
      for (const part of parts) {
        const big = REFLECTED.includes(part.name), small = NO_SHADOW.test(part.name);
        part.group.traverse(o => {
          if (!o.isMesh) return;
          if (big) o.layers.enable(1);
          if (small) o.castShadow = false;
        });
      }
      /* compile and upload with everything showing and landed, from the wide view: a part
         outside the frame here would upload its buffers on its first visible frame */
      apply(TURN[0] + .15);
      for (const p of pivots) { p.pivot.visible = true; p.pivot.position.copy(p.c); p.pivot.rotation.set(0, 0, 0); }
      report(.75);
      await breathe();
      await stage.warm();
      if (mirror) mirror.update();
      report(1);
      apply(0);
    },
    resize: size,
    play() {
      held = -1;
      t0 = performance.now();
      lastNow = 0;
      ticking = true;
      const motor = window.__motor;
      if (motor) job = motor.add({name: 'intro', z: -2, write: () => { if (ticking && !done) frame(); return ticking && !done; }});
      else { const loop = () => { if (!ticking || done) return; frame(); raf = requestAnimationFrame(loop); }; raf = requestAnimationFrame(loop); }
      addEventListener('resize', size, {passive: true});
    },
    /* A held frame, for the lab and for tests. */
    seek(t, keep) {
      held = t;
      apply(t);
      renderer.shadowMap.needsUpdate = true;
      if (mirror) mirror.update();
      if (stage.fx.trail) { if (keep) stage.fx.trail.damp = .62; else stage.fx.trail.reset(); }
      stage.render();
    },
    skip() { stopTicking(); done = true; removeEventListener('resize', size); },
    dispose() {
      stopTicking();
      done = true;
      removeEventListener('resize', size);
      if (lights && lights.key) { lights.key.dispose && lights.key.dispose(); }
      if (mirror) mirror.dispose();
      try { stage.dispose(); } catch (e) { /* context already gone */ }
      canvas.remove();
    },
  };
  return api;
}
