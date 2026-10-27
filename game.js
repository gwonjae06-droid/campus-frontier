import {initialState,emptyPlan,enemyOrders,resolveTurn,canBuild,canMove,availableGold,PRICE,terrain,isCampus,stats,canOrder,income,unitCap} from './simulation.js?v=03';
import {createBoard} from './board.js?v=03';
const $=selector=>document.querySelector(selector),SAVE='campus-frontier-turn-v3';
let state=initialState(),plan=emptyPlan(),selected=null,mode='move',busy=false,focused=false,board,committedEnemy;
let storageAvailable=true;
try {const saved=JSON.parse(localStorage.getItem(SAVE));if(saved?.state?.version===3&&Number.isInteger(saved.state.turn)&&Array.isArray(saved.state.units)&&Array.isArray(saved.state.structures)&&saved.plan?.builds&&saved.plan?.orders){state=saved.state;plan=saved.plan;}}catch{storageAvailable=false;}
committedEnemy=enemyOrders(state);
function save(){try{localStorage.setItem(SAVE,JSON.stringify({state,plan}));}catch{storageAvailable=false;}}
function toast(text){$('#toast').textContent=text;}
const names={wall:'성벽',tower:'방어탑',recruit:'보병 모집',scout:'정찰 모집'};
const actionNames={move:'이동',attack:'공격',guard:'방어',capture:'점령',heal:'회복',wait:'대기'};
function reserveAction(type){const u=state.units.find(u=>u.id===selected);if(type==='attack'){setMode('attack');toast('인접한 적 부대나 적 본진을 클릭하세요.');return;}const o={type},error=canOrder(state,u,o,plan);if(error){toast(error);return;}plan.orders[u.id]=o;save();refresh();toast(`${stats(u).name} · ${actionNames[type]} 예약`);}
function unitName(u){return `${u.team==='ally'?'아군':'적'} ${stats(u).name} ${u.id.slice(1)}`;}
function selection(title,body){$('#selectionTitle').textContent=title;$('#selectionBody').textContent=body;}
function setMode(next){mode=next;document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));if(focused&&mode!=='inspect')setFocus(false);refresh();}
function refresh(){
 $('#gold').textContent=availableGold(state,plan);$('#gold').title=`보유 ${state.gold} / 예약 ${state.gold-availableGold(state,plan)}`;$('#health').textContent=state.homeHP;$('#turn').textContent=state.turn;$('#enemyHP').textContent=`${state.enemyHP} / 30`;$('#enemyBar').value=state.enemyHP;
 const count=Object.keys(plan.orders).length+plan.builds.length;$('#orderCount').textContent=count;$('#mobilePlan').textContent=`예약 ${count}개`;$('#mobilePlan').disabled=busy;$('#mobileClear').disabled=busy||!count;$('#clearPlan').disabled=busy||!count;
 $('#resolve').disabled=busy||!!state.result||!board;$('#resolve').textContent=state.result?({victory:'전초기지 점령 · 승리',defeat:'본진 함락',draw:'양쪽 본진 함락'})[state.result]:busy?'양쪽 명령 실행 중…':`턴 ${state.turn} 실행 →`;
 $('#turnHint').textContent=state.result?'새 연습을 시작해 다른 전략을 시도하세요.':`예약 ${state.gold-availableGold(state,plan)} OP · 명령 ${count}개 · 수입 +${income(state)} OP / 턴`;
 document.querySelectorAll('[data-mode]').forEach(b=>b.disabled=busy||!!state.result);$('#reset').disabled=busy;
 const list=$('#orders');list.replaceChildren();
 const add=(text,cancel)=>{const row=document.createElement('div');row.className='order';const label=document.createElement('span');label.textContent=text;const button=document.createElement('button');button.textContent='×';button.setAttribute('aria-label',`${text} 취소`);button.disabled=busy;button.onclick=()=>{cancel();save();refresh();toast('예약을 취소했습니다.');};row.append(label,button);list.append(row);};
 for(const [id,o] of Object.entries(plan.orders)){const u=state.units.find(u=>u.id===id);if(u)add(`${unitName(u)} · ${o.type==='move'?`${o.x+1}, ${o.z+1} 이동`:actionNames[o.type]}`,()=>delete plan.orders[id]);}
 plan.builds.forEach((b,i)=>add(`${names[b.type]} · ${b.x+1}, ${b.z+1} / ${PRICE[b.type]}`,()=>plan.builds.splice(i,1)));
 if(!count){const p=document.createElement('p');p.className='empty';p.textContent='미지정 부대는 대기합니다. 공격과 점령은 별도 명령입니다.';list.append(p);}
 const roster=$('#roster');roster.replaceChildren();for(const u of state.units.filter(u=>u.team==='ally')){const b=document.createElement('button');b.textContent=`${stats(u).name} ${u.id.slice(1)} · ${u.hp}/${stats(u).hp}`;b.classList.toggle('active',u.id===selected);b.disabled=busy;b.onclick=()=>{selected=u.id;setMode('move');selection(unitName(u),`이동력 ${stats(u).move} · 공격 ${stats(u).attack} / 방어 ${stats(u).defense}. 행동 하나를 예약하세요.`);};roster.append(b);}
 $('#unitCount').textContent=`${state.units.filter(u=>u.team==='ally').length}/${unitCap(state)}`;document.querySelectorAll('[data-action]').forEach(b=>b.disabled=busy||!!state.result||!selected);
 if(board&&!busy)board.sync(state,plan,selected,mode);
}
function setFocus(value){focused=value;board?.setFocus(value);$('#overview').hidden=!value;$('#mapMode').textContent=value?'캠퍼스 확대 · 3×3 본진':'전략 지도';$('#focusCampus').textContent=value?'전체 전장 ↙':'캠퍼스 확대 ↗';if(value){mode='inspect';document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));toast('56개 건물을 모두 유지했습니다. 건물을 누르면 이름이 표시됩니다.');}refresh();}
function pick(hit){
 if(hit.building){const b=hit.building,name=b.n??`이름 미등록 건물 ${b.index+1}`;selection(name,`지도 데이터 기준 ${b.lv??'미상'}층 · 높이 ${b.h}m. 전체 캠퍼스와 같은 비율로 축소했습니다.`);toast(`${name} · ${b.lv??'미상'}층 / ${b.h}m`);return;}
 const {x,z}=hit;if(busy)return;if(isCampus(x,z)){selection('성균관대학교 · 3×3 본진','데이터에 포함된 56개 건물을 모두 배치했습니다. 캠퍼스 확대에서 건물을 확인하세요.');setFocus(true);return;}
 const unit=state.units.find(u=>u.x===x&&u.z===z),structure=state.structures.find(s=>s.x===x&&s.z===z);
 if(state.result){toast('연습이 종료되었습니다. 새 연습을 시작할 수 있습니다.');return;}
 if(['wall','tower','recruit','scout'].includes(mode)){
  const error=canBuild(state,plan,mode,x,z);if(error){toast(error);return;}
  if(Object.values(plan.orders).some(o=>o.type==='move'&&o.x===x&&o.z===z)){toast('부대의 이동 예약이 있는 칸입니다. 해당 명령부터 취소하세요.');return;}
  plan.builds.push({type:mode,x,z});save();refresh();toast(`${names[mode]} 예약 완료 · 턴 실행 전까지 취소할 수 있습니다.`);return;
 }
 if(mode==='attack'&&selected){const target=unit?{kind:'unit',id:unit.id}:structure?{kind:'structure',id:structure.id}:terrain(x,z)==='enemy-base'?{kind:'base',team:'enemy'}:null;const u=state.units.find(u=>u.id===selected),order={type:'attack',target},error=canOrder(state,u,order);if(error){toast(error);return;}plan.orders[selected]=order;save();refresh();toast('공격 예약 완료 · 대상이 사거리를 벗어나면 실패합니다.');return;}
 if(unit){selection(unitName(unit),`체력 ${unit.hp}/${stats(unit).hp} · ${x+1}, ${z+1} 구역. ${unit.team==='ally'?'인접한 빈 타일을 눌러 이동 예약.':'다음 행동은 턴이 실행될 때 공개됩니다.'}`);if(unit.team==='ally'&&mode==='move'){selected=unit.id;refresh();toast('밝은 타일로 이동하거나 공격·방어·점령·회복 중 하나를 선택하세요.');}else toast(`${unitName(unit)} · 체력 ${unit.hp}/${stats(unit).hp}`);return;}
 if(mode==='move'&&selected){const u=state.units.find(u=>u.id===selected);const error=canMove(state,u,x,z,plan);if(error){toast(error);return;}if(Object.entries(plan.orders).some(([id,o])=>id!==selected&&o.type==='move'&&o.x===x&&o.z===z)){toast('다른 아군 부대가 이 칸으로 이동을 예약했습니다.');return;}plan.orders[selected]={type:'move',x,z};save();refresh();toast(`${unitName(u)} → ${x+1}, ${z+1} 이동 예약. 턴 실행 시 함께 움직입니다.`);return;}
 const type=terrain(x,z);selection(structure?names[structure.type]:type==='resource'?'자원 거점':type==='enemy-base'?'AI 전초기지':`${x+1}, ${z+1} 구역`,structure?`내구도 ${structure.hp}. ${structure.type==='tower'?'사거리 2칸, 공격 3. 2턴 건설, 완공 다음 턴부터 공격.':'적의 이동을 막습니다.'}`:type==='resource'?'거점에 도착한 다음 턴에 점령 명령을 내리세요. 정상 거점은 OP +2. 적 거점은 한 턴 안정화합니다.':type==='enemy-base'?'인접한 아군의 공격을 예약하세요. 이동 후 자동 공격하지 않습니다.':'부대를 선택하거나 건설 도구를 선택하세요.');
}
async function execute(){if(busy||state.result)return;busy=true;selected=null;refresh();try{const before=state,{state:next,events}=resolveTurn(state,plan,committedEnemy);state=next;plan=emptyPlan();committedEnemy=enemyOrders(state);save();await board.animate(before,next,events,phase=>{$('#phase').textContent=`턴 ${before.turn} 결과 재생 · ${phase}`;});const destroyed=events.filter(e=>e.type==='destroy').length,attacks=events.filter(e=>e.type==='attack').length,income=events.find(e=>e.type==='income').amount;
 toast(state.result?({victory:'승리! 적 전초기지를 점령했습니다.',defeat:'본진이 함락되었습니다. 새 연습에서 방어선을 바꿔보세요.',draw:'양쪽 본진이 동시에 함락되었습니다.'})[state.result]:`턴 ${state.turn-1} 완료 · 교전 ${attacks}회${destroyed?` · 부대 ${destroyed}개 소멸`:''} · 자원 +${income}`);selection(`턴 ${state.turn-1} 결과`,`${events.filter(e=>e.type==='move').length}개 부대 이동 · ${attacks}회 공격 · 수입 +${income}${events.some(e=>e.type==='reinforce')?' · 적 병력 모집':''}${events.filter(e=>e.type==='failed').map(e=>' · '+e.text).join('')}`);
 }catch(error){toast(`명령을 실행하지 못했습니다: ${error.message}`);}finally{busy=false;$('#phase').textContent=state.result?'연습 종료':'명령 예약';refresh();}}
 document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{setMode(b.dataset.mode);toast(mode==='move'?'초록 부대를 선택한 뒤 인접한 타일을 누르세요.':mode==='inspect'?'건물·부대·타일을 눌러 정보를 확인하세요.':`${names[mode]} · 캠퍼스 영토에 예약하세요. 모집은 금빛 출전 타일입니다.`);});
 document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>reserveAction(b.dataset.action));
 $('#resolve').onclick=execute;$('#clearPlan').onclick=()=>{plan=emptyPlan();save();refresh();toast('모든 예약을 취소하고 자원을 돌려놓았습니다.');};$('#focusCampus').onclick=()=>setFocus(!focused);$('#overview').onclick=()=>setFocus(false);
 $('#rotateLeft').onclick=()=>board?.rotate(-1);$('#rotateRight').onclick=()=>board?.rotate(1);$('#zoomIn').onclick=()=>board?.zoomBy(.3);$('#zoomOut').onclick=()=>board?.zoomBy(-.3);
 $('#help').onclick=()=>$('#dialog').showModal();$('#credits').onclick=()=>$('#creditsDialog').showModal();$('#reset').onclick=()=>$('#resetDialog').showModal();document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
 $('#confirmReset').onclick=()=>{state=initialState();plan=emptyPlan();selected=null;committedEnemy=enemyOrders(state);save();$('#resetDialog').close();setFocus(false);setMode('move');$('#phase').textContent='명령 예약';selection('부대에 첫 명령을 내려보세요','초록 부대를 선택하고 인접한 타일을 누르면 이동을 예약합니다.');toast('새 연습을 시작했습니다.');};
