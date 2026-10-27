// Deterministic public-vision practice rules. Rendering never changes outcomes.
export const SIZE=15, PRICE={wall:3,tower:7,recruit:5,scout:4};
export const CAMPUS={x:2,z:2,size:3},HOME={x:3,z:3},ENEMY_BASE={x:13,z:13};
export const GATES=[{x:3,z:1},{x:5,z:3},{x:3,z:5},{x:1,z:3}];
export const STATS={infantry:{name:'보병',hp:10,attack:4,defense:2,move:1},scout:{name:'정찰대',hp:7,attack:2,defense:1,move:2}};
export const key=(x,z)=>`${x},${z}`;
export const distance=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.z-b.z);
export const isCampus=(x,z)=>x>=2&&x<=4&&z>=2&&z<=4;
export const stats=u=>STATS[u.kind??'infantry'];
export function terrain(x,z){
 if(x<0||z<0||x>=SIZE||z>=SIZE)return 'void';
 if(isCampus(x,z))return 'campus';
 if(x===13&&z===13)return 'enemy-base';
 if((x===8&&z===6)||(x===6&&z===9))return 'resource';
 if(x===10&&z>=1&&z<=10&&z!==5&&z!==9)return 'water';
 if(z===0&&x<7)return 'mountain';
 if((x===0&&z>5)||(z===14&&x<5)||(x===7&&z>=3&&z<=5))return 'forest';
 return 'grass';
}
export const passable=(x,z)=>Number.isInteger(x)&&Number.isInteger(z)&&['grass','resource','forest'].includes(terrain(x,z));
export const emptyPlan=()=>({orders:{},builds:[]});
export function initialState(){return {version:3,turn:1,gold:10,enemyGold:10,homeHP:30,enemyHP:30,result:null,
 units:[{id:'a1',team:'ally',kind:'infantry',x:5,z:3,hp:10},{id:'a2',team:'ally',kind:'scout',x:3,z:5,hp:7},{id:'e1',team:'enemy',kind:'infantry',x:12,z:13,hp:10},{id:'e2',team:'enemy',kind:'scout',x:13,z:12,hp:7}],
 structures:[],points:{'8,6':null,'6,9':null},pointReady:{},nextId:3};}
