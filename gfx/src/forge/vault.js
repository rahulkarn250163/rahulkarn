/* The lead: "systems that move real money". A round vault, put together on its plinth: the drum, the
   machines that stand inside it, the collar, then the door with its pins, dial and wheel. The scroll works
   the lock: the wheel turns, the pins draw back and the door swings open on the racks it was keeping.
   Every flat on the door is cut with a hard edge and a small chamfer, so it reads as machined, not moulded. */
import {THREE, std, mats, rbox, merge, canvasTex, M, cyl, tor, ball, turned as lathed, turnedMetal, glide, clamp, blob, builder, glowing} from './kit.js';

/* the hinge's axis, and how far the door swings on it */
const HX = -1.45, HZ = .45, SWING = 1.02;
const TAU = Math.PI * 2;
/* made about y, stood up about z */
const Z = g => g.rotateX(Math.PI / 2);
/* the vault is turned about z, the way it faces */
const turned = (pts, seg = 96) => Z(lathed(pts, seg));
/* n hex heads round a circle of radius R, standing h proud of z */
const heads = (n, R, z, r, h, a0 = 0) => merge(Array.from({length: n}, (_, i) => {
  const a = a0 + i / n * TAU;
  return Z(cyl(r, r, h, 6)).translate(Math.cos(a) * R, Math.sin(a) * R, z + h / 2);
}));

function dialFace(c, w, h) {
  c.fillStyle = '#0d0e10'; c.fillRect(0, 0, w, h);
  c.translate(w / 2, h / 2);
  for (let i = 0; i < 50; i++) {
    const long = i % 5 === 0;
    c.save();
    c.rotate(i / 50 * TAU);
    c.fillStyle = long ? '#f3f1ec' : '#9a9ca0';
    c.fillRect(-(long ? 2.2 : 1.2), -w * .47, long ? 4.4 : 2.4, w * (long ? .13 : .08));
    c.restore();
  }
  c.fillStyle = '#c22a14';
  c.beginPath(); c.moveTo(0, -w * .3); c.lineTo(-w * .05, -w * .2); c.lineTo(w * .05, -w * .2); c.fill();
}

function rackFace(c, w, h) {
  c.fillStyle = '#101113'; c.fillRect(0, 0, w, h);
  const n = 11, rh = h / n;
  for (let i = 0; i < n; i++) {
    const y = i * rh;
    c.fillStyle = i % 4 === 2 ? '#2a2c30' : '#1c1d20';
    c.fillRect(w * .06, y + rh * .14, w * .88, rh * .72);
    c.fillStyle = '#3b3d42';
    c.fillRect(w * .1, y + rh * .44, w * .34, rh * .12);
    c.fillStyle = '#0a0a0b';
    for (let k = 0; k < 9; k++) c.fillRect(w * (.5 + k * .034), y + rh * .3, w * .016, rh * .4);
  }
}

