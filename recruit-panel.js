import {RECRUITS} from './unit-roles.js?v=45';
import {stats} from './simulation.js?v=18';
import {UNIVERSITY} from './sequential-mode.js?v=45';
export function createRecruitPanel(root,{getState,onRecruit,isBusy}){
 const dialog=document.createElement('dialog');dialog.id='seqBarracks';dialog.setAttribute('aria-labelledby','seqBarracksTitle');
 dialog.innerHTML='<h2 id="seqBarracksTitle">병력 편성</h2><p>연구와 병과 상성으로 나만의 부대를 구성하세요. 새 부대는 다음 라운드부터 행동합니다.</p><div id="seqRecruitOptions"></div><p id="seqRecruitStatus" role="status"></p><button id="seqCloseBarracks">닫기</button>';
 root.append(dialog);
 const list=dialog.querySelector('#seqRecruitOptions');
 function render(){
  const s=getState(),tier=s.technologies[s.playerTeam].military,gold=s[UNIVERSITY[s.playerTeam].bank];
  list.replaceChildren();
  for(const [kind,info] of Object.entries(RECRUITS)){
   const locked=tier<info.tier,button=document.createElement('button');button.type='button';
   button.disabled=isBusy()||!!s.result||locked||gold<info.cost;
   const title=document.createElement('strong');title.textContent=info.name+' · '+info.cost+' OP';
   const role=document.createElement('span');role.textContent=info.role;
   const detail=document.createElement('small');const unit=stats({kind});detail.textContent=`체력 ${unit.hp} · 공격 ${unit.attack} · 이동 ${unit.move} · 사거리 ${unit.range??1}`;
   const status=document.createElement('small');status.textContent=locked?`군사 연구 ${info.tier}단계 필요`:gold<info.cost?'OP 부족':'모집 가능';
   button.append(title,role,detail,status);button.onclick=()=>{if(onRecruit(kind)){dialog.querySelector('#seqRecruitStatus').textContent=info.name+' 모집 완료';render();}else dialog.querySelector('#seqRecruitStatus').textContent='모집하지 못했습니다. 부대 상한이나 출전 공간을 확인하세요.';};list.append(button);
  }
 }
 dialog.querySelector('#seqCloseBarracks').onclick=()=>dialog.close();
 return {open(){render();dialog.querySelector('#seqRecruitStatus').textContent='';dialog.showModal();}};
}
