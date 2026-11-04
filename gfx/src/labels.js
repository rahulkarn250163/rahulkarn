/* Crisp text for the 3D figures: real page type in a layer over the canvas, never a
   texture, so it stays sharp at any resolution. place() keeps text upright on whole
   pixels; onPlane() lays it flat on a surface in the scene, skewed to match. It writes
   to the DOM only when a value actually changes. */
import {THREE} from './core.js';

const v = new THREE.Vector3(), c = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3();

export function makeTextLayer(canvas, cls) {
  const layer = document.createElement('div');
  layer.className = 'gl-labels ' + cls;
  layer.setAttribute('aria-hidden', 'true');
  canvas.after(layer);
  const items = new Map();
  const shade = (it, o) => {
    const op = Math.round(o * 50) / 50;
    if (op !== it.o) { it.o = op; it.el.style.opacity = op; }
    return op;
  };
  const screen = (out, x, y, z, camera, W, H, object) => {
    out.set(x, y, z);
    if (object) object.localToWorld(out);
    out.project(camera);
    out.x = (out.x * .5 + .5) * W; out.y = (-out.y * .5 + .5) * H;
    return out;
  };
  return {
    layer,
    /* ax, ay: which point of the text sits on its anchor, 0 to 1 */
    add(id, parts, ax = .5, ay = .5, extra = '') {
      const el = document.createElement('span');
      el.className = 'gl-label ' + extra;
      parts.forEach(([tag, text]) => { const t = document.createElement(tag); t.textContent = text; el.appendChild(t); });
      el.style.opacity = 0;
      layer.appendChild(el);
      items.set(id, {el, ax, ay, w: 0, h: 0, x: NaN, y: NaN, o: -1, m: ''});
    },
    set(id, parts) {
      const it = items.get(id);
      if (!it) return;
      parts.forEach(([, text], i) => { const t = it.el.children[i]; if (t && t.textContent !== text) { t.textContent = text; it.w = 0; } });
    },
    /* font-size in px, set directly, for type that scales with what it sits on */
    font(id, px) {
      const it = items.get(id);
      if (!it) return;
      const f = Math.round(px * 2) / 2;
      if (it.f !== f) { it.f = f; it.el.style.fontSize = f + 'px'; it.w = 0; }
    },
    /* the layer copies the canvas's box; all sizes are read together, never during a frame */
    size() {
      const s = canvas.style;
      layer.style.left = s.left; layer.style.top = s.top; layer.style.width = s.width; layer.style.height = s.height;
      items.forEach(it => { it.x = NaN; it.m = ''; });
      items.forEach(it => { it.w = it.el.offsetWidth; it.h = it.el.offsetHeight; });
    },
    /* upright, on whole pixels; anchor in the object's local coordinates (or world) */
    place(id, x, y, z, camera, W, H, o = 1, object = null) {
      const it = items.get(id);
      if (!it || shade(it, o) <= 0) return;
      screen(v, x, y, z, camera, W, H, object);
      if (!it.w) { it.w = it.el.offsetWidth; it.h = it.el.offsetHeight; }
      const X = Math.round(v.x - it.w * it.ax), Y = Math.round(v.y - it.h * it.ay);
      if (X !== it.x || Y !== it.y) { it.x = X; it.y = Y; it.el.style.transform = 'translate(' + X + 'px,' + Y + 'px)'; }
    },
    /* flat on a surface: centre (x,y,z), u is the text's rightward axis, n its upward axis
       (both local unit vectors). maxU is the most width it may take, in local units. */
    onPlane(id, x, y, z, ux, uy, uz, nx, ny, nz, camera, W, H, o = 1, object = null, maxU = 0) {
      const it = items.get(id);
      if (!it || shade(it, o) <= 0) return;
      screen(c, x, y, z, camera, W, H, object);
      screen(a, x + ux, y + uy, z + uz, camera, W, H, object);
      screen(b, x - nx, y - ny, z - nz, camera, W, H, object);
      if (!it.w) { it.w = it.el.offsetWidth; it.h = it.el.offsetHeight; }
      const ax = a.x - c.x, ay = a.y - c.y, bx = b.x - c.x, by = b.y - c.y, s = Math.hypot(ax, ay) || 1;
      /* one unit along the surface is s pixels; the type keeps its size, shrunk only to fit */
      const k = maxU && it.w ? Math.min(1, maxU * s / it.w) / s : 1 / s;
      const m = [ax * k, ay * k, bx * k, by * k, c.x - (ax * k * it.w * it.ax + bx * k * it.h * it.ay), c.y - (ay * k * it.w * it.ax + by * k * it.h * it.ay)].map(n => n.toFixed(3)).join(',');
      if (m !== it.m) { it.m = m; it.el.style.transform = 'matrix(' + m + ')'; }
    },
    dispose() { layer.remove(); items.clear(); },
  };
}
