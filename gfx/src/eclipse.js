// Fig. 4, a solar eclipse. Geometry is fixed: Sun r46 at origin, Moon r47 at (mx,my).
import {THREE, createStage, rng} from './core.js';

const VERT = `void main(){ gl_Position = vec4(position.xy, 0., 1.); }`;

const FRAG = `precision highp float;
uniform vec2 uRes, uMoon;
uniform float uTot, uDia, uDx, uRay, uT;
uniform vec3 uLimb;
uniform sampler2D uNoise;
const float RS = 46., RM = 47., TAU = 6.2831853;
const vec3 DEEP = vec3(.702,.125,.102), ORANGE = vec3(1.,.416,.122), AMBER = vec3(1.,.702,.278), CORE = vec3(1.,.965,.847);

float fbm(vec2 p){ return texture2D(uNoise,p/32.,-1.).r; }
// Noise around a circle, seamless at the angle wrap.
float ring(float ang, float freq, float seed){ return fbm(vec2(cos(ang),sin(ang))*freq+seed); }
vec3 ramp(float i){
  vec3 c = mix(DEEP,ORANGE,smoothstep(.0,.42,i));
  c = mix(c,AMBER,smoothstep(.38,.68,i));
  return mix(c,CORE,smoothstep(.68,1.,i));
}
void over(inout vec3 pre, inout float alpha, vec3 c, float a){
  pre = c*a+pre*(1.-a); alpha = a+alpha*(1.-a);
}
const vec3 CRATERS[10] = vec3[10](vec3(-14.,10.,6.5),vec3(12.,-16.,8.),vec3(20.,14.,4.5),vec3(-22.,-12.,5.),vec3(2.,24.,4.),vec3(-4.,-4.,3.2),vec3(28.,-4.,3.4),vec3(-30.,18.,3.),vec3(8.,4.,2.6),vec3(-10.,-28.,3.6));
// One crater lit from l: the wall nearest the light falls in shadow, the far wall and outer rim catch it.
float crater(vec2 q, vec3 c, vec2 l){
  vec2 d = (q-c.xy)/c.z;
  float rr = length(d), side = dot(d,l);
  float bowl = 1.-smoothstep(.78,1.,rr), lip = smoothstep(.8,1.,rr)*(1.-smoothstep(1.,1.3,rr));
  return bowl*(-.4*side-.07)+lip*(.3*side+.06);
}
float spot(vec2 p, float ang, float rad, float size, float warp){
  float d = length(p-vec2(cos(ang),sin(ang))*rad)+warp*2.5;
  return 1.-smoothstep(size*.55,size,d);
}

void main(){
  vec2 uv = gl_FragCoord.xy/uRes;
  vec2 p = vec2(-110.+220.*uv.x, 136.-232.*uv.y);
  float r = length(p), ang = atan(p.y,p.x);
  float aa = 232./uRes.y;
  float d = r-RS;
  vec2 dir = vec2(cos(ang),sin(ang));
  vec3 pre = vec3(0.); float alpha = 0.;

  // Corona: streamers rotated by ray degrees, gone by r95.
  float a2 = ang-radians(uRay);
  float fall = 1.-smoothstep(RS,95.,r);
  float streak = pow(ring(a2,2.6,3.7),2.)*2.6+.25;
  float cor = (.12+.88*uTot)*fall*fall*streak*.8*step(RS-1.,r);
  over(pre,alpha,mix(ORANGE,CORE,clamp(fall*fall,0.,1.)),clamp(cor,0.,1.));

  // Halo: tight and bright at the limb, gone by RS+22.
  float dh = max(d,0.);
  float halo = (exp(-dh/3.5)*.8+exp(-dh/9.)*.25)*(1.-smoothstep(4.,22.,dh));
  over(pre,alpha,mix(ORANGE,AMBER,exp(-dh/4.)),clamp(halo,0.,1.));

  // Flames: polar noise scrolling outward, with taller drifting prominences, capped at RS+13.
  float tongue = fbm(dir*6.+vec2(d*.16-uT*.55,d*.1+uT*.22));
  float pn = pow(ring(ang+uT*.012,4.5,11.3),3.)*7.;
  float H = min(2.5+7.*smoothstep(.28,.72,tongue)+max(pn-.5,0.)*7.,13.);
  float t = clamp(d/H,0.,1.);
  float wisp = .6+.8*fbm(dir*17.+vec2(d*.35-uT*1.1,uT*.4));
  float flame = (1.-smoothstep(.3,1.,t))*smoothstep(-1.,0.,d)*clamp(wisp,0.,1.);
  vec3 fc = mix(mix(AMBER,ORANGE,smoothstep(0.,.45,t)),DEEP,smoothstep(.45,1.,t));
  over(pre,alpha,fc,flame);

  // Disc: fine boiling granules over large slow convection, limb darkening, two slow sunspots.
  float disc = 1.-smoothstep(RS-aa*.5,RS+aa*.5,r);
  if(disc>0.){
    float q = min(r*r/(RS*RS),1.), mu = sqrt(1.-q);
    vec2 w = vec2(fbm(p*.12+vec2(uT*.05,0.)),fbm(p*.12+vec2(5.2,1.3)-uT*.04));
    float n = smoothstep(.32,.68,fbm(p*.62+w*2.4+vec2(uT*.14,-uT*.1)));
    float big = fbm(p*.13+w*1.4-uT*.03);
    float I = pow(mu,.55)*(.53+.27*n+.55*(big-.45));
    float ws = w.x-.5;
    float sp = max(spot(p,uT*.013+.8,24.,5.,ws),spot(p,uT*.013+3.6,31.,3.6,ws));
    I *= 1.-.75*sp;
    vec3 dc = ramp(clamp(I,0.,1.))*(1.-.55*sp);
    over(pre,alpha,dc,disc);
  }

  // Moon: a lit sphere with maria and craters off the Sun, its dark side against the Sun.
  vec2 mv = p-uMoon;
  float dm = length(mv);
  float moon = 1.-smoothstep(RM-aa*.5,RM+aa*.5,dm);
  if(moon>0.){
    vec2 mq = mv/RM, toSun = -uMoon/max(length(uMoon),.001);
    vec3 nrm = vec3(mq,sqrt(max(1.-dot(mq,mq),0.)));
    vec2 st = mq*2./(1.+nrm.z)*RM;
    float mar = smoothstep(.37,.62,fbm(st*.07+vec2(3.1,7.7)));
    vec3 alb = mix(vec3(.8,.78,.74),vec3(.54,.53,.51),mar)*(.84+.32*fbm(st*.6+11.));
    float cr = 0.;
    for(int i=0;i<10;i++) cr += crater(st,CRATERS[i],toSun);
    alb *= 1.+cr;
    float lit = clamp(dot(nrm,normalize(vec3(toSun,.62))),0.,1.);
    vec3 surf = mix(alb*(.34+.84*lit),vec3(.035,.033,.03),max(disc,smoothstep(.2,.8,uTot)));
    pre = pre*(1.-moon)+surf*moon;
    alpha = alpha*(1.-moon)+moon;
  }

  // Rim of sunlight on the Moon's leading edge, the side facing the Sun's centre.
  float lead = dot(mv/max(dm,.001),-uMoon/max(length(uMoon),.001));
  float rw = max(.7,aa);
  float rimX = (dm-RM)/rw;
  float rim = exp(-rimX*rimX)*disc*smoothstep(0.,.5,lead);
  over(pre,alpha,CORE,clamp(rim,0.,1.));

  // Dotted limb: 40 dashes on the Moon's edge, only outside the Sun's disc.
  float cell = fract(atan(mv.y,mv.x)*40./TAU);
  float along = abs(cell-.5)*TAU*(RM+2.2)/40.;
  float dash = 1.-smoothstep(1.85-aa*.5,1.85+aa*.5,along);
  float band = 1.-smoothstep(.62-aa*.5,.62+aa*.5,abs(dm-RM-2.2));
  over(pre,alpha,uLimb,dash*band*(1.-disc)*.9);

  // Baily's bead.
  if(uDia>0.){
    float bd = length(p-vec2(uDx,0.));
    float g = (1.-smoothstep(.7,1.9,bd)) + exp(-bd*bd/42.)*.5;
    g = clamp(g*uDia,0.,1.);
    pre = pre*(1.-g)+vec3(1.,.97,.93)*g;
    alpha = alpha+g-alpha*g;
  }
  gl_FragColor = vec4(pre,alpha);
}`;

