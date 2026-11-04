/* The swarm. The nanobots that set the lead do not go away: they run down the page's right margin as a
   thread of ink, and in every section's empty space they build that section's machine, the way a newspaper
   engraving is built from dots. One population, one draw call, drawn over the page so the type below it is
   never touched, and masked to the empty space so nothing lands on the words. Web widths only. */
const N = 25000;
const MIN_WIDTH = 1024;
const TAU = Math.PI * 2;

const rng = s => () => {
  s = s + 0x6D2B79F5 | 0;
  let t = Math.imul(s ^ s >>> 15, 1 | s);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};
const smooth = x => x * x * (3 - 2 * x);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const mix = (a, b, k) => a + (b - a) * k;

/* ---- formations: each fills n points of x, y, z, w; the vertex shader brings them to life ---- */

/* the thread down the margin, a double helix like the one in the lead */
function thread(put, n, r) {
  for (let i = 0; i < n; i++) put(i % 2 ? 1 : -1, r() * 2.4 - 1.2, 0, 0);
}

/* About: the architecture as a stack of five plates, read top to bottom */
function tower(put, n, r) {
  const plates = Math.floor(n * .74);
  for (let i = 0; i < n; i++) {
    if (i < plates) {
      const k = Math.floor(r() * 5), y = -1 + k * .5, H = .72;
      let x, z;
      const pick = r();
      if (pick < .24) { /* the plate's edge */
        const u = r() * 2 - 1, side = Math.floor(r() * 4);
        x = side < 2 ? u * H : (side === 2 ? H : -H);
        z = side < 2 ? (side ? H : -H) : u * H;
      } else if (pick < .84) { /* its grid */
        const line = (Math.floor(r() * 7) - 3) / 3 * H, u = r() * 2 - 1;
        if (r() < .5) { x = line; z = u * H; } else { x = u * H; z = line; }
      } else { /* a block sitting on it */
        const bx = (Math.floor(r() * 3) - 1) * .42, bz = (Math.floor(r() * 3) - 1) * .42;
        x = bx + (r() - .5) * .22;
        z = bz + (r() - .5) * .22;
      }
      put(x, y + (r() - .5) * .006, z, k / 5);
    } else { /* the columns between plates */
      const cx = (Math.floor(r() * 5) - 2) * .36, cz = (Math.floor(r() * 5) - 2) * .36, u = r();
      put(cx, u * 2 - 1, cz, 1 + u * .999);
    }
  }
}

const pickLevel = (w, u) => { let i = 0; while (i < w.length - 1 && u > w[i]) u -= w[i++]; return i; };

/* Expertise: a Merkle tree, thirty-two leaves hashed up to one root */
function merkle(put, n, r) {
  const L = 5, nodeX = (l, i) => ((i + .5) / (1 << l) - .5) * 3.3, nodeY = l => .92 - l * 1.84 / L, nodeZ = (l, i) => Math.sin(i * 2.4 + l * 1.3) * .28;
  for (let i = 0; i < n; i++) {
    const pick = r();
    if (pick < .62) {
      /* an edge; each level gets points for how much line it has to draw */
      const l = pickLevel([.07, .11, .17, .26, .39], r()), p = Math.floor(r() * (1 << l)), b = r() < .5 ? 0 : 1, c = p * 2 + b, u = r(), e = smooth(u);
      put(mix(nodeX(l, p), nodeX(l + 1, c), e) + (r() - .5) * .006, mix(nodeY(l), nodeY(l + 1), u) + (r() - .5) * .006, mix(nodeZ(l, p), nodeZ(l + 1, c), u), c + (1 << l + 1) + (1 - (l + u) / L) * .999);
    } else if (pick < .9) {
      const l = pickLevel([.03, .05, .09, .15, .26, .42], r()), k = Math.floor(r() * (1 << l)), a = r() * TAU, R = (.024 + (L - l) * .009) * (r() < .62 ? 1 : Math.sqrt(r()));
      put(nodeX(l, k) + Math.cos(a) * R, nodeY(l) + Math.sin(a) * R, nodeZ(l, k), k + (1 << l) + (1 - l / L) * .999);
    } else { /* the data each leaf hashes, falling away below it */
      const k = Math.floor(r() * (1 << L)), d = r();
      put(nodeX(L, k) + (r() - .5) * .05, nodeY(L) - .06 - d * d * .3, nodeZ(L, k), k + (1 << L));
    }
  }
}

