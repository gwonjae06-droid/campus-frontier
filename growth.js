export const TECHS={
 development:{name:'자원 개발',cost:6,effect:'자원 타일 개발 · OP +1/턴'},
 specialization:{name:'거점 전문화',cost:10,requires:'development',effect:'거점 경제 또는 연구 특화'},
 training:{name:'조직 훈련',cost:6,effect:'방어 명령 보정 +1 → +2'},
 defense:{name:'방어 건축',cost:6,effect:'성벽 건설 해금'},
 towers:{name:'방어 체계',cost:16,requires:'defense',effect:'방어탑 건설 해금'}
};
export const DEPOSITS=[{x:5,z:5,site:'home'},{x:8,z:7,site:'8,6'},{x:6,z:8,site:'6,9'}];
export const PROJECTS={develop:{name:'자원 개발',cost:3},economy:{name:'경제 특화',cost:6},science:{name:'연구 특화',cost:6}};
export const newResearch=()=>({active:null,bank:0,progress:{},done:[]});
export const hasTech=(s,team,id)=>s.research[team].done.includes(id);
export const normalPoint=(s,k,team)=>s.points[k]===team&&(s.pointReady[k]??0)<=s.turn;
export const researchRate=(s,team='ally')=>3+Object.keys(s.points).filter(k=>normalPoint(s,k,team)&&s.specialties[k]==='science').length*2;
export const growthIncome=(s,team)=>Object.keys(s.points).filter(k=>normalPoint(s,k,team)&&s.specialties[k]==='economy').length*2+DEPOSITS.filter(d=>s.developed[`${d.x},${d.z}`]&&(d.site==='home'?team==='ally':normalPoint(s,d.site,team))).length;
export const reservedProjects=p=>(p.projects??[]).reduce((sum,o)=>sum+(PROJECTS[o.type]?.cost??0),0);
export function canResearch(s,team,id){if(id===null)return null;const t=TECHS[id];if(!t)return '알 수 없는 기술입니다.';if(hasTech(s,team,id))return '이미 완료한 기술입니다.';if(t.requires&&!hasTech(s,team,t.requires))return `${TECHS[t.requires].name} 연구가 먼저 필요합니다.`;return null;}
export function canProject(s,p,o,remaining,team='ally'){
 if(s.result)return '연습이 종료되었습니다.';
 const item=PROJECTS[o.type];if(!item)return '알 수 없는 작업입니다.';
 const home=o.site==='home';if(home?team!=='ally':!normalPoint(s,o.site,team))return '자신의 안정화 완료 거점이 필요합니다.';
 if((p.projects??[]).some(v=>v.site===o.site)||home&&(p.builds.length||s.structures.some(b=>b.ready>s.turn)))return '해당 작업장의 생산 슬롯이 사용 중입니다.';
 if(!hasTech(s,team,o.type==='develop'?'development':'specialization'))return '필요한 기술을 먼저 연구하세요.';
 if(o.type==='develop'){
  const d=DEPOSITS.find(d=>d.site===o.site);if(!d||s.developed[`${d.x},${d.z}`])return '개발 가능한 자원 타일이 없습니다.';
  if(s.units.some(u=>u.x===d.x&&u.z===d.z&&u.team!==team)||s.structures.some(b=>b.x===d.x&&b.z===d.z))return '자원 타일이 점유되었습니다.';
 }else if(home||s.specialties[o.site])return '특화는 미특화 일반 거점에서 한 번만 가능합니다.';
 if(remaining<item.cost)return '사용 가능한 운영력이 부족합니다.';return null;
}
// Production is based on the start-of-turn snapshot, not ownership after combat.
export function advanceResearch(s,before,team,choice,events){
 if((team==='ally'?s.homeHP:s.enemyHP)<=0)return;
 const r=s.research[team];r.active=choice;const amount=r.bank+researchRate(before,team);r.bank=0;
 if(!choice){r.bank=Math.min(10,amount);if(amount>10)events.push({type:'research-overflow',team,amount:amount-10});return;}
 const total=(r.progress[choice]??0)+amount,t=TECHS[choice];r.progress[choice]=Math.min(t.cost,total);
 if(total>=t.cost){r.done.push(choice);r.active=null;r.bank=Math.min(10,total-t.cost);events.push({type:'research',team,id:choice,text:`${t.name} 완료`});}
}
export function finishProjects(s,orders,team,events){
 for(const o of orders){const item=PROJECTS[o.type],home=o.site==='home',d=DEPOSITS.find(d=>d.site===o.site);
  const lost=(team==='ally'?s.homeHP:s.enemyHP)<=0||(!home&&s.points[o.site]!==team)||o.type==='develop'&&s.units.some(u=>u.x===d.x&&u.z===d.z&&u.team!==team);
  if(lost){s[team==='ally'?'gold':'enemyGold']+=Math.floor(item.cost/2);events.push({type:'failed',text:`${item.name} 방해 · 50% 환급`});continue;}
  if(o.type==='develop')s.developed[`${d.x},${d.z}`]=true;else s.specialties[o.site]=o.type;
  events.push({type:'project',team,text:`${item.name} 완료 · 다음 턴부터 적용`});
 }
}
export function aiGrowth(s){
 const r=s.research.enemy,technology=r.active??Object.keys(TECHS).find(id=>!canResearch(s,'enemy',id))??null;
 const p={builds:[],projects:[]};let money=s.enemyGold;
 for(const site of Object.keys(s.points)){const o={site,type:'economy'};if(!canProject(s,p,o,money,'enemy')){p.projects.push(o);money-=6;}}
 return {technology,projects:p.projects};
}
