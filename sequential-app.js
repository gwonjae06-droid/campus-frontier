// The Olympus campaign uses this direct-action, sequential-turn controller.
// v13 simultaneous campaign remains stored separately and can be restored via git.
import {createSequentialGame,applySequentialAction,endSequentialRound,UNIVERSITY,TEAMS,BRANCHES,technologyCost,level,cityCost,cityIncome} from './sequential-mode.js?v=42';
import {createBoard} from './board.js?v=43';
import {emptyPlan,reachable,targets,stats,terrain,key,TURN_LIMIT} from './simulation.js?v=18';
import {visibleTiles,exploredTiles} from './vision.js?v=18';
import {createResearchPanel} from './research-panel.js?v=5';
import {createBattleUX} from './battle-ux.js?v=42';
import {visibleEvents} from './battle-report.js?v=42';
const $=s=>document.querySelector(s),SAVE='campus-frontier-sequential-v4';
let state=null,board=null,selected=null,city=null,busy=false,researchPanel=null,battleUX=null;
function previous(){
 try{const v=JSON.parse(localStorage.getItem(SAVE));return v?.version===14&&v.ruleset==='sequential'&&TEAMS.includes(v.playerTeam)?v:null;}catch{return null;}
}
function save(){try{localStorage.setItem(SAVE,JSON.stringify(state));}catch{message('현재 브라우저에서 저장할 수 없습니다.');}}
function message(text){const x=$('#seqMessage');if(x)x.textContent=text;}
function hud(){
 const player=state.playerTeam,school=UNIVERSITY[player],bank=state[school.bank],hp=state[school.hp];
 $('#seqRound').textContent=`${Math.min(state.turn,TURN_LIMIT)} / ${TURN_LIMIT}`;
 $('#seqSchool').textContent=`${school.label} · ${school.campus}`;
 $('#seqGold').textContent=String(bank);
 $('#seqIncome').textContent=`+${cityIncome(state,player)} / 라운드`;
 $('#seqHP').textContent=`${hp} / 30`;
 $('#seqUnits').textContent=`${state.units.filter(u=>u.team===player).length}개 부대`;
 $('#seqRecruit').disabled=busy||!!state.result||bank<5;
 $('#seqScout').disabled=busy||!!state.result||bank<4;
 $('#seqEnd').disabled=busy||!!state.result;
 $('#seqEnd').textContent=busy?'대학 행동 중…':state.result?'대전 종료':'내 턴 종료';
 $('#seqCityPanel').hidden=!city||state.points[city]!==player;
 if(!$('#seqCityPanel').hidden){
  const cost=cityCost(state,city);
  $('#seqCityText').textContent=`거점 Lv.${state.cityLevels[city]??1} · +${2*(state.cityLevels[city]??1)} OP/라운드`;
  $('#seqUpgrade').textContent=cost==null?'최고 단계':`캠퍼스 발전 · ${cost} OP`;
  $('#seqUpgrade').disabled=busy||cost==null||bank<cost;
 }
 const u=state.units.find(u=>u.id===selected);
 $('#seqSelection').textContent=u?`${stats(u).name} · 체력 ${u.hp}/${stats(u).hp} · ${state.acted.includes(u.id)?'행동 완료':'칸을 눌러 이동 / 적을 눌러 공격'}`:'부대를 누르고 이동할 칸이나 적을 선택하세요.';
 $('#seqGuard').hidden=!u||state.acted.includes(u.id);
 if(state.result){
  const label=state.result==='victory'?'승리':state.result==='draw'?'무승부':'패배';
  message(`${label}! ${state.turn-1}라운드까지 진행했습니다. 새 게임으로 다시 도전해 보세요.`);
 }
 board?.sync(state,emptyPlan(),selected,'move');
 battleUX?.render(state,selected);
}
function transact(action){
 if(busy||!state||state.result)return;
 const previousState=state;
 const result=applySequentialAction(state,action);
 if(result.error){message(result.error);return false;}
 state=result.state;
 battleUX?.record(result.events,previousState,state);
 if(action.type==='move')message('이동했습니다. 빈 거점은 자동으로 점령됩니다.');
 else if(action.type==='attack')message('공격했습니다. 다른 부대도 바로 행동할 수 있습니다.');
 else if(action.type==='recruit')message('새 부대가 출전했습니다. 다음 라운드부터 행동합니다.');
 else if(action.type==='upgrade')message('거점이 성장했습니다! 매 라운드 수입이 늘어납니다.');
 else if(action.type==='research')message('기술을 연구했습니다. 효과가 즉시 적용됩니다.');
 else message('부대 행동을 완료했습니다.');
 if(action.type!=='move'&&action.type!=='attack')selected=null;
 save();hud();return true;
}
function choose(hit){
 if(busy||!state||state.result)return;
 if(hit.building){message(hit.building.n??'캠퍼스 건물');return;}
 const {x,z}=hit;
 if(!Number.isInteger(x)||!Number.isInteger(z))return;
 const player=state.playerTeam,unit=state.units.find(u=>u.x===x&&u.z===z);
 const active=state.units.find(u=>u.id===selected&&u.team===player);
 if(active&&!state.acted.includes(active.id)){
  if(unit&&unit.team!==player){
   const hitTarget=targets(state,active).find(t=>t.kind==='unit'&&t.id===unit.id);
   if(hitTarget){transact({type:'attack',id:active.id,target:hitTarget});selected=null;hud();return;}
  }
  if(['enemy-base','rival-base','campus'].includes(terrain(x,z))){
   const target=terrain(x,z)==='campus'?'ally':terrain(x,z)==='enemy-base'?'enemy':'rival';
   const legal=targets(state,active).find(t=>t.kind==='base'&&t.team===target);
   if(legal&&transact({type:'attack',id:active.id,target:legal})){selected=null;hud();return;}
  }
  if(!unit&&reachable(state,active).some(p=>p.x===x&&p.z===z)){
   if(transact({type:'move',id:active.id,x,z})){selected=null;city=null;hud();return;}
  }
 }
 if(unit?.team===player){
  selected=unit.id;city=null;hud();
  message(state.acted.includes(unit.id)?'이번 라운드 이미 행동한 부대입니다.':'밝은 초록색 칸을 눌러 이동하세요. 빨간 적은 공격할 수 있습니다.');return;
 }
 const site=key(x,z);
 if(Object.hasOwn(state.points,site)){
  city=site;selected=null;hud();
  message(state.points[site]===player?'내 캠퍼스 거점입니다. 발전시키면 수입이 늘어납니다.': '다른 대학의 거점입니다. 부대를 이동해 점령하세요.');return;
 }
 selected=null;city=null;hud();
}
function research(){researchPanel?.open();}
async function finish(){
 if(busy||state.result)return;
 busy=true;hud();
 const original=structuredClone(state),result=endSequentialRound(state);
 if(result.error){busy=false;message(result.error);hud();return;}
 state=result.state;selected=null;city=null;save();
 battleUX?.playbackStart();
 try{
  for(const part of result.phases){
   if(battleUX?.isSkipped())break;
   battleUX?.phaseLabel(UNIVERSITY[part.team].label+' 행동 중');
   board.sync(part.before,emptyPlan(),null,'move');
   const observed=visibleEvents(part.events,part.before,part.state,state.playerTeam);
   await board.animate(part.before,part.state,observed,
    label=>battleUX?.phaseLabel(UNIVERSITY[part.team].label+' · '+label),
    {getSpeed:()=>battleUX?.getSpeed()??1,shouldSkip:()=>battleUX?.isSkipped()??false});
   board.sync(part.state,emptyPlan(),null,'move');
  }
 }catch(error){console.warn('Turn animation fallback',error);}
 finally{
  for(const part of result.phases)battleUX?.record(part.events,part.before,part.state);
  battleUX?.record(result.events.filter(e=>e.type==='income'||e.type==='score'),
    result.phases.at(-1)?.state??original,state);
  battleUX?.playbackEnd();
  const schoolLabels=result.phases.map(p=>UNIVERSITY[p.team].label).join(' → ');
  message(schoolLabels+': 순서대로 행동했습니다. 이제 '+UNIVERSITY[state.playerTeam].label+' 차례입니다.');
  busy=false;hud();
 }
}
async function initialize(team){
 const [a,b,c]=await Promise.all([
 fetch('./data/skku-campus.json'),fetch('./data/korea-anam.json'),fetch('./data/yonsei-sinchon.json')]);
 if(!a.ok)throw Error('성균관대 캠퍼스 데이터를 불러오지 못했습니다.');
 const rivals={};
 if(b.ok)rivals.korea=await b.json();if(c.ok)rivals.yonsei=await c.json();
 board=createBoard($('#game'),await a.json(),choose,null,()=>{},rivals);
 document.body.classList.add('sequential-mode');const stage=$('#battlefield');
 const panel=document.createElement('div');panel.id='seqUI';panel.innerHTML=`
  <section id="seqStats" aria-label="현재 대학의 전략 정보">
   <div class="seq-school"><small id="seqSchool"></small><strong>라운드 <span id="seqRound"></span></strong></div>
   <div class="seq-resource"><span>OP <b id="seqGold"></b> <small id="seqIncome"></small></span><span>본진 <b id="seqHP"></b></span><span id="seqUnits"></span></div>
  </section>
  <section id="seqGuide"><span id="seqSelection">부대를 선택하세요.</span><span id="seqMessage" role="status" aria-live="polite">부대 → 이동·공격 → 거점 성장 → 턴 종료</span></section>
  <div id="seqCityPanel" hidden><span id="seqCityText"></span><button id="seqUpgrade">거점 발전</button></div>
  <nav id="seqControls" aria-label="전략 게임 조작">
   <button id="seqRecruit">⚔ 보병 <small>5 OP</small></button>
   <button id="seqScout">✦ 정찰 <small>4 OP</small></button>
   <button id="seqOpenTech">◈ 연구</button>
   <button id="seqGuard" hidden>▣ 휴식</button>
   <button id="seqEnd" class="main-action">내 턴 종료</button>
  </nav>
  <dialog id="seqResearch" aria-labelledby="seqResearchTitle">
   <div class="seq-research-shell">
    <header class="seq-research-header">
     <div><span class="seq-research-kicker">CAMPUS FRONTIER / ACADEMY</span><h2 id="seqResearchTitle">기술 연구</h2><p>한 가지 선택이 다음 라운드의 전략을 바꿉니다.</p></div>
     <button id="seqCloseTech" type="button" aria-label="연구창 닫기">✕ <span>닫기</span></button>
    </header>
    <div class="seq-research-main">
     <section class="seq-research-tree" aria-label="네 계열 연구 기술 트리">
      <div class="seq-research-section-head"><h3>연구 계열</h3><span>4 계열 · 각 3단계</span></div>
      <div id="seqTechOptions" class="seq-research-branches"></div>
      <p class="seq-research-tree-note">기술을 눌러 효과 확인 · 연결된 순서대로 연구</p>
     </section>
     <section class="seq-research-detail" id="seqTechDetail" aria-label="선택한 연구의 효과와 비용"></section>
    </div>
    <footer class="seq-research-footer"><span>효과는 실제 게임 수치와 연결됩니다.</span><span>연구 비용은 OP로 결제</span></footer>
   </div>
  </dialog>
  <button id="seqNew" title="새 전장 시작">새 게임</button>`;
 stage.append(panel);
 battleUX=createBattleUX(panel,()=>state);
 researchPanel=createResearchPanel({dialog:$('#seqResearch'),getState:()=>state,onPurchase:branch=>transact({type:'research',branch}),isBusy:()=>busy});
 $('#seqRecruit').onclick=()=>transact({type:'recruit',kind:'infantry'});
 $('#seqScout').onclick=()=>transact({type:'recruit',kind:'scout'});
 $('#seqOpenTech').onclick=research;
 $('#seqEnd').onclick=finish;
 $('#seqGuard').onclick=()=>{if(selected&&transact({type:'guard',id:selected}))selected=null;hud();};
 $('#seqUpgrade').onclick=()=>{if(city)transact({type:'upgrade',site:city});};
 $('#seqCloseTech').onclick=()=>researchPanel.close();
 $('#seqNew').onclick=()=>{if(confirm('현재 새 버전의 진행 내용을 초기화하시겠습니까?')){state=createSequentialGame({playerTeam:state.playerTeam,seed:Date.now()});selected=null;city=null;save();hud();message('새로운 자원 배치로 다시 시작했습니다.');}};
 $('#loading')?.remove();
 window.addEventListener('keydown',e=>{
  if(!document.body.classList.contains('in-battle')||!state||e.target.closest('input,textarea,select,[contenteditable="true"]')||document.querySelector('dialog[open]'))return;
  if(e.code==='KeyR'){e.preventDefault();research();}
  else if(e.code==='Enter'&&!e.repeat&&!busy&&e.ctrlKey){e.preventDefault();finish();}
  else if(e.code==='Escape'){selected=null;city=null;hud();}
 });
}
export async function enterSequential(team='ally'){
 if(!TEAMS.includes(team))team='ally';
 const existing=previous();
 if(!state){
  state=existing&&existing.playerTeam===team?existing:createSequentialGame({playerTeam:team,seed:Date.now()});
  await initialize(team);save();
 }else if(state.playerTeam!==team){
  state=createSequentialGame({playerTeam:team,seed:Date.now()});selected=null;city=null;save();
 }
 hud();message('부대를 선택하면 이동할 칸과 공격할 적이 표시됩니다. 원하는 대학으로 시작할 수 있습니다.');
 if(state.units.some(u=>u.team===state.playerTeam)){
  const u=state.units.find(u=>u.team===state.playerTeam);
  board.focusUnit(u);
 }
}
