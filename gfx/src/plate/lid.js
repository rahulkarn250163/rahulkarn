// The nickel heat spreader that closes the processor plate.
import {THREE, rbox, mesh, std, phys} from '../core.js';

export function makeLid() {
  const group = new THREE.Group();

  /* transparent is set once here, before the shaders compile: changing it later would recompile mid-scroll */
  const metal = phys({color: 0xc4c6ca, metalness: 1, roughness: .26, clearcoat: .5, clearcoatRoughness: .2, iridescence: .001, transparent: true});
  const body = mesh(rbox(-2, -2, 5, 102, 102, 8.5, 1.2), metal);

  group.add(body);

  const setLid = k => {
    const o = Math.min(1, Math.max(0, k));
    metal.opacity = o;
    group.visible = o > 0;
    group.position.z = 4 * (1 - o);
  };
  return {group, setLid};
}
