import {THREE, rbox, box, merge, mesh, std} from '../core.js';

const BASE_EDGE = 1.3, HOT_EDGE = 3;
const edgeBase = new THREE.Color(0xff6a45);

export function makeModules(mods) {
  const group = new THREE.Group();
  const bodyMat = std({color: 0x2f3237, metalness: .35, roughness: .5});
  const plateMat = std({color: 0x43464c, metalness: .2, roughness: .62});
  const parts = mods.map((m) => {
    const {w, d} = m, hw = w / 2, hd = d / 2, t = .12, i = .4;
    const g = new THREE.Group();
    g.position.set(m.x, 0, m.z);
    g.scale.y = .001;
    g.add(mesh(rbox(-hw, 0, -hd, hw, 5, hd, .5), bodyMat, {cast: true, receive: true}));
    g.add(mesh(box(-hw + i, 5, -hd + i, hw - i, 5.15, hd - i), plateMat, {receive: true}));
    const edgeMat = new THREE.MeshBasicMaterial({color: edgeBase.clone().multiplyScalar(BASE_EDGE)});
    const y0 = 5.02, y1 = 5.22, a = i - t;
    g.add(mesh(merge([
      box(-hw + a, y0, -hd + a, hw - a, y1, -hd + i),
      box(-hw + a, y0, hd - i, hw - a, y1, hd - a),
      box(-hw + a, y0, -hd + i, -hw + i, y1, hd - i),
      box(hw - i, y0, -hd + i, hw - a, y1, hd - i),
    ]), edgeMat));
    group.add(g);
    // outward unit vector from the origin, fixed per module
    const len = Math.hypot(m.x, m.z) || 1;
    return {g, edgeMat, m, ox: m.x / len, oz: m.z / len};
  });

  const out = new THREE.Vector3();
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

  function set(form, lift, hot) {
    const n = parts.length, span = 1 - .08 * (n - 1);
    parts.forEach((p, i) => {
      const f = clamp01((form - i * .08) / span);
      p.g.visible = f > 0;
      p.g.scale.y = .001 + .999 * f;
      p.g.position.set(
        p.m.x + p.ox * 12 * lift,
        lift * (10 - p.oz * 8),
        p.m.z + p.oz * 12 * lift,
      );
      p.edgeMat.color.copy(edgeBase).multiplyScalar(i === hot ? HOT_EDGE : BASE_EDGE);
    });
  }

  function top(i) {
    const {g} = parts[i];
    g.updateWorldMatrix(true, false);
    return out.set(0, 5.15, 0).applyMatrix4(g.matrixWorld);
  }

  /* where a link meets the block: its edge facing the hub, clear of the label */
  const near = new THREE.Vector3();
  function edge(i) {
    const {m} = parts[i], t = top(i), len = Math.hypot(t.x, t.z) || 1, dx = t.x / len, dz = t.z / len;
    const k = Math.min(m.w / 2 / (Math.abs(dx) || 1e-6), m.d / 2 / (Math.abs(dz) || 1e-6)) * .94;
    return near.set(t.x - dx * k, t.y, t.z - dz * k);
  }

  return {group, set, top, edge};
}
