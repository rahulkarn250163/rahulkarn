import {THREE, mats, rbox, mesh, std} from '../core.js';

// The API gateway at the origin. set() holds no state: same inputs, same picture.
export function makeHub() {
  const group = new THREE.Group();

  const base = mesh(
    rbox(-11, 0, -11, 11, 3, 11, .6),
    std({color: 0x4c4f55, metalness: .9, roughness: .32}),
    {cast: true, receive: true},
  );

  const drum = mesh(new THREE.CylinderGeometry(7.5, 7.5, 9, 48), mats.spaceGrey(), {cast: true, receive: true});
  drum.position.y = 7.5;

  const ringGeo = new THREE.TorusGeometry(7.6, .22, 12, 96);
  ringGeo.rotateX(Math.PI / 2);
  const ring = mesh(ringGeo, new THREE.MeshBasicMaterial({color: new THREE.Color(0xff6a45).multiplyScalar(1.5)}));
  ring.position.y = 12;

  // A notch off-centre keeps the rotation visible on an otherwise round disc.
  const disc = new THREE.Group();
  const polished = std({color: 0x34373c, metalness: .3, roughness: .55});
  const plate = mesh(new THREE.CylinderGeometry(7, 7, .4, 48), polished, {cast: true});
  const notch = mesh(new THREE.CylinderGeometry(.5, .5, .1, 16), mats.blackAnodised());
  notch.position.set(5.2, .24, 0);
  disc.add(plate, notch);
  disc.position.y = 12.2;

  group.add(base, drum, ring, disc);
  group.visible = false;
  group.scale.y = .001;

  const top = new THREE.Vector3(0, 12.4, 0);

  function set(k, t) {
    group.visible = k > 0;
    group.scale.y = .001 + (1 - .001) * k;
    disc.rotation.y = t * .4;
  }

  return {group, set, top};
}
