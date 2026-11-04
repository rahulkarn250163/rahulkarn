// The reel chip's text: real page type over the canvas, anchored to the board.
import {THREE} from '../core.js';
import {makeTextLayer} from '../labels.js';

const a = new THREE.Vector3(), b = new THREE.Vector3();

export function makeLabels(L, canvas) {
  const group = new THREE.Group(), text = makeTextLayer(canvas, 'chip-labels');
  const pads = [], op = {};
  let showPads = true, dieO = 0;
  L.groups.forEach((g, gi) => g.pads.forEach((p, i) => {
    const id = gi + '-' + i;
    // left side pads read rightward from the pad, right side pads leftward; side labels ride above the trace
    const ax = p.ox > 0 ? 1 : p.ox < 0 ? 0 : .5;
    const x = p.px + (p.ox > 0 ? -7 : p.ox < 0 ? 7 : 0);
    const y = p.py + (p.ox ? (p.py < 0 ? -5 : 5) : Math.sign(p.oy) * (8 + (p.k % 2) * 8));
    text.add(id, [['b', String(p.label)]], ax, .5);
    pads.push({id, x, y});
  }));
  text.add('die', [['b', ''], ['i', '']], .5, .5, 'die');

  return {
    group,
    setPad(gi, i, o) { op[gi + '-' + i] = o; },
    setDie(n, s, k) { text.set('die', [['b', n], ['i', s]]); dieO = k; },
    setVisible(b) { showPads = b; },
    /* after the camera has been placed for this frame */
    project(camera, W, H) {
      for (const p of pads) text.place(p.id, p.x, p.y, .6, camera, W, H, showPads ? op[p.id] || 0 : 0);
      /* the name always fits inside the die, flat on its surface */
      a.set(-28, 0, 3.8).project(camera); b.set(28, 0, 3.8).project(camera);
      text.font('die', Math.max(9, Math.hypot((b.x - a.x) * W / 2, (b.y - a.y) * H / 2) * .092));
      text.onPlane('die', 0, 0, 3.8, 1, 0, 0, 0, 1, 0, camera, W, H, dieO, null, 52);
    },
    size() { text.size(); },
    dispose() { text.dispose(); },
  };
}
