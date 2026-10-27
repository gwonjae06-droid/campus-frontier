import {TECHS,PROJECTS,researchRate,hasTech,canResearch,canProject,normalPoint,DEPOSITS} from './growth.js?v=09';
import {initialState,emptyPlan,enemyOrders,resolveTurn,canBuild,canMove,availableGold,PRICE,terrain,isCampus,stats,canOrder,income,unitCap,TURN_LIMIT,CENTRAL_POINT,victoryPoints} from './simulation.js?v=09';
import {createBoard} from './board.js?v=09';
const $=selector=>document.querySelector(selector),SAVE='campus-frontier-turn-v9';
let state=initialState('standard'),plan=emptyPlan(),selected=null,mode='move',busy=false,focused=false,board,committedEnemy;
let storageAvailable=true;
try {const saved=JSON.parse(localStorage.getItem(SAVE));if(saved?.state?.version===9&&Number.isInteger(saved.state.turn)&&Array.isArray(saved.state.units)&&Array.isArray(saved.state.structures)&&saved.plan?.builds&&saved.plan?.orders){state=saved.state;plan=saved.plan;}}catch{storageAvailable=false;}
committedEnemy=enemyOrders(state);
// HUD panels are independent from saved match state and never alter the turn engine.
const compactScreen=window.matchMedia('(max-width:760px)');
document.body.classList.toggle('panel-open',!compactScreen.matches);
$('#panelToggle').setAttribute('aria-expanded',String(!compactScreen.matches));
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
function unitName(u){return `${u.team==='ally'?'성균관대':u.team==='rival'?'연세대 AI':'고려대 AI'} ${stats(u).name} ${u.id.slice(1)}`;}
function selection(title,body){$('#selectionTitle').textContent=title;$('#selectionBody').textContent=body;}
function setMode(next){mode=next;document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));if(focused&&mode!=='inspect')setFocus(false);refresh();}
function refresh(){
 $('#gold').textContent=availableGold(state,plan);$('#gold').title=`보유 ${state.gold} / 예약 ${state.gold-availableGold(state,plan)}`;$('#health').textContent=state.homeHP;$('#turn').textContent=`${Math.min(state.turn,TURN_LIMIT)}/${TURN_LIMIT}`;$('#scoreBoard').textContent=`점수 · 성균관대 ${victoryPoints(state,'ally')} / 고려대 ${victoryPoints(state,'enemy')} / 연세대 ${victoryPoints(state,'rival')}`;$('#rpHud').textContent=researchRate(state);$('#scoreHud').textContent=`${victoryPoints(state,'ally')}:${victoryPoints(state,'enemy')}:${victoryPoints(state,'rival')}`;document.body.classList.toggle('unit-selected',!!selected&&!busy&&!state.result);$('#enemyHP').textContent=`${state.enemyHP} / 30`;$('#enemyBar').value=state.enemyHP;$('#rivalHP').textContent=`${state.rivalHP} / 30`;$('#rivalBar').value=state.rivalHP;
 const count=Object.keys(plan.orders).length+plan.builds.length+(plan.projects??[]).length+(Object.hasOwn(plan,'research')?1:0);$('#orderCount').textContent=count;$('#mobilePlan').textContent=`예약 ${count}개`;$('#mobilePlan').disabled=busy;$('#mobileClear').disabled=busy||!count;$('#clearPlan').disabled=busy||!count;
 $('#resolve').disabled=busy||!!state.result||!board;$('#resolve').textContent=state.result?(state.victoryMode==='score'?({victory:'점수 승리',defeat:'점수 패배',draw:'점수 무승부'})[state.result]:({victory:'전초기지 점령 · 승리',defeat:'본진 함락',draw:'양쪽 본진 함락'})[state.result]):busy?'양쪽 명령 실행 중…':`턴 ${state.turn} 실행 →`;
 $('#turnHint').textContent=state.result?'새 연습을 시작해 다른 전략을 시도하세요.':`예약 ${state.gold-availableGold(state,plan)} OP · 명령 ${count}개 · 점수 ${victoryPoints(state,'ally')}:${victoryPoints(state,'enemy')}:${victoryPoints(state,'rival')} · 수입 +${income(state)} OP/턴`;
 document.querySelectorAll('[data-mode]').forEach(b=>b.disabled=busy||!!state.result);$('#reset').disabled=busy;
 const list=$('#orders');list.replaceChildren();
 const add=(text,cancel)=>{const row=document.createElement('div');row.className='order';const label=document.createElement('span');label.textContent=text;const button=document.createElement('button');button.textContent='×';button.setAttribute('aria-label',`${text} 취소`);button.disabled=busy;button.onclick=()=>{cancel();save();refresh();toast('예약을 취소했습니다.');};row.append(label,button);list.append(row);};
 for(const [id,o] of Object.entries(plan.orders)){const u=state.units.find(u=>u.id===id);if(u)add(`${unitName(u)} · ${o.type==='move'?`${o.x+1}, ${o.z+1} 이동`:actionNames[o.type]}`,()=>delete plan.orders[id]);}
 plan.builds.forEach((b,i)=>add(`${names[b.type]} · ${b.x+1}, ${b.z+1} / ${PRICE[b.type]}`,()=>plan.builds.splice(i,1)));
 for(const [i,o] of (plan.projects??[]).entries())add(`${siteName(o.site)} · ${PROJECTS[o.type].name} / ${PROJECTS[o.type].cost} OP`,()=>plan.projects.splice(i,1));
 if(Object.hasOwn(plan,'research'))add(`연구 · ${plan.research?TECHS[plan.research].name:'보관'}`,()=>delete plan.research);
 if(!count){const p=document.createElement('p');p.className='empty';p.textContent='미지정 부대는 대기합니다. 공격과 점령은 별도 명령입니다.';list.append(p);}
 const roster=$('#roster');roster.replaceChildren();for(const u of state.units.filter(u=>u.team==='ally')){const b=document.createElement('button');b.textContent=`${stats(u).name} ${u.id.slice(1)} · ${u.hp}/${stats(u).hp}`;b.classList.toggle('active',u.id===selected);b.disabled=busy;b.onclick=()=>{selected=u.id;setMode('move');selection(unitName(u),`이동력 ${stats(u).move} · 공격 ${stats(u).attack} / 방어 ${stats(u).defense}. 행동 하나를 예약하세요.`);};roster.append(b);}
 $('#unitCount').textContent=`${state.units.filter(u=>u.team==='ally').length}/${unitCap(state)}${state.pendingRecruits?.length?` · 훈련 ${state.pendingRecruits.length}`:''}`;document.querySelectorAll('[data-action]').forEach(b=>b.disabled=busy||!!state.result||!selected);
 for(const [type,tech] of [['wall','defense'],['tower','towers'],['road','roads'],['siege','siege'],['cavalry','mobility']]){const button=document.querySelector(`[data-mode="${type}"]`);button.querySelector('small').textContent=hasTech(state,'ally',tech)?`${PRICE[type]} OP · ${['tower','siege','cavalry'].includes(type)?2:1}턴`:`🔒 ${TECHS[tech].name}`;}
 refreshGrowth();
 if(board&&!busy)board.sync(state,plan,selected,mode);
}
function setFocus(value){focused=value;board?.setFocus(value);$('#overview').hidden=!value;$('#mapMode').textContent=value?'캠퍼스 확대 · 3×3 본진':'전략 지도';$('#focusCampus').textContent=value?'전체 전장 ↙':'캠퍼스 확대 ↗';if(value){mode='inspect';document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));toast('56개 건물을 모두 유지했습니다. 건물을 누르면 이름이 표시됩니다.');}refresh();}
function pick(hit){
 if(hit.building){const b=hit.building,name=b.n??`이름 미등록 건물 ${b.index+1}`;selection(name,`지도 데이터 기준 ${b.lv??'미상'}층 · 높이 ${b.h}m. 전체 캠퍼스와 같은 비율로 축소했습니다.`);toast(`${name} · ${b.lv??'미상'}층 / ${b.h}m`);return;}
 const {x,z}=hit;if(busy)return;if(isCampus(x,z)){selection('성균관대학교 · 3×3 본진','데이터에 포함된 56개 건물을 모두 배치했습니다. 캠퍼스 확대에서 건물을 확인하세요.');setFocus(true);return;}
 const unit=state.units.find(u=>u.x===x&&u.z===z),structure=state.structures.find(s=>s.x===x&&s.z===z);
 if(state.result){toast('연습이 종료되었습니다. 새 연습을 시작할 수 있습니다.');return;}
 if(['wall','tower','road','recruit','scout','siege','cavalry'].includes(mode)){
  const error=canBuild(state,plan,mode,x,z);if(error){toast(error);return;}
  if(Object.values(plan.orders).some(o=>o.type==='move'&&o.x===x&&o.z===z)){toast('부대의 이동 예약이 있는 칸입니다. 해당 명령부터 취소하세요.');return;}
  plan.builds.push({type:mode,x,z});save();refresh();toast(`${names[mode]} 예약 완료 · 턴 실행 전까지 취소할 수 있습니다.`);return;
 }
 if(mode==='attack'&&selected){const target=unit?{kind:'unit',id:unit.id}:structure?{kind:'structure',id:structure.id}:terrain(x,z)==='enemy-base'?{kind:'base',team:'enemy'}:terrain(x,z)==='rival-base'?{kind:'base',team:'rival'}:null;const u=state.units.find(u=>u.id===selected),order={type:'attack',target},error=canOrder(state,u,order);if(error){toast(error);return;}plan.orders[selected]=order;save();refresh();toast('공격 예약 완료 · 대상이 사거리를 벗어나면 실패합니다.');return;}
 if(unit){selection(unitName(unit),`체력 ${unit.hp}/${stats(unit).hp} · ${x+1}, ${z+1} 구역. ${unit.team==='ally'?'인접한 빈 타일을 눌러 이동 예약.':'다음 행동은 턴이 실행될 때 공개됩니다.'}`);if(unit.team==='ally'&&mode==='move'){selected=unit.id;refresh();toast('밝은 타일로 이동하거나 공격·방어·점령·회복 중 하나를 선택하세요.');}else toast(`${unitName(unit)} · 체력 ${unit.hp}/${stats(unit).hp}`);return;}
 if(mode==='move'&&selected){const u=state.units.find(u=>u.id===selected);const error=canMove(state,u,x,z,plan);if(error){toast(error);return;}if(Object.entries(plan.orders).some(([id,o])=>id!==selected&&o.type==='move'&&o.x===x&&o.z===z)){toast('다른 아군 부대가 이 칸으로 이동을 예약했습니다.');return;}plan.orders[selected]={type:'move',x,z};save();refresh();toast(`${unitName(u)} → ${x+1}, ${z+1} 이동 예약. 턴 실행 시 함께 움직입니다.`);return;}
 const site=keyForSite(x,z);if(Object.hasOwn(state.points,site)){const owner=state.points[site];selection(site===CENTRAL_POINT?'★ 중앙 주요 거점':'일반 거점',`${owner==='ally'?'성균관대 소유':owner==='enemy'?'AI 소유':'중립'} · ${site===CENTRAL_POINT?5:3}점 · 정상 거점 수입 +2 OP/턴. 점령은 거점 위 부대가 다음 턴에 명령을 예약해야 합니다.`);return;}
  const deposit=DEPOSITS.find(d=>d.x===x&&d.z===z);if(deposit){selection('개발 자원',state.developed[`${x},${z}`]?'개발 완료 · 소유 작업장이 정상 상태일 때 OP +1/턴.':'연구와 거점 관리에서 자원 개발 연구 후 3 OP로 개발합니다. 부대는 이 타일을 통과할 수 있습니다.');return;}
 const type=terrain(x,z);selection(structure?names[structure.type]:type==='resource'?'자원 거점':type==='enemy-base'?'AI 전초기지':`${x+1}, ${z+1} 구역`,structure?`내구도 ${structure.hp}. ${structure.type==='tower'?'사거리 2칸, 공격 3. 2턴 건설, 완공 다음 턴부터 공격.':'적의 이동을 막습니다.'}`:type==='resource'?'거점에 도착한 다음 턴에 점령 명령을 내리세요. 정상 거점은 OP +2. 적 거점은 한 턴 안정화합니다.':type==='enemy-base'?'인접한 아군의 공격을 예약하세요. 이동 후 자동 공격하지 않습니다.':'부대를 선택하거나 건설 도구를 선택하세요.');
}
async function execute(){if(busy||state.result)return;busy=true;selected=null;refresh();try{const before=state,{state:next,events}=resolveTurn(state,plan,committedEnemy);state=next;plan=emptyPlan();committedEnemy=enemyOrders(state);save();await board.animate(before,next,events,phase=>{$('#phase').textContent=`턴 ${before.turn} 결과 재생 · ${phase}`;});const destroyed=events.filter(e=>e.type==='destroy').length,attacks=events.filter(e=>e.type==='attack').length,income=events.find(e=>e.type==='income').amount;
 toast(state.result?(state.victoryMode==='score'?`${TURN_LIMIT}턴 종료 · 점수 ${victoryPoints(state,'ally')}:${victoryPoints(state,'enemy')}:${victoryPoints(state,'rival')} · ${state.result==='victory'?'승리':state.result==='defeat'?'패배':'무승부'}`:({victory:'승리! 적 전초기지를 점령했습니다.',defeat:'본진이 함락되었습니다. 새 연습에서 방어선을 바꿔보세요.',draw:'양쪽 본진이 동시에 함락되었습니다.'})[state.result]):`턴 ${state.turn-1} 완료 · 교전 ${attacks}회${destroyed?` · 부대 ${destroyed}개 소멸`:''} · 자원 +${income}`);selection(`턴 ${state.turn-1} 결과`,`${events.filter(e=>e.type==='move').length}개 부대 이동 · ${attacks}회 공격 · 수입 +${income}${events.some(e=>e.type==='reinforce')?' · 적 병력 모집':''}${events.filter(e=>e.type==='failed'||['research','project'].includes(e.type)&&e.team==='ally').map(e=>' · '+e.text).join('')}`);
 }catch(error){toast(`명령을 실행하지 못했습니다: ${error.message}`);}finally{busy=false;$('#phase').textContent=state.result?'연습 종료':'명령 예약';refresh();}}
 document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{setMode(b.dataset.mode);toast(mode==='move'?'아군을 선택한 뒤 이동할 타일을 누르세요.':mode==='inspect'?'건물·부대·타일을 눌러 정보를 확인하세요.':mode==='road'?'도로망 연구 후 자기 영토의 통행 가능한 타일을 누르세요.':`${names[mode]} · 캠퍼스 영토에 예약하세요. 모집은 금빛 출전 타일입니다.`);});
 document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>reserveAction(b.dataset.action));
 $('#resolve').onclick=execute;$('#clearPlan').onclick=()=>{plan=emptyPlan();save();refresh();toast('모든 예약을 취소하고 자원을 돌려놓았습니다.');};$('#focusCampus').onclick=()=>setFocus(!focused);$('#overview').onclick=()=>setFocus(false);
 $('#panelToggle').onclick=()=>toggleHudPanel('panel-open',$('#panelToggle'),!document.body.classList.contains('panel-open'));
 $('#viewToggle').onclick=()=>toggleHudPanel('camera-open',$('#viewToggle'),!document.body.classList.contains('camera-open'));
 $('#creditsOpen').onclick=()=>$('#creditsDialog').showModal();
 $('#game').addEventListener('pointerdown',()=>{if(compactScreen.matches&&document.body.classList.contains('panel-open'))toggleHudPanel('panel-open',$('#panelToggle'),false);if(document.body.classList.contains('camera-open'))toggleHudPanel('camera-open',$('#viewToggle'),false);});
 compactScreen.addEventListener('change',()=>{toggleHudPanel('panel-open',$('#panelToggle'),!compactScreen.matches);toggleHudPanel('camera-open',$('#viewToggle'),false);});
 $('#pitchLow').onclick=()=>board?.setPitch(22);$('#pitchHigh').onclick=()=>board?.setPitch(72);
  $('#zoomRange').oninput=e=>board?.setZoom(Number(e.target.value));
  $('#rotateLeft').onclick=()=>board?.rotate(-1);$('#rotateRight').onclick=()=>board?.rotate(1);$('#zoomIn').onclick=()=>board?.zoomBy(.65);$('#zoomOut').onclick=()=>board?.zoomBy(-.65);
 $('#pitch').oninput=e=>board?.setPitch(Number(e.target.value));$('#resetView').onclick=()=>{setFocus(false);board?.resetView();};
 $('#growth').onclick=()=>$('#growthDialog').showModal();
 $('#help').onclick=()=>$('#dialog').showModal();$('#credits').onclick=()=>$('#creditsDialog').showModal();$('#reset').onclick=()=>$('#resetDialog').showModal();document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
 $('#confirmReset').onclick=()=>{state=initialState('standard');plan=emptyPlan();selected=null;committedEnemy=enemyOrders(state);save();$('#resetDialog').close();setFocus(false);setMode('move');$('#phase').textContent='명령 예약';selection('부대에 첫 명령을 내려보세요','초록 부대를 선택하고 인접한 타일을 누르면 이동을 예약합니다.');toast('새 연습을 시작했습니다.');};
