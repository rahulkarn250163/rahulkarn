import {THREE, mats, rbox, box, merge, mesh, plate, normalFromHeight, brushedCanvas} from '../../core.js';

export function make() {
  const group = new THREE.Group();

  // Clone so the brushed maps do not leak onto the shared material
  const shell = mats.spaceGrey().clone();
  const brushed = brushedCanvas(512, 7, 40, 26);
  shell.normalMap = normalFromHeight(brushed, 0.35, {repeat: [2, 1]});
  shell.normalScale.set(1, 1);
  shell.normalScale = new THREE.Vector2(0.25, 0.25);

  // Body plus the raised front lip along the reader's edge
  group.add(mesh(merge([
    rbox(-15, 0, 8, 25, 1.3, 23, 0.3),
    rbox(-15, 1.1, 22.7, 25, 1.55, 23, 0.1),
  ]), shell));

  group.add(mesh(plate('+y', 1.31, -14.8, 8.7, 24.8, 22.7), mats.plastic(0x08090a), {cast: false}));

  // Desk is y=0 and the body starts there, so the feet are sunk into the base
  const feet = [[-14, 9], [24, 9], [-14, 22], [24, 22]].map(([x, z]) =>
    box(x - 0.6, 0, z - 0.6, x + 0.6, 0.12, z + 0.6));
  group.add(mesh(merge(feet), mats.rubber(0x0c0c0c)));

  return group;
}
