import {TECHS,PROJECTS,researchRate,hasTech,canResearch,canProject,normalPoint,DEPOSITS} from './growth.js?v=10';
import {initialState,emptyPlan,enemyOrders,resolveTurn,canBuild,canMove,availableGold,PRICE,terrain,isCampus,stats,canOrder,income,unitCap,TURN_LIMIT,CENTRAL_POINT,victoryPoints,GATES,targets} from './simulation.js?v=18';
import {createBoard} from './board.js?v=21';
import {visibleTiles,exploredTiles,tileKey,rememberExploration} from './vision.js?v=18';
import {isCeasefire,canProposeCeasefire,aiAcceptsCeasefire,ceasefireUntil} from './diplomacy.js?v=10';
const $=selector=>document.querySelector(selector),SAVE='campus-frontier-turn-v13';
let state=initialState('standard'),plan=emptyPlan(),selected=null,mode='move',busy=false,focused=false,board,committedEnemy;
state.version=13;
let storageAvailable=true;
try {const saved=JSON.parse(localStorage.getItem(SAVE));if(saved?.state?.version===13&&Number.isInteger(saved.state.turn)&&Array.isArray(saved.state.units)&&Array.isArray(saved.state.structures)&&saved.plan?.builds&&saved.plan?.orders){state=saved.state;plan=saved.plan;}}catch{storageAvailable=false;}
// Reconcile older v13 saves with permanent exploration and remembered banners.
rememberExploration(state);
committedEnemy=enemyOrders(state);
// HUD panels are independent from saved match state and never alter the turn engine.
const compactScreen=window.matchMedia('(max-width:760px)');
document.body.classList.remove('panel-open');
$('#panelToggle').setAttribute('aria-expanded','false');
function toggleHudPanel(name,button,open){
 document.body.classList.toggle(name,open);
 button.setAttribute('aria-expanded',String(open));
}
function save(){try{localStorage.setItem(SAVE,JSON.stringify({state,plan}));}catch{storageAvailable=false;}}
function toast(text){$('#toast').textContent=text;}
const names={wall:'성벽',tower:'방어탑',recruit:'보병 모집',scout:'정찰 모집',road:'도로 건설',siege:'공성대 모집',cavalry:'기동대 모집'};
const actionNames={move:'이동',attack:'공격',guard:'방어',capture:'점령',heal:'회복',wait:'대기'};
function reserveAction(type){const u=state.units.find(u=>u.id===selected);if(type==='attack'){setMode('attack');toast('인접한 적 부대나 적 본진을 클릭하세요.');return;}const o={type},error=canOrder(state,u,o,plan);if(error){toast(error);return;}plan.orders[u.id]=o;save();refresh();toast(`${stats(u).name} · ${actionNames[type]} 예약`);}
const siteName=site=>site==='home'?'캠퍼스':site===CENTRAL_POINT?'중앙 주요 거점':site.split(',').map(n=>Number(n)+1).join(', ')+' 거점';
const keyForSite=(x,z)=>`${x},${z}`;
function unitName(u){return `${u.team==='ally'?'성균관대학교 인문사회과학캠퍼스':u.team==='rival'?'연세대학교 신촌캠퍼스':'고려대학교 안암캠퍼스'} ${stats(u).name} ${u.id.slice(1)}`;}
function selection(title,body){toast(`${title} · ${body}`);}
function setMode(next){mode=next;document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));if(focused&&mode!=='inspect')setFocus(false);refresh();}
function refresh(){
 $('#gold').textContent=availableGold(state,plan);$('#gold').title=`보유 ${state.gold} / 예약 ${state.gold-availableGold(state,plan)}`;$('#health').textContent=state.homeHP;$('#turn').textContent=`${Math.min(state.turn,TURN_LIMIT)}/${TURN_LIMIT}`;$('#scoreBoard').textContent=`성균관대학교 ${victoryPoints(state,'ally')} / 고려대학교 ${victoryPoints(state,'enemy')} / 연세대학교 ${victoryPoints(state,'rival')}`;$('#rpHud').textContent=researchRate(state);$('#scoreHud').textContent=`${victoryPoints(state,'ally')}:${victoryPoints(state,'enemy')}:${victoryPoints(state,'rival')}`;document.body.classList.toggle('unit-selected',!!selected&&!busy&&!state.result);$('#enemyHP').textContent=`${state.enemyHP} / 30`;$('#enemyBar').value=state.enemyHP;const sight=visibleTiles(state,'ally'),seen=exploredTiles(state,'ally');
 const knownBase=(x,z)=>{for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++)if(seen.has(tileKey(x+dx,z+dz)))return true;return false;};
 $('#enemyHP').textContent=knownBase(17,17)?`${state.enemyHP} / 30`:'미발견';$('#rivalHP').textContent=knownBase(17,3)?`${state.rivalHP} / 30`:'미발견';$('#rivalBar').value=state.rivalHP;
 $('#fogStatus').textContent=`발견 ${seen.size}/441`;
 const count=Object.keys(plan.orders).length+plan.builds.length+(plan.projects??[]).length+(Object.hasOwn(plan,'research')?1:0)+(plan.scholarshipTech?1:0)+(plan.diplomacy?1:0);$('#orderCount').textContent=count;$('#mobilePlan').textContent=`예약 ${count}개`;$('#mobilePlan').disabled=busy;$('#mobileClear').disabled=busy||!count;$('#clearPlan').disabled=busy||!count;
 $('#resolve').disabled=busy||!!state.result||!board;$('#resolve').textContent=state.result?(state.victoryMode==='score'?({victory:'점수 승리',defeat:'점수 패배',draw:'점수 무승부'})[state.result]:({victory:'전초기지 점령 · 승리',defeat:'본진 함락',draw:'양쪽 본진 함락'})[state.result]):busy?'전투 중…':`턴 종료 →`;
 $('#turnHint').textContent=state.result?'새 연습을 시작해 다른 전략을 시도하세요.':`예약 ${state.gold-availableGold(state,plan)} OP · 명령 ${count}개 · 점수 ${victoryPoints(state,'ally')}:${victoryPoints(state,'enemy')}:${victoryPoints(state,'rival')} · 수입 +${income(state)} OP/턴`;
 document.querySelectorAll('[data-mode]').forEach(b=>b.disabled=busy||!!state.result);$('#reset').disabled=busy;
 $('#quickRecruit').disabled=busy||!!state.result||!GATES.some(g=>!canBuild(state,plan,'recruit',g.x,g.z));
 $('#quickScout').disabled=busy||!!state.result||!GATES.some(g=>!canBuild(state,plan,'scout',g.x,g.z));
 $('#quickUndo').disabled=busy||!count;
 const list=$('#orders');list.replaceChildren();
 const add=(text,cancel)=>{const row=document.createElement('div');row.className='order';const label=document.createElement('span');label.textContent=text;const button=document.createElement('button');button.textContent='×';button.setAttribute('aria-label',`${text} 취소`);button.disabled=busy;button.onclick=()=>{cancel();save();refresh();toast('예약을 취소했습니다.');};row.append(label,button);list.append(row);};
 for(const [id,o] of Object.entries(plan.orders)){const u=state.units.find(u=>u.id===id);if(u)add(`${unitName(u)} · ${o.type==='move'?`${o.x+1}, ${o.z+1} 이동`:actionNames[o.type]}`,()=>delete plan.orders[id]);}
 plan.builds.forEach((b,i)=>add(`${names[b.type]} · ${b.x+1}, ${b.z+1} / ${PRICE[b.type]}`,()=>plan.builds.splice(i,1)));
 for(const [i,o] of (plan.projects??[]).entries())add(`${siteName(o.site)} · ${PROJECTS[o.type].name} / ${PROJECTS[o.type].cost} OP`,()=>plan.projects.splice(i,1));
 if(Object.hasOwn(plan,'research'))add(`연구 · ${plan.research?TECHS[plan.research].name:'보관'}`,()=>{delete plan.research;delete plan.scholarshipTech;});
 if(plan.scholarshipTech)add(`학문 1 사용 · ${TECHS[plan.scholarshipTech].name} -3 RP`,()=>delete plan.scholarshipTech);
 if(plan.diplomacy)add(`${plan.diplomacy.target==='enemy'?'고려대':'연세대'}에 5턴 휴전 제안`,()=>delete plan.diplomacy);
 if(!count){const p=document.createElement('p');p.className='empty';p.textContent='부대를 눌러 이동하거나 적을 공격하세요. 거점은 자동 점령됩니다.';list.append(p);}
 const roster=$('#roster');roster.replaceChildren();for(const u of state.units.filter(u=>u.team==='ally')){const b=document.createElement('button');b.textContent=`${stats(u).name} ${u.id.slice(1)} · ${u.hp}/${stats(u).hp}`;b.classList.toggle('active',u.id===selected);b.disabled=busy;b.onclick=()=>{selected=u.id;setMode('move');selection(unitName(u),`이동력 ${stats(u).move} · 공격 ${stats(u).attack} / 방어 ${stats(u).defense}. 행동 하나를 예약하세요.`);};roster.append(b);}
 $('#unitCount').textContent=`${state.units.filter(u=>u.team==='ally').length}/${unitCap(state)}${state.pendingRecruits?.length?` · 훈련 ${state.pendingRecruits.length}`:''}`;document.querySelectorAll('[data-action]').forEach(b=>b.disabled=busy||!!state.result||!selected);
 for(const [type,tech] of [['wall','defense'],['tower','towers'],['road','roads'],['siege','siege'],['cavalry','mobility']]){const button=document.querySelector(`[data-mode="${type}"]`);button.querySelector('small').textContent=hasTech(state,'ally',tech)?`${PRICE[type]} OP · ${['tower','siege','cavalry'].includes(type)?2:1}턴`:`🔒 ${TECHS[tech].name}`;}
 refreshGrowth();refreshDiplomacy();
 if(board&&!busy)board.sync(state,plan,selected,mode);
}
function setFocus(value){focused=value;board?.setFocus(value);$('#overview').hidden=!value;$('#mapMode').textContent=value?'성균관대학교 인문사회과학캠퍼스 · 4×4 본진':'전략 지도';$('#focusCampus').textContent=value?'전체 전장 ↙':'캠퍼스 확대 ↗';if(value){mode='inspect';document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));toast('건물을 누르면 이름이 표시됩니다.');}refresh();}
function simpleRecruit(type='recruit'){
 if(busy||state.result)return;
 const position=GATES.find(g=>!canBuild(state,plan,type,g.x,g.z));
 if(!position){const error=canBuild(state,plan,type,GATES[0].x,GATES[0].z);toast(error||'출전 위치가 막혀 있습니다. 한 부대를 이동해 공간을 확보하세요.');return;}
 plan.builds.push({type,x:position.x,z:position.z});
 save();refresh();toast(`${type==='recruit'?'보병':'정찰대'} 모집 예약! 턴을 종료하면 출전합니다.`);
}
function simpleAttack(u,target){
 if(!u||u.team!=='ally')return false;
 if(!targets(state,u).some(t=>t.kind===target.kind&&(t.kind==='base'?t.team===target.team:t.id===target.id))){
  toast('공격 사거리 밖입니다. 먼저 가까운 칸으로 이동하세요.');return true;
 }
 const order={type:'attack',target},error=canOrder(state,u,order,plan);
 if(error){toast(error);return true;}
 plan.orders[u.id]=order;save();refresh();toast('⚔ 공격 예약! 턴 종료를 누르세요.');return true;
}

