// Static board for the reel chip: PCB, package, die, pins, pads, SMD parts.
import {THREE, canvasTex, normalFromHeight, mats, rbox, box, merge, mesh, std, phys} from '../core.js';

function traces(ctx, w, h, base, line) {
  ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = line; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
  let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 170; i++) {
    let x = r() * w, y = r() * h, dx = r() < .5 ? 1 : -1;
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let j = 0; j < 3; j++) {
      const n = 30 + r() * 140;
      if (j % 2) { x += n * dx; y += n * (r() < .5 ? 1 : -1); } else if (r() < .5) x += n * dx; else y += n;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

export function makeBoard(L) {
  const group = new THREE.Group();
  const clamp = k => Math.min(1, Math.max(0, k));

  /* soft fade in the map's alpha: opaque centre, fully transparent well before the plane's edge */
  const map = canvasTex(1024, 1024, (c, w, h) => {
    traces(c, w, h, '#0c0d0f', '#17191c');
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    [[0, 1], [.22, .933], [.55, .467], [.8, .133], [1, 0]].forEach(([s, a]) => g.addColorStop(s, `rgba(0,0,0,${a})`));
    c.globalCompositeOperation = 'destination-in';
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  });
  const hc = document.createElement('canvas'); hc.width = hc.height = 1024;
  traces(hc.getContext('2d'), 1024, 1024, '#404040', '#6a6a6a');
  const pcbMat = std({color: 0xffffff, map, normalMap: normalFromHeight(hc, .7), roughness: .78, metalness: 0, envMapIntensity: .3, transparent: true, depthWrite: false});
  const pcbGeo = rbox(-130, -130, -2, 130, 130, 0, .6);
  // Planar UVs so the fade spans the whole plate exactly once.
  const pcbPos = pcbGeo.attributes.position, pcbUv = new Float32Array(pcbPos.count * 2);
  for (let i = 0; i < pcbPos.count; i++) { pcbUv[i * 2] = (pcbPos.getX(i) + 130) / 260; pcbUv[i * 2 + 1] = (pcbPos.getY(i) + 130) / 260; }
  pcbGeo.setAttribute('uv', new THREE.BufferAttribute(pcbUv, 2));
  const pcb = mesh(pcbGeo, pcbMat); pcb.renderOrder = -1;
  group.add(pcb);

  const pkgMat = mats.plastic(0x0b0b0c).clone(); pkgMat.transparent = true;
  const pkg = mesh(rbox(-25, -25, 0, 25, 25, 3.4, .9), pkgMat);
  // Thin raised gold seal ring around the die seat; fades with the package.
  const sealMat = mats.gold().clone(); sealMat.transparent = true;
  const seal = mesh(merge([
    box(-21.4, 20.6, 3.4, 21.4, 21.4, 3.55),
    box(-21.4, -21.4, 3.4, 21.4, -20.6, 3.55),
    box(-21.4, -20.6, 3.4, -20.6, 20.6, 3.55),
    box(20.6, -20.6, 3.4, 21.4, 20.6, 3.55),
  ]), sealMat);
  const grid = canvasTex(512, 512, (c, w, ht) => {
    c.fillStyle = '#fff'; c.fillRect(0, 0, w, ht);
    c.strokeStyle = '#dfe2e5'; c.lineWidth = 1;
    for (let i = 0; i <= w; i += 8) {
      c.beginPath(); c.moveTo(i, 0); c.lineTo(i, ht); c.moveTo(0, i); c.lineTo(w, i); c.stroke();
    }
  });
  const dieMat = phys({color: 0x15171c, metalness: 1, roughness: .13, clearcoat: 1, envMapIntensity: 2.4, iridescence: .22, iridescenceIOR: 1.6, map: grid, emissive: 0xc8102e, emissiveIntensity: 0, transparent: true});
  const die = mesh(rbox(-20, -20, 3.4, 20, 20, 3.75, .08, 2), dieMat);
  /* the package and die are modelled at half 25 and seated at half 35 */
  const seat = new THREE.Group();
  seat.scale.set(1.4, 1.4, 1);
  seat.add(pkg, seal, die);
  group.add(seat);

  // Pins per side, each merged and slid along its own outward axis.
  const pinMat = mats.gold().clone(); pinMat.transparent = true;
  const pins = L.groups.map(g => {
    const horiz = Math.abs(g.ox) > Math.abs(g.oy);
    const m = mesh(merge(g.pins.map(p => {
      const a = horiz ? 2.2 : .45, b = horiz ? .45 : 2.2;
      return box(p.x - a, p.y - b, 0, p.x + a, p.y + b, .5);
    })), pinMat);
    m.visible = false;
    group.add(m);
    return {m, g};
  });

  // Pads: dark centre on a gold rim, scaled in from their own origin.
  const padDark = std({color: 0x141518, roughness: .6, metalness: .3, transparent: true});
  const rimMat = pinMat;
  const pads = L.groups.map(g => g.pads.map(p => {
    const o = new THREE.Group(); o.position.set(p.px, p.py, 0);
    o.add(mesh(rbox(-2.4, -2.4, 0, 2.4, 2.4, .16, .1, 2), rimMat));
    o.add(mesh(rbox(-1.8, -1.8, .1, 1.8, 1.8, .3, .1, 2), padDark));
    o.scale.setScalar(0); o.visible = false;
    group.add(o);
    return o;
  }));

  const bodies = [], caps = [];
  for (const p of L.parts) {
    const w = p.w / 2, ht = p.h / 2, cap = p.w * .18;
    bodies.push(rbox(p.x - w + cap, p.y - ht, 0, p.x + w - cap, p.y + ht, 1, .12, 2));
    caps.push(box(p.x - w, p.y - ht, 0, p.x - w + cap, p.y + ht, .9), box(p.x + w - cap, p.y - ht, 0, p.x + w, p.y + ht, .9));
  }
  const parts = new THREE.Group();
  if (bodies.length) parts.add(mesh(merge(bodies), std({color: 0x17181a, roughness: .55, transparent: true})), mesh(merge(caps), std({color: 0x8d9094, metalness: 1, roughness: .38, transparent: true})));
  parts.visible = false;
  group.add(parts);

  /* set once, before the shaders compile: changing it later would recompile mid-scroll */
  dieMat.transparent = true;
  return {
    group,
    setDie(k) { k = clamp(k); pkgMat.opacity = sealMat.opacity = dieMat.opacity = k; pkg.visible = seal.visible = die.visible = k > 0; },
    setPads(gi, i, k) { k = clamp(k); const o = pads[gi][i]; o.scale.setScalar(k); o.visible = k > 0; },
    setPins(gi, k) { k = clamp(k); const {m, g} = pins[gi]; m.visible = k > .05; pinMat.opacity = 1; const d = (k - 1) * 6, n = Math.hypot(g.ox, g.oy) || 1; m.position.set(g.ox / n * d, g.oy / n * d, 0); },
    setParts(k) { parts.visible = k > .05; },
    setHeat(v) { dieMat.emissiveIntensity = clamp(v) * .012; },
  };
}
