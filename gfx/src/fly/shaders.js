/* The opening shot's shaders. Few programs and short loops, because every line here is compile time
   before the first frame of a first visit. */
export const FULL_VS = `#version 300 es
out vec2 v;
void main(){vec2 q=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));v=q*2.-1.;gl_Position=vec4(v,0.,1.);}`;

export const STAR_VS = `#version 300 es
layout(location=0) in vec3 aD;layout(location=1) in vec2 aS;
uniform mat4 uVP;uniform float uPx,uFade;out float b;
void main(){vec4 p=uVP*vec4(aD,1.);gl_Position=p.xyww;gl_PointSize=aS.x*uPx;b=aS.y*uFade;}`;

export const STAR_FS = `#version 300 es
precision mediump float;in float b;out vec4 o;
void main(){vec2 d=gl_PointCoord-.5;float a=smoothstep(.25,.02,dot(d,d));o=vec4(vec3(.92,.96,1.)*a*b,a*b);}`;

export const EARTH_FS = `#version 300 es
precision highp float;
in vec2 v;out vec4 o;
uniform vec3 uEye,uR,uU,uF,uSun;uniform float uTan,uAsp,uT,uAlt,uH,uDay,uAsia;uniform sampler2D uTex,uN,uHi;
const float PI=3.14159265;
float N(vec2 p,float l){return textureLod(uN,p,l).r;}
vec3 tone(vec3 c){c=c*(2.51*c+.03)/(c*(2.43*c+.59)+.14);return pow(clamp(c,0.,1.),vec3(1./2.2));}
void main(){
  vec3 rd=normalize(uF+uR*(v.x*uAsp*uTan)+uU*(v.y*uTan));
  float b=dot(uEye,rd),c=dot(uEye,uEye)-1.,h=b*b-c;
  vec3 atm=vec3(.26,.5,1.);
  float tc=max(-b,0.);vec3 pc=uEye+rd*tc;float dc=length(pc);
  float lit=smoothstep(-.34,.42,dot(pc/dc,uSun));
  float rim=exp(-max(dc-1.,0.)/.022)*(.2+1.1*lit);
  vec3 col=vec3(0.);float a=0.;
  if(h>0.){
    float t=-b-sqrt(h);vec3 n=uEye+rd*t;
    /* one pixel on the ground, in texels and in noise cells */
    float fp=2.*uTan/uH*t,lod=max(log2(fp*326.),0.),nl=max(log2(fp*256.*14.),0.);
    float lon=atan(n.x,n.z),lat=asin(clamp(n.y,-1.,1.));
    vec2 uv=vec2(lon/(2.*PI)+.5,.5-lat/PI);
    vec3 day=mix(vec3(.02,.07,.17),textureLod(uTex,uv,lod).rgb,uDay);
    /* the sharp map of Asia, wherever it reaches */
    vec2 ua=vec2((lon*57.29578-40.)/80.,(48.-lat*57.29578)/48.);
    float inA=smoothstep(0.,.03,ua.x)*smoothstep(1.,.97,ua.x)*smoothstep(0.,.03,ua.y)*smoothstep(1.,.97,ua.y);
    if(inA>0.&&uAsia>0.){
      vec3 hi=textureLod(uHi,ua,max(log2(fp*2200.),0.)).rgb;
      day=mix(day,hi,inA*uAsia);
    }
    float ocean=smoothstep(.0,.05,day.b-day.r*1.15-day.g*.25);
    float near=smoothstep(.2,.04,uAlt);
    vec2 g=vec2(uv.x*16.,uv.y*8.);
    /* close in, a little fine grain on the land keeps it sharp */
    float dd=N(g*11.,nl+1.)*.45+N(g*41.,nl+1.)*.33+N(g*157.,nl+1.)*.22;
    day*=mix(1.,.8+.4*dd,near*(1.-ocean));
    float ndl=dot(n,uSun),light=smoothstep(-.05,.2,ndl);
    vec3 surf=day*(1.42*light*max(ndl+.08,0.)+.006);
    /* the Sun on the water: a small clean point, no white bloom */
    vec3 hv=normalize(uSun-rd);
    surf+=ocean*light*pow(max(dot(n,hv),0.),9000.)*vec3(1.,.95,.85)*.7;
    /* clean, hard-edged weather systems, with their shadows just off to one side */
    vec2 cg=vec2(uv.x*16.+uT*.004,uv.y*8.);
    float warp=N(cg*.7+.3,nl-2.)*.1;
    float c3=N(cg*19.,nl),c4=N(cg*67.,nl);
    float cd=N(cg+warp,nl-1.)*.56+N(cg*2.3-warp,nl-1.)*.3+N(cg*6.1,nl-1.)*.14+(c3-.5)*.12*near+(c4-.5)*.06*near;
    float systems=smoothstep(.44,.6,N(cg*.17+.7,max(nl-3.,0.)));
    float cov=smoothstep(.6,.655,cd)*systems;
    float sh=smoothstep(.6,.655,N(cg+warp+vec2(.009,.005),nl-1.)*.56+N(cg*2.3-warp+.02,nl-1.)*.3+N(cg*6.1+.05,nl-1.)*.14)*systems;
    surf*=1.-.5*sh*light;
    vec3 cloud=vec3(1.,.99,.97)*(1.3*light*max(ndl+.1,0.)+.008);
    surf=mix(surf,cloud,cov);
    /* the thin blue of the air, only at the very edge */
    float f=pow(1.-max(dot(n,-rd),0.),4.5);
    surf=mix(surf,atm*(.015+.85*light),f*.72);
    col=surf;a=1.;
  }else{
    col=atm*rim*.82+vec3(.75,.85,1.)*pow(rim,3.)*.3;
    a=clamp(rim*1.4,0.,1.);
  }
  o=vec4(tone(col)*(a>=1.?1.:clamp(a*1.2,0.,1.)),a);
}`;

