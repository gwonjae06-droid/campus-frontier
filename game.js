import {newGame,resolve,FACTIONS,TECHS,TROOPS,LAST_TURN,orderFor,setRecruit,setResearch,score,totalIncome,contacts,describeCell,canHit,occupants,movementRange} from './engine.mjs';
import {BoardRenderer} from './renderer.js';
const $=id=>document.getElementById(id), STORE='campus-frontier-alpha-v2';
let state, selectedId=null, mode='move', lastToast=0, lastFrame=0, average=60;
const board=new BoardRenderer($('battle'));
const mobileView=()=>window.innerWidth<=600;
const defaultZoom=()=>mobileView()?.45:1;
const clampZoom=v=>Math.max(.35,Math.min(2.6,v));
board.zoom=defaultZoom();
async function importBuildings(){try{const res=await fetch('./data/skku-buildings.json');if(!res.ok)throw Error('캠퍼스 데이터 파일을 찾지 못함');const rows=await res.json();if(rows.length!==56)throw Error('건물 56개 개수 불일치');board.setSkku(rows);return true;}catch(e){console.warn('실제 캠퍼스 모형 데이터를 불러오지 못했습니다:',e);toast('캠퍼스 파일을 열지 못했습니다. 로컬 서버로 실행해 주세요.');return false;}}
function load(){try{const obj=JSON.parse(localStorage.getItem(STORE));if(obj?.version===2&&obj?.factions?.length===3&&obj?.tiles?.length===21&&obj?.units&&obj?.orders) return obj;}catch(e){console.warn(e)}return newGame();}
function save(){try{localStorage.setItem(STORE,JSON.stringify(state));}catch(e){console.warn('브라우저 저장을 사용할 수 없습니다.',e);}}
function toast(msg){const el=$('toast');el.textContent=msg;el.classList.add('show');const token=++lastToast;setTimeout(()=>{if(lastToast===token)el.classList.remove('show')},2500);}
function selected(){return state.units.find(u=>u.id===selectedId&&u.owner===0)||null;}
function shortAction(ord){if(!ord)return '대기';if(ord.kind==='move')return `이동 (${ord.x}, ${ord.y})`;if(ord.kind==='attack')return '공격 예약';return ({capture:'거점 점령',defend:'방어',heal:'회복'})[ord.kind]||ord.kind;}
function button(label,fn,{active=false,disabled=false}={}){const el=document.createElement('button');el.textContent=label;el.disabled=disabled;if(active)el.classList.add('active');el.addEventListener('click',fn);return el;}
function renderFactions(){const element=$('factions');element.replaceChildren();for(const f of state.factions){const line=document.createElement('div');line.className='faction'+(f.id===0?' mine':'');const header=document.createElement('div');header.className='faction-header';const name=document.createElement('span');const mark=document.createElement('span');mark.className='faction-mark';mark.style.background=f.color;name.append(mark,document.createTextNode(f.short));const scoreTag=document.createElement('span');scoreTag.className='faction-score';scoreTag.textContent=f.eliminated?'탈락':`${score(state,f.id)}점`;header.append(name,scoreTag);const status=document.createElement('div');status.className='faction-status';status.textContent=`본진 ${f.hp}/30  ·  병력 ${state.units.filter(u=>u.owner===f.id).length}  ·  거점 ${state.hubs.filter(h=>h.owner===f.id).length}`;line.append(header,status);element.append(line);}}
function renderSelection(){const section=$('selectionInfo'),actions=$('actions'),note=$('orderInfo');section.replaceChildren();actions.replaceChildren();note.textContent='';const unit=selected();
 if(unit){const t=TROOPS[unit.type],ord=state.orders[0]?.[unit.id];
  section.innerHTML=`<div class="minihead">아군 부대 · ${unit.id}</div><h3>${t.symbol} ${t.name}</h3><p>HP <b>${unit.hp} / ${t.hp}</b> · 공격 ${t.atk+(unit.type==='infantry'&&state.factions[0].techs.includes('tactics')?1:0)} · 방어 ${t.def} · 이동 ${t.move}</p><div class="meta">위치 (${unit.x}, ${unit.y}) · ${shortAction(ord)}</div>`;
  const live=state.phase==='planning';
  const modes=[['이동','move'],['공격','attack'],['점령','capture'],['방어','defend'],['회복','heal'],['취소','wait']];
  for(const [label,action] of modes){const click=()=>{if(action==='wait'){orderFor(state,0,unit.id,{kind:'wait'});mode='move';toast('예약 명령을 취소했습니다.')}else if(action==='capture'||action==='defend'||action==='heal'){
    const accepted=orderFor(state,0,unit.id,{kind:action});if(!accepted)toast(action==='capture'?'이 위치에서는 점령할 수 없습니다.':'명령을 예약할 수 없습니다.');else toast(`${label} 명령을 예약했습니다.`);
   }else {mode=action;toast(action==='attack'?'인접한 적 또는 적 캠퍼스를 클릭하세요.':'빛나는 이동 가능 칸을 클릭하세요.');}
   save();refresh();};actions.append(button(label,click,{active:mode===action&&(action==='move'||action==='attack'),disabled:!live}));}
  note.textContent=ord?`예약된 명령: ${shortAction(ord)} · 턴 실행 시 동시 처리`:'아직 명령이 없습니다. 선택하지 않은 부대는 대기합니다.';
  $('modeStatus').textContent=mode==='attack'?'공격 선택 중':'이동 선택 중';
 }else{
  const p=board.hover;
  if(p){const c=describeCell(state,p.x,p.y);const obj=c.b?`${c.b.short} 캠퍼스`:c.h?`${c.h.central?'중앙':'일반'} 거점`:c.u?`${state.factions[c.u.owner].short} ${TROOPS[c.u.type].name}`:c.terrain==='forest'?'숲':'평지';
   const title=document.createElement('h3');title.textContent=obj;const desc=document.createElement('p');desc.textContent=`좌표 (${p.x}, ${p.y}) · ${c.terrain==='forest'?'진입 비용 2':'진입 비용 1'}${c.h?' · 점령 명령으로 소유권 확보':''}`;section.append(title,desc);
  }else section.innerHTML='<h3>작전을 시작하세요.</h3><p>지도에서 아군 부대를 선택해 다음 턴 명령을 예약할 수 있습니다.</p>';
  $('modeStatus').textContent='';
 }
}
function renderRecruit(){const root=$('recruit');root.replaceChildren();const f=state.factions[0];for(const [type,t] of Object.entries(TROOPS)){
 const b=document.createElement('button');const chosen=f.recruit===type;if(chosen)b.classList.add('chosen');
 b.innerHTML=`<strong>${t.symbol} ${t.name}</strong><small>OP ${t.cost} · ${t.hp} HP · 이동 ${t.move}</small>`;
 b.disabled=state.phase!=='planning'||f.eliminated||(!chosen && f.op<t.cost);
 b.onclick=()=>{if(chosen){setRecruit(state,0,null);toast('모집 예약을 취소했습니다.')}else {if(f.recruit)f.recruit=null;if(!setRecruit(state,0,type)){toast('모집할 수 없습니다. 자원 또는 병력 상한을 확인하세요.');return;}toast(`${t.name} 모집을 예약했습니다.`);}save();refresh()};root.append(b);
 }
}
function renderResearch(){const root=$('research');root.replaceChildren();const f=state.factions[0];$('researchStat').textContent=f.research?'진행 중':'연구 선택';for(const t of TECHS){const done=f.techs.includes(t.id),selected=f.research===t.id;
 const b=document.createElement('button');if(done)b.classList.add('done');if(selected)b.classList.add('current');const left=document.createElement('div');const title=document.createElement('strong');title.textContent=(done?'✓ ':selected?'◈ ':'○ ')+t.title;const desc=document.createElement('small');desc.textContent=t.desc;left.append(title,desc);const prog=document.createElement('b');prog.textContent=done?'완료':`${f.progress[t.id]||0}/${t.cost}`;b.append(left,prog);b.disabled=done||state.phase!=='planning'||f.eliminated;b.onclick=()=>{setResearch(state,0,t.id);save();refresh();toast(`${t.title} 연구를 선택했습니다.`)};root.append(b);}}
