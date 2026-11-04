import {THREE, rbox, mesh, phys, std} from '../../core.js';

export const SCREEN = {x0: -18.8, x1: 32.8, y0: 16.4, y1: 44.8, z: -4.19};

export function make() {
  const group = new THREE.Group();

  const glass = mesh(
    rbox(-18.8, 16.4, -4.7, 32.8, 44.8, -4.2, .02),
    std({color: 0x040506, metalness: 0, roughness: .06, envMapIntensity: 1.6})
  );
  group.add(glass);

  const w = SCREEN.x1 - SCREEN.x0, h = SCREEN.y1 - SCREEN.y0;
  const lightMat = new THREE.MeshBasicMaterial({toneMapped: false, color: 0xffffff});
  const light = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lightMat);
  light.position.set((SCREEN.x0 + SCREEN.x1) / 2, (SCREEN.y0 + SCREEN.y1) / 2, SCREEN.z + .03);
  light.visible = false;
  group.add(light);

  group.userData.setLit = (k, r, g, b) => {
    if (k <= 0) { light.visible = false; return; }
    light.visible = true;
    const v = Math.min(1, Math.max(0, (k - .42) / .58));
    light.scale.x = Math.min(1, k / .42);
    light.scale.y = Math.max(.012, v * v);
    lightMat.color.setRGB(r, g, b, THREE.LinearSRGBColorSpace);
  };

  return group;
}