export const SKY_FS = `#version 300 es
precision highp float;
in vec2 v;out vec4 o;
uniform vec3 uR,uU,uF,uSun,uHaze;uniform float uTan,uAsp;
void main(){
  vec3 rd=normalize(uF+uR*(v.x*uAsp*uTan)+uU*(v.y*uTan));
  float e=rd.y;
  vec3 top=vec3(.2,.38,.68),mid=vec3(.56,.68,.82);
  vec3 c=mix(uHaze,mix(mid,top,smoothstep(.04,.46,e)),smoothstep(-.05,.1,e));
  float sd=max(dot(rd,uSun),0.);
  c+=vec3(1.,.74,.46)*(pow(sd,7.)*.26+pow(sd,70.)*.38)+vec3(1.,.92,.78)*pow(sd,1200.)*2.6;
  o=vec4(c,1.);
}`;

export const MESH_VS = `#version 300 es
layout(location=0) in vec3 aP;layout(location=1) in vec3 aC;
uniform mat4 uVP;out vec3 vW,vC;
void main(){vW=aP;vC=aC;gl_Position=uVP*vec4(aP,1.);}`;

export const MESH_FS = `#version 300 es
precision highp float;
in vec3 vW,vC;out vec4 o;uniform vec3 uEye,uHaze;uniform float uFog;
void main(){float d=length(vW-uEye);o=vec4(mix(vC,uHaze,1.-exp(-d*uFog)),1.);}`;

