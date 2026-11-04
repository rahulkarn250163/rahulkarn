// Computer mouse: lofted body, surface button seams, ribbed wheel seated in a slot.
import {THREE, mats, merge, mesh, canvasTex, std} from '../../core.js';

const CX = 32, CZ = 16, W = 6, L = 10, H = 3.2, ROWS = 14, PTS = 16, E = .55;

// Half width along the length: narrow nose, waist, fuller palm. u=0 front, u=1 back.
const halfW = u => (W / 2) * Math.pow(Math.sin(Math.PI * Math.min(1, .1 + u * .86)), .3) * (.88 + .12 * u);
// Smooth hump peaking behind the middle, tapering to the ends.
const hump = u => H * Math.pow(Math.sin(Math.PI * Math.pow(u * .94 + .03, 1.45)), .62);

// Height of the crown at a desk position: the loft's own arc solved for x.
function surfaceY(x, z) {
  const u = (z - (CZ - L / 2)) / L, t = Math.min(1, Math.abs(x - CX) / halfW(u));
  const c = Math.pow(t, 1 / E);
  return hump(u) * Math.pow(Math.max(0, 1 - c * c), E / 2);
}

// Thin ribbon laid on the crown. at(i) gives the centre [x, z]; side gives the unit offset across it.
function ribbon(n, at, side, width, lift) {
  const pos = [], idx = [];
  for (let i = 0; i <= n; i++) {
    const [x, z] = at(i / n);
    for (const s of [-1, 1]) {
      const px = x + side[0] * s * width / 2, pz = z + side[1] * s * width / 2;
      pos.push(px, surfaceY(px, pz) + lift, pz);
    }
  }
  for (let i = 0; i < n; i++) {
    const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Loft arc points from angle a0 to a1 (0 = +x at the floor, PI = -x at the floor), then close the ends.
function loft(a0, a1, grow, yMax) {
  const pos = [], idx = [], e = E;
  for (let r = 0; r < ROWS; r++) {
    const u = r / (ROWS - 1), z = CZ - L / 2 + u * L, hw = halfW(u) + grow, h = hump(u) + grow;
    for (let p = 0; p < PTS; p++) {
      const a = a0 + (a1 - a0) * p / (PTS - 1), c = Math.cos(a), s = Math.sin(a);
      const y = h * Math.pow(Math.abs(s), e);
      pos.push(CX + hw * Math.sign(c) * Math.pow(Math.abs(c), e), Math.min(y, yMax(u)), z);
    }
  }
  for (let r = 0; r < ROWS - 1; r++) for (let p = 0; p < PTS - 1; p++) {
    const a = r * PTS + p, b = a + 1, c = a + PTS, d = c + 1;
    idx.push(a, b, c, b, d, c);
  }
  const cap = (r, flip) => {
    const base = r * PTS, mid = pos.length / 3;
    pos.push(CX, 0, CZ - L / 2 + r / (ROWS - 1) * L);
    for (let p = 0; p < PTS - 1; p++) flip ? idx.push(mid, base + p, base + p + 1) : idx.push(mid, base + p + 1, base + p);
  };
  cap(0, false); cap(ROWS - 1, true);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function make() {
  const group = new THREE.Group();
  // Gloss crown over the full arc; a slightly larger matte skirt capped at low height covers the sides.
  group.add(mesh(loft(0, Math.PI, 0, () => 99), mats.gloss(0x0b0b0c)));
  group.add(mesh(loft(0, Math.PI, .03, u => hump(u) * .46), mats.plastic(0x111214)));

  // True surface seams: centre line from the nose to the middle, one short cross seam at the middle.
  const zF = CZ - L / 2, uStart = .02, uC = .51, zC = zF + uC * L, wheelZ = 12.8, R = .525;
  const zS = zF + uStart * L, xC = halfW(uC) * .55;
  const seams = [
    ribbon(32, t => [CX, zS + t * (zC - zS)], [1, 0], .05, .012),
    ribbon(24, t => [CX - xC + t * 2 * xC, zC], [0, -1], .05, .012),
    // Dark slot the wheel sits in, a touch above the seam so the two never fight.
    ribbon(16, t => [CX, wheelZ - .68 + t * 1.36], [1, 0], .72, .016),
  ];
  group.add(mesh(merge(seams), std({color: 0x030304, roughness: .8}), {cast: false}));

  // Wheel with ribbed normal map, axis along x; its top third shows above the crown.
  const ribs = canvasTex(64, 8, (c, w, h) => {
    for (let x = 0; x < w; x += 4) { c.fillStyle = '#8080ff'; c.fillRect(x, 0, 2, h); c.fillStyle = '#c080ff'; c.fillRect(x + 2, 0, 1, h); c.fillStyle = '#4080ff'; c.fillRect(x + 3, 0, 1, h); }
  }, {srgb: false, repeat: [3, 1]});
  const wheelMat = std({color: 0x151517, roughness: .72, normalMap: ribs});
  const wheelY = surfaceY(CX, wheelZ) + .35 - R;
  const place = (g, x) => { g.rotateZ(Math.PI / 2); g.translate(x, wheelY, wheelZ); return g; };
  group.add(mesh(place(new THREE.CylinderGeometry(R, R, .55, 24), CX), wheelMat));
  group.add(mesh(place(new THREE.CylinderGeometry(R + .002, R + .002, .03, 24), CX + .2), mats.glow(0xe0644f, 1), {cast: false}));
  return group;
}
