// A ceasefire is bilateral, begins on the *next* planning turn, and lasts 5 turns.
// A neutral declaration is not required because this prototype begins in open war.
const sortPair=(a,b)=>[a,b].sort().join(':');
export const ceasefireKey=sortPair;
export function ceasefireUntil(s,a,b){return s.ceasefires?.[sortPair(a,b)]??0;}
export function isCeasefire(s,a,b){return a!==b&&s.gameMode==='standard'&&ceasefireUntil(s,a,b)>=s.turn;}
export function baseLocation(team){return team==='ally'?{x:3,z:3}:team==='enemy'?{x:17,z:17}:{x:17,z:3};}
export function ownerOfTerritory(s,x,z){
 const d=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.z-b.z);
 for(const t of s.gameMode==='standard'?['ally','enemy','rival']:['ally','enemy']){
  const hp=t==='ally'?s.homeHP:t==='enemy'?s.enemyHP:s.rivalHP;
  if(hp>0&&Math.abs(x-baseLocation(t).x)<=2&&Math.abs(z-baseLocation(t).z)<=2)return t;
 }
 for(const [k,t] of Object.entries(s.points)){
  if(!t)continue;
  const [px,pz]=k.split(',').map(Number);
  if(Math.abs(x-px)+Math.abs(z-pz)<=(s.wideSite===k?2:1))return t;
 }
 return null;
}
export function violatesCeasefire(s,team,x,z){
 const owner=ownerOfTerritory(s,x,z);
 return !!owner&&owner!==team&&isCeasefire(s,team,owner);
}
export function canProposeCeasefire(s,team,target){
 if(s.gameMode!=='standard')return '휴전은 3대학 기본전에서만 가능합니다.';
 if(!['ally','enemy','rival'].includes(team)||!['ally','enemy','rival'].includes(target)||team===target)return '상대 대학을 선택하세요.';
 const hp=t=>t==='ally'?s.homeHP:t==='enemy'?s.enemyHP:s.rivalHP;
 if(s.result||hp(team)<=0||hp(target)<=0)return '탈락했거나 종료된 대학과는 협상할 수 없습니다.';
 if(isCeasefire(s,team,target))return '이미 휴전 중입니다.';
 // Implementation choice from plan §11.3: forbid proposals while troops occupy
 // another party's territory instead of performing forced evacuation.
 for(const u of s.units){
  if(u.team===team&&ownerOfTerritory(s,u.x,u.z)===target||u.team===target&&ownerOfTerritory(s,u.x,u.z)===team)
   return '상대 영토 안에 부대가 있어 휴전을 제안할 수 없습니다.';
 }
 return null;
}
export function aiAcceptsCeasefire(s,target){
 const hp=target==='enemy'?s.enemyHP:s.rivalHP;
 const playerStrength=s.units.filter(u=>u.team==='ally').length;
 const aiStrength=s.units.filter(u=>u.team===target).length;
 // Deterministic, fair and inspectable: initial equal forces accept,
 // a superior AI may refuse unless under pressure.
 return hp<=24||aiStrength<=playerStrength||Object.values(s.points).filter(v=>v===target).length===0;
}
export function resolveDiplomacy(s,proposal,events){
 if(!proposal)return;
 const {target}=proposal,reason=canProposeCeasefire(s,'ally',target);
 if(reason){events.push({type:'diplomacy-rejected',target,text:reason});return;}
 if(!aiAcceptsCeasefire(s,target)){
  events.push({type:'diplomacy-rejected',target,text:'상대 대학이 5턴 휴전을 거부했습니다.'});return;
 }
 s.ceasefires??={};
 s.ceasefires[sortPair('ally',target)]=s.turn+5;
 events.push({type:'diplomacy-accepted',target,until:s.turn+5,text:`${target==='enemy'?'고려대':'연세대'}와 5턴 휴전 체결 · 다음 턴부터 적용`});
}