/* small fields, on a lean and bending with the ground, the same on the flat and on the low slopes so they join */
const FARM = `
vec3 farm(vec2 p,float d){
  float l=log2(1.+d*.001);
  vec2 q=(mat2(.82,.57,-.57,.82)*p+vec2(textureLod(uN,p/1700.,l).r,textureLod(uN,p/1700.+.5,l).r)*420.)/vec2(170.,105.);
  float h=fract(sin(dot(floor(q),vec2(127.1,311.7)))*43758.5453);
  vec3 c=h<.38?vec3(.26,.36,.13):h<.66?vec3(.37,.39,.18):h<.86?vec3(.45,.41,.23):vec3(.2,.3,.12);
  return mix(vec3(.33,.37,.17),c,smoothstep(24000.,6000.,d));
}
/* cloud shadow, gone with distance before its pattern can be seen to repeat */
float cloudShade(vec2 p,float d,float t){return mix(1.,mix(.74,1.04,smoothstep(.36,.62,textureLod(uN,p/1500.+t*.006,0.).r)),smoothstep(30000.,8000.,d));}
`;

/* the mountains, from their real shape: snow above the line, rock on the steep, forest in the valleys */
export const TERRAIN_FS = `#version 300 es
precision highp float;
in vec3 vW,vC;out vec4 o;uniform vec3 uEye,uHaze,uSun;uniform float uFog,uT;uniform sampler2D uN;
${FARM}
void main(){
  vec2 p=vW.xz;float d=length(vW-uEye),l=log2(1.+d*.00024);
  float a=textureLod(uN,p/5200.,l).r,b=textureLod(uN,p/1300.,l).r,c=textureLod(uN,p/330.,l).r,e=textureLod(uN,p/83.,l).r;
  /* fine ridges in the light that the mesh is too coarse to carry */
  float fade=1.-smoothstep(3000.,26000.,d);
  vec3 n=normalize(vC+vec3(textureLod(uN,p/620.+.37,l).r-.5,0.,textureLod(uN,p/620.+.71,l).r-.5)*1.1*fade+vec3(c-.5,0.,e-.5)*.5*fade);
  float slope=1.-n.y,hh=vW.y;
  vec3 forest=mix(vec3(.1,.2,.09),vec3(.2,.29,.13),b)*(.72+.56*c);
  vec3 field=farm(p,d)*(.88+.24*c);
  vec3 ground=mix(forest,field,smoothstep(420.,120.,hh+b*260.));
  vec3 rock=mix(vec3(.21,.2,.21),vec3(.42,.38,.36),a*.5+c*.5)*(.76+.5*e);
  vec3 col=mix(ground,rock,smoothstep(1500.,2900.,hh+(b-.5)*1100.+slope*1500.));
  float line=3300.+(a-.5)*1300.+(c-.5)*380.;
  float snow=smoothstep(line-120.,line+120.,hh)*(1.-smoothstep(.42,.66,slope+(e-.5)*.14));
  col=mix(col,vec3(.66,.68,.72),snow);
  float ndl=max(dot(n,uSun),0.);
  /* lit by a warm Sun, the shadow side filled by a blue sky */
  vec3 lit=vec3(1.3,1.17,1.)*ndl+vec3(.26,.31,.42)*(.55+.45*n.y);
  col*=lit*cloudShade(p,d,uT);
  o=vec4(mix(col,uHaze,1.-exp(-d*uFog)),1.);
}`;

/* the sea of cloud lying below the high peaks */
export const SEA_FS = `#version 300 es
precision highp float;
in vec3 vW;out vec4 o;uniform vec3 uEye,uHaze,uSun;uniform float uT,uOn;uniform sampler2D uN;
void main(){
  vec2 p=vW.xz+vec2(uT*90.,0.);float d=length(vW-uEye);
  float l=log2(1.+d*.00016);
  float n=textureLod(uN,p/21000.,l).r*.56+textureLod(uN,p/7300.,l).r*.28+textureLod(uN,p/2300.,l).r*.11+textureLod(uN,p/690.,l).r*.05;
  float s=textureLod(uN,(p+uSun.xz*700.)/7300.,l).r*.28+textureLod(uN,(p+uSun.xz*700.)/2300.,l).r*.11;
  float north=smoothstep(-13000.,-20000.,vW.z);
  float al=smoothstep(.46,.53,n)*north*uOn;
  vec3 c=mix(vec3(.66,.72,.84),vec3(1.,.985,.96),smoothstep(.3,.47,n*.39/.39-s*.3+.2));
  c=mix(c,uHaze,1.-exp(-d*.00004));
  al*=exp(-d*.000012);
  o=vec4(c*al,al);
}`;

