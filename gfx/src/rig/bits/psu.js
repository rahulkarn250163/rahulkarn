import {THREE, mats, rbox, box, merge, mesh, plate, canvasTex, std} from '../../core.js';

const X0 = -56, X1 = -37.6, Y0 = .8, Y1 = 7, Z0 = -23.2, Z1 = -3;

export function make() {
  const g = new THREE.Group();
  g.add(mesh(rbox(X0, Y0, Z0, X1, Y1, Z1, .25), mats.powder(0x1f2023)));

  // Top vent: 12 slots, plus a seam across the lid
  const slotMat = std({color: 0x050506, roughness: .9, metalness: 0});
  const slots = [];
  for (let i = 0; i < 12; i++) {
    const z = -20.6 + i * 1.05;
    slots.push(plate('+y', Y1 + .006, -53.5, z, -40.1, z + .5));
  }
  slots.push(plate('+y', Y1 + .006, X0 + .3, -21.6, X1 - .3, -21.54));
  g.add(mesh(merge(slots), slotMat, {cast: false}));

  // Label on the -x face, text reads along z
  const tex = canvasTex(256, 96, (c, w, h) => {
    c.fillStyle = '#b9b4a7'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#16171a'; c.fillRect(8, 8, w - 16, 3);
    c.font = '700 34px Arial, sans-serif'; c.textBaseline = 'middle';
    c.fillText('12V', 12, 40); c.fillText('850W', 110, 40);
    c.font = '600 20px Arial, sans-serif'; c.fillText('RK-9', 12, 76);
  });
  const label = mesh(plate('-x', X0 - .006, 4.2, -21.9, 6.4, -15.9),
    std({map: tex, roughness: .7, metalness: 0}), {cast: false});
  g.add(label);

  // Four modular sockets with brass pin rows, and corner screws
  const shells = [], pins = [], screws = [];
  for (let i = 0; i < 4; i++) {
    const a = -14.4 + i * 2.7, b = a + 2.2;
    shells.push(rbox(X0 - .12, 2, a, X0 + .05, 3.5, b, .05, 2));
    for (let p = 0; p < 5; p++) {
      const z = a + .25 + p * .37;
      pins.push(box(X0 - .15, 2.6, z, X0 - .12, 2.9, z + .2));
    }
  }
  for (const [y, z] of [[1.4, Z0 + .8], [6.4, Z0 + .8], [1.4, Z1 - .8], [6.4, Z1 - .8]])
    screws.push(rbox(X0 - .1, y - .22, z - .22, X0 + .02, y + .22, z + .22, .05, 2));
  g.add(mesh(merge(shells), std({color: 0x08090a, roughness: .55, metalness: .1})));
  g.add(mesh(merge(pins), mats.gold(), {cast: false}));
  g.add(mesh(merge(screws), mats.steel()));
  return g;
}
