import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TECHS} from './growth.js';
import {MIN_PITCH,MAX_PITCH,orbitPosition} from './camera.js';

const html=readFileSync('index.html','utf8');
const game=readFileSync('game.js','utf8');
const board=readFileSync('board.js','utf8');
const style=readFileSync('tactical-hud-v11.css','utf8');
assert.ok(!html.includes('id="selection"'));
assert.ok(!html.includes('class="mission"'));
assert.ok(!html.includes('작전 목표')&&!html.includes('선택 정보'));
assert.ok(html.includes('각 대학은 자신의 캠퍼스에서 유대를 다진다.'));
assert.ok(html.includes('다른 대학의 지배만은 결코 용납할 수 없다.'));
assert.ok(!html.includes('id="viewToggle"'));
assert.ok(html.includes('id="pitch"')&&html.includes('id="zoomRange"'));
assert.ok(style.includes('body:not(.camera-open) .view-panel{display:grid!important}'));
assert.ok(game.includes('function selection(title,body){toast('));

const placements=Object.keys(TECHS);
assert.equal(placements.length,12);
for(const id of placements)assert.ok(game.includes(`${id}:[`),`missing tree placement: ${id}`);
assert.ok(game.includes('createElementNS')&&game.includes('skill-link'));
assert.ok(style.includes('grid-template-columns:repeat(3,'));
for(const key of ['.skill-node.locked','.skill-node.active','.skill-node.completed','.skill-link.completed'])
 assert.ok(style.includes(key),`missing visual state ${key}`);
for(const [id,t] of Object.entries(TECHS))if(t.requires){
 assert.ok(TECHS[t.requires],`missing prerequisite for ${id}`);
 assert.ok(game.includes('tech.requires')&&game.includes('hasTech(state'),`connector and tech unlock state for ${id}`);
}

// Ray-camera invariant: in every legal pitch camera is outside the fog
// prism, which extends from -0.3 to 9.1, fully enclosing terrain.
const yTop=.025+.075/2,yBottom=.025-.075/2;
assert.ok(yBottom<0);
assert.ok(yTop<orbitPosition(0,MIN_PITCH).y);
assert.ok(yTop<orbitPosition(0,MAX_PITCH).y);
assert.ok(board.includes('BoxGeometry(1.108,.075,1.108)'));
assert.ok(board.includes('for(const [k,g] of groundTiles)'));
assert.ok(board.includes('fog.frustumCulled=false'));
assert.ok(board.includes('transparent:false'));
assert.ok(board.includes('makeRivalCampus'));
assert.ok(board.includes('coord(3.5)'));
assert.ok(!board.includes('BoxGeometry(1.107,9.4,1.107)'));
assert.ok(game.includes('function treePosition(id)'));
assert.ok(board.includes('helper.position.set(coord(x),.025,coord(z))'));
assert.ok(board.includes('depthWrite:true'));
assert.ok(board.includes('visibleTiles(state,viewer)'));
console.log('PASS: concise rivalry HUD, 12-tech connected skill tree, camera controls without button, volumetric fog geometry');
