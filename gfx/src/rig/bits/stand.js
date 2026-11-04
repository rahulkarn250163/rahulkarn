import {THREE, mats, rbox, box, merge, mesh} from '../../core.js';

function makeFoot() {
  const g = new THREE.Group();
  g.name = 'foot';
  g.add(mesh(rbox(-4, .12, -15, 18, 1, -1, .3), mats.aluminium()));
  g.add(mesh(merge([
    box(-3.4, 0, -14, 17.4, .12, -12.8),
    box(-3.4, 0, -3.2, 17.4, .12, -2),
  ]), mats.rubber(0x0c0c0d), {cast: false}));
  return g;
}

function makeNeck() {
  const g = new THREE.Group();
  g.name = 'neck';
  g.add(mesh(rbox(4, 1, -10, 10, 16, -7.5, .6), mats.aluminium()));
  g.add(mesh(merge([
    rbox(5.8, 5, -7.56, 8.2, 10.5, -7.46, .04), // cable slot, proud of the face by a hair
    rbox(3.6, 14, -10.3, 10.4, 16.5, -7.2, .25), // hinge block
    rbox(5, 15.3, -7.3, 9, 16.1, -6.9, .1), // hinge knuckle
  ]), mats.blackAnodised()));
  return g;
}

export function make() {
  return [makeFoot(), makeNeck()];
}
