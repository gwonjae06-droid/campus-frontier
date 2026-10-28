// OLYMPUS v4.2: deterministic, fog-safe battle report projections.
import {visibleTiles} from './vision.js?v=18';
import {UNIVERSITY,scoreBreakdown} from './sequential-mode.js?v=45';

const tile=p=>p?p.x+','+p.z:null;
const findUnit=(s,id)=>s.units.find(u=>u.id===id);
const school=t=>UNIVERSITY[t]?.label??'미확인 대학';
function eventPos(e,before,after){
 if(Number.isInteger(e.x)&&Number.isInteger(e.z))return {x:e.x,z:e.z};
 if(e.site){const [x,z]=e.site.split(',').map(Number);return {x,z};}
 if(e.id)return findUnit(before,e.id)||findUnit(after,e.id);
 return null;
}
export function visibleEvents(events,before,after,viewer=before.playerTeam){
 const start=visibleTiles(before,viewer),end=visibleTiles(after,viewer);
 const visible=p=>!!p&&(start.has(tile(p))||end.has(tile(p)));
 return events.filter(e=>{
   if(e.team===viewer)return true;
   if(['research','recruit','income','score','elimination'].includes(e.type))return false;
   if(e.type==='move')return visible(e.from)||visible(e.to);
   if(e.type==='attack'){
     const attacker=e.from?.kind==='unit'&&(findUnit(before,e.from.id)||findUnit(after,e.from.id));
     const victim=e.target?.kind==='unit'&&(findUnit(before,e.target.id)||findUnit(after,e.target.id));
     const base=e.target?.kind==='base'&&UNIVERSITY[e.target.team]?.base;
     return visible(attacker)||visible(victim)||visible(base);
   }
   return visible(eventPos(e,before,after));
 });
}
export function describeEvent(e){
 const team=school(e.team);
 switch(e.type){
 case 'move':return team+' 병력 이동';
 case 'attack':return team+' 공격 · '+e.amount+' 피해';
 case 'destroy':return team+' 부대 전멸';
 case 'capture':return team+' 거점 점령';
 case 'bonus':return team+' 탐사 보상 +'+e.amount+' OP';
 case 'upgrade':return team+' 거점 Lv.'+e.level+' 발전';
 case 'research':return team+' '+e.branch+' 연구 Lv.'+e.level;
 case 'recruit':return team+' 병력 모집';
 case 'guard':return team+' 병력 휴식';
 case 'income':return team+' 라운드 수입 +'+e.amount+' OP';
 case 'elimination':return '대학 본진 함락';
 case 'score':return '30라운드 최종 점수';
 default:return null;
 }
}
export function publicScore(state,team){
 return (team===state.playerTeam||state.result)?scoreBreakdown(state,team):null;
}