/* Case Studies: three sources rippling across one surface, three systems from one insurer */
function waves(put, n, r) {
  const rows = Math.round(Math.sqrt(n * .52)), cols = Math.ceil(n / rows);
  for (let i = 0; i < n; i++) {
    const a = i % cols, b = Math.floor(i / cols);
    put(((a + r()) / cols * 2 - 1) * 1.85, 0, ((b + r() * .7) / rows * 2 - 1) * 1.1, 0);
  }
}

/* Open Source: a star chart, bent by a mass nobody can see */
function stars(put, n, r) {
  for (let i = 0; i < n; i++) put((r() * 2 - 1) * 2.1, (r() * 2 - 1) * 1.1, 0, Math.pow(r(), 3));
}

/* Experience: nine frames, one a year, flown through */
function frames(put, n, r) {
  const W = 1.55, H = 1;
  for (let i = 0; i < n; i++) {
    const k = Math.floor(r() * 9), pick = r();
    if (pick < .84) {
      const u = r() * (W + H) * 4;
      let x, y;
      if (u < W * 2) { x = u - W; y = H; } else if (u < W * 2 + H * 2) { x = W; y = H - (u - W * 2); } else if (u < W * 4 + H * 2) { x = W - (u - W * 2 - H * 2); y = -H; } else { x = -W; y = -H + (u - W * 4 - H * 2); }
      put(x + (r() - .5) * .012, y + (r() - .5) * .012, 0, k / 9);
    } else if (pick < .94) { /* twelve month ticks along the foot */
      const m = Math.floor(r() * 13) / 12;
      put((m * 2 - 1) * W, -H + r() * .1, 0, k / 9);
    } else { /* rays running between the frames */
      const a = r() * TAU, s = Math.min(W / Math.abs(Math.cos(a) || 1e-3), H / Math.abs(Math.sin(a) || 1e-3));
      put(Math.cos(a) * s, Math.sin(a) * s, 0, r());
    }
  }
}

/* Education: a network, its links thinning to the ones that matter as it trains */
function neural(put, n, r) {
  const layers = [4, 6, 8, 6, 3], nodes = [];
  layers.forEach((m, l) => {
    for (let j = 0; j < m; j++) nodes.push([(l / (layers.length - 1) * 2 - 1) * 1.55, m > 1 ? (j / (m - 1) * 2 - 1) * (.28 + m * .09) : 0, l, j]);
  });
  const edges = [];
  nodes.forEach(a => nodes.forEach(b => { if (b[2] === a[2] + 1) edges.push([a, b]); }));
  for (let i = 0; i < n; i++) {
    if (r() < .72) {
      const g = Math.floor(r() * edges.length), [a, b] = edges[g], u = r();
      put(mix(a[0], b[0], u), mix(a[1], b[1], smooth(u)), 0, g + (a[2] + u) / (layers.length - 1) * .999);
    } else {
      const k = Math.floor(r() * nodes.length), a = r() * TAU, R = .068 * (r() < .7 ? 1 : Math.sqrt(r()));
      put(nodes[k][0] + Math.cos(a) * R, nodes[k][1] + Math.sin(a) * R, 0, 1000 + k + nodes[k][2] / layers.length);
    }
  }
}

/* Contact: thirty-six channels of a recording, signal rising out of the noise */
function ridges(put, n, r) {
  const rows = 36;
  for (let i = 0; i < n; i++) {
    const k = Math.floor(r() * rows);
    put(r() * 2 - 1, 1.38 - k / (rows - 1) * 2.76, 0, k / (rows - 1));
  }
}

