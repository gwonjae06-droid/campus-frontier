// Campus Duel: deterministic, symmetric, short turn-based 1v1 rules.
// Equal statistics for each university: no invented balance advantages.
export const UNIVERSITIES={
 skku:{name:'성균관대학교',campus:'인문사회과학캠퍼스',color:'#45ba84',short:'성대'},
 yonsei:{name:'연세대학교',campus:'신촌캠퍼스',color:'#5e9bea',short:'연세'},
 korea:{name:'고려대학교',campus:'안암캠퍼스',color:'#e45f6c',short:'고대'}
};
export const SIZE=9, MAX_ROUNDS=24, OUTPOSTS=[[2,2],[4,4],[6,6]], UNIT_STATS={guard:{hp:3,move:1,attack:1},scout:{hp:2,move:2,attack:1}};
export const pos=(x,y)=>`${x},${y}`;
export function initialDuel(mode='ai',schools=['skku','yonsei']){
 if(!['ai','local','online'].includes(mode)||schools.length!==2||schools.some(s=>!UNIVERSITIES[s]))throw Error('잘못된 대전 설정');
 return {version:1,mode,schools:[...schools],turn:0,ply:0,round:1,stars:[4,4],baseHP:[6,6],
  units:[{id:1,team:0,kind:'guard',hp:3,x:1,y:4},{id:2,team:0,kind:'scout',hp:2,x:1,y:5},
   {id:3,team:1,kind:'guard',hp:3,x:7,y:4},{id:4,team:1,kind:'scout',hp:2,x:7,y:3}],
  owner:{},nextId:5,log:['각 대학의 전선이 열렸습니다.'],winner:null};
}
export const inside=(x,y)=>x>=0&&y>=0&&x<SIZE&&y<SIZE&&Number.isInteger(x)&&Number.isInteger(y);
export const baseAt=(x,y)=>y===4&&x===0?0:y===4&&x===8?1:-1;
export const outpostAt=(x,y)=>OUTPOSTS.some(p=>p[0]===x&&p[1]===y);
const dist=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
export const currentUnit=(s,id)=>s.units.find(u=>u.id===id&&u.team===s.turn);
export function legalActions(s){
 if(s.winner!==null)return [];
 const t=s.turn, out=[], home={x:t===0?0:8,y:4};
 const spawn=s.units.some(u=>u.x===home.x+ (t===0?1:-1)&&u.y===home.y);
 const hp=s.units.filter(u=>u.team===t).length;
 if(s.stars[t]>=3&&hp<7&&!spawn)out.push({type:'recruit',kind:'guard'});
 if(s.stars[t]>=2&&hp<7&&!spawn)out.push({type:'recruit',kind:'scout'});
 for(const u of s.units.filter(u=>u.team===t)){
  const steps=UNIT_STATS[u.kind].move;
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
   const d=dist(u,{x,y});
   if(!d||d>steps||baseAt(x,y)!==-1||s.units.some(v=>v.x===x&&v.y===y))continue;
   // No passing through occupied enemy/ally tiles for 2-step scouts.
   if(d===2&&u.kind==='scout'){
    if(u.x===x&&s.units.some(v=>v.x===x&&v.y===(u.y+y)/2))continue;
    if(u.y===y&&s.units.some(v=>v.y===y&&v.x===(u.x+x)/2))continue;
   }
   out.push({type:'move',unit:u.id,x,y});
  }
  for(const enemy of s.units.filter(v=>v.team!==t&&dist(u,v)===1))out.push({type:'attack',unit:u.id,target:enemy.id});
  const ehome={x:t===0?8:0,y:4};
  if(dist(u,ehome)===1)out.push({type:'base',unit:u.id});
 }
 out.push({type:'pass'});
 return out;
}
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function applyAction(s,action){
 if(!legalActions(s).some(a=>same(a,action)))throw Error('허용되지 않는 행동');
 const n=structuredClone(s),t=n.turn;
 const unit=n.units.find(u=>u.id===action.unit);
 if(action.type==='move'){
  unit.x=action.x;unit.y=action.y;
  if(outpostAt(unit.x,unit.y)){n.owner[pos(unit.x,unit.y)]=t;n.log.unshift(`${UNIVERSITIES[n.schools[t]].short} · 거점 확보`);}
 }else if(action.type==='attack'){
  const enemy=n.units.find(u=>u.id===action.target);
  enemy.hp-=UNIT_STATS[unit.kind].attack;
  if(enemy.hp<=0){n.units=n.units.filter(u=>u.id!==enemy.id);n.log.unshift('상대 부대 격파');}
  else n.log.unshift('공격 성공');
 }else if(action.type==='base'){
  n.baseHP[1-t]-=UNIT_STATS[unit.kind].attack;
  n.log.unshift('상대 캠퍼스를 공격했습니다.');
 }else if(action.type==='recruit'){
  const x=t===0?1:7;
  n.units.push({id:n.nextId++,team:t,kind:action.kind,hp:UNIT_STATS[action.kind].hp,x,y:4});
  n.stars[t]-=action.kind==='guard'?3:2;
  n.log.unshift(`${action.kind==='guard'?'수비대':'정찰대'} 모집`);
 }
 if(n.baseHP[1-t]<=0)n.winner=t;
 n.ply++;n.turn=1-t;
 if(n.turn===0){
  n.round++;
  for(let team=0;team<2;team++){
   const sites=Object.values(n.owner).filter(v=>v===team).length;
   n.stars[team]=Math.min(15,n.stars[team]+2+sites);
  }
 }
 if(n.round>MAX_ROUNDS&&n.winner===null){
  const score=[0,1].map(team=>n.baseHP[team]*3+n.units.filter(u=>u.team===team).reduce((a,u)=>a+u.hp,0)+Object.values(n.owner).filter(v=>v===team).length*4);
  n.winner=score[0]===score[1]?'draw':score[0]>score[1]?0:1;
 }
 n.log=n.log.slice(0,12);
 return n;
}
export function chooseAiAction(s){
 const actions=legalActions(s).filter(a=>a.type!=='pass');
 if(!actions.length)return {type:'pass'};
 const enemyBase={x:0,y:4};
 const targets=OUTPOSTS;
 function rank(a){
  const unit=s.units.find(u=>u.id===a.unit);
  if(a.type==='base')return 150;
  if(a.type==='attack'){
   const v=s.units.find(u=>u.id===a.target);
   return v.hp===1?115:87;
  }
  if(a.type==='move'){
   const now=dist(unit,enemyBase),after=dist(a,enemyBase);
   const neutral=outpostAt(a.x,a.y)?s.owner[pos(a.x,a.y)]!==1:0;
   return (neutral?91:0)+(now-after)*8+(a.x<unit.x?5:0)+((a.y+a.x*3+a.unit)%7)*.01;
  }
  if(a.type==='recruit')return s.units.filter(u=>u.team===1).length<3?78:17;
  return 0;
 }
 return actions.sort((a,b)=>rank(b)-rank(a))[0];
}
export function matchScore(s){
 return [0,1].map(team=>({team,campus:s.schools[team],points:s.baseHP[team]*3+
  s.units.filter(u=>u.team===team).reduce((n,u)=>n+u.hp,0)+Object.values(s.owner).filter(t=>t===team).length*4}));
}