export const availableGold=(s,p)=>s.gold-p.builds.reduce((n,b)=>n+PRICE[b.type],0);
export const unitCap=(s,team='ally')=>Math.min(10,6+Object.entries(s.points).filter(([k,v])=>v===team&&(s.pointReady[k]??0)<=s.turn).length);
export const income=(s,team='ally')=>5+Object.entries(s.points).filter(([k,v])=>v===team&&(s.pointReady[k]??0)<=s.turn).length*2;
export function ownTerritory(s,u){return u.team==='ally'&&u.x>=1&&u.x<=5&&u.z>=1&&u.z<=5||u.team==='enemy'&&distance(u,ENEMY_BASE)<=2||Object.entries(s.points).some(([k,t])=>{const [x,z]=k.split(',').map(Number);return t===u.team&&distance(u,{x,z})<=1;});}
const neighbors=p=>[[1,0],[0,1],[-1,0],[0,-1]].map(([x,z])=>({x:p.x+x,z:p.z+z}));
export function reachable(s,u,plan=emptyPlan()){
 const out=new Map(),queue=[{x:u.x,z:u.z,cost:0}];
 while(queue.length){const p=queue.shift();for(const n of neighbors(p)){
  if(!passable(n.x,n.z)||s.structures.some(b=>b.x===n.x&&b.z===n.z)||plan.builds.some(b=>b.x===n.x&&b.z===n.z)||s.units.some(v=>v.id!==u.id&&v.x===n.x&&v.z===n.z))continue;
  const cost=p.cost+(terrain(n.x,n.z)==='forest'?2:1),k=key(n.x,n.z);
  if(distance(n,u)===0||cost>stats(u).move&&!(p.cost===0&&stats(u).move===1)||out.has(k)&&out.get(k).cost<=cost)continue;
  const node={...n,cost};out.set(k,node);if(cost<stats(u).move)queue.push(node);
 }}return [...out.values()];
}
export function canMove(s,u,x,z,p=emptyPlan()){if(!u)return '부대를 먼저 선택하세요.';return reachable(s,u,p).some(n=>n.x===x&&n.z===z)?null:'이동 범위를 벗어나거나 경로가 막혔습니다.';}
export function canBuild(s,p,type,x,z){
 if(s.result)return '게임이 종료되었습니다.';
 if(!Object.hasOwn(PRICE,type))return '알 수 없는 생산입니다.';
 if(s.structures.some(b=>b.ready>s.turn))return '캠퍼스 작업 슬롯에서 방어탑을 건설 중입니다.';
 if(p.builds.length)return '캠퍼스 작업 슬롯은 한 턴에 하나입니다.';
 if(!passable(x,z)||terrain(x,z)==='resource')return '빈 일반 타일을 선택하세요.';
 if(s.units.some(u=>u.x===x&&u.z===z)||s.structures.some(b=>b.x===x&&b.z===z))return '이미 점유된 타일입니다.';
 const gate=GATES.some(g=>g.x===x&&g.z===z),recruit=['recruit','scout'].includes(type);
 if(recruit){if(!gate)return '모집은 본진의 네 출전 타일에서만 가능합니다.';if(s.units.filter(u=>u.team==='ally').length>=unitCap(s))return '부대 상한에 도달했습니다.';}
 else {if(gate)return '본진 출전 타일에는 방어 시설을 설치할 수 없습니다.';if(x<1||x>5||z<1||z>5)return '캠퍼스 초기 영토 안에 건설하세요.';if(type==='tower'&&s.structures.filter(b=>b.type==='tower').length>=2)return '캠퍼스 방어탑은 최대 2개입니다.';}
 if(availableGold(s,p)<PRICE[type])return '사용 가능한 운영력이 부족합니다.';
 return null;
}
export function targets(s,u){
 const list=s.units.filter(v=>v.team!==u.team&&distance(u,v)===1).map(v=>({kind:'unit',id:v.id}));
 if(u.team==='enemy')list.push(...s.structures.filter(v=>distance(u,v)===1).map(v=>({kind:'structure',id:v.id})));
 if(u.team==='ally'?distance(u,ENEMY_BASE)===1:GATES.some(g=>distance(u,g)===0))list.push({kind:'base',team:u.team==='ally'?'enemy':'ally'});
 return list;
}
const sameTarget=(a,b)=>a&&b&&a.kind===b.kind&&a.id===b.id&&a.team===b.team;
export function canOrder(s,u,o,p=emptyPlan()){
 if(!u)return '부대를 선택하세요.';
 if(o.type==='move')return canMove(s,u,o.x,o.z,p);
 if(o.type==='attack')return targets(s,u).some(t=>sameTarget(t,o.target))?null:'인접한 적을 선택하세요. 본진은 접점에서 공격합니다.';
 if(o.type==='capture')return Object.hasOwn(s.points,key(u.x,u.z))&&s.points[key(u.x,u.z)]!==u.team?null:'점령할 거점 위에서 명령하세요. 이동과 같은 턴에는 점령할 수 없습니다.';
 if(o.type==='heal')return ownTerritory(s,u)&&u.hp<stats(u).hp?null:'회복은 피해를 입은 부대가 자기 영토에서만 가능합니다.';
 return ['guard','wait'].includes(o.type)?null:'알 수 없는 명령입니다.';
}
export function enemyOrders(s){
 const orders={};
 for(const u of s.units.filter(u=>u.team==='enemy')){
  const target=targets(s,u)[0];if(target){orders[u.id]={type:'attack',target};continue;}
  if(Object.hasOwn(s.points,key(u.x,u.z))&&s.points[key(u.x,u.z)]!=='enemy'){orders[u.id]={type:'capture'};continue;}
  const goals=Object.entries(s.points).filter(([,t])=>t!=='enemy').map(([k])=>{const [x,z]=k.split(',').map(Number);return {x,z};});goals.push(...GATES);
  const goal=goals.sort((a,b)=>distance(u,a)-distance(u,b))[0];
  const moves=reachable(s,u).sort((a,b)=>distance(a,goal)-distance(b,goal)||a.x-b.x||a.z-b.z);
  orders[u.id]=moves.length?{type:'move',x:moves[0].x,z:moves[0].z}:{type:'guard'};
 }return orders;
}
export function resolveTurn(input,plan,enemy=enemyOrders(input)){
 if(input.result)throw Error('Game has ended');
 const accepted=emptyPlan();for(const b of plan.builds){const e=canBuild(input,accepted,b.type,b.x,b.z);if(e)throw Error(e);accepted.builds.push(b);}
 for(const [id,o] of Object.entries(plan.orders)){const u=input.units.find(v=>v.id===id&&v.team==='ally');const e=canOrder(input,u,o,plan);if(e)throw Error(e);}
 const s=structuredClone(input),events=[],orders={...enemy,...plan.orders},damage=new Map();s.gold=availableGold(input,plan);
 const proposals=new Map();for(const u of input.units){const o=orders[u.id];if(o?.type!=='move'||canMove(input,u,o.x,o.z,plan))continue;const k=key(o.x,o.z);if(!proposals.has(k))proposals.set(k,[]);proposals.get(k).push({u,o});}
 for(const list of proposals.values()){if(list.length>1){events.push({type:'collision',text:'이동 목적지가 겹쳐 대기했습니다.'});continue;}const {u,o}=list[0],v=s.units.find(v=>v.id===u.id);v.x=o.x;v.z=o.z;events.push({type:'move',id:u.id,from:{x:u.x,z:u.z},to:{x:o.x,z:o.z}});}
 function attack(from,target,power){
  const victim=target.kind==='unit'?s.units.find(v=>v.id===target.id):target.kind==='structure'?s.structures.find(v=>v.id===target.id):null;
  const defense=target.kind==='unit'?stats(victim).defense+(terrain(victim.x,victim.z)==='forest'?1:0)+(orders[victim.id]?.type==='guard'?1:0):target.kind==='structure'?1:0;
  const amount=Math.max(1,power-defense),id=target.kind==='base'?target.team:target.id;damage.set(id,(damage.get(id)??0)+amount);events.push({type:'attack',from,target,amount});
 }
 for(const u of s.units){const o=orders[u.id];if(o?.type==='attack'){if(targets(s,u).some(t=>sameTarget(t,o.target)))attack({kind:'unit',id:u.id},o.target,stats(u).attack);else events.push({type:'failed',text:`${u.id}: 공격 대상이 사거리를 벗어났습니다.`});}}
 for(const b of s.structures){if(b.type!=='tower'||b.ready>s.turn)continue;const target=s.units.filter(u=>u.team==='enemy'&&distance(u,b)<=2).sort((a,c)=>distance(a,b)-distance(c,b)||a.hp-c.hp||a.id.localeCompare(c.id))[0];if(target)attack({kind:'structure',id:b.id},{kind:'unit',id:target.id},3);}
 for(const u of s.units)u.hp-=damage.get(u.id)??0;for(const b of s.structures)b.hp-=damage.get(b.id)??0;
 s.homeHP=Math.max(0,s.homeHP-(damage.get('ally')??0));s.enemyHP=Math.max(0,s.enemyHP-(damage.get('enemy')??0));
 for(const u of s.units.filter(u=>u.hp<=0))events.push({type:'destroy',id:u.id,team:u.team});s.units=s.units.filter(u=>u.hp>0);s.structures=s.structures.filter(b=>b.hp>0);
 for(const u of s.units){const o=orders[u.id];if(o?.type==='heal'&&!damage.has(u.id)&&ownTerritory(s,u))u.hp=Math.min(stats(u).hp,u.hp+2);
  const k=key(u.x,u.z);if(o?.type==='capture'&&Object.hasOwn(s.points,k)&&s.points[k]!==u.team){s.pointReady[k]=s.turn+(s.points[k]?2:1);s.points[k]=u.team;events.push({type:'capture',team:u.team,x:u.x,z:u.z});}}
 for(const b of plan.builds){if(s.units.some(u=>u.x===b.x&&u.z===b.z)){s.gold+=Math.floor(PRICE[b.type]/2);events.push({type:'failed',text:'생산 타일 점유로 취소 · 비용 50% 환급'});continue;}
  if(['recruit','scout'].includes(b.type)){const kind=b.type==='scout'?'scout':'infantry';s.units.push({id:`a${s.nextId++}`,team:'ally',kind,x:b.x,z:b.z,hp:STATS[kind].hp});}
  else s.structures.push({id:`s${s.nextId++}`,type:b.type,x:b.x,z:b.z,hp:10,ready:s.turn+(b.type==='tower'?2:1)});events.push({type:'build',...b});}
 if(!s.homeHP&&!s.enemyHP)s.result='draw';else if(!s.homeHP)s.result='defeat';else if(!s.enemyHP)s.result='victory';
 if(!s.result&&s.enemyGold>=5&&s.units.filter(u=>u.team==='enemy').length<unitCap(s,'enemy')){const spawn=neighbors(ENEMY_BASE).find(p=>passable(p.x,p.z)&&!s.units.some(u=>distance(u,p)===0)&&!s.structures.some(b=>distance(b,p)===0));if(spawn){s.enemyGold-=5;s.units.push({id:`e${s.nextId++}`,team:'enemy',kind:'infantry',...spawn,hp:10});events.push({type:'reinforce'});}}
 s.turn++;if(!s.result){const amount=income(s);s.gold+=amount;s.enemyGold+=income(s,'enemy');events.push({type:'income',amount});}else events.push({type:'income',amount:0});return {state:s,events};
}
