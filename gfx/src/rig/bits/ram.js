// Four memory sticks with a shared geometry set and a shared light bar material.
import {THREE, mats, rbox, box, merge, mesh, plate, canvasTex, std} from '../../core.js';

const X0 = -41.6, X1 = -38.7, Y0 = 21.5, Y1 = 41.4, T = 1.1;

export function make() {
  // All geometry is authored at z 0..T, each group then offsets by its own z0.
  const spreader = rbox(X0, Y0, 0, X1, Y1, T, .09, 3);
  const grooves = merge([
    new THREE.BufferGeometry().copy(plate('+z', T + .004, X0 + .5, 27, X0 + .62, 34)).applyMatrix4(new THREE.Matrix4().makeShear(0, 0, .22, 0, 0, 0)),
    new THREE.BufferGeometry().copy(plate('+z', T + .004, X0 + .9, 27, X0 + 1.02, 34)).applyMatrix4(new THREE.Matrix4().makeShear(0, 0, .22, 0, 0, 0)),
  ]);
  const fingers = [];
  for (let k = 0; k < 28; k++) {
    const y = Y0 + .5 + k * .69;
    fingers.push(box(X1, y, .3, X1 + .2, y + .46, T - .3));
  }
  const fingerGeo = merge(fingers);
  const labelGeo = plate('+z', T + .006, X0 + .85, 37.4, X1 - .85, 39.2);
  const barGeo = rbox(X0 + .08, Y1, .15, X1 - .08, Y1 + .6, T - .15, .08, 2);

  const spreaderMat = std({color: 0x54565a, metalness: .85, roughness: .34});
  const dark = std({color: 0x050506, roughness: .85, metalness: .1});
  const labelMat = std({roughness: .7, metalness: 0, map: canvasTex(128, 192, (c, w, h) => {
    c.fillStyle = '#cfcabd'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#17171a'; c.font = 'bold 26px sans-serif'; c.fillText('32 GB', 14, 42);
    c.font = '15px sans-serif'; c.fillText('DDR5 6000', 14, 70);
    for (let x = 14; x < w - 14; x += 5) c.fillRect(x, 96, 1 + (x * 7 % 3), 44);
    c.fillStyle = '#c22a14'; c.fillRect(14, 156, w - 28, 8);
  })});
  const barMat = new THREE.MeshBasicMaterial({color: 0x000000});
  const lit = new THREE.Color(0xff6a45).multiplyScalar(1.4);

  const sticks = [0, 1, 2, 3].map(i => {
    const g = new THREE.Group();
    g.name = `ram${i}`;
    g.position.z = -1.4 + i * 1.6;
    g.add(mesh(spreader, spreaderMat), mesh(grooves, dark, {cast: false}), mesh(fingerGeo, mats.gold()), mesh(labelGeo, labelMat, {cast: false}), mesh(barGeo, barMat, {cast: false}));
    return g;
  });
  sticks[0].userData.tick = (t, power) => barMat.color.copy(lit).multiplyScalar(power);
  return sticks;
}
