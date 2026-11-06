// Motherboard components on a board facing -x (surface at x=-38.1).
import {THREE, mats, rbox, box, merge, mesh, canvasTex, normalFromHeight, brushedCanvas, std} from '../../core.js';

const S = -38.1;

export function make() {
  const group = new THREE.Group();
  const steel = [], dark = [], sink = [], chip = [], alu = [], capTop = [], latch = [], screws = [];

  // CPU socket: steel ring around a dark centre, with a retention lever
  const [y0, y1, z0, z1] = [25.5, 36.5, -16.5, -5.5], w = 1.1;
  steel.push(
    rbox(-38.7, y1 - w, z0, S, y1, z1, .08), rbox(-38.7, y0, z0, S, y0 + w, z1, .08),
    rbox(-38.7, y0 + w, z0, S, y1 - w, z0 + w, .08), rbox(-38.7, y0 + w, z1 - w, S, y1 - w, z1, .08),
    rbox(-38.95, y0 + .1, z1 + .15, -38.75, y1 - .1, z1 + .4, .08),
    rbox(-39.25, y1 - 1, z1 + .1, -38.9, y1 - .1, z1 + .45, .1),
    rbox(-38.75, y0 + .6, z1 + .1, S, y0 + 1.5, z1 + .45, .08),
  );
  dark.push(box(-38.3, y0 + w, z0 + w, S, y1 - w, z1 - w));

  // VRM heatsinks: solid base plus cut fins
  sink.push(rbox(-38.9, 38.5, -21, S, 41.5, -7, .1), rbox(-38.9, 24, -21, S, 38, -18.6, .1));
  for (let z = -20.9; z < -7.1; z += .62) sink.push(box(-39.8, 38.6, z, -38.85, 41.4, z + .34));
  for (let y = 24.1; y < 37.8; y += .62) sink.push(box(-39.8, y, -20.9, -38.85, y + .34, -18.7));

  // Chokes beside the sinks
  for (let i = 0; i < 6; i++) {
    const cz = -17.8 + i * 1.75;
    chip.push(rbox(-38.95, 37.1, cz, S, 38.3, cz + 1.3, .14));
  }

  // Ten capacitors, axis along x
  const capGeo = new THREE.CylinderGeometry(.3, .3, .8, 16).rotateZ(Math.PI / 2);
  const topGeo = new THREE.CylinderGeometry(.26, .26, .04, 16).rotateZ(Math.PI / 2);
  for (let i = 0; i < 10; i++) {
    const y = i < 5 ? 42.1 : 23.4, z = i < 5 ? -20.4 + i * 1.1 : -20.4 + (i - 5) * 1.1;
    alu.push(capGeo.clone().translate(S - .4, y, z));
    capTop.push(topGeo.clone().translate(S - .82, y, z));
  }

  // DIMM slots with a channel and latches at each end
  for (let i = 0; i < 4; i++) {
    const a = -1.4 + i * 1.6, b = a + 1.2;
    dark.push(rbox(-38.7, 21, a, S, 42, b, .06));
    capTop.push(box(-38.72, 21.4, a + .48, -38.68, 41.6, b - .48));
    latch.push(rbox(-38.95, 20.5, a + .2, S, 21.3, b - .2, .08), rbox(-38.95, 41.7, a + .2, S, 42.5, b - .2, .08));
  }

  // PCIe slot with a retention tab
  dark.push(rbox(-38.8, 15, -21, S, 16.2, 4, .08));
  capTop.push(box(-38.82, 15.5, -20.6, -38.78, 15.7, 3.6));
  latch.push(rbox(-39, 14.85, 3.2, S, 16.35, 4.2, .08));

  // M.2 shield with two screws
  alu.push(rbox(-38.5, 17.5, -18, S, 20, -4, .08));
  const screw = new THREE.CylinderGeometry(.17, .17, .08, 14).rotateZ(Math.PI / 2);
  screws.push(screw.clone().translate(-38.54, 18.75, -17.4), screw.clone().translate(-38.54, 18.75, -4.6));

  // Chipset heatsink in brushed black, with shallow grooves
  const bc = brushedCanvas(256, 7, 40, 26);
  const chipsetMat = std({
    color: 0x17181a, metalness: .85, roughness: .46,
    map: canvasTex(256, 256, (c, w, h) => c.drawImage(bc, 0, 0, w, h)),
    normalMap: normalFromHeight(bc, .6),
  });
  const chipset = [rbox(-39, 8.5, -8, S, 12.5, -1, .12)];
  for (let y = 8.9; y < 12.2; y += .6) chipset.push(box(-39.1, y, -7.7, -38.98, y + .3, -1.3));

  for (const [list, mat] of [[steel, mats.steel()], [dark, mats.plastic(0x141517)], [sink, mats.blackAnodised()],
    [chip, mats.powder(0x232427)], [alu, mats.steel()], [capTop, mats.rubber(0x0e0e10)],
    [latch, mats.plastic(0x232427)], [screws, mats.chrome()], [chipset, chipsetMat]]) {
    group.add(mesh(merge(list), mat));
  }
  return group;
}
