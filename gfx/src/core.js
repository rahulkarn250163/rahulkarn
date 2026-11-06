/* The 3D layer's shared core: quality tier, stage (renderer, camera, post), the
   studio lighting, a small material library and the procedural texture and geometry
   helpers. Every part of the page builds on this and nothing here starts a loop. */
import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {Pass, FullScreenQuad} from 'three/addons/postprocessing/Pass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {GTAOPass} from 'three/addons/postprocessing/GTAOPass.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export {THREE};

/* ===== Tier =====
   high: AO, bloom and trails on a discrete GPU. mid: direct render with MSAA, shadows and
   the desk reflection, which an integrated GPU can hold at the full frame rate.
   low: no 3D at all, the page keeps its Canvas 2D drawings. ?tier= overrides. */
let cachedTier = null;
export function detectTier() {
  if (cachedTier) return cachedTier;
  const forced = new URLSearchParams(location.search).get('tier');
  if (forced === 'high' || forced === 'mid' || forced === 'low') return (cachedTier = forced);
  let name = '';
  try {
    const c = document.createElement('canvas'), gl = c.getContext('webgl2');
    if (!gl) return (cachedTier = 'low');
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    name = String(dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    const lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
  } catch (e) {
    return (cachedTier = 'low');
  }
  if (/swiftshader|llvmpipe|software|basic render/i.test(name)) return (cachedTier = 'low');
  const phone = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  const mem = navigator.deviceMemory || 8, cores = navigator.hardwareConcurrency || 4;
  if (phone) return (cachedTier = mem >= 6 && cores >= 6 ? 'mid' : 'low');
  if (mem < 4 || cores < 4) return (cachedTier = 'low');
  if (/intel|uhd|iris|mali|adreno|powervr|radeon\(tm\) graphics|vega \d/i.test(name)) return (cachedTier = 'mid');
  return (cachedTier = 'high');
}
export const gpuName = () => {
  try {
    const gl = document.createElement('canvas').getContext('webgl2'), d = gl.getExtension('WEBGL_debug_renderer_info');
    return String(d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
  } catch (e) { return 'unknown'; }
};

/* Motion trails: each frame blends with the last in linear light, so a fast part smears
   along its path and anything at rest stays sharp. damp 0 turns it off. */
class TrailPass extends Pass {
  constructor() {
    super();
    this.damp = 0;
    const o = {type: THREE.HalfFloatType, depthBuffer: false};
    this.a = new THREE.WebGLRenderTarget(4, 4, o);
    this.b = new THREE.WebGLRenderTarget(4, 4, o);
    this.fresh = true;
    this.mix = new THREE.ShaderMaterial({
      depthTest: false, depthWrite: false,
      uniforms: {tNew: {value: null}, tOld: {value: null}, uDamp: {value: 0}},
      vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
      fragmentShader: 'uniform sampler2D tNew,tOld;uniform float uDamp;varying vec2 vUv;void main(){gl_FragColor=mix(texture2D(tNew,vUv),texture2D(tOld,vUv),uDamp);}',
    });
    this.copy = new THREE.ShaderMaterial({
      depthTest: false, depthWrite: false,
      uniforms: {t: {value: null}},
      vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
      fragmentShader: 'uniform sampler2D t;varying vec2 vUv;void main(){gl_FragColor=texture2D(t,vUv);}',
    });
    this.quad = new FullScreenQuad(this.mix);
  }
  setSize(w, h) { this.a.setSize(w, h); this.b.setSize(w, h); this.fresh = true; }
  reset() { this.fresh = true; }
  render(renderer, writeBuffer, readBuffer) {
    const u = this.mix.uniforms;
    u.tNew.value = readBuffer.texture;
    u.tOld.value = this.b.texture;
    u.uDamp.value = this.fresh ? 0 : this.damp;
    this.fresh = false;
    this.quad.material = this.mix;
    renderer.setRenderTarget(this.a);
    this.quad.render(renderer);
    const s = this.a; this.a = this.b; this.b = s;
    this.copy.uniforms.t.value = this.b.texture;
    this.quad.material = this.copy;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.quad.render(renderer);
  }
  dispose() { this.a.dispose(); this.b.dispose(); this.mix.dispose(); this.copy.dispose(); this.quad.dispose(); }
}

/* The photographic finish, applied last: a gentle curve, lens vignette, a little
   chromatic fringe toward the corners, and fine grain that changes every frame. */
const FILM = {
  uniforms: {tDiffuse: {value: null}, uTime: {value: 0}, uGrain: {value: .022}, uVig: {value: .55}, uCA: {value: .004}, uCurve: {value: .35}},
  vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: `uniform sampler2D tDiffuse;uniform float uTime,uGrain,uVig,uCA,uCurve;varying vec2 vUv;
    float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233))+uTime*91.7)*43758.5453);}
    void main(){
      vec2 c=vUv-.5;float r2=dot(c,c);vec2 off=c*r2*uCA*4.;
      vec3 col=vec3(texture2D(tDiffuse,vUv+off).r,texture2D(tDiffuse,vUv).g,texture2D(tDiffuse,vUv-off).b);
      col=mix(col,col*col*(3.-2.*col),uCurve);
      col*=1.-uVig*smoothstep(.1,.62,r2*1.5);
      col+=(h(vUv*1000.)-.5)*uGrain*(1.-dot(col,vec3(.33))*.6);
      gl_FragColor=vec4(col,1.);
    }`,
};

/* A break in long synchronous work, so the loader keeps counting. Timers, not rAF:
   rAF stops in a background tab and the load must not. */
export const breathe = () => new Promise(r => setTimeout(r, 0));

/* ===== Stage =====
   One canvas, one renderer. alpha:true stages sit on the paper and render directly
   with MSAA; opaque stages may take the post stack (options.post). */
export function createStage(canvas, options = {}) {
  const {
    alpha = false, post = null, exposure = 1, shadows = false, fov = 28, near = 1, far = 4000,
    dprMax = 2, preserve = false, toneMapping = THREE.ACESFilmicToneMapping,
  } = options;
  const renderer = new THREE.WebGLRenderer({
    canvas, alpha, antialias: !post, powerPreference: 'high-performance', preserveDrawingBuffer: preserve, premultipliedAlpha: true,
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = toneMapping;
  renderer.toneMappingExposure = exposure;
  if (alpha) renderer.setClearColor(0x000000, 0);
  if (shadows) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
  }
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, 1, near, far);
  const stage = {
    canvas, renderer, scene, camera, composer: null, fx: {}, dpr: 1, w: 1, h: 1, _dprMax: dprMax, _slow: 0, _last: 0,
    /* css pixels; call on mount and on resize */
    size(w, h) {
      stage.w = w = Math.max(1, Math.round(w));
      stage.h = h = Math.max(1, Math.round(h));
      stage.dpr = Math.min(window.devicePixelRatio || 1, stage._dprMax);
      renderer.setPixelRatio(stage.dpr);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      if (stage.composer) {
        stage.composer.setPixelRatio(stage.dpr);
        stage.composer.setSize(w, h);
      }
    },
    render() {
      if (stage.composer) stage.composer.render();
      else renderer.render(stage.scene, stage.camera);
    },
    /* Everything the GPU would otherwise do on the first visible frame: compile every
       program, upload every texture, run the whole post chain once. */
    async warm() {
      /* parallel compile can stall when the tab draws no frames; the render below finishes it anyway */
      await Promise.race([renderer.compileAsync(stage.scene, stage.camera), new Promise(r => setTimeout(r, 1500))]);
      stage.scene.traverse(o => {
        const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
        ms.forEach(m => {
          for (const k in m) {
            const v = m[k];
            if (v && v.isTexture && !v.isRenderTargetTexture) renderer.initTexture(v);
          }
        });
      });
      await breathe();
      const w = stage.w, h = stage.h;
      stage.render();
      if (stage.w !== w || stage.h !== h) stage.size(w, h);
      await breathe();
    },
    /* For the intro, once a frame with the frame time: a machine that cannot hold the
       rate loses the costliest effect first, within a few frames, and pixels last.
       The page's figures never use this, so they always draw at full resolution. */
    tune(ms) {
      stage._slow = ms > 22 ? stage._slow + 1 : Math.max(0, stage._slow - 1);
      if (stage._slow < 5) return;
      stage._slow = 0;
      if (stage.fx.ao && stage.fx.ao.enabled) { stage.fx.ao.enabled = false; return; }
      if (stage.fx.trail && stage.fx.trail.enabled) { stage.fx.trail.enabled = false; return; }
      if (stage.fx.bloom && stage.fx.bloom.enabled) { stage.fx.bloom.enabled = false; return; }
      if (stage.fx.mirror && stage.fx.mirror.enabled) { stage.fx.mirror.enabled = false; return; }
      if (stage._dprMax > 1) {
        stage._dprMax = Math.max(1, stage._dprMax - .25);
        stage.size(stage.w, stage.h);
      }
    },
    dispose() {
      scene.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
        ms.forEach(m => {
          for (const k in m) { const v = m[k]; if (v && v.isTexture) v.dispose(); }
          m.dispose();
        });
      });
      if (stage.composer) stage.composer.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
  if (post) {
    const tier = detectTier();
    const rt = new THREE.WebGLRenderTarget(4, 4, {type: THREE.HalfFloatType, samples: tier === 'high' ? 4 : 2});
    const composer = stage.composer = new EffectComposer(renderer, rt);
    composer.addPass(new RenderPass(scene, camera));
    if (post.ao && tier === 'high') {
      const ao = new GTAOPass(scene, camera, 4, 4);
      ao.blendIntensity = post.ao === true ? 1 : post.ao;
      ao.updateGtaoMaterial({radius: post.aoRadius || 4, distanceExponent: 1.2, thickness: 1.5, scale: 1.1, samples: 16, distanceFallOff: 1, screenSpaceRadius: false});
      ao.updatePdMaterial({lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, radiusExponent: 2, rings: 2, samples: 16});
      composer.addPass(ao);
      stage.fx.ao = ao;
    }
    if (post.trail && tier === 'high') {
      const trail = new TrailPass();
      composer.addPass(trail);
      stage.fx.trail = trail;
    }
    if (post.bloom) {
      const b = post.bloom;
      const bloom = new UnrealBloomPass(new THREE.Vector2(4, 4), b.strength ?? .35, b.radius ?? .6, b.threshold ?? 1);
      composer.addPass(bloom);
      stage.fx.bloom = bloom;
    }
    composer.addPass(new OutputPass());
    if (post.film) {
      const film = new ShaderPass(FILM);
      Object.entries(post.film).forEach(([k, v]) => { film.uniforms[k].value = v; });
      composer.addPass(film);
      stage.fx.film = film;
    }
  }
  return stage;
}

/* ===== Studio =====
   Product-shot lighting with no image file: a dark room with softboxes, baked to a
   prefiltered environment. Reflections on metal and glass come from these panels.
   mood 'dark' for the intro and the plates, 'paper' for figures set on the page. */
export function studioEnv(renderer, {mood = 'dark', sigma = .02} = {}) {
  const room = new THREE.Scene();
  const bright = mood === 'paper';
  room.background = new THREE.Color(bright ? 0x8a8782 : 0x161616);
  const panel = (w, h, x, y, z, rgb, power) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({color: new THREE.Color(...rgb).multiplyScalar(power), side: THREE.DoubleSide}));
    m.position.set(x, y, z);
    m.lookAt(0, 0, 0);
    room.add(m);
  };
  panel(12, 7, 0, 10, 2, [1, .98, .95], bright ? 5 : 6);    /* overhead softbox */
  panel(2.2, 9, -11, 2, 5, [.86, .92, 1], bright ? 3 : 7);  /* cool strip, camera left */
  panel(3, 9, 12, 3, 2, [1, .9, .8], bright ? 3 : 5);        /* warm kicker, right */
  panel(10, 1.2, 0, 1, -11, [1, 1, 1], bright ? 2 : 6);      /* rim along the back */
  panel(16, 4, 0, -6, 6, [.32, .3, .28], bright ? 1.5 : .5);
  panel(12, 7, 12, -1, 11, [1, .99, .97], bright ? 1 : 1.1);   /* a soft card behind the camera, for glass */
  panel(.7, 14, -13, 3, -3, [1, .98, .94], bright ? 4 : 14);   /* a thin strip behind left: bright edges on every bevel */
  panel(.7, 14, 13, 3, -7, [.85, .9, 1], bright ? 3 : 10);     /* and its cool twin behind right */
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromScene(room, sigma).texture;
  pm.dispose();
  room.traverse(o => { if (o.geometry) { o.geometry.dispose(); o.material.dispose(); } });
  return env;
}

