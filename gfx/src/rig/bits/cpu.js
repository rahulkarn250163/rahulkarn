import {THREE, mats, rbox, merge, mesh, plate, canvasTex, std} from '../../core.js';

export function make() {
  const g = new THREE.Group();
  g.add(mesh(rbox(-39, 27, -15, -38.7, 35, -7, .05), mats.plastic(0x0d0e10)));

  const nickel = mats.chrome().clone();
  nickel.roughness = .22;
  g.add(mesh(rbox(-39.3, 27.8, -14.2, -39, 34.2, -7.8, .12), nickel));

  const tex = canvasTex(512, 512, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.fillStyle = 'rgba(24,25,28,.82)';
    c.textBaseline = 'middle';
    c.font = '600 58px Arial, sans-serif';
    c.fillText('RK-9', 56, 190);
    c.font = '400 34px Arial, sans-serif';
    c.fillText('14 CORE', 56, 262);
    c.font = '400 25px Consolas, monospace';
    c.fillText('LOT X4C7-2291', 56, 322);
  });
  const etch = std({map: tex, transparent: true, roughness: .5, metalness: .2, depthWrite: false});
  g.add(mesh(plate('-x', -39.31, 28.2, -13.8, 33.8, -8.2), etch, {cast: false}));

  // Pin-one triangle in the substrate corner, z at -14.8..-14.2 and y at 27.2..27.8
  const tri = new THREE.BufferGeometry();
  tri.setAttribute('position', new THREE.Float32BufferAttribute([-39.01, 27.2, -14.8, -39.01, 27.2, -14.2, -39.01, 27.8, -14.8], 3));
  tri.computeVertexNormals();
  g.add(mesh(tri, mats.gold(), {cast: false}));
  return g;
}
