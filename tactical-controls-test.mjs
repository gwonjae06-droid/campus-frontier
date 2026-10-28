import assert from 'node:assert/strict';
import {createSequentialGame,applySequentialAction,endSequentialRound} from './sequential-mode.js';
import {readyUnits,nextReadyUnit,attackChoices} from './tactical-controls.js';
for(const playerTeam of ['ally','enemy','rival']){
 const s=createSequentialGame({playerTeam,seed:44}),snapshot=structuredClone(s);
 const ready=readyUnits(s);assert.equal(ready.length,2);assert.ok(ready.every(u=>u.team===playerTeam));
 assert.equal(nextReadyUnit(s,null).id,ready[0].id);
 assert.equal(nextReadyUnit(s,ready[0].id).id,ready[1].id);
 assert.equal(nextReadyUnit(s,ready[1].id).id,ready[0].id);
 const spent=applySequentialAction(s,{type:'guard',id:ready[0].id}).state;
 assert.equal(nextReadyUnit(spent,ready[0].id).id,ready[1].id);
 const allSpent=applySequentialAction(spent,{type:'guard',id:ready[1].id}).state;
 assert.equal(nextReadyUnit(allSpent,null),null);
 assert.equal(readyUnits(endSequentialRound(allSpent).state).length,2);
 assert.deepEqual(s,snapshot,'navigation projections are pure');
 s.result='victory';assert.deepEqual(readyUnits(s),[]);
}
const s=createSequentialGame({seed:44});
assert.deepEqual(attackChoices(s,'a1'),[],'unseen enemies are not exposed');
const a=s.units.find(u=>u.id==='a1'),e=s.units.find(u=>u.id==='e1');
a.x=10;a.z=10;e.x=10;e.z=11;e.hp=1;
const choice=attackChoices(s,a.id).find(c=>c.target.id===e.id);
assert.ok(choice.defeat);assert.equal(choice.remainingHp,0);assert.match(choice.label,/고려/);
const hit=applySequentialAction(s,{type:'attack',id:a.id,target:choice.target});
assert.ok(!hit.error);assert.ok(!hit.state.units.some(u=>u.id===e.id));
assert.deepEqual(attackChoices(hit.state,a.id),[],'spent attacker cannot attack twice');
assert.ok(applySequentialAction(hit.state,{type:'attack',id:a.id,target:choice.target}).error,'stale target rejected by rules');
const otherTurn=structuredClone(s);otherTurn.phaseTeam='enemy';assert.deepEqual(readyUnits(otherTurn),[]);
console.log('PASS: tactical navigation across three schools; exact lethal previews, fog privacy, stale and spent actions');
