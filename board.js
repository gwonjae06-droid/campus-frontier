import {unitModel} from './unit-model.js?v=43';
import {DEFAULT_PITCH,DEFAULT_ANGLE,clampPitch,orbitPosition,mapHalfSpan,orthographicPixelScales} from './camera.js?v=22';
import {DEPOSITS} from './growth.js?v=091';
import * as T from './vendor/three.module.js';
import {SIZE,terrain,isCampus,key,stats,reachable,targets,GATES,ENEMY_BASE,RIVAL_BASE} from './simulation.js?v=18';
import {makeCampus} from './campus.js?v=22';
import {CAMPUS_PLOT_WIDTH} from './campus-scale.js?v=15';
import {addUrbanCell,CAMPUS_COLORS} from './urban-city.js?v=22';
import {makeRivalCampus} from './rival-campuses.js?v=12';
import {visibleTiles,exploredTiles,tileKey} from './vision.js?v=42';
import {MIN_ZOOM,MAX_ZOOM,clampZoom,gestureMetrics,pinchZoom,swipePan} from './touch-gestures.js?v=17';
export const coord=n=>(n-(SIZE-1)/2)*1.12;
export function createBoard(container,data,onPick,onDragEnd,onViewChange,rivalData={}){
  const scene=new T.Scene();scene.background=new T.Color('#e5e9e3');const world=new T.Group();scene.add(world);
  const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,matchMedia('(max-width:760px)').matches?1.5:2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;container.append(renderer.domElement);
  // Use one world-to-screen scale and allow a closer initial view in portrait.
  // Portrait users pan a little rather than seeing an illegibly tiny full map.
  const defaultZoom=()=>{const rect=container.getBoundingClientRect();return rect.width/Math.max(1,rect.height)<.78?1.25:1.0;};
  const camera=new T.OrthographicCamera(-15,15,15,-15,.01,150),materials=new Map(),tilePicks=[];let pitch=DEFAULT_PITCH,angle=DEFAULT_ANGLE,zoom=defaultZoom(),focus=false,target=new T.Vector3(),w=1,h=1;
  scene.add(new T.HemisphereLight(0xffffff,0x80988d,1.9));const sun=new T.DirectionalLight(0xfff2d8,2.8);sun.position.set(-12,27,11);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-15,right:15,top:15,bottom:-15,near:1,far:70});sun.shadow.normalBias=.015;scene.add(sun);
  function mat(c){if(!materials.has(c))materials.set(c,new T.MeshStandardMaterial({color:c,roughness:.85}));return materials.get(c);}
  function box(parent,w,h,d,color,x,y,z){const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),mat(color));mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
  function cone(parent,r,h,color,x,y,z,n=5){const mesh=new T.Mesh(new T.ConeGeometry(r,h,n),mat(color));mesh.position.set(x,y,z);mesh.castShadow=true;parent.add(mesh);return mesh;}
  function flag(parent,x,y,z,color){box(parent,.025,.6,.025,'#a18b69',x,y+.3,z);box(parent,.32,.19,.025,color,x+.16,y+.48,z);}
  const groundTiles=new Map();
  for(let z=0;z<SIZE;z++)for(let x=0;x<SIZE;x++){
    const cell=new T.Group();groundTiles.set(tileKey(x,z),cell);world.add(cell);
    const type=terrain(x,z),water=type==='water';
    const color=CAMPUS_COLORS[type]??(water?'#6fabb8':type==='resource'?'#c9ac66':type==='forest'?'#9daf8c':type==='hill'?'#a5b5a0':(x+z)%3===0?'#c4cfaa':'#ced6b6');
    const tile=box(cell,1.095,.3,1.095,color,coord(x),-.15,coord(z));tile.userData.tile={x,z,type};tilePicks.push(tile);
    if(type==='hill')cone(cell,.53,.68,'#697b7c',coord(x),.38,coord(z),5);
    if(type==='forest'){box(cell,.07,.4,.07,'#765c40',coord(x),.2,coord(z));cone(cell,.3,.7,'#285d42',coord(x),.7,coord(z));}
    if(type==='water')box(cell,.33,.012,.025,'#8cdbea',coord(x),.015,coord(z));
    if(type==='resource'){const central=x===10&&z===10;box(cell,central?.94:.58,.2,central?.94:.58,central?'#f2c252':'#deb56a',coord(x),.1,coord(z));cone(cell,central?.33:.21,central?.68:.42,central?'#b37b2e':'#a57b37',coord(x),central?.55:.4,coord(z),central?6:4);}
    addUrbanCell(T,cell,x,z,type,coord(x),coord(z),box,mat);
  }
  const campus=makeCampus(data,'skku');campus.group.position.set(coord(3.5),0,coord(3.5));world.add(campus.group);
  // These are *plot* boundaries, not bases: all three plots are exactly
  // 4×4 tiles while every building's X/Z ratio stays uniform inside.
  function campusBorder(gridX,gridZ,color){
    const cx=coord(gridX),cz=coord(gridZ),half=CAMPUS_PLOT_WIDTH/2-.065;
    const corners=[[-half,-half],[half,-half],[half,half],[-half,half]]
      .map(([x,z])=>new T.Vector3(cx+x,.043,cz+z));
    const outline=new T.LineLoop(new T.BufferGeometry().setFromPoints(corners),
      new T.LineBasicMaterial({color,linewidth:2,depthTest:true}));
    world.add(outline);return outline;
  }
  campusBorder(3.5,3.5,'#17c779');
  flag(world,coord(4)+.42,.25,coord(4)+.42,'#24855f');
  const korea=rivalData.korea?.buildings?.length?makeCampus(rivalData.korea,'korea'):makeRivalCampus('korea'),yonsei=rivalData.yonsei?.buildings?.length?makeCampus(rivalData.yonsei,'yonsei'):makeRivalCampus('yonsei');
  const tent=korea.group,rivalCampus=yonsei.group;
  tent.position.set(coord(16.5),0,coord(16.5));rivalCampus.position.set(coord(16.5),0,coord(3.5));
  world.add(tent,rivalCampus);
  campusBorder(16.5,16.5,'#ed5669');
  campusBorder(16.5,3.5,'#66a9ee');
  box(world,SIZE*1.14,.14,SIZE*1.14,'#c3cbbd',0,-.4,0);
  function label(text,x,y,z,color){const c=document.createElement('canvas');c.width=512;c.height=90;const ctx=c.getContext('2d');ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(0,0,512,90,18);ctx.fill();ctx.fillStyle='#fff8e4';ctx.font='bold 34px sans-serif';ctx.textAlign='center';ctx.fillText(text,256,58,488);const s=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(c),depthTest:false,toneMapped:false}));s.position.set(x,y,z);s.scale.set(3.65,.642,1);world.add(s);return s;}
  const labels=[label('성균관대 · 56동',coord(3.5),1.5,coord(2),'#285e46'),label('고려대 · 172동',coord(16.5),1.5,coord(17),'#a9624c'),label('연세대 · 232동',coord(16.5),1.5,coord(3),'#506d9d'),label('중앙 거점 · 5점',coord(10),1.65,coord(10),'#a6782a')];
  let dynamic=new T.Group(),preview=new T.Group();world.add(dynamic,preview);let unitMeshes=new Map(),currentState=null,currentMode='move';
  function cleanup(g){g.traverse(o=>{o.geometry?.dispose();if(o.material&&!materials.has(o.material.color?.getStyle())){if(o.userData.ownMaterial){o.material.map?.dispose();o.material.dispose();}}});world.remove(g);}
  function unitBadge(u,g){
    const c=document.createElement('canvas');c.width=320;c.height=78;const ctx=c.getContext('2d');
    const color=u.team==='ally'?'#176951':u.team==='enemy'?'#9a344a':'#285e9a';
    ctx.fillStyle='#fff9eb';ctx.beginPath();ctx.roundRect(2,2,316,74,12);ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=4;ctx.stroke();
    ctx.fillStyle=color;ctx.font='bold 32px sans-serif';ctx.textAlign='center';ctx.fillText(`${u.team==='ally'?'성':u.team==='enemy'?'고':'연'} · ${stats(u).name} ${u.hp}`,160,46);
    ctx.fillStyle='#d8dece';ctx.fillRect(16,60,288,7);ctx.fillStyle=color;ctx.fillRect(16,60,288*u.hp/stats(u).hp,7);
    const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;const sprite=new T.Sprite(new T.SpriteMaterial({map:texture,depthTest:false,depthWrite:false,toneMapped:false}));sprite.scale.set(1.5,1.5*78/320,1);sprite.position.y=u.kind==='cavalry'?1.48:1.25;sprite.renderOrder=4;sprite.userData.ownMaterial=true;g.add(sprite);
  }
  function createUnit(u,parent){const g=unitModel(u,box,cone,mat);g.position.set(coord(u.x),0,coord(u.z));if(u.id!=='planned')unitBadge(u,g);parent.add(g);return g;}
  function structure(s,parent,ghost=false){const g=new T.Group();g.position.set(coord(s.x),ghost?.04:0,coord(s.z));if(s.type==='wall'){box(g,.96,.48,.45,ghost?'#e6ca83':'#d8cfb4',0,.24,0);for(let i=-1;i<=1;i++)box(g,.2,.18,.48,'#e9dfc3',i*.34,.57,0);}else if(['recruit','scout','siege','cavalry'].includes(s.type)){const kind=s.type==='recruit'?'infantry':s.type;createUnit({id:'planned',team:'ally',kind,hp:stats({kind}).hp,x:0,z:0},g).position.set(0,0,0);}else{box(g,.54,.8,.54,ghost?'#e4c984':'#d9d1b8',0,.4,0);cone(g,.5,.4,'#396e54',0,1,0,4);flag(g,.2,1,.1,'#3ca572');}if(ghost)g.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.transparent=true;o.material.opacity=.6;o.userData.ownMaterial=true;}});parent.add(g);}
  function marker(parent,x,z,color,y=.025){const m=new T.Mesh(new T.BoxGeometry(1.02,.035,1.02),new T.MeshBasicMaterial({color,transparent:true,opacity:.45,depthWrite:false}));m.position.set(coord(x),y,coord(z));m.userData.ownMaterial=true;parent.add(m);}
  function sync(state,plan,selected,mode){currentState=state;currentMode=mode;cleanup(dynamic);cleanup(preview);dynamic=new T.Group();preview=new T.Group();world.add(dynamic,preview);unitMeshes=new Map();const viewer=state.playerTeam??'ally',visible=visibleTiles(state,viewer),explored=exploredTiles(state,viewer);for(const [k,g] of groundTiles){const [x,z]=k.split(',').map(Number);g.visible=state.gameMode!=='standard'||explored.has(k)||['campus','enemy-base','rival-base'].includes(terrain(x,z));}for(const u of state.units)if(u.team===viewer||visible.has(tileKey(u.x,u.z)))unitMeshes.set(u.id,createUnit(u,dynamic));for(const s of state.structures)if(state.gameMode!=='standard'||explored.has(tileKey(s.x,s.z)))structure(s,dynamic,s.ready>state.turn);for(const b of plan.builds)structure(b,preview,true);for(const b of state.pendingRecruits??[])structure({...b,type:b.kind},preview,true);
    for(const [id,o] of Object.entries(plan.orders)){const u=state.units.find(u=>u.id===id);if(!u)continue;if(o.type!=='move')marker(preview,u.x,u.z,o.type==='attack'?'#e09569':'#8cbccc');if(o.type==='move'){marker(preview,o.x,o.z,'#e9b84e');const line=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(coord(u.x),.16,coord(u.z)),new T.Vector3(coord(o.x),.16,coord(o.z))]),new T.LineBasicMaterial({color:'#bd8c2d'}));line.userData.ownMaterial=true;preview.add(line);}}
    const u=state.units.find(u=>u.id===selected);if(u){marker(preview,u.x,u.z,'#fff4ba');if(mode==='move'){
 for(const {x,z} of reachable(state,u,plan))marker(preview,x,z,'#59b98b');
 for(const t of targets(state,u)){
  const enemy=t.kind==='unit'?state.units.find(v=>v.id===t.id):null;
  if(enemy)marker(preview,enemy.x,enemy.z,'#e77964');
  if(t.kind==='base')for(const gate of t.team==='enemy'?[{x:14,z:17}]:[{x:17,z:6}])marker(preview,gate.x,gate.z,'#e77964');
 }
}}
    for(const d of DEPOSITS){if(state.gameMode==='standard'&&!explored.has(tileKey(d.x,d.z)))continue;const developed=state.developed[`${d.x},${d.z}`];box(dynamic,.45,developed?.25:.08,.45,developed?'#73a5ac':'#bd9f61',coord(d.x),developed?.13:.04,coord(d.z));}
    for(const g of state.ruleset==='sequential'?(state.playerTeam==='enemy'?[{x:17,z:14},{x:19,z:17},{x:17,z:19},{x:14,z:17}]:state.playerTeam==='rival'?[{x:17,z:1},{x:19,z:3},{x:17,z:6},{x:14,z:3}]:GATES):GATES)marker(preview,g.x,g.z,'#eac76c');
 if(state.ruleset==='sequential'){
  for(const p of state.bonusResources??[]){
   if(p.claimed||!explored.has(tileKey(p.x,p.z)))continue;
   const bonus=new T.Group();bonus.position.set(coord(p.x),0,coord(p.z));
   const gem=new T.Mesh(new T.OctahedronGeometry(.21,0),new T.MeshStandardMaterial({color:p.amount>=5?'#e5ae44':'#7ac6b3',metalness:.3,roughness:.5}));
   gem.position.y=.3;bonus.add(gem);dynamic.add(bonus);
  }
  for(const [k,owner] of Object.entries(state.points)){
   if(!owner||!explored.has(k))continue;
   const level=state.cityLevels?.[k]??1,[x,z]=k.split(',').map(Number);
   const g=new T.Group();g.position.set(coord(x),.04,coord(z));
   const roofColor=owner==='ally'?'#26795c':owner==='enemy'?'#a85260':'#4777aa';
   for(let i=0;i<level;i++){
    const xOffset=(i-(level-1)/2)*.27;
    const hall=new T.Mesh(new T.BoxGeometry(.25,.2+.10*i,.31),new T.MeshStandardMaterial({color:'#e9e3cf'}));
    hall.position.set(xOffset,.14+.05*i,-.03);g.add(hall);
    const roof=new T.Mesh(new T.ConeGeometry(.21,.15,4),new T.MeshStandardMaterial({color:roofColor}));
    roof.rotation.y=Math.PI/4;roof.position.set(xOffset,.31+.1*i,-.03);g.add(roof);
   }
   dynamic.add(g);
  }
  for(const id of state.acted??[]){
   const u=state.units.find(v=>v.id===id);
   if(u?.team===viewer)marker(preview,u.x,u.z,'#b1b6ab',.07);
  }
 }
    for(const k of state.roads??[]){const [x,z]=k.split(',').map(Number);const m=new T.Mesh(new T.BoxGeometry(.83,.04,.26),mat('#cbb78c'));m.position.set(coord(x),.09,coord(z));dynamic.add(m);}
    if(state.grandConstruction||state.grandCompleted)flag(dynamic,coord(3)-.9,.3,coord(3)-.9,state.grandCompleted?'#e2b046':'#94a2ac');
    for(const [k,currentOwner] of Object.entries(state.points)){
      const owner=state.gameMode==='standard'&&!visible.has(k)?state.lastKnownPoints?.[viewer]?.[k]:currentOwner;
      if(!owner||(state.gameMode==='standard'&&!explored.has(k)))continue;const [x,z]=k.split(',').map(Number);flag(dynamic,coord(x)+.25,.3,coord(z),owner==='ally'?'#2b8f63':owner==='rival'?'#4d75ad':'#bb6048');}
    if(state.gameMode==='standard'){
     const baseKnown=(x,z)=>{for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++)if(explored.has(tileKey(x+dx,z+dz)))return true;return false;};
     // Capital silhouettes are known from the start; troops remain hidden by vision.
     tent.visible=true;rivalCampus.visible=true;
     labels[1].visible=!focus;
     labels[2].visible=!focus;
     labels[3].visible=(explored.has('10,10')||visible.has('10,10'))&&!focus;
     // Only never-visited cells are fogged. Previously discovered terrain
     // remains visible after troops depart; current enemy units are still
     // filtered by visibleTiles above.
     const undiscovered=[];
     for(let z=0;z<SIZE;z++)for(let x=0;x<SIZE;x++){
      const k=tileKey(x,z);
      if(!explored.has(k)&&!['campus','enemy-base','rival-base'].includes(terrain(x,z)))
       undiscovered.push({x,z});
     }
     if(undiscovered.length){
      const fog=new T.InstancedMesh(new T.BoxGeometry(1.108,.075,1.108),
       new T.MeshBasicMaterial({color:'#899a99',depthWrite:true,transparent:false}),undiscovered.length);
      fog.frustumCulled=false;
      const helper=new T.Object3D();
      undiscovered.forEach(({x,z},i)=>{helper.position.set(coord(x),.025,coord(z));helper.updateMatrix();fog.setMatrixAt(i,helper.matrix);});
      fog.instanceMatrix.needsUpdate=true;fog.userData.ownMaterial=true;dynamic.add(fog);
     }
    }else{tent.visible=true;rivalCampus.visible=true;}
  }
  function resize(){const rect=container.getBoundingClientRect();w=Math.max(1,rect.width);h=Math.max(1,rect.height);renderer.setSize(w,h);const span=mapHalfSpan(SIZE,1.12,pitch,angle,w/h);camera.left=-span*w/h;camera.right=span*w/h;camera.top=span;camera.bottom=-span;camera.zoom=zoom;const pos=orbitPosition(angle,pitch,target);camera.position.set(pos.x,pos.y,pos.z);camera.lookAt(target);camera.updateProjectionMatrix();onViewChange?.(pitch,zoom);}new ResizeObserver(resize).observe(container);resize();
  const ray=new T.Raycaster(),pointer=new T.Vector2();function pick(e){const r=container.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);const unitHit=ray.intersectObjects([...unitMeshes.values()],true)[0];if(unitHit){let node=unitHit.object;while(node&&!node.userData.unitId)node=node.parent;const u=currentState?.units.find(u=>u.id===node?.userData.unitId);if(u)return {x:u.x,z:u.z};}if(focus&&currentMode==='inspect'){const building=ray.intersectObjects([...campus.picks,...korea.picks,...yonsei.picks])[0];if(building)return {building:building.object.userData.building};}const hit=ray.intersectObjects(tilePicks)[0];return hit?.object.userData.tile;}
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
    const pixelWorld=1/orthographicPixelScales(SIZE,1.12,pitch,gesture.angle,w,h,gesture.startZoom).x;
    const lower=coord(0),upper=coord(SIZE-1);
    const next=swipePan(gesture.startTarget,m.x-gesture.x,m.y-gesture.y,angle,pitch,pixelWorld,{min:lower,max:upper});
    target.x=next.x;target.z=next.z;
  }
  canvas.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'&&![0,1,2].includes(e.button))return;
    e.preventDefault();pointers.set(e.pointerId,pointerPos(e));
    try{canvas.setPointerCapture(e.pointerId);}catch{}
    if(pointers.size>=2)beginGesture();
    else if(!gesture)down={id:e.pointerId,x:e.clientX,y:e.clientY,startTarget:target.clone(),startZoom:zoom,button:e.button,moved:false};
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
    if(Math.hypot(dx,dy)>10)down.moved=true;
    if(down.moved){
      const worldPerPixel=1/orthographicPixelScales(SIZE,1.12,pitch,angle,w,h,down.startZoom).x;
      const lower=coord(0),upper=coord(SIZE-1);
      const next=swipePan(down.startTarget,dx,dy,angle,pitch,worldPerPixel,{min:lower,max:upper});
      target.x=next.x;target.z=next.z;
      resize();
    }
  },{passive:false});
  function finishPointer(e,canceled=false){
    if(!pointers.has(e.pointerId))return;
    const eligible=!canceled&&!gesture&&!gestureEnded&&down?.id===e.pointerId;
    const moved=!eligible||down.button!==0||down.moved||Math.hypot(e.clientX-down.x,e.clientY-down.y)>10;
    pointers.delete(e.pointerId);
    if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
    down=null;
    if(!pointers.size){gesture=null;gestureEnded=false;}
    if(!moved){const hit=pick(e);if(hit)onPick(hit);}
    else onDragEnd?.();
  }
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('pointerup',e=>finishPointer(e));
  canvas.addEventListener('pointercancel',e=>finishPointer(e,true));
  canvas.addEventListener('lostpointercapture',e=>{pointers.delete(e.pointerId);if(!pointers.size){gesture=null;gestureEnded=false;down=null;}});
  canvas.addEventListener('wheel',e=>{e.preventDefault();setZoom(zoom-e.deltaY*.0018)},{passive:false});
  function panBy(dx,dy){const scale=1/orthographicPixelScales(SIZE,1.12,pitch,angle,w,h,zoom).x;const next=swipePan(target,dx,dy,angle,pitch,scale,{min:coord(0),max:coord(SIZE-1)});target.x=next.x;target.z=next.z;resize();}
  function focusUnit(u){target.set(coord(u.x),0,coord(u.z));zoom=Math.max(zoom,2.5);resize();}
  function setPitch(value){pitch=clampPitch(value);resize();}
  function resetView(){pitch=DEFAULT_PITCH;angle=DEFAULT_ANGLE;setFocus(false);}
  function setFocus(value,school='skku'){focus=value;const center=school==='korea'?[16.5,16.5]:school==='yonsei'?[16.5,3.5]:[3.5,3.5];zoom=value?4.4:defaultZoom();target=value?new T.Vector3(coord(center[0]),.25,coord(center[1])):new T.Vector3();labels.forEach(s=>s.visible=!value);resize();}
  function zoomBy(d){setZoom(zoom+d);}
  async function animate(before,after,events,onPhase,options={}){
    const skip=()=>!!options.shouldSkip?.();
    const speed=()=>Math.max(1,options.getSpeed?.()??1);
    const wait=duration=>new Promise(resolve=>{
      let last=null,elapsed=0;
      function frame(now){
        if(skip())return resolve();
        if(last!==null)elapsed+=(now-last)*speed();last=now;
        if(elapsed>=duration)resolve();else requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
    onPhase('이동');
    const moves=events.filter(e=>e.type==='move');
    await new Promise(resolve=>{
      let last=null,progress=0;
      function frame(now){
        if(skip())return resolve();
        if(last!==null)progress+=(now-last)*speed()/650;last=now;
        const t=Math.min(1,progress),ease=t*t*(3-2*t);
        for(const m of moves){
          const mesh=unitMeshes.get(m.id);
          if(mesh)mesh.position.set(
            T.MathUtils.lerp(coord(m.from.x),coord(m.to.x),ease),
            Math.sin(t*Math.PI)*.07,
            T.MathUtils.lerp(coord(m.from.z),coord(m.to.z),ease));
        }
        if(t>=1)resolve();else requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
    if(skip())return;
    onPhase('전투');
    const flashes=new T.Group();world.add(flashes);
    function pos(ref){
      if(ref.kind==='unit'){
        const u=after.units.find(u=>u.id===ref.id)??before.units.find(u=>u.id===ref.id);
        const mesh=unitMeshes.get(ref.id);
        // Never draw a projectile path from a unit concealed by fog of war.
        if(!mesh && u?.team!==before.playerTeam && before.ruleset==='sequential')return null;
        return mesh?mesh.position.clone().add(new T.Vector3(0,.5,0)):u?new T.Vector3(coord(u.x),.5,coord(u.z)):null;
      }
      if(ref.kind==='structure'){
        const obj=before.structures.find(s=>s.id===ref.id);
        return obj?new T.Vector3(coord(obj.x),.8,coord(obj.z)):null;
      }
      const b=ref.team==='ally'?{x:4,z:4}:ref.team==='rival'?RIVAL_BASE:ENEMY_BASE;
      return new T.Vector3(coord(b.x),.6,coord(b.z));
    }
    try{
      for(const e of events.filter(e=>e.type==='attack')){
        const a=pos(e.from),b=pos(e.target);
        if(a&&b){
          const line=new T.Line(new T.BufferGeometry().setFromPoints([a,b]),new T.LineBasicMaterial({color:'#e7ab3f'}));
          line.userData.ownMaterial=true;flashes.add(line);
        }
      }
      await wait(400);
    }finally{cleanup(flashes);}
    if(skip())return;
    onPhase('정산');await wait(200);
  }
  function render(){requestAnimationFrame(render);if(document.body.classList.contains('in-battle'))renderer.render(scene,camera)}render();
  return {sync,panBy,focusUnit,setFocus,setPitch,setZoom,resetView,zoomBy,animate,campusCount:campus.group.userData.buildingCount,rivalCounts:{korea:korea.group.userData.buildingCount,yonsei:yonsei.group.userData.buildingCount}};
}
