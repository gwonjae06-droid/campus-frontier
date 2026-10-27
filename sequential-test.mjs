import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialState} from './simulation.js';
import {visibleTiles} from './vision.js';
import {createSequentialGame,randomResources,applySequentialAction,endSequentialRound,UNIVERSITY,BRANCHES,technologyCost,cityCost,cityIncome,TEAMS} from './sequential-mode.js';

const old=initialState('standard');
assert.equal(old.version,13,'previous concurrent ruleset remains available');
for(const playerTeam of TEAMS){
 const s=createSequentialGame({playerTeam,seed:1234});
 assert.equal(s.ruleset,'sequential');assert.equal(s.version,14);
 assert.equal(s.phaseTeam,playerTeam);
 assert.equal(s.units.filter(u=>u.team===playerTeam).length,2);
 assert.equal(Object.keys(s.points).length,7);
 assert.equal(Object.keys(s.technologies[playerTeam]).length,4);
 const u=s.units.find(v=>v.team===playerTeam);
 const action=applySequentialAction(s,{type:'guard',id:u.id});
 assert.ok(!action.error);
 assert.ok(action.state.acted.includes(u.id));
 assert.ok(applySequentialAction(action.state,{type:'guard',id:u.id}).error,'one action per unit each phase');
 assert.equal(s.acted.length,0,'input is never mutated');
 const turn=endSequentialRound(action.state);
 assert.ok(!turn.error);assert.equal(turn.state.turn,2);
 assert.equal(turn.state.phaseTeam,playerTeam);
 assert.equal(turn.state.acted.length,0);
 assert.deepEqual(turn.phases.map(p=>p.team),[TEAMS[(TEAMS.indexOf(playerTeam)+1)%3],TEAMS[(TEAMS.indexOf(playerTeam)+2)%3]]);
 assert.ok(turn.events.some(e=>e.type==='income'&&e.team===playerTeam));
}
const [p,q]=[randomResources(12345),randomResources(12345)];
assert.deepEqual(p,q,'same seed always same bonus placement');
assert.notDeepEqual(p,randomResources(98765),'different seed must change some bonus locations');
assert.equal(p.length,10);
assert.ok(p.every(v=>v.claimed===false&&v.amount>=3));
{
 let s=createSequentialGame({seed:33});
 s.units=[{id:'a1',team:'ally',kind:'infantry',hp:10,x:8,z:5}];
 const result=applySequentialAction(s,{type:'move',id:'a1',x:8,z:6});
 assert.ok(!result.error);
 s=result.state;
 assert.equal(s.points['8,6'],'ally','moving on site immediately captures it');
 assert.equal(s.cityLevels['8,6'],1);
 assert.ok(result.events.some(e=>e.type==='capture'));
 assert.ok(applySequentialAction(s,{type:'move',id:'a1',x:8,z:7}).error);
 assert.equal(cityIncome(s,'ally'),7,'level 1 city is worth two OP');
 assert.equal(cityCost(s,'8,6'),5);
 s.gold=20;
 const original=s.gold;
 const upgraded=applySequentialAction(s,{type:'upgrade',site:'8,6'});
 assert.ok(!upgraded.error);s=upgraded.state;
 assert.equal(s.gold,original-5);
 assert.equal(s.cityLevels['8,6'],2);
 assert.equal(cityIncome(s,'ally'),9);
 const upgraded2=applySequentialAction(s,{type:'upgrade',site:'8,6'});
 assert.ok(!upgraded2.error);s=upgraded2.state;
 assert.equal(s.cityLevels['8,6'],3);
 assert.equal(cityCost(s,'8,6'),null);
 assert.equal(cityIncome(s,'ally'),11);
}
{
 let s=createSequentialGame({seed:27});
 const cost=technologyCost(s,'ally','military');
 assert.equal(cost,3,'SKKU science/research talent reduces technology cost');
 const a=applySequentialAction(s,{type:'research',branch:'military'});
 assert.ok(!a.error);
 assert.equal(a.state.technologies.ally.military,1);
 assert.equal(a.state.gold,10-cost);
 assert.equal(s.technologies.ally.military,0);
 assert.ok(applySequentialAction(a.state,{type:'research',branch:'none'}).error);
}
{
 let s=createSequentialGame({playerTeam:'enemy',seed:77});
 const u=s.units.find(v=>v.team==='enemy');
 const a=applySequentialAction(s,{type:'guard',id:u.id});
 assert.ok(!a.error,'Korea must be a fully playable side');
 const b=applySequentialAction(s,{type:'research',branch:'defense'});
 assert.equal(b.state.technologies.enemy.defense,1);
 const ally=applySequentialAction(s,{type:'recruit',kind:'infantry'});
 assert.ok(!ally.error,'Korea recruitment uses Anam gates');
}
{
 let s=createSequentialGame({seed:15});
 s.units=[{id:'a1',team:'ally',kind:'infantry',hp:10,x:8,z:9},
          {id:'e1',team:'enemy',kind:'infantry',hp:10,x:9,z:9}];
 const a=applySequentialAction(s,{type:'attack',id:'a1',target:{kind:'unit',id:'e1'}});
 assert.ok(!a.error,'one click attack applies immediately');
 assert.ok(a.state.units.find(v=>v.id==='e1').hp<10);
 assert.equal(s.units.find(v=>v.id==='e1').hp,10,'immutable state');
}
const html=readFileSync('index.html','utf8'),home=readFileSync('arena-app.js','utf8'),
      ui=readFileSync('sequential-app.js','utf8'),board=readFileSync('board.js','utf8');
assert.ok(html.includes('sequential-v4.css?v=42'));
assert.ok(home.includes('universityChoice')&&home.includes('sequential-app.js?v=41'));
assert.ok(ui.includes('endSequentialRound(')&&ui.includes('applySequentialAction('));
assert.ok(ui.includes('seqCityPanel')&&ui.includes('seqTechOptions'));
assert.ok(board.includes("state.playerTeam??'ally'"));
assert.ok(board.includes('state.cityLevels?.[k]'));
assert.ok(board.includes('state.bonusResources??[]'));
assert.ok(!home.includes("await import('./game.js?v=controls-v23')"),'old simultaneous engine must not launch');
console.log('PASS: sequential 3-faction ordered turns, immediate attacks, growth, OP research, university choices and seeded resources');
