import {THREE, rbox, box, merge, mesh, plate, normalFromHeight, speckleCanvas, rng, std, phys} from '../../core.js';

export function make() {
  const g = new THREE.Group();

  const normalMap = normalFromHeight(speckleCanvas(512, 23, 10), .5, {repeat: [40, 25]});
  const top = mesh(plate('+y', 0, -810, -500, 790, 500),
    std({color: 0x17171a, metalness: 0, roughness: .66, envMapIntensity: .55, normalMap}), {cast: false, receive: true});
  top.userData.mirror = true;
  g.add(top);

  const felt = std({color: 0x101011, roughness: .92, normalMap: normalFromHeight(speckleCanvas(512, 29, 10), .8, {repeat: [6, 3]})});
  g.add(mesh(rbox(-20, 0, 5, 40, .14, 28, .07), felt));

  // Stitches sit just proud of the mat, inset from its edge.
  const y0 = .138, y1 = .155, m = .5, pitch = .7, len = .42, t = .05, st = [];
  for (let x = -20 + m; x + len <= 40 - m; x += pitch) {
    st.push(box(x, y0, 5 + m - t, x + len, y1, 5 + m + t), box(x, y0, 28 - m - t, x + len, y1, 28 - m + t));
  }
  for (let z = 5 + m; z + len <= 28 - m; z += pitch) {
    st.push(box(-20 + m - t, y0, z, -20 + m + t, y1, z + len), box(40 - m - t, y0, z, 40 - m + t, y1, z + len));
  }
  g.add(mesh(merge(st), std({color: 0x3a3a38, roughness: .9}), {cast: false, receive: true}));

  return g;
}