/* Five octaves of value noise in a tiling texture, 16 texels to the first octave's cell. As
   shader code it runs nine times a pixel, and on Windows takes seconds just to compile. */
function noiseTex() {
  const S = 512, d = new Uint8Array(S * S), sum = new Float32Array(S * S), r = rng(9127);
  let amp = .5;
  for (let cells = 32; cells <= S; cells *= 2, amp *= .5) {
    const grid = new Float32Array(cells * cells), step = cells / S;
    for (let i = 0; i < grid.length; i++) grid[i] = r();
    for (let y = 0, i = 0; y < S; y++) {
      const gy = y * step, y0 = gy | 0, y1 = (y0 + 1) % cells;
      let fy = gy - y0; fy = fy * fy * (3 - 2 * fy);
      for (let x = 0; x < S; x++, i++) {
        const gx = x * step, x0 = gx | 0, x1 = (x0 + 1) % cells;
        let fx = gx - x0; fx = fx * fx * (3 - 2 * fx);
        const a = grid[y0 * cells + x0], b = grid[y0 * cells + x1], c = grid[y1 * cells + x0], e = grid[y1 * cells + x1];
        sum[i] += amp * (a + (b - a) * fx + (c - a + (a - b - c + e) * fx) * fy);
      }
    }
  }
  for (let i = 0; i < d.length; i++) d[i] = sum[i] * 255;
  const t = new THREE.DataTexture(d, S, S, THREE.RedFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}

const limbFor = (t) => t === 'dark' ? [.525,.506,.455] : [.416,.404,.373];

export async function create({canvas, tier, preserve, theme}){
  const stage = createStage(canvas, {alpha:true, preserve, toneMapping:THREE.NoToneMapping});
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1,-1,0, 3,-1,0, -1,3,0]),3));
  const uniforms = {
    uRes:{value:new THREE.Vector2(1,1)}, uMoon:{value:new THREE.Vector2(0,86.1)},
    uTot:{value:0}, uDia:{value:0}, uDx:{value:-46}, uRay:{value:10}, uT:{value:1},
    uLimb:{value:new THREE.Vector3(...limbFor(theme))},
    uNoise:{value:noiseTex()},
  };
  const mat = new THREE.ShaderMaterial({
    vertexShader:VERT, fragmentShader:FRAG, uniforms,
    depthTest:false, depthWrite:false, transparent:true, premultipliedAlpha:true, blending:THREE.NoBlending,
  });
  const tri = new THREE.Mesh(geo, mat);
  tri.frustumCulled = false;
  scene.add(tri);
  stage.scene = scene; stage.camera = camera;

  return {
    stage,
    async prepare(){ await stage.warm(); },
    resize(w,h){
      stage.size(w,h);
      canvas.width && uniforms.uRes.value.set(canvas.width, canvas.height);
    },
    draw(s){
      uniforms.uRes.value.set(canvas.width, canvas.height);
      uniforms.uMoon.value.set(s.mx,s.my);
      uniforms.uTot.value = s.tot; uniforms.uDia.value = s.dia; uniforms.uDx.value = s.dx;
      uniforms.uRay.value = s.ray; uniforms.uT.value = s.t;
      stage.render();
    },
    setTheme(t){ uniforms.uLimb.value.set(...limbFor(t)); },
    dispose(){ geo.dispose(); mat.dispose(); uniforms.uNoise.value.dispose(); stage.dispose?.(); },
  };
}

export function mockState(w,h){ return {mx:0, my:86.1, tot:0, dia:0, dx:-46, ray:10, t:1}; }