export function make() {
  const b = builder(61);
  /* turned on a lathe: the grain runs round the door, so the light fans out from its centre */
  const brushed = turnedMetal(0xc4c7cb, .36);
  const steel = mats.steel(), chrome = mats.chrome(), dark = mats.blackAnodised(), grey = mats.spaceGrey(), coat = mats.powder(), gold = mats.gold(), red = mats.lacquer(0xc22a14);
  const inside = std({color: 0x8b8f95, metalness: .85, roughness: .5, side: THREE.BackSide});
  const backWall = std({color: 0x26282c, metalness: .55, roughness: .6});
  const glow = glowing(0xffdcae, 1.5), lamp = glowing(0xff5a36, 2.2);
  const leds = [glowing(0x67e39a, 1.7), glowing(0xffb054, 1.7), glowing(0x67e39a, 1.7)];

  /* the plinth, and the shadow it stands in */
  const plinth = new THREE.Group();
  plinth.add(blob(1.8, 1.3, -1.54, .3));
  plinth.add(M(rbox(-1.2, -1.5, -1.13, 1.2, -1.26, .52, .04), coat));
  plinth.add(M(rbox(-1.27, -1.535, -1.2, 1.27, -1.49, .59, .012), dark));
  plinth.add(M(rbox(-.2, -1.43, .52, .2, -1.33, .528, .004), gold));
  b.part(plinth, {at: 0, dur: .55, from: [0, -1, .1], tumble: .2, heavy: true});

  /* the drum: its shell, two ribs, and the room inside */
  const drum = new THREE.Group();
  drum.add(M(turned([[0, -1.08], [1.2, -1.08], [1.27, -1.01], [1.27, -.3]], 88), coat));
  drum.add(M(merge([-.5, -.8].map(z => turned([[1.27, -.04], [1.305, -.04], [1.305, .04], [1.27, .04]], 88).translate(0, 0, z))), grey));
  drum.add(M(Z(cyl(.985, .985, .98, 72, true)).translate(0, 0, -.49), inside));
  drum.add(M(new THREE.CircleGeometry(.985, 64).translate(0, 0, -.98), backWall));
  drum.add(M(rbox(-.73, -.68, -.98, .73, -.64, -.01, .008), steel));
  b.part(drum, {at: .16, dur: .6, from: [.5, .9, -.3], tumble: .3, heavy: true});

  /* the machines it keeps: three racks, each with its blades and their lights */
  const face = std({map: canvasTex(128, 352, rackFace), metalness: .4, roughness: .5});
  [-.5, 0, .5].forEach((x, i) => {
    const rack = new THREE.Group();
    rack.add(M(rbox(x - .2, -.64, -.93, x + .2, .5, -.62, .012), dark));
    rack.add(M(new THREE.PlaneGeometry(.37, 1.11).translate(x, -.07, -.618), face));
    const dots = [];
    for (let k = 0; k < 11; k++) if ((k + i) % 3 !== 1) dots.push(new THREE.PlaneGeometry(.03, .016).translate(x - .13 + ((k * 7 + i * 3) % 4) * .012, .435 - k * .101, -.616));
    rack.add(M(merge(dots), leds[i]));
    if (i === 1) rack.add(M(rbox(x - .17, .5, -.9, x + .17, .515, -.65, .004), red));
    b.part(rack, {at: .5 + i * .09, dur: .46, from: [0, 1, .25], tumble: .16});
    b.pieces[b.pieces.length - 1].reach = 1.7;
  });

  /* the collar the door closes into, its bolts, the light round the mouth, and the hinge it carries */
  const collar = new THREE.Group();
  collar.add(M(turned([[1.02, -.34], [1.36, -.34], [1.36, .06], [1.31, .12], [1.07, .12], [1.02, .07], [1.02, -.34]]), grey));
  collar.add(M(heads(12, 1.19, .12, .05, .034, TAU / 24), steel));
  collar.add(M(tor(.985, .014, 96).translate(0, 0, -.28), glow));
  collar.add(M(merge([.74, -.74].map(y => rbox(HX - .15, y - .06, -.02, -1.06, y + .06, HZ + .13, .02))), grey));
  collar.add(M(cyl(.042, .042, 1.66, 20).translate(HX, 0, HZ), chrome));
  collar.add(M(merge([.83, -.83].map(y => cyl(.07, .07, .05, 20).translate(HX, y, HZ))), steel));
  b.part(collar, {at: .8, dur: .62, from: [.15, .1, 1], tumble: .22, heavy: true});

  /* everything from here hangs on the hinge and swings with the door */
  const leaf = new THREE.Group();
  leaf.position.set(HX, 0, HZ);
  b.root.add(leaf);
  const C = new THREE.Vector3(-HX, 0, -HZ);
  const hung = (obj, opts) => { obj.position.add(C); return b.part(obj, {parent: leaf, ...opts}); };

  /* the door: a stepped plug behind, a bezel and a raised boss in front */
  const slab = M(turned([[0, -.24], [.9, -.24], [.92, -.22], [.92, -.14], [.96, -.12], [.96, -.04], [1, -.02], [1, .12], [.975, .15], [.94, .18], [.82, .18], [.8, .2], [.635, .2], [.63, .192], [.61, .192], [.605, .2], [.36, .2], [.36, .22], [.34, .24], [0, .24]]), brushed);
  hung(slab, {at: 1.14, dur: .7, from: [.5, .15, 1], tumble: .5, heavy: true});

  hung(M(heads(16, .88, .18, .034, .028), steel), {at: 1.55, dur: .4, from: [0, 0, 1], tumble: .1});

  /* eight pins round the edge: each rides in and out along its own radius */
  const pins = [];
  for (let i = 0; i < 8; i++) {
    const g = new THREE.Group(), a = (i + .5) / 8 * TAU;
    g.rotation.z = a;
    g.position.z = .05;
    const pin = M(cyl(.05, .05, .26, 18).rotateZ(-Math.PI / 2), chrome);
    g.add(pin);
    pins.push(pin);
    hung(g, {at: 1.6 + i * .028, dur: .36, from: [Math.cos(a), Math.sin(a), .2], tumble: 0});
    b.pieces[b.pieces.length - 1].reach = 1.4;
  }

  /* the arms that carry it on the hinge pin, set out from the hinge's own axis */
  const arms = new THREE.Group();
  arms.add(M(merge([.52, -.52].map(y => rbox(-.03, y - .075, -.27, 1.02, y + .075, -.2, .02))), grey));
  arms.add(M(merge([.52, -.52].map(y => cyl(.09, .09, .26, 26).translate(0, y, 0))), grey));
  arms.add(M(merge([.52, -.52].flatMap(y => [.62, .92].map(x => Z(cyl(.028, .028, .02, 6)).translate(x, y, -.19)))), steel));
  b.part(arms, {parent: leaf, at: 1.78, dur: .5, from: [-1, 0, .5], tumble: .3, heavy: true});

  /* the dial, above the wheel */
  const dial = new THREE.Group(), dialTurn = new THREE.Group();
  dial.position.set(0, .685, .2);
  dial.add(M(Z(cyl(.1, .11, .05, 48)).translate(0, 0, .025), dark));
  dial.add(M(tor(.106, .008, 56).translate(0, 0, .05), gold));
  dialTurn.add(M(new THREE.CircleGeometry(.092, 48).translate(0, 0, .0515), std({map: canvasTex(256, 256, dialFace), metalness: .2, roughness: .45})));
  dialTurn.add(M(Z(cyl(.034, .042, .05, 28)).translate(0, 0, .076), chrome));
  dial.add(dialTurn);
  hung(dial, {at: 1.98, dur: .5, from: [-.2, .7, 1], tumble: .9});

  /* the wheel: five spokes, a rim, a knob on each, and one red cap */
  const wheel = new THREE.Group(), wheelTurn = new THREE.Group();
  wheel.position.set(0, 0, .24);
  wheel.add(M(Z(cyl(.085, .1, .1, 36)).translate(0, 0, .05), steel));
  const spokes = [], knobs = [];
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * TAU;
    spokes.push(cyl(.021, .028, .41, 12).translate(0, .285, 0).rotateZ(a).translate(0, 0, .1));
    knobs.push(ball(.046, 18).translate(0, .51, 0).rotateZ(a).translate(0, 0, .1));
  }
  wheelTurn.add(M(merge(spokes), chrome), M(merge(knobs), chrome), M(tor(.36, .023, 88).translate(0, 0, .1), chrome));
  wheelTurn.add(M(Z(cyl(.07, .08, .05, 36)).translate(0, 0, .125), chrome), M(Z(cyl(.045, .045, .014, 30)).translate(0, 0, .157), red));
  wheel.add(wheelTurn);
  hung(wheel, {at: 2.12, dur: .7, from: [.3, -.3, 1], tumble: 1.1, heavy: true});

  /* a small brass plate, and the lamp that says whether it is locked */
  hung(M(merge([rbox(-.17, -.74, .2, .17, -.63, .209, .005), ...[-.14, .14].map(x => Z(cyl(.011, .011, .006, 10)).translate(x, -.685, .212))]), gold), {at: 2.34, dur: .4, from: [0, -.6, 1], tumble: .6});
  const lampBox = new THREE.Group();
  lampBox.add(M(Z(cyl(.034, .04, .022, 24)).translate(.66, .2, .211), dark), M(ball(.021, 14).translate(.66, .2, .222), lamp));
  hung(lampBox, {at: 2.42, dur: .36, from: [.6, .3, 1], tumble: .4});

  const DONE = 3.05, lockRed = new THREE.Color(0xff5a36).multiplyScalar(2.2), lockOpen = new THREE.Color(0xfff1d6).multiplyScalar(1.6);
  return {
    root: b.root, pieces: b.pieces, ex: 1.72, ey: 1.52, dx: 0, dy: .1, pitch: .09, yaw: -.5, reach: 2.6, turn: .32, steady: true,
    /* where: the stage's place and the scroll; without it (the warm-up frame) the door stays shut */
    tick(t, clock, where) {
      const made = glide((t - DONE) / .5), s = where ? where.s / Math.max(1, where.H) : 0;
      /* two thirds of a screen of scroll is the whole of the lock's travel */
      const o = glide((s - .02) / .66) * made;
      const unlock = glide(o / .3), open = glide((o - .2) / .64), thrown = glide((o - .88) / .12);
      /* the wheel is still turning as it lands, takes a quarter turn to seat, then works the lock */
      const coast = 5.2 * Math.pow(1 - clamp((t - 2.12) / 1.25), 3);
      wheelTurn.rotation.z = coast - glide((t - DONE) / .6) * .5 - unlock * Math.PI * 1.5 + Math.sin(clock * .5) * .03 * (1 - unlock);
      dialTurn.rotation.z = (1 - glide((t - 2.3) / .9)) * 2.4 + unlock * 2.2;
      const out = .86 + .13 * clamp(1 - unlock + thrown);
      pins.forEach(p => { p.position.x = out; });
      leaf.rotation.y = -open * SWING;
      lamp.color.copy(lockRed).lerp(lockOpen, unlock).multiplyScalar(unlock > .5 || Math.sin(clock * 2.6) > -.55 ? 1 : .25);
      glow.color.copy(glow.userData.base).multiplyScalar(.18 + .82 * open);
      leds.forEach((m, i) => { m.color.copy(m.userData.base).multiplyScalar(Math.sin(clock * (5.1 + i * 2.3) + i * 1.7) > -.35 ? 1 : .18); });
    },
  };
}