export const GROUND_FS = `#version 300 es
precision highp float;
in vec3 vW;out vec4 o;uniform vec3 uEye,uHaze;uniform float uT,uFog;uniform sampler2D uN,uTown;
${FARM}
void main(){
  vec2 p=vW.xz;float d=length(vW-uEye),l=log2(1.+d*.004);
  float a=textureLod(uN,p/2600.,l*.4).r,b=textureLod(uN,p/420.,l).r,c=textureLod(uN,p/70.,l+1.).r;
  vec2 map=texture(uTown,p/12000.+.5).rg;
  float town=smoothstep(.1,.5,map.r);
  /* lit as the terrain's flat ground is, so the two meet without a line */
  vec3 g=farm(p,d)*(.88+.24*c)*vec3(1.19,1.15,1.14)*(.9+.2*b);
  vec3 t=mix(vec3(.4,.36,.32),vec3(.5,.46,.4),c);
  vec3 col=mix(g,t,town);
  col=mix(col,vec3(.4,.38,.34),smoothstep(.15,.6,map.g)*.8);
  /* the street grid, fading out with distance */
  vec2 s=abs(fract(p/38.+.5)-.5)*38.;
  float road=(1.-smoothstep(1.6,3.,min(s.x,s.y)))*town*(1.-smoothstep(500.,1500.,d));
  col=mix(col,vec3(.27,.26,.25),road*.85);
  o=vec4(mix(col*cloudShade(p,d,uT),uHaze,1.-exp(-d*uFog)),1.);
}`;

export const BLD_VS = `#version 300 es
layout(location=0) in vec3 aP;layout(location=1) in vec3 aN;
layout(location=2) in vec4 iA;layout(location=3) in vec4 iB;
uniform mat4 uVP;out vec3 vW,vN,vC;out float vS;
void main(){
  vW=vec3(iA.x+aP.x*iA.z,aP.y*iB.x,iA.y+aP.z*iA.w);
  vN=aN;vC=iB.gba;vS=fract(iA.x*.137+iA.y*.291);
  gl_Position=uVP*vec4(vW,1.);
}`;

export const BLD_FS = `#version 300 es
precision highp float;
in vec3 vW,vN,vC;in float vS;out vec4 o;
uniform vec3 uEye,uHaze,uSun;uniform float uT,uFog;uniform sampler2D uN;
float H(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){
  float d=length(vW-uEye);
  vec3 c=vC;
  if(abs(vN.y)<.5){
    float u=abs(vN.x)>.5?vW.z:vW.x,fu=fract(u/3.5),fv=fract(vW.y/3.3);
    float au=fwidth(u/3.5),av=fwidth(vW.y/3.3);
    float w=smoothstep(.18-au,.18+au,fu)*smoothstep(.82+au,.82-au,fu)*smoothstep(.28-av,.28+av,fv)*smoothstep(.84+av,.84-av,fv);
    w*=1.-smoothstep(170.,720.,d);
    vec2 cell=vec2(floor(u/3.5),floor(vW.y/3.3));
    float on=step(.9,H(cell+vS*91.));
    vec3 glass=mix(vec3(.15,.19,.25),vec3(1.,.74,.42),on);
    c=mix(c,glass,w*.92);
    /* grounded: walls darken toward the street */
    c*=mix(.56,1.,smoothstep(0.,7.,vW.y));
  }else{
    c*=.82;
  }
  float l=max(dot(vN,uSun),0.)*1.02+.4+.1*vN.y;
  float shade=mix(.74,1.04,smoothstep(.36,.62,textureLod(uN,vW.xz/1500.+uT*.006,0.).r));
  o=vec4(mix(c*l*shade,uHaze,1.-exp(-d*uFog)),1.);
}`;

