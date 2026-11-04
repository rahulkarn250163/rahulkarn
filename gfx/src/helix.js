// Hero double helix: orthographic in css pixels, aligned to DOM labels.
import {THREE, phys, createStage, studioEnv} from './core.js';

const rr = s => { const v = Math.sin(s * 91.7 + 17.3) * 24634.6345; return v - Math.floor(v); };
const COL = {
  light: {ink: {color: 0x111111, metalness: .8, roughness: .25}, red: {color: 0x9e1c1c, metalness: 0, roughness: .3}, line: 0x111111},
  dark: {ink: {color: 0xf2efe7, metalness: .1, roughness: .4}, red: {color: 0xe0644f, metalness: 0, roughness: .35}, line: 0xf2efe7},
};
const SEG = .08, MAX_N = 64, MAX_S = Math.ceil((MAX_N + 1) / SEG) + 2;

export async function create({canvas, tier, preserve, theme}) {
  const stage = createStage(canvas, {alpha: true, preserve, exposure: 1.1});
  const {scene, renderer} = stage;
  const cam = stage.camera = new THREE.OrthographicCamera(0, 1, 0, -1, -500, 500);
  scene.environment = studioEnv(renderer, {mood: 'paper'});
  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(-.4, .8, 1);
  scene.add(sun);

  const inkM = phys({clearcoat: .6, clearcoatRoughness: .2}), redM = phys({clearcoat: 1, clearcoatRoughness: .15});
  const lineM = new THREE.LineDashedMaterial({dashSize: 3, gapSize: 4, transparent: true, opacity: .28});
  const hi = tier === 'high' || tier === 3;
  const made = [];
  let strands, nodes, rungs, lines, linePos;

  const apply = t => {
    const c = COL[t === 'dark' ? 'dark' : 'light'];
    for (const [m, k] of [[inkM, c.ink], [redM, c.red]]) {
      m.color.setHex(k.color); m.metalness = k.metalness; m.roughness = k.roughness;
    }
    lineM.color.setHex(c.line);
  };
  apply(theme);

  const inst = (geo, mat, n) => {
    const m = new THREE.InstancedMesh(geo, mat, n);
    m.frustumCulled = false;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(m); made.push(geo);
    return m;
  };

  const M = new THREE.Matrix4(), P = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0), A = new THREE.Vector3(), B = new THREE.Vector3(), D = new THREE.Vector3();
  const put = (mesh, i, a, b, r) => {
    D.subVectors(b, a); const len = D.length();
    if (len < 1e-4 || r <= 0) { M.makeScale(0, 0, 0); mesh.setMatrixAt(i, M); return; }
    Q.setFromUnitVectors(UP, D.divideScalar(len));
    P.addVectors(a, b).multiplyScalar(.5);
    M.compose(P, Q, S.set(r, len, r));
    mesh.setMatrixAt(i, M);
  };
  const dot = (mesh, i, p, r) => {
    M.compose(p, Q.identity(), S.setScalar(r));
    mesh.setMatrixAt(i, M);
  };

  return {
    stage,
    async prepare() {
      const cyl = new THREE.CylinderGeometry(1, 1, 1, hi ? 12 : 8, 1, true);
      const cylR = new THREE.CylinderGeometry(1, 1, 1, 8, 1);
      const sph = new THREE.SphereGeometry(1, hi ? 24 : 16, hi ? 16 : 12);
      strands = [inst(cyl, inkM, MAX_S), inst(cyl.clone(), redM, MAX_S)];
      nodes = [inst(sph, inkM, MAX_N), inst(sph.clone(), redM, MAX_N)];
      rungs = [inst(cylR, inkM, MAX_N), inst(cylR.clone(), redM, MAX_N)];
      linePos = new Float32Array(MAX_N * 12);
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
      lines = new THREE.LineSegments(g, lineM);
      lines.frustumCulled = false;
      scene.add(lines); made.push(g);
      await stage.warm();
    },
    resize(w, h) {
      stage.size(w, h);
      cam.left = 0; cam.right = w; cam.top = 0; cam.bottom = -h;
      cam.updateProjectionMatrix();
    },
    draw(st) {
      const {W, H, N, TW, R, top, step, rot, zip, kx, hot} = st;
      const n = Math.min(N, MAX_N), fade = 1 - kx * .9;
      const shown = i => (N - 1 - i) < zip * N + .5;
      const offX = s => (rr(s) - .5) * W * 1.2 * kx, offY = s => ((rr(s + 40) - .5) * H * .6 - 60) * kx;
      // Strand point, with the rung scatter blended between neighbouring rungs.
      const pt = (out, s, sign) => {
        const f = Math.max(0, Math.min(n - 1, s)), i0 = Math.floor(f), i1 = Math.min(n - 1, i0 + 1), u = f - i0;
        const j = kx * ((rr(i0 + 7) - .5) * (1 - u) + (rr(i1 + 7) - .5) * u) * 6;
        const a = s * TW + rot + j;
        out.set(W / 2 + sign * R * Math.sin(a) + offX(i0) * (1 - u) + offX(i1) * u,
          -(top + (s + .5) * step + offY(i0) * (1 - u) + offY(i1) * u), sign * R * Math.cos(a));
        return out;
      };
      const count = Math.min(MAX_S - 1, Math.ceil((n) / SEG));
      strands.forEach((mesh, k) => {
        const sign = k ? -1 : 1;
        for (let j = 0; j < count; j++) {
          const s = -.5 + j * SEG, vis = shown(Math.max(0, Math.min(n - 1, Math.round(s))));
          pt(A, s, sign); pt(B, s + SEG, sign);
          const r = (1.5 + .9 * (A.z / R + 1) / 2) * fade;
          put(mesh, j, A, B, vis ? r : 0);
        }
        mesh.count = count;
        mesh.instanceMatrix.needsUpdate = true;
      });
      let v = 0;
      for (let i = 0; i < n; i++) {
        const vis = shown(i), hotR = i === hot;
        pt(A, i, 1); pt(B, i, -1);
        const size = z => (hotR ? 5.5 : 3 + 1.6 * (z / R + 1) / 2) * fade * (vis ? 1 : 0);
        dot(nodes[0], i, A, size(A.z));
        dot(nodes[1], i, B, size(B.z));
        D.addVectors(A, B).multiplyScalar(.5);
        const mid = D.clone(), r = (hotR ? 1.7 : 1) * fade * (vis ? 1 : 0);
        put(rungs[0], i, A, mid, r);
        put(rungs[1], i, mid, B, r);
        if (vis && kx < .02) {
          const y = A.y, lx = W / 2 - (R + 22), rx = W / 2 + (R + 22), L = A.x < B.x ? A : B, Rt = L === A ? B : A;
          linePos.set([lx, y, 0, L.x, y, L.z, rx, y, 0, Rt.x, y, Rt.z], v * 3);
          v += 4;
        }
      }
      for (const m of [...nodes, ...rungs]) { m.count = n; m.instanceMatrix.needsUpdate = true; }
      lineM.opacity = .28 * fade;
      const g = lines.geometry;
      g.attributes.position.needsUpdate = true;
      g.setDrawRange(0, v);
      lines.computeLineDistances();
      stage.render();
    },
    setTheme(t) { apply(t); },
    dispose() {
      for (const g of made) g.dispose();
      inkM.dispose(); redM.dispose(); lineM.dispose();
      stage.dispose?.();
    },
  };
}

export function mockState(w, h) {
  return {W: w, H: h, N: 12, TW: .62, R: 42, top: 18, step: (h - 36) / 12, rot: .4, zip: 1, kx: 0, hot: -1, t: 0};
}
