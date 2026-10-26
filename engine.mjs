// 대학전선 알파 — 순수 게임 규칙 (렌더링·시간·DOM 독립)
export const WIDTH = 21, HEIGHT = 21, LAST_TURN = 15;
export const FACTIONS = [
  {id:0,name:'성균관대학교',short:'성균관대',color:'#45d9af',base:[2,2]},
  {id:1,name:'연세대학교 (임시 모형)',short:'연세대',color:'#65a9fd',base:[16,2]},
  {id:2,name:'고려대학교 (임시 모형)',short:'고려대',color:'#fb8088',base:[9,16]}
];
export const TECHS = [
  {id:'economy',title:'개척',cost:6,desc:'보유 거점당 OP 수입 +1'},
  {id:'discipline',title:'조직 훈련',cost:6,desc:'방어 명령 보정 +1'},
  {id:'tactics',title:'전술 연구',cost:9,desc:'보병 공격력 +1'},
  {id:'science',title:'연구 방법',cost:9,desc:'매 턴 RP +1'}
];
export const TROOPS={infantry:{name:'보병',hp:10,atk:4,def:2,move:1,range:1,cost:5,symbol:'♟'},scout:{name:'정찰대',hp:7,atk:2,def:1,move:2,range:1,cost:4,symbol:'◆'}};
const HUB_SPECS=[[5,5],[15,5],[10,8],[5,11],[15,11],[9,13],[10,10]];
export const key=(x,y)=>`${x},${y}`;
export const dist=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
const inside=(x,y)=>x>=0&&y>=0&&x<WIDTH&&y<HEIGHT;
export const baseContains=(f,x,y)=> x>=f.base[0]&&x<f.base[0]+3&&y>=f.base[1]&&y<f.base[1]+3;
export const isBase=(s,x,y)=>s.factions.some(f=>baseContains(f,x,y));
export const contacts=f=>[{x:f.base[0]+1,y:f.base[1]-1},{x:f.base[0]+3,y:f.base[1]+1},{x:f.base[0]+1,y:f.base[1]+3},{x:f.base[0]-1,y:f.base[1]+1}].filter(p=>inside(p.x,p.y));
const hash=(x,y)=>((x*9187+y*7159+x*y*1783+5129)>>>0)%101;
const adjacent=(p)=>[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>({x:p.x+dx,y:p.y+dy})).filter(p=>inside(p.x,p.y));
const cp=x=>JSON.parse(JSON.stringify(x));
export function newGame(){
  const factions=FACTIONS.map(f=>({...cp(f),hp:30,op:10,rp:0,research:null,progress:{},techs:[],recruit:null,eliminated:false}));
  let tiles=Array.from({length:HEIGHT},(_,y)=>Array.from({length:WIDTH},(_,x)=>({kind:hash(x,y)<18?'forest':'plain'})));
  const hubs=HUB_SPECS.map(([x,y],i)=>({id:`h${i}`,x,y,owner:null,central:i===6}));
  for(const f of factions)for(let y=f.base[1]-1;y<f.base[1]+4;y++)for(let x=f.base[0]-1;x<f.base[0]+4;x++)if(inside(x,y))tiles[y][x].kind='plain';
  for(const h of hubs){tiles[h.y][h.x].kind='plain';for(const p of adjacent(h))tiles[p.y][p.x].kind='plain';}
  const units=[];let nextId=1;
  for(const f of factions){const pos=contacts(f);for(let i=0;i<2;i++){const type=i?'scout':'infantry'; const def=TROOPS[type];units.push({id:`u${nextId++}`,owner:f.id,type,x:pos[i].x,y:pos[i].y,hp:def.hp});tiles[pos[i].y][pos[i].x].kind='plain';}}
  return {version:2,turn:1,phase:'planning',factions,tiles,hubs,units,orders:{0:{},1:{},2:{}},nextId,history:[{turn:0,lines:['성균관대 작전 시작. 주변 거점을 확보하세요.']}],victor:null};
}
export const troop=s=>TROOPS[s.type];
export const getFaction=(s,id)=>s.factions[id];
export const occupants=(s,x,y)=>s.units.filter(u=>u.x===x&&u.y===y);
export const hubAt=(s,x,y)=>s.hubs.find(h=>h.x===x&&h.y===y);
export const terrain=(s,x,y)=>s.tiles[y]?.[x]?.kind;
export function movementRange(s,u){
 const points=new Map([[key(u.x,u.y),{x:u.x,y:u.y,cost:0}]]);
 const queue=[{x:u.x,y:u.y,cost:0}];const allowance=troop(u).move;
 while(queue.length){queue.sort((a,b)=>a.cost-b.cost);let node=queue.shift(); if(node.cost!==points.get(key(node.x,node.y))?.cost)continue;
  for(const p of adjacent(node)){if(isBase(s,p.x,p.y))continue;
   const occupied=occupants(s,p.x,p.y).some(o=>o.id!==u.id);
   if(occupied)continue;
   const effort=terrain(s,p.x,p.y)==='forest'?2:1;
   // 이동력 1인 부대도 인접한 험지 1칸 진입 가능
   const newCost=node.cost===0 && effort>allowance ? allowance :node.cost+effort;
   if(newCost>allowance)continue;
   if(newCost < (points.get(key(p.x,p.y))?.cost??Infinity)){
     points.set(key(p.x,p.y),{...p,cost:newCost});queue.push({...p,cost:newCost});
   }
  }
 }
 points.delete(key(u.x,u.y));return [...points.values()];
}
export function canHit(s,u,target){
 const reach=troop(u).range;
 if(target.kind==='base')return contacts(s.factions[target.owner]).some(p=>dist(u,p)<=reach-1); // 근접은 접점 타일에 있어야 함
 const enemy=s.units.find(e=>e.id===target.id&&!s.factions[e.owner].eliminated);
 return !!enemy && enemy.owner!==u.owner && dist(u,enemy)<=reach;
}
export const validMove=(s,u,x,y)=>movementRange(s,u).some(p=>p.x===x&&p.y===y);
export function orderFor(s,owner,unitId,order){
 const u=s.units.find(u=>u.id===unitId&&u.owner===owner);if(!u||s.phase!=='planning'||s.factions[owner].eliminated)return false;
 if(!order||order.kind==='wait'){delete s.orders[owner][unitId];return true;}
 if(order.kind==='move'&&!validMove(s,u,order.x,order.y))return false;
 if(order.kind==='capture'&&(!hubAt(s,u.x,u.y)||hubAt(s,u.x,u.y).owner===owner))return false;
 if(order.kind==='attack'&&!canHit(s,u,order.target))return false;
 if(!['move','attack','capture','defend','heal'].includes(order.kind))return false;
 s.orders[owner][unitId]=cp(order);return true;
}
export function totalIncome(s,owner){const f=s.factions[owner]; if(f.eliminated)return 0;return 5+s.hubs.filter(h=>h.owner===owner).length*(f.techs.includes('economy')?3:2);}
export function score(s,owner){const f=s.factions[owner];const count=s.hubs.filter(h=>h.owner===owner).reduce((sum,h)=>sum+(h.central?5:3),0);return (f.eliminated?0:5)+count+f.techs.length*2;}
export function canRecruit(s,owner,type){const f=s.factions[owner];const cap=Math.min(10,6+s.hubs.filter(h=>h.owner===owner).length);return !f.eliminated&&!f.recruit&&!!TROOPS[type]&&f.op>=TROOPS[type].cost&&s.units.filter(u=>u.owner===owner).length<cap;}
export function setRecruit(s,owner,type){const f=s.factions[owner];if(!type){f.recruit=null;return true;}if(!canRecruit(s,owner,type))return false;f.recruit=type;return true;}
export function setResearch(s,owner,tech){const f=s.factions[owner];if(f.eliminated|| (tech&&!TECHS.some(t=>t.id===tech))||f.techs.includes(tech))return false;f.research=tech;return true;}
function aiPlan(s,owner){
 const f=s.factions[owner];if(f.eliminated)return;
 const enemyUnits=s.units.filter(u=>u.owner!==owner&&!s.factions[u.owner].eliminated);
 const myUnits=s.units.filter(u=>u.owner===owner);
 if(!f.research)f.research=owner===1?'discipline':'economy';
 if(f.techs.includes(f.research)){f.research=TECHS.find(t=>!f.techs.includes(t.id))?.id??null;}
 // 너무 급격한 AI 증원 방지. 직접 비용과 동일한 조건.
 if(s.turn%2===0&&canRecruit(s,owner,myUnits.filter(u=>u.type==='scout').length<2?'scout':'infantry'))f.recruit=myUnits.filter(u=>u.type==='scout').length<2?'scout':'infantry';
 for(const u of myUnits){
   const nearEnemy=enemyUnits.filter(e=>dist(u,e)<=troop(u).range).sort((a,b)=>a.hp-b.hp||a.id.localeCompare(b.id))[0];
   if(nearEnemy){orderFor(s,owner,u.id,{kind:'attack',target:{kind:'unit',id:nearEnemy.id}});continue;}
   const onHub=hubAt(s,u.x,u.y);if(onHub&&onHub.owner!==owner){orderFor(s,owner,u.id,{kind:'capture'});continue;}
   const vulnerable=s.factions.filter(v=>v.id!==owner&&!v.eliminated).sort((a,b)=>dist(u,{x:a.base[0]+1,y:a.base[1]+1})-dist(u,{x:b.base[0]+1,y:b.base[1]+1}));
   const closeBase=vulnerable.find(b=>contacts(b).some(p=>dist(u,p)===0));
   if(closeBase){orderFor(s,owner,u.id,{kind:'attack',target:{kind:'base',owner:closeBase.id}});continue;}
   const targets=s.hubs.filter(h=>h.owner!==owner);
   let target=targets.sort((a,b)=> (dist(u,a)+(a.owner===null?0:4)-(a.central?1:0)) -(dist(u,b)+(b.owner===null?0:4)-(b.central?1:0)))[0];
   if((!target||s.turn>=11&&s.hubs.filter(h=>h.owner===owner).length>=2)&&vulnerable[0]){const b=vulnerable[0];target=contacts(b).sort((a,c)=>dist(u,a)-dist(u,c))[0];}
   const choices=movementRange(s,u).filter(p=>!myUnits.some(e=>e.id!==u.id&&e.x===p.x&&e.y===p.y));
   if(target&&choices.length){choices.sort((a,b)=>dist(a,target)-dist(b,target)||a.cost-b.cost||a.y-b.y||a.x-b.x);
    if(dist(choices[0],target)<dist(u,target)||choices[0].x===target.x&&choices[0].y===target.y)orderFor(s,owner,u.id,{kind:'move',x:choices[0].x,y:choices[0].y});
   }
 }
}
export function resolve(s){
 if(s.phase!=='planning')return {ok:false};
 const prevTurn=s.turn;const lines=[];const events=[];
 for(let owner=1;owner<3;owner++)aiPlan(s,owner);s.phase='resolving';
 const living=s.units.filter(u=>!s.factions[u.owner].eliminated);
 const proposed=living.filter(u=>s.orders[u.owner]?.[u.id]?.kind==='move').map(u=>({u,p:s.orders[u.owner][u.id]}));
 // 모든 이동 유효성은 같은 시작 상태에서 검증한다. 반복문의 순서가 결과에 영향을 주면 안 된다.
 const accepted=proposed.filter(m=>validMove(s,m.u,m.p.x,m.p.y));
 const byDest=new Map();for(const m of accepted){const k=key(m.p.x,m.p.y);byDest.set(k,[...(byDest.get(k)||[]),m]);}
 for(const m of accepted){const contenders=byDest.get(key(m.p.x,m.p.y))||[];
   if(contenders.length>1){events.push({kind:'blocked',x:m.u.x,y:m.u.y,owner:m.u.owner});continue;}
   m.u.x=m.p.x;m.u.y=m.p.y;events.push({kind:'move',x:m.u.x,y:m.u.y,owner:m.u.owner});
 }
 const hitMap=new Map();const baseDamage=new Map();
 for(const u of living){const command=s.orders[u.owner]?.[u.id];if(command?.kind!=='attack')continue;
   if(!canHit(s,u,command.target))continue;
   const attack=troop(u).atk+(u.type==='infantry'&&s.factions[u.owner].techs.includes('tactics')?1:0);
   if(command.target.kind==='base'){
     const victim=s.factions[command.target.owner];if(victim.eliminated||victim.id===u.owner)continue;
     baseDamage.set(victim.id,(baseDamage.get(victim.id)||0)+attack);events.push({kind:'attack',x:u.x,y:u.y,owner:u.owner});continue;
   }
   const target=s.units.find(e=>e.id===command.target.id);if(!target||target.owner===u.owner)continue;
   const dBonus=s.orders[target.owner]?.[target.id]?.kind==='defend'?(1+(s.factions[target.owner].techs.includes('discipline')?1:0)):0;
   const cover=terrain(s,target.x,target.y)==='forest'?1:0;
   const dmg=Math.max(1,attack-troop(target).def-cover-dBonus);
   hitMap.set(target.id,(hitMap.get(target.id)||0)+dmg);events.push({kind:'attack',x:target.x,y:target.y,owner:u.owner,damage:dmg});
 }
 let kills=0;
 for(const u of s.units){u.hp-=hitMap.get(u.id)||0;if(u.hp<=0){kills++;lines.push(`${s.factions[u.owner].short} ${troop(u).name} 전멸`);events.push({kind:'destroy',x:u.x,y:u.y,owner:u.owner});}}
 s.units=s.units.filter(u=>u.hp>0);
 for(const [fId,dmg] of baseDamage){const f=s.factions[fId];f.hp=Math.max(0,f.hp-dmg);lines.push(`${f.short} 캠퍼스에 ${dmg} 피해`);if(f.hp===0){f.eliminated=true;lines.push(`${f.short} 본진 함락!`);events.push({kind:'fall',x:f.base[0]+1,y:f.base[1]+1,owner:f.id});}}
 for(const f of s.factions){if(!f.eliminated)continue;s.units=s.units.filter(u=>u.owner!==f.id);for(const h of s.hubs)if(h.owner===f.id)h.owner=null;}
 for(const u of s.units){const command=s.orders[u.owner]?.[u.id];if(command?.kind==='heal'&&!hitMap.get(u.id)){const f=s.factions[u.owner];if(ownTerritory(s,f,u.x,u.y))u.hp=Math.min(troop(u).hp,u.hp+2);}
   if(command?.kind==='capture'){const h=hubAt(s,u.x,u.y);if(h&&h.owner!==u.owner){h.owner=u.owner;lines.push(`${s.factions[u.owner].short}: ${h.central?'중앙 거점':'거점'} 점령`);events.push({kind:'capture',x:h.x,y:h.y,owner:u.owner});}}
 }
 // 경제 활동: 한 진영에서 한 생산 주문. 출전 위치는 실행 후 확정.
 for(const f of s.factions){if(f.eliminated||!f.recruit)continue;const type=f.recruit;
   if(f.op>=TROOPS[type].cost){f.op-=TROOPS[type].cost;let spots=contacts(f).filter(p=>!occupants(s,p.x,p.y).length&&!s.hubs.some(h=>h.x===p.x&&h.y===p.y));
      if(spots.length){const p=spots[0];const u={id:`u${s.nextId++}`,owner:f.id,type,x:p.x,y:p.y,hp:TROOPS[type].hp};s.units.push(u);lines.push(`${f.short}: ${TROOPS[type].name} 모집`);events.push({kind:'train',x:p.x,y:p.y,owner:f.id});}
      else {f.op+=TROOPS[type].cost;lines.push(`${f.short}: 출전 칸 부족으로 모집 취소`);}
   }f.recruit=null;
 }
 for(const f of s.factions){if(f.eliminated)continue;
   f.rp+=(f.techs.includes('science')?4:3);
   if(f.research){const t=TECHS.find(t=>t.id===f.research);if(t){f.progress[t.id]=(f.progress[t.id]||0)+f.rp;f.rp=0;if(f.progress[t.id]>=t.cost){f.techs.push(t.id);f.progress[t.id]=t.cost;f.research=null;lines.push(`${f.short}: ${t.title} 연구 완료`);events.push({kind:'research',owner:f.id});}}}
   f.rp=Math.min(10,f.rp);
 }
 const surviving=s.factions.filter(f=>!f.eliminated);
 if(surviving.length<=1||prevTurn>=LAST_TURN){s.phase='finished';const rankings=[...surviving].sort((a,b)=>score(s,b.id)-score(s,a.id)||b.hp-a.hp||s.hubs.filter(h=>h.owner===b.id).length-s.hubs.filter(h=>h.owner===a.id).length||b.techs.length-a.techs.length);const compare=f=>[score(s,f.id),f.hp,s.hubs.filter(h=>h.owner===f.id).length,f.techs.length];s.victor=rankings.length===1?rankings[0]?.id??null:(rankings[0]&&(rankings.length<2||compare(rankings[0]).some((v,i)=>v!==compare(rankings[1])[i]))?rankings[0].id:null);lines.push(s.victor===null?'종료: 공동 승리 또는 무승부':`종료: ${s.factions[s.victor].short} 승리`);}
 else {s.turn++;for(const f of surviving){f.op+=totalIncome(s,f.id);}s.phase='planning';}
 s.orders={0:{},1:{},2:{}};s.history.unshift({turn:prevTurn,lines:lines.length?lines:['양측 명령이 처리되었습니다.'],events});s.history=s.history.slice(0,60);
 return {ok:true,lines,events,kills};
}
export function ownTerritory(s,f,x,y){if(baseContains(f,x,y))return true; const cx=f.base[0]+1,cy=f.base[1]+1;if(Math.max(Math.abs(x-cx),Math.abs(y-cy))<=2)return true;return s.hubs.some(h=>h.owner===f.id&&dist(h,{x,y})<=1);}
export function describeCell(s,x,y){const b=s.factions.find(f=>baseContains(f,x,y));const h=hubAt(s,x,y);const u=occupants(s,x,y)[0];return {b,h,u,terrain:terrain(s,x,y)};}