function pick(hit){
 if(hit.building){const b=hit.building,name=b.n??`이름 미등록 건물 ${b.index+1}`;selection(name,`지도 데이터 기준 ${b.lv??'미상'}층 · 높이 ${b.h}m. 전체 캠퍼스와 같은 비율로 축소했습니다.`);toast(`${name} · ${b.lv??'미상'}층 / ${b.h}m`);return;}
 const {x,z}=hit;if(busy)return;
 const currentSight=visibleTiles(state,'ally').has(tileKey(x,z));
  const discovered=exploredTiles(state,'ally').has(tileKey(x,z));
  if(state.gameMode==='standard'&&!discovered&&!currentSight){
   selection('미탐색 지역','정찰대 또는 다른 부대로 지역을 탐험하면 지형이 영구히 밝혀집니다.');
   return;
  }
 if(isCampus(x,z)){selection('성균관대학교 인문사회과학캠퍼스 · 4×4 본진','데이터에 포함된 56개 건물을 모두 배치했습니다. 캠퍼스 확대에서 건물을 확인하세요.');setFocus(true);return;}
 const unit=state.units.find(u=>u.x===x&&u.z===z&&(u.team==='ally'||currentSight)),structure=state.structures.find(s=>s.x===x&&s.z===z);
 if(state.gameMode==='standard'&&mode==='move'&&selected&&!state.result){
  const own=state.units.find(u=>u.id===selected&&u.team==='ally');
  if(own&&unit&&unit.team!=='ally'&&simpleAttack(own,{kind:'unit',id:unit.id}))return;
  const base=terrain(x,z);
  if(own&&(base==='enemy-base'||base==='rival-base')&&simpleAttack(own,{kind:'base',team:base==='enemy-base'?'enemy':'rival'}))return;
 }
 if(state.result){toast('연습이 종료되었습니다. 새 연습을 시작할 수 있습니다.');return;}
 if(['wall','tower','road','recruit','scout','siege','cavalry'].includes(mode)){
  const error=canBuild(state,plan,mode,x,z);if(error){toast(error);return;}
  if(Object.values(plan.orders).some(o=>o.type==='move'&&o.x===x&&o.z===z)){toast('부대의 이동 예약이 있는 칸입니다. 해당 명령부터 취소하세요.');return;}
  plan.builds.push({type:mode,x,z});save();refresh();toast(`${names[mode]} 예약 완료 · 턴 실행 전까지 취소할 수 있습니다.`);return;
 }
 if(mode==='attack'&&selected){const target=unit?{kind:'unit',id:unit.id}:structure?{kind:'structure',id:structure.id}:terrain(x,z)==='enemy-base'?{kind:'base',team:'enemy'}:terrain(x,z)==='rival-base'?{kind:'base',team:'rival'}:null;const u=state.units.find(u=>u.id===selected),order={type:'attack',target},error=canOrder(state,u,order);if(error){toast(error);return;}plan.orders[selected]=order;save();refresh();toast('공격 예약 완료 · 대상이 사거리를 벗어나면 실패합니다.');return;}
 if(unit){selection(unitName(unit),`체력 ${unit.hp}/${stats(unit).hp} · ${x+1}, ${z+1} 구역. ${unit.team==='ally'?'인접한 빈 타일을 눌러 이동 예약.':'다음 행동은 턴이 실행될 때 공개됩니다.'}`);if(unit.team==='ally'&&mode==='move'){selected=unit.id;refresh();toast('초록 타일을 눌러 이동, 보이는 적을 눌러 공격하세요.');}else toast(`${unitName(unit)} · 체력 ${unit.hp}/${stats(unit).hp}`);return;}
 if(mode==='move'&&selected){const u=state.units.find(u=>u.id===selected);const error=canMove(state,u,x,z,plan);if(error){toast(error);return;}if(Object.entries(plan.orders).some(([id,o])=>id!==selected&&o.type==='move'&&o.x===x&&o.z===z)){toast('다른 아군 부대가 이 칸으로 이동을 예약했습니다.');return;}plan.orders[selected]={type:'move',x,z};save();refresh();toast(`${stats(u).name} 이동 예약 · 거점에 도착하면 자동 점령합니다.`);return;}
 const site=keyForSite(x,z);if(Object.hasOwn(state.points,site)){const owner=currentSight?state.points[site]:state.lastKnownPoints?.ally?.[site];selection(site===CENTRAL_POINT?'★ 중앙 주요 거점':'일반 거점',`${owner==='ally'?'성균관대 소유':owner==='enemy'?'고려대 소유':owner==='rival'?'연세대 소유' :owner==null?'마지막 발견 당시 중립':'소유 정보 없음'}${!currentSight?' (마지막 확인)':''} · ${site===CENTRAL_POINT?5:3}점 · 정상 거점 수입 +2 OP/턴. 점령은 거점 위 부대가 다음 턴에 명령을 예약해야 합니다.`);return;}
  const deposit=DEPOSITS.find(d=>d.x===x&&d.z===z);if(deposit){selection('개발 자원',state.developed[`${x},${z}`]?'개발 완료 · 소유 작업장이 정상 상태일 때 OP +1/턴.':'연구와 거점 관리에서 자원 개발 연구 후 3 OP로 개발합니다. 부대는 이 타일을 통과할 수 있습니다.');return;}
 const type=terrain(x,z);selection(structure?names[structure.type]:type==='resource'?'자원 거점':type==='enemy-base'?'AI 전초기지':`${x+1}, ${z+1} 구역`,structure?`내구도 ${structure.hp}. ${structure.type==='tower'?'사거리 2칸, 공격 3. 2턴 건설, 완공 다음 턴부터 공격.':'적의 이동을 막습니다.'}`:type==='resource'?'거점에 도착한 다음 턴에 점령 명령을 내리세요. 정상 거점은 OP +2. 적 거점은 한 턴 안정화합니다.':type==='enemy-base'?'인접한 아군의 공격을 예약하세요. 이동 후 자동 공격하지 않습니다.':'부대를 선택하거나 건설 도구를 선택하세요.');
}
async function execute(){if(busy||state.result)return;busy=true;selected=null;refresh();try{const before=state,{state:next,events}=resolveTurn(state,plan,committedEnemy);state=next;plan=emptyPlan();committedEnemy=enemyOrders(state);save();await board.animate(before,next,events,phase=>{$('#phase').textContent=`턴 ${before.turn} 결과 재생 · ${phase}`;});const destroyed=events.filter(e=>e.type==='destroy').length,attacks=events.filter(e=>e.type==='attack').length,income=events.find(e=>e.type==='income').amount;
 toast(state.result?(state.victoryMode==='score'?`${TURN_LIMIT}턴 종료 · 점수 ${victoryPoints(state,'ally')}:${victoryPoints(state,'enemy')}:${victoryPoints(state,'rival')} · ${state.result==='victory'?'승리':state.result==='defeat'?'패배':'무승부'}`:({victory:'승리! 적 전초기지를 점령했습니다.',defeat:'본진이 함락되었습니다. 새 연습에서 방어선을 바꿔보세요.',draw:'양쪽 본진이 동시에 함락되었습니다.'})[state.result]):`턴 ${state.turn-1} 완료 · 교전 ${attacks}회${destroyed?` · 부대 ${destroyed}개 소멸`:''} · 자원 +${income}`);const diplomacyEvents=events.filter(e=>e.type==='diplomacy-accepted'||e.type==='diplomacy-rejected');if(diplomacyEvents.length)toast(diplomacyEvents.map(e=>e.text).join(' · '));
  selection(`턴 ${state.turn-1} 결과`,`${events.filter(e=>e.type==='move').length}개 부대 이동 · ${attacks}회 공격 · 수입 +${income}${events.some(e=>e.type==='reinforce')?' · 적 병력 모집':''}${events.filter(e=>e.type==='failed'||['research','project'].includes(e.type)&&e.team==='ally').map(e=>' · '+e.text).join('')}`);
 }catch(error){toast(`명령을 실행하지 못했습니다: ${error.message}`);}finally{busy=false;$('#phase').textContent=state.result?'연습 종료':'명령 예약';refresh();}}
 document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{setMode(b.dataset.mode);toast(mode==='move'?'아군을 선택한 뒤 이동할 타일을 누르세요.':mode==='inspect'?'건물·부대·타일을 눌러 정보를 확인하세요.':mode==='road'?'도로망 연구 후 자기 영토의 통행 가능한 타일을 누르세요.':`${names[mode]} · 캠퍼스 영토에 예약하세요. 모집은 금빛 출전 타일입니다.`);});
 document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>reserveAction(b.dataset.action));
 $('#resolve').onclick=execute;$('#clearPlan').onclick=()=>{plan=emptyPlan();save();refresh();toast('모든 예약을 취소하고 자원을 돌려놓았습니다.');};$('#focusCampus').onclick=()=>setFocus(!focused);$('#overview').onclick=()=>setFocus(false);
 $('#panelToggle').onclick=()=>toggleHudPanel('panel-open',$('#panelToggle'),!document.body.classList.contains('panel-open'));

 $('#creditsOpen').onclick=()=>$('#creditsDialog').showModal();
 $('#game').addEventListener('pointerdown',()=>{if(compactScreen.matches&&document.body.classList.contains('panel-open'))toggleHudPanel('panel-open',$('#panelToggle'),false);});
 compactScreen.addEventListener('change',()=>toggleHudPanel('panel-open',$('#panelToggle'),!compactScreen.matches));
 
  $('#zoomRange').oninput=e=>board?.setZoom(Number(e.target.value));
  $('#zoomIn').onclick=()=>board?.zoomBy(.65);$('#zoomOut').onclick=()=>board?.zoomBy(-.65);
 $('#resetView').onclick=()=>{setFocus(false);board?.resetView();toast('지도를 중앙으로 옮겼습니다. 한 손가락으로 지도를 밀어 이동하세요.');};
 const showResearch=()=>{$('#growthDialog').showModal();refreshGrowth();requestAnimationFrame(renderTreeConnections);};$('#growth').onclick=showResearch;$('#openResearch').onclick=showResearch;$('#advancedTech').addEventListener('toggle',()=>{if($('#advancedTech').open)requestAnimationFrame(renderTreeConnections);});
 $('#diplomacy').onclick=()=>{$('#diplomacyDialog').showModal();refreshDiplomacy();};
 document.querySelectorAll('[data-truce]').forEach(b=>b.onclick=()=>{const target=b.dataset.truce,error=canProposeCeasefire(state,'ally',target);if(error){toast(error);return;}plan.diplomacy={target};save();refresh();toast(`${target==='enemy'?'고려대':'연세대'}에 5턴 휴전 제안을 예약했습니다.`);});
 $('#clearDiplomacy').onclick=()=>{delete plan.diplomacy;save();refresh();};
 $('#help').onclick=()=>$('#dialog').showModal();$('#credits').onclick=()=>$('#creditsDialog').showModal();$('#reset').onclick=()=>$('#resetDialog').showModal();document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
 $('#confirmReset').onclick=()=>{state=initialState('standard');state.version=13;plan=emptyPlan();selected=null;committedEnemy=enemyOrders(state);save();$('#resetDialog').close();setFocus(false);setMode('move');$('#phase').textContent='명령 예약';selection('부대에 첫 명령을 내려보세요','초록 부대를 선택하고 인접한 타일을 누르면 이동을 예약합니다.');toast('새 연습을 시작했습니다.');};
