import {readyUnits} from './tactical-controls.js?v=44';
import {stats} from './simulation.js?v=18';

// A compact, keyboard-accessible roster. Only the player's own units are listed.
export function createTacticalPanel(root,{getState,onSelect,onNext,onEnd,isBusy}){
 const tools=document.createElement('section');tools.id='seqTactics';tools.setAttribute('aria-label','부대 지휘');
 tools.innerHTML=`<button id="seqNext" title="다음 미행동 부대 (N)">다음 부대</button><button id="seqRosterToggle" aria-expanded="false" aria-controls="seqRoster">부대 목록</button><div id="seqRoster" hidden></div>`;
 root.append(tools);
 const next=tools.querySelector('#seqNext'),toggle=tools.querySelector('#seqRosterToggle'),list=tools.querySelector('#seqRoster');
 const dialog=document.createElement('dialog');dialog.id='seqEndCheck';dialog.setAttribute('aria-labelledby','seqEndTitle');
 dialog.innerHTML=`<h2 id="seqEndTitle">아직 행동할 부대가 있습니다</h2><p id="seqEndSummary"></p><div><button id="seqKeepPlaying" autofocus>부대 확인</button><button id="seqEndAnyway">그래도 턴 종료</button></div>`;
 root.append(dialog);
 next.onclick=onNext;
 toggle.onclick=()=>{list.hidden=!list.hidden;toggle.setAttribute('aria-expanded',String(!list.hidden));};
 dialog.querySelector('#seqKeepPlaying').onclick=()=>{dialog.close();onNext();};
 dialog.querySelector('#seqEndAnyway').onclick=()=>{dialog.close();onEnd();};
 function requestEnd(){
  const state=getState();if(isBusy()||state.result)return;
  const ready=readyUnits(state);
  if(!ready.length){onEnd();return;}
  dialog.querySelector('#seqEndSummary').textContent=`${ready.length}개 부대가 아직 이동·공격·휴식할 수 있습니다. 턴을 끝내면 남은 행동은 이월되지 않습니다.`;
  if(!dialog.open)dialog.showModal();
 }
 function render(state,selected){
  const ready=readyUnits(state),busy=isBusy();
  next.textContent=`다음 부대 · ${ready.length} 대기`;
  next.disabled=busy||!ready.length;toggle.disabled=busy;
  tools.setAttribute('aria-busy',String(busy));
  list.replaceChildren();
  for(const u of state.units.filter(u=>u.team===state.playerTeam)){
   const button=document.createElement('button');button.type='button';button.disabled=busy||!!state.result;
   button.setAttribute('aria-pressed',String(u.id===selected));
   button.textContent=`${stats(u).name} · ${u.hp}/${stats(u).hp} HP · ${state.acted.includes(u.id)?'완료':'대기'}`;
   button.onclick=()=>onSelect(u.id);list.append(button);
  }
  if(!list.children.length)list.textContent='남은 부대가 없습니다.';
 }
 return {render,requestEnd};
}
