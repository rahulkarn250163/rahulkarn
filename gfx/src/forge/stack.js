/* Expertise: "Every skill here, each with its receipt." A small window where the platform is being written, and
   beside it the platform itself: each line, as it is finished, sends its layer out from behind the window to land
   on the stack, the data first and the delivery last, and running it brings the whole thing up. The words are real
   type in the page, never a texture. */
import {THREE, std, mats, merge, M, cyl, sheet, builder, glide, glowing, clamp} from './kit.js';

/* the source: text and how it is coloured; the last field is the layer it builds */
const LINES = [
  [['var ', 'k'], ['platform', ''], [' = ', ''], ['Platform', 'k'], ['.New()', '']],
  [['  .', ''], ['Data', 'm'], ['(', ''], ['"SQL Server"', 's'], [', ', ''], ['"Oracle"', 's'], [')', '']],
  [['  .', ''], ['Services', 'm'], ['(', ''], ['".NET 10"', 's'], [', ', ''], ['"EF Core"', 's'], [')', '']],
  [['  .', ''], ['Payments', 'm'], ['(idempotent: ', ''], ['true', 'k'], [')', '']],
  [['  .', ''], ['Identity', 'm'], ['(', ''], ['"OAuth 2.0"', 's'], [', ', ''], ['"RBAC"', 's'], [')', '']],
  [['  .', ''], ['Delivery', 'm'], ['(', ''], ['"Docker"', 's'], [', ', ''], ['"CI/CD"', 's'], [')', '']],
  [['  .', ''], ['Build', 'm'], ['();', '']],
  [['platform.', ''], ['Run', 'm'], ['();', '']],
];
const SPEED = 58, START = .35, GAP = .07;
const TIMES = [];
{
  let at = START;
  LINES.forEach(line => { const n = line.reduce((s, p) => s + p[0].length, 0), end = at + n / SPEED; TIMES.push({at, end, n}); at = end + GAP; });
}
const RUN = TIMES[7].end, LEVEL = [-1.42, -.76, -.1, .56, 1.22];

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
function rowHtml(line, n) {
  let html = '';
  for (const [text, cls] of line) {
    if (n <= 0) break;
    const part = esc(text.slice(0, n));
    n -= text.length;
    html += cls ? `<span class="fg-${cls}">${part}</span>` : part;
  }
  return html;
}

