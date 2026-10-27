// OLYMPUS research presentation: effects reflect sequential-mode.js, never placeholder bonuses.
import {BRANCHES,UNIVERSITY,level,technologyCost} from './sequential-mode.js?v=41';

const SYMBOLS={
 economy:'<ellipse cx="45" cy="62" rx="27" ry="9"/><path d="M18 62v12c0 5 12 9 27 9s27-4 27-9V62"/><path d="M18 74v10c0 5 12 9 27 9s27-4 27-9V74"/><path d="M46 53c1-17 17-28 34-30-1 17-8 29-24 35"/><path d="M48 53c-2-14-13-21-24-22 1 11 8 20 21 24"/>',
 military:'<path d="m28 20 42 50m-8-52-40 49M23 18l11 2-9 10zm53-2-11 3 10 10zM18 72l14-12m38 1 11 13"/><path d="M17 79l9-10m50 1 9 10"/>',
 defense:'<path d="M49 12 79 24v27c0 18-12 30-30 39-18-9-30-21-30-39V24z"/><path d="M49 27v45M32 49h34"/>',
 science:'<path d="M48 30C35 20 23 21 12 25v51c14-4 26-3 36 5 10-8 22-9 36-5V25c-11-4-23-5-36 5z"/><path d="M48 30v51m-26-42c8-3 15-1 20 2m-20 10c8-2 15 0 20 3m13-13c5-3 12-5 19-2m-19 15c5-3 12-4 19-3"/><path d="m79 8 2 7 7 2-7 2-2 7-2-7-7-2 7-2z"/>'
};
const BRANCH_SUBTITLE={
 economy:'매 라운드 얻는 OP를 늘립니다.',
 military:'공격력과 새로운 병과를 강화합니다.',
 defense:'회복과 방어 능력을 높입니다.',
 science:'연구 비용을 줄이고 시야를 넓힙니다.'
};
const EFFECTS={
 economy:[
  ['라운드마다 OP 수입 +2','기술 단계가 쌓이면 OP 수입도 누적됩니다.'],
  ['라운드마다 OP 수입 추가 +2','경제 연구 누적 효과: 라운드당 OP +4.'],
  ['라운드마다 OP 수입 추가 +2','경제 연구 누적 효과: 라운드당 OP +6.']
 ],
 military:[
  ['아군 모든 부대의 공격 피해 계산에 +1','기본 공격력 보너스가 즉시 적용됩니다.'],
  ['아군 공격력 추가 +1','기병(9 OP) 모집이 가능해집니다.'],
  ['아군 공격력 추가 +1','공성대(10 OP) 모집이 가능해집니다.']
 ],
 defense:[
  ['부대의 휴식 회복량 +1','휴식(행동 1회) 시 체력을 더 회복합니다.'],
  ['부대 방어력 보너스 +1','본진이 받는 공격 피해 -1, 휴식 회복량 추가 +1.'],
  ['휴식 회복량 추가 +1','방어력 +1·본진 피해 -1 효과는 유지됩니다.']
 ],
 science:[
  ['이후 연구 OP 비용 -1','연구 비용의 최소값은 3 OP입니다.'],
  ['이후 연구 OP 비용 추가 -1','모든 아군 부대의 시야가 1칸 넓어집니다.'],
  ['이후 연구 OP 비용 추가 -1','늘어난 시야는 유지되며 연구 비용은 최소 3 OP입니다.']
 ]
};
const SUMMARIES={
 economy:['초반부터 매 라운드 수입을 안정적으로 확보합니다.','넓어진 경제력으로 부대와 거점에 더 많이 투자합니다.','경제 연구의 수입 보너스를 완성합니다.'],
 military:['모든 부대가 더 강한 공격을 가합니다.','강한 이동 부대인 기병을 모집할 수 있습니다.','공성대를 모집하고 공격 보너스를 완성합니다.'],
 defense:['부대가 쉬면서 더 많이 회복합니다.','전선을 버티고 본진을 더 단단히 지킵니다.','부대 휴식 효율을 한 단계 더 올립니다.'],
 science:['앞으로 연구를 더 저렴하게 진행합니다.','탐험 시야를 넓히고 연구 비용을 더 줄입니다.','남은 기술을 더욱 저렴하게 연구합니다.']
};
export function researchDetail(state,team,branch,tier){
 if(!BRANCHES[branch]||!Number.isInteger(tier)||tier<1||tier>3)throw Error('존재하지 않는 연구입니다.');
 if(!UNIVERSITY[team])throw Error('존재하지 않는 대학입니다.');
 const current=level(state,team,branch),gold=state[UNIVERSITY[team].bank];
 const complete=tier<=current,next=tier===current+1,locked=tier>current+1;
 const status=complete?'complete':locked?'locked':gold<(technologyCost(state,team,branch)??Infinity)?'insufficient':'available';
 // Future-tier cost is only an estimate; later science tech can reduce it.
 const estimated=Math.max(3,5+(tier-1)*6-(team==='ally'?2:0)-level(state,team,'science'));
 const cost=next?technologyCost(state,team,branch):complete?null:estimated;
 return {
  id:branch+'-'+tier,branch,tier,name:BRANCHES[branch].steps[tier-1],
  branchName:BRANCHES[branch].name,subtitle:BRANCH_SUBTITLE[branch],
  summary:SUMMARIES[branch][tier-1],effects:EFFECTS[branch][tier-1],
  icon:branch,status,cost,level:current,gold,
  statusLabel:{complete:'연구 완료',available:'연구 가능',insufficient:'OP 부족',locked:'선행 연구 필요'}[status],
  costLabel:complete?'완료':locked?'예상 '+estimated+' OP':String(cost)+' OP',
  canPurchase:status==='available'
 };
}
export function researchCatalog(state,team){
 return Object.keys(BRANCHES).map(branch=>({
  branch,title:BRANCHES[branch].name,subtitle:BRANCH_SUBTITLE[branch],
  nodes:[1,2,3].map(tier=>researchDetail(state,team,branch,tier))
 }));
}
function icon(branch,className=''){
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 svg.setAttribute('viewBox','0 0 96 104');
 svg.setAttribute('class','seq-research-symbol '+className);
 svg.setAttribute('aria-hidden','true');
 svg.innerHTML='<g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">'+SYMBOLS[branch]+'</g>';
 return svg;
}
function el(tag,cls='',txt=null){
 const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==null)e.textContent=txt;return e;
}
export function createResearchPanel({dialog,getState,onPurchase,isBusy=()=>false}){
 let selected='economy-1';
 const tree=dialog.querySelector('#seqTechOptions');
 const detail=dialog.querySelector('#seqTechDetail');
 if(!tree||!detail)throw Error('연구 화면 구성요소가 없습니다.');
 function render(){
  const s=getState(),team=s.playerTeam,catalog=researchCatalog(s,team);
  tree.replaceChildren();
  for(const row of catalog){
   const item=el('div','seq-research-row');
   const heading=el('div','seq-research-row-head');
   heading.append(icon(row.branch,'seq-research-branch-icon'),
      el('div','seq-research-row-label',row.title));
   item.append(heading);
   const track=el('div','seq-research-track');
   for(const node of row.nodes){
    const button=el('button','seq-research-node '+node.status);
    button.type='button';button.dataset.node=node.id;
    button.classList.toggle('selected',selected===node.id);
    button.setAttribute('aria-pressed',String(selected===node.id));
    const top=el('span','seq-research-node-num',String(node.tier).padStart(2,'0'));
    const title=el('strong','',node.name),stateText=el('small','',node.statusLabel);
    button.append(top,title,stateText);
    button.onclick=()=>{selected=node.id;render();};
    track.append(button);
    if(node.tier<3)track.append(el('span','seq-research-link'));
   }
   item.append(track);tree.append(item);
  }
  let [branch,num]=selected.split('-');
  if(!BRANCHES[branch]){branch='economy';num='1';}
  const info=researchDetail(s,team,branch,Number(num));
  detail.replaceChildren();
  const art=el('div','seq-research-art art-'+branch);
  const picture=el('div','seq-research-illustration');
  picture.append(icon(branch,'seq-research-big-icon'));art.append(picture);
  const body=el('div','seq-research-detail-body');
  body.append(el('span','seq-research-overline',info.branchName+' / '+String(info.tier).padStart(2,'0')),
    el('h3','',info.name),
    el('p','seq-research-summary',info.summary),
    el('h4','seq-research-benefit-title','실제 게임 효과'));
  const effects=el('ul','seq-research-benefits');
  for(const effect of info.effects)effects.append(el('li','',effect));
  body.append(effects);
  const bottom=el('div','seq-research-detail-bottom');
  const cost=el('div','seq-research-cost');
  cost.append(el('span','',info.status==='locked'?'예상 비용':info.status==='complete'?'연구 상태':'연구 비용'),
    el('strong','',info.costLabel));
  const action=el('button','seq-research-purchase',info.status==='complete'?'연구 완료':info.status==='locked'?'선행 연구 필요':info.status==='insufficient'?'OP가 부족합니다':'연구하기');
  action.type='button';action.disabled=!info.canPurchase||isBusy()||!!s.result;
  action.onclick=()=>{
   const current=researchDetail(getState(),getState().playerTeam,branch,info.tier);
   if(!current.canPurchase||isBusy())return;
   const ok=onPurchase(branch);
   if(ok){selected=branch+'-'+Math.min(3,info.tier+1);render();}
  };
  bottom.append(cost,action);
  body.append(bottom);
  const footnote=el('p','seq-research-footnote',
   info.status==='locked'?'앞 단계 연구를 완료하면 구입할 수 있습니다. 미래 비용은 현재 할인 기준 예상치입니다.':
   info.status==='complete'?'이 단계의 효과는 이미 적용 중입니다.':
   info.status==='insufficient'?'현재 OP '+info.gold+' · 라운드 수입을 모은 뒤 연구할 수 있습니다.':
   '효과는 OP를 지불한 즉시 적용됩니다.');
  body.append(footnote);
  detail.append(art,body);
 }
 function open(){
  const s=getState(),team=s.playerTeam;
  const first=researchCatalog(s,team).flatMap(r=>r.nodes).find(x=>x.status==='available')||
    researchCatalog(s,team).flatMap(r=>r.nodes).find(x=>x.status==='insufficient');
  selected=first?.id??'economy-1';
  render();if(!dialog.open)dialog.showModal();
 }
 return {open,refresh:render,close:()=>dialog.close()};
}