$('#mobilePlan').onclick=()=>{$('#planContent').append($('#orders'));$('#planDialog').showModal();};
$('#planDialog').addEventListener('close',()=>document.querySelector('aside').insertBefore($('#orders'),$('#reset')));
$('#mobileClear').onclick=()=>{plan=emptyPlan();save();refresh();toast('모든 예약을 취소했습니다.');};
$('#mobileReset').onclick=()=>{$('#dialog').close();$('#resetDialog').showModal();};
 addEventListener('keydown',e=>{if(e.key==='Escape'&&!busy){if(document.body.classList.contains('camera-open'))toggleHudPanel('camera-open',$('#viewToggle'),false);else if(compactScreen.matches&&document.body.classList.contains('panel-open'))toggleHudPanel('panel-open',$('#panelToggle'),false);else {selected=null;if(focused)setFocus(false);setMode('move');}}});
 try{const response=await fetch('./data/skku-campus.json');if(!response.ok)throw new Error('지도 데이터를 불러오지 못했습니다.');const data=await response.json();board=createBoard($('#game'),data,pick,null,(pitch,zoom)=>{$('#pitch').value=Math.round(pitch);$('#pitchValue').textContent=`${Math.round(pitch)}°`;$('#zoomRange').value=zoom;$('#zoomValue').textContent=`${zoom.toFixed(1)}×`;});$('#buildingCount').textContent=board.campusCount;$('#loading').remove();refresh();try{if(!localStorage.getItem(SAVE)&&localStorage.getItem('campus-frontier-turn-v8'))toast('규칙 변경으로 새 연습을 시작합니다. 이전 저장은 별도로 보존됩니다.');}catch{}if(!storageAvailable)toast('브라우저 저장을 사용할 수 없습니다. 이번 플레이는 새로고침 시 초기화됩니다.');}catch(error){$('#loading').textContent=`실행 오류: ${error.message} 새로고침해 다시 시도하세요.`;}