/* ===== Seeded randomness and procedural textures ===== */
export const rng = seed => {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
};
export function canvasTex(w, h, draw, {srgb = true, repeat = null, aniso = 8, mips = true} = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d', {willReadFrequently: false}), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = aniso;
  t.generateMipmaps = mips;
  t.minFilter = mips ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
/* Tangent-space normal map from a grey height canvas (bright is high). */
export function normalFromHeight(srcCanvas, strength = 2, {repeat = null, aniso = 8} = {}) {
  const w = Math.min(srcCanvas.width, 512), h = Math.min(srcCanvas.height, 512);
  const small = document.createElement('canvas');
  small.width = w; small.height = h;
  const sc = small.getContext('2d', {willReadFrequently: true});
  sc.drawImage(srcCanvas, 0, 0, w, h);
  /* a slope spans fewer texels at the smaller size */
  const src = sc.getImageData(0, 0, w, h).data, d = new Uint8Array(w * h * 4), k = strength * w / srcCanvas.width / 255;
  for (let y = 0, i = 0; y < h; y++) {
    const row = y * w, up = (y ? y - 1 : h - 1) * w, down = (y + 1 < h ? y + 1 : 0) * w;
    for (let x = 0; x < w; x++, i += 4) {
      const left = x ? x - 1 : w - 1, right = x + 1 < w ? x + 1 : 0;
      const dx = (src[(row + left) * 4] - src[(row + right) * 4]) * k, dy = (src[(up + x) * 4] - src[(down + x) * 4]) * k;
      const l = .5 / Math.sqrt(dx * dx + dy * dy + 1);
      d[i] = (dx * l + .5) * 255; d[i + 1] = (dy * l + .5) * 255; d[i + 2] = (l + .5) * 255; d[i + 3] = 255;
    }
  }
  const t = new THREE.DataTexture(d, w, h);
  t.colorSpace = THREE.NoColorSpace;
  t.flipY = true;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = aniso;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  t.needsUpdate = true;
  return t;
}
/* Fine speckle for moulded plastic and powder coat, as a height canvas. */
export function speckleCanvas(size = 256, seed = 7, amount = 26) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d'), img = x.createImageData(size, size), r = rng(seed);
  for (let i = 0; i < img.data.length; i += 4) { const v = 128 + (r() - .5) * amount * 2; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  x.putImageData(img, 0, 0);
  return c;
}
/* Directional streaks for brushed metal, as a greyscale roughness canvas. */
export function brushedCanvas(size = 512, seed = 3, base = 150, spread = 16) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d'), r = rng(seed);
  x.fillStyle = `rgb(${base},${base},${base})`;
  x.fillRect(0, 0, size, size);
  const B = 12, n = size * 14;
  for (let b = 0; b < B; b++) {
    const v = Math.round(base + ((b + .5) / B - .5) * spread * 2);
    x.strokeStyle = `rgba(${v},${v},${v},.3)`; x.lineWidth = .4 + r() * .5;
    x.beginPath();
    for (let i = 0; i < n / B; i++) {
      const y = r() * size, l = size * (.2 + r() * .6), s = r() * size;
      x.moveTo(s, y); x.lineTo(s + l, y);
      x.moveTo(s - size, y); x.lineTo(s - size + l, y);
    }
    x.stroke();
  }
  return c;
}

