// Campus Frontier v4: one-faction-at-a-time strategy rules.
// Deliberately isolated from the legacy simultaneous-turn simulation.
// A player action commits immediately; the other two factions act strictly
// after the human ends their turn. The legacy resolver/save is left intact.
import {initialState,reachable,targets,stats,passable,terrain,distance,GATES,ENEMY_GATES,RIVAL_GATES,TURN_LIMIT,key,PRICE,unitCap,STATS} from './simulation.js?v=18';
import {rememberExploration} from './vision.js?v=42';
export const TEAMS=['ally','enemy','rival'];
export const UNIVERSITY={
 ally:{label:'성균관대학교',campus:'인문사회과학캠퍼스',base:{x:3,z:3},gates:GATES,bank:'gold',hp:'homeHP'},
 enemy:{label:'고려대학교',campus:'안암캠퍼스',base:{x:17,z:17},gates:ENEMY_GATES,bank:'enemyGold',hp:'enemyHP'},
 rival:{label:'연세대학교',campus:'신촌캠퍼스',base:{x:17,z:3},gates:RIVAL_GATES,bank:'rivalGold',hp:'rivalHP'}
};
export const BRANCHES={economy:{name:'경제',steps:['채집','캠퍼스 상업','지역 교역']},
 military:{name:'군사',steps:['전술 훈련','정예 보병','공성술']},
 defense:{name:'방어',steps:['수비 진형','성벽 보강','대학 방패']},
 science:{name:'학문',steps:['기초 학문','지도 탐사','고급 연구']}};