export const SHADOW_VS = `#version 300 es
layout(location=0) in vec3 aP;layout(location=2) in vec4 iA;layout(location=3) in vec4 iB;
uniform mat4 uVP;uniform vec3 uSun,uEye;out float vD;
void main(){
  vec3 w=vec3(iA.x+aP.x*iA.z,aP.y*iB.x,iA.y+aP.z*iA.w);
  w.xz-=uSun.xz/uSun.y*w.y;w.y=.06;
  vD=length(w-uEye);
  gl_Position=uVP*vec4(w,1.);
}`;

export const SHADOW_FS = `#version 300 es
precision mediump float;
in float vD;out vec4 o;uniform vec3 uHaze;uniform float uFog;
void main(){o=vec4(mix(vec3(.17,.18,.22),uHaze,1.-exp(-vD*uFog)),1.);}`;

/* flying through cloud: sheets of it, each growing past the camera from a point ahead */
export const CLOUD_FS = `#version 300 es
precision highp float;
in vec2 v;out vec4 o;uniform float uV,uT,uAsp;uniform sampler2D uN;
float sheet(vec2 q,float i){
  float k=fract(uT*.4+i*.2),s=mix(2.6,.14,k*k);
  vec2 u=q*s+vec2(i*.37,i*.61);
  float n=textureLod(uN,u*.21,0.).r*.6+textureLod(uN,u*.67,0.).r*.28+textureLod(uN,u*2.1,0.).r*.12;
  return smoothstep(.36,.6,n)*smoothstep(0.,.3,k)*smoothstep(1.,.72,k);
}
void main(){
  vec2 q=v*vec2(uAsp,1.);
  vec3 c=vec3(.74,.79,.87);
  for(int i=0;i<5;i++){
    float a=sheet(q,float(i));
    /* lit from above: each sheet is brighter toward the top of the frame */
    c=mix(c,mix(vec3(.82,.85,.91),vec3(1.,.995,.98),smoothstep(-1.,.8,v.y)),a*.92);
  }
  o=vec4(c*uV,uV);
}`;

export const VEIL_FS = `#version 300 es
precision mediump float;
in vec2 v;out vec4 o;uniform float uV;uniform vec3 uC;
void main(){o=vec4(uC*uV,uV);}`;

/* a soft light: Earth, while it is still a point */
export const GLOW_VS = `#version 300 es
uniform mat4 uP;uniform vec3 uC;uniform float uS;out vec2 v;
void main(){vec2 q=vec2(float(gl_VertexID&1),float((gl_VertexID>>1)&1))*2.-1.;v=q;gl_Position=uP*vec4(uC+vec3(q*uS,0.),1.);}`;

export const GLOW_FS = `#version 300 es
precision mediump float;
in vec2 v;out vec4 o;uniform vec3 uCol;uniform float uA;
void main(){float d=length(v);float k=smoothstep(1.,0.,d);k=k*k*(.35+.65*k);o=vec4(uCol*k*uA,0.);}`;

/* dust going past at speed: lines rushing out from the point ahead */
export const STREAK_VS = `#version 300 es
layout(location=0) in vec4 aS;
uniform float uT,uLen,uAsp,uA;out float a;
void main(){
  float z=fract(aS.z+uT),d=max(1.03-z-aS.w*uLen,.03);
  vec2 q=aS.xy/d*.14;
  gl_Position=vec4(q.x/uAsp,q.y,0.,1.);
  a=smoothstep(0.,.3,z)*(.16+.84*z)*smoothstep(1.,.94,z)*uA;
}`;

export const STREAK_FS = `#version 300 es
precision mediump float;
in float a;out vec4 o;
void main(){o=vec4(vec3(.74,.84,1.)*a,0.);}`;