export function make() {
  const b = builder(29), steel = mats.steel(), chrome = mats.chrome(), copper = mats.copper(), dark = mats.blackAnodised(), red = mats.lacquer(0xc22a14);
  const deck = std({color: 0x83868b, metalness: .85, roughness: .4}), paper = std({color: 0xe9e6de, metalness: .2, roughness: .5});
  const lamp = glowing(0xff8a4a, 1.5), green = glowing(0x7fe0a0, 1.4), beads = [], spinners = [];

  /* each layer stands on a deck with a lit edge, and comes in from the side the window is on */
  const layer = i => {
    const g = new THREE.Group();
    g.position.y = LEVEL[i];
    const s = 1.62, e = .012;
    g.add(M(new THREE.BoxGeometry(s, .07, s), deck));
    const strip = [[0, s / 2 + e, s, .02], [0, -s / 2 - e, s, .02]].map(([x, z, w, d]) => new THREE.BoxGeometry(w, .022, d).translate(x, 0, z));
    strip.push(new THREE.BoxGeometry(.02, .022, s).translate(s / 2 + e, 0, 0), new THREE.BoxGeometry(.02, .022, s).translate(-s / 2 - e, 0, 0));
    g.add(M(merge(strip), lamp));
    return g;
  };
  const land = (g, i) => b.part(g, {at: TIMES[i + 1].end - .24, dur: .62, from: [-1, .06, .12], tumble: .16, heavy: true});
  const add = (g, obj, at, from = [0, 1, 0], dur = .42) => { b.part(obj, {at, dur, from, tumble: .3, parent: g}); b.pieces[b.pieces.length - 1].reach = 1.2; return obj; };

  /* Data: the drums of a database, one on another */
  {
    const g = layer(0), t = TIMES[1].end;
    land(g, 0);
    [-.42, .42].forEach((x, k) => {
      for (let j = 0; j < 3; j++) {
        const d = new THREE.Group();
        d.add(M(cyl(.3, .3, .11, 40), dark), M(new THREE.TorusGeometry(.3, .007, 6, 44).rotateX(Math.PI / 2).translate(0, .056, 0), lamp));
        d.position.set(x, .1 + j * .125, k ? -.22 : .22);
        add(g, d, t + .1 + k * .08 + j * .07);
      }
    });
  }
  /* Services: a row of blades, each with its light */
  {
    const g = layer(1), t = TIMES[2].end, leds = [];
    land(g, 1);
    for (let i = 0; i < 6; i++) {
      const x = -.6 + i * .24, m = M(new THREE.BoxGeometry(.17, .34, 1.12), i % 2 ? steel : chrome);
      m.position.set(x, .21, 0);
      add(g, m, t + .08 + i * .05, [0, 1, .2], .36);
      for (let j = 0; j < 3; j++) leds.push(new THREE.BoxGeometry(.1, .03, .012).translate(x, .12 + j * .09, .566));
    }
    add(g, M(merge(leds), green), t + .5);
  }
  /* Payments: coins round a ring that only ever turns one way */
  {
    const g = layer(2), t = TIMES[3].end, ring = new THREE.Group();
    land(g, 2);
    ring.add(M(new THREE.TorusGeometry(.56, .022, 8, 72).rotateX(Math.PI / 2), chrome));
    const coins = [];
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; coins.push(cyl(.105, .105, .03, 28).rotateZ(Math.PI / 2).rotateY(-a).translate(Math.cos(a) * .56, 0, Math.sin(a) * .56)); }
    ring.add(M(merge(coins), copper));
    spinners.push(ring);
    const holder = new THREE.Group();
    holder.position.y = .24;
    holder.add(ring);
    add(g, holder, t + .1, [0, 1, 0], .5);
    add(g, M(cyl(.2, .24, .34, 36).translate(0, .2, 0), dark), t + .18, [0, 1, 0], .4);
  }
  /* Identity: a shield in the middle of a ring */
  {
    const g = layer(3), t = TIMES[4].end, shape = new THREE.Shape();
    land(g, 3);
    shape.moveTo(-.25, .3); shape.quadraticCurveTo(0, .38, .25, .3); shape.lineTo(.25, .02); shape.quadraticCurveTo(.2, -.22, 0, -.36); shape.quadraticCurveTo(-.2, -.22, -.25, .02); shape.closePath();
    const sh = M(sheet(shape, .07, .014), red);
    sh.position.set(0, .4, 0);
    add(g, sh, t + .1, [0, 1, .3], .5);
    const halo = new THREE.Group();
    halo.position.y = .36;
    halo.add(M(new THREE.TorusGeometry(.52, .014, 8, 72), chrome));
    spinners.push(halo);
    const tilt = new THREE.Group();
    tilt.add(halo);
    add(g, tilt, t + .22, [0, 1, 0], .5);
  }
  /* Delivery: containers, stacked and ready to go */
  {
    const g = layer(4), t = TIMES[5].end, c = (x, y, z, m, w = .62) => { const o = M(new THREE.BoxGeometry(w, .22, .34), m); o.position.set(x, y, z); return o; };
    land(g, 4);
    [[-.32, .15, .36, paper], [.34, .15, .36, red], [-.32, .15, -.04, steel], [.34, .15, -.04, paper], [-.32, .15, -.44, red], [.34, .15, -.44, dark], [0, .375, .16, dark, .9], [0, .375, -.24, paper, .9]].forEach(([x, y, z, m, w], i) => add(g, c(x, y, z, m, w), t + .08 + i * .045, [0, 1, 0], .36));
  }
  /* the four rails that tie it together; running it sends light up them */
  const rails = [];
  [[-.76, -.76], [.76, -.76], [-.76, .76], [.76, .76]].forEach(([x, z]) => {
    rails.push(cyl(.016, .016, 3.2, 10).translate(x, -.02, z));
    const bead = M(new THREE.SphereGeometry(.036, 12, 10), lamp);
    bead.position.set(x, 0, z);
    beads.push(bead);
    b.root.add(bead);
  });
  b.part(M(merge(rails), copper), {at: TIMES[6].end - .2, dur: .5, from: [0, 1, 0], tumble: 0});

  /* ---- the window ---- */
  let win = null, rows = [], shown = [], beam = null, active = -2, room = null;
  const point = new THREE.Vector3();
  const self = {
    root: b.root, pieces: b.pieces, ex: 1.5, ey: 1.95, pitch: .46, yaw: .72, reach: 3.4, turn: .28,
    mount(host) {
      win = document.createElement('div');
      win.className = 'fg-win';
      win.innerHTML = `<div class="fg-bar"><i></i><i></i><i></i><span>Platform.cs</span></div><div class="fg-code">${LINES.map(() => '<div class="fg-l"></div>').join('')}</div>`;
      rows = [...win.querySelectorAll('.fg-l')];
      shown = rows.map(() => -1);
      beam = document.createElement('div');
      beam.className = 'fg-beam';
      host.append(beam, win);
    },
    /* where the window goes in the host, or null when there is no room for it */
    place(r) {
      room = r;
      /* the rows' middles are measured again on the next beam, once, not in every frame that draws one */
      rows.forEach(row => { row.mid = undefined; });
      if (!win) return;
      if (!r) { win.style.display = beam.style.display = 'none'; return; }
      win.style.display = beam.style.display = 'block';
      win.style.left = r.x + 'px';
      win.style.top = r.y + 'px';
      win.style.width = r.w + 'px';
    },
    show(on) {
      if (win) win.style.visibility = beam.style.visibility = on ? 'visible' : 'hidden';
    },
    tick(t, clock) {
      const a = clock;
      spinners.forEach((s, i) => { if (i === 0) s.rotation.y = a * .5; else s.rotation.y = -a * .7; });
      /* the lights come up when it runs, and light climbs the rails */
      const up = glide((t - RUN) / .7);
      lamp.color.copy(lamp.userData.base).multiplyScalar(.1 + .9 * up);
      green.color.copy(green.userData.base).multiplyScalar((.12 + .88 * up) * (.8 + .2 * Math.sin(a * 11)));
      beads.forEach((d, i) => { d.visible = up > 0; const k = (a * .42 + i * .25) % 1; d.position.y = -1.5 + k * 3; d.scale.setScalar(up); });
      if (!win || !room) return;
      /* the words, a character at a time: only a row that has changed is touched */
      let on = -1;
      for (let i = 0; i < LINES.length; i++) {
        const q = TIMES[i], n = Math.round(clamp((t - q.at) / (q.end - q.at)) * q.n);
        if (t >= q.at && t < q.end + GAP) on = i;
        if (n !== shown[i]) { shown[i] = n; rows[i].innerHTML = rowHtml(LINES[i], n) + '&#8203;'; }
      }
      if (on !== active) {
        rows.forEach((r, i) => r.classList.toggle('on', i === on || (on === -1 && i === LINES.length - 1)));
        active = on;
      }
      const inn = glide(t / .3);
      win.style.opacity = inn;
      win.style.transform = inn < 1 ? `translateY(${Math.round((1 - inn) * 10)}px)` : 'none';
    },
    /* a line of light from the line just finished to where its layer is landing */
    after(project) {
      if (!beam || !room) return;
      let best = -1, k = 0;
      for (let i = 0; i < 5; i++) { const age = project.t - TIMES[i + 1].end + .1; if (age >= 0 && age < .6) { best = i; k = 1 - age / .6; } }
      if (best < 0) { beam.style.opacity = 0; return; }
      const row = rows[best + 1], x0 = room.x + room.w;
      /* a row's height is fixed by the sheet, so its middle holds while its letters are typed */
      if (row.mid === undefined) row.mid = row.offsetTop + row.offsetHeight / 2;
      const y0 = room.y + row.mid;
      point.set(-.5, LEVEL[best], .2);
      const p = project.at(point), dx = p.x - x0, dy = p.y - y0;
      beam.style.opacity = k;
      beam.style.transform = `translate(${x0}px,${y0}px) rotate(${Math.atan2(dy, dx)}rad) scaleX(${Math.hypot(dx, dy)})`;
    },
  };
  return self;
}