const mod=(n,m)=>((n%m)+m)%m;
const rng=s=>{s.randomState=(Math.imul(s.randomState||1,1664525)+1013904223)>>>0;return s.randomState/4294967296;};
const alive=(s,t)=>s[UNIVERSITY[t].hp]>0;
const bank=(s,t)=>s[UNIVERSITY[t].bank];
const spend=(s,t,c)=>{if(bank(s,t)<c)return false;s[UNIVERSITY[t].bank]-=c;return true;};
const changed=(s)=>{rememberExploration(s);return s;};
export function randomResources(seed=1){
 const out=[],candidates=[];
 // Seven fixed objectives are kept as readable anchors, while bonuses are
 // seeded anew each campaign and never occupy units or campus entrances.
 for(let z=1;z<20;z++)for(let x=1;x<20;x++)
  if(passable(x,z)&&terrain(x,z)!=='resource'&&!(x<=7&&z<=7)&&!(x>=13&&z<=7)&&!(x>=13&&z>=13))
   candidates.push({x,z});
 let v=(seed>>>0)||1;
 for(let i=candidates.length-1;i>0;i--){v=(Math.imul(v,1664525)+1013904223)>>>0;const j=v%(i+1);[candidates[i],candidates[j]]=[candidates[j],candidates[i]];}
 for(let i=0;i<Math.min(10,candidates.length);i++)out.push({...candidates[i],amount:i%3===0?5:3,claimed:false});
 return out;
}
export function createSequentialGame({playerTeam='ally',seed=2026}={}){
 if(!TEAMS.includes(playerTeam))throw Error('알 수 없는 대학입니다.');
 const s=initialState('standard');
 s.version=14;s.ruleset='sequential';s.playerTeam=playerTeam;s.phaseTeam=playerTeam;
 s.acted=[];s.cityLevels={};s.technologies=Object.fromEntries(TEAMS.map(t=>[t,{economy:0,military:0,defense:0,science:0}]));
 s.seed=seed>>>0;s.randomState=s.seed||1;s.bonusResources=randomResources(seed);
 s.lastAction=null;s.turn=1;
 // Equal start reserves and identical starting units on all 3 campuses.
 s.gold=s.enemyGold=s.rivalGold=10;
 return changed(s);
}
export const level=(s,t,branch)=>s.technologies?.[t]?.[branch]??0;
export function technologyCost(s,t,branch){
 if(!BRANCHES[branch])return null;
 const l=level(s,t,branch);return l>=3?null:Math.max(3,5+l*6-(t==='ally'?2:0)-level(s,t,'science'));
}
export function cityCost(s,k){const l=s.cityLevels?.[k]??1;return l>=3?null:5+(l-1)*5;}
export function cityIncome(s,t){
 return 5+Object.entries(s.points).reduce((n,[k,team])=>team===t&&(s.pointReady?.[k]??0)<=s.turn?n+2*(s.cityLevels[k]??1):n,0)
   +2*level(s,t,'economy')+(t==='rival'?Object.values(s.points).filter(v=>v==='rival').length:0);
}
export function canAct(s,team,id){
 if(s.result)return '게임이 종료되었습니다.';
 if(s.phaseTeam!==team)return '해당 대학 차례가 아닙니다.';
 const u=s.units.find(v=>v.id===id&&v.team===team);
 if(!u)return '조작할 수 없는 부대입니다.';
 if(s.acted.includes(id))return '이 부대는 이미 행동했습니다.';
 return null;
}
function clearEnemy(s,team,events){
 if(alive(s,team))return;
 s.units=s.units.filter(u=>u.team!==team);
 for(const k of Object.keys(s.points))if(s.points[k]===team){s.points[k]=null;s.cityLevels[k]=1;delete s.pointReady[k];}
 events.push({type:'elimination',team,text:UNIVERSITY[team].label+' 본진 함락'});
}
function finishGame(s,events){
 for(const t of TEAMS)if(s[UNIVERSITY[t].hp]<=0&&s.units.some(u=>u.team===t))clearEnemy(s,t,events);
 const living=TEAMS.filter(t=>alive(s,t));
 if(living.length===0){
  s.winner=null;s.result='draw';s.victoryMode='base';
 }else if(!alive(s,s.playerTeam)){
  s.winner=living.length===1?living[0]:null;s.result='defeat';s.victoryMode='base';
 }else if(living.length===1){
  s.winner=living[0];s.result='victory';s.victoryMode='base';
 }else if(s.turn>TURN_LIMIT){
  const rank=TEAMS.filter(t=>alive(s,t)).map(t=>({t,score:Object.entries(s.points).reduce((sum,[k,o])=>sum+(o===t?(k==='10,10'?5:3)*(s.cityLevels[k]??1):0),0)+s[UNIVERSITY[t].hp]+Object.values(s.technologies[t]).reduce((a,b)=>a+b,0)*2}));
  rank.sort((a,b)=>b.score-a.score);
  s.winner=rank.length>1&&rank[0].score===rank[1].score?null:rank[0]?.t??null;
  s.result=s.winner===s.playerTeam?'victory':s.winner?'defeat':'draw';s.victoryMode='score';
  events.push({type:'score',text:'30라운드 점수로 승부 결정'});
 }
}
function action(s,team,order){
 const events=[],current=s;const id=order.id;
 if(order.type==='move'){
  const error=canAct(s,team,id);if(error)return {error};
  const u=s.units.find(v=>v.id===id);
  if(!reachable(s,u).some(v=>v.x===order.x&&v.z===order.z))return {error:'이동할 수 없는 칸입니다.'};
  const from={x:u.x,z:u.z};u.x=order.x;u.z=order.z;s.acted.push(id);
  events.push({type:'move',id,from,to:{x:u.x,z:u.z},team});
  const k=key(u.x,u.z);
  if(Object.hasOwn(s.points,k)&&s.points[k]!==team){
   const previous=s.points[k];s.points[k]=team;s.cityLevels[k]=previous?Math.max(1,(s.cityLevels[k]??1)-1):1;
   s.pointReady[k]=s.turn+(previous?1:0);
   events.push({type:'capture',team,x:u.x,z:u.z});
  }
  const resource=s.bonusResources.find(p=>p.x===u.x&&p.z===u.z&&!p.claimed);
  if(resource){resource.claimed=true;s[UNIVERSITY[team].bank]+=resource.amount;events.push({type:'bonus',team,amount:resource.amount,x:u.x,z:u.z});}
 }else if(order.type==='attack'){
  const error=canAct(s,team,id);if(error)return {error};
  const u=s.units.find(v=>v.id===id),legal=targets(s,u);
  const t=legal.find(v=>v.kind===order.target?.kind&&(v.id===order.target.id||v.kind==='base'&&v.team===order.target.team));
  if(!t)return {error:'공격 범위에 적이 없습니다.'};
  s.acted.push(id);
  const bonus=level(s,team,'military'),attacker={kind:'unit',id};
  if(t.kind==='unit'){
   const victim=s.units.find(v=>v.id===t.id);
   const koreaFormation=victim.team==='enemy'&&s.units.some(v=>v.team==='enemy'&&v.id!==victim.id&&distance(v,victim)===1)?1:0;
   const defense=stats(victim).defense+Math.floor(level(s,victim.team,'defense')/2)+koreaFormation;
   const amount=Math.max(1,stats(u).attack+bonus-defense);
   victim.hp-=amount;events.push({type:'attack',from:attacker,target:t,amount,team});
   if(victim.hp<=0){s.units=s.units.filter(v=>v.id!==victim.id);events.push({type:'destroy',id:victim.id,team:victim.team});}
  }else if(t.kind==='base'){
   const amount=Math.max(1,stats(u).attack+bonus-(level(s,t.team,'defense')>=2?1:0));
   s[UNIVERSITY[t.team].hp]=Math.max(0,s[UNIVERSITY[t.team].hp]-amount);
   events.push({type:'attack',from:attacker,target:t,amount,team});
  }else return {error:'지원하지 않는 공격 대상입니다.'};
 }else if(order.type==='recruit'){
  if(s.phaseTeam!==team||s.result)return {error:'모집할 수 없는 차례입니다.'};
  const kind=order.kind??'infantry',cost={infantry:5,scout:4,cavalry:9,siege:10}[kind];
  if(!cost)return {error:'알 수 없는 병과입니다.'};
  if((kind==='cavalry'&&level(s,team,'military')<2)||(kind==='siege'&&level(s,team,'military')<3))
   return {error:'군사 기술을 먼저 발전시키세요.'};
  if(s.units.filter(u=>u.team===team).length>=6+Object.keys(s.points).filter(k=>s.points[k]===team).length)
   return {error:'부대 상한에 도달했습니다.'};
  const gate=UNIVERSITY[team].gates.find(g=>passable(g.x,g.z)&&!s.units.some(u=>u.x===g.x&&u.z===g.z)&&!s.structures.some(v=>v.x===g.x&&v.z===g.z));
  if(!gate)return {error:'출전할 빈 공간이 없습니다.'};
  if(!spend(s,team,cost))return {error:'OP가 부족합니다.'};
  const number=s.nextId++;const prefix=team==='ally'?'a':team==='enemy'?'e':'r';
  const u={id:prefix+number,team,kind,...gate,hp:STATS[kind].hp};s.units.push(u);s.acted.push(u.id);
  events.push({type:'recruit',team,id:u.id,x:gate.x,z:gate.z});
 }else if(order.type==='upgrade'){
  if(s.phaseTeam!==team||s.result)return {error:'거점을 성장시킬 수 없습니다.'};
  const k=order.site,cost=cityCost(s,k);
  if(s.points[k]!==team)return {error:'자신의 거점이 아닙니다.'};
  if((s.pointReady[k]??0)>s.turn)return {error:'거점이 아직 안정화 중입니다.'};
  if(cost===null)return {error:'이미 최고 단계입니다.'};
  if(!spend(s,team,cost))return {error:'OP가 부족합니다.'};
  s.cityLevels[k]=(s.cityLevels[k]??1)+1;events.push({type:'upgrade',site:k,level:s.cityLevels[k],team});
 }else if(order.type==='research'){
  if(s.phaseTeam!==team||s.result)return {error:'기술을 선택할 수 없습니다.'};
  const branch=order.branch,cost=technologyCost(s,team,branch);
  if(cost===null)return {error:'이미 연구를 완료했습니다.'};
  if(!spend(s,team,cost))return {error:'OP가 부족합니다.'};
  s.technologies[team][branch]++;events.push({type:'research',team,branch,level:level(s,team,branch)});
 }else if(order.type==='guard'){
  const error=canAct(s,team,id);if(error)return {error};
  const u=s.units.find(v=>v.id===id);u.hp=Math.min(stats(u).hp,u.hp+1+level(s,team,'defense'));
  s.acted.push(id);events.push({type:'guard',team,id});
 }else return {error:'알 수 없는 행동입니다.'};
 finishGame(s,events);s.lastAction=order.type;changed(s);
 return {state:current,events};
}
export function applySequentialAction(input,order,team=input.playerTeam){
 const s=structuredClone(input);
 return action(s,team,order);
}
function aiPhase(s,team,events){
 if(!alive(s,team)||s.result)return;
 s.phaseTeam=team;s.acted=[];
 // Each AI sees the board as of its own phase, not a simultaneous snapshot.
 const roster=s.units.filter(v=>v.team===team).map(u=>u.id);
 for(const id of roster){
  if(s.result)break;const u=s.units.find(v=>v.id===id);if(!u)continue;
  const enemies=targets(s,u);
  if(enemies.length){const a=action(s,team,{type:'attack',id,target:enemies[0]});if(!a.error){events.push(...a.events);continue;}}
  const points=Object.keys(s.points).filter(k=>s.points[k]!==team).map(k=>{const [x,z]=k.split(',').map(Number);return {x,z};});
  points.sort((a,b)=>distance(a,u)-distance(b,u)||a.x-b.x||a.z-b.z);
  const goal=points[0]??UNIVERSITY[s.playerTeam].base;
  const moves=reachable(s,u).sort((a,b)=>distance(a,goal)-distance(b,goal)||a.x-b.x||a.z-b.z);
  if(moves.length&&distance(moves[0],goal)<distance(u,goal)){const a=action(s,team,{type:'move',id,x:moves[0].x,z:moves[0].z});if(!a.error)events.push(...a.events);}
 }
 if(s.result)return;
 const owned=Object.keys(s.points).filter(k=>s.points[k]===team);
 const canGrow=owned.find(k=>cityCost(s,k)!==null&&bank(s,team)>=cityCost(s,k)&&(s.pointReady[k]??0)<=s.turn);
 if(canGrow&&rng(s)<.65){const a=action(s,team,{type:'upgrade',site:canGrow});if(!a.error)events.push(...a.events);}
 const tech=Object.keys(BRANCHES).find(b=>technologyCost(s,team,b)!==null&&bank(s,team)>=technologyCost(s,team,b)+4);
 if(tech&&rng(s)<.55){const a=action(s,team,{type:'research',branch:tech});if(!a.error)events.push(...a.events);}
 if(bank(s,team)>=5){const a=action(s,team,{type:'recruit',kind:rng(s)<.3?'scout':'infantry'});if(!a.error)events.push(...a.events);}
}
export function endSequentialRound(input){
 if(input.result)return {error:'게임이 종료되었습니다.'};
 const s=structuredClone(input);
 if(s.phaseTeam!==s.playerTeam)return {error:'플레이어 차례가 아닙니다.'};
 const events=[],snapshots=[];
 const i=TEAMS.indexOf(s.playerTeam),order=[TEAMS[(i+1)%3],TEAMS[(i+2)%3]];
 for(const team of order){
  const before=structuredClone(s);
  aiPhase(s,team,events);
  snapshots.push({team,before,state:structuredClone(s)});
  if(s.result)break;
 }
 s.turn++;s.phaseTeam=s.playerTeam;s.acted=[];
 if(!s.result){for(const team of TEAMS)if(alive(s,team)){const income=cityIncome(s,team);s[UNIVERSITY[team].bank]+=income;events.push({type:'income',team,amount:income});}}
 finishGame(s,events);changed(s);
 return {state:s,events,phases:snapshots};
}
