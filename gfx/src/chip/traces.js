// Copper traces with travelling light signals for the reel chip.
import {THREE, std, mesh} from '../core.js';

const Z = .25, W = 1, TH = .35, MAX_REPS = 4;

// Raised box-section ribbon along a polyline; each segment is a closed box so drawRange reveals it in order.
function ribbon(pts) {
  const pos = [], idx = [], ends = [];
  let n = 0, run = 0;
  const hw = W / 2, z0 = Z, z1 = Z + TH;
  for (let s = 0; s < pts.length - 1; s++) {
    const [ax, ay] = pts[s], [bx, by] = pts[s + 1];
    const dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy) || 1;
    const ux = dx / l, uy = dy / l, px = -uy * hw, py = ux * hw;
    // Extend by half a width so corners overlap instead of notching.
    const sx = ax - (s ? ux * hw : 0), sy = ay - (s ? uy * hw : 0);
    const ex = bx + (s < pts.length - 2 ? ux * hw : 0), ey = by + (s < pts.length - 2 ? uy * hw : 0);
    const c = [[sx + px, sy + py], [sx - px, sy - py], [ex - px, ey - py], [ex + px, ey + py]];
    for (const z of [z0, z1]) for (const [x, y] of c) pos.push(x, y, z);
    for (const [a, b, c2, d] of [[4, 5, 6, 7], [0, 3, 2, 1], [0, 1, 5, 4], [2, 3, 7, 6], [1, 2, 6, 5], [3, 0, 4, 7]])
      idx.push(n + a, n + b, n + c2, n + a, n + c2, n + d);
    n += 8; run += l;
    ends.push({run, count: idx.length});
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  const flat = geo.toNonIndexed();
  geo.dispose();
  flat.computeVertexNormals();
  flat.setDrawRange(0, 0);
  return {geo: flat, ends, total: run};
}

function pointAt(pts, d, out) {
  for (let s = 0; s < pts.length - 1; s++) {
    const [ax, ay] = pts[s], [bx, by] = pts[s + 1], l = Math.hypot(bx - ax, by - ay);
    if (d <= l || s === pts.length - 2) { const f = l ? Math.min(d / l, 1) : 0; return out.set(ax + (bx - ax) * f, ay + (by - ay) * f, Z + TH + .12); }
    d -= l;
  }
  return out;
}

export function makeTraces(L) {
  const group = new THREE.Group();
  const mat = std({color: 0xb8743f, metalness: 1, roughness: .3});
  const traces = L.groups.map(g => g.pads.map(p => { const r = ribbon(p.pts); r.m = mesh(r.geo, mat, {cast: true}); r.k = 0; r.pts = p.pts; group.add(r.m); return r; }));
  const count = traces.flat().length * MAX_REPS;
  const coreGeo = new THREE.SphereGeometry(.3, 10, 8), haloGeo = new THREE.SphereGeometry(.85, 12, 10);
  const coreMat = new THREE.MeshBasicMaterial({color: '#fff3e6', transparent: true, opacity: 0, depthWrite: false});
  const haloMat = new THREE.MeshBasicMaterial({color: '#e0644f', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending});
  const core = new THREE.InstancedMesh(coreGeo, coreMat, count), halo = new THREE.InstancedMesh(haloGeo, haloMat, count);
  for (const m of [core, halo]) { m.count = 0; m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); group.add(m); }
  const M = new THREE.Matrix4(), v = new THREE.Vector3();
  const setTrace = (gi, i, k) => {
    const t = traces[gi][i]; t.k = Math.max(0, Math.min(1, k));
    const d = t.k * t.total; let c = 0, prev = 0, prevCount = 0;
    for (const e of t.ends) { c = d >= e.run ? e.count : d > prev ? prevCount + Math.floor((d - prev) / (e.run - prev) * (e.count - prevCount) / 3) * 3 : c; prev = e.run; prevCount = e.count; }
    t.geo.setDrawRange(0, c);
  };
  const setSignals = (gi, reps, t, fade) => {
    let n = 0; const rc = Math.min(reps, MAX_REPS);
    traces.forEach((row, g) => { if (gi !== null && gi !== undefined && gi >= 0 && g !== gi) return;
      row.forEach((tr, i) => { if (tr.k < 1) return;
        for (let r = 0; r < rc; r++) { pointAt(tr.pts, ((t * .38 + i * .21 + g * .13 + r * .5) % 1) * tr.total, v); M.makeTranslation(v.x, v.y, v.z); core.setMatrixAt(n, M); halo.setMatrixAt(n++, M); } }); });
    core.count = halo.count = n; core.instanceMatrix.needsUpdate = halo.instanceMatrix.needsUpdate = true;
    coreMat.opacity = fade; haloMat.opacity = fade * .45;
  };
  const dispose = () => { traces.flat().forEach(t => t.geo.dispose()); mat.dispose(); coreGeo.dispose(); haloGeo.dispose(); coreMat.dispose(); haloMat.dispose(); core.dispose(); halo.dispose(); };
  return {group, setTrace, setSignals, dispose};
}
