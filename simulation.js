import {newResearch,hasTech,growthIncome,reservedProjects,canResearch,canProject,advanceResearch,finishProjects,finishLabs,finishGrand,aiGrowth,PROJECTS,DEPOSITS} from './growth.js?v=091';
// Deterministic public-vision practice rules. Rendering never changes outcomes.
export const SIZE=21, TURN_LIMIT=30, CENTRAL_POINT='10,10';
export const POINT_KEYS=['8,6','6,9','6,3','13,14','16,12','12,17',CENTRAL_POINT];
export const PRICE={wall:3,tower:7,recruit:5,scout:4,siege:9,cavalry:8,road:1};
export const CAMPUS={x:2,z:2,size:3},HOME={x:3,z:3},ENEMY_BASE={x:17,z:17};
export const GATES=[{x:3,z:1},{x:5,z:3},{x:3,z:5},{x:1,z:3}];
export const ENEMY_GATES=[{x:17,z:15},{x:19,z:17},{x:17,z:19},{x:15,z:17}];
export const RIVAL_BASE={x:17,z:3};
export const RIVAL_GATES=[{x:17,z:1},{x:19,z:3},{x:17,z:5},{x:15,z:3}];
export const isRivalCampus=(x,z)=>x>=16&&x<=18&&z>=2&&z<=4;
export const isEnemyCampus=(x,z)=>x>=16&&x<=18&&z>=16&&z<=18;
export const STATS={infantry:{name:'보병',hp:10,attack:4,defense:2,move:1},scout:{name:'정찰대',hp:7,attack:2,defense:1,move:2,range:1},siege:{name:'공성대',hp:8,attack:3,defense:1,move:1,range:2},cavalry:{name:'기동대',hp:9,attack:4,defense:1,move:2,range:1}};
export const key=(x,z)=>`${x},${z}`;
export const distance=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.z-b.z);
export const isCampus=(x,z)=>x>=2&&x<=4&&z>=2&&z<=4;
export const stats=u=>STATS[u.kind??'infantry'];
export function terrain(x,z){
 if(x<0||z<0||x>=SIZE||z>=SIZE)return 'void';
 if(isCampus(x,z))return 'campus';
 if(isEnemyCampus(x,z))return 'enemy-base';
 if(isRivalCampus(x,z))return 'rival-base';
 if(POINT_KEYS.includes(key(x,z)))return 'resource';
 if(x===10&&z>=1&&z<=10&&z!==5&&z!==9)return 'water';
 if((z===0&&x<7)||(x>=11&&x<=13&&z===3))return 'hill';
 if((x===0&&z>5)||(z===14&&x<5)||(x===7&&z>=3&&z<=5))return 'forest';
 return 'grass';
}
export const passable=(x,z)=>Number.isInteger(x)&&Number.isInteger(z)&&['grass','resource','forest','hill'].includes(terrain(x,z));
export const emptyPlan=()=>({orders:{},builds:[],projects:[]});
export function initialState(mode='practice'){const state={version:8,turn:1,gold:10,enemyGold:10,homeHP:30,enemyHP:30,result:null,
 units:[{id:'a1',team:'ally',kind:'infantry',x:5,z:3,hp:10},{id:'a2',team:'ally',kind:'scout',x:3,z:5,hp:7},{id:'e1',team:'enemy',kind:'infantry',x:15,z:17,hp:10},{id:'e2',team:'enemy',kind:'scout',x:17,z:15,hp:7}],
 research:{ally:newResearch(),enemy:newResearch()},specialties:{},developed:{},labs:{},labConstruction:{},grandConstruction:null,grandCompleted:false,wideSite:null,centralPoint:CENTRAL_POINT,roads:[],structures:[],pendingRecruits:[],points:Object.fromEntries(POINT_KEYS.map(k=>[k,null])),pointReady:{},nextId:3,victoryMode:null};
 if(mode==='standard'){
   state.version=9;state.gameMode='standard';state.rivalHP=30;state.rivalGold=10;
   state.research.rival=newResearch();state.capturePoints={ally:0,enemy:0,rival:0};
   state.units.push({id:'r1',team:'rival',kind:'infantry',x:15,z:3,hp:10},{id:'r2',team:'rival',kind:'scout',x:17,z:5,hp:7});
 }
 return state;
}
export const availableGold=(s,p)=>s.gold-p.builds.reduce((n,b)=>n+PRICE[b.type],0)-reservedProjects(p);
export const unitCap=(s,team='ally')=>Math.min(10,6+Object.entries(s.points).filter(([k,v])=>v===team&&(s.pointReady[k]??0)<=s.turn).length);
export const income=(s,team='ally')=>5+growthIncome(s,team)+Object.entries(s.points).filter(([k,v])=>v===team&&(s.pointReady[k]??0)<=s.turn).length*2;
export function victoryPoints(s,team='ally'){
 const territory=Object.entries(s.points).reduce((total,[k,owner])=>owner===team?total+(k===CENTRAL_POINT?5:3):total,0);
 const research=2*(s.research[team]?.done?.length??0);
 const alive=(team==='ally'?s.homeHP:team==='enemy'?s.enemyHP:s.rivalHP)>0?5:0;
 const grand=team==='ally'&&s.grandCompleted?10:0;
 return territory+research+alive+grand+(s.capturePoints?.[team]??0);
}
export function ownTerritory(s,u){return u.team==='ally'&&u.x>=1&&u.x<=5&&u.z>=1&&u.z<=5||u.team==='enemy'&&distance(u,ENEMY_BASE)<=2||u.team==='rival'&&distance(u,RIVAL_BASE)<=2||Object.entries(s.points).some(([k,t])=>{const [x,z]=k.split(',').map(Number);return t===u.team&&distance(u,{x,z})<=(s.wideSite===k?2:1);});}
const neighbors=p=>[[1,0],[0,1],[-1,0],[0,-1]].map(([x,z])=>({x:p.x+x,z:p.z+z}));
export function reachable(s,u,plan=emptyPlan()){
 const out=new Map(),queue=[{x:u.x,z:u.z,cost:0}];
 while(queue.length){const p=queue.shift();for(const n of neighbors(p)){
  if(!passable(n.x,n.z)||s.structures.some(b=>b.type!=='road'&&b.x===n.x&&b.z===n.z)||plan.builds.some(b=>b.type!=='road'&&b.x===n.x&&b.z===n.z)||s.units.some(v=>v.id!==u.id&&v.x===n.x&&v.z===n.z))continue;
  const cost=p.cost+((s.roads??[]).includes(key(n.x,n.z))?1:['forest','hill'].includes(terrain(n.x,n.z))?2:1),k=key(n.x,n.z);
  if(distance(n,u)===0||cost>stats(u).move&&!(p.cost===0&&stats(u).move===1)||out.has(k)&&out.get(k).cost<=cost)continue;
  const node={...n,cost};out.set(k,node);if(cost<stats(u).move)queue.push(node);
 }}return [...out.values()];
}
export function canMove(s,u,x,z,p=emptyPlan()){if(!u)return '부대를 먼저 선택하세요.';return reachable(s,u,p).some(n=>n.x===x&&n.z===z)?null:'이동 범위를 벗어나거나 경로가 막혔습니다.';}
export function canBuild(s,p,type,x,z){
 if(s.result)return '게임이 종료되었습니다.';
 if(!Object.hasOwn(PRICE,type))return '알 수 없는 생산입니다.';
 if(type==='wall'&&!hasTech(s,'ally','defense'))return '방어 건축 연구가 필요합니다.';
 if(type==='tower'&&!hasTech(s,'ally','towers'))return '방어 체계 연구가 필요합니다.';
 if(type==='siege'&&!hasTech(s,'ally','siege'))return '공성 기술 연구가 필요합니다.';
 if(type==='cavalry'&&!hasTech(s,'ally','mobility'))return '기동 전술 연구가 필요합니다.';
 if(type==='road'&&!hasTech(s,'ally','roads'))return '도로망 연구가 필요합니다.';
 if(type==='road'){if((s.roads??[]).includes(key(x,z))||p.builds.some(b=>b.x===x&&b.z===z))return '이미 도로 또는 건설 예약이 있는 타일입니다.';if(!passable(x,z))return '도로는 이동 가능한 자기 영토에만 건설할 수 있습니다.';if(!ownTerritory(s,{team:'ally',x,z}))return '자기 영토에만 도로를 건설할 수 있습니다.';if(availableGold(s,p)<PRICE.road)return '운영력이 부족합니다.';return null;}
 if(DEPOSITS.some(d=>d.x===x&&d.z===z))return '개발 자원 타일에는 방어 시설을 설치할 수 없습니다.';
 if((p.projects??[]).some(o=>o.site==='home'))return '캠퍼스에서 자원 개발을 예약했습니다.';
 if(s.structures.some(b=>b.ready>s.turn)||(s.pendingRecruits??[]).length||s.labConstruction?.home||s.grandConstruction)return '캠퍼스 작업 슬롯에서 생산이 진행 중입니다.';
 if(p.builds.length)return '캠퍼스 작업 슬롯은 한 턴에 하나입니다.';
 if(!passable(x,z)||terrain(x,z)==='resource')return '빈 일반 타일을 선택하세요.';
 if(s.units.some(u=>u.x===x&&u.z===z)||s.structures.some(b=>b.x===x&&b.z===z))return '이미 점유된 타일입니다.';
 const gate=GATES.some(g=>g.x===x&&g.z===z),recruit=['recruit','scout','siege','cavalry'].includes(type);
 if(recruit){if(!gate)return '모집은 본진의 네 출전 타일에서만 가능합니다.';if(s.units.filter(u=>u.team==='ally').length+(s.pendingRecruits??[]).length>=unitCap(s))return '부대 상한에 도달했습니다.';}
 else {if(gate)return '본진 출전 타일에는 방어 시설을 설치할 수 없습니다.';if(x<1||x>5||z<1||z>5)return '캠퍼스 초기 영토 안에 건설하세요.';if(type==='tower'&&s.structures.filter(b=>b.type==='tower').length>=2)return '캠퍼스 방어탑은 최대 2개입니다.';}
 if(availableGold(s,p)<PRICE[type])return '사용 가능한 운영력이 부족합니다.';
 return null;
}
export function targets(s,u){
 const range=stats(u).range??1;const list=s.units.filter(v=>v.team!==u.team&&distance(u,v)<=range).map(v=>({kind:'unit',id:v.id}));
 if(u.team!=='ally')list.push(...s.structures.filter(v=>distance(u,v)<=range).map(v=>({kind:'structure',id:v.id})));
 if(u.team!=='ally'&&GATES.some(g=>distance(u,g)<=range-1))list.push({kind:'base',team:'ally'});
 if(u.team!=='enemy'&&ENEMY_GATES.some(g=>distance(u,g)<=range-1))list.push({kind:'base',team:'enemy'});
 if(s.rivalHP!==undefined&&u.team!=='rival'&&RIVAL_GATES.some(g=>distance(u,g)<=range-1))list.push({kind:'base',team:'rival'});
 return list;
}
const sameTarget=(a,b)=>a&&b&&a.kind===b.kind&&a.id===b.id&&a.team===b.team;
export function canOrder(s,u,o,p=emptyPlan()){
 if(!u)return '부대를 선택하세요.';
 if(o.type==='move')return canMove(s,u,o.x,o.z,p);
 if(o.type==='attack')return targets(s,u).some(t=>sameTarget(t,o.target))?null:'인접한 적을 선택하세요. 본진은 접점에서 공격합니다.';
 if(o.type==='capture')return (u.kind==='siege'?'공성대는 거점을 점령할 수 없습니다.':null)??(Object.hasOwn(s.points,key(u.x,u.z))&&s.points[key(u.x,u.z)]!==u.team?null:'점령할 거점 위에서 명령하세요. 이동과 같은 턴에는 점령할 수 없습니다.');
 if(o.type==='heal')return ownTerritory(s,u)&&u.hp<stats(u).hp?null:'회복은 피해를 입은 부대가 자기 영토에서만 가능합니다.';
 return ['guard','wait'].includes(o.type)?null:'알 수 없는 명령입니다.';
}
export function enemyOrders(s){
 const orders={},assigned=new Set();
 for(const u of s.units.filter(u=>u.team!=='ally')){
  const target=targets(s,u)[0];if(target){orders[u.id]={type:'attack',target};continue;}
  if(Object.hasOwn(s.points,key(u.x,u.z))&&s.points[key(u.x,u.z)]!==u.team){orders[u.id]={type:'capture'};assigned.add(key(u.x,u.z));continue;}
  const goals=Object.entries(s.points).filter(([k,t])=>t!==u.team&&!assigned.has(k)).map(([k])=>{const [x,z]=k.split(',').map(Number);return {x,z,k};});
  goals.sort((a,b)=>distance(u,a)-distance(u,b)||a.x-b.x||a.z-b.z);
  const goal=goals[0]??[...GATES].sort((a,b)=>distance(u,a)-distance(u,b))[0];
  if(goals[0])assigned.add(goals[0].k);
  const moves=reachable(s,u).sort((a,b)=>distance(a,goal)-distance(b,goal)||a.x-b.x||a.z-b.z);
  orders[u.id]=moves.length?{type:'move',x:moves[0].x,z:moves[0].z}:{type:'guard'};
 }return orders;
}
export function resolveTurn(input,plan,enemy=enemyOrders(input)){
 if(input.result)throw Error('Game has ended');
 const accepted=emptyPlan();for(const b of plan.builds){const e=canBuild(input,accepted,b.type,b.x,b.z);if(e)throw Error(e);accepted.builds.push(b);}
 for(const [id,o] of Object.entries(plan.orders)){const u=input.units.find(v=>v.id===id&&v.team==='ally');const e=canOrder(input,u,o,plan);if(e)throw Error(e);}
 const researchChoice=Object.hasOwn(plan,'research')?plan.research:input.research.ally.active;
 const researchError=canResearch(input,'ally',researchChoice);if(researchError)throw Error(researchError);
 for(const o of plan.projects??[]){const e=canProject(input,accepted,o,availableGold(input,accepted));if(e)throw Error(e);accepted.projects.push(o);}
 const growthAI=aiGrowth(input,'enemy'),growthRival=input.gameMode==='standard'?aiGrowth(input,'rival'):null;
 const s=structuredClone(input),events=[],orders={...enemy,...plan.orders},damage=new Map(),baseHits={ally:{},enemy:{},rival:{}};
 s.gold=availableGold(input,plan);
 s.enemyGold-=growthAI.projects.reduce((sum,o)=>sum+PROJECTS[o.type].cost,0);
 if(growthRival)s.rivalGold-=growthRival.projects.reduce((sum,o)=>sum+PROJECTS[o.type].cost,0);
 const proposals=new Map();for(const u of input.units){const o=orders[u.id];if(o?.type!=='move'||canMove(input,u,o.x,o.z,plan))continue;const k=key(o.x,o.z);if(!proposals.has(k))proposals.set(k,[]);proposals.get(k).push({u,o});}
 for(const list of proposals.values()){if(list.length>1){events.push({type:'collision',text:'이동 목적지가 겹쳐 대기했습니다.'});continue;}const {u,o}=list[0],v=s.units.find(v=>v.id===u.id);v.x=o.x;v.z=o.z;events.push({type:'move',id:u.id,from:{x:u.x,z:u.z},to:{x:o.x,z:o.z}});}
 function attack(from,target,power){
  const victim=target.kind==='unit'?s.units.find(v=>v.id===target.id):target.kind==='structure'?s.structures.find(v=>v.id===target.id):null;
  const defense=target.kind==='unit'?stats(victim).defense+(terrain(victim.x,victim.z)==='forest'?1:0)+(orders[victim.id]?.type==='guard'?(hasTech(input,victim.team,'training')?2:1):0):target.kind==='structure'?1:0;
  const amount=Math.max(1,power-defense),id=target.kind==='base'?target.team:target.id;damage.set(id,(damage.get(id)??0)+amount);
  if(target.kind==='base'&&s.gameMode==='standard'){
   const team=from.kind==='unit'?s.units.find(u=>u.id===from.id)?.team:null;
   if(team&&team!==target.team)baseHits[target.team][team]=(baseHits[target.team][team]??0)+amount;
  }
  events.push({type:'attack',from,target,amount});
 }
 for(const u of s.units){const o=orders[u.id];if(o?.type==='attack'){if(targets(s,u).some(t=>sameTarget(t,o.target)))attack({kind:'unit',id:u.id},o.target,stats(u).attack+(u.kind==='siege'&&o.target.kind!=='unit'?3:0));else events.push({type:'failed',text:`${u.id}: 공격 대상이 사거리를 벗어났습니다.`});}}
 for(const b of s.structures){if(b.type!=='tower'||b.ready>s.turn)continue;const target=s.units.filter(u=>u.team==='enemy'&&distance(u,b)<=2).sort((a,c)=>distance(a,b)-distance(c,b)||a.hp-c.hp||a.id.localeCompare(c.id))[0];if(target)attack({kind:'structure',id:b.id},{kind:'unit',id:target.id},3);}
 for(const u of s.units)u.hp-=damage.get(u.id)??0;for(const b of s.structures)b.hp-=damage.get(b.id)??0;
 s.homeHP=Math.max(0,s.homeHP-(damage.get('ally')??0));s.enemyHP=Math.max(0,s.enemyHP-(damage.get('enemy')??0));
 if(s.gameMode==='standard')s.rivalHP=Math.max(0,s.rivalHP-(damage.get('rival')??0));
 for(const u of s.units.filter(u=>u.hp<=0))events.push({type:'destroy',id:u.id,team:u.team});s.units=s.units.filter(u=>u.hp>0);s.structures=s.structures.filter(b=>b.hp>0);
 for(const u of s.units){const o=orders[u.id];if(o?.type==='heal'&&!damage.has(u.id)&&ownTerritory(s,u))u.hp=Math.min(stats(u).hp,u.hp+2);
  const k=key(u.x,u.z);if(o?.type==='capture'&&Object.hasOwn(s.points,k)&&s.points[k]!==u.team){s.pointReady[k]=s.turn+(s.points[k]?2:1);s.points[k]=u.team;events.push({type:'capture',team:u.team,x:u.x,z:u.z});}}
 for(const b of plan.builds){if(b.type==='road'){s.roads??=[];s.roads.push(key(b.x,b.z));events.push({type:'road',x:b.x,z:b.z});continue;}if(s.units.some(u=>u.x===b.x&&u.z===b.z)){s.gold+=Math.floor(PRICE[b.type]/2);events.push({type:'failed',text:'생산 타일 점유로 취소 · 비용 50% 환급'});continue;}
  if(['recruit','scout','siege','cavalry'].includes(b.type)){const kind=b.type==='recruit'?'infantry':b.type;if(['siege','cavalry'].includes(kind)){const militaryBoost=Object.entries(s.specialties).some(([site,v])=>v==='military'&&s.points[site]==='ally'&&(s.pointReady[site]??0)<=s.turn);s.pendingRecruits.push({kind,x:b.x,z:b.z,ready:s.turn+(militaryBoost?0:1)});events.push({type:'production',text:`${STATS[kind].name} 훈련 시작 · ${militaryBoost?1:2}턴`});}else s.units.push({id:`a${s.nextId++}`,team:'ally',kind,x:b.x,z:b.z,hp:STATS[kind].hp});}
  else s.structures.push({id:`s${s.nextId++}`,type:b.type,x:b.x,z:b.z,hp:10,ready:s.turn+(b.type==='tower'?2:1)});events.push({type:'build',...b});}
 for(const pending of [...s.pendingRecruits]){if(pending.ready>s.turn)continue;if(s.units.some(u=>u.x===pending.x&&u.z===pending.z)||s.structures.some(b=>b.x===pending.x&&b.z===pending.z)){events.push({type:'production-wait',text:`${STATS[pending.kind].name} 출전 칸이 막혔습니다.`});continue;}s.units.push({id:`a${s.nextId++}`,team:'ally',kind:pending.kind,x:pending.x,z:pending.z,hp:STATS[pending.kind].hp});s.pendingRecruits.splice(s.pendingRecruits.indexOf(pending),1);events.push({type:'production',text:`${STATS[pending.kind].name} 훈련 완료`});}
 if(s.gameMode==='standard'){
  const health={ally:s.homeHP,enemy:s.enemyHP,rival:s.rivalHP};
  for(const team of ['ally','enemy','rival']){
   if(health[team]>0||(team==='ally'?input.homeHP:team==='enemy'?input.enemyHP:input.rivalHP)<=0)continue;
   const contributors=Object.entries(baseHits[team]).filter(([attacker])=>health[attacker]>0);
   const max=Math.max(0,...contributors.map(([,amount])=>amount));
   const winners=contributors.filter(([,amount])=>amount===max&&max>0).map(([attacker])=>attacker);
   for(const winner of winners)s.capturePoints[winner]+=10/winners.length;
   for(const k of Object.keys(s.points)){if(s.points[k]===team){s.points[k]=null;delete s.pointReady[k];}}
   s.units=s.units.filter(u=>u.team!==team);
   if(team==='ally'){s.structures=[];s.pendingRecruits=[];}
   events.push({type:'elimination',team,text:`${team} 캠퍼스 함락`});
  }
  const alive=Object.entries(health).filter(([,hp])=>hp>0).map(([t])=>t);
  if(alive.length===0)s.result='draw';
  else if(!health.ally)s.result='defeat';
  else if(alive.length===1){s.result='victory';s.winner='ally';}
 }else if(!s.homeHP&&!s.enemyHP)s.result='draw';else if(!s.homeHP)s.result='defeat';else if(!s.enemyHP)s.result='victory';
 if(s.result)s.victoryMode='base';
 finishProjects(s,plan.projects??[],'ally',events);finishProjects(s,growthAI.projects,'enemy',events);if(growthRival)finishProjects(s,growthRival.projects,'rival',events);finishLabs(s,events);finishGrand(s,events);
 advanceResearch(s,input,'ally',researchChoice,events);advanceResearch(s,input,'enemy',growthAI.technology,events);if(growthRival)advanceResearch(s,input,'rival',growthRival.technology,events);

 function recruitAI(team,bank,base,gates){
  if((team==='enemy'?s.enemyHP:s.rivalHP)<=0||s[bank]<5||s.units.filter(u=>u.team===team).length>=unitCap(s,team))return;
  const spawn=gates.find(p=>passable(p.x,p.z)&&!s.units.some(u=>u.x===p.x&&u.z===p.z)&&!s.structures.some(b=>b.type!=='road'&&b.x===p.x&&b.z===p.z));
  if(!spawn)return;s[bank]-=5;s.units.push({id:`${team==='enemy'?'e':'r'}${s.nextId++}`,team,kind:'infantry',...spawn,hp:10});
  events.push({type:'reinforce',team});
 }
 if(!s.result){recruitAI('enemy','enemyGold',ENEMY_BASE,ENEMY_GATES);if(s.gameMode==='standard')recruitAI('rival','rivalGold',RIVAL_BASE,RIVAL_GATES);}
 s.turn++;
 if(!s.result&&s.turn>TURN_LIMIT){
  if(s.gameMode==='standard'){
   const teams=['ally','enemy','rival'].filter(t=>(t==='ally'?s.homeHP:t==='enemy'?s.enemyHP:s.rivalHP)>0);
   const rank=t=>[victoryPoints(s,t),t==='ally'?s.homeHP:t==='enemy'?s.enemyHP:s.rivalHP,
      Object.entries(s.points).filter(([k,v])=>v===t&&(s.pointReady[k]??0)<=s.turn).length,
      s.research[t].done.length];
   const compare=(a,b)=>{const A=rank(a),B=rank(b);return A.map((v,i)=>v-B[i]).find(v=>v!==0)??0;};
   teams.sort((a,b)=>-compare(a,b));
   const best=teams.filter(t=>compare(t,teams[0])===0);
   s.winner=best.length===1?best[0]:null;
   s.result=best.length>1&&best.includes('ally')?'draw':s.winner==='ally'?'victory':'defeat';
   s.victoryMode='score';
   events.push({type:'score',ally:victoryPoints(s,'ally'),enemy:victoryPoints(s,'enemy'),rival:victoryPoints(s,'rival'),text:'30턴 최종 순위 확정'});
  }else{
   const ally=victoryPoints(s,'ally'),enemyScore=victoryPoints(s,'enemy');
   const tieA=[s.homeHP,Object.entries(s.points).filter(([k,t])=>t==='ally'&&(s.pointReady[k]??0)<=s.turn).length,s.research.ally.done.length];
   const tieE=[s.enemyHP,Object.entries(s.points).filter(([k,t])=>t==='enemy'&&(s.pointReady[k]??0)<=s.turn).length,s.research.enemy.done.length];
   const tie=tieA.map((v,i)=>v-tieE[i]).find(v=>v!==0)??0;
   s.result=ally>enemyScore||ally===enemyScore&&tie>0?'victory':ally<enemyScore||ally===enemyScore&&tie<0?'defeat':'draw';s.victoryMode='score';
   events.push({type:'score',ally,enemy:enemyScore,text:`${TURN_LIMIT}턴 종료 · 점수 ${ally}:${enemyScore}`});
  }
 }
 if(!s.result){
  const amount=income(s);s.gold+=amount;if(s.enemyHP>0)s.enemyGold+=income(s,'enemy');
  if(s.gameMode==='standard'&&s.rivalHP>0)s.rivalGold+=income(s,'rival');
  events.push({type:'income',amount});
 }else events.push({type:'income',amount:0});
 return {state:s,events};

}