$('#quickRecruit').onclick=()=>simpleRecruit('recruit');$('#quickScout').onclick=()=>simpleRecruit('scout');$('#quickUndo').onclick=()=>{plan=emptyPlan();save();refresh();toast('이번 턴 예약을 취소했습니다.');};
$('#quickUndo').disabled=false;
$('#mobilePlan').onclick=()=>{$('#planContent').append($('#orders'));$('#planDialog').showModal();};
$('#planDialog').addEventListener('close',()=>document.querySelector('aside').insertBefore($('#orders'),$('#reset')));
$('#mobileClear').onclick=()=>{plan=emptyPlan();save();refresh();toast('모든 예약을 취소했습니다.');};
$('#mobileReset').onclick=()=>{$('#dialog').close();$('#resetDialog').showModal();};
 addEventListener('keydown',e=>{if(e.key==='Escape'&&!busy){if(compactScreen.matches&&document.body.classList.contains('panel-open'))toggleHudPanel('panel-open',$('#panelToggle'),false);else {selected=null;if(focused)setFocus(false);setMode('move');}}});
 try{
 const [response,yonseiResponse,koreaResponse]=await Promise.all([
 fetch('./data/skku-campus.json'),fetch('./data/yonsei-sinchon.json'),fetch('./data/korea-anam.json')]);
 if(!response.ok)throw new Error('성균관대 지도를 불러오지 못했습니다.');
 const data=await response.json();
 const rivalData={};
 if(yonseiResponse.ok)rivalData.yonsei=await yonseiResponse.json();
 if(koreaResponse.ok)rivalData.korea=await koreaResponse.json();
 board=createBoard($('#game'),data,pick,null,(_pitch,zoom)=>{$('#zoomRange').value=zoom;$('#zoomValue').textContent=`${zoom.toFixed(1)}×`;},rivalData);$('#buildingCount').textContent=board.campusCount;$('#loading').remove();refresh();try{if(!localStorage.getItem(SAVE)&&localStorage.getItem('campus-frontier-turn-v12'))toast('규칙 변경으로 새 연습을 시작합니다. 이전 저장은 별도로 보존됩니다.');}catch{}if(!storageAvailable)toast('브라우저 저장을 사용할 수 없습니다. 이번 플레이는 새로고침 시 초기화됩니다.');}catch(error){console.error('대학전선 초기화 오류',error);const loading=$('#loading');if(loading)loading.textContent=`실행 오류: ${error.message}`;else toast(`화면 오류: ${error.message} · 새로고침해 주세요.`);}


