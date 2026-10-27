import {DEFAULT_PITCH,clampPitch,orbitPosition} from './camera.js?v=05';
import {DEPOSITS} from './growth.js?v=08';
import * as T from './vendor/three.module.js';
import {SIZE,terrain,isCampus,key,stats,reachable,GATES,ENEMY_BASE} from './simulation.js?v=08';
import {makeCampus} from './campus.js';
import {MIN_ZOOM,MAX_ZOOM,clampZoom,gestureMetrics,pinchZoom,groundPan} from './touch-gestures.js?v=06';
export const coord=n=>(n-(SIZE-1)/2)*1.12;
export function createBoard(container,data,onPick,onDragEnd,onViewChange){
  const scene=new T.Scene();scene.background=new T.Color('#e9eee4');const world=new T.Group();scene.add(world);
  const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.9;container.append(renderer.domElement);
  const camera=new T.OrthographicCamera(-15,15,15,-15,.01,150),materials=new Map(),tilePicks=[];let pitch=DEFAULT_PITCH,angle=Math.PI/4,zoom=1,focus=false,target=new T.Vector3(),w=1,h=1;
  scene.add(new T.HemisphereLight(0xffffff,0x829276,2));const sun=new T.DirectionalLight(0xfff2d8,2.8);sun.position.set(-12,26,12);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-15,right:15,top:15,bottom:-15,near:1,far:70});sun.shadow.normalBias=.015;scene.add(sun);
  function mat(c){if(!materials.has(c))materials.set(c,new T.MeshStandardMaterial({color:c,roughness:.85}));return materials.get(c);}
  function box(parent,w,h,d,color,x,y,z){const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),mat(color));mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
  function cone(parent,r,h,color,x,y,z,n=5){const mesh=new T.Mesh(new T.ConeGeometry(r,h,n),mat(color));mesh.position.set(x,y,z);mesh.castShadow=true;parent.add(mesh);return mesh;}
  function flag(parent,x,y,z,color){box(parent,.025,.6,.025,'#a18b69',x,y+.3,z);box(parent,.32,.19,.025,color,x+.16,y+.48,z);}
  for(let z=0;z<SIZE;z++)for(let x=0;x<SIZE;x++){
    const type=terrain(x,z),water=type==='water',color=water?'#65b4bf':isCampus(x,z)?'#5c9672':type==='resource'?'#d6bb76':(x+z)%3===0?'#abc587':'#b5cc91';
    const tile=box(world,1.095,.3,1.095,color,coord(x),-.15,coord(z));tile.userData.tile={x,z,type};tilePicks.push(tile);
    if(type==='hill')cone(world,.53,.68,'#9dae97',coord(x),.38,coord(z),5);
    if(type==='forest'){box(world,.07,.4,.07,'#887357',coord(x),.2,coord(z));cone(world,.3,.7,'#427351',coord(x),.7,coord(z));}
    if(type==='water')box(world,.33,.012,.025,'#a9d9d7',coord(x),.015,coord(z));
    if(type==='resource'){const central=x===10&&z===10;box(world,central?.94:.58,.2,central?.94:.58,central?'#e9c46e':'#e6d39c',coord(x),.1,coord(z));cone(world,central?.33:.21,central?.68:.42,central?'#bd8438':'#be9850',coord(x),central?.55:.4,coord(z),central?6:4);}
  }
  const campus=makeCampus(data);campus.group.position.set(coord(3),.02,coord(3));world.add(campus.group);
  const outline=new T.LineLoop(new T.BufferGeometry().setFromPoints([new T.Vector3(-1.67,.12,-1.67),new T.Vector3(1.67,.12,-1.67),new T.Vector3(1.67,.12,1.67),new T.Vector3(-1.67,.12,1.67)]),new T.LineBasicMaterial({color:'#e4be65'}));campus.group.add(outline);
  flag(world,coord(4)+.42,.25,coord(4)+.42,'#24855f');
  const tent=new T.Group();tent.position.set(coord(ENEMY_BASE.x),0,coord(ENEMY_BASE.z));
 box(tent,2.95,.1,2.95,'#b8a58d',0,.02,0);
 for(const [x,z,sz] of [[0,0,1],[-.8,-.5,.75],[.9,.45,.72],[-.5,.9,.6],[.7,-.8,.54]]){
   box(tent,.62*sz,.7*sz,.61*sz,'#bb7c68',x,.4*sz,z);
   cone(tent,.47*sz,.37*sz,'#765c56',x,.95*sz,z,4);
 }flag(tent,1.1,.65,-1.0,'#b84f3e');world.add(tent);
  box(world,SIZE*1.14,.14,SIZE*1.14,'#d1dacb',0,-.4,0);
  function label(text,x,y,z,color){const c=document.createElement('canvas');c.width=512;c.height=90;const ctx=c.getContext('2d');ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(0,0,512,90,18);ctx.fill();ctx.fillStyle='#fff8e4';ctx.font='bold 34px sans-serif';ctx.textAlign='center';ctx.fillText(text,256,58);const s=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(c),depthTest:false,toneMapped:false}));s.position.set(x,y,z);s.scale.set(2.9,.51,1);world.add(s);return s;}
  const labels=[label(`성균관대 · ${data.buildings.length}개 건물`,coord(3),1.3,coord(2),'#285e46'),label('훈련 상대 · AI 캠퍼스',coord(17),1.5,coord(17),'#a9624c'),label('중앙 거점 · 5점',coord(10),1.65,coord(10),'#a6782a')];
  let dynamic=new T.Group(),preview=new T.Group();world.add(dynamic,preview);let unitMeshes=new Map(),currentState=null;
  function cleanup(g){g.traverse(o=>{o.geometry?.dispose();if(o.material&&!materials.has(o.material.color?.getStyle())){if(o.userData.ownMaterial)o.material.dispose();}});world.remove(g);}
  function createUnit(u,parent){const g=new T.Group();g.position.set(coord(u.x),0,coord(u.z));const color=u.team==='ally'?'#276b51':'#b65c47';box(g,u.kind==='siege'?.48:.24,u.kind==='siege'?.22:.3,u.kind==='siege'?.34:.22,color,0,.24,0);if(u.kind==='cavalry')box(g,.38,.2,.54,'#9b7957',0,.19,0);if(u.kind==='siege'){box(g,.48,.07,.13,'#665e4b',0,.48,-.15);for(const x of [-.2,.2])cone(g,.1,.16,'#68593f',x,.11,.24,8);}box(g,.21,.19,.2,'#ead6af',0,.5,0);cone(g,.2,u.kind==='scout'?.28:.16,color,0,.67,0,4);box(g,.05,.35,.05,'#8d8971',.19,.36,0);box(g,.5,.045,.065,'#596a57',0,.84,0);box(g,.5*u.hp/stats(u).hp,.05,.07,u.team==='ally'?'#4dbb81':'#ec9673',-.25+.25*u.hp/stats(u).hp,.846,0);g.userData.unitId=u.id;parent.add(g);return g;}
  function structure(s,parent,ghost=false){const g=new T.Group();g.position.set(coord(s.x),ghost?.04:0,coord(s.z));if(s.type==='wall'){box(g,.96,.48,.45,ghost?'#e6ca83':'#d8cfb4',0,.24,0);for(let i=-1;i<=1;i++)box(g,.2,.18,.48,'#e9dfc3',i*.34,.57,0);}else if(['recruit','scout','siege','cavalry'].includes(s.type)){const kind=s.type==='recruit'?'infantry':s.type;createUnit({id:'planned',team:'ally',kind,hp:stats({kind}).hp,x:0,z:0},g).position.set(0,0,0);}else{box(g,.54,.8,.54,ghost?'#e4c984':'#d9d1b8',0,.4,0);cone(g,.5,.4,'#396e54',0,1,0,4);flag(g,.2,1,.1,'#3ca572');}if(ghost)g.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.transparent=true;o.material.opacity=.6;o.userData.ownMaterial=true;}});parent.add(g);}
  function marker(parent,x,z,color,y=.025){const m=new T.Mesh(new T.BoxGeometry(1.02,.035,1.02),new T.MeshBasicMaterial({color,transparent:true,opacity:.45,depthWrite:false}));m.position.set(coord(x),y,coord(z));m.userData.ownMaterial=true;parent.add(m);}
  function sync(state,plan,selected,mode){currentState=state;cleanup(dynamic);cleanup(preview);dynamic=new T.Group();preview=new T.Group();world.add(dynamic,preview);unitMeshes=new Map();for(const u of state.units)unitMeshes.set(u.id,createUnit(u,dynamic));for(const s of state.structures)structure(s,dynamic,s.ready>state.turn);for(const b of plan.builds)structure(b,preview,true);for(const b of state.pendingRecruits??[])structure({...b,type:b.kind},preview,true);
    for(const [id,o] of Object.entries(plan.orders)){const u=state.units.find(u=>u.id===id);if(!u)continue;if(o.type!=='move')marker(preview,u.x,u.z,o.type==='attack'?'#e09569':'#8cbccc');if(o.type==='move'){marker(preview,o.x,o.z,'#e9b84e');const line=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(coord(u.x),.16,coord(u.z)),new T.Vector3(coord(o.x),.16,coord(o.z))]),new T.LineBasicMaterial({color:'#bd8c2d'}));line.userData.ownMaterial=true;preview.add(line);}}
    const u=state.units.find(u=>u.id===selected);if(u){marker(preview,u.x,u.z,'#fff4ba');if(mode==='move')for(const {x,z} of reachable(state,u,plan))marker(preview,x,z,'#59b98b');}
    for(const d of DEPOSITS){const developed=state.developed[`${d.x},${d.z}`];box(dynamic,.45,developed?.25:.08,.45,developed?'#73a5ac':'#bd9f61',coord(d.x),developed?.13:.04,coord(d.z));}
    for(const g of GATES)marker(preview,g.x,g.z,'#eac76c');
    for(const k of state.roads??[]){const [x,z]=k.split(',').map(Number);const m=new T.Mesh(new T.BoxGeometry(.83,.04,.26),mat('#cbb78c'));m.position.set(coord(x),.09,coord(z));dynamic.add(m);}
    if(state.grandConstruction||state.grandCompleted)flag(dynamic,coord(3)-.9,.3,coord(3)-.9,state.grandCompleted?'#e2b046':'#94a2ac');
    for(const [k,owner] of Object.entries(state.points)){if(!owner)continue;const [x,z]=k.split(',').map(Number);flag(dynamic,coord(x)+.25,.3,coord(z),owner==='ally'?'#2b8f63':'#bb6048');}
  }
  function resize(){const rect=container.getBoundingClientRect();w=rect.width;h=rect.height;renderer.setSize(w,h);const span=Math.max(14.2,19.5*Math.sin(pitch*Math.PI/180),19/(w/h));camera.left=-span*w/h;camera.right=span*w/h;camera.top=span;camera.bottom=-span;camera.zoom=zoom;const pos=orbitPosition(angle,pitch,target);camera.position.set(pos.x,pos.y,pos.z);camera.lookAt(target);camera.updateProjectionMatrix();onViewChange?.(pitch,zoom);}new ResizeObserver(resize).observe(container);resize();
  const ray=new T.Raycaster(),pointer=new T.Vector2();function pick(e){const r=container.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);if(focus){const building=ray.intersectObjects(campus.picks)[0];if(building)return {building:building.object.userData.building};}const hit=ray.intersectObjects(tilePicks)[0];return hit?.object.userData.tile;}
  const canvas=renderer.domElement;canvas.style.touchAction='none';
  const pointers=new Map();let down=null,gesture=null,gestureEnded=false;
  function pointerPos(e){return {x:e.clientX,y:e.clientY};}
  function metrics(){return gestureMetrics([...pointers.values()]);}
  function setZoom(value){zoom=clampZoom(value);resize();}
  function beginGesture(){
    const m=metrics();if(!m)return;
    gesture={...m,startZoom:zoom,startTarget:target.clone(),angle};down=null;gestureEnded=true;
  }
  function panFromGesture(m){
    const pixelWorld=(2*Math.max(14.2,19.5*Math.sin(pitch*Math.PI/180),19/(w/h)))/(Math.max(h,1)*gesture.startZoom);
    const shift=groundPan(m.x-gesture.x,m.y-gesture.y,gesture.angle,pixelWorld);
    const lower=focus?coord(1):coord(0),upper=focus?coord(5):coord(SIZE-1);
    target.x=T.MathUtils.clamp(gesture.startTarget.x+shift.x,lower,upper);
    target.z=T.MathUtils.clamp(gesture.startTarget.z+shift.z,lower,upper);
  }
  canvas.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'&&e.button!==0)return;
    e.preventDefault();pointers.set(e.pointerId,pointerPos(e));
    try{canvas.setPointerCapture(e.pointerId);}catch{}
    if(pointers.size>=2)beginGesture();
    else if(!gesture)down={id:e.pointerId,x:e.clientX,y:e.clientY,a:angle,p:pitch,moved:false};
  });
  canvas.addEventListener('pointermove',e=>{
    if(!pointers.has(e.pointerId))return;
    if(e.pointerType!=='mouse')e.preventDefault();
    pointers.set(e.pointerId,pointerPos(e));
    if(pointers.size>=2){if(!gesture)beginGesture();const m=metrics();if(!m)return;
      zoom=pinchZoom(gesture.startZoom,gesture.distance,m.distance);
      panFromGesture(m);resize();return;
    }
    if(gesture||!down||e.pointerId!==down.id)return;
    const dx=e.clientX-down.x,dy=e.clientY-down.y;
    if(Math.hypot(dx,dy)>7)down.moved=true;
    if(down.moved){angle=down.a+dx*.006;pitch=clampPitch(down.p+dy*.18);resize();}
  },{passive:false});
  function finishPointer(e,canceled=false){
    if(!pointers.has(e.pointerId))return;
    const eligible=!canceled&&!gesture&&!gestureEnded&&down?.id===e.pointerId;
    const moved=!eligible||down.moved||Math.hypot(e.clientX-down.x,e.clientY-down.y)>7;
    pointers.delete(e.pointerId);
    if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
    down=null;
    if(!pointers.size){gesture=null;gestureEnded=false;}
    if(!moved){const hit=pick(e);if(hit)onPick(hit);}
    else onDragEnd?.();
  }
  canvas.addEventListener('pointerup',e=>finishPointer(e));
  canvas.addEventListener('pointercancel',e=>finishPointer(e,true));
  canvas.addEventListener('lostpointercapture',e=>{pointers.delete(e.pointerId);if(!pointers.size){gesture=null;gestureEnded=false;down=null;}});
  canvas.addEventListener('wheel',e=>{e.preventDefault();setZoom(zoom-e.deltaY*.0018)},{passive:false});
  function setPitch(value){pitch=clampPitch(value);resize();}
  function resetView(){pitch=DEFAULT_PITCH;angle=Math.PI/4;setFocus(false);}
  function setFocus(value){focus=value;zoom=value?4.4:1;target=value?new T.Vector3(coord(3),.25,coord(3)):new T.Vector3();labels.forEach(s=>s.visible=!value);resize();}
  function rotate(d){angle+=d*Math.PI/2;resize();}
  function zoomBy(d){setZoom(zoom+d);}
  async function animate(before,after,events,onPhase){
    onPhase('이동');const moves=events.filter(e=>e.type==='move');const start=performance.now();await new Promise(resolve=>{function frame(now){const t=Math.min(1,(now-start)/650),ease=t*t*(3-2*t);for(const m of moves){const mesh=unitMeshes.get(m.id);if(mesh)mesh.position.set(T.MathUtils.lerp(coord(m.from.x),coord(m.to.x),ease),Math.sin(t*Math.PI)*.07,T.MathUtils.lerp(coord(m.from.z),coord(m.to.z),ease));}if(t<1)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame)});
    onPhase('전투');const flashes=new T.Group();world.add(flashes);function pos(ref){if(ref.kind==='unit'){const u=after.units.find(u=>u.id===ref.id)??before.units.find(u=>u.id===ref.id);const mesh=unitMeshes.get(ref.id);return mesh?mesh.position.clone().add(new T.Vector3(0,.5,0)):u?new T.Vector3(coord(u.x),.5,coord(u.z)):null;}if(ref.kind==='structure'){const s=before.structures.find(s=>s.id===ref.id);return s?new T.Vector3(coord(s.x),.8,coord(s.z)):null;}return new T.Vector3(coord(ref.team==='ally'?4:13),.6,coord(ref.team==='ally'?4:13));}
    for(const e of events.filter(e=>e.type==='attack')){const a=pos(e.from),b=pos(e.target);if(a&&b){const l=new T.Line(new T.BufferGeometry().setFromPoints([a,b]),new T.LineBasicMaterial({color:'#e7ab3f'}));l.userData.ownMaterial=true;flashes.add(l);}}
    await new Promise(resolve=>setTimeout(resolve,400));cleanup(flashes);onPhase('정산');await new Promise(resolve=>setTimeout(resolve,200));
  }
  function render(){requestAnimationFrame(render);renderer.render(scene,camera)}render();
  return {sync,setFocus,setPitch,setZoom,resetView,rotate,zoomBy,animate,campusCount:campus.group.userData.buildingCount};
}
