/* The opening shot's shaders. Few programs and no loops, because every line here is compile time before
   the first frame of a first visit. */
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
uniform vec3 uEye,uR,uU,uF,uSun;uniform float uTan,uAsp,uT,uAlt,uH,uDay;uniform sampler2D uTex,uN;
const float PI=3.14159265;
float N(vec2 p,float l){return textureLod(uN,p,l).r;}
vec3 tone(vec3 c){c=c*(2.51*c+.03)/(c*(2.43*c+.59)+.14);return pow(clamp(c,0.,1.),vec3(1./2.2));}
void main(){
  vec3 rd=normalize(uF+uR*(v.x*uAsp*uTan)+uU*(v.y*uTan));
  float b=dot(uEye,rd),c=dot(uEye,uEye)-1.,h=b*b-c;
  vec3 atm=vec3(.26,.5,1.);
  float tc=max(-b,0.);vec3 pc=uEye+rd*tc;float dc=length(pc);
  float lit=smoothstep(-.34,.42,dot(pc/dc,uSun));
  float rim=exp(-max(dc-1.,0.)/.026)*(.25+1.05*lit);
  vec3 col=vec3(0.);float a=0.;
  if(h>0.){
    float t=-b-sqrt(h);vec3 n=uEye+rd*t;
    /* one pixel on the ground, in texels and in noise cells */
    float fp=2.*uTan/uH*t,lod=max(log2(fp*326.),0.),nl=max(log2(fp*256.*14.),0.);
    vec2 uv=vec2(atan(n.x,n.z)/(2.*PI)+.5,.5-asin(clamp(n.y,-1.,1.))/PI);
    /* close in, fine ground detail takes over from the map */
    float near=smoothstep(.34,.03,uAlt);
    vec2 g=vec2(uv.x*16.,uv.y*8.);
    float d1=N(g*3.,nl),d2=N(g*11.,nl+1.),d3=N(g*41.,nl+1.),d4=N(g*157.,nl+1.),dd=d1*.3+d2*.3+d3*.25+d4*.15;
    vec2 wuv=uv+(vec2(d2,d3)-.5)*vec2(.0052,.0052)*near+(vec2(d3,d4)-.5)*vec2(.0016,.0016)*near;
    vec3 day=mix(vec3(.02,.07,.17),textureLod(uTex,wuv,lod).rgb,uDay);
    float ocean=smoothstep(.0,.05,day.b-day.r*1.15-day.g*.25);
    day*=mix(1.,.42+1.16*dd,near*(1.-ocean));
    float ndl=dot(n,uSun),light=smoothstep(-.09,.3,ndl);
    vec3 surf=day*(1.45*light*max(ndl+.12,0.)+.012);
    /* the Sun's track on the water */
    vec3 hv=normalize(uSun-rd);
    surf+=ocean*light*(pow(max(dot(n,hv),0.),190.)*vec3(1.,.9,.72)*2.3+pow(max(dot(n,hv),0.),24.)*vec3(.32,.36,.42)*.22);
    /* the cloud deck, its shadow just off to one side */
    vec2 cg=vec2(uv.x*8.+uT*.004,uv.y*4.);
    float warp=N(cg*.7+.3,nl-2.)*.12;
    float c3=N(cg*19.,nl+1.),c4=N(cg*67.,nl+1.);
    float cd=N(cg+warp,nl-1.)*.55+N(cg*2.3-warp,nl)*.3+N(cg*6.1,nl+1.)*.15+(c3-.5)*.17*near+(c4-.5)*.09*near;
    float cov=smoothstep(.57,.64,cd);
    float sh=smoothstep(.57,.66,N(cg+warp+vec2(.006,.003),nl-1.)*.55+N(cg*2.3-warp+.01,nl)*.3+N(cg*6.1,nl+1.)*.15);
    surf*=1.-.55*sh*light;
    vec3 cloud=vec3(1.,.985,.96)*(1.28*light*max(ndl+.14,0.)+.014);
    surf=mix(surf,cloud,cov*.94);
    /* looking through more air toward the limb, and the thin dusk band at the terminator */
    float f=pow(1.-max(dot(n,-rd),0.),3.2);
    surf=mix(surf,atm*(.02+.8*light),f*.7);
    surf+=vec3(.9,.42,.18)*smoothstep(.05,0.,abs(ndl+.01))*.012;
    col=surf;a=1.;
  }
  if(h<=0.){
    col=atm*rim*.82+vec3(.75,.85,1.)*pow(rim,3.)*.3;
    a=clamp(rim*1.4,0.,1.);
  }
  o=vec4(tone(col)*(a>=1.?1.:clamp(a*1.2,0.,1.)),a);
}`;

export const SKY_FS = `#version 300 es
precision highp float;
in vec2 v;out vec4 o;
uniform vec3 uR,uU,uF,uSun,uHaze;uniform float uTan,uAsp,uT;uniform sampler2D uN;
float N(float x,float s){return textureLod(uN,vec2(x,s),0.).r;}
float R(float x,float s){float n=1.-abs(2.*N(x,s)-1.);return n*sqrt(n);}
float M(float a){return R(a*.62+.13,.21)*.62+R(a*2.1+.4,.55)*.27+R(a*7.3,.8)*.11;}
void main(){
  vec3 rd=normalize(uF+uR*(v.x*uAsp*uTan)+uU*(v.y*uTan));
  float e=rd.y,az=atan(rd.x,rd.z)/6.2831853;
  vec3 top=vec3(.28,.46,.72),mid=vec3(.68,.74,.8);
  vec3 c=mix(uHaze,mix(mid,top,smoothstep(.05,.5,e)),smoothstep(-.01,.14,e));
  float sd=max(dot(rd,uSun),0.);
  c+=vec3(1.,.72,.42)*(pow(sd,6.)*.34+pow(sd,60.)*.5)+vec3(1.,.9,.74)*pow(sd,900.)*3.;
  /* the Himalaya, to the north: a snow range standing above nearer blue hills */
  float az0=fract(az-.41+.5)-.5,ahead=abs(az0);
  float m0=M(az0),hgt=mix(.02,.012+.17*m0,smoothstep(.36,.05,ahead));
  if(e<hgt){
    /* which way each face looks: the faces run down and out from the ridge, lit on the Sun's side */
    float fall=hgt-e,fine=N(az0*17.+e*5.,e*11.+.2),a2=az0+fall*(.34+.3*(fine-.5));
    float slope=M(a2+.0016)-M(a2-.0016);
    float side=smoothstep(-.006,.006,slope+(fine-.5)*.012);
    float snow=smoothstep(.34,.6,e/hgt+(fine-.5)*.42);
    vec3 sh=mix(vec3(.22,.27,.37),vec3(.55,.62,.8),snow),li=mix(vec3(.42,.4,.43),vec3(1.,.95,.86),snow);
    c=mix(mix(sh,li,side),uHaze,.08+.78*smoothstep(hgt*.5,0.,e));
  }
  float r3=N(az0*5.+.7,.11)*.6+N(az0*17.,.31)*.4;
  float h2=.014+.05*r3*r3;
  if(e<h2)c=mix(vec3(.26,.36,.38),uHaze,.3+.42*smoothstep(h2,0.,e));
  o=vec4(pow(c,vec3(1.)),1.);
}`;

export const MESH_VS = `#version 300 es
layout(location=0) in vec3 aP;layout(location=1) in vec3 aC;
uniform mat4 uVP;out vec3 vW,vC;
void main(){vW=aP;vC=aC;gl_Position=uVP*vec4(aP,1.);}`;

export const MESH_FS = `#version 300 es
precision highp float;
in vec3 vW,vC;out vec4 o;uniform vec3 uEye,uHaze;uniform float uFog;
void main(){float d=length(vW-uEye);o=vec4(mix(vC,uHaze,uFog*(1.-exp(-d*.00042))),1.);}`;

export const GROUND_FS = `#version 300 es
precision highp float;
in vec3 vW;out vec4 o;uniform vec3 uEye,uHaze;uniform float uT;uniform sampler2D uN;
void main(){
  vec2 p=vW.xz;float d=length(vW-uEye),l=log2(1.+d*.004);
  float a=textureLod(uN,p/2600.,l*.4).r,b=textureLod(uN,p/420.,l).r,c=textureLod(uN,p/70.,l+1.).r;
  float town=1.-smoothstep(1700.,3000.,length(p)+a*700.);
  vec3 g=mix(vec3(.2,.3,.14),vec3(.33,.36,.18),b)*(.8+.4*c);
  vec3 t=mix(vec3(.4,.36,.32),vec3(.5,.46,.4),c);
  vec3 col=mix(g,t,town);
  /* the street grid, fading out with distance */
  vec2 s=abs(fract(p/38.+.5)-.5)*38.;
  float road=(1.-smoothstep(1.6,3.,min(s.x,s.y)))*town*(1.-smoothstep(500.,1500.,d));
  col=mix(col,vec3(.27,.26,.25),road*.85);
  float shade=mix(.74,1.04,smoothstep(.36,.62,textureLod(uN,p/1500.+uT*.006,0.).r));
  o=vec4(mix(col*shade,uHaze,1.-exp(-d*.00042)),1.);
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
uniform vec3 uEye,uHaze,uSun;uniform float uT;uniform sampler2D uN;
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
  o=vec4(mix(c*l*shade,uHaze,1.-exp(-d*.00042)),1.);
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
in float vD;out vec4 o;uniform vec3 uHaze;
void main(){o=vec4(mix(vec3(.17,.18,.22),uHaze,1.-exp(-vD*.00042)),1.);}`;

export const VEIL_FS = `#version 300 es
precision highp float;
in vec2 v;out vec4 o;uniform float uV,uT,uS,uAsp;uniform vec3 uC;uniform sampler2D uN;
void main(){
  /* cloud rushing past: noise stretched away from the point we are flying at */
  vec2 q=v*vec2(uAsp,1.);float r=length(q),a=atan(q.y,q.x)/6.2831853;
  float s=textureLod(uN,vec2(a*3.,.34/(r+.25)+uT*.8),0.).r*.6+textureLod(uN,vec2(a*7.,.7/(r+.25)+uT*1.3),0.).r*.4;
  float k=uS>.5?clamp(uV*1.55-(1.-uV)*s*.95,0.,1.):uV;
  vec3 c=uS>.5?uC*(.9+.14*s):uC;
  o=vec4(c*k,k);
}`;
