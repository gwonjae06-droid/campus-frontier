import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {UNIVERSITIES,initialDuel,legalActions,applyAction,chooseAiAction,SIZE,OUTPOSTS,matchScore} from './arena-engine.js';
import {blankProfile,recordMatch,practiceTier,profileStats,localUniversityTiers,readProfile,PROFILE_KEY} from './arena-ranking.js';

assert.equal(SIZE,9);
assert.equal(OUTPOSTS.length,3);
assert.equal(Object.keys(UNIVERSITIES).length,3);
for(const school of Object.keys(UNIVERSITIES))assert.ok(UNIVERSITIES[school].name);
let state=initialDuel('ai');
assert.equal(state.turn,0);
assert.equal(state.baseHP[0],state.baseHP[1]);
assert.equal(state.units.filter(u=>u.team===0).length,2);
assert.equal(state.units.filter(u=>u.team===1).length,2);
const firstMoves=legalActions(state);
assert.ok(firstMoves.some(a=>a.type==='pass'));
assert.ok(firstMoves.some(a=>a.type==='move'));
assert.ok(firstMoves.some(a=>a.type==='recruit'&&a.kind==='scout'));
assert.throws(()=>applyAction(state,{type:'move',unit:1,x:8,y:8}));
const first=firstMoves.find(a=>a.type==='move'&&a.unit===1);
let second=applyAction(state,first);
assert.equal(second.turn,1);assert.equal(second.ply,1);assert.equal(second.round,1);
assert.equal(state.turn,0,'actions do not mutate original state');
const ai=chooseAiAction(second);
assert.ok(legalActions(second).some(a=>JSON.stringify(a)===JSON.stringify(ai)),'AI always selects a legal action');
second=applyAction(second,ai);
assert.equal(second.turn,0);assert.equal(second.round,2);
assert.ok(second.stars[0]>=4,'income increases after both sides play');
assert.equal(matchScore(second).length,2);

// Manual attacking a base with a unit adjacent to that base must eventually end the match.
const base=initialDuel('local');
base.units=[{id:1,team:0,kind:'guard',hp:3,x:7,y:4}];
base.turn=0;
for(let k=0;k<6;k++){
 const attack=legalActions(base).find(a=>a.type==='base');
 assert.ok(attack);
 const next=applyAction(base,attack);
 base.units=next.units;base.baseHP=next.baseHP;base.winner=next.winner;
 base.turn=0;base.ply=next.ply;base.round=next.round;
}
assert.equal(base.winner,0);
assert.deepEqual(legalActions(base),[]);

// Capture and remember an outpost, same rules for both universities.
const cap=initialDuel('local');
cap.units=[{id:1,team:0,kind:'guard',hp:3,x:2,y:3}];
cap.turn=0;
const capture={type:'move',unit:1,x:2,y:2};
assert.ok(legalActions(cap).some(a=>JSON.stringify(a)===JSON.stringify(capture)));
const captured=applyAction(cap,capture);
assert.equal(captured.owner['2,2'],0);
assert.equal(captured.turn,1);
const saved=JSON.parse(JSON.stringify(captured));
assert.equal(saved.owner['2,2'],0);

let profile=blankProfile();
assert.equal(profile.practiceRating,1000);
assert.equal(profileStats(profile).main,null);
assert.ok(localUniversityTiers(profile).every(v=>v.tier==='표본 부족'));
profile=recordMatch(profile,{mode:'ai',school:'skku',opponent:'korea',result:'win'});
profile=recordMatch(profile,{mode:'ai',school:'skku',opponent:'korea',result:'win'});
profile=recordMatch(profile,{mode:'ai',school:'skku',opponent:'yonsei',result:'lose'});
assert.equal(profile.practiceRating,1022);
assert.equal(profileStats(profile).main,'skku');
assert.equal(localUniversityTiers(profile).find(x=>x.school==='skku').tier,'A');
const rating=profile.practiceRating;
profile=recordMatch(profile,{mode:'online',school:'yonsei',opponent:'korea',result:'win'});
profile=recordMatch(profile,{mode:'local',school:'yonsei',opponent:'korea',result:'lose'});
assert.equal(profile.practiceRating,rating,'friendly PvP must not change practice rating');
assert.equal(profileStats(profile).main,'skku');
const st={getItem:k=>k===PROFILE_KEY?JSON.stringify(profile):null};
assert.equal(readProfile(st).practiceRating,rating);
assert.ok(practiceTier(rating).includes('연습생'));
assert.ok(practiceTier(1600).includes('마스터'));

const html=readFileSync('index.html','utf8'),app=readFileSync('arena-app.js','utf8'),peer=readFileSync('arena-peer.js','utf8'),css=readFileSync('arena.css','utf8');
assert.ok(html.includes('id="arenaRoot"')&&html.includes('arena-app.js?v=geometry-v21'));
assert.ok(html.includes('game.js?v=geometry-v21'),'original 3D mode must remain accessible');
assert.ok(!html.includes('<script type="module" src="game.js?v=geometry-v21"'),'load classic 3D lazily for performance');
for(const x of ['ai-setup','local-setup','online-setup','renderRank','renderBattle','sendChat','data-chat-input','createDuelPeer'])assert.ok(app.includes(x),'missing '+x);
assert.ok(app.includes("await import('./game.js?v=geometry-v21')"));
assert.ok(peer.includes('RTCPeerConnection')&&peer.includes('createDataChannel')&&peer.includes('onmessage'));
assert.ok(!app.includes("officialRating"),'no fake official leaderboard');
assert.ok(css.includes('@media(max-width:800px)'));
console.log('PASS: balanced 1v1 duel PvE and local PvP, AI legal play, outpost capture, result, transparent local ranking, safe text chat, optional WebRTC P2P and retained classic mode');
