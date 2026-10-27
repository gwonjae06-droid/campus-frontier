import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from './vendor/three.module.js';
import {DEFAULT_ANGLE,DEFAULT_PITCH,MIN_PITCH,MAX_PITCH,mapHalfSpan,orthographicPixelScales} from './camera.js';
import {CAMPUS_TILES,CAMPUS_PLOT_WIDTH,CAMPUS_MODEL_WIDTH,campusTransform,visibleBuildingHeight} from './campus-scale.js';
import {makeCampus} from './campus.js';
import {isCampus,isRivalCampus,isEnemyCampus} from './simulation.js';

assert.equal(DEFAULT_PITCH,58);
assert.ok(MIN_PITCH<DEFAULT_PITCH&&DEFAULT_PITCH<MAX_PITCH);
assert.equal(CAMPUS_TILES,4);
assert.equal(CAMPUS_PLOT_WIDTH,4*1.12);
assert.ok(DEFAULT_PITCH>=MIN_PITCH&&DEFAULT_PITCH<=MAX_PITCH);
for(const [w,h] of [[360,800],[390,844],[480,900],[768,1024],[1024,768],[1280,720],[1920,1080],[2800,980]]){
 for(const pitch of [MIN_PITCH,DEFAULT_PITCH,MAX_PITCH]) for(const zoom of [.7,1.18,1.45,2.5,4.4,7]){
  const {x,y,span}=orthographicPixelScales(21,1.12,pitch,DEFAULT_ANGLE,w,h,zoom);
  assert.ok(Math.abs(x-y)/x<1e-12,`X and Y pixel zoom must agree at ${w}x${h} z=${zoom}`);
  const aspect=w/h;
  const half=mapHalfSpan(21,1.12,pitch,DEFAULT_ANGLE,aspect);
  assert.equal(span,half);
  const worldHalf=21*1.12/2;
  const projected=worldHalf*(Math.abs(Math.cos(DEFAULT_ANGLE))+Math.abs(Math.sin(DEFAULT_ANGLE)));
  assert.ok(span>=projected*Math.sin(pitch*Math.PI/180));
  assert.ok(span*aspect>=projected,'landscape/portrait projection must fit the square evenly');
 }
}
for(const [file,count,testArea] of [
 ['skku-campus.json',56,isCampus],
 ['yonsei-sinchon.json',232,isRivalCampus],
 ['korea-anam.json',172,isEnemyCampus]
]){
 const data=JSON.parse(readFileSync('data/'+file,'utf8'));
 const tf=campusTransform(data),model=makeCampus(data);
 assert.equal(model.group.userData.buildingCount,count);
 assert.ok(Math.abs(tf.worldWidth/tf.worldDepth-tf.sourceAspect)<1e-10,'never independently scale campus X and Z');
 const bounds=new THREE.Box3().setFromObject(model.group);
 assert.ok(bounds.max.x-bounds.min.x<CAMPUS_PLOT_WIDTH,'footprint must fit exactly within four tiles');
 assert.ok(bounds.max.z-bounds.min.z<CAMPUS_PLOT_WIDTH,'footprint must fit exactly within four tiles');
 assert.ok(bounds.min.y>=-.005&&bounds.min.y<=.01,'no lifted ground platform/floating second level');
 assert.equal(Array.from({length:21*21},(_,i)=>testArea(i%21,Math.floor(i/21))).filter(Boolean).length,16);
 const sample=data.buildings.slice(0,50);
 for(const b of sample){
  const xs=b.o.map(x=>x[0]),zs=b.o.map(x=>x[1]);
  const bw=(Math.max(...xs)-Math.min(...xs))*tf.scale;
  const bd=(Math.max(...zs)-Math.min(...zs))*tf.scale;
  const bounded=visibleBuildingHeight(b.h,bw,bd);
  assert.ok(Number.isFinite(bounded)&&bounded>=.11&&bounded<=.82);
  assert.ok(bounded<=visibleBuildingHeight(b.h)+1e-10,'height is bounded, never exaggerated beyond baseline');
 }
 console.log('PASS',file,count,'buildings · uniform XZ · flat surface · 4x4 plot');
}
const board=readFileSync('board.js','utf8'),app=readFileSync('game.js','utf8'),html=readFileSync('index.html','utf8');
assert.ok(board.includes("camera.js?v=22")&&board.includes("campus.js?v=22"));
assert.ok(board.includes('orthographicPixelScales'));
assert.ok(board.includes('defaultZoom()'));
assert.ok(app.includes("board.js?v=23"));
assert.ok(html.includes("game.js?v=controls-v23"));
assert.ok(html.includes('arenaRoot'),'single 3D launcher is available');
console.log('PASS: distortion-free orthographic scaling across 8 aspect ratios and 6 zoom levels');
