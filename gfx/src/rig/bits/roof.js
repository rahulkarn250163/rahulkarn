import {THREE, mats, rbox, box, merge, mesh, plate, canvasTex, normalFromHeight, std} from '../../core.js';

const VX0 = -54, VX1 = -39, VZ0 = -20, VZ1 = 10, PX = 34; // PX: texture pixels per desk unit

// Staggered hole grid on a canvas, painted with the given ground and hole tones.
function holes(ctx, w, h, ground, hole) {
  ctx.fillStyle = ground; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = hole;
  const p = 9, r = 3;
  for (let j = 0, y = p / 2; y < h; y += p * .866, j++)
    for (let x = j % 2 ? p : p / 2; x < w; x += p) {
      ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
    }
}

export function make() {
  const g = new THREE.Group(), w = (VX1 - VX0) * PX, h = (VZ1 - VZ0) * PX;
  g.add(mesh(rbox(-56, 45, -24, -37, 46, 14, .2), mats.spaceGrey()));

  // White ground leaves the metal colour untouched; the holes multiply it to near black.
  const map = canvasTex(w, h, (c, a, b) => holes(c, a, b, '#ffffff', '#040405'));
  const height = document.createElement('canvas');
  height.width = w; height.height = h;
  holes(height.getContext('2d'), w, h, '#ffffff', '#000000');
  const vent = std({color: 0x3f4145, map, normalMap: normalFromHeight(height, 2.5), roughness: .45, metalness: .9});
  g.add(mesh(plate('+y', 46.01, VX0, VZ0, VX1, VZ1), vent, {cast: false}));

  // Seams sit just proud of the panel and read as dark lines.
  const seams = [box(-55.6, 46, -22.4, -37.4, 46.012, -22.3), box(-55.6, 46, 12.3, -37.4, 46.012, 12.4)];
  g.add(mesh(merge(seams), mats.rubber(0x050506), {cast: false}));

  const screws = [[-54.8, -23], [-38.2, -23], [-54.8, 13.2], [-38.2, 13.2]].map(([x, z]) => {
    const s = new THREE.CylinderGeometry(.32, .36, .1, 16);
    s.translate(x, 46.05, z);
    return s;
  });
  g.add(mesh(merge(screws), mats.blackAnodised()));
  return g;
}
