import {THREE, rbox, merge, mesh, canvasTex, normalFromHeight, std, mats} from '../../core.js';

const V = (x, z) => new THREE.Vector3(x, .25, z);
const ROUTES = [
  [V(-15, 12), V(-24, 4), V(-30, 10), V(-37, 3)],
  [V(32, 11), V(32, 6), V(28, 6), V(25, 10)],
  [V(2, -13), V(-10, -22), V(-25, -6), V(-37, -12)],
];

// Boot aligned to the cable's end tangent, tapering into a small metal collar.
function boot(p, dir, mat, metal) {
  const m = new THREE.Matrix4().makeRotationY(Math.atan2(-dir.z, dir.x)).setPosition(p);
  return [
    rbox(-.45, -.3, -.34, .45, .3, .34, .08).applyMatrix4(m),
    rbox(.45, -.2, -.26, .85, .2, .26, .04).applyMatrix4(m),
  ].map((g, i) => (i ? metal : mat).push(g));
}

export function make() {
  const group = new THREE.Group();
  const height = canvasTex(64, 64, (c, w, h) => {
    c.fillStyle = '#808080'; c.fillRect(0, 0, w, h);
    c.lineWidth = 5;
    for (let i = -h; i < w + h; i += 16) {
      c.strokeStyle = '#d8d8d8'; c.beginPath(); c.moveTo(i, 0); c.lineTo(i + h, h); c.stroke();
      c.strokeStyle = '#303030'; c.beginPath(); c.moveTo(i + 8, h); c.lineTo(i + 8 + h, 0); c.stroke();
    }
  }).image;
  const mat = std({color: 0x18181a, roughness: .8, normalMap: normalFromHeight(height, 1.2, {repeat: [60, 2]})});
  const tubes = ROUTES.map(pts => {
    const m = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 90, .22, 8, false), mat);
    group.add(m);
    return m;
  });
  const rubber = [], metal = [];
  for (const pts of ROUTES) {
    const curve = new THREE.CatmullRomCurve3(pts);
    boot(curve.getPoint(0), curve.getTangent(0).negate(), rubber, metal);
    boot(curve.getPoint(1), curve.getTangent(1), rubber, metal);
  }
  const boots = new THREE.Group();
  boots.add(mesh(merge(rubber), mats.rubber(0x131315)), mesh(merge(metal), mats.steel()));
  group.add(boots);

  group.userData.setDraw = k => {
    for (const t of tubes) t.geometry.setDrawRange(0, Math.floor(t.geometry.index.count * k / 3) * 3);
    boots.visible = k > .98;
  };
  return group;
}
