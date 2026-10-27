// Vision is derived from the current state; exploration is persisted separately.
// In the older two-player practice mode every tile remains visible for legacy tests.
export const TEAMS=['ally','enemy','rival'];
export const tileKey=(x,z)=>`${x},${z}`;
const distance=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.z-b.z);
const BASES={ally:{x:3,z:3},enemy:{x:17,z:17},rival:{x:17,z:3}};
export function visibleTiles(s,team='ally'){
 const seen=new Set(),size=21;
 if(s.gameMode!=='standard'){
  for(let z=0;z<size;z++)for(let x=0;x<size;x++)seen.add(tileKey(x,z));
  return seen;
 }
 function reveal(x,z,r){
  for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++){
   if(Math.abs(dx)+Math.abs(dz)>r)continue;
   const nx=x+dx,nz=z+dz;
   if(nx>=0&&nz>=0&&nx<size&&nz<size)seen.add(tileKey(nx,nz));
  }
 }
 const hp=team==='ally'?s.homeHP:team==='enemy'?s.enemyHP:s.rivalHP;
 if(hp>0)reveal(BASES[team].x,BASES[team].z,4);
 for(const [k,owner] of Object.entries(s.points))if(owner===team&&(s.pointReady[k]??0)<=s.turn){
  const [x,z]=k.split(',').map(Number);reveal(x,z,2);
 }
 for(const u of s.units)if(u.team===team){
  const hill=u.x>=11&&u.x<=13&&u.z===3||u.z===0&&u.x<7;
  reveal(u.x,u.z,(u.kind==='scout'?3:2)+(hill?1:0));
 }
 return seen;
}
export function isVisible(s,team,x,z,visible=visibleTiles(s,team)){
 return visible.has(tileKey(x,z));
}
export function exploredTiles(s,team='ally'){
 return new Set(s.explored?.[team]??[]);
}
export function rememberExploration(s){
 if(s.gameMode!=='standard')return;
 s.explored??={ally:[],enemy:[],rival:[]};
 s.lastSeen??={ally:{},enemy:{},rival:{}};
 for(const team of TEAMS){
  const visible=visibleTiles(s,team),remembered=new Set(s.explored[team]??[]);
  for(const k of visible)remembered.add(k);
  s.explored[team]=[...remembered].sort();
  const ghost=s.lastSeen[team]??={};
  for(const enemy of s.units)if(enemy.team!==team&&visible.has(tileKey(enemy.x,enemy.z)))
   ghost[enemy.id]={x:enemy.x,z:enemy.z,kind:enemy.kind,team:enemy.team,turn:s.turn};
  for(const [id,record] of Object.entries(ghost)){
   if(visible.has(tileKey(record.x,record.z))&&!s.units.some(u=>u.id===id&&u.x===record.x&&u.z===record.z))delete ghost[id];
  }
 }
}
