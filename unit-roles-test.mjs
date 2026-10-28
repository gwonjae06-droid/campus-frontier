import assert from 'node:assert/strict';
import {matchupBonus} from './unit-roles.js';
import {createSequentialGame,applySequentialAction,previewAttack,endSequentialRound} from './sequential-mode.js';
for(const [a,b] of [['infantry','cavalry'],['scout','siege'],['cavalry','scout']]){
 assert.equal(matchupBonus({kind:a},{kind:b}),2);
 const s=createSequentialGame();const u=s.units.find(u=>u.id==='a1'),v=s.units.find(u=>u.id==='e1');u.kind=a;u.x=10;u.z=10;v.kind=b;v.x=10;v.z=11;
 const target={kind:'unit',id:v.id},p=previewAttack(s,'ally',u.id,target);assert.equal(p.matchup,2);
 const r=applySequentialAction(s,{type:'attack',id:u.id,target});assert.equal(r.state.units.find(x=>x.id===v.id)?.hp??0,p.remainingHp);
}
assert.equal(matchupBonus({kind:'siege'},{kind:'base'}),3);
assert.equal(matchupBonus({kind:'infantry'},{kind:'infantry'}),0);
for(const playerTeam of ['ally','enemy','rival']){
 let s=createSequentialGame({playerTeam});const bank={ally:'gold',enemy:'enemyGold',rival:'rivalGold'}[playerTeam];s[bank]=100;
 assert.ok(applySequentialAction(s,{type:'recruit',kind:'siege'}).error);
 s.technologies[playerTeam].military=3;
 for(const kind of ['cavalry','siege']){const r=applySequentialAction(s,{type:'recruit',kind});assert.ok(!r.error,r.error);const u=r.state.units.at(-1);assert.equal(u.kind,kind);assert.ok(r.state.acted.includes(u.id));s=r.state;}
 assert.deepEqual(endSequentialRound(s),endSequentialRound(JSON.parse(JSON.stringify(s))),'save roundtrip remains deterministic');
}
console.log('PASS: counter damage, exact previews, siege bonus, elite recruitment and save determinism');
