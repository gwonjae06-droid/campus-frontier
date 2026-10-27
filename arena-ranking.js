import {UNIVERSITIES} from './arena-engine.js';
export const PROFILE_KEY='campus-frontier-arena-profile-v1';
export function blankProfile(){
 return {version:1,name:'지휘관',practiceRating:1000,matches:[]};
}
export function readProfile(storage){
 try{
  const p=JSON.parse(storage.getItem(PROFILE_KEY));
  if(p?.version===1&&Array.isArray(p.matches)&&Number.isFinite(p.practiceRating)){
   return {version:1,name:String(p.name||'지휘관').slice(0,18),practiceRating:Math.max(0,Math.round(p.practiceRating)),matches:p.matches.slice(-150)};
  }
 }catch{}
 return blankProfile();
}
export function recordMatch(profile,{mode,school,opponent,result}){
 if(!UNIVERSITIES[school]||!UNIVERSITIES[opponent]||!['win','lose','draw'].includes(result))return profile;
 const next={...profile,matches:[...profile.matches,{mode,school,opponent,result,at:Date.now()}].slice(-150)};
 // Friendly PvP cannot award official ELO without authenticated results.
 if(mode==='ai')next.practiceRating=Math.max(0,profile.practiceRating+({win:16,lose:-10,draw:2}[result]));
 return next;
}
export function practiceTier(rating){
 if(rating>=1500)return '마스터 연습생';
 if(rating>=1350)return '다이아몬드 연습생';
 if(rating>=1200)return '플래티넘 연습생';
 if(rating>=1100)return '골드 연습생';
 if(rating>=1000)return '실버 연습생';
 return '브론즈 연습생';
}
export function profileStats(profile){
 const matches=profile.matches??[];
 const played=matches.filter(m=>m.mode==='ai');
 const wins=played.filter(m=>m.result==='win').length;
 const losses=played.filter(m=>m.result==='lose').length;
 const draws=played.filter(m=>m.result==='draw').length;
 const use=Object.fromEntries(Object.keys(UNIVERSITIES).map(k=>[k,matches.filter(m=>m.school===k).length]));
 const most=Object.entries(use).sort((a,b)=>b[1]-a[1])[0];
 return {played:played.length,wins,losses,draws,main:most?.[1]?most[0]:null,playedSchools:use};
}
export function localUniversityTiers(profile){
 const data=Object.keys(UNIVERSITIES).map(school=>{
  const g=profile.matches.filter(m=>m.school===school&&m.mode==='ai');
  const wins=g.filter(m=>m.result==='win').length,draws=g.filter(m=>m.result==='draw').length;
  const winRate=g.length?(wins+draws*.5)/g.length:0;
  const tier=g.length<3?'표본 부족':winRate>=.75?'S':winRate>=.60?'A':winRate>=.40?'B':'C';
  return {school,matches:g.length,wins,winRate,tier};
 });
 return data.sort((a,b)=>b.winRate-a.winRate||b.matches-a.matches);
}
