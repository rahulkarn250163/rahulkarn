// Processor plate body: substrate, package and die. Die percent units, z toward camera.
import {THREE,canvasTex,normalFromHeight,mats,rbox,mesh,std,phys} from '../core.js';

function fade(ms,k){
  const v=Math.min(1,Math.max(0,k)), t=v<1;
  for(const m of ms){
    m.opacity=v;
    m.depthWrite=!t;
  }
  return v;
}

const substrateMap=()=>canvasTex(1024,1024,(c,w,h)=>{
  c.fillStyle='#1b1a18';c.fillRect(0,0,w,h);
  c.fillStyle='#a8894a';
  for(let y=14;y<h;y+=14)for(let x=14;x<w;x+=14){
    c.beginPath();c.arc(x,y,1.7,0,Math.PI*2);c.fill();
  }
  // edge pads
  c.fillStyle='#c9a65c';
  for(let i=40;i<w-40;i+=24){
    c.fillRect(i,8,14,26);c.fillRect(i,h-34,14,26);
    c.fillRect(8,i,26,14);c.fillRect(w-34,i,26,14);
  }
});

const packageMap=()=>canvasTex(1024,1024,(c,w,h)=>{
  c.fillStyle='#2b2926';c.fillRect(0,0,w,h);
  c.fillStyle='#8d8678';
  for(let row=0;row<3;row++){
    const o=12+row*16;
    for(let i=o+8;i<w-o-8;i+=9){
      c.fillRect(i,o,4,10);c.fillRect(i,h-o-10,4,10);
      c.fillRect(o,i,10,4);c.fillRect(h-o-10,i,10,4);
    }
  }
});

const dieMaps=()=>{
  const paint=(c,w,h,bg,line)=>{
    c.fillStyle=bg;c.fillRect(0,0,w,h);
    c.strokeStyle=line;c.lineWidth=1;c.beginPath();
    for(let i=0;i<=w;i+=8){c.moveTo(i+.5,0);c.lineTo(i+.5,h);c.moveTo(0,i+.5);c.lineTo(w,i+.5);}
    c.stroke();
  };
  const map=canvasTex(1024,1024,(c,w,h)=>paint(c,w,h,'#ffffff','#85827c'));
  const hc=document.createElement('canvas');hc.width=hc.height=512;
  paint(hc.getContext('2d'),512,512,'#808080','#6a6a6a');
  return {map,normalMap:normalFromHeight(hc,.25)};
};

export function makeBody(){
  const group=new THREE.Group();
  const subMat=std({color:0xffffff,map:substrateMap(),metalness:.25,roughness:.62});
  const pkgMat=std({color:0xffffff,map:packageMap(),metalness:.35,roughness:.5});
  const dieMat=phys({color:0x20232a,metalness:1,roughness:.2,clearcoat:1,envMapIntensity:2,iridescence:.7,...dieMaps()});
  group.add(mesh(rbox(-11,-11,-3,111,111,0,.8),subMat),mesh(rbox(-4,-4,0,104,104,3,.6),pkgMat),mesh(rbox(0,0,3,100,100,5,.3),dieMat));
  subMat.transparent=pkgMat.transparent=dieMat.transparent=true;
  return {group,setBase:k=>fade([subMat,pkgMat],k),setDie:k=>fade([dieMat],k)};
}
