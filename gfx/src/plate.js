import {THREE,createStage,studioEnv,detectTier} from './core.js';
import {makeBody} from './plate/body.js';
import {makeMods} from './plate/mods.js';
import {makeBus} from './plate/bus.js';
import {makeLid} from './plate/lid.js';
import {makeSand} from './sand.js';
import {makeTextLayer} from './labels.js';

const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const DEG=Math.PI/180;
const FILL=.5,FOV=22;

function readMods(){
  if(typeof document==='undefined')return [];
  return [...document.querySelectorAll('.mod')].map(el=>{
    const p=n=>parseFloat(el.style.getPropertyValue(n))||0;
    return {step:+el.dataset.step,x:p('--x'),y:p('--y'),w:p('--w'),h:p('--h'),
      title:el.querySelector('b')?.textContent.trim()||'',sub:el.querySelector('span')?.textContent.trim()||'',
      fab:el.classList.contains('fab')};
  });
}

export async function create({canvas,tier,preserve,theme,mods:given}={}){
  const stage=createStage(canvas,{alpha:true,preserve,exposure:1.15,fov:FOV});
  const {scene,camera,renderer}=stage;
  scene.environment=studioEnv(renderer);
  const light=new THREE.DirectionalLight(0xffffff,2.2);
  light.position.set(-40,70,120);
  scene.add(light);

  const root=new THREE.Group(),parts=new THREE.Group();
  root.rotation.order='XYZ'; // Rx*Rz, same order as the CSS transform
  parts.position.set(-50,-50,0);
  root.add(parts);
  scene.add(root);

  const high=(tier??detectTier())==='high';
  const body=makeBody(),lid=makeLid();
  const add=o=>{const n=o.group||o.root||o;if(n.isObject3D)parts.add(n);};
  add(body);add(lid);
  let list=null,modules,bus,sand,text;

  function build(mods){
    list=mods;
    modules=makeMods(mods);bus=makeBus(mods);
    add(modules);add(bus);
    sand=makeSand([
      {rect:[0,0,100,100],count:high?10000:3500,spread:60,color:'#e9dcc0'},
      ...mods.map(m=>({rect:[m.x,100-m.y-m.h,m.w,m.h],count:600,spread:45,color:'#e9dcc0'})),
      {rect:[0,0,100,100],count:5000,spread:55,color:'#d6d1c4'},
    ]);
    parts.add(sand.points);
    /* all of it can be see-through, and three sorts by mesh centre: a fading block at the back
       would draw first, write depth, and leave a hole in the die behind it. So: fixed layers. */
    const layer=(o,n)=>(o.group||o).traverse(c=>{c.renderOrder=n;});
    layer(modules,2);layer(bus,3);layer(lid,4);layer(sand.points,5);
    text=makeTextLayer(canvas,'plate-labels');
    mods.forEach(m=>text.add('m'+m.step,[['b',m.title||''],['i',m.sub||'']],.5,.5,m.fab?'fab':''));
    text.add('lid',[['b','RK-9'],['i','Solution Architect · Kathmandu'],['i','Nepal Life Insurance · 2018 to date']],.5,.5,'lid');
    text.size();
  }

  function resize(w,h){
    stage.size(w,h);
    text?.size();
    const aspect=w/h;
    camera.aspect=aspect;
    camera.position.set(0,0,(100/FILL/Math.min(1,aspect))/(2*Math.tan(FOV/2*DEG)));
    camera.lookAt(0,0,0);
    camera.updateProjectionMatrix();
  }

  function setTheme(t){light.intensity=t==='light'?2.6:2.2;}
  if(theme)setTheme(theme);

  return {stage,resize,setTheme,
    prepare(){
      if(!list){
        const mods=given?.length?given:readMods();
        if(mods.length)build(mods);
      }
      return stage.warm();
    },
    draw(state){
      const {s,N,cur,cf=0,cr=0,t=0,W,H}=state;
      if(!list)build(given?.length?given:state.mods?.length?state.mods:readMods());
      if(W&&H&&(W!==stage._w||H!==stage._h)){stage._w=W;stage._h=H;resize(W,H);}
      // CSS y points down and its angles run clockwise, so both signs flip
      root.rotation.x=-56*DEG*(1-cf);
      root.rotation.z=-(-40+cr*10)*DEG*(1-cf);
      const f0=clamp(s/.85,0,1);
      body.setBase(clamp(s/.3,0,1));
      body.setDie(clamp((f0-.55)/.4,0,1));
      sand.setProgress(0,f0);
      list.forEach((m,i)=>{
        const k=m.step,f=clamp((s-k)/.75,0,1),b=clamp((s-k-.45)/.35,0,1);
        modules.setMod(k,clamp((f-.55)/.35,0,1),k===cur&&f>.55);
        bus.setBus(k,b);
        bus.setPulse(k,b>=1,t);
        sand.setProgress(i+1,f);
      });
      const fl=clamp((s-(N-1))/.7,0,1);
      lid.setLid(clamp((fl-.5)/.4,0,1));
      sand.setProgress(list.length+1,fl);
      sand.points.visible=s<N&&(s%1<.8||s<.9);
      stage.render();
      /* the type sits on each block, and goes under the lid as it forms */
      const lidK=clamp((fl-.2)/.5,0,1),W2=stage.w,H2=stage.h;
      text.onPlane('lid',50,50,8.55,1,0,0,0,1,0,camera,W2,H2,clamp((fl-.55)/.35,0,1),parts,88);
      list.forEach(m=>{
        const f=clamp((s-m.step)/.75,0,1);
        text.onPlane('m'+m.step,m.x+m.w/2,100-m.y-m.h/2,7,1,0,0,0,1,0,camera,W2,H2,clamp((f-.6)/.3,0,1)*(1-lidK),parts,m.w*.86);
      });
    },
    dispose(){
      text?.dispose();
      scene.traverse(o=>{o.geometry?.dispose?.();[].concat(o.material||[]).forEach(m=>m.dispose?.());});
      scene.environment?.dispose?.();
      if(stage.dispose)stage.dispose();else renderer.dispose();
    },
  };
}

export function mockState(w,h){
  return {s:6.4,N:10,cur:6,cf:0,cr:.6,t:1,W:w,H:h,mods:[
    {step:1,x:5,y:5,w:42,h:27,title:'ARCH',sub:'90,000 clients'},
    {step:2,x:53,y:5,w:42,h:27,title:'DATA',sub:'~50% latency'},
    {step:3,x:5,y:37,w:27,h:25,title:'SECURITY',sub:'OIDC · RBAC'},
    {step:4,x:37,y:37,w:26,h:25,title:'GATEWAY',sub:'YARP'},
    {step:5,x:68,y:37,w:27,h:25,title:'PAYMENTS',sub:'0 duplicates'},
    {step:6,x:5,y:67,w:42,h:13,title:'DELIVERY',sub:'bi-weekly'},
    {step:7,x:53,y:67,w:42,h:13,title:'GRAHAN',sub:'v1.0 on npm'},
    {step:8,x:5,y:84,w:90,h:11,title:'DATA AND AI',sub:'MSc, 2027',fab:true},
  ]};
}
