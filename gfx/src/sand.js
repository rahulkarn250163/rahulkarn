// Shared GPU sand: grains that gather into shapes. All motion lives in the shader.
import {THREE, rng} from './core.js';

const VERT = `
attribute vec2 aTarget;
attribute vec2 aStart;
attribute float aDelay;
attribute float aGroup;
attribute float aZ;
attribute vec3 aColor;
uniform float uF[17];
uniform float uScale;
uniform float uSize;
varying float vAlpha;
varying vec3 vColor;
void main(){
  float f = uF[int(aGroup + .5)];
  float g = clamp((f - aDelay) / .55, 0., 1.);
  float e = 1. - pow(1. - g, 3.);
  vec2 p = mix(aStart, aTarget, e);
  vAlpha = (.35 + .6 * g) * (1. - clamp((f - .78) / .22, 0., 1.));
  if (f <= 0. || f >= 1.) vAlpha = 0.;
  vColor = aColor;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, aZ, 1.);
  gl_PointSize = uSize * uScale;
}`;

const FRAG = `
varying float vAlpha;
varying vec3 vColor;
void main(){
  if (vAlpha <= 0.) discard;
  float d = length(gl_PointCoord - .5) * 2.;
  float a = vAlpha * (1. - smoothstep(.45, 1., d));
  if (a <= 0.) discard;
  gl_FragColor = vec4(vColor * a, a);
}`;

export function makeSand(groups, {size = 1.6} = {}) {
  const total = groups.reduce((n, g) => n + g.count, 0);
  const target = new Float32Array(total * 2), start = new Float32Array(total * 2);
  const delay = new Float32Array(total), group = new Float32Array(total);
  const z = new Float32Array(total), color = new Float32Array(total * 3);
  const c = new THREE.Color();
  let n = 0;
  groups.forEach(({rect: [x, y, w, h], count, seed = 1, spread = 1, color: col = 0xffffff}, gi) => {
    const r = rng(seed);
    c.set(col);
    for (let i = 0; i < count; i++, n++) {
      const tx = x + r() * w, ty = y + r() * h;
      const ang = r() * Math.PI * 2, off = r() * spread;
      target[n * 2] = tx; target[n * 2 + 1] = ty;
      start[n * 2] = tx + Math.cos(ang) * off; start[n * 2 + 1] = ty + Math.sin(ang) * off;
      delay[n] = r() * .42; group[n] = gi; z[n] = (r() - .5) * .02;
      color[n * 3] = c.r; color[n * 3 + 1] = c.g; color[n * 3 + 2] = c.b;
    }
  });
  const geo = new THREE.BufferGeometry();
  const set = (name, arr, k) => geo.setAttribute(name, new THREE.BufferAttribute(arr, k));
  // position mirrors aStart so three has a position attribute to count vertices and bound by
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(total * 3), 3));
  set('aTarget', target, 2); set('aStart', start, 2); set('aDelay', delay, 1);
  set('aGroup', group, 1); set('aZ', z, 1); set('aColor', color, 3);
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG,
    uniforms: {uF: {value: new Array(17).fill(0)}, uScale: {value: 1}, uSize: {value: size}},
    transparent: true, depthWrite: false, blending: THREE.NormalBlending, premultipliedAlpha: true,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  return {points, setProgress(i, f) { mat.uniforms.uF.value[i] = f; }, dispose() { geo.dispose(); mat.dispose(); }};
}
