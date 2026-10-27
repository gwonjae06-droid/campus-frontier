// Single entry point: the 3D campaign is the only playable mode.
const root=document.getElementById('arenaRoot');
const battlefield=document.getElementById('battlefield');
let loading=false,loaded=false,failed=false;
const saved=()=>{try{const s=JSON.parse(localStorage.getItem('campus-frontier-sequential-v4'));return s?.version===14?s:null;}catch{return null;}};
function updateResume(){const s=saved();document.getElementById('resumeNote').textContent=s?`저장된 ${s.turn}/30라운드 · ${({ally:'성균관대',enemy:'고려대',rival:'연세대'})[s.playerTeam]} · 순차턴`:'대학을 선택하고 순차턴 3D 전략전 시작';if(s)document.getElementById('universityChoice').value=s.playerTeam;}
function home(){battlefield.hidden=true;battlefield.inert=true;root.hidden=false;document.body.classList.remove('in-battle');updateResume();document.getElementById('enterBattle').focus();}
async function enter(){
 if(loading)return;if(failed){location.reload();return;}loading=true;const button=document.getElementById('enterBattle');button.disabled=true;button.textContent='전장을 준비하는 중…';
 root.hidden=true;battlefield.hidden=false;battlefield.inert=false;document.body.classList.add('in-battle');
 try{const sequential=await import('./sequential-app.js?v=5');await sequential.enterSequential(document.getElementById('universityChoice').value);loaded=true;}
 catch(error){failed=true;home();document.getElementById('resumeNote').textContent='전장을 불러오지 못했습니다. 새로고침 후 다시 시도하세요.';console.error(error);}
 finally{loading=false;button.disabled=false;button.textContent=failed?'새로고침':'순차턴 3D 전략전 입장';}
}
root.innerHTML=`<div class="olympus-shell"><nav class="temple-nav" aria-label="메인 메뉴"><a href="./" class="temple-brand"><span class="temple-seal">大</span><span>대학전선<small>CAMPUS FRONTIER</small></span></a><span class="edition">THE OLYMPUS EDITION <i>✦</i></span><button id="homeGuide">플레이 안내 ↗</button></nav>
<section class="temple-hero"><div class="hero-copy"><div class="hero-kicker"><span></span> THREE CAMPUSES. ONE FRONTIER.</div><p class="hero-overline">대학의 이름으로,</p><h1>새로운 전선을<br>열다<span>.</span></h1><p class="hero-description">익숙한 캠퍼스가 하나의 문명이 되는 곳.<br>탐험하고, 연구하고, 당신의 전선을 넓히세요.</p><div class="hero-entry"><label class="campus-choose">플레이할 대학교 <select id="universityChoice" aria-label="플레이할 대학교"><option value="ally">성균관대학교 · 인문사회과학캠퍼스</option><option value="enemy">고려대학교 · 안암캠퍼스</option><option value="rival">연세대학교 · 신촌캠퍼스</option></select></label><button id="enterBattle">순차턴 3D 전략전 입장 <span>↗</span></button><p id="resumeNote"></p></div><div class="hero-facts"><div><b>03</b><span>대학 진영</span></div><div><b>30</b><span>순차 턴</span></div><div><b>460</b><span>캠퍼스 건물</span></div></div></div><figure class="temple-art"><img src="assets/olympus.svg" alt="대리석 기둥과 금빛 박공을 가진 올림푸스 신전 일러스트"><figcaption><span>Ⅰ — THE ASSEMBLY</span><span>당신의 캠퍼스, 당신의 문명.</span></figcaption></figure></section>
<section class="campus-lineup" aria-label="전장에 참여하는 대학"><div class="lineup-heading"><span>THE THREE FACTIONS</span><p>세 대학. 서로 다른 전선.</p></div><div class="faction-row"><article><span class="faction-number">01</span><span class="faction-sign skku">성</span><div><h2>성균관대학교</h2><p>인문사회과학캠퍼스 · 56개 건물</p></div><small>PLAYER</small></article><article><span class="faction-number">02</span><span class="faction-sign korea">고</span><div><h2>고려대학교</h2><p>안암캠퍼스 · 172개 건물</p></div><small>AI RIVAL</small></article><article><span class="faction-number">03</span><span class="faction-sign yonsei">연</span><div><h2>연세대학교</h2><p>신촌캠퍼스 · 232개 건물</p></div><small>AI RIVAL</small></article></div></section><div class="temple-footer"><span>비공식 대학 전략 게임 · 싱글플레이</span><span>선택 → 즉시 이동·전투 → AI 차례</span><button id="homeCredits">지도 출처 · 제작 정보</button></div></div>`;
document.getElementById('enterBattle').onclick=enter;document.getElementById('backHome').onclick=home;
document.getElementById('homeGuide').onclick=()=>document.getElementById('welcomeGuide').showModal();
document.getElementById('closeWelcome').onclick=()=>document.getElementById('welcomeGuide').close();
document.getElementById('homeCredits').onclick=()=>document.getElementById('welcomeCredits').showModal();
document.getElementById('closeWelcomeCredits').onclick=()=>document.getElementById('welcomeCredits').close();
updateResume();
