/* The reel chip's board, in board units with the die at the origin: x right, y up.
   One side per shot; each side has four pads routed out from real pins. */
export const GROUPS = [
  {side: 0, name: 'PORTAL', pads: ['Policy', 'Claims', 'Agents', 'IdentityServer']},
  {side: 1, name: 'DATA', pads: ['Oracle', 'SQL Server', 'Execution plan', 'Covering index']},
  {side: 2, name: 'PAYMENTS', pads: ['Idempotency key', 'Six states', 'Reconciliation', 'Audit log']},
  {side: 3, name: 'GRAHAN', pads: ['Sun', 'Moon', 'Eclipses', 'Bikram Sambat']},
];
const SIDES = [[-1, 0], [0, 1], [1, 0], [0, -1]];
export const rnd = s => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

export function buildLayout() {
  const S = 100, D = 70, half = 35;
  const groups = GROUPS.map((g, gi) => {
    const [ox, oy] = SIDES[g.side], n = g.pads.length;
    const pads = g.pads.map((label, k) => {
      const lat = (k - (n - 1) / 2) * (S * 1.5 / n), out = S * .98;
      const px = ox * out + (oy ? lat : 0), py = oy * out + (ox ? lat : 0);
      const pinLat = [-2, -1, 1, 2][k] * (D * .8 / 6);
      const x0 = ox * half + (oy ? pinLat : 0), y0 = oy * half + (ox ? pinLat : 0);
      const x1 = x0 + ox * 7, y1 = y0 + oy * 7;
      const dl = oy ? px - x1 : py - y1, adv = Math.min(Math.abs(dl), out - half - 14);
      const x2 = x1 + ox * adv + (oy ? dl : 0), y2 = y1 + oy * adv + (ox ? dl : 0);
      const pts = [[x0, y0], [x1, y1], [x2, y2], [px, py]];
      let len = 0;
      for (let j = 1; j < 4; j++) len += Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]);
      return {label, k, ox, oy, px, py, pts, len};
    });
    const pins = [];
    for (let k = 0; k < 7; k++) { const lat = (k - 3) * (D * .8 / 6); pins.push({x: ox * half + (oy ? lat : 0), y: oy * half + (ox ? lat : 0), ox, oy}); }
    return {ox, oy, pads, pins, name: g.name};
  });
  const parts = [0, 1, 2, 3, 4, 5, 6, 7].map(i => {
    const a = i * .785 + .39, r = S * (.6 + rnd(i) * .16);
    return {x: Math.cos(a) * r, y: Math.sin(a) * r * .7, w: 5 + rnd(i + 3) * 5, h: 2.5 + rnd(i * 3) * 2};
  });
  return {S, D, half, groups, parts};
}
