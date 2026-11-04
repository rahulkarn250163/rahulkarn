import {THREE, mats, box, merge, mesh, plate} from '../../core.js';

const X = -56.02, Y0 = 0, Y1 = 46, Z0 = -24, Z1 = 14, B = 1;

export function make() {
  const group = new THREE.Group();

  const glass = mesh(box(X, Y0, Z0, X + .4, Y1, Z1), mats.glass(.1), {cast: false});
  group.add(glass);

  // silkscreen border, a is y and b is z on x-facing plates
  group.add(mesh(merge([
    plate('-x', -56.03, Y0, Z0, Y0 + B, Z1),
    plate('-x', -56.03, Y1 - B, Z0, Y1, Z1),
    plate('-x', -56.03, Y0 + B, Z0, Y1 - B, Z0 + B),
    plate('-x', -56.03, Y0 + B, Z1 - B, Y1 - B, Z1),
  ]), mats.gloss(0x08080a), {cast: false}));

  const screw = [];
  for (const y of [Y0 + 2.2, Y1 - 2.2]) for (const z of [Z0 + 2.2, Z1 - 2.2]) {
    const head = new THREE.CylinderGeometry(.4, .4, .4, 20).rotateZ(Math.PI / 2).translate(X - .2, y, z);
    const cap = new THREE.CylinderGeometry(.3, .4, .08, 20).rotateZ(Math.PI / 2).translate(X - .44, y, z);
    screw.push(head, cap);
  }
  group.add(mesh(merge(screw), mats.steel()));
  return group;
}