function renderLog(){const root=$('log');root.replaceChildren();for(const item of state.history.slice(0,8)){const g=document.createElement('div');g.className='log-group';const title=document.createElement('b');title.textContent=item.turn===0?'작전 개시':`턴 ${item.turn} 결과`;g.append(title);for(const entry of item.lines.slice(0,5)){const p=document.createElement('p');p.textContent=entry;g.append(p);}root.append(g);}}
function refresh(){const f=state.factions[0];$('turnNo').textContent=`${Math.min(state.turn,LAST_TURN)} / ${LAST_TURN}`;$('op').textContent=f.op-(f.recruit?TROOPS[f.recruit].cost:0);$('income').textContent=`+${totalIncome(state,0)} / 턴`;$('rp').textContent=f.rp;$('score').textContent=score(state,0);$('baseHp').textContent=`${f.hp} / 30`;$('baseBar').style.width=`${f.hp/30*100}%`;
 const count=state.units.filter(u=>u.owner===0).length;$('unitCount').textContent=`${count} / ${Math.min(10,6+state.hubs.filter(h=>h.owner===0).length)}`;$('hubCount').textContent=`${state.hubs.filter(h=>h.owner===0).length} / 7`;
 const orders=Object.keys(state.orders[0]||{}).length+(f.recruit?1:0);$('orderStat').textContent=`예약 ${orders}개`;const resolveButton=$('resolve');resolveButton.disabled=state.phase!=='planning';resolveButton.textContent=state.phase==='finished'?'경기 종료':`턴 ${state.turn} 실행 ➜`;
 renderFactions();renderSelection();renderRecruit();renderResearch();renderLog();}