/* ===== Materials =====
   Shared, so one surface is one program. Each call to a factory with no options
   returns the same instance; pass options to get a tuned copy. */
const cache = new Map();
const once = (key, make) => { if (!cache.has(key)) cache.set(key, make()); return cache.get(key); };
const tex = (key, make) => once('t:' + key, make);
const speckN = () => tex('speck', () => normalFromHeight(speckleCanvas(256, 7, 22), 1.1, {repeat: [6, 6]}));
const brushR = () => tex('brushR', () => { const t = new THREE.CanvasTexture(brushedCanvas()); t.colorSpace = THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); t.anisotropy = 8; return t; });

/* Every lit material carries all three maps, blank where it has none, so a whole scene shares
   a few shader programs. Compiling each variant is most of what a first visit waits for. */
const pixel = (key, r, g, b) => tex(key, () => { const t = new THREE.DataTexture(new Uint8Array([r, g, b, 255]), 1, 1); t.needsUpdate = true; return t; });
const blanks = (o = {}) => {
  o = {...o};
  o.map ??= pixel('white', 255, 255, 255);
  o.roughnessMap ??= pixel('white', 255, 255, 255);
  if (!o.normalMap) { o.normalMap = pixel('flat', 128, 128, 255); o.normalScale = new THREE.Vector2(0, 0); }
  return o;
};
export const std = o => new THREE.MeshStandardMaterial(blanks(o));
export const phys = o => new THREE.MeshPhysicalMaterial(blanks(o));
export const mats = {
  /* anodised and brushed metals */
  aluminium: () => once('alu', () => std({color: 0xa9abae, metalness: 1, roughness: .5, roughnessMap: brushR()})),
  spaceGrey: () => once('spg', () => std({color: 0x4b4d52, metalness: 1, roughness: .46, roughnessMap: brushR()})),
  blackAnodised: () => once('blk', () => std({color: 0x17181a, metalness: .9, roughness: .46, roughnessMap: brushR()})),
  steel: () => once('steel', () => std({color: 0x8d9094, metalness: 1, roughness: .38})),
  chrome: () => once('chrome', () => std({color: 0xe4e6e8, metalness: 1, roughness: .08})),
  copper: () => once('copper', () => std({color: 0xc47a4a, metalness: 1, roughness: .32})),
  gold: () => once('gold', () => std({color: 0xd7ad5b, metalness: 1, roughness: .25})),
  /* powder-coated steel, the case */
  powder: (c = 0x1a1b1d) => once('pow' + c, () => std({color: c, metalness: .12, roughness: .62, normalMap: speckN(), normalScale: new THREE.Vector2(.22, .22)})),
  /* moulded plastics */
  plastic: (c = 0x151618) => once('pla' + c, () => std({color: c, metalness: 0, roughness: .52, normalMap: speckN(), normalScale: new THREE.Vector2(.12, .12)})),
  gloss: (c = 0x0c0c0d) => once('glo' + c, () => phys({color: c, metalness: 0, roughness: .22, clearcoat: 1, clearcoatRoughness: .08})),
  rubber: (c = 0x0b0b0c) => once('rub' + c, () => std({color: c, metalness: 0, roughness: .88})),
  lacquer: (c = 0x9e1c1c) => once('lac' + c, () => phys({color: c, metalness: .3, roughness: .34, clearcoat: 1, clearcoatRoughness: .1})),
  /* glass that does not need a transmission pass: thin, reflective, see-through */
  glass: (opacity = .14) => once('gla' + opacity, () => phys({color: 0x07090a, metalness: 0, roughness: .04, transparent: true, opacity, envMapIntensity: 2.2, clearcoat: 1, clearcoatRoughness: .02, side: THREE.DoubleSide, depthWrite: false})),
  /* light sources; bloom picks up anything brighter than 1 */
  glow: (c = 0xe0644f, power = 3) => once('glw' + c + power, () => new THREE.MeshBasicMaterial({color: new THREE.Color(c).multiplyScalar(power), toneMapped: true})),
};

