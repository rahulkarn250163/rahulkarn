// 3.5 inch hard drive lying flat on the desk.
import {THREE, mats, rbox, box, merge, mesh, plate, canvasTex, brushedCanvas, std} from '../../core.js';

export function make() {
  const g = new THREE.Group();
  const X0 = -53, X1 = -42, Y1 = 3.6, Z0 = -1, Z1 = 13;

  g.add(mesh(rbox(X0, .8, Z0, X1, Y1, Z1, .15), mats.aluminium()));

  const lidMap = canvasTex(512, 512, (ctx, w, h) => ctx.drawImage(brushedCanvas(512, 7, 205, 18), 0, 0, w, h), {repeat: [1, 1]});
  g.add(mesh(rbox(X0 + .25, Y1 - .02, Z0 + .25, X1 - .25, Y1 + .07, Z1 - .25, .04, 2), std({map: lidMap, metalness: .85, roughness: .42})));

  // Spindle cap: a collar, then the cap and its centre boss
  const cyl = (r0, r1, h, y) => { const c = new THREE.CylinderGeometry(r0, r1, h, 40); c.translate(-47.5, y, 4); return c; };
  const screw = (x, z) => { const c = new THREE.CylinderGeometry(.2, .23, .08, 14); c.translate(x, Y1 + .11, z); return c; };
  const screws = [[X0 + .7, Z0 + .7], [X1 - .7, Z0 + .7], [X0 + .7, Z1 - .7], [X1 - .7, Z1 - .7], [X0 + .7, 6], [X1 - .7, 6]];
  g.add(mesh(merge([cyl(1.1, 1.14, .14, Y1 + .14), cyl(.3, .34, .06, Y1 + .24), ...screws.map(([x, z]) => screw(x, z))]), mats.steel()));

  // Dark torx recesses in the screw heads, plus the rear connector shell
  const recess = screws.map(([x, z]) => { const c = new THREE.CylinderGeometry(.09, .09, .02, 6); c.translate(x, Y1 + .15, z); return c; });
  const shell = [rbox(X0 + .6, 1.05, Z1 - .02, -49, 2.2, Z1 + .16, .05, 2), rbox(-48.6, 1.05, Z1 - .02, -44.4, 2.2, Z1 + .16, .05, 2)];
  g.add(mesh(merge([...recess, ...shell]), mats.powder('#16171a')));

  // Label sits in the lid area toward the reader, clear of the spindle and the side screws
  const label = canvasTex(512, 300, (ctx, w, h) => {
    ctx.fillStyle = '#ece7dc'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#1c1c1e';
    ctx.font = '700 66px Arial'; ctx.fillText('RK 8TB', 28, 80);
    ctx.font = '24px Arial'; ['P/N RK-8T35-7200', 'S/N 52K0917A', '7200 RPM   256 MB   SATA 6 Gb/s', '+5V 0.6A   +12V 0.8A'].forEach((s, i) => ctx.fillText(s, 28, 130 + i * 34));
    ctx.fillRect(28, 268, 300, 3);
    ctx.fillStyle = '#9e1c1c'; ctx.fillRect(w - 76, 28, 48, 48);
  });
  const lg = plate('+y', Y1 + .08, -51.2, 6.6, -43.8, 11.4);
  g.add(mesh(lg, std({map: label, roughness: .6, metalness: 0}), {cast: false}));

  // Brass pins inside the connector shells
  const pins = [];
  for (let x = -51.9; x < -49.2; x += .27) pins.push(box(x, 1.5, Z1 + .1, x + .14, 1.75, Z1 + .19));
  for (let x = -48.35; x < -44.6; x += .27) pins.push(box(x, 1.5, Z1 + .1, x + .14, 1.75, Z1 + .19));
  g.add(mesh(merge(pins), mats.gold(), {cast: false}));

  return g;
}
