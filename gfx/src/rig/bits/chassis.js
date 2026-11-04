import {THREE, mats, box, rbox, merge, mesh} from '../../core.js';

// Cylinder with its axis along x, spanning x0..x1
function cylX(x0, x1, y, z, r, seg = 16) {
  const g = new THREE.CylinderGeometry(r, r, x1 - x0, seg);
  g.rotateZ(Math.PI / 2);
  g.translate((x0 + x1) / 2, y, z);
  return g;
}
// Cylinder with its axis along z
function cylZ(z0, z1, x, y, r, seg = 12) {
  const g = new THREE.CylinderGeometry(r, r, z1 - z0, seg);
  g.rotateX(Math.PI / 2);
  g.translate(x, y, (z0 + z1) / 2);
  return g;
}

export function make() {
  const group = new THREE.Group();

  group.add(mesh(rbox(-56, 0, -24, -37, .8, 14, .08), mats.powder(0x1d1e20)));
  const shell = [
    rbox(-37.6, .8, -24, -37, 45, 14, .08),
    rbox(-56, .8, -24, -37.6, 45, -23.2, .08),
  ];
  group.add(mesh(merge(shell), mats.powder(0x17181a)));

  // Warm LED strip under the roof line
  const led = new THREE.MeshBasicMaterial({color: new THREE.Color(0xfff0dd).multiplyScalar(.85)});
  group.add(mesh(box(-55, 44.4, 12.9, -38, 44.7, 13.1), led, {cast: false}));

  const brass = [];
  for (const y of [8, 25, 42]) for (const z of [-21, -8, 5]) brass.push(cylX(-38.1, -37.6, y, z, .32));
  group.add(mesh(merge(brass), mats.gold()));

  const covers = [], screws = [];
  for (let i = 0; i < 7; i++) {
    const y = 9 + i * 2.2;
    covers.push(box(-52, y, -23.2, -39, y + 1.8, -23.15));
    screws.push(cylZ(-23.15, -23, -40, y + .9, .28));
  }
  // Six wall screws, heads on the inside face of the right wall
  for (const [y, z] of [[3, -22], [3, -6], [3, 12], [43, -22], [43, -6], [43, 12]]) {
    screws.push(cylX(-37.75, -37.6, y, z, .32));
  }
  group.add(mesh(merge(covers), mats.powder(0x232427)));
  group.add(mesh(merge(screws), mats.steel()));

  const rubber = [];
  // Grommets: a disc with a slightly proud lip
  for (const y of [14, 30]) {
    rubber.push(cylX(-37.68, -37.6, y, 8, 1.5, 28));
    rubber.push(cylX(-37.72, -37.68, y, 8, 1.1, 28));
  }
  // Feet stop at the desk, so the case floor is carried on their top edge
  for (const x of [-54, -39]) for (const z of [-22, 12]) {
    const g = new THREE.CylinderGeometry(1.2, 1.2, .3, 20);
    g.translate(x, -.15, z);
    rubber.push(g);
  }
  group.add(mesh(merge(rubber), mats.rubber(0x0c0c0d)));

  return group;
}