/* ---- the machines come alive here ---- */
const VS = `#version 300 es
precision highp float;
in vec4 aA;in vec4 aB;in vec4 aS;
uniform float uT,uMix,uLag,uPx,uS;
uniform vec2 uRes,uCtrl;
uniform vec4 uRect[2];uniform vec4 uMask[2];
uniform int uMode[2];
uniform float uScrub[2];uniform float uDens[2];
uniform vec3 uAcc[2];
uniform vec3 uInk;
out vec4 vC;
const float PI=3.14159265;
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,s,-s,c);}
float sq(float x){return x*x;}
void place(int i,vec4 p,vec4 s,out vec2 pos,out float a,out float glow,out float near){
  int mode=uMode[i];float sc=uScrub[i],t=uT;
  vec3 q=p.xyz;a=1.;glow=0.;
  if(mode==0){
    float y=mod(p.y+t*.035+uS*.5+1.2,2.4)-1.2,ph=y*8.+t*.6+(p.x>0.?0.:PI);
    q=vec3(sin(ph)*.03+(s.y-.5)*.007,y,cos(ph)*.6);
  }else if(mode==1){
    float role=floor(p.w),f=fract(p.w);
    q.y*=mix(.6,1.12,smoothstep(.08,.72,sc));
    float scan=mod(t*.42,3.6)-1.8;
    glow=exp(-sq((q.y-scan)/.05));
    if(role>.5){
      a=.6;
      glow=max(glow,smoothstep(.93,1.,fract(f*2.-t*.5+floor(s.x*6.)*.17)));
    }
    q.xz=rot(t*.22+sc*2.8)*q.xz;
    q.yz=rot(-.46)*q.yz;
  }else if(mode==2){
    float g=floor(p.w),h=fract(p.w);
    float built=smoothstep(h-.14,h+.03,sc*2.5-.1);
    q.y-=(1.-built)*(.3+s.x*.5);
    q.x+=(1.-built)*(s.y-.5)*.8;
    a=mix(.16,1.,built);
    q.yz=rot((sc-.45)*1.1)*q.yz;
    q.xz=rot(sin(t*.23)*.2+(sc-.45)*.55)*q.xz;
    float pl=fract(t*.3+fract(g*.618));
    glow=exp(-sq((h-pl)/.028))*built;
    glow=max(glow,step(.97,h)*smoothstep(.8,1.,sin(t*1.9))*built);
  }else if(mode==3){
    vec2 g=p.xz;
    float r0=length(g-vec2(-1.05,-.15)),r1=length(g-vec2(.08,.42)),r2=length(g-vec2(1.08,-.28));
    float w=sin(r0*15.-t*3.2)/(1.+r0*1.7)+sin(r1*15.-t*2.9)/(1.+r1*1.7)+sin(r2*15.-t*3.5)/(1.+r2*1.7);
    float c=smoothstep(.4,.62,sc);
    float pk=exp(-r0*r0*30.)+exp(-r1*r1*30.)+exp(-r2*r2*30.);
    float y=w*mix(.2,.022,c)+pk*.9*c;
    glow=smoothstep(.17,.36,y);
    q=vec3(g.x,y,g.y);
    q.yz=rot(-1.08+sc*.34)*q.yz;
    q.xz=rot(sin(t*.15)*.14+(sc-.5)*.5)*q.xz;
    a=.5+.5*smoothstep(-.3,.3,w*.3+pk);
  }else if(mode==4){
    vec2 c=vec2(mix(-1.25,1.25,sc)+sin(t*.17)*.08,sin(t*.29)*.16);
    vec2 d=p.xy-c;float r=max(length(d),.02),te=.42;
    vec2 im=d*(1.+te*te/(r*r));
    if(s.z<.26){
      float ri=te*te/r;
      im=-d/r*min(ri,te*.97);
      a=r<1.05?.7:0.;
    }
    float rr=length(im);
    q=vec3(c+im,(.5-p.w)*1.3);
    glow=exp(-sq((rr-te)/.045));
    a*=.32+.68*p.w+glow*.5;
  }else if(mode==5){
    float zz=fract(p.w+t*.024+uS*.42);
    float f=mix(.05,1.75,zz*zz);
    q=vec3(p.xy*f+vec2(sin(t*.31),cos(t*.23))*.05*(1.-zz),(.5-zz)*1.1);
    a=smoothstep(0.,.2,zz)*smoothstep(.98,.72,zz);
    glow=exp(-sq((zz-.5)/.03));
  }else if(mode==6){
    float tr=smoothstep(.04,.42,sc);
    q.xy+=(s.xy-.5)*(1.-tr)*vec2(.8,.7);
    q.xz=rot(sin(t*.19)*.24)*q.xz;
    if(p.w>=1000.){
      glow=smoothstep(.72,1.,sin(t*2.+floor(p.w)*1.7))*tr;
    }else{
      float g=floor(p.w),al=fract(p.w),strong=step(.42,fract(g*.618));
      a=mix(.38,mix(.07,.9,strong),tr);
      glow=exp(-sq((al-fract(t*.3+fract(g*.37)*.7))/.028))*strong*tr;
    }
  }else if(mode==7){
    float row=p.w,amp=mix(.03,1.,smoothstep(.02,.46,sc));
    float win=exp(-sq(p.x*2.25));
    float n=sin(p.x*7.+row*41.+t*.8)*.5+sin(p.x*17.-row*73.+t*1.3)*.32+sin(p.x*37.+row*131.-t*2.1)*.18;
    n=n*.5+.5;n*=n;
    float sp=exp(-sq((row-fract(t*.085))*24.));
    q.y=p.y+win*(n*.36+sp*.24)*amp+(1.-win)*.006*n;
    q.z=(.5-row)*.9;
    q.xz=rot(sin(t*.13)*.12)*q.xz;
    a=.42+.58*win;
    glow=sp*win*amp;
  }
  float f=1./(1.+q.z*.3);
  pos=uRect[i].xy+vec2(q.x,-q.y)*f*uRect[i].z;
  near=clamp(.5-q.z*.55,0.,1.);
  vec4 m=uMask[i];
  a*=smoothstep(m.x,m.x+36.,pos.x)*smoothstep(m.z,m.z-8.,pos.x)*smoothstep(m.y,m.y+22.,pos.y)*smoothstep(m.w,m.w-22.,pos.y);
  a*=uRect[i].w*step(s.w,uDens[i]);
}
void main(){
  vec2 pa,pb;float aa,ab,ga,gb,na,nb;
  place(0,aA,aS,pa,aa,ga,na);
  place(1,aB,aS,pb,ab,gb,nb);
  float d=aS.x*.42,k=smoothstep(d,d+.58,uMix),w=sin(k*PI);
  vec2 c=uCtrl+vec2((aS.y-.5)*34.,(aS.z-.5)*uRes.y*.95);
  vec2 pos=(1.-k)*(1.-k)*pa+2.*k*(1.-k)*c+k*k*pb;
  pos+=vec2(sin(aS.y*6.283+uT*1.4),cos(aS.z*6.283+uT*1.1))*14.*w;
  pos+=vec2((aS.y-.5)*30.,(aS.w-.5)*150.)*uLag;
  float a=mix(aa,ab,k)*(1.-.8*w)*step(aS.w,mix(1.,.5,w)),g=clamp(mix(ga,gb,k),0.,1.),n=mix(na,nb,k);
  vC=vec4(mix(uInk,mix(uAcc[0],uAcc[1],k),g),clamp(a*(.5+n*.4+g*.5),0.,1.));
  gl_Position=vC.a<.004?vec4(2.,2.,2.,1.):vec4(pos.x/uRes.x*2.-1.,1.-pos.y/uRes.y*2.,0.,1.);
  gl_PointSize=(1.2+n*.8+aS.z*.32)*(1.+g*.8)*(1.-.3*w)*uPx;
}`;

