import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialState,emptyPlan,resolveTurn} from './simulation.js';
import {rememberExploration,visibleTiles,exploredTiles,tileKey} from './vision.js';

// Unvisited cells remain shrouded, visited ground must never disappear again.
let s=initialState('standard');
const site='10,10';
assert.equal(visibleTiles(s,'ally').has(site),false);
assert.equal(exploredTiles(s,'ally').has(site),false);
const scout=s.units.find(u=>u.team==='ally'&&u.kind==='scout');
assert.ok(scout);
const original={x:scout.x,z:scout.z};
s.points[site]='enemy';
scout.x=10;scout.z=10;
rememberExploration(s);
assert.ok(visibleTiles(s,'ally').has(site));
assert.ok(exploredTiles(s,'ally').has(site));
assert.equal(s.lastKnownPoints.ally[site],'enemy');
const visitedCount=s.explored.ally.length;
scout.x=original.x;scout.z=original.z;
s.points[site]='rival'; // Changed outside friendly sight; do not leak current control.
s.units.push({id:'hiddenNew',team:'enemy',kind:'infantry',x:10,z:10,hp:10});
rememberExploration(s);
assert.equal(visibleTiles(s,'ally').has(site),false,'scout moved away: no live enemy intel');
assert.equal(exploredTiles(s,'ally').has(site),true,'previously visited terrain remains discovered forever');
assert.equal(s.lastKnownPoints.ally[site],'enemy','banner remains as last seen, not the newly changed owner');
assert.ok(s.explored.ally.length>=visitedCount,'exploration must be monotonic');
assert.equal(s.lastSeen.ally.hiddenNew,undefined,'do not reveal newly arrived enemies from memory');
const restored=JSON.parse(JSON.stringify(s));
rememberExploration(restored);
assert.ok(exploredTiles(restored,'ally').has(site),'knowledge survives save and load');
assert.equal(restored.lastKnownPoints.ally[site],'enemy','last-known control survives save and load');
restored.units.find(u=>u.id===scout.id).x=10;
restored.units.find(u=>u.id===scout.id).z=10;
rememberExploration(restored);
assert.equal(restored.lastKnownPoints.ally[site],'rival','revisiting refreshes last-known ownership');

// Older saved games may have visited cells but no lastKnownPoints property.
const legacy=JSON.parse(JSON.stringify(s));
delete legacy.lastKnownPoints;
rememberExploration(legacy);
assert.ok(legacy.lastKnownPoints.ally && exploredTiles(legacy,'ally').has(site));
assert.equal(legacy.lastKnownPoints.ally[site],undefined,'do not invent outdated ownership when migrating old saves');

const b=readFileSync('board.js','utf8'),g=readFileSync('game.js','utf8'),
      v=readFileSync('vision.js','utf8'),sim=readFileSync('simulation.js','utf8');
assert.ok(b.includes("g.visible=state.gameMode!=='standard'||explored.has(k)"),'render discovered ground when out of sight');
assert.ok(b.includes("if(!explored.has(k)&&"),'only undiscovered tiles get opaque fog');
assert.ok(b.includes("const owner=state.gameMode==='standard'&&!visible.has(k)?state.lastKnownPoints?.ally?.[k]:currentOwner;"));
assert.ok(b.includes("u.team==='ally'||visible.has(tileKey(u.x,u.z))"),'enemy units still require live sight');
assert.ok(g.includes("u.team==='ally'||currentSight"),'clicking known ground must not leak hidden enemies');
assert.ok(g.includes("if(state.gameMode==='standard'&&!discovered&&!currentSight)"),'old exploration remains inspectable');
assert.ok(g.includes("rememberExploration(state)"),'old saves must be reconciled on load');
assert.ok(v.includes('s.lastKnownPoints??='));
assert.ok(sim.includes("vision.js?v=18"),'turn resolution must use the updated exploration recorder');
assert.ok(b.includes("vision.js?v=18"));
assert.ok(g.includes("vision.js?v=18"));
console.log('PASS: permanent explored terrain, fog only on unexplored, live enemy concealment, last-seen flag ownership, old save compatibility');
