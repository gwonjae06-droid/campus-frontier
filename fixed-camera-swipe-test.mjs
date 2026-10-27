import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CAMERA_MODE,DEFAULT_PITCH,MIN_PITCH,MAX_PITCH,DEFAULT_ANGLE,ANGLE_FREEDOM,clampPitch,clampAngle,orbitPosition,mapHalfSpan} from './camera.js';
import {swipePan,gestureMetrics,pinchZoom,groundPan} from './touch-gestures.js';
const near=(a,b)=>Math.abs(a-b)<1e-8;

assert.equal(CAMERA_MODE,'strategy-tilt');
assert.equal(DEFAULT_PITCH,58);
assert.ok(MIN_PITCH<DEFAULT_PITCH&&DEFAULT_PITCH<MAX_PITCH);
assert.equal(MIN_PITCH,35);
assert.equal(ANGLE_FREEDOM,0);
for(const pitch of [-120,0,45,70,100,NaN]){
 assert.equal(clampPitch(pitch),Number.isFinite(pitch)?Math.max(35,Math.min(75,pitch)):DEFAULT_PITCH);
}
for(const angle of [-100,0,Math.PI/3,100,NaN])assert.equal(clampAngle(angle),DEFAULT_ANGLE);
const ref=orbitPosition(DEFAULT_ANGLE,DEFAULT_PITCH);
assert.notDeepEqual(orbitPosition(0,13),ref);
assert.notDeepEqual(orbitPosition(2,84),ref);
const start={x:0,z:0},bounds={min:-11.2,max:11.2};
const pitch=DEFAULT_PITCH,yaw=DEFAULT_ANGLE,scale=.027;
const right=swipePan(start,120,0,yaw,pitch,scale,bounds);
const left=swipePan(start,-120,0,yaw,pitch,scale,bounds);
assert.ok(near(right.x,-left.x)&&near(right.z,-left.z));
assert.ok(right.x<0&&right.z>0);
const down=swipePan(start,0,120,yaw,pitch,scale,bounds);
const up=swipePan(start,0,-120,yaw,pitch,scale,bounds);
assert.ok(near(down.x,-up.x)&&near(down.z,-up.z));
assert.ok(down.x<0&&down.z<0);
// Reproject into screen coordinates. A 120px swipe moves the map by 120px,
// regardless of screen axis despite isometric ground compression.
const projX=t=>t.x*Math.cos(yaw)-t.z*Math.sin(yaw);
const projY=t=>(-t.x*Math.sin(yaw)-t.z*Math.cos(yaw))*Math.sin(pitch*Math.PI/180);
assert.ok(near(projX(right),-120*scale));
assert.ok(near(projY(down),120*scale));
const edge=swipePan(start,50000,-50000,yaw,pitch,scale,bounds);
assert.ok(edge.x>=bounds.min&&edge.x<=bounds.max&&edge.z>=bounds.min&&edge.z<=bounds.max);
assert.ok(swipePan(start,0,0,yaw,pitch,scale,bounds).x===0);
assert.ok(near(pinchZoom(1,80,160),2));
assert.ok(gestureMetrics([{x:0,y:0},{x:100,y:50}]).distance>100);
for(const aspect of [.6,1,1.78]){
 const span=mapHalfSpan(21,1.12,pitch,yaw,aspect);
 assert.ok(span>0);
}
const board=readFileSync('board.js','utf8'),html=readFileSync('index.html','utf8'),game=readFileSync('game.js','utf8'),css=readFileSync('fixed-isometric-v17.css','utf8');
assert.ok(board.includes('swipePan(down.startTarget,dx,dy,angle,pitch,worldPerPixel'),'single-pointer swipe must pan');
assert.ok(board.includes('swipePan(gesture.startTarget,m.x-gesture.x,m.y-gesture.y'),'two-pointer drag must pan');
assert.ok(board.includes('if(Math.hypot(dx,dy)>10)down.moved=true'),'tap vs swipe threshold');
assert.ok(board.includes("if(!moved){const hit=pick(e);if(hit)onPick(hit);}"),'taps still select targets');
assert.ok(board.includes('zoom=pinchZoom(gesture.startZoom,gesture.distance,m.distance)'),'pinch zoom must persist');
assert.ok(board.includes('function setPitch(')&&!board.includes('function rotate('));
assert.ok(!board.includes('angle=clampAngle(down.a'));
for(const id of ['pitchLow','pitchHigh','rotateLeft','rotateRight'])assert.ok(!html.includes(`id="${id}"`),id+' control must be gone');
for(const id of ['zoomIn','zoomOut','zoomRange','zoomValue','resetView'])assert.ok(html.includes(`id="${id}"`));
assert.ok(game.includes("$('#resetView').onclick")&&game.includes("$('#zoomRange').oninput"));
assert.ok(game.includes("$('#pitch')")&&!game.includes("$('#rotateLeft')"));
assert.ok(html.includes('fixed-isometric-v17.css?v=1'));
assert.ok(css.includes('zoom-control'));
console.log('PASS: adjustable strategy camera, one swipe = one direct map pan, preserved tap/pinch/zoom, clean controls');
