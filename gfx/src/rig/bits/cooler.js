import {THREE, mats, rbox, box, merge, mesh, canvasTex, std} from '../../core.js';
import {makeFan, spin} from './fan.js';

export function make() {
  const group = new THREE.Group();

  // Fin stack: one box, 34 instances
  const FINS = 34, Y0 = 25.2, PITCH = 0.35;
  const fins = new THREE.InstancedMesh(box(-43, 0, -17, -39.6, 0.1, -5), mats.aluminium(), FINS);
  const m = new THREE.Matrix4();
  for (let i = 0; i < FINS; i++) fins.setMatrixAt(i, m.makeTranslation(0, Y0 + i * PITCH, 0));
  fins.instanceMatrix.needsUpdate = true;
  fins.castShadow = fins.receiveShadow = true;
  group.add(fins);

  // Nickel base block
  const nickel = std({color: 0xcfd0d2, metalness: 1, roughness: 0.25});
  group.add(mesh(rbox(-39.6, 28, -14, -39.3, 34, -8, 0.06, 2), nickel));

  // Heat pipes: out of the base, through the fins, stubs above the cap
  const pipes = [-12.5, -10.5, -11.5, -9.5].map((z, i) => {
    const y = 29 + i * 1.3, zEnd = -15 + i * 2.67 + (i > 1 ? 0.6 : 0);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-39.45, y, z),
      new THREE.Vector3(-40.3, y + 0.2, z),
      new THREE.Vector3(-41, y + 1.4, (z + zEnd) / 2),
      new THREE.Vector3(-41.3, 34.5, zEnd),
      new THREE.Vector3(-41.3, 37.5, zEnd),
    ]);
    return new THREE.TubeGeometry(curve, 28, 0.3, 10, false);
  });
  group.add(mesh(merge(pipes), mats.copper()));

  // Top cap, with holes faked by the stubs passing through it
  group.add(mesh(rbox(-43, 37, -17, -39.6, 37.4, -5, 0.08, 2), mats.aluminium()));

  // Thin dark inset line around the cap's top face
  group.add(mesh(merge([
    box(-42.8, 37.39, -16.8, -39.8, 37.405, -16.74),
    box(-42.8, 37.39, -5.26, -39.8, 37.405, -5.2),
    box(-42.8, 37.39, -16.74, -42.74, 37.405, -5.26),
    box(-39.86, 37.39, -16.74, -39.8, 37.405, -5.26),
  ]), mats.blackAnodised()));

  // Etched mark on the cap: a thin ring and a tick, x spans 3.4, z spans 12
  const markTex = canvasTex(256, 256, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.strokeStyle = '#8d8d8d';
    c.lineWidth = 14;
    c.beginPath();
    c.arc(w / 2, h / 2, w * 0.34, 0, Math.PI * 2);
    c.stroke();
    c.beginPath();
    c.moveTo(w / 2, h * 0.28);
    c.lineTo(w / 2, h * 0.72);
    c.stroke();
  });
  const mark = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 1.5).rotateX(-Math.PI / 2),
    std({map: markTex, transparent: true, metalness: 0.6, roughness: 0.5, depthWrite: false})
  );
  mark.position.set(-41.3, 37.41, -7);
  group.add(mark);

  const fan = makeFan(-45, 31, -11, 5.4);
  group.add(fan.group);

  group.userData.tick = (t, power) => spin(fan, t, power);
  return group;
}