const FS = `#version 300 es
precision mediump float;
in vec4 vC;out vec4 o;
void main(){
  vec2 d=gl_PointCoord-.5;
  float a=vC.a*smoothstep(.25,.1,dot(d,d));
  o=vec4(vC.rgb*a,a);
}`;

/* ---- where each machine goes: the empty space, measured from the page's own type ---- */
const docOf = el => {
  const b = el.getBoundingClientRect();
  return {l: b.left + scrollX, t: b.top + scrollY, r: b.right + scrollX, b: b.bottom + scrollY};
};
/* how far right the words really reach: block boxes run the full column, so this reads the text itself */
function inkRight(els) {
  let m = 0;
  const range = document.createRange();
  els.forEach(el => {
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) {
      if (!w.currentNode.nodeValue.trim()) continue;
      range.selectNodeContents(w.currentNode);
      for (const b of range.getClientRects()) m = Math.max(m, b.right);
    }
  });
  return m + scrollX;
}
const pageRight = () => document.documentElement.clientWidth - 4;
const box = (l, r, t, b) => ({cx: (l + r) / 2, w: r - l, h: b - t, cy: (t + b) / 2});

/* the band beside a section's header */
function band(id) {
  const sec = document.getElementById(id);
  if (!sec) return null;
  const head = sec.querySelector('.sec-header') || sec, s = docOf(sec), words = [...sec.querySelectorAll('.sec-heading,.sec-desc')];
  return {sec: s, head: docOf(head), r0: box(inkRight(words) + 36, pageRight(), s.t + 8, docOf(head).b + 24)};
}
/* a band that then follows the reader down a column left free beside the section's rows */
function pinned(id, rows) {
  const b = band(id);
  if (!b) return null;
  const col = inkRight([...document.querySelectorAll(rows)]) + 30, w = pageRight() - col, H = innerHeight;
  if (w < 230) return {r0: b.r0, r1: b.r0, y0: b.r0.cy, y1: b.r0.cy};
  const r1 = box(col, pageRight(), 0, Math.min(H * .74, w * 1.25));
  return {r0: b.r0, r1, y0: b.r0.cy, y1: Math.max(b.r0.cy, b.sec.b - r1.h / 2 - 16)};
}

