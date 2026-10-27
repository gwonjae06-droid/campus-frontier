import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from './vendor/three.module.js';
import {CAMPUS_TILES,TILE_WORLD_SIZE,CAMPUS_PLOT_WIDTH,CAMPUS_MODEL_WIDTH,campusTransform,visibleBuildingHeight} from './campus-scale.js';
import {makeCampus} from './campus.js';
import {DEFAULT_PITCH,orbitPosition} from './camera.js';
import {isCampus,isRivalCampus,isEnemyCampus} from './simulation.js';

assert.equal(CAMPUS_TILES,4);
assert.equal(CAMPUS_PLOT_WIDTH,TILE_WORLD_SIZE*4);
assert.ok(CAMPUS_MODEL_WIDTH<CAMPUS_PLOT_WIDTH);
assert.equal(DEFAULT_PITCH,58,'default higher camera pitch reduces vertical foreshortening');
assert.ok(Math.sin(DEFAULT_PITCH*Math.PI/180)>Math.sin(46*Math.PI/180));
assert.notEqual(orbitPosition(0,DEFAULT_PITCH).y,orbitPosition(0,46).y,'tilt changes camera height');
assert.equal(visibleBuildingHeight(0),visibleBuildingHeight(12));
assert.equal(visibleBuildingHeight(1000),0.82);
assert.ok(visibleBuildingHeight(20)>visibleBuildingHeight(10));
assert.ok(visibleBuildingHeight(20)<.3);

const eps=1e-9;
for(const [file,count,area] of [
 ['skku-campus.json',56,isCampus],
 ['yonsei-sinchon.json',232,isRivalCampus],
 ['korea-anam.json',172,isEnemyCampus]
]){
 const data=JSON.parse(readFileSync('data/'+file,'utf8'));
 const tf=campusTransform(data);
 assert.ok(tf.scale>0&&Number.isFinite(tf.scale));
 assert.ok(Math.abs(tf.worldWidth/tf.worldDepth-tf.sourceAspect)<eps,'uniform X/Z scale must preserve source aspect');
 assert.ok(tf.worldWidth<=CAMPUS_MODEL_WIDTH+eps&&tf.worldDepth<=CAMPUS_MODEL_WIDTH+eps);
 assert.ok(Math.abs(Math.max(tf.worldWidth,tf.worldDepth)-CAMPUS_MODEL_WIDTH)<eps);
 const first=data.buildings.find(b=>b.o.length>=2&&b.o[0][0]!==b.o[1][0]&&b.o[0][1]!==b.o[1][1]);
 if(first){const [p,q]=first.o;assert.ok(Math.abs(((q[0]-p[0])*tf.scale)/((q[1]-p[1])*tf.scale)-(q[0]-p[0])/(q[1]-p[1]))<eps);}
 const model=makeCampus(data);
 const bounds=new T.Box3().setFromObject(model.group);
 assert.ok(bounds.max.x-bounds.min.x<=CAMPUS_PLOT_WIDTH+eps);
 assert.ok(bounds.max.z-bounds.min.z<=CAMPUS_PLOT_WIDTH+eps);
 assert.ok(bounds.min.y>=-.005,'no raised platform or floating grounds');
 assert.equal(model.group.userData.buildingCount,count);
 assert.ok(Math.abs(model.group.userData.sourceAspect-tf.sourceAspect)<eps);
 assert.ok(Math.abs(model.group.userData.worldWidth-tf.worldWidth)<eps);
 for(const b of data.buildings.slice(0,15))assert.ok(visibleBuildingHeight(b.h)>=.11&&visibleBuildingHeight(b.h)<=.82);
 let cells=0;for(let z=0;z<21;z++)for(let x=0;x<21;x++)if(area(x,z))cells++;
 assert.equal(cells,16,'all campuses must occupy exactly 4x4 tiles');
 console.log('PASS',file,'footprint',tf.worldWidth.toFixed(2),'×',tf.worldDepth.toFixed(2),'preserves',tf.sourceAspect.toFixed(3),'aspect; 4x4 tiles');
}
const board=readFileSync('board.js','utf8'),html=readFileSync('index.html','utf8'),game=readFileSync('game.js','utf8');
for(const fn of ['campusBorder(3.5,3.5','campusBorder(16.5,16.5','campusBorder(16.5,3.5'])
 assert.ok(board.includes(fn),'missing consistent campus boundary: '+fn);
assert.ok(board.includes('CAMPUS_PLOT_WIDTH/2-.065'));
assert.ok(board.includes('s.scale.set(3.65,.642,1)'),'label aspect ratio must not be stretched');
assert.ok(Math.abs(3.65/.642-512/90)<.02);
assert.ok(html.includes('game.js?v=controls-v23'));
assert.ok(html.includes('id="pitchValue"')&&html.includes('id="pitch"'));
assert.ok(game.includes("board.js?v=43"));
assert.ok(board.includes('campus.js?v=22')&&board.includes('camera.js?v=22'));
console.log('PASS: camera angle, label proportions, no independent XZ stretching, uniform 4×4 frames');