/* ===== Geometry helpers =====
   Coordinates are desk units, about 1 cm: x across, y up, z toward the reader. */
/* A rounded box from two opposite corners, already in place. */
export function rbox(x0, y0, z0, x1, y1, z1, r = .1, seg = 3) {
  const w = Math.abs(x1 - x0), h = Math.abs(y1 - y0), d = Math.abs(z1 - z0);
  const rr = Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3);
  const g = rr > .001 ? new RoundedBoxGeometry(w, h, d, seg, rr) : new THREE.BoxGeometry(w, h, d);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return g;
}
/* A plain box from two corners, for anything small enough that a bevel is wasted. */
export function box(x0, y0, z0, x1, y1, z1) {
  const g = new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0));
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return g;
}
/* Merge a list of geometries into one draw call. Mixed index/uv layouts are normalised. */
export function merge(list) {
  const norm = list.map(g => {
    const n = g.index ? g.toNonIndexed() : g;
    ['uv1', 'uv2', 'tangent', 'color'].forEach(a => { if (n.attributes[a]) n.deleteAttribute(a); });
    if (!n.attributes.normal) n.computeVertexNormals();
    if (!n.attributes.uv) n.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n.attributes.position.count * 2), 2));
    return n;
  });
  const out = mergeGeometries(norm, false);
  norm.forEach(n => n.dispose());
  return out;
}
export function mesh(geo, mat, {cast = true, receive = true} = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}
/* A flat plate on a plane, for labels and printed detail. axis names the normal. */
export function plate(axis, at, a0, b0, a1, b1) {
  const sideways = axis === '-x' || axis === '+x';
  const w = Math.abs(sideways ? b1 - b0 : a1 - a0), h = Math.abs(sideways ? a1 - a0 : b1 - b0), g = new THREE.PlaneGeometry(w, h);
  const ca = (a0 + a1) / 2, cb = (b0 + b1) / 2;
  if (axis === '+z') g.translate(ca, cb, at);
  else if (axis === '-z') { g.rotateY(Math.PI); g.translate(ca, cb, at); }
  else if (axis === '-x') { g.rotateY(-Math.PI / 2); g.translate(at, ca, cb); }
  else if (axis === '+x') { g.rotateY(Math.PI / 2); g.translate(at, ca, cb); }
  else if (axis === '+y') { g.rotateX(-Math.PI / 2); g.translate(ca, at, cb); }
  else if (axis === '-y') { g.rotateX(Math.PI / 2); g.translate(ca, at, cb); }
  return g;
}
export const count = root => {
  let draws = 0, tris = 0;
  root.traverse(o => {
    if (o.isMesh) {
      draws++;
      const n = o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count;
      tris += (n / 3) * (o.isInstancedMesh ? o.count : 1);
    }
  });
  return {draws, tris: Math.round(tris)};
};
