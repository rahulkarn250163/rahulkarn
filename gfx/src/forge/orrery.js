/* Open Source: grahan is a sky engine, so here the sky is a machine. A brass orrery, assembled
   gear, column and arm by arm, with the Moon's arm round the Earth. */
import {THREE, std, mats, box, merge, M, cyl, tor, ball, lathe, blob, builder, glowing, glide} from './kit.js';

const ARMS = [
  {R: .44, r: .036, c: 0x9c8f83, rate: 1.42, y: .1},
  {R: .66, r: .056, c: 0xd9b782, rate: .96, y: .074},
  {R: .92, r: .06, c: 0x2f6ba8, rate: .66, y: .048, moon: true},
  {R: 1.16, r: .046, c: 0xb4553a, rate: .47, y: .022},
  {R: 1.52, r: .095, c: 0xc9a36a, rate: .21, y: -.004, ring: true},
];

export function make() {
  const b = builder(61), brass = mats.gold(), dark = mats.blackAnodised(), wood = std({color: 0x3a2417, roughness: .46, metalness: 0});
  b.root.add(blob(1.6, 1.2, -.42, .2));

  const foot = new THREE.Group();
  foot.position.y = -.4;
  foot.add(M(lathe([[0, 0], [.46, 0], [.46, .03], [.38, .05], [.34, .09], [.1, .1], [0, .1]]), wood));
  foot.add(M(tor(.46, .012).rotateX(Math.PI / 2).translate(0, .012, 0), brass));
  b.part(foot, {at: 0, dur: .5, from: [0, -1, 0], tumble: .1, heavy: true});

  /* the great gear, which keeps turning under everything */
  const gear = new THREE.Group(), gearSpot = new THREE.Group(), teeth = [];
  gearSpot.position.y = -.285;
  for (let i = 0; i < 44; i++) { const t = box(.33, -.012, -.014, .362, .012, .014); t.rotateY(i / 44 * Math.PI * 2); teeth.push(t); }
  gear.add(M(merge(teeth), brass), M(cyl(.335, .335, .022, 64), brass), M(cyl(.1, .1, .03, 32), dark));
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, h = M(cyl(.05, .05, .026, 18), dark); h.position.set(Math.cos(a) * .2, 0, Math.sin(a) * .2); gear.add(h); }
  gearSpot.add(gear);
  b.part(gearSpot, {at: .16, dur: .5, from: [-1, .2, .6], tumble: .6, heavy: true});

  b.part(M(lathe([[0, -.28], [.034, -.28], [.03, -.1], [.022, .02], [.02, .16], [0, .16]], 24), brass), {at: .34, dur: .4, from: [0, 1, 0], tumble: .1});

  /* the tracks the arms ride over */
  b.part(M(merge(ARMS.map(a => tor(a.R, .0035, 110).rotateX(Math.PI / 2).translate(0, -.02, 0))), brass), {at: .48, dur: .5, from: [0, -1, 0], tumble: .05});

  /* the arms */
  const moving = ARMS.map((A, i) => {
    const spot = new THREE.Group(), arm = new THREE.Group();
    spot.position.y = A.y - .02;
    spot.add(arm);
    const post = M(cyl(.005, .005, .1, 8), brass), body = M(ball(A.r), std({color: A.c, roughness: .46, metalness: .18}));
    post.position.set(A.R, .05, 0);
    body.position.set(A.R, .1 + A.r * .6, 0);
    arm.add(M(box(0, -.005, -.007, A.R, .005, .007), brass), M(cyl(.024, .024, .014, 18), brass), post, body);
    let moon = null;
    if (A.ring) {
      const ring = M(new THREE.RingGeometry(A.r * 1.35, A.r * 2.1, 64).rotateX(Math.PI / 2 - .4), std({color: 0xd7c090, roughness: .55, metalness: .4, side: THREE.DoubleSide}));
      ring.position.copy(body.position);
      arm.add(ring);
    }
    if (A.moon) {
      moon = new THREE.Group();
      moon.position.copy(body.position);
      const mb = M(ball(.021, 18), std({color: 0xbfbdb6, roughness: .8, metalness: 0}));
      mb.position.set(.15, 0, 0);
      moon.add(M(box(0, -.002, -.002, .15, .002, .002), brass), mb);
      arm.add(moon);
    }
    b.part(spot, {at: .62 + i * .15, dur: .52, from: [i % 2 ? 1 : -1, .5, i % 2 ? -.6 : .6], tumble: .9});
    return {arm, moon, rate: A.rate, phase: i * 1.7};
  });

  /* the Sun last, set on top like the lamp it is */
  const sun = new THREE.Group();
  sun.position.y = .28;
  sun.add(M(ball(.15, 40), glowing(0xff8a1e, 1.05)), M(tor(.158, .005).rotateX(Math.PI / 2), brass));
  b.part(sun, {at: 1.5, dur: .5, from: [0, 1, 0], tumble: .2, heavy: true});

  /* a fast wind-up as it closes, then the steady turn */
  const wound = t => t * .5 + Math.pow(glide((t - 1.4) / 1.4), 2) * 5;
  return {
    root: b.root, pieces: b.pieces, ex: 1.72, ey: .74, pitch: .46, yaw: .3, reach: 2.2, turn: .55,
    tick(t) {
      const a = wound(t);
      gear.rotation.y = a * .8;
      moving.forEach(m => {
        m.arm.rotation.y = -a * m.rate - m.phase;
        if (m.moon) m.moon.rotation.y = -a * 4.6;
      });
    },
  };
}