function refreshDiplomacy(){
 const targetName={enemy:'고려대학교 안암캠퍼스',rival:'연세대학교 신촌캠퍼스'};
 const details=[];
 for(const target of ['enemy','rival']){
  const live=isCeasefire(state,'ally',target);
  const blocked=canProposeCeasefire(state,'ally',target);
  const label=targetName[target],until=ceasefireUntil(state,'ally',target);
  details.push(`${label} · ${live?`휴전 중 (${until}턴까지)`:blocked?`협상 불가: ${blocked}`:aiAcceptsCeasefire(state,target)?'휴전 제안 가능 · AI 수락 예상':'휴전 제안 가능 · AI 거절 가능'}`);
  const button=$(`[data-truce="${target}"]`);
  button.disabled=busy||!!state.result||!!blocked;
  button.textContent=`${label}에 5턴 휴전 제안${plan.diplomacy?.target===target?' ✓':''}`;
 }
 $('#diplomacyStatus').textContent=details.join(' | ');
 $('#clearDiplomacy').disabled=busy||!plan.diplomacy;
}

function treePosition(id){const positions={
 development:[1,1],specialization:[1,2],wide:[1,3],
 defense:[2,1],towers:[2,2],roads:[2,3],
 training:[3,1],siege:[3,2],mobility:[3,3],
 methodology:[4,1],advanced:[4,2],integrated:[4,3]
};return positions[id];}
function renderTreeConnections(){
 const tree=$('#techList');if(!tree)return;
 tree.querySelector('.skill-links')?.remove();
 if(!tree.offsetWidth)return;
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 svg.setAttribute('class','skill-links');svg.setAttribute('aria-hidden','true');
 svg.setAttribute('viewBox',`0 0 ${tree.scrollWidth} ${tree.scrollHeight}`);
 svg.setAttribute('preserveAspectRatio','none');
 const active=Object.hasOwn(plan,'research')?plan.research:state.research.ally.active;
 for(const [id,tech] of Object.entries(TECHS)){
  if(!tech.requires)continue;
  const source=tree.querySelector(`[data-tech="${tech.requires}"]`);
  const target=tree.querySelector(`[data-tech="${id}"]`);
  if(!source||!target)continue;
  const x1=source.offsetLeft+source.offsetWidth,y1=source.offsetTop+source.offsetHeight/2;
  const x2=target.offsetLeft,y2=target.offsetTop+target.offsetHeight/2;
  const dx=Math.max(23,(x2-x1)*.45);
  const path=document.createElementNS('http://www.w3.org/2000/svg','path');
  path.setAttribute('d',`M ${x1} ${y1} C ${x1+dx} ${y1}, ${x2-dx} ${y2}, ${x2} ${y2}`);
  const done=hasTech(state,'ally',id),ready=hasTech(state,'ally',tech.requires);
  path.setAttribute('class',`skill-link ${done?'completed':id===active?'selected':ready?'available':'locked'}`);
  svg.append(path);
 }
 tree.prepend(svg);
}
window.addEventListener('resize',()=>{if($('#growthDialog').open)requestAnimationFrame(renderTreeConnections);});

