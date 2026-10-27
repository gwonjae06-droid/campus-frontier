// The turn resolver is independent of rendering and wall-clock time.
export const SIZE = 15;
export const PRICE = {wall:25, tower:70, recruit:60};
export const CAMPUS = {x:2,z:2,size:3};
export const HOME = {x:4,z:4};
export const ENEMY_BASE = {x:13,z:13};
export const key = (x,z) => `${x},${z}`;
export const distance = (a,b) => Math.abs(a.x-b.x)+Math.abs(a.z-b.z);
export const isCampus = (x,z) => x>=2&&x<=4&&z>=2&&z<=4;
export function terrain(x,z) {
  if(x<0||z<0||x>=SIZE||z>=SIZE) return 'void';
  if(isCampus(x,z)) return 'campus';
  if(x===13&&z===13) return 'enemy-base';
  if((x===8&&z===6)||(x===6&&z===9)) return 'resource';
  if(x===10&&z>=1&&z<=10&&z!==5&&z!==9) return 'water';
  if(z===0&&x<7) return 'mountain';
  if((x===0&&z>5)||(z===14&&x<5)) return 'forest';
  return 'grass';
}
export const passable = (x,z) => Number.isInteger(x)&&Number.isInteger(z)&&['grass','resource'].includes(terrain(x,z));
export function initialState() {
  return {version:2,turn:1,gold:180,homeHP:120,enemyHP:120,result:null,
    units:[{id:'a1',team:'ally',x:5,z:4,hp:70},{id:'a2',team:'ally',x:4,z:5,hp:70},
      {id:'e1',team:'enemy',x:12,z:12,hp:70},{id:'e2',team:'enemy',x:13,z:11,hp:70}],
    structures:[],points:{'8,6':null,'6,9':null},nextId:3};
}
export function availableGold(state,plan) {return state.gold-plan.builds.reduce((sum,b)=>sum+PRICE[b.type],0);}
export const emptyPlan = () => ({orders:{},builds:[]});
export function canBuild(state,plan,type,x,z) {
  if(state.result) return '게임이 종료되었습니다.';
  if(!Object.hasOwn(PRICE,type)) return '알 수 없는 건설 명령입니다.';
  if(!passable(x,z)||terrain(x,z)==='resource') return '빈 잔디 타일에 배치하세요.';
  if(Math.min(Math.abs(x-2),Math.abs(x-3),Math.abs(x-4))+Math.min(Math.abs(z-2),Math.abs(z-3),Math.abs(z-4))>4) return '본진에서 4칸 이내에 배치하세요.';
  if(state.units.some(u=>u.x===x&&u.z===z)||state.structures.some(s=>s.x===x&&s.z===z)||plan.builds.some(b=>b.x===x&&b.z===z)) return '이미 사용 중인 타일입니다.';
  if(availableGold(state,plan)<PRICE[type]) return '예약 가능한 자원이 부족합니다.';
  return null;
}
export function canMove(state,unit,x,z,plan=emptyPlan()) {
  if(!unit||unit.team!=='ally') return '아군 부대를 먼저 선택하세요.';
  if(distance(unit,{x,z})!==1) return '한 턴에는 상하좌우 한 칸 이동합니다.';
  if(!passable(x,z)||state.structures.some(s=>s.x===x&&s.z===z)||plan.builds.some(s=>s.x===x&&s.z===z)) return '이동할 수 없는 타일입니다.';
  if(state.units.some(u=>u.x===x&&u.z===z)) return '점유된 타일에는 이동할 수 없습니다.';
  return null;
}
function neighbors(p){return [[1,0],[0,1],[-1,0],[0,-1]].map(([x,z])=>({x:p.x+x,z:p.z+z}));}
function baseDistance(u,team){return team==='ally'?distance(u,ENEMY_BASE):Math.max(2-u.x,0,u.x-4)+Math.max(2-u.z,0,u.z-4);}
function nearbyTarget(state,u){
  const opponents=state.units.filter(v=>v.team!==u.team&&distance(u,v)===1).sort((a,b)=>a.hp-b.hp||a.id.localeCompare(b.id));
  if(opponents.length) return {kind:'unit',id:opponents[0].id};
  if(u.team==='enemy'){const wall=state.structures.find(s=>distance(u,s)===1);if(wall)return {kind:'structure',id:wall.id};}
  if(baseDistance(u,u.team)===1) return {kind:'base',team:u.team==='ally'?'enemy':'ally'};
  return null;
}
export function enemyOrders(state){
  const orders={};
  for(const u of state.units.filter(u=>u.team==='enemy')){
    if(nearbyTarget(state,u)){orders[u.id]={type:'guard'};continue;}
    const open=[{x:u.x,z:u.z,first:null}],seen=new Set([key(u.x,u.z)]);let dest=null;
    while(open.length){const cur=open.shift();if(baseDistance(cur,'enemy')===1){dest=cur.first;break;}
      for(const n of neighbors(cur)){const k=key(n.x,n.z);if(seen.has(k)||!passable(n.x,n.z)||state.structures.some(s=>s.x===n.x&&s.z===n.z)||state.units.some(v=>v.id!==u.id&&v.x===n.x&&v.z===n.z))continue;seen.add(k);open.push({...n,first:cur.first??n});}}
    orders[u.id]=dest?{type:'move',...dest}:{type:'guard'};
  }return orders;
}
export function resolveTurn(input,plan,committedEnemyOrders=enemyOrders(input)){
  if(input.result) throw new Error('Game has ended');
  const state=structuredClone(input),events=[],damage={units:{},structures:{},ally:0,enemy:0};
  // Validate every command against the same pre-turn snapshot; costs are reserved, then spent once.
  const accepted=emptyPlan();
  for(const b of plan.builds){const error=canBuild(input,accepted,b.type,b.x,b.z);if(error)throw new Error(error);accepted.builds.push(b);}
  for(const [id,order] of Object.entries(plan.orders)){const u=input.units.find(u=>u.id===id&&u.team==='ally');if(!u)throw new Error('Unknown allied unit');if(order.type==='move'){const error=canMove(input,u,order.x,order.z,plan);if(error)throw new Error(error);}else if(order.type!=='guard')throw new Error('Unknown order');}
  state.gold=availableGold(input,plan);
  for(const b of plan.builds){if(b.type==='recruit'){state.units.push({id:`a${state.nextId++}`,team:'ally',x:b.x,z:b.z,hp:70,born:state.turn});}else state.structures.push({id:`s${state.nextId++}`,type:b.type,x:b.x,z:b.z,hp:b.type==='wall'?90:70,born:state.turn});events.push({type:'build',...b});}
  const orders={...committedEnemyOrders,...plan.orders},proposals=new Map();
  for(const u of input.units){const o=orders[u.id];if(o?.type!=='move')continue;
    if(distance(u,o)!==1||!passable(o.x,o.z)||state.structures.some(s=>s.x===o.x&&s.z===o.z)||state.units.some(v=>v.x===o.x&&v.z===o.z))continue;
    const k=key(o.x,o.z);if(!proposals.has(k))proposals.set(k,[]);proposals.get(k).push({u,o});}
  for(const list of proposals.values()){if(list.length>1){events.push({type:'collision',text:'같은 칸을 향한 부대들은 제자리에서 대기했습니다.'});continue;}const {u,o}=list[0],live=state.units.find(v=>v.id===u.id);live.x=o.x;live.z=o.z;events.push({type:'move',id:u.id,from:{x:u.x,z:u.z},to:{x:o.x,z:o.z}});}
  // All attacks are collected before any casualties are removed, allowing mutual destruction.
  const attack=(from,target,amount)=>{if(target.kind==='unit')damage.units[target.id]=(damage.units[target.id]??0)+amount;else if(target.kind==='structure')damage.structures[target.id]=(damage.structures[target.id]??0)+amount;else damage[target.team]+=amount;events.push({type:'attack',from,target,amount});};
  for(const u of [...state.units].sort((a,b)=>a.id.localeCompare(b.id))){if(u.born===state.turn)continue;const target=nearbyTarget(state,u);if(target)attack({kind:'unit',id:u.id},target,25);}
  for(const s of state.structures){if(s.type!=='tower'||s.born===state.turn)continue;const target=state.units.filter(u=>u.team==='enemy'&&distance(s,u)<=3).sort((a,b)=>distance(s,a)-distance(s,b)||a.id.localeCompare(b.id))[0];if(target)attack({kind:'structure',id:s.id},{kind:'unit',id:target.id},30);}
  state.units.forEach(u=>u.hp-=damage.units[u.id]??0);state.structures.forEach(s=>s.hp-=damage.structures[s.id]??0);state.homeHP=Math.max(0,state.homeHP-damage.ally);state.enemyHP=Math.max(0,state.enemyHP-damage.enemy);
  for(const u of state.units.filter(u=>u.hp<=0))events.push({type:'destroy',id:u.id,team:u.team});
  state.units=state.units.filter(u=>u.hp>0);state.structures=state.structures.filter(s=>s.hp>0);
  for(const u of state.units){const k=key(u.x,u.z);if(Object.hasOwn(state.points,k)&&state.points[k]!==u.team){state.points[k]=u.team;events.push({type:'capture',team:u.team,x:u.x,z:u.z});}}
  if(state.homeHP===0&&state.enemyHP===0)state.result='draw';else if(state.homeHP===0)state.result='defeat';else if(state.enemyHP===0)state.result='victory';
  const income=30+Object.values(state.points).filter(t=>t==='ally').length*20;state.gold+=income;events.push({type:'income',amount:income});
  if(!state.result&&state.turn%4===0&&state.units.filter(u=>u.team==='enemy').length<4){const spawn=neighbors(ENEMY_BASE).find(p=>passable(p.x,p.z)&&!state.units.some(u=>distance(u,p)===0)&&!state.structures.some(s=>distance(s,p)===0));if(spawn){state.units.push({id:`e${state.nextId++}`,team:'enemy',...spawn,hp:70});events.push({type:'reinforce'});}}
  state.turn++;return {state,events};
}
