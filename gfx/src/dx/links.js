// Copper links from the hub to each module, with signals running along them.
import {THREE, std} from '../core.js';

const SIGNALS = 3, STAGGER = .08;
const clamp01 = v => Math.min(1, Math.max(0, v));
const UP = new THREE.Vector3(0, 1, 0);
const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3();
const p = new THREE.Vector3(), dir = new THREE.Vector3(), end = new THREE.Vector3(), start = new THREE.Vector3();
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

export function makeLinks(n = 6) {
  const group = new THREE.Group();
  const inst = (geo, mat, count) => {
    const im = new THREE.InstancedMesh(geo, mat, count);
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    im.frustumCulled = false;
    group.add(im);
    return im;
  };
  const rods = inst(new THREE.CylinderGeometry(1, 1, 1, 8),
    std({color: 0xb8743f, metalness: 1, roughness: .3}), n);
  const cores = inst(new THREE.SphereGeometry(.55, 8, 6),
    new THREE.MeshBasicMaterial({color: 0xfff3e6}), n * SIGNALS);
  const halos = inst(new THREE.SphereGeometry(1.5, 8, 6),
    new THREE.MeshBasicMaterial({color: 0xff6a45, transparent: true, opacity: .45,
      blending: THREE.AdditiveBlending, depthWrite: false}), n * SIGNALS);

  function set(reveal, speed, t, from, rFrom, to) {
    const span = 1 - STAGGER * (n - 1);
    for (let i = 0; i < n; i++) {
      const r = clamp01((reveal - i * STAGGER) / span);
      end.copy(to(i));
      /* each link leaves the hub's rim, so its top stays clear for the label */
      start.set(end.x - from.x, 0, end.z - from.z).normalize().multiplyScalar(rFrom).add(from);
      dir.subVectors(end, start);
      const len = dir.length();
      if (r <= 0 || len === 0) rods.setMatrixAt(i, ZERO);
      else {
        dir.divideScalar(len);
        q.setFromUnitVectors(UP, dir);
        p.copy(start).addScaledVector(dir, len * r * .5);
        s.set(.36, len * r, .36);
        rods.setMatrixAt(i, m.compose(p, q, s));
      }
      for (let j = 0; j < SIGNALS; j++) {
        const k = i * SIGNALS + j;
        if (r < 1) {
          cores.setMatrixAt(k, ZERO);
          halos.setMatrixAt(k, ZERO);
          continue;
        }
        const f = (((t * speed + i * .17 + j / 3) % 1) + 1) % 1;
        p.lerpVectors(start, end, f);
        m.makeTranslation(p.x, p.y, p.z);
        cores.setMatrixAt(k, m);
        halos.setMatrixAt(k, m);
      }
    }
    rods.instanceMatrix.needsUpdate = cores.instanceMatrix.needsUpdate = halos.instanceMatrix.needsUpdate = true;
  }
  return {group, set};
}