const INK = {about: ['#0f8fb5', '#54c8e8'], skills: ['#9e1c1c', '#e0644f'], cases: ['#6b3fc4', '#a98cf2'], oss: ['#c8541a', '#f08a4b'], exp: ['#b7791f', '#e6b45a'], edu: ['#1c8a5a', '#57cf9c'], contact: ['#9e1c1c', '#e0644f']};
const SCENES = [
  {id: 'about', mode: 1, gen: tower, ex: 1.02, ey: 1.42, dens: .9, place() {
    const q = document.querySelector('#about .pull-quote'), s = document.getElementById('about');
    if (!q || !s) return null;
    const a = docOf(q), b = docOf(s), jump = s.querySelector('.jump');
    return {r0: box(a.l - 12, pageRight(), a.b + 8, (jump ? docOf(jump).t : b.b) - 6)};
  }},
  {id: 'skills', mode: 2, gen: merkle, ex: 1.72, ey: 1.12, dens: .9, place: () => band('skills')},
  {id: 'cases', mode: 3, gen: waves, ex: 1.62, ey: .92, dens: 1, place: () => band('case-studies')},
  {id: 'oss', mode: 4, gen: stars, ex: 1.75, ey: 1, dens: .34, place() {
    const s = document.getElementById('open-source'), h = s && s.querySelector('.sec-heading'), e = s && s.querySelector('.oss-head > .eclipse');
    if (!h) return null;
    const a = docOf(s), b = docOf(h), right = e ? docOf(e).l - 10 : pageRight();
    return {r0: box(inkRight([h]) + 28, right, a.t + 8, b.b + 8)};
  }},
  {id: 'exp', mode: 5, gen: frames, ex: 1.55, ey: 1, dens: 1, place: () => pinned('experience', '#experience .timeline-block')},
  {id: 'edu', mode: 6, gen: neural, ex: 1.72, ey: 1.02, dens: .82, place: () => pinned('education', '#education .edu-card')},
  {id: 'contact', mode: 7, gen: ridges, ex: 1.02, ey: 1.42, dens: .95, place() {
    const s = document.getElementById('contact'), c = s && s.querySelector('.classified');
    if (!c) return null;
    const a = docOf(s), b = docOf(c);
    return {r0: box(b.r + 30, pageRight(), a.t + 8, a.b - 8)};
  }},
];

let stopFn = () => {};
export function stop() { stopFn(); }