function refreshGrowth(){
 const r=state.research.ally,active=Object.hasOwn(plan,'research')?plan.research:r.active,rate=researchRate(state);
 $('#growth').textContent=active?`${TECHS[active].name} ${r.progress[active]??0}/${TECHS[active].cost} · +${rate} RP`:`연구 선택 · +${rate} RP/턴`;
 $('#researchSummary').textContent=`보관 ${r.bank}/10 RP · 이번 턴 산출 ${rate} RP · 완료 ${r.done.length}/${Object.keys(TECHS).length}`;
 $('#researchWarning').textContent=!active?`연구 미선택 · 이번 턴 종료에 ${Math.max(0,r.bank+rate-10)} RP가 보관 상한을 넘어 소실됩니다.`:'선택을 바꿔도 기술별 진행도는 보존됩니다. 완성된 기술은 다음 턴부터 사용합니다.';
 const techList=$('#techList');techList.replaceChildren();
 for(const [id,t] of Object.entries(TECHS)){
  const done=hasTech(state,'ally',id),error=canResearch(state,'ally',id),button=document.createElement('button');button.className='tech-card';button.classList.toggle('active',id===active);
  const title=document.createElement('strong');title.textContent=`${done?'✓ 완료':id===active?'▶ 선택 중':error?'🔒 잠김':'선택 가능'} · ${t.name} ${r.progress[id]??0}/${t.cost} RP`;
  const detail=document.createElement('small');detail.textContent=t.effect+(error&&!done?` · ${error}`:'');button.append(title,detail);button.disabled=busy||!!state.result||!!error;
  button.onclick=()=>{plan.research=id;save();refresh();toast(`${t.name} 연구 선택 · 턴 종료 시 RP 투자`);};techList.append(button);
 }
 $('#bankResearch').disabled=busy||!!state.result;$('#bankResearch').onclick=()=>{plan.research=null;save();refresh();};
 const sites=$('#siteList');sites.replaceChildren();
 for(const site of ['home',...Object.keys(state.points)]){
  const home=site==='home',card=document.createElement('section'),title=document.createElement('h3'),info=document.createElement('p');card.className='site-card';
  title.textContent=home?'성균관대 캠퍼스':siteName(site);const own=home||state.points[site]==='ally',normal=home||normalPoint(state,site,'ally');
  info.textContent=home?`OP +${state.developed['5,5']?6:5} · RP +${3+(state.labs?.home?1:0)} · 캠퍼스 작업 슬롯 1${state.labConstruction?.home?' · 연구 시설 건설 중':''}`:!own?(state.points[site]?'적 소유':'중립 · 부대의 점령 명령 필요'):!normal?`안정화 중 · ${state.pointReady[site]}턴 정상화`:`정상 · OP +${state.specialties[site]==='economy'?4:2} · RP +${(state.specialties[site]==='science'?2:0)+(state.labs?.[site]?1:0)}${state.specialties[site]?' · '+PROJECTS[state.specialties[site]].name:''}${state.labConstruction?.[site]?' · 연구 시설 건설 중':''}`;
  card.append(title,info);
  if(own)for(const type of home?['develop','lab','grand']:site===CENTRAL_POINT?['lab']:['develop','economy','science','military','lab','wide']){
   const o={site,type},error=canProject(state,plan,o,availableGold(state,plan)),b=document.createElement('button'),item=PROJECTS[type];b.textContent=`${item.name} · ${item.cost} OP / ${type==='grand'?3:type==='lab'?2:1}턴`;b.disabled=busy||!!state.result||!!error;b.title=error??'다음 턴부터 산출 적용';b.onclick=()=>{plan.projects??=[];plan.projects.push(o);save();refresh();toast(`${item.name} 예약 · 명령 목록에서 취소 가능`);};card.append(b);
   if(error){const note=document.createElement('small');note.textContent=error;card.append(note);}
  }sites.append(card);
 }
}
