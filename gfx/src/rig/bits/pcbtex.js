// Procedural motherboard maps: colour, normal and roughness share one layout.
import {canvasTex, normalFromHeight, rng} from '../../core.js';

const S = 1024;
let cache = null;

function layout() {
  const r = rng(4127), runs = [], pads = [], outlines = [], labels = [];
  const dirs = [[1, 0], [0, 1], [.7071, .7071], [.7071, -.7071]];
  for (let b = 0; b < 46; b++) {
    const d0 = Math.floor(r() * 2), n = 4 + Math.floor(r() * 11), gap = 5 + r() * 3;
    const x0 = r() * S, y0 = r() * S, a = 70 + r() * 260, c = 30 + r() * 170;
    const d1 = dirs[2 + Math.floor(r() * 2)], d2 = dirs[d0], w = r() < .2 ? 2.4 : 1.4;
    for (let i = 0; i < n; i++) {
      const ox = d0 ? i * gap : 0, oy = d0 ? 0 : i * gap;
      const p0 = [x0 + ox, y0 + oy];
      const p1 = [p0[0] + dirs[d0][0] * (a + i * 2), p0[1] + dirs[d0][1] * (a + i * 2)];
      const p2 = [p1[0] + d1[0] * c, p1[1] + d1[1] * c];
      const p3 = [p2[0] + d2[0] * a * .6, p2[1] + d2[1] * a * .6];
      runs.push({pts: [p0, p1, p2, p3], w});
      pads.push([p0[0], p0[1], 2.6]);
      pads.push([p3[0], p3[1], 2.6]);
    }
  }
  for (let i = 0; i < 70; i++) {
    const x = r() * S, y = r() * S, w = 14 + r() * 80, h = 10 + r() * 50;
    outlines.push([x, y, w, h]);
    const count = Math.floor(w / 7);
    for (let k = 0; k < count; k++) {
      pads.push([x + 4 + k * 7, y - 4, 2]);
      if (r() < .6) pads.push([x + 4 + k * 7, y + h + 4, 2]);
    }
    const pre = 'RCULJQ'[Math.floor(r() * 6)];
    labels.push([pre + (1 + Math.floor(r() * 299)), x + 1, y + h + 16]);
  }
  for (let i = 0; i < 160; i++) pads.push([r() * S, r() * S, 1.6 + r() * 2.2]);
  return {runs, pads, outlines, labels};
}

function strokeRuns(ctx, runs, style, scale = 1) {
  ctx.strokeStyle = style;
  ctx.lineJoin = 'round';
  for (const {pts, w} of runs) {
    ctx.lineWidth = w * scale;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  }
}

function fillPads(ctx, pads, style) {
  ctx.fillStyle = style;
  for (const [x, y, p] of pads) ctx.fillRect(x - p, y - p, p * 2, p * 2);
}

function flat(grey) {
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  ctx.fillStyle = grey;
  ctx.fillRect(0, 0, S, S);
  return {c, ctx};
}

export function pcbMaps() {
  if (cache) return cache;
  const L = layout();
  const map = canvasTex(S, S, (ctx, w, h) => {
    ctx.fillStyle = '#1a1c1f';
    ctx.fillRect(0, 0, w, h);
    strokeRuns(ctx, L.runs, 'rgba(146,96,60,.5)');
    fillPads(ctx, L.pads, '#e5b860');
    ctx.strokeStyle = 'rgba(228,223,210,.62)';
    ctx.lineWidth = 1;
    for (const [x, y, a, b] of L.outlines) ctx.strokeRect(x, y, a, b);
    ctx.fillStyle = 'rgba(228,223,210,.72)';
    ctx.font = '9px monospace';
    for (const [t, x, y] of L.labels) ctx.fillText(t, x, y);
  });
  const hgt = flat('#303030');
  strokeRuns(hgt.ctx, L.runs, '#a0a0a0');
  fillPads(hgt.ctx, L.pads, '#ffffff');
  const rou = flat('rgb(140,140,140)');
  fillPads(rou.ctx, L.pads, 'rgb(64,64,64)');
  const roughnessMap = canvasTex(S, S, (ctx) => ctx.drawImage(rou.c, 0, 0), {srgb: false});
  cache = {map, normalMap: normalFromHeight(hgt.c, 1.6), roughnessMap};
  return cache;
}
