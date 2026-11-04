/* Case Studies: the three systems, each put together in turn. The portal on a laptop, the database
   as a stack of platters with their activity lights, and the payment terminal taking one card. */
import {THREE, std, mats, rbox, box, merge, canvasTex, M, cyl, tor, sheet, glide, swing, blob, builder, glowing} from './kit.js';

function screenUI(c, w, h) {
  c.fillStyle = '#10151c'; c.fillRect(0, 0, w, h);
  c.fillStyle = '#9e1c1c'; c.fillRect(0, 0, w, h * .1);
  c.fillStyle = '#1c2530'; c.fillRect(0, h * .1, w * .2, h * .9);
  c.fillStyle = '#3c4a5a';
  for (let i = 0; i < 6; i++) c.fillRect(w * .03, h * (.17 + i * .11), w * .13, h * .04);
  [['#e9e5da', .24], ['#d3cfc4', .49], ['#e9e5da', .74]].forEach(([col, x]) => {
    c.fillStyle = col; c.fillRect(w * x, h * .17, w * .22, h * .28);
    c.fillStyle = '#9e1c1c'; c.fillRect(w * (x + .02), h * .21, w * .08, h * .05);
    c.fillStyle = '#7b7a74'; c.fillRect(w * (x + .02), h * .31, w * .17, h * .025); c.fillRect(w * (x + .02), h * .37, w * .12, h * .025);
  });
  c.strokeStyle = '#54c8e8'; c.lineWidth = h * .012; c.beginPath();
  [.86, .8, .83, .7, .73, .62, .64, .56].forEach((y, i) => { const x = w * (.25 + i * .1); if (i) c.lineTo(x, h * y); else c.moveTo(x, h * y); });
  c.stroke();
}

