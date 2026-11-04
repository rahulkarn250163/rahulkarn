// Copper bus on the die: flat ribbons revealed by step, with pulses along finished runs.
import {THREE, std, mesh} from '../core.js';

const Z = 5.2, W = 0.55, T = 0.12, MID = [50, 34.5], LOW = [50, 64.5];
const LINES = [
  [1, [[26, 32], [26, 34.5], MID]], [2, [[74, 32], [74, 34.5], MID]], [3, [[18.5, 37], [18.5, 34.5], MID]],
  [4, [MID, [50, 37]]], [4, [[50, 62], LOW]], [5, [[81.5, 37], [81.5, 34.5], MID]],
  [6, [[26, 67], [26, 64.5], LOW]], [7, [[74, 67], [74, 64.5], LOW]], [8, [[50, 84], LOW]],
];
const FACES = [[0, 1, 2, 0, 2, 3], [4, 6, 5, 4, 7, 6], [0, 4, 5, 0, 5, 1], [1, 5, 6, 1, 6, 2], [2, 6, 7, 2, 7, 3], [3, 7, 4, 3, 4, 0]].flat();

// One closed box per segment, extended half a width at each end so corners stay square.
function ribbon(pts) {
  const pos = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const l = Math.hypot(bx - ax, by - ay) || 1, dx = (bx - ax) / l, dy = (by - ay) / l, h = W / 2;
    const nx = -dy * h, ny = dx * h, sx = ax - dx * h, sy = ay - dy * h, ex = bx + dx * h, ey = by + dy * h;
    const c = [[sx - nx, sy - ny], [ex - nx, ey - ny], [ex + nx, ey + ny], [sx + nx, sy + ny]];
    const v = [...c.map(p => [p[0], p[1], Z + T]), ...c.map(p => [p[0], p[1], Z])];
    for (const f of FACES) pos.push(...v[f]);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  return geo;
}

function along(pts, k, out) {
  const n = pts.length - 1, f = Math.min(k, 0.9999) * pts.reduce((s, p, i) => i < n ? s + Math.hypot(pts[i + 1][0] - p[0], pts[i + 1][1] - p[1]) : s, 0);
  for (let i = 0, d = f; i < n; i++) {
    const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    if (d <= l || i === n - 1) return out.set(pts[i][0] + (pts[i + 1][0] - pts[i][0]) * d / l, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * d / l, Z + T + 0.2);
    d -= l;
  }
}

export function makeBus() {
  const group = new THREE.Group(), copper = std({color: 0xc47a4a, metalness: 1, roughness: .32, transparent: true});
  const coreGeo = new THREE.SphereGeometry(0.28, 12, 10), haloGeo = new THREE.SphereGeometry(0.75, 12, 10);
  const coreMat = new THREE.MeshBasicMaterial({color: 0xfff3e6, transparent: true});
  const haloMat = new THREE.MeshBasicMaterial({color: 0xe0644f, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false});
  const runs = LINES.map(([step, line]) => {
    const pts = line.map(([x, y]) => [x, 100 - y]), geo = ribbon(pts), m = mesh(geo, copper);
    const pulse = new THREE.Group();
    pulse.add(new THREE.Mesh(coreGeo, coreMat), new THREE.Mesh(haloGeo, haloMat));
    m.visible = pulse.visible = false;
    geo.setDrawRange(0, 0);
    group.add(m, pulse);
    return {step, pts, geo, m, pulse, count: geo.attributes.position.count};
  });
  const setBus = (step, k) => runs.forEach(r => { if (r.step !== step) return;
    r.geo.setDrawRange(0, Math.floor(THREE.MathUtils.clamp(k, 0, 1) * r.count / 36) * 36 || (k > 0 ? Math.floor(k * r.count / 3) * 3 : 0));
    r.m.visible = k > 0; });
  const setPulse = (step, on, t) => runs.forEach(r => { if (r.step !== step) return;
    r.pulse.visible = on;
    if (on) along(r.pts, (t * 0.55 + step * 0.17) % 1, r.pulse.position); });
  const dispose = () => { runs.forEach(r => r.geo.dispose()); coreGeo.dispose(); haloGeo.dispose(); coreMat.dispose(); haloMat.dispose(); };
  return {group, setBus, setPulse, dispose};
}
