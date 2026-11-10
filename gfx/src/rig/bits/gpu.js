// Graphics card, fans facing -x.
import {THREE, mats, rbox, box, merge, mesh, plate, brushedCanvas, canvasTex, std} from '../../core.js';
import {makeFan, spin} from './fan.js';

// Round plate facing -x, centred at (y,z).
const disc = (x, y, z, r, seg = 40) => {
  const g = new THREE.CircleGeometry(r, seg);
  g.rotateY(-Math.PI / 2);
  g.translate(x, y, z);
  return g;
};

export function make() {
  const group = new THREE.Group();
  const dark = std({color: 0x0b0b0c, roughness: .85, metalness: .1});
  const fanZ = [-16, -7, 2];

  // Shroud with chamfer strips along its long edges
  group.add(mesh(rbox(-45.4, 8.5, -21, -41.6, 19.5, 7, .4), std({color: 0x4a4c50, metalness: .75, roughness: .38})));
  group.add(mesh(merge([
    box(-45.46, 19.0, -20.6, -45.38, 19.12, 6.6),
    box(-45.46, 8.88, -20.6, -45.38, 9, 6.6),
    box(-45.0, 19.48, -20.6, -44.86, 19.54, 6.6),
    box(-45.46, 9, 6.5, -45.38, 19, 6.62),
  ]), mats.aluminium()));

  // Vents on +y, recesses on -x, riser and PCB edge in one dark batch
  const darkGeo = [
    disc(-45.41, 13.4, -16, 4.5), disc(-45.41, 13.4, -7, 4.5), disc(-45.41, 13.4, 2, 4.5),
    rbox(-41.3, 12.5, -18, -38.8, 15, 2, .1),
    box(-45.2, 8.2, -21, -41.7, 8.5, 7),
  ];
  for (let z = -19; z <= 5; z += 1.6) darkGeo.push(plate('+y', 19.51, -44.3, z, -42.2, z + .7));
  group.add(mesh(merge(darkGeo), dark, {cast: false}));

  // Backplate
  const brushed = std({
    map: canvasTex(512, 512, (c, w, h) => c.drawImage(brushedCanvas(512, 7, 150, 34), 0, 0, w, h)),
    metalness: .9, roughness: .42,
  });
  group.add(mesh(rbox(-41.6, 8.6, -20.8, -41.3, 19.4, 6.8, .06), brushed));

  // Backplate screws and bracket detail
  const screw = (x0, x1, y, z, r) => {
    const g = new THREE.CylinderGeometry(r, r, x1 - x0, 12);
    g.rotateZ(Math.PI / 2);
    g.translate((x0 + x1) / 2, y, z);
    return g;
  };
  const screws = [];
  for (const [y, z] of [[9.4, -20], [18.6, -20], [9.4, 6], [18.6, 6], [10.6, -7], [17.4, -7]]) {
    screws.push(screw(-41.3, -41.2, y, z, .22));
  }
  screws.push(screw(-47.1, -46.6, 20.4, -21.75, .55), screw(-47.3, -47.1, 20.4, -21.75, .7));
  group.add(mesh(merge(screws), mats.chrome()));

  // PCIe bracket with vent slots on its -x face
  group.add(mesh(rbox(-46.6, 8, -22.5, -41.6, 20, -21, .08), mats.steel()));
  const slots = [];
  for (let y = 9; y < 19; y += 1.1) slots.push(plate('-x', -46.61, y, -22.2, y + .6, -21.3));
  group.add(mesh(merge(slots), dark, {cast: false}));

  const fans = fanZ.map(z => makeFan(-45.42, 13.4, z, 4.1, {frame: false}));
  fans.forEach(f => group.add(f.group));

  // Red strip along the top edge of the -x face
  const stripMat = new THREE.MeshBasicMaterial({color: 0x000000});
  const lit = new THREE.Color(0xff6a45).multiplyScalar(1.35);
  group.add(mesh(plate('-x', -45.43, 18.6, -20, 19, 6), stripMat, {cast: false, receive: false}));

  group.userData.tick = (t, power) => {
    stripMat.color.copy(lit).multiplyScalar(power);
    fans.forEach(f => spin(f, t, power));
  };
  return group;
}
