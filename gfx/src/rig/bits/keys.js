import {THREE, rbox, std, phys} from '../../core.js';
import {keyAtlas} from './keytex.js';

const ROWS = [
  Array(15).fill(1),
  [1.5, ...Array(12).fill(1), 1.5],
  [1.75, ...Array(11).fill(1), 2.25],
  [2.25, ...Array(10).fill(1), 2.75],
  [1.25, 1.25, 1.25, 6.25, 1.25, 1.25, 1.25, 1.25],
];
const PITCH = 2.6, Y0 = 1.3, Y1 = 2.4, DEPTH = 2.36, GAP = .34;

// Accepts a cell() lookup returning {u0,v0,u1,v1} or [u0,v0,u1,v1], or a cols/rows grid.
function cellRect(atlas, i) {
  if (typeof atlas.cell === 'function') {
    const c = atlas.cell(i);
    return Array.isArray(c) ? {u0: c[0], v0: c[1], u1: c[2], v1: c[3]} : c;
  }
  const cols = atlas.cols || 8, rows = atlas.rows || Math.ceil(63 / cols);
  const cx = i % cols, cy = Math.floor(i / cols);
  return {u0: cx / cols, u1: (cx + 1) / cols, v0: 1 - (cy + 1) / rows, v1: 1 - cy / rows};
}

function capGeometry(x0, x1, z0, z1, cell, blank) {
  const geo = rbox(x0, Y0, z0, x1, Y1, z1, .22);
  const pos = geo.attributes.position, nor = geo.attributes.normal;
  const uv = new Float32Array(pos.count * 2);
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const hx = (x1 - x0) / 2, hz = (z1 - z0) / 2;
  const bu = (blank.u0 + blank.u1) / 2, bv = (blank.v0 + blank.v1) / 2;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    if (nor.getY(i) > .6) {
      /* square mapping, so a wide key keeps its legend's shape; past the cell it stays blank */
      const cu = (cell.u0 + cell.u1) / 2, span = z1 - z0;
      uv[i * 2] = Math.min(cell.u1, Math.max(cell.u0, cu + (x - cx) / span * (cell.u1 - cell.u0)));
      uv[i * 2 + 1] = cell.v1 - (z - z0) / span * (cell.v1 - cell.v0);
    } else {
      uv[i * 2] = bu;
      uv[i * 2 + 1] = bv;
    }
    if (y > 2) {
      const dx = (x - cx) / hx, dz = (z - cz) / hz;
      const dish = .05 * Math.max(0, 1 - dx * dx - dz * dz);
      pos.setXYZ(i, cx + (x - cx) * .88, y - (y > Y1 - .01 ? dish : 0), cz + (z - cz) * .88);
    }
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  return geo;
}

export function make() {
  const atlas = typeof keyAtlas === 'function' ? keyAtlas() : keyAtlas;
  const map = atlas.texture || atlas.map || atlas;
  const capMat = std({map, roughness: .58, metalness: 0});
  const enterMat = phys({color: 0xc22a14, roughness: .3, metalness: 0, clearcoat: 1, clearcoatRoughness: .15});
  const blank = cellRect(atlas, 0);
  const keys = [];
  ROWS.forEach((row, r) => {
    let x = -14.5;
    const z = 9 + r * 2.7;
    row.forEach((w, c) => {
      const n = keys.length, x1 = x + w * PITCH - GAP;
      const geo = capGeometry(x, x1, z, z + DEPTH, cellRect(atlas, n + 1), blank);
      const isEnter = r === 2 && c === row.length - 1;
      const m = new THREE.Mesh(geo, isEnter ? enterMat : capMat);
      m.castShadow = m.receiveShadow = true;
      const g = new THREE.Group();
      g.name = `key-${n}`;
      g.add(m);
      keys.push(g);
      x += w * PITCH;
    });
  });
  return keys;
}
