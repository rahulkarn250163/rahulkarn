// The motherboard slab: a plain dark body with the board maps on its -x face.
import {THREE, rbox, plate, merge, mesh, std} from '../../core.js';
import {pcbMaps} from './pcbtex.js';

export function make() {
  const group = new THREE.Group();
  group.add(mesh(rbox(-38.1, 6.5, -22, -37.6, 43, 6.5, .05), std({color: 0x0c0c0d, roughness: 1, metalness: .1})));
  const face = mesh(merge([plate('-x', -38.11, 6.5, -22, 43, 6.5)]), std({...pcbMaps(), roughness: 1, metalness: .1}), {cast: false});
  group.add(face);
  return group;
}
