/* Expertise: "Every skill here." A multi-tool: red scales, steel liners, and a tool for every job
   fanning out of the handle once it has closed up. */
import {THREE, std, mats, M, cyl, tor, sheet, swing, builder} from './kit.js';

const S = fn => { const s = new THREE.Shape(); fn(s); return s; };
const PIVOT = .34, LEFT = -1.02, HALF = .17;

function handleShape(inset = 0) {
  const r = HALF - inset, l = LEFT + inset, x = PIVOT + .12 - inset;
  return S(s => {
    s.moveTo(l + r, -r); s.lineTo(x - r, -r);
    s.absarc(x - r, 0, r, -Math.PI / 2, Math.PI / 2, false);
    s.lineTo(l + r, r);
    s.absarc(l + r, 0, r, Math.PI / 2, Math.PI * 1.5, false);
  });
}

/* every tool's outline starts at its pivot, at the origin, and runs along +x */
const TOOLS = [
  {open: .2, z: .036, shape: S(s => { /* the main blade */
    s.moveTo(0, -.055); s.lineTo(.12, -.078); s.lineTo(.74, -.078); s.quadraticCurveTo(.98, -.06, 1.06, .07); s.lineTo(.12, .07); s.lineTo(0, .055);
  })},
  {open: -.34, z: .018, shape: S(s => { /* the saw */
    s.moveTo(0, -.05); s.lineTo(.08, -.058);
    for (let i = 0; i < 17; i++) { const x = .08 + i * .043; s.lineTo(x + .03, -.088); s.lineTo(x + .043, -.058); }
    s.lineTo(.84, 0); s.lineTo(.84, .05); s.lineTo(0, .05);
  })},
  {open: .66, z: 0, shape: S(s => { /* the small blade */
    s.moveTo(0, -.04); s.lineTo(.09, -.056); s.lineTo(.46, -.056); s.quadraticCurveTo(.64, -.04, .7, .05); s.lineTo(.09, .05); s.lineTo(0, .04);
  })},
  {open: -.82, z: -.018, shape: S(s => { /* the bottle opener and screwdriver */
    s.moveTo(0, -.045); s.lineTo(.44, -.045); s.lineTo(.5, -.075); s.lineTo(.6, -.075); s.lineTo(.6, -.02); s.lineTo(.53, -.012); s.lineTo(.53, .02); s.lineTo(.6, .03); s.lineTo(.62, .066); s.lineTo(.44, .066); s.lineTo(.38, .045); s.lineTo(0, .045);
  })},
  {open: 1.12, z: -.036, shape: S(s => { /* the can opener */
    s.moveTo(0, -.04); s.lineTo(.36, -.04); s.lineTo(.44, -.09); s.lineTo(.52, -.09); s.lineTo(.5, -.03); s.lineTo(.56, 0); s.lineTo(.5, .05); s.lineTo(0, .045);
  })},
  {open: -1.26, z: .054, shape: S(s => { /* the file */
    s.moveTo(0, -.04); s.lineTo(.62, -.03); s.quadraticCurveTo(.72, 0, .62, .03); s.lineTo(0, .04);
  })},
  {open: 1.58, z: -.054, shape: S(s => { /* the reamer */
    s.moveTo(0, -.04); s.lineTo(.2, -.04); s.lineTo(.66, 0); s.lineTo(.2, .04); s.lineTo(0, .04);
  })},
];

export function make() {
  const b = builder(23), steel = std({color: 0xf4f5f7, metalness: 1, roughness: .13, envMapIntensity: 1.5}), liner = mats.aluminium(), red = mats.lacquer(0xa8201f);
  const box = new THREE.Group();
  box.position.x = -.08;
  b.root.add(box);

  /* back scale, liners, then the closed tools, then the front scale over them */
  const back = M(sheet(handleShape(), .05, .012), red);
  back.position.z = -.1;
  b.part(back, {at: 0, dur: .5, from: [-.3, 0, -1], tumble: .5, heavy: true, parent: box});
  [-.068, .068].forEach((z, i) => {
    const l = M(sheet(handleShape(.008), .012, .002), liner);
    l.position.z = z;
    b.part(l, {at: .14 + i * .1, dur: .45, from: [-1, .3, 0], tumble: .4, parent: box});
  });

  const arms = TOOLS.map((t, i) => {
    const arm = new THREE.Group(), home = new THREE.Group();
    arm.add(M(sheet(t.shape, .012, .003), steel));
    home.position.set(PIVOT, 0, t.z);
    home.add(arm);
    b.part(home, {at: .34 + i * .07, dur: .45, from: [1, (i % 2 ? 1 : -1) * .6, .15], tumble: .7, parent: box});
    return {arm, open: t.open, delay: i};
  });

  /* the corkscrew lives at the far end */
  const pts = [];
  for (let i = 0; i <= 90; i++) { const u = i / 90, a = u * Math.PI * 9; pts.push(new THREE.Vector3(.06 + u * .36, Math.cos(a) * .028 * (1 - u * .55), Math.sin(a) * .028 * (1 - u * .55))); }
  const cork = new THREE.Group(), corkArm = new THREE.Group();
  corkArm.add(M(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, .0065, 6), steel));
  corkArm.add(M(new THREE.CylinderGeometry(.012, .012, .08, 10).rotateZ(Math.PI / 2).translate(.03, 0, 0), steel));
  cork.position.set(LEFT + .15, 0, .072);
  cork.add(corkArm);
  b.part(cork, {at: .82, dur: .45, from: [-1, -.4, .2], tumble: .7, parent: box});

  const front = M(sheet(handleShape(), .05, .012), red);
  front.position.z = .1;
  b.part(front, {at: .96, dur: .45, from: [.1, 0, 1], tumble: .4, heavy: true, parent: box});

  /* the pins, and a small steel badge */
  const brass = mats.gold();
  [PIVOT, LEFT + .15].forEach((x, i) => {
    const pin = M(cyl(.024, .024, .296, 18).rotateX(Math.PI / 2), brass);
    pin.position.set(x, 0, 0);
    b.part(pin, {at: 1.12 + i * .06, dur: .3, from: [0, 0, 1], tumble: 0, parent: box});
  });
  const badge = new THREE.Group();
  badge.position.set(-.34, 0, .142);
  badge.add(M(cyl(.066, .066, .012, 28).rotateX(Math.PI / 2), steel), M(tor(.066, .007, 36), brass));
  b.part(badge, {at: 1.2, dur: .35, from: [0, 0, 1], tumble: 0, parent: box});

  return {
    root: b.root, pieces: b.pieces, ex: 1.3, ey: .98, pitch: .26, yaw: -.3, reach: 2.2,
    tick(t) {
      arms.forEach(a => {
        const k = swing((t - 1.32 - a.delay * .1) / .62);
        a.arm.rotation.z = Math.PI + (a.open - Math.PI) * k + Math.sin(t * .8 + a.delay) * .008 * k;
      });
      const k = swing((t - 2.02) / .6);
      corkArm.rotation.z = Math.PI * (1 - k) + 2.05 * k;
    },
  };
}
