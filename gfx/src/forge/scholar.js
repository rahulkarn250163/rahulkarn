/* Education: the three degrees as three books, the diploma rolled in front of them, and the cap
   set down on top with its tassel still swinging. */
import {THREE, std, mats, rbox, box, merge, M, cyl, tor, blob, builder, clamp} from './kit.js';

const BOOKS = [
  {c: 0x16233b, w: 1.04, d: .76, h: .2, turn: .06},
  {c: 0xc22a14, w: .96, d: .7, h: .17, turn: -.1},
  {c: 0x1f4a3b, w: .88, d: .64, h: .19, turn: .14},
];

export function make() {
  const b = builder(31), paper = std({color: 0xefe9da, roughness: .85, metalness: 0}), foil = mats.gold(), Y0 = -.84;
  b.root.add(blob(1.12, .9, Y0 - .006, .24));

  let y = Y0;
  BOOKS.forEach((B, i) => {
    const g = new THREE.Group(), W = B.w / 2, D = B.d / 2, H = B.h / 2, t = .016, cover = std({color: B.c, roughness: .46, metalness: 0});
    g.position.y = y + H;
    g.rotation.y = B.turn;
    g.add(M(merge([rbox(-W, -H, -D, W, -H + t, D, .006), rbox(-W, H - t, -D, W, H, D, .006), rbox(-W, -H, D - .036, W, H, D, .012)]), cover));
    g.add(M(box(-W + .022, -H + t, -D + .02, W - .022, H - t, D - .034), paper));
    /* the gilt on the spine */
    g.add(M(merge([-.34, -.26, .26, .34].map(u => box(u * B.w * 1.1 - .006, -H + .012, D - .002, u * B.w * 1.1 + .006, H - .012, D + .001)).concat([box(-.1, -.018, D - .002, .1, .018, D + .001)])), foil));
    b.part(g, {at: i * .24, dur: .55, from: [i % 2 ? 1 : -1, .85, .2], tumble: .7, heavy: true});
    y += B.h;
  });

  /* the diploma rolls in along the table */
  const roll = new THREE.Group(), rollIn = new THREE.Group();
  roll.position.set(.04, Y0 + .078, .62);
  roll.rotation.y = -.12;
  rollIn.add(M(cyl(.075, .075, .92, 32).rotateZ(Math.PI / 2), paper));
  rollIn.add(M(cyl(.048, .048, .925, 24, true).rotateZ(Math.PI / 2), std({color: 0xd7cfba, roughness: .9, metalness: 0, side: THREE.BackSide})));
  rollIn.add(M(cyl(.079, .079, .07, 32).rotateZ(Math.PI / 2), mats.lacquer(0xc22a14)));
  roll.add(rollIn);
  b.part(roll, {at: .7, dur: .6, from: [1, 0, .15], tumble: 0});

  /* the cap: skull, board, button, and the tassel hanging off one corner */
  const cap = new THREE.Group(), ink = mats.plastic(0x111214);
  cap.position.set(-.02, y + .1, -.02);
  cap.rotation.set(-.05, .3, .1);
  cap.add(M(cyl(.27, .25, .17, 40), ink));
  const board = M(rbox(-.5, 0, -.5, .5, .024, .5, .006), ink);
  board.position.y = .085;
  board.rotation.y = Math.PI / 4;
  cap.add(board);
  const button = M(cyl(.024, .03, .018, 18), foil);
  button.position.y = .118;
  cap.add(button);
  const cord = M(box(0, -.003, -.003, .68, .003, .003), foil);
  cord.position.y = .116;
  cap.add(cord);
  const hang = new THREE.Group();
  hang.position.set(.68, .112, 0);
  const string = M(cyl(.004, .004, .22, 8), foil), tuft = M(cyl(.012, .036, .11, 14), foil), bead = M(tor(.012, .005, 14).rotateX(Math.PI / 2), foil);
  string.position.y = -.11;
  tuft.position.y = -.27;
  bead.position.y = -.21;
  hang.add(string, tuft, bead);
  cap.add(hang);
  b.part(cap, {at: 1.26, dur: .62, from: [.2, 1, .1], tumble: 1, heavy: true});

  return {
    root: b.root, pieces: b.pieces, ex: 1.14, ey: 1.02, pitch: .3, yaw: -.42, reach: 2.4, turn: .7,
    tick(t) {
      /* the tassel swings hard as the cap lands, then settles to a slow sway */
      const k = clamp((t - 1.76) / .01), since = Math.max(0, t - 1.76);
      hang.rotation.z = k * (Math.sin(since * 6.4) * .55 * Math.exp(-since * .9) + Math.sin(t * 1.3) * .035);
      rollIn.rotation.x = -(1 - clamp((t - .7) / .6)) * 6;
    },
  };
}