function terminalUI(c, w, h) {
  c.fillStyle = '#0b1a13'; c.fillRect(0, 0, w, h);
  c.fillStyle = '#2bbd77'; c.beginPath(); c.arc(w * .5, h * .5, h * .3, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#0b1a13'; c.lineWidth = h * .08; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath();
  c.moveTo(w * .41, h * .5); c.lineTo(w * .48, h * .6); c.lineTo(w * .61, h * .4); c.stroke();
}

function laptop(b, parent) {
  const body = mats.spaceGrey(), dark = mats.plastic(0x0d0e10), base = new THREE.Group();
  base.add(M(rbox(-.5, -.03, -.33, .5, 0, .33, .012), body));
  base.add(M(box(-.455, 0, -.3, .455, .0015, .08), dark));
  base.add(M(rbox(-.15, 0, .12, .15, .002, .29, .002), std({color: 0x54565b, metalness: .8, roughness: .35})));
  b.part(base, {at: 0, dur: .5, from: [0, -1, .3], tumble: .4, heavy: true, parent});
  const keys = [];
  for (let r = 0; r < 5; r++) for (let i = 0; i < 13; i++) { const x = -.44 + i * .0675, z = -.285 + r * .0695; keys.push(box(x, 0, z, x + .056, .009, z + .058)); }
  b.part(M(merge(keys), mats.plastic(0x1a1b1e)), {at: .22, dur: .42, from: [0, 1, 0], tumble: .1, parent});

  const hinge = new THREE.Group(), lid = new THREE.Group();
  hinge.position.set(0, .002, -.33);
  lid.add(M(rbox(-.5, 0, -.02, .5, .64, 0, .01), body));
  const ui = M(new THREE.PlaneGeometry(.94, .58), new THREE.MeshBasicMaterial({map: canvasTex(512, 316, screenUI)}));
  ui.position.set(0, .32, .002);
  lid.add(ui);
  hinge.add(lid);
  b.part(hinge, {at: .42, dur: .42, from: [0, .4, -1], tumble: .3, parent});
  return k => { lid.rotation.x = Math.PI / 2 * (1 - k) - .24 * k; };
}

function platters(b, parent) {
  const metal = mats.aluminium(), seam = mats.blackAnodised(), rings = [];
  for (let i = 0; i < 4; i++) {
    const g = new THREE.Group(), light = glowing(0x54c8e8, 1.4);
    g.position.y = .08 + i * .175;
    g.add(M(cyl(.36, .36, .135, 56), metal), M(cyl(.345, .345, .17, 56), seam), M(tor(.362, .0075, 64).rotateX(Math.PI / 2), light));
    rings.push(light);
    for (let k = 0; k < 3; k++) { const d = M(new THREE.SphereGeometry(.009, 10, 8), glowing(0x2bbd77, 1.6)); d.position.set(.13 + k * .05, 0, .35); g.add(d); }
    b.part(g, {at: .9 + i * .13, dur: .46, from: [(i % 2 ? 1 : -1) * .3, 1, .1], tumble: .35, heavy: true, parent});
  }
  const cap = new THREE.Group();
  cap.position.y = .08 + 4 * .175 - .08;
  cap.add(M(cyl(.36, .36, .02, 56), mats.spaceGrey()), M(tor(.14, .006, 40).rotateX(Math.PI / 2).translate(0, .012, 0), mats.chrome()));
  b.part(cap, {at: 1.44, dur: .34, from: [0, 1, 0], tumble: .2, parent});
  return t => {
    const head = (t * 1.4) % 4;
    rings.forEach((m, i) => { const d = Math.min(Math.abs(head - i), 4 - Math.abs(head - i)); m.color.copy(m.userData.base).multiplyScalar(.22 + 1.1 * Math.exp(-d * d * 2.4)); });
  };
}

function terminal(b, spot) {
  /* it is the smallest of the three, so it stands a little larger than life */
  const parent = new THREE.Group();
  parent.scale.setScalar(1.34);
  spot.add(parent);
  const keys = [], body = new THREE.Group(), led = glowing(0x2bbd77, 2);
  body.rotation.x = .42;
  body.position.set(0, .2, 0);
  body.add(M(rbox(-.235, -.02, -.4, .235, .055, .4, .03), mats.plastic(0x141518)));
  const scr = M(new THREE.PlaneGeometry(.36, .25).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({map: canvasTex(256, 176, terminalUI)}));
  scr.position.set(0, .0565, -.2);
  body.add(scr);
  for (let r = 0; r < 4; r++) for (let i = 0; i < 3; i++) { const x = -.13 + i * .13, z = .02 + r * .083; keys.push(box(x - .048, .055, z - .03, x + .048, .068, z + .03)); }
  body.add(M(merge(keys), mats.steel()));
  const lamp = M(new THREE.SphereGeometry(.012, 10, 8), led);
  lamp.position.set(.18, .06, -.36);
  body.add(lamp);
  b.part(body, {at: 1.5, dur: .5, from: [1, .2, .4], tumble: .5, heavy: true, parent});
  const stand = M(rbox(-.2, 0, -.26, .2, .05, .26, .02), mats.rubber());
  b.part(stand, {at: 1.42, dur: .4, from: [0, -1, 0], tumble: .1, parent});

  /* the card: comes in, dips, comes back */
  const W = .17, H = .105, R = .014, s = new THREE.Shape();
  s.moveTo(-W + R, -H); s.lineTo(W - R, -H); s.quadraticCurveTo(W, -H, W, -H + R); s.lineTo(W, H - R); s.quadraticCurveTo(W, H, W - R, H); s.lineTo(-W + R, H); s.quadraticCurveTo(-W, H, -W, H - R); s.lineTo(-W, -H + R); s.quadraticCurveTo(-W, -H, -W + R, -H);
  const card = new THREE.Group(), slot = new THREE.Group();
  card.add(M(sheet(s, .006, .001), mats.lacquer(0x9e1c1c)), M(rbox(-.13, -.012, .003, -.07, .04, .006, .004), mats.gold()), M(box(-.14, -.075, .0034, .14, -.06, .0045), mats.gold()));
  slot.position.set(.02, .5, -.3);
  slot.add(card);
  b.part(slot, {at: 2.02, dur: .5, from: [-.7, .6, .8], tumble: 1.1, parent});
  return t => {
    const c = t < 2.5 ? 0 : (t - 2.5) % 3.6, down = glide(c / .4) - glide((c - 1.9) / .4);
    card.position.y = -down * .17;
    led.color.copy(led.userData.base).multiplyScalar(down > .9 ? 1 : .18);
  };
}

export function make() {
  const b = builder(7);
  const spots = [-1.2, 0, 1.2].map(x => { const g = new THREE.Group(); g.position.set(x, -.34, 0); g.add(blob(.66, .5, -.04, .22)); b.root.add(g); return g; });
  const openLid = laptop(b, spots[0]), blink = platters(b, spots[1]), dip = terminal(b, spots[2]);
  return {
    root: b.root, pieces: b.pieces, ex: 1.78, ey: .82, pitch: .34, yaw: -.16, reach: 2.4, turn: .5,
    tick(t) {
      openLid(swing((t - .74) / .6));
      blink(t);
      dip(t);
    },
  };
}
