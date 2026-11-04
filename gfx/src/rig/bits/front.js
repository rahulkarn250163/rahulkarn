// Case front panel: aluminium frame, louvre slats over a dark backing, power button with lit ring, two USB ports.
import {std, THREE, mats, rbox, box, merge, mesh, plate, canvasTex, brushedCanvas} from '../../core.js';

export function make() {
  const g = new THREE.Group();
  const zf = 16;

  // Frame: solid behind the backing plate, with a rim around the louvre bay that the slats sit inside.
  g.add(mesh(merge([
    rbox(-56, 0, 14, -37, 46, 15.55, .5),
    rbox(-56, 0, 15, -54.6, 46, zf, .5),
    rbox(-38.4, 0, 15, -37, 46, zf, .5),
    rbox(-56, 0, 15, -37, 4.6, zf, .5),
    rbox(-56, 37.6, 15, -37, 46, zf, .5),
  ]), mats.spaceGrey()));

  // Recessed backing, so the gaps between slats read dark.
  g.add(mesh(plate('+z', 15.6, -54.6, 4.6, -38.4, 37.6), mats.plastic(0x050505), {cast: false}));

  // 30 slats, y 5 to about 37
  const slats = [];
  for (let i = 0; i < 30; i++) {
    const y = 5 + i * 1.07;
    slats.push(rbox(-54.4, y, 15.7, -38.6, y + .62, 16.05, .12, 2));
  }
  g.add(mesh(merge(slats), mats.spaceGrey()));

  // Thin dark seam where the frame meets the top strip
  g.add(mesh(plate('+z', zf + .012, -55.6, 37.94, -37.4, 38.06), mats.plastic(0x050505), {cast: false, receive: false}));

  // Power button: brushed disc on a short cylinder, lit ring around it
  const bx = -46.5, by = 42;
  const ring = new THREE.MeshBasicMaterial({color: 0x2a0806});
  g.add(mesh(new THREE.RingGeometry(1.32, 1.56, 48).translate(bx, by, zf + .02), ring, {cast: false, receive: false}));
  g.add(mesh(new THREE.CylinderGeometry(1.25, 1.25, .2, 48).rotateX(Math.PI / 2).translate(bx, by, zf + .1), mats.aluminium()));
  const cap = canvasTex(256, 256, (c, w, h) => c.drawImage(brushedCanvas(256, 7, 176, 26), 0, 0, w, h));
  g.add(mesh(new THREE.CircleGeometry(1.25, 48).translate(bx, by, zf + .201), std({map: cap, metalness: .95, roughness: .34}), {cast: false}));

  // USB ports: metal lip with a dark mouth and tongue
  const lips = [], mouths = [], tongues = [];
  for (const x of [-52.5, -50]) {
    const a = x - .75, b = x + .75, y0 = by - .3, y1 = by + .3, l = .1;
    lips.push(box(a, y0, zf, b, y0 + l, zf + .05), box(a, y1 - l, zf, b, y1, zf + .05),
      box(a, y0 + l, zf, a + l, y1 - l, zf + .05), box(b - l, y0 + l, zf, b, y1 - l, zf + .05));
    mouths.push(plate('+z', zf + .01, a + l, y0 + l, b - l, y1 - l));
    tongues.push(box(a + .22, by - .02, zf, b - .22, by + .1, zf + .03));
  }
  g.add(mesh(merge(lips), mats.steel()));
  g.add(mesh(merge(mouths), mats.plastic(0x050506), {cast: false}));
  g.add(mesh(merge(tongues), mats.plastic(0x232427), {cast: false}));

  const dim = new THREE.Color(0x2a0806), lit = new THREE.Color(0xe0644f).multiplyScalar(2);
  g.userData.tick = (t, power) => { ring.color.copy(dim).lerp(lit, power); };
  return g;
}