/* setup comes in small pieces, each when the page has nothing else to do, so nothing the reader is watching stutters */
const idle = () => new Promise(res => { if (window.requestIdleCallback) requestIdleCallback(res, {timeout: 500}); else setTimeout(res, 40); });

async function init() {
  let dead = false;
  stopFn = () => { dead = true; };
  await idle();
  if (dead) return;
  const canvas = document.createElement('canvas');
  canvas.id = 'swarm';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;z-index:6;pointer-events:none;display:none';
  const sheet = document.createElement('style');
  sheet.textContent = '@media print{#swarm{display:none!important}}';
  document.head.appendChild(sheet);
  document.body.appendChild(canvas);
  const gl = canvas.getContext('webgl2', {alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'default'});
  if (!gl) { canvas.remove(); return; }

  /* one buffer holds every formation; moving between two is only pointing at a different part of it */
  const seedOf = rng(2118), seeds = new Float32Array(N * 4);
  for (let i = 0; i < N * 4; i++) seeds[i] = seedOf();
  const gens = [{gen: thread}, ...SCENES];
  const data = new Float32Array(gens.length * N * 4);
  for (let k = 0; k < gens.length; k++) {
    await idle();
    if (dead) { canvas.remove(); return; }
    const r = rng(97 + k * 13);
    let at = k * N * 4;
    gens[k].gen((x, y, z, w) => { data[at++] = x; data[at++] = y; data[at++] = z; data[at++] = w; }, N, r);
  }
  await idle();
  if (dead) { canvas.remove(); return; }

  const compile = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram();
  const vs = compile(gl.VERTEX_SHADER, VS), fs = compile(gl.FRAGMENT_SHADER, FS);
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.bindAttribLocation(prog, 0, 'aA');
  gl.bindAttribLocation(prog, 1, 'aB');
  gl.bindAttribLocation(prog, 2, 'aS');
  gl.linkProgram(prog);
  /* compile on the driver's own thread where it offers one, so the page never waits */
  const par = gl.getExtension('KHR_parallel_shader_compile');
  const U = {};
  let linked = false;
  const isLinked = () => {
    if (linked) return true;
    if (par && !gl.getProgramParameter(prog, par.COMPLETION_STATUS_KHR)) return false;
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('swarm', gl.getProgramInfoLog(prog), gl.getShaderInfoLog(vs));
      teardown();
      return false;
    }
    gl.useProgram(prog);
    ['uT', 'uMix', 'uLag', 'uPx', 'uS', 'uRes', 'uCtrl', 'uRect', 'uMask', 'uMode', 'uScrub', 'uDens', 'uAcc', 'uInk'].forEach(n => { U[n] = gl.getUniformLocation(prog, n); });
    return linked = true;
  };

  await idle();
  if (dead) { canvas.remove(); return; }
  const posBuf = gl.createBuffer(), seedBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, seedBuf);
  gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(2);
  gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.enableVertexAttribArray(1);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);
  const pointAt = (attr, k) => gl.vertexAttribPointer(attr, 4, gl.FLOAT, false, 0, k * N * 16);


  /* ---- layout and timeline ---- */
  let W = 0, H = 0, px = 1, placed = [], segs = [], threadX = 0, ink = [0, 0, 0], accents = {};
  const hex = c => { const m = /#(..)(..)(..)/.exec(c); return m ? [1, 2, 3].map(i => parseInt(m[i], 16) / 255) : [0, 0, 0]; };
  function theme() {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    ink = dark ? hex('#f2efe7') : hex('#111111');
    for (const k in INK) accents[k] = hex(INK[k][dark ? 1 : 0]);
  }
  function fit() {
    px = Math.min(devicePixelRatio || 1, 2);
    /* from the page, not the canvas, which measures nothing while it is hidden */
    W = document.documentElement.clientWidth;
    H = document.documentElement.clientHeight;
    const w = Math.round(W * px), h = Math.round(H * px);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h);
  }
  function measure() {
    placed = [];
    SCENES.forEach((sc, i) => {
      const p = sc.place();
      if (!p || p.r0.w < 150 || p.r0.h < 110) return;
      const y0 = p.y0 === undefined ? p.r0.cy : p.y0, y1 = p.y1 === undefined ? y0 : p.y1;
      placed.push({i: i + 1, sc, r0: p.r0, r1: p.r1 || p.r0, y0, y1, enter: y0 - H * .74, exit: y1 + H * .1});
    });
    const head = document.querySelector('.sec-header');
    const contentRight = head ? docOf(head).r : W;
    threadX = W - contentRight >= 34 ? (contentRight + pageRight()) / 2 : pageRight() - 14;
    segs = [];
    if (!placed.length) return;
    const T = {i: 0, thread: true}, NONE = {i: 0, thread: true, none: true};
    segs.push({from: placed[0].enter - H * .8, to: placed[0].enter, a: NONE, b: placed[0]});
    placed.forEach((cur, n) => {
      const next = placed[n + 1];
      if (!next) { segs.push({from: cur.exit, to: cur.exit + H * .7, a: cur, b: NONE}); return; }
      const gap = next.enter - cur.exit;
      if (gap > H * 1.7) {
        segs.push({from: cur.exit, to: cur.exit + H * .7, a: cur, b: T});
        segs.push({from: next.enter - H * .8, to: next.enter, a: T, b: next});
      } else if (gap < H * .3) {
        const mid = (cur.exit + next.enter) / 2;
        segs.push({from: mid - H * .15, to: mid + H * .15, a: cur, b: next});
      } else {
        segs.push({from: cur.exit, to: next.enter, a: cur, b: next});
      }
    });
  }
  function locate(s) {
    if (!segs.length || s < segs[0].from) return null;
    for (const g of segs) {
      if (s < g.from) return {a: g.a, b: g.a, m: 0};
      if (s <= g.to) return {a: g.a, b: g.b, m: (s - g.from) / (g.to - g.from)};
    }
    return null;
  }

  const rect = new Float32Array(8), maskV = new Float32Array(8), modes = new Int32Array(2), scrub = new Float32Array(2), dens = new Float32Array(2), acc = new Float32Array(6);
  let lastA = -1, lastB = -1;
  function bind(slot, e, s) {
    const o = slot * 4;
    if (e.thread) {
      rect[o] = threadX; rect[o + 1] = H / 2; rect[o + 2] = H / 2; rect[o + 3] = e.none ? 0 : .8;
      maskV[o] = -1e4; maskV[o + 1] = -1e4; maskV[o + 2] = 1e5; maskV[o + 3] = 1e5;
      modes[slot] = 0; scrub[slot] = 0; dens[slot] = .13;
      acc.set(ink, slot * 3);
      return;
    }
    const cy = clamp(s + H / 2, e.y0, Math.max(e.y0, e.y1));
    const k = e.y1 > e.y0 ? smooth(clamp((cy - e.y0) / Math.min(H * .7, e.y1 - e.y0))) : 0;
    const cx = mix(e.r0.cx, e.r1.cx, k), w = mix(e.r0.w, e.r1.w, k), h = mix(e.r0.h, e.r1.h, k), y = cy - s;
    rect[o] = cx; rect[o + 1] = y; rect[o + 2] = Math.min(w / 2 / e.sc.ex, h / 2 / e.sc.ey); rect[o + 3] = 1;
    maskV[o] = cx - w / 2; maskV[o + 1] = y - h / 2; maskV[o + 2] = cx + w / 2; maskV[o + 3] = y + h / 2;
    modes[slot] = e.sc.mode;
    /* built on arrival, however long it then stays with the reader */
    scrub[slot] = clamp((s - (e.y0 - H)) / (H * 1.2));
    dens[slot] = e.sc.dens;
    acc.set(accents[e.sc.id], slot * 3);
  }

  /* ---- the frame ---- */
  let raf = 0, alive = true, painted = false, prevS = scrollY, prevT = 0, lag = 0;
  const t0 = performance.now();
  const state = window.__field.state = {frames: 0, a: '', b: '', m: 0, cost: 0};
  function frame(now) {
    raf = 0;
    if (!alive) return;
    if (innerWidth < MIN_WIDTH) { canvas.style.display = 'none'; painted = false; return; }
    if (!isLinked()) { if (alive) raf = requestAnimationFrame(frame); return; }
    const s = scrollY, st = locate(s);
    if (!st) {
      if (painted) { gl.clear(gl.COLOR_BUFFER_BIT); painted = false; }
      canvas.style.display = 'none';
      prevS = s;
      return;
    }
    raf = requestAnimationFrame(frame);
    const c0 = performance.now();
    canvas.style.display = 'block';
    const dt = Math.min(64, now - prevT || 16);
    prevT = now;
    lag += (clamp((s - prevS) / dt / 2.4, -1, 1) - lag) * (1 - Math.exp(-dt / 130));
    prevS = s;
    bind(0, st.a, s);
    bind(1, st.b, s);
    if (st.a.i !== lastA) { pointAt(0, st.a.i); lastA = st.a.i; }
    if (st.b.i !== lastB) { pointAt(1, st.b.i); lastB = st.b.i; }
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(U.uT, (now - t0) / 1000);
    gl.uniform1f(U.uMix, st.m);
    gl.uniform1f(U.uLag, lag);
    gl.uniform1f(U.uPx, px);
    gl.uniform1f(U.uS, s / H);
    gl.uniform2f(U.uRes, W, H);
    gl.uniform2f(U.uCtrl, threadX, H / 2);
    gl.uniform4fv(U.uRect, rect);
    gl.uniform4fv(U.uMask, maskV);
    gl.uniform1iv(U.uMode, modes);
    gl.uniform1fv(U.uScrub, scrub);
    gl.uniform1fv(U.uDens, dens);
    gl.uniform3fv(U.uAcc, acc);
    gl.uniform3fv(U.uInk, ink);
    gl.drawArrays(gl.POINTS, 0, N);
    painted = true;
    state.frames++;
    state.a = st.a.sc ? st.a.sc.id : st.a.none ? 'none' : 'thread';
    state.b = st.b.sc ? st.b.sc.id : st.b.none ? 'none' : 'thread';
    state.m = st.m;
    state.cost += performance.now() - c0;
  }
  const wake = () => { if (!raf && alive) raf = requestAnimationFrame(frame); };

  let timer = 0;
  const relayout = () => { clearTimeout(timer); timer = setTimeout(() => { fit(); measure(); wake(); }, 150); };
  const ro = new ResizeObserver(relayout);
  ro.observe(document.body);
  const mo = new MutationObserver(theme);
  mo.observe(document.documentElement, {attributes: true, attributeFilter: ['data-theme']});
  addEventListener('scroll', wake, {passive: true});
  addEventListener('resize', relayout, {passive: true});
  canvas.addEventListener('webglcontextlost', () => teardown());

  function teardown() {
    alive = false;
    cancelAnimationFrame(raf);
    clearTimeout(timer);
    ro.disconnect();
    mo.disconnect();
    removeEventListener('scroll', wake);
    removeEventListener('resize', relayout);
    canvas.remove();
  }
  stopFn = teardown;
  window.__field.scenes = () => placed.map(p => ({id: p.sc.id, y0: p.y0, y1: p.y1, w: Math.round(p.r0.w), h: Math.round(p.r0.h), cx: Math.round(p.r0.cx), r1w: Math.round(p.r1.w), r1h: Math.round(p.r1.h)}));
  window.__field.measure = () => { fit(); measure(); };
  window.__field.segs = () => segs.map(g => ({from: g.from, to: g.to, a: g.a.sc ? g.a.sc.id : g.a.none ? 'none' : 'thread', b: g.b.sc ? g.b.sc.id : g.b.none ? 'none' : 'thread'}));

  await idle();
  if (dead) { teardown(); return; }
  theme();
  fit();
  measure();
  wake();
}

export function start() {
  if (window.__field) return;
  window.__field = {stop};
  let cancelled = false;
  stopFn = () => { cancelled = true; };
  const begin = () => {
    if (cancelled) return;
    /* it starts once the lead's own effect has played; the first section it reaches is well below the reel */
    if (!window.__typeArmed) { setTimeout(begin, 200); return; }
    setTimeout(() => { if (!cancelled) init(); }, 2200);
  };
  begin();
}
