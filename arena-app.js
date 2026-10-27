import {UNIVERSITIES,SIZE,OUTPOSTS,pos,baseAt,initialDuel,legalActions,applyAction,chooseAiAction,matchScore} from './arena-engine.js';
import {readProfile,PROFILE_KEY,recordMatch,practiceTier,profileStats,localUniversityTiers} from './arena-ranking.js';
import {createDuelPeer} from './arena-peer.js';

const root=document.getElementById('arenaRoot');
let page='home', setup='ai', schools=['skku','yonsei'], duel=null, selected=null, pendingAi=false;
let peer=null,role=null,connected=false,offerCode='',answerCode='',netMessage='';
let profile=readProfile(localStorage),lastFinished=false,chat=[],muted=false,lastSent=0,classicLoaded=false;
const saveProfile=()=>{try{localStorage.setItem(PROFILE_KEY,JSON.stringify(profile));}catch{}};
const node=(tag,cls,text)=>{
 const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;
};
const btn=(text,act,cls='secondary')=>{
 const b=node('button',cls,text);b.type='button';b.dataset.act=act;return b;
};
const info=text=>node('p','fine',text);
function banner(text){
 netMessage=text;const element=root.querySelector('[data-network-status]');if(element)element.textContent=text;
}
function shell(){
 root.replaceChildren();const wrap=node('div','arena-wrap');
 const nav=node('nav','arena-nav'),brand=node('div','arena-brand');brand.innerHTML='대학<span>전선</span><small>CAMPUS DUEL · UNIVERSITY RIVALS</small>';nav.append(brand);
 const spacer=node('div','nav-gap');nav.append(spacer);
 const home=btn('홈','home','soft'),rank=btn('랭킹','rank','soft'),classic=btn('기존 3D 전장','classic','soft');
 home.setAttribute('aria-current',page==='home'?'page':'false');rank.setAttribute('aria-current',page==='rank'?'page':'false');
 nav.append(home,rank,classic);wrap.append(nav);root.append(wrap);return wrap;
}
function renderHome(){
 const w=shell();
 const hero=node('section','arena-hero');
 hero.append(node('div','eyebrow','1 VS 1 · TURN-BASED STRATEGY'));
 hero.append(node('h1','', '캠퍼스의 명예는 한 수로 결정된다.'));
 hero.append(node('p','','기존 본진 관리 대신, 짧고 선명한 1대1 대전. 움직이고, 거점을 차지하고, 상대 캠퍼스를 무너뜨리세요.'));
 w.append(hero);
 const grid=node('div','arena-grid');
 for(const item of [
  ['⚔','PvE 대전','AI와 연습하고 전략을 익히세요.','ai-setup',true],
  ['♟','PvP 친선전','같은 기기에서 친구와 번갈아 플레이.','local-setup',false],
  ['🌐','온라인 PvP 베타','서로 연결 코드를 주고받는 직접 연결.','online-setup',false]
 ]){
  const card=node('article','arena-card'+(item[4]?' feature':''));card.append(node('div','symbol',item[0]),node('h3','',item[1]),node('p','',item[2]));card.append(btn('대전 시작 →',item[3],'primary'));grid.append(card);
 }
 w.append(grid);
 const note=node('div','arena-alert','현재 랭킹은 이 브라우저의 연습 기록입니다. 공식 온라인 랭킹·자동 매칭은 계정과 랭킹 서버 연결 전에는 제공되지 않습니다.');
 w.append(note);
 w.append(node('div','arena-footer','세 대학은 현재 대전 능력치가 동일합니다. 기존 3D 캠퍼스 전략전은 상단 “기존 3D 전장”에서 플레이할 수 있습니다.'));
}
function selector(value,kind){
 const label=node('label','',kind==='self'?'내 대학':'상대 대학');
 const select=node('select');select.dataset.school=kind;
 for(const [key,u] of Object.entries(UNIVERSITIES)){
  const opt=node('option','',u.name+' · '+u.campus);opt.value=key;opt.selected=key===value;select.append(opt);
 }
 label.append(select);return label;
}
function renderSetup(){
 const w=shell();const title=setup==='ai'?'PvE · AI 도전':setup==='local'?'PvP · 같은 기기 친선전':'온라인 1대1 · P2P 베타';
 w.append(node('section','arena-hero',undefined));w.lastChild.append(node('div','eyebrow','BATTLE SETUP'),node('h1','',title),info('모든 대학은 같은 병력 수치로 시작합니다. 24라운드 안에 상대 캠퍼스의 체력을 없애거나 더 높은 점수를 얻으세요.'));
 const card=node('section','arena-setup'),fields=node('div','fields');fields.append(selector(schools[0],'self'),selector(schools[1],'opponent'));card.append(fields);
 if(setup==='online'){
  card.append(info('코드를 직접 교환하여 연결하는 친선전입니다. 공개 채팅 서버, 자동 상대 찾기, 공식 레이팅은 아직 제공되지 않습니다.'));
  const row=node('div','mode-chips');row.append(btn('방 만들기 (선공)','host','soft'),btn('방 참가 (후공)','guest','soft'));card.append(row);
  const net=node('section','arena-online');net.append(node('strong','',role==='host'?'방장 연결 코드':role==='guest'?'참가 연결 코드':'연결 방법'));
  const out=node('textarea');out.readOnly=true;out.placeholder='방 만들기 또는 참가를 선택하세요.';out.value=offerCode||answerCode;out.dataset.output='signal';
  net.append(out);
  const copy=btn('내 코드 복사','copy-signal','secondary');copy.disabled=!role;net.append(copy);
  const input=node('textarea');input.dataset.input='signal';input.placeholder=role==='host'?'친구가 보내 준 answer 코드를 여기에 붙여넣으세요.':'방장이 보내 준 offer 코드를 여기에 붙여넣으세요.';
  net.append(input);
  const connect=btn(role==='host'?'상대 응답 연결하기':'참가 응답 코드 만들기',role==='host'?'accept-answer':'make-answer','primary');connect.disabled=!role;net.append(connect);
  const status=node('p','fine',netMessage||'연결 코드를 친구와 다른 채팅 앱으로 교환하세요.');status.dataset.networkStatus='';net.append(status);card.append(net);
 }else{
  const start=btn('대전 시작','start-match','primary');card.append(start);
 }
 w.append(card);
}
function renderRank(){
 const w=shell();
 const hero=node('section','arena-hero');hero.append(node('div','eyebrow','PLAYER PROFILE · LOCAL'),node('h1','','나의 대전 기록'),info('이 브라우저에 저장된 연습 전적입니다. 아래 수치는 공식 글로벌 순위나 실제 대학별 전력 평가가 아닙니다.'));w.append(hero);
 const stats=profileStats(profile),cards=node('section','rank-hero');
 const card=node('article','rank-card'),name=node('label','','표시 이름 (이 기기에만 저장)');
 const inp=node('input');inp.value=profile.name;inp.maxLength=18;inp.dataset.profileName='';name.append(inp);card.append(name,btn('이름 저장','save-name','secondary'));
 card.append(node('p','muted','로컬 연습 등급'),node('div','rank-number',practiceTier(profile.practiceRating)),node('p','',profile.practiceRating+' 연습 점수'));
 cards.append(card);
 const second=node('article','rank-card');
 second.append(node('h3','','전적과 주 사용 대학'));
 second.append(node('div','rank-number',stats.wins+'승 '+stats.losses+'패'));
 second.append(node('p','muted','무승부 '+stats.draws+' · PvE '+stats.played+'판'));
 second.append(node('p','', '주 사용 대학: '+(stats.main?UNIVERSITIES[stats.main].name:'아직 기록 없음')));
 cards.append(second);w.append(cards);
 w.append(node('h2','','대학별 티어리스트 (내 PvE 기록)'));
 w.append(info('각 대학 3경기 이상부터 S/A/B/C 분류합니다. 실제 대학 성능 차이나 전체 이용자의 승률이 아닙니다.'));
 for(const a of localUniversityTiers(profile)){
  const row=node('div','school-row');
  const sym=node('span','symbol','◆');sym.style.color=UNIVERSITIES[a.school].color;
  row.append(sym);
  const detail=node('div');detail.append(node('strong','',UNIVERSITIES[a.school].name),node('p','fine',a.matches+'전 '+a.wins+'승 · '+(a.matches?Math.round(a.winRate*100)+'%':'기록 없음')));row.append(detail);
  row.append(node('span','tier',a.tier));w.append(row);
 }
 w.append(node('div','arena-alert','정식 랭킹에 필요한 것: 회원 로그인, 서버가 판정을 검증하는 온라인 대전, 조작 방지, 시즌별 ELO/MMR, 서버 기반 채팅 및 신고 기능.'));
}
function tileType(x,y){
 if(baseAt(x,y)===0)return 'campus-a';
 if(baseAt(x,y)===1)return 'campus-b';
 if(OUTPOSTS.some(a=>a[0]===x&&a[1]===y))return 'outpost';
 if(y===4||x===4)return 'road';
 return (x+y)%2===0?'urban':'urban alt';
}
function perform(action){
 if(!duel||duel.winner!==null||pendingAi||!legalActions(duel).some(a=>JSON.stringify(a)===JSON.stringify(action)))return;
 if(duel.mode==='online'&&role==='guest'){
  if(duel.turn!==1||!connected)return;
  peer?.send({type:'action',action});selected=null;return;
 }
 if(duel.mode==='online'&&(role!=='host'||duel.turn!==0||!connected))return;
 updateGame(action);
}
function updateGame(action){
 try{duel=applyAction(duel,action);}catch(e){banner(e.message);return;}
 selected=null;
 if(duel.mode==='online'&&role==='host')peer?.send({type:'state',state:duel});
 if(duel.winner!==null)finishMatch();
 render();
 if(duel.mode==='ai'&&duel.winner===null&&duel.turn===1){
  pendingAi=true;setTimeout(()=>{
   pendingAi=false;
   if(!duel||duel.mode!=='ai'||duel.turn!==1||duel.winner!==null)return;
   const action=chooseAiAction(duel);
   updateGame(action);
  },340);
 }
}
function finishMatch(){
 if(lastFinished||!duel||duel.winner===null)return;
 lastFinished=true;
 if(role==='guest'&&duel.mode==='online')return;
 const result=duel.winner==='draw'?'draw':duel.winner===0?'win':'lose';
 profile=recordMatch(profile,{mode:duel.mode,school:duel.schools[0],opponent:duel.schools[1],result});
 saveProfile();
}
function addChat(author,text,system=false){
 if(!text||typeof text!=='string')return;
 chat.push({author:String(author).slice(0,20),text:text.slice(0,160),system});chat=chat.slice(-50);
 const list=root.querySelector('.chat-list');
 if(list){
  const bubble=node('div','chat-bubble'+(system?' system':''));
  if(!system)bubble.append(node('b','',author));
  bubble.append(node('span','',text.slice(0,160)));list.append(bubble);list.scrollTop=list.scrollHeight;
 }
}
function sendChat(){
 const input=root.querySelector('[data-chat-input]'),text=input?.value.trim().slice(0,160);
 if(!text)return;
 if(Date.now()-lastSent<650)return;
 lastSent=Date.now();
 if(duel?.mode==='online'&&!connected){banner('온라인 연결이 끊어졌습니다.');return;}
 const author=duel?.mode==='online'?(role==='host'?profile.name:'참가자'):duel?.mode==='local'?UNIVERSITIES[duel.schools[duel.turn]].short:profile.name;
 addChat(author,text);
 if(duel?.mode==='online')peer?.send({type:'chat',text});
 input.value='';
}
function renderBattle(){
 const w=shell();if(!duel)return;
 const battle=node('section','arena-battle'),field=node('div','battle-field'),side=node('div','battle-sidebar');
 const heading=node('div','battle-heading');
 heading.append(node('h2','','1 vs 1 · '+(duel.mode==='ai'?'AI 연습':duel.mode==='local'?'같은 기기 PvP':'온라인 친선전')),node('small','','라운드 '+Math.min(duel.round,24)+' / 24'));
 field.append(heading);
 const score=node('div','duel-score');
 for(let team=0;team<2;team++){
  if(team===1)score.append(node('strong','muted','VS'));
  const el=node('div','duel-side '+(duel.turn===team?'active ':'')+(team===1?'right':'')),school=UNIVERSITIES[duel.schools[team]];
  const name=node('b','',school.name);name.style.color=school.color;el.append(name,node('small','', '캠퍼스 '+Math.max(0,duel.baseHP[team])+'/6 · 별 '+duel.stars[team]));score.append(el);
 }
 field.append(score);
 const map=node('div','duel-map');map.setAttribute('role','grid');map.setAttribute('aria-label','9×9 대학 대전 지도');
 const actions=legalActions(duel),ownerTurn=duel.mode!=='online'||(connected&&(role==='host'?duel.turn===0:duel.turn===1));
 const allowed=ownerTurn&&!pendingAi&&!(duel.mode==='ai'&&duel.turn===1)&&duel.winner===null;
 for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
  const el=node('button','duel-tile '+tileType(x,y));el.type='button';el.dataset.x=x;el.dataset.y=y;el.dataset.act='square';
  const u=duel.units.find(q=>q.x===x&&q.y===y),home=baseAt(x,y),outpost=OUTPOSTS.some(o=>o[0]===x&&o[1]===y);
  const moves=actions.filter(a=>a.unit===selected&&((a.type==='move'&&a.x===x&&a.y===y)||(a.type==='attack'&&u&&a.target===u.id)||(a.type==='base'&&home===1-duel.turn)));
  if(moves.length&&allowed)el.classList.add(home>=0||u?'target':'legal');
  if(u&&u.id===selected)el.classList.add('selected');
  if(u){const glyph=node('span','tile-unit',u.kind==='guard'?'♜':'♞');glyph.style.color=UNIVERSITIES[duel.schools[u.team]].color;el.append(glyph,node('span','tile-hp','♥'+u.hp));}
  else if(home>=0)el.append(node('span','tile-base','◆'));
  if(outpost){const who=duel.owner[pos(x,y)];const mark=node('span','tile-mark','★');mark.style.color=who===undefined?'#f7d991':UNIVERSITIES[duel.schools[who]].color;el.append(mark);}
  el.setAttribute('aria-label',(u?UNIVERSITIES[duel.schools[u.team]].short+' '+u.kind:'빈 칸')+' '+(x+1)+','+(y+1));
  if(!allowed)el.disabled=true;
  map.append(el);
 }
 field.append(map);
 const toolbar=node('div','duel-toolbar');for(const [kind,label] of [['guard','♜ 수비대 · 3별'],['scout','♞ 정찰대 · 2별']]){
  const action={type:'recruit',kind},b=btn(label,'recruit-'+kind,'secondary');b.disabled=!allowed||!actions.some(a=>JSON.stringify(a)===JSON.stringify(action));toolbar.append(b);
 }
 const pass=btn('턴 넘기기','pass','soft');pass.disabled=!allowed;toolbar.append(pass);field.append(toolbar);
 const how=info(selected?'강조된 칸을 눌러 이동하거나 빨간 표식의 상대를 공격하세요.':ownerTurn?'부대를 선택하거나 별을 사용해 새 부대를 모집하세요.':'상대 차례입니다.');
 field.append(how);
 if(duel.winner!==null){
  const results=node('div','arena-results'),win=duel.winner==='draw'?'무승부':duel.winner===0?UNIVERSITIES[duel.schools[0]].name+' 승리':UNIVERSITIES[duel.schools[1]].name+' 승리';
  results.append(node('strong','',win),info(duel.mode==='ai'?'연습 점수에 반영됐습니다.':'친선전 결과는 공식 랭킹에 반영되지 않습니다.'),btn(duel.mode==='online'?'새 방 연결하기':'다시 대전하기','rematch','primary'));field.append(results);
 }
 side.append(node('div','side-panel',undefined));
 side.lastChild.append(node('h3','','대전 정보'),info(duel.mode==='online'?(connected?'상대와 P2P 연결됨':'상대 연결 대기 또는 끊김'):duel.mode==='local'?'1P · 2P 번갈아 플레이':'상대는 AI입니다.'));
 const logs=node('div','battle-log');for(const text of duel.log.slice(0,5))logs.append(node('div','',text));side.lastChild.append(logs);
 const cp=node('section','side-panel chat');cp.append(node('h3','','인게임 채팅'));
 const note=info(duel.mode==='online'?'이 메시지는 상대 브라우저로 직접 전송됩니다.':duel.mode==='local'?'같은 기기 친선 대화 기록입니다.':'연습 중 개인 메모입니다. AI가 답하지는 않습니다.');cp.append(note);
 const list=node('div','chat-list');list.setAttribute('aria-live','polite');
 for(const m of chat){
  const bubble=node('div','chat-bubble'+(m.system?' system':''));if(!m.system)bubble.append(node('b','',m.author));bubble.append(node('span','',m.text));list.append(bubble);
 }
 cp.append(list);
 const form=node('form','chat-form');form.dataset.chatForm='';const input=node('input');input.maxLength=160;input.placeholder='메시지 입력 (160자)';input.dataset.chatInput='';input.disabled=duel.mode==='online'&&!connected||muted;const send=node('button','primary','전송');send.type='submit';send.disabled=input.disabled;form.append(input,send);cp.append(form);
 cp.append(btn(muted?'채팅 다시 표시':'채팅 숨기기','toggle-chat','soft'));
 if(muted)cp.querySelector('.chat-list').hidden=true;
 side.append(cp);battle.append(field,side);w.append(battle);
 w.append(btn('대전 종료 · 메뉴로','end-match','soft'));
}
function render(){
 if(!root||root.hidden)return;
 if(page==='rank')renderRank();
 else if(page==='setup')renderSetup();
 else if(page==='battle')renderBattle();
 else renderHome();
}
function begin(mode){
 if(peer&&mode!=='online'){peer.close();peer=null;connected=false;role=null;}
 duel=initialDuel(mode,schools);selected=null;lastFinished=false;chat=[];
 addChat('시스템','대전이 시작되었습니다.',true);
 page='battle';render();
}
function networkEvent(evt){
 if(evt.type==='open'){
  connected=true;
  if(role==='host'&&duel)peer.send({type:'state',state:duel});
  banner('상대와 연결됐습니다.');if(page==='setup')page='battle';render();
 }else if(evt.type==='message'){
  const m=evt.data;
  if(m.type==='state'&&role==='guest'&&m.state?.mode==='online'&&Array.isArray(m.state.units)&&m.state.version===1){
   duel=m.state;selected=null;if(duel.winner!==null)finishMatch();render();
  }
  if(m.type==='action'&&role==='host'&&duel?.turn===1&&duel?.winner===null){
   if(legalActions(duel).some(a=>JSON.stringify(a)===JSON.stringify(m.action)))updateGame(m.action);
  }
  if(m.type==='chat'&&typeof m.text==='string'&&m.text.trim()&&m.text.length<=160)
   addChat(role==='host'?'참가자':'방장',m.text.trim());
 }else if(evt.type==='status'||evt.type==='close'){
  connected=false;banner('상대 연결이 끊어졌습니다. 다시 대전을 시작하세요.');render();
 }
}
root.addEventListener('click',async e=>{
 const el=e.target.closest('[data-act]');if(!el)return;
 const act=el.dataset.act;
 if(act==='home'){page='home';render();return;}
 if(act==='rank'){page='rank';render();return;}
 if(act==='classic'){
  root.hidden=true;
  try{if(!classicLoaded){classicLoaded=true;await import('./game.js?v=geometry-v21');}
   let b=document.getElementById('returnArena');
   if(!b){b=node('button','', '← 대전 메뉴');b.id='returnArena';b.style.cssText='position:fixed;z-index:450;top:75px;left:12px;padding:10px;border:1px solid #7ccaaa;border-radius:9px;background:#124b3e;color:white;cursor:pointer';document.body.append(b);b.onclick=()=>{root.hidden=false;b.hidden=true;render();};}
   b.hidden=false;
  }catch(err){root.hidden=false;classicLoaded=false;banner('기존 전장 로딩 실패: '+err.message);render();}
  return;
 }
 if(['ai-setup','local-setup','online-setup'].includes(act)){
  setup=act.split('-')[0]==='local'?'local':act.split('-')[0]==='online'?'online':'ai';page='setup';
  if(peer){peer.close();peer=null;}role=null;connected=false;offerCode='';answerCode='';netMessage='';render();return;
 }
 if(act==='start-match'){begin(setup);return;}
 if(act==='save-name'){
  const input=root.querySelector('[data-profile-name]');profile.name=String(input?.value||'지휘관').trim().slice(0,18)||'지휘관';saveProfile();render();return;
 }
 if(act==='end-match'){if(peer){peer.close();peer=null;}role=null;connected=false;page='home';render();return;}
 if(act==='rematch'){if(duel?.mode==='online'){if(peer)peer.close();peer=null;role=null;connected=false;setup='online';page='setup';render();}else begin(duel?.mode||'ai');return;}
 if(act==='pass'){perform({type:'pass'});return;}
 if(act==='recruit-guard'||act==='recruit-scout'){perform({type:'recruit',kind:act.slice(8)});return;}
 if(act==='toggle-chat'){muted=!muted;render();return;}
 if(act==='square'){
  const x=Number(el.dataset.x),y=Number(el.dataset.y),u=duel?.units.find(z=>z.x===x&&z.y===y);
  const available=duel?legalActions(duel):[],myTurn=duel?.mode!=='online'||connected&&(role==='host'?duel.turn===0:duel.turn===1);
  if(!myTurn)return;
  const move=available.find(a=>a.unit===selected&&a.type==='move'&&a.x===x&&a.y===y);
  const attack=available.find(a=>a.unit===selected&&a.type==='attack'&&u&&a.target===u.id);
  const base=available.find(a=>a.unit===selected&&a.type==='base'&&baseAt(x,y)===1-duel.turn);
  if(move||attack||base){perform(move||attack||base);return;}
  selected=u&&u.team===duel.turn?u.id:null;render();return;
 }
 if(act==='copy-signal'){
  const code=offerCode||answerCode;if(!code)return;
  try{await navigator.clipboard.writeText(code);banner('연결 코드를 복사했습니다.');}
  catch{banner('자동 복사가 불가능합니다. 위 코드를 직접 선택해 복사하세요.');}
  return;
 }
 if(act==='host'||act==='guest'){
  if(peer)peer.close();try{peer=createDuelPeer(networkEvent);}catch(error){banner(error.message);render();return;}role=act;connected=false;offerCode='';answerCode='';
  if(role==='host'){begin('online');page='setup';try{offerCode=await peer.offer();banner('생성된 offer 코드를 친구에게 전달하세요.');}catch(err){banner(err.message);}}
  else banner('방장에게 받은 offer 코드를 아래에 붙여넣으세요.');
  render();return;
 }
 if(act==='make-answer'||act==='accept-answer'){
  const code=root.querySelector('[data-input=signal]')?.value;
  try{
   if(act==='make-answer'&&role==='guest'){if(!duel)begin('online');page='setup';answerCode=await peer.answer(code);banner('생성된 answer 코드를 방장에게 전송하세요.');}
   if(act==='accept-answer'&&role==='host'){await peer.accept(code);banner('연결을 확인 중입니다.');}
  }catch(err){banner(err.message);}
  render();return;
 }
});
root.addEventListener('change',e=>{
 const v=e.target;
 if(v.matches('[data-school]')){schools[v.dataset.school==='self'?0:1]=v.value;}
});
root.addEventListener('submit',e=>{if(e.target.matches('[data-chat-form]')){e.preventDefault();sendChat();}});
window.addEventListener('pagehide',()=>{peer?.close();});
render();