function tap(point){if(state.phase!=='planning')return;const {x,y}=point;const u=selected();const c=describeCell(state,x,y);
  if(u){if(mode==='attack'){
    const target=c.u&&c.u.owner!==0?{kind:'unit',id:c.u.id}:c.b&&c.b.id!==0?{kind:'base',owner:c.b.id}:null;
    if(target){if(orderFor(state,0,u.id,{kind:'attack',target})){toast('공격 예약 완료');}else toast('공격 사거리 밖이거나 공격할 수 없습니다.');}
    else toast('적 부대나 적 본진을 선택하세요.');
  }else if(c.u?.owner===0){selectedId=c.u.id;mode='move';toast(`${TROOPS[c.u.type].name} 선택`);}
  else if(orderFor(state,0,u.id,{kind:'move',x,y})){toast(`(${x}, ${y}) 이동 예약`);}
  else if(c.h&&c.h.x===u.x&&c.h.y===u.y&&orderFor(state,0,u.id,{kind:'capture'})){toast('거점 점령 예약');}
  else toast('이동할 수 없는 칸입니다. 다른 칸을 선택하세요.');
 }else if(c.u?.owner===0){selectedId=c.u.id;mode='move';toast(`${TROOPS[c.u.type].name} 선택`);}
 else if(c.h){toast(c.h.owner===null?'중립 거점입니다. 부대로 이동한 뒤 점령하세요.':'이미 점령된 거점입니다.');}
 save();refresh();}
function findClickUnit(px,py){let best=null,md=18*board.zoom;for(const u of state.units){const [xx,yy]=board.proj(u.x+.5,u.y+.5,.2);const d=Math.hypot(px-xx,py-yy);if(d<md){best=u;md=d;}}return best;}
let drag=null;let pinch=null;const pointers=new Map();const canvas=$('battle');
const distance=()=>{const ps=[...pointers.values()];return ps.length<2?0:Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y)};
canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.offsetX,y:e.offsetY});if(pointers.size===1){pinch=null;drag={x:e.offsetX,y:e.offsetY,lastX:e.offsetX,lastY:e.offsetY,moved:false};}else if(pointers.size===2){pinch={dist:distance(),zoom:board.zoom};drag=null;}});
canvas.addEventListener('pointermove',e=>{if(pointers.has(e.pointerId))pointers.set(e.pointerId,{x:e.offsetX,y:e.offsetY});if(pointers.size>=2){if(pinch&&pinch.dist>0)board.zoom=clampZoom(pinch.zoom*distance()/pinch.dist);return;}
 if(drag){const dx=e.offsetX-drag.lastX,dy=e.offsetY-drag.lastY;if(Math.hypot(e.offsetX-drag.x,e.offsetY-drag.y)>6)drag.moved=true;if(drag.moved){board.panX+=dx;board.panY+=dy;}drag.lastX=e.offsetX;drag.lastY=e.offsetY;}
 board.hover=board.hit(e.offsetX,e.offsetY);if(!selectedId)renderSelection();});
