// OLYMPUS v4.2: combat HUD, logs and cosmetic playback controls.
import {visibleEvents,describeEvent,publicScore} from './battle-report.js?v=42';
import {UNIVERSITY} from './sequential-mode.js?v=42';
import {stats} from './simulation.js?v=18';
import {attackChoices} from './tactical-controls.js?v=44';
const STORE='campus-frontier-battle-log-v42';
function el(tag,cls,value){
 const node=document.createElement(tag);if(cls)node.className=cls;
 if(value!==undefined)node.textContent=value;
 return node;
}
export function createBattleUX(root,getState,{onAttack=()=>{},isBusy=()=>false}={}){
 const statsRoot=root.querySelector('#seqStats');
 const button=el('button','seq-battle-badge','전황 보기');
 button.type='button';button.setAttribute('aria-expanded','false');
 statsRoot.append(button);
 const unit=el('section','seq-unit-card');unit.id='seqUnitCard';unit.hidden=true;
 const sheet=el('aside','seq-battle-sheet');sheet.id='seqBattleSheet';sheet.hidden=true;
 sheet.setAttribute('aria-label','전황 보고서');
 const head=el('div','seq-battle-heading');
 const close=el('button','seq-battle-close','닫기');close.type='button';
 head.append(el('strong','','전황 보고서'),close);
 const scores=el('div','seq-battle-score'),records=el('ol','seq-battle-entries');
 sheet.append(head,scores,el('h4','','최근 전투 기록'),records);
 const playback=el('div','seq-playback');playback.hidden=true;
 const phase=el('span','seq-playback-phase','상대 대학 행동 중');
 const speed=el('button','seq-playback-speed','1×');speed.type='button';
 const skip=el('button','seq-playback-skip','건너뛰기');skip.type='button';
 playback.append(phase,speed,skip);
 root.append(unit,sheet,playback);
 let log=[],session='',factor=1,skipped=false,lastSelected=null;
 function load(state){
   const id=state.playerTeam+':'+state.seed;
   if(id===session)return;
   session=id;log=[];
   try{
     const saved=JSON.parse(localStorage.getItem(STORE)||'null');
     if(saved?.id===id&&Array.isArray(saved.log))log=saved.log.filter(x=>Number.isInteger(x.turn)&&typeof x.message==='string').slice(-70);
   }catch{}
 }
 function save(){
   try{localStorage.setItem(STORE,JSON.stringify({id:session,log}));}catch{}
 }
 function record(events,before,after){
   if(!events?.length)return;load(after);
   for(const e of visibleEvents(events,before,after,after.playerTeam)){
     const message=describeEvent(e);
     if(message)log.push({turn:before.turn,message});
   }
   log=log.slice(-70);save();
 }
 function render(state,selected){
   if(!state)return;lastSelected=selected;load(state);
   const own=publicScore(state,state.playerTeam);
   button.textContent='전황 · '+own.total+'점';
   scores.replaceChildren();
   const lines=[
     '내 점수 '+own.total+'점',
     '거점 '+own.territory+' · 본진 '+own.base+' · 연구 '+own.science
   ];
   for(const team of Object.keys(UNIVERSITY)){
     if(team===state.playerTeam)continue;
     const available=publicScore(state,team);
     lines.push(UNIVERSITY[team].label+' · '+(available?(available.eligible?available.total+'점':'탈락'):'정보 부족'));
   }
   lines.forEach(s=>scores.append(el('p','',s)));
   if(!state.result)scores.append(el('small','', '적의 미확인 점수·연구·본진 체력은 공개하지 않습니다.'));
   records.replaceChildren();
   if(!log.length)records.append(el('li','seq-log-empty','아직 기록된 행동이 없습니다.'));
   for(const item of [...log].reverse().slice(0,28))records.append(el('li','',''+item.turn+'R · '+item.message));
   const u=state.units.find(x=>x.id===selected&&x.team===state.playerTeam);
   unit.hidden=!u;
   if(!u){unit.replaceChildren();return;}
   unit.replaceChildren();
   unit.append(el('strong','',stats(u).name+' · '+u.hp+'/'+stats(u).hp+' HP'));
   const attack=stats(u).attack+(state.technologies?.[u.team]?.military??0);
   unit.append(el('p','','공격 '+attack+' · 기본 방어 '+stats(u).defense+' · 이동 '+stats(u).move));
   if(state.acted.includes(u.id)){unit.append(el('small','','이번 라운드 행동 완료'));return;}
   const list=attackChoices(state,u.id);
   if(!list.length){unit.append(el('small','','공격 가능한 적이 없습니다.'));return;}
   const group=el('div','seq-target-list');
   group.append(el('small','','공격 가능한 대상 · 예상 피해'));
   for(const info of list){
     const attack=el('button','seq-target-preview');attack.type='button';attack.disabled=isBusy();
     attack.append(el('strong','',info.label),el('span','',info.damage+' 피해 → '+info.remainingHp+' HP'+(info.defeat?' · 격파 가능':'')+' · 공격'));
     attack.onclick=()=>{if(!isBusy())onAttack(u.id,info.target);};
     group.append(attack);
   }
   unit.append(group);
 }
 function setOpen(open){
   sheet.hidden=!open;button.setAttribute('aria-expanded',String(open));
   unit.classList.toggle('seq-covered',open);
 }
 button.onclick=()=>{setOpen(sheet.hidden);render(getState(),lastSelected);};
 close.onclick=()=>setOpen(false);
 speed.onclick=()=>{factor=factor===1?2:1;speed.textContent=factor+'×';};
 skip.onclick=()=>{skipped=true;skip.disabled=true;phase.textContent='최종 전황 적용 중';};
 function playbackStart(){skipped=false;skip.disabled=false;playback.hidden=false;phase.textContent='상대 대학 행동 중';}
 function playbackEnd(){skipped=false;playback.hidden=true;}
 return {
   render,record,playbackStart,playbackEnd,
   phaseLabel:text=>{phase.textContent=text;},
   getSpeed:()=>factor,isSkipped:()=>skipped
 };
}
