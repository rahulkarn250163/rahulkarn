import {THREE} from '../../core.js';

// Lights for a dark machine on a dark desk. Each light is paid for by every pixel, so there are only three.
export function addLights(scene, {shadow = 1024} = {}) {
  /* a spot, not a sun: light pools round the machine and falls away into the dark */
  const key = new THREE.SpotLight(0xfff1e0, 120000, 0, .34, .85, 2);
  key.position.set(-90, 210, 150);
  key.castShadow = true;
  key.shadow.mapSize.set(shadow, shadow);
  key.shadow.camera.near = 60;
  key.shadow.camera.far = 520;
  key.shadow.radius = 5;
  key.shadow.bias = -.0004;
  key.shadow.normalBias = .04;
  key.target.position.set(-10, 18, 0);
  scene.add(key, key.target);

  const rim = new THREE.DirectionalLight(0xcfdcf5, 1.5);
  rim.position.set(70, 70, -150);
  scene.add(rim);

  // A warm LED strip inside the case, so the parts show through the glass.
  const led = new THREE.PointLight(0xfff0dd, 0, 38, 2); // stops short of the desk: it must not leak through the floor
  led.position.set(-47, 41, -4);
  scene.add(led);

  return {key, rim, led};
}