canvas.addEventListener('pointerup',e=>{const hadPinch=!!pinch;const wasDrag=drag?.moved;const wasSingle=pointers.size===1;pointers.delete(e.pointerId);if(pointers.size<2)pinch=null;drag=null;if(hadPinch||wasDrag||!wasSingle)return;
 const near=findClickUnit(e.offsetX,e.offsetY);if(near?.owner===0&&(mode!=='attack'||!selected())){selectedId=near.id;mode='move';save();refresh();toast(`${TROOPS[near.type].name} 선택`);return;}
 const p=near?{x:near.x,y:near.y}:board.hit(e.offsetX,e.offsetY);if(p)tap(p);});
canvas.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);drag=null;pinch=null;});
canvas.addEventListener('pointerleave',()=>{if(pointers.size===0){board.hover=null;if(!selectedId)renderSelection();}});
canvas.addEventListener('wheel',e=>{e.preventDefault();board.zoom=clampZoom(board.zoom*(e.deltaY>0?.92:1.08));},{passive:false});
$('rotateLeft').onclick=()=>board.angle=(board.angle+3)%4;$('rotateRight').onclick=()=>board.angle=(board.angle+1)%4;$('zoomIn').onclick=()=>board.zoom=clampZoom(board.zoom*1.16);$('zoomOut').onclick=()=>board.zoom=clampZoom(board.zoom/1.16);
$('homeView').onclick=()=>{board.angle=0;board.zoom=defaultZoom();board.panX=0;board.panY=0;};
$('resolve').onclick=()=>{if(state.phase!=='planning')return;const result=resolve(state);selectedId=null;mode='move';save();refresh();if(result.ok){toast(state.phase==='finished'?(state.victor===null?'무승부로 경기가 종료되었습니다.':`${state.factions[state.victor].short} 승리!`):`턴 ${state.turn-1} 완료 · ${result.kills}개 부대 전멸`);if(state.phase==='finished')$('infoDialog').showModal();}};
$('reset').onclick=()=>$('resetDialog').showModal();$('cancelReset').onclick=()=>$('resetDialog').close();$('confirmReset').onclick=()=>{state=newGame();selectedId=null;mode='move';board.angle=0;board.zoom=defaultZoom();board.panX=0;board.panY=0;save();refresh();$('resetDialog').close();toast('새 작전이 시작되었습니다.')};
$('help').onclick=()=>$('infoDialog').showModal();$('closeDialog').onclick=()=>$('infoDialog').close();$('aboutData').onclick=()=>{window.open('https://github.com/Hong-Iron/SMASH-SKKU','_blank','noopener,noreferrer');};
window.addEventListener('keydown',e=>{if(document.querySelector('dialog[open]')){if(e.key==='Escape')return;return;}if(e.key==='Escape'){selectedId=null;mode='move';refresh();}else if(e.key==='q'||e.key==='Q')board.angle=(board.angle+3)%4;else if(e.key==='e'||e.key==='E')board.angle=(board.angle+1)%4;else if(e.key==='+'||e.key==='=')board.zoom=clampZoom(board.zoom*1.1);else if(e.key==='-')board.zoom=clampZoom(board.zoom/1.1);});
function loop(now){const dt=lastFrame?now-lastFrame:16.7;lastFrame=now;if(dt>0&&dt<100){average=average*.94+Math.min(120,1000/dt)*.06;if(Math.round(now/1000)!==Math.round((now-dt)/1000))$('fps').textContent=`FPS ${Math.round(average)}`;}
  board.render(state,selected(),mode,now);requestAnimationFrame(loop);
}
state=load();refresh();importBuildings();requestAnimationFrame(loop);
if(!sessionStorage.getItem('campus-frontier-intro')){sessionStorage.setItem('campus-frontier-intro','seen');$('infoDialog').showModal();}
