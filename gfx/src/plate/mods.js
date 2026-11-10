// Named modules on the processor die. Rects are in die percent, y down.
import {THREE, rbox, box, merge, mesh, phys} from '../core.js';

const GAP = .6, Z0 = 5, Z1 = 6.8, EDGE = .22, RAD = .5;

export function makeMods(mods) {
  const group = new THREE.Group(), items = new Map(), owned = [];
  const track = o => (owned.push(o), o);
  for (const m of mods) {
    const w = Math.max(.1, m.w - GAP), h = Math.max(.1, m.h - GAP);
    const x0 = m.x + GAP / 2, y0 = 100 - m.y - m.h + GAP / 2, x1 = x0 + w, y1 = y0 + h;
    const g = new THREE.Group();
    /* every material is transparent from creation, so nothing recompiles mid-scroll */
    const body = track(phys({color: 0x141518, metalness: .85, roughness: .28, clearcoat: .6, clearcoatRoughness: .25, iridescence: .001, transparent: true}));
    g.add(mesh(track(rbox(x0, y0, Z0, x1, y1, Z1, Math.min(RAD, w * .45, h * .45))), body));
    /* a slightly lighter beveled inset, raised off the block; the page's type sits over it */
    const ins = Math.min(.42, w * .2, h * .2), insZ = Z1 + .12;
    const insetMat = track(phys({color: m.fab ? 0x121316 : 0x24262b, metalness: .8, roughness: .36, clearcoat: .4, clearcoatRoughness: .3, iridescence: .001, transparent: true}));
    g.add(mesh(track(rbox(x0 + ins, y0 + ins, Z1 - .1, x1 - ins, y1 - ins, insZ, Math.min(.08, ins * .4))), insetMat));
    const frameMat = track(new THREE.MeshBasicMaterial({color: new THREE.Color('#ff6a45').multiplyScalar(2.2), transparent: true}));
    const e = EDGE, a = Z1 + .02, b = Z1 + .08;
    const frame = mesh(track(merge([
      box(x0, y0, a, x1, y0 + e, b), box(x0, y1 - e, a, x1, y1, b),
      box(x0, y0 + e, a, x0 + e, y1 - e, b), box(x1 - e, y0 + e, a, x1, y1 - e, b),
    ])), frameMat, {cast: false, receive: false});
    frame.visible = false;
    g.add(frame);
    group.add(g);
    items.set(m.step, {g, frame, mats: [body, insetMat, frameMat]});
  }
  return {
    group,
    setMod(step, k, current) {
      const it = items.get(step);
      if (!it) return;
      it.g.position.z = (1 - k) * 3;
      it.frame.visible = !!current;
      for (const mt of it.mats) mt.opacity = k;
    },
    dispose() { for (const o of owned) o.dispose(); },
  };
}