$('#mobilePlan').onclick=()=>{$('#planContent').append($('#orders'));$('#planDialog').showModal();};
$('#planDialog').addEventListener('close',()=>document.querySelector('aside').insertBefore($('#orders'),$('#reset')));
$('#mobileClear').onclick=()=>{plan=emptyPlan();save();refresh();toast('모든 예약을 취소했습니다.');};
$('#mobileReset').onclick=()=>{$('#dialog').close();$('#resetDialog').showModal();};
 addEventListener('keydown',e=>{if(e.key==='Escape'&&!busy){selected=null;if(focused)setFocus(false);setMode('move');}});
 try{const response=await fetch('./data/skku-campus.json');if(!response.ok)throw new Error('지도 데이터를 불러오지 못했습니다.');const data=await response.json();board=createBoard($('#game'),data,pick);$('#buildingCount').textContent=board.campusCount;$('#loading').remove();refresh();try{if(!localStorage.getItem(SAVE)&&localStorage.getItem('campus-frontier-turn-v2'))toast('규칙 변경으로 새 연습을 시작합니다. 이전 저장은 별도로 보존됩니다.');}catch{}if(!storageAvailable)toast('브라우저 저장을 사용할 수 없습니다. 이번 플레이는 새로고침 시 초기화됩니다.');}catch(error){$('#loading').textContent=`실행 오류: ${error.message} 새로고침해 다시 시도하세요.`;}