function refreshGrowth(){
 const r=state.research.ally,active=Object.hasOwn(plan,'research')?plan.research:r.active,rate=researchRate(state);
 $('#growth').textContent=active?`${TECHS[active].name} ${r.progress[active]??0}/${TECHS[active].cost} · +${rate} RP`:`연구 선택 · +${rate} RP/턴`;
 $('#researchSummary').textContent=`학문 ${r.scholarship??0}/3 · 보관 ${r.bank}/10 RP · 이번 턴 산출 ${rate} RP · 완료 ${r.done.length}/${Object.keys(TECHS).length}`;
 $('#researchWarning').textContent=!active?`연구 미선택 · 이번 턴 종료에 ${Math.max(0,r.bank+rate-10)} RP가 보관 상한을 넘어 소실됩니다.`:'선택을 바꿔도 기술별 진행도는 보존됩니다. 완성된 기술은 다음 턴부터 사용합니다.';
  const paths={economy:['development','specialization','wide'],combat:['training','siege','mobility'],defense:['defense','towers','roads'],science:['methodology','advanced','integrated']};
 for(const [key,steps] of Object.entries(paths)){
  const button=$(`[data-research-path="${key}"]`);
  const next=steps.find(id=>!hasTech(state,'ally',id));
  const ready=next&&!canResearch(state,'ally',next);
  button.disabled=busy||!!state.result||!next||!ready;
  button.classList.toggle('active',!!active&&steps.includes(active));
  button.classList.toggle('complete',!next);
  button.querySelector('small').textContent=!next?'완료 · 모두 연구함':`${TECHS[next].name} · ${TECHS[next].cost} RP${ready?'':' (선행 연구 필요)'}`;
  button.onclick=()=>{if(!next||!ready)return;plan.research=next;delete plan.scholarshipTech;save();refresh();toast(`${TECHS[next].name} 연구 예약! 턴 종료 시 RP가 쌓입니다.`);};
 }
 
 const techList=$('#techList');techList.replaceChildren();
 for(const [id,t] of Object.entries(TECHS)){
  const done=hasTech(state,'ally',id),error=canResearch(state,'ally',id),button=document.createElement('button');button.className='tech-card skill-node';button.dataset.tech=id;
   button.classList.toggle('active',id===active);
   button.classList.toggle('completed',done);
   button.classList.toggle('locked',!!error&&!done);
   button.classList.toggle('unlocked',!error&&!done);
   const pos=treePosition(id);if(pos){button.style.gridRow=String(pos[0]);button.style.gridColumn=String(pos[1]);}
  const title=document.createElement('strong');const cost=Math.max(3,t.cost-(r.discounted?.[id]??0)-(plan.scholarshipTech===id&&!r.discounted?.[id]?3:0));title.textContent=`${done?'✓ 완료':id===active?'▶ 선택 중':error?'🔒 잠김':'선택 가능'} · ${t.name} ${r.progress[id]??0}/${cost} RP`;
  const detail=document.createElement('small');detail.textContent=t.effect+(error&&!done?` · ${error}`:'');
   const progress=document.createElement('span');progress.className='tech-progress';
   const fill=document.createElement('i');fill.style.width=`${Math.min(100,(r.progress[id]??0)/cost*100)}%`;progress.append(fill);
   button.append(title,detail,progress);button.disabled=busy||!!state.result||!!error;
  button.onclick=()=>{plan.research=id;if(plan.scholarshipTech&&plan.scholarshipTech!==id)delete plan.scholarshipTech;save();refresh();toast(`${t.name} 연구 선택 · 턴 종료 시 RP 투자`);};techList.append(button);
 }
 if($('#growthDialog').open)requestAnimationFrame(renderTreeConnections);
  $('#bankResearch').disabled=busy||!!state.result;$('#bankResearch').onclick=()=>{plan.research=null;delete plan.scholarshipTech;save();refresh();};
 const scholarshipButton=$('#scholarshipResearch');const canDiscount=!!active&&(r.scholarship??0)>0&&!r.discounted?.[active]&&!hasTech(state,'ally',active)&&!canResearch(state,'ally',active);
 scholarshipButton.disabled=busy||!!state.result||(!plan.scholarshipTech&&!canDiscount);
 scholarshipButton.textContent=plan.scholarshipTech?'학문 할인 예약 취소':`성균관대 학문 사용 · ${r.scholarship??0}개 보유 (연구 -3 RP)`;
 scholarshipButton.onclick=()=>{if(plan.scholarshipTech)delete plan.scholarshipTech;else plan.scholarshipTech=active;save();refresh();};
 const sites=$('#siteList');sites.replaceChildren();
 for(const site of ['home',...Object.keys(state.points)]){
  const home=site==='home',card=document.createElement('section'),title=document.createElement('h3'),info=document.createElement('p');card.className='site-card';
  title.textContent=home?'성균관대학교 인문사회과학캠퍼스':siteName(site);const own=home||state.points[site]==='ally',normal=home||normalPoint(state,site,'ally');
  info.textContent=home?`OP +${state.developed['5,5']?6:5} · RP +${3+(state.labs?.home?1:0)} · 캠퍼스 작업 슬롯 1${state.labConstruction?.home?' · 연구 시설 건설 중':''}`:!own?(state.points[site]?'적 소유':'중립 · 부대의 점령 명령 필요'):!normal?`안정화 중 · ${state.pointReady[site]}턴 정상화`:`정상 · OP +${state.specialties[site]==='economy'?4:2} · RP +${(state.specialties[site]==='science'?2:0)+(state.labs?.[site]?1:0)}${state.specialties[site]?' · '+PROJECTS[state.specialties[site]].name:''}${state.labConstruction?.[site]?' · 연구 시설 건설 중':''}`;
  card.append(title,info);
  if(own)for(const type of home?['develop','lab','grand']:site===CENTRAL_POINT?['lab']:['develop','economy','science','military','lab','wide']){
   const o={site,type},error=canProject(state,plan,o,availableGold(state,plan)),b=document.createElement('button'),item=PROJECTS[type];b.textContent=`${item.name} · ${item.cost} OP / ${type==='grand'?3:type==='lab'?2:1}턴`;b.disabled=busy||!!state.result||!!error;b.title=error??'다음 턴부터 산출 적용';b.onclick=()=>{plan.projects??=[];plan.projects.push(o);save();refresh();toast(`${item.name} 예약 · 명령 목록에서 취소 가능`);};card.append(b);
   if(error){const note=document.createElement('small');note.textContent=error;card.append(note);}
  }sites.append(card);
 }
}
