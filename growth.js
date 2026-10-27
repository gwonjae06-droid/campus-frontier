export const TECHS={
 development:{name:'자원 개발',cost:6,effect:'자원 타일 개발 · OP +1/턴'},
 specialization:{name:'거점 전문화',cost:10,requires:'development',effect:'거점 경제 또는 연구 특화'},
 training:{name:'조직 훈련',cost:6,effect:'방어 명령 보정 +1 → +2'},
 defense:{name:'방어 건축',cost:6,effect:'성벽 건설 해금'},
 towers:{name:'방어 체계',cost:16,requires:'defense',effect:'방어탑 건설 해금'},
 siege:{name:'공성 기술',cost:12,requires:'training',effect:'공성대 · 사거리 2 / 본진·시설 +3 피해'},
 mobility:{name:'기동 전술',cost:16,requires:'training',effect:'기동대 · 이동력 2'},
 methodology:{name:'연구 방법',cost:8,effect:'연구 시설 건설 · 거점/본진 RP +1'},
 wide:{name:'광역 관리',cost:16,requires:'specialization',effect:'일반 거점 하나의 영토 반경을 2로 확장'},
 roads:{name:'도로망',cost:10,requires:'defense',effect:'영토에 도로 건설, 진입 비용 1'},
 advanced:{name:'전문 연구',cost:14,requires:'methodology',effect:'종합 프로젝트를 향한 전문 연구'},
 integrated:{name:'종합 프로젝트',cost:20,requires:'advanced',effect:'캠퍼스 종합 프로젝트 · OP 15 / 3턴 / 완료 +10점'}
};
export const DEPOSITS=[{x:5,z:5,site:'home'},{x:8,z:7,site:'8,6'},{x:6,z:8,site:'6,9'}];
export const PROJECTS={develop:{name:'자원 개발',cost:3},economy:{name:'경제 특화',cost:6},science:{name:'연구 특화',cost:6},military:{name:'군사 특화',cost:6},lab:{name:'연구 시설',cost:6},wide:{name:'광역 관리',cost:0},grand:{name:'종합 프로젝트',cost:15}};
export const newResearch=()=>({active:null,bank:0,progress:{},done:[]});
export const hasTech=(s,team,id)=>s.research[team].done.includes(id);
export const normalPoint=(s,k,team)=>s.points[k]===team&&(s.pointReady[k]??0)<=s.turn;
export const researchRate=(s,team='ally')=>3+Object.keys(s.points).filter(k=>normalPoint(s,k,team)&&s.specialties[k]==='science').length*2+Object.entries(s.labs??{}).filter(([k,exists])=>exists&&(k==='home'?team==='ally':normalPoint(s,k,team))).length;
export const growthIncome=(s,team)=>Object.keys(s.points).filter(k=>normalPoint(s,k,team)&&s.specialties[k]==='economy').length*2+DEPOSITS.filter(d=>s.developed[`${d.x},${d.z}`]&&(d.site==='home'?team==='ally':normalPoint(s,d.site,team))).length;
export const reservedProjects=p=>(p.projects??[]).reduce((sum,o)=>sum+(PROJECTS[o.type]?.cost??0),0);
export function canResearch(s,team,id){if(id===null)return null;const t=TECHS[id];if(!t)return '알 수 없는 기술입니다.';if(hasTech(s,team,id))return '이미 완료한 기술입니다.';if(t.requires&&!hasTech(s,team,t.requires))return `${TECHS[t.requires].name} 연구가 먼저 필요합니다.`;return null;}
export function canProject(s,p,o,remaining,team='ally'){
 if(s.result)return '연습이 종료되었습니다.';
 const item=PROJECTS[o.type];if(!item)return '알 수 없는 작업입니다.';
 const home=o.site==='home';if(home?team!=='ally':!normalPoint(s,o.site,team))return '자신의 안정화 완료 거점이 필요합니다.';
 if((p.projects??[]).some(v=>v.site===o.site)||s.labConstruction?.[o.site]||home&&(p.builds.length||s.structures.some(b=>b.ready>s.turn)||(s.pendingRecruits??[]).length||s.grandConstruction))return '해당 작업장의 생산 슬롯이 사용 중입니다.';
 const tech={develop:'development',lab:'methodology',wide:'wide',grand:'integrated'}[o.type]??'specialization';if(!hasTech(s,team,tech))return '필요한 기술을 먼저 연구하세요.';
 if(o.type==='develop'){
  const d=DEPOSITS.find(d=>d.site===o.site);if(!d||s.developed[`${d.x},${d.z}`])return '개발 가능한 자원 타일이 없습니다.';
  if(s.units.some(u=>u.x===d.x&&u.z===d.z&&u.team!==team)||s.structures.some(b=>b.x===d.x&&b.z===d.z))return '자원 타일이 점유되었습니다.';
 }else if(o.type==='lab'){if(s.labs?.[o.site])return '이미 연구 시설이 건설되어 있습니다.';}
 else if(o.type==='wide'){if(home||o.site===s.centralPoint||o.site===s.wideSite||s.wideSite)return '광역 관리는 한 일반 거점에만 적용할 수 있습니다.';}
 else if(o.type==='grand'){if(!home||s.grandCompleted||s.grandConstruction)return '캠퍼스당 종합 프로젝트는 한 번만 수행할 수 있습니다.';}
 else if(home||o.site===s.centralPoint||s.specialties[o.site])return '특화는 중앙 거점을 제외한 미특화 일반 거점에서만 가능합니다.';
 if(remaining<item.cost)return '사용 가능한 운영력이 부족합니다.';return null;
}
// Production is based on the start-of-turn snapshot, not ownership after combat.
export function advanceResearch(s,before,team,choice,events){
 if((team==='ally'?s.homeHP:team==='enemy'?s.enemyHP:s.rivalHP)<=0)return;
 const r=s.research[team];r.active=choice;const amount=r.bank+researchRate(before,team);r.bank=0;
 if(!choice){r.bank=Math.min(10,amount);if(amount>10)events.push({type:'research-overflow',team,amount:amount-10});return;}
 const total=(r.progress[choice]??0)+amount,t=TECHS[choice];r.progress[choice]=Math.min(t.cost,total);
 if(total>=t.cost){r.done.push(choice);r.active=null;r.bank=Math.min(10,total-t.cost);events.push({type:'research',team,id:choice,text:`${t.name} 완료`});}
}
export function finishProjects(s,orders,team,events){
 for(const o of orders){const item=PROJECTS[o.type],home=o.site==='home',d=DEPOSITS.find(d=>d.site===o.site);
  const lost=(team==='ally'?s.homeHP:team==='enemy'?s.enemyHP:s.rivalHP)<=0||(!home&&s.points[o.site]!==team)||o.type==='develop'&&s.units.some(u=>u.x===d.x&&u.z===d.z&&u.team!==team);
  if(lost){s[team==='ally'?'gold':team==='enemy'?'enemyGold':'rivalGold']+=Math.floor(item.cost/2);events.push({type:'failed',text:`${item.name} 방해 · 50% 환급`});continue;}
  if(o.type==='develop')s.developed[`${d.x},${d.z}`]=true;else if(o.type==='lab'){s.labConstruction??={};s.labConstruction[o.site]={team,ready:s.turn+1};}else if(o.type==='wide')s.wideSite=o.site;else if(o.type==='grand')s.grandConstruction={team,ready:s.turn+2};else s.specialties[o.site]=o.type;
  events.push({type:'project',team,text:`${item.name} 완료 · 다음 턴부터 적용`});
 }
}
export function finishLabs(s,events){
 for(const [site,job] of Object.entries(s.labConstruction??{})){
  if(job.ready>s.turn)continue;
  const lost=site==='home'?(job.team==='ally'?s.homeHP<=0:job.team==='enemy'?s.enemyHP<=0:s.rivalHP<=0):s.points[site]!==job.team;
  if(lost){s[job.team==='ally'?'gold':job.team==='enemy'?'enemyGold':'rivalGold']+=3;events.push({type:'failed',text:'연구 시설 건설 실패 · 3 OP 환급'});}
  else{s.labs??={};s.labs[site]=true;events.push({type:'project',team:job.team,text:'연구 시설 완공 · 다음 턴부터 RP +1'});}
  delete s.labConstruction[site];
 }
}
export function finishGrand(s,events){
 const p=s.grandConstruction;if(!p||p.ready>s.turn)return;
 if((p.team==='ally'?s.homeHP:p.team==='enemy'?s.enemyHP:s.rivalHP)<=0){events.push({type:'failed',text:'본진 함락으로 종합 프로젝트 취소'});}
 else{s.grandCompleted=true;events.push({type:'project',team:p.team,text:'종합 프로젝트 완료 · 승리 점수 +10'});}
 s.grandConstruction=null;
}
export function aiGrowth(s,team='enemy'){
 const r=s.research[team],technology=r.active??Object.keys(TECHS).find(id=>!canResearch(s,team,id))??null;
 const p={builds:[],projects:[]};let money=team==='enemy'?s.enemyGold:s.rivalGold;
 for(const site of Object.keys(s.points)){const o={site,type:'economy'};if(!canProject(s,p,o,money,team)){p.projects.push(o);money-=6;}}
 return {technology,projects:p.projects};
}
