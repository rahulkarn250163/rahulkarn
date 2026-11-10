import {THREE, mats, rbox, merge, mesh, plate, phys, std} from '../../core.js';

const Y0 = 16.4, ZF = -4.4;

export function make() {
  const g = new THREE.Group();
  const housing = std({color: 0x18191b, metalness: .25, roughness: .42});
  const gloss = phys({color: 0x0f1012, roughness: .28, metalness: 0, clearcoat: .5, clearcoatRoughness: .25});
  const slot = std({color: 0x030304, roughness: .9, metalness: 0});

  g.add(mesh(merge([
    rbox(-20, 14, -7, 34, 46, -4.4, .35),
    rbox(-6, 20, -9.5, 20, 40, -7, 1),
  ]), housing));

  // Chin: a thin glossier skin on the front face below the opening
  g.add(mesh(rbox(-19.6, 14.25, ZF - .02, 33.6, Y0 - .05, ZF + .015, .01, 1), gloss, {cast: false}));

  // Vent slots on the hump: rear and top faces
  const vents = [];
  for (let i = 0; i < 12; i++) {
    const y = 27 + i * .55;
    vents.push(plate('-z', -9.51, -3, y, 17, y + .2));
  }
  for (let i = 0; i < 4; i++) {
    const z = -9 + i * .45;
    vents.push(plate('+y', 40.01, -3, z, 17, z + .18));
  }
  g.add(mesh(merge(vents), slot, {cast: false}));

  // Four mount screws on the rear face of the hump
  const screwGeo = [];
  for (const x of [1, 13]) for (const y of [22, 25]) {
    const s = new THREE.CylinderGeometry(.28, .28, .14, 16).rotateX(Math.PI / 2);
    screwGeo.push(s.translate(x, y, -9.55));
  }
  g.add(mesh(merge(screwGeo), mats.steel()));

  const dark = new THREE.Color(0x120505), lit = new THREE.Color(0xff6a45).multiplyScalar(3);
  const ledMat = new THREE.MeshBasicMaterial({color: dark.clone(), toneMapped: true});
  const led = new THREE.Mesh(new THREE.CircleGeometry(.12, 20), ledMat);
  led.position.set(7, 15.2, ZF + .03);
  g.add(led);

  g.userData.tick = (t, power) => { ledMat.color.copy(dark).lerp(lit, power); };
  return g;
}
