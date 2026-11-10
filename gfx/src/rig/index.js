/* The computer as one list of parts: each bit in its final place, with its own clock.
   at is seconds after the loader lifts, from is where it starts in reaches (one reach
   is off screen), tumble is the rotation it sheds in flight, heavy shakes the camera. */
import {THREE, rng, breathe} from '../core.js';
import * as chassis from './bits/chassis.js';
import * as psu from './bits/psu.js';
import * as drive from './bits/drive.js';
import * as roof from './bits/roof.js';
import * as front from './bits/front.js';
import * as sideglass from './bits/sideglass.js';
import * as board from './bits/board.js';
import * as boardparts from './bits/boardparts.js';
import * as cpu from './bits/cpu.js';
import * as ram from './bits/ram.js';
import * as cooler from './bits/cooler.js';
import * as gpu from './bits/gpu.js';
import * as stand from './bits/stand.js';
import * as shell from './bits/shell.js';
import * as panel from './bits/panel.js';
import * as deck from './bits/deck.js';
import * as keys from './bits/keys.js';
import * as mouse from './bits/mouse.js';
import * as desk from './bits/desk.js';
import * as man from './bits/man.js';
import * as cables from './bits/cables.js';

const F = (at, dur, from, tumble, heavy = false) => ({at, dur, from, tumble, heavy});
const wrap = (name, group, flight) => ({name, group, flight, tick: group.userData.tick || null});

/* Back to front does not matter here: the GPU sorts by depth. Parts are listed in the
   order they arrive, so the build reads top to bottom. */
function plan() {
  const list = [
    ['desk', desk, null],
    /* whoever sits at it is there from the first frame: the machine is built in front of them */
    ['man', man, null],
    ['cables', cables, null],
    ['chassis', chassis, F(.12, .8, [-1.3, .3, .35], [.5, .9, .3], true)],
    ['psu', psu, F(.34, .66, [-1, -.95, .3], [.7, .3, .5], true)],
    ['board', board, F(.48, .66, [-.7, 1.15, .2], [.6, .5, .2])],
    ['boardparts', boardparts, F(.48, .66, [-.7, 1.15, .2], [.6, .5, .2])],
    ['cpu', cpu, F(.62, .55, [-.5, 1.25, .1], [1.4, 0, .7])],
    ['cooler', cooler, F(.76, .62, [-1.2, .75, .3], [.4, 1.1, 0])],
    ['gpu', gpu, F(1.04, .7, [-1.3, -.2, .3], [.3, -.9, .2], true)],
    ['drive', drive, F(1.18, .58, [-.9, -1.05, .4], [1, .5, .4])],
    ['roof', roof, F(1.32, .6, [-.4, 1.25, .1], [.5, .2, .5])],
    ['front', front, F(1.42, .62, [-.75, -.25, .7], [.2, .9, .1], true)],
    ['sideglass', sideglass, F(1.56, .66, [-1.35, .1, .2], [0, .6, .2])],
    ['shell', shell, F(.88, .76, [1, .95, -.2], [.5, -1.1, .4], true)],
    ['panel', panel, F(1.14, .62, [1.2, .2, .5], [0, .9, .3])],
    ['deck', deck, F(1.16, .7, [.1, -1.3, .5], [1, .1, .2], true)],
    ['mouse', mouse, F(1.76, .62, [1.3, -.7, .4], [.6, 1.2, .4])],
  ];
  return list;
}

export async function buildRig(ctx, report = () => {}) {
  const parts = [], todo = plan();
  const steps = todo.length + 3;
  let n = 0;
  const tick = async () => { report(++n / steps); await breathe(); };
  for (const [name, mod, flight] of todo) {
    parts.push(wrap(name, mod.make(ctx), flight));
    await tick();
  }
  const sticks = ram.make(ctx);
  sticks.forEach((g, i) => parts.push(wrap(g.name || 'ram' + i, g, F(.88 + i * .06, .52, [-.2 + i * .1, 1.3, .25], [.3, i % 2 ? .7 : -.7, .9]))));
  await tick();
  const [foot, neck] = stand.make(ctx);
  parts.push(wrap('foot', foot, F(.58, .7, [.5, -1.15, .25], [.8, 0, .5], true)));
  parts.push(wrap('neck', neck, F(.72, .62, [.15, -1.2, 0], [.5, .4, 0])));
  await tick();
  const caps = keys.make(ctx), r = rng(4242);
  caps.forEach((g, i) => {
    const a = r() * Math.PI * 2, rr = 1 + r() * .5;
    parts.push(wrap(g.name || 'key-' + i, g, F(1.3 + r() * .52, .5 + r() * .14, [Math.cos(a) * rr, Math.sin(a) * rr + .2, r() * .4], [r() * 5 - 2.5, r() * 5 - 2.5, r() * 5 - 2.5])));
  });
  await tick();
  return parts;
}
export const build = ctx => buildRig(ctx);
export {SCREEN} from './bits/panel.js';
export {THREE};
