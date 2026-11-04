import {THREE, std, rng} from '../core.js';

const clamp = v => v < 0 ? 0 : v > 1 ? 1 : v;
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export function makeSheets(mods, {count = 240} = {}) {
  const r = rng(4127);
  const geo = new THREE.BoxGeometry(3.4, .05, 4.6);
  const mat = std({color: 0xefe9db, roughness: .85});
  const inst = new THREE.InstancedMesh(geo, mat, count);
  inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  inst.frustumCulled = false;

  const group = new THREE.Group();
  group.add(inst);

  // Flat parallel arrays: rest xyz + yaw, target xyz + yaw, delay, arc, axis xyz
  const rest = new Float32Array(count * 4), tgt = new Float32Array(count * 4);
  const delay = new Float32Array(count), arc = new Float32Array(count), axis = new Float32Array(count * 3);
  const perMod = Math.ceil(count / mods.length);
  const cols = Math.ceil(Math.sqrt(perMod * 1.6)), rows = Math.ceil(perMod / cols);

  for (let i = 0; i < count; i++) {
    rest[i * 4] = (r() - .5) * .3;
    rest[i * 4 + 1] = .1 + 26 * i / Math.max(1, count - 1);
    rest[i * 4 + 2] = (r() - .5) * .3;
    rest[i * 4 + 3] = (r() - .5) * .12;

    const m = mods[i % mods.length], slot = Math.floor(i / mods.length);
    const c = slot % cols, w = Math.floor(slot / cols);
    tgt[i * 4] = m.x + ((c + .5) / cols - .5) * (m.w - 4) + (r() - .5) * .4;
    tgt[i * 4 + 1] = .6;
    tgt[i * 4 + 2] = m.z + ((w + .5) / rows - .5) * (m.d - 5) + (r() - .5) * .4;
    tgt[i * 4 + 3] = (r() - .5) * .16;

    delay[i] = r() * .45;
    arc[i] = 18 + r() * 22;
    let ax = r() - .5, ay = r() - .5, az = r() - .5;
    const l = Math.hypot(ax, ay, az) || 1;
    axis[i * 3] = ax / l; axis[i * 3 + 1] = ay / l; axis[i * 3 + 2] = az / l;
  }

  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), T = new THREE.Quaternion();
  const P = new THREE.Vector3(), S = new THREE.Vector3(), A = new THREE.Vector3();
  const Y = new THREE.Vector3(0, 1, 0);

  function set(fly, fade) {
    group.visible = fade > 0;
    if (!group.visible) return;
    S.setScalar(fade);
    for (let i = 0; i < count; i++) {
      const e = ease(clamp((fly - delay[i]) / .55));
      const i4 = i * 4;
      P.set(
        rest[i4] + (tgt[i4] - rest[i4]) * e,
        rest[i4 + 1] + (tgt[i4 + 1] - rest[i4 + 1]) * e + arc[i] * Math.sin(Math.PI * e),
        rest[i4 + 2] + (tgt[i4 + 2] - rest[i4 + 2]) * e
      );
      Q.setFromAxisAngle(Y, rest[i4 + 3] + (tgt[i4 + 3] - rest[i4 + 3]) * e);
      // Whole turns only, so the sheet lands flat at e = 1
      A.set(axis[i * 3], axis[i * 3 + 1], axis[i * 3 + 2]);
      T.setFromAxisAngle(A, e * Math.PI * 4);
      Q.multiply(T);
      M.compose(P, Q, S);
      inst.setMatrixAt(i, M);
    }
    inst.instanceMatrix.needsUpdate = true;
  }

  return {group, set};
}
