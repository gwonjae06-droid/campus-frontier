import {stats,targets} from './simulation.js?v=18';
import {previewAttack,UNIVERSITY} from './sequential-mode.js?v=42';

export function readyUnits(state){
 if(!state||state.result||state.phaseTeam!==state.playerTeam)return [];
 return state.units.filter(u=>u.team===state.playerTeam&&!state.acted.includes(u.id));
}
export function nextReadyUnit(state,selected){
 const ready=readyUnits(state);
 if(!ready.length)return null;
 const index=ready.findIndex(u=>u.id===selected);
 return ready[(index+1)%ready.length];
}
export function attackChoices(state,id){
 const u=readyUnits(state).find(u=>u.id===id);
 if(!u)return [];
 return targets(state,u).filter(t=>t.kind==='unit'||t.kind==='base').flatMap(target=>{
  const info=previewAttack(state,u.team,u.id,target);
  if(info.error)return [];
  const victim=target.kind==='unit'?state.units.find(v=>v.id===target.id):null;
  const school=UNIVERSITY[victim?.team??target.team].label;
  const name=victim?stats(victim).name:'본진';
  return [{target,...info,label:`${school} ${name}`,defeat:info.remainingHp===0}];
 });
}
