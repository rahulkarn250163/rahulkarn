import {THREE, rng} from '../core.js';

const VERT = `
attribute float aSeed;
attribute float aRed;
uniform float uK, uT;
varying float vA;
varying float vRed;
void main(){
  vec3 p = position;
  float d = aSeed * .4;
  float e = clamp((uK - d) / (1. - d), 0., 1.);
  e = e * e * (3. - 2. * e);
  p.y = mix(6., p.y, e);
  vA = e * (.65 + .35 * sin(uT * (.6 + aSeed) + aSeed * 40.));
  vRed = aRed;
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_PointSize = 4.2 * 300. / -mv.z;
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = `
varying float vA;
varying float vRed;
void main(){
  float r = length(gl_PointCoord - .5);
  float a = smoothstep(.5, .15, r) * vA;
  if (a < .004) discard;
  gl_FragColor = vec4(mix(vec3(.96,.92,.84), vec3(.88,.39,.31), vRed), a);
}`;

export function makeFuture({count = 700} = {}) {
  const group = new THREE.Group();
  group.visible = false;

  const ringMat = new THREE.MeshBasicMaterial({color: '#ff6a45', transparent: true});
  const rings = [72, 86].map(R => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(R, .14, 6, 96), ringMat);
    m.rotation.x = Math.PI / 2;
    m.position.y = 2;
    group.add(m);
    return m;
  });

  const r = rng(4107), pos = new Float32Array(count * 3), seed = new Float32Array(count), red = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const R = 40 + 50 * r(), a = r() * Math.PI * 2, c = r();
    const s = Math.sqrt(1 - c * c);
    pos[i * 3] = R * s * Math.cos(a);
    pos[i * 3 + 1] = Math.max(6 + 2 * r(), R * c);
    pos[i * 3 + 2] = R * s * Math.sin(a);
    seed[i] = r();
    red[i] = r() < .12 ? 1 : 0;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  geo.setAttribute('aRed', new THREE.BufferAttribute(red, 1));
  const uniforms = {uK: {value: 0}, uT: {value: 0}};
  const points = new THREE.Points(geo, new THREE.ShaderMaterial({uniforms, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false}));
  points.frustumCulled = false;
  group.add(points);

  return {group, set(k, t) {
    group.visible = k > 0;
    const s = Math.max(k, .0001);
    ringMat.opacity = Math.min(1, k * 2);
    rings[0].scale.set(s, s, 1);
    rings[1].scale.set(s, s, 1);
    rings[0].rotation.z = t * .03;
    rings[1].rotation.z = -t * .02;
    uniforms.uK.value = k;
    uniforms.uT.value = t;
  }};
}
