import {THREE, rbox, box, merge, mesh, plate, normalFromHeight, speckleCanvas, std} from '../../core.js';

/* The desk is a real table now, in a dark room: someone sits at it (bits/man.js), so it has a front edge to sit
   at, legs, and a floor under them. Units are centimetres and the tabletop is y = 0. */
export const TABLE = {x0: -86, x1: 76, z0: -46, z1: 37, thick: 4, floor: -74};

export function make() {
  const g = new THREE.Group(), {x0, x1, z0, z1, thick, floor} = TABLE;

  const normalMap = normalFromHeight(speckleCanvas(512, 23, 10), .5, {repeat: [4, 2]});
  const top = mesh(plate('+y', 0, x0, z0, x1, z1),
    std({color: 0x17171a, metalness: 0, roughness: .66, envMapIntensity: .55, normalMap}), {cast: false, receive: true});
  top.userData.mirror = true;
  g.add(top);

  /* the slab under the top, with a small round on its edge, and four plain legs */
  const body = std({color: 0x131315, metalness: 0, roughness: .7, envMapIntensity: .5});
  g.add(mesh(rbox(x0, -thick, z0, x1, -.02, z1, .5), body, {cast: false, receive: true}));
  const legs = [[x0 + 5, z0 + 5], [x1 - 5, z0 + 5], [x0 + 5, z1 - 5], [x1 - 5, z1 - 5]].map(([x, z]) => rbox(x - 2.4, floor, z - 2.4, x + 2.4, -thick, z + 2.4, .5));
  g.add(mesh(merge(legs), std({color: 0x0e0e10, metalness: .5, roughness: .5}), {cast: false, receive: false}));

  /* the floor: only ever seen dimly, past the table's edge */
  g.add(mesh(plate('+y', floor, -900, -600, 900, 700), std({color: 0x0d0d0f, metalness: 0, roughness: .85, envMapIntensity: .35}), {cast: false, receive: true}));

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
