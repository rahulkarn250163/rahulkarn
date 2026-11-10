// A headline denoised epoch by epoch, the way a diffusion model resolves an image.

const NS = 'http://www.w3.org/2000/svg';
const EPOCHS = 16;
const STEP_MS = 105;
const LOSS_START = 0.842;
const LOSS_END = 0.003;

let uid = 0;

export const css = `
.ty-train .ty-l, .ty-train-a .ty-l { visibility: hidden; }
.ty-train .ty-c, .ty-train-a .ty-c { opacity: 1; }
.ty-train .ty-rd {
  position: absolute;
  right: 0;
  top: -1.25em;
  font-size: .3em;
  letter-spacing: .06em;
  font-variant-numeric: tabular-nums lining-nums;
  color: var(--gray);
  white-space: pre;
}
.ty-train .ty-sp {
  position: absolute;
  right: 0;
  top: -.85em;
  width: 3.4em;
  height: .5em;
  overflow: visible;
  stroke: #ff6a45;
  fill: none;
  stroke-width: 1;
}
`;

function make(name, attrs, parent) {
  const node = document.createElementNS(NS, name);
  for (const key in attrs) node.setAttribute(key, attrs[key]);
  if (parent) parent.appendChild(node);
  return node;
}

// Shared by the headline and its accents, so both resolve from the same noise.
function rig(t) {
  const layer = t.overlay('ty-train-o');
  const id = `ty-train-f${++uid}`;
  // Zero size rather than display none, which would disable the filter.
  const svg = make('svg', { width: 0, height: 0, style: 'position:absolute' }, layer);
  // sRGB keeps neutral noise at .5, so the text does not drift off its baseline.
  const filter = make('filter', {
    id,
    filterUnits: 'objectBoundingBox',
    x: '-10%',
    y: '-60%',
    width: '120%',
    height: '220%',
    'color-interpolation-filters': 'sRGB',
  }, svg);
  const noise = make('feTurbulence', {
    type: 'fractalNoise',
    baseFrequency: '.55',
    numOctaves: 2,
    seed: 1,
    result: 'n',
  }, filter);
  const warp = make('feDisplacementMap', {
    in: 'SourceGraphic',
    in2: 'n',
    scale: 0,
    xChannelSelector: 'R',
    yChannelSelector: 'G',
  }, filter);
  return { layer, noise, warp, url: `url(#${id})` };
}

function attach(t, url) {
  for (const line of t.lines) {
    line.style.filter = url;
    line.style.visibility = 'visible';
  }
}

function release(t) {
  for (const line of t.lines) {
    line.style.filter = '';
    line.style.opacity = '';
    line.style.visibility = 'visible';
  }
}

function fade(t, node) {
  return t.animate(node, [{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: 'ease-out' })
    .finished.catch(() => {});
}

export async function play(t) {
  const { layer, noise, warp, url } = rig(t);
  const readout = document.createElement('span');
  readout.className = 'ty-rd';
  layer.appendChild(readout);
  const spot = t.beside(2.6 * t.fs);
  readout.style.cssText = `right:auto;left:${spot.left}px;top:${spot.top}px;font-size:${Math.max(10, .27 * t.fs)}px`;
  // Stretched viewBox with a non scaling stroke holds the line at 1px at any size.
  const spark = make('svg', { class: 'ty-sp', viewBox: '0 0 100 100', preserveAspectRatio: 'none' }, layer);
  spark.style.cssText = `right:auto;left:${spot.left}px;top:${spot.top + .36 * t.fs}px;width:${2.2 * t.fs}px;height:${.3 * t.fs}px`;
  const trace = make('polyline', { 'vector-effect': 'non-scaling-stroke' }, spark);
  const points = [];
  const last = EPOCHS - 1;

  for (const line of t.lines) line.style.opacity = '.35';
  attach(t, url);

  // Stepped on purpose: it reads as discrete training steps and costs less per frame.
  for (let i = 0; i < EPOCHS; i++) {
    const k = i / last;
    const decay = Math.pow(1 - k, 2.1);
    const loss = LOSS_END + (LOSS_START - LOSS_END) * decay;
    noise.setAttribute('seed', i + 1);
    warp.setAttribute('scale', 90 * decay);
    for (const line of t.lines) line.style.opacity = .35 + .65 * k;
    const epoch = String(Math.round(1 + 99 * k)).padStart(3, '0');
    const milli = String(Math.round(loss * 1000)).padStart(3, '0');
    readout.textContent = `epoch ${epoch}  loss .${milli}`;
    points.push(`${(100 * k).toFixed(2)},${(100 * (1 - decay)).toFixed(2)}`);
    trace.setAttribute('points', points.join(' '));
    if (i < last) {
      await t.wait(STEP_MS);
      if (t.stopped) return;
    }
  }

  release(t);
  await Promise.all([fade(t, readout), fade(t, spark)]);
  layer.remove();
}

export const accents = '.edu-year';

export async function accent(t) {
  const { layer, noise, warp, url } = rig(t);
  warp.setAttribute('scale', 24);
  attach(t, url);
  for (let i = 0; i < 6; i++) {
    noise.setAttribute('seed', i + 1);
    warp.setAttribute('scale', 24 * (1 - i / 5));
    if (i < 5) {
      await t.wait(70);
      if (t.stopped) return;
    }
  }
  release(t);
  layer.remove();
}
