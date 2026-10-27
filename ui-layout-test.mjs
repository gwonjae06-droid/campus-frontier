import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync('index.html','utf8');
const game=readFileSync('game.js','utf8');
const css=readFileSync('overlay-ui.css','utf8');
const ids=[...html.matchAll(/\bid="([A-Za-z][A-Za-z0-9_-]*)"/g)].map(x=>x[1]);
assert.equal(new Set(ids).size,ids.length,'duplicate DOM ids');
const wired=[...game.matchAll(/\$\('#([A-Za-z][A-Za-z0-9_-]*)'\)/g)].map(x=>x[1]);
for(const id of new Set(wired))assert.ok(ids.includes(id),`missing DOM element: #${id}`);
for(const id of ['fogStatus','diplomacy','diplomacyDialog','truceEnemy','truceRival','scholarshipResearch','game','panelToggle','intelPanel','rpHud','scoreHud','viewToggle','viewPanel','zoomIn','zoomOut','pitch','zoomRange','resolve','orders','mobilePlan','creditsOpen']){
 assert.ok(ids.includes(id),`missing vital game or overlay element: ${id}`);
}
for(const action of ['attack','guard','capture','heal']){
 assert.ok(html.includes(`data-action="${action}"`),`missing floating ${action} action`);
}
assert.ok(html.includes('overlay-ui.css?v=vision-v10'));
assert.ok(html.includes('game.js?v=vision-v10'));
assert.ok(html.includes('campaign-v10.css?v=vision-v10'));
assert.ok(game.includes('panel-open')&&game.includes('camera-open')&&game.includes('unit-selected'));
assert.ok(css.includes('inset:0!important')&&css.includes('height:100dvh'),'canvas must fill viewport');
assert.ok(css.includes('body:not(.panel-open) aside'));
assert.ok(css.includes('body:not(.camera-open) .view-panel'));
assert.ok(css.includes('@media(max-width:760px)'),'mobile HUD required');

const app=readFileSync('game.js','utf8');
assert.ok(app.includes("initialState('standard')"),'three-way mode must launch by default');
assert.ok(html.includes('id="rivalHP"')&&html.includes('id="rivalBar"'),'third campus HUD missing');

console.log('PASS: full-screen HUD, mobile panels, existing DOM bindings, camera controls and quick actions');
