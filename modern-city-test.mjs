import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from './vendor/three.module.js';
import {SIZE,terrain,isCampus,isEnemyCampus,isRivalCampus,initialState,emptyPlan,resolveTurn} from './simulation.js';
import {DEFAULT_PITCH,MIN_PITCH,MAX_PITCH,DEFAULT_ANGLE,ANGLE_FREEDOM,clampPitch,clampAngle,mapHalfSpan} from './camera.js';
import {isUniversity,CAMPUS_COLORS,streetPlan,apartmentPlan,addUrbanCell,CITY_ASPHALT} from './urban-city.js';
import {makeCampus} from './campus.js';

assert.equal(DEFAULT_PITCH,56);
assert.deepEqual([MIN_PITCH,MAX_PITCH],[50,62]);
assert.equal(clampPitch(-100),MIN_PITCH);
assert.equal(clampPitch(200),MAX_PITCH);
assert.ok(Math.abs(clampAngle(-100)-(DEFAULT_ANGLE-ANGLE_FREEDOM))<1e-10);
assert.ok(Math.abs(clampAngle(100)-(DEFAULT_ANGLE+ANGLE_FREEDOM))<1e-10);
assert.ok(ANGLE_FREEDOM*180/Math.PI<=8);
for(const aspect of [.5,.7,1,1.78,2.4]){
 const half=mapHalfSpan(SIZE,1.12,DEFAULT_PITCH,DEFAULT_ANGLE,aspect);
 const projectedSide=SIZE*1.12*Math.SQRT2/2;
 assert.ok(half*aspect>=projectedSide,'horizontal map fit, aspect='+aspect);
 assert.ok(half>=projectedSide*Math.sin(DEFAULT_PITCH*Math.PI/180));
}
const screenshotAspect=800/450;
assert.ok(mapHalfSpan(21,1.12,56,Math.PI/4,screenshotAspect)<16,'map should fill more of reference landscape viewport');

assert.equal(CAMPUS_COLORS.campus,'#248453');
assert.equal(CAMPUS_COLORS['enemy-base'],'#a73d52');
assert.equal(CAMPUS_COLORS['rival-base'],'#3265a3');
assert.ok(new Set(Object.values(CAMPUS_COLORS)).size===3);
assert.equal(CITY_ASPHALT,'#374750');
let road=0,apts=0,university=0;
for(let z=0;z<SIZE;z++)for(let x=0;x<SIZE;x++){
 const kind=terrain(x,z);
 const r=streetPlan(x,z,kind),apt=apartmentPlan(x,z,kind);
 assert.ok(!(r&&apt));
 if(isUniversity(kind)){university++;assert.equal(r,null);assert.equal(apt,null);}
 if(['resource','water'].includes(kind)){assert.equal(r,null);assert.equal(apt,null);}
 if(r){road++;assert.ok(r.northSouth||r.eastWest);}
 if(apt){apts++;assert.ok(apt.floors>=4&&apt.floors<=11);}
}
assert.equal(university,48,'three 4x4 school plots');
assert.ok(road>=95,'continuous modern road network');
assert.ok(apts>=20,'recognizable residential districts');

const container=new T.Group();
const mats=new Map();
const mat=color=>{if(!mats.has(color))mats.set(color,new T.MeshBasicMaterial({color}));return mats.get(color);};
const box=(parent,w,h,d,color,x,y,z)=>{const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),mat(color));mesh.position.set(x,y,z);parent.add(mesh);return mesh;};
assert.equal(addUrbanCell(T,container,6,8,'grass',1,2,box,mat),'street');
assert.ok(container.children.length>=3);
const pair=[2,8];let placed=false;
for(let z=0;z<SIZE&&!placed;z++)for(let x=0;x<SIZE&&!placed;x++){
 const kind=terrain(x,z);
 if(apartmentPlan(x,z,kind)){
  const g=new T.Group();
  assert.equal(addUrbanCell(T,g,x,z,kind,0,0,box,mat),'apartments');
  assert.ok(g.children.length>=3);
  placed=true;
 }
}
assert.ok(placed);
for(const [school,file] of [['skku','skku-campus.json'],['yonsei','yonsei-sinchon.json'],['korea','korea-anam.json']]){
 const data=JSON.parse(readFileSync('data/'+file,'utf8'));
 const model=makeCampus(data,school);
 assert.equal(model.group.userData.school,school);
 assert.ok(model.group.userData.worldWidth<=4.12+1e-9);
 assert.ok(model.group.userData.worldDepth<=4.12+1e-9);
}
const board=readFileSync('board.js','utf8'),html=readFileSync('index.html','utf8'),css=readFileSync('modern-city-v16.css','utf8');
assert.ok(board.includes('addUrbanCell(T,cell'));
assert.ok(board.includes('mapHalfSpan(SIZE,1.12,pitch,angle,w/h)'));
assert.ok(board.includes('clampAngle(down.a+dx*.0009)'));
assert.ok(board.includes('pitch=clampPitch(down.p+dy*.035)'));
for(const color of ['#17c779','#ed5669','#66a9ee'])assert.ok(board.includes(color));
for(const text of ['56°','min="50" max="62" value="56"','modern-city-v16.css'])assert.ok(html.includes(text));
assert.ok(css.includes('background:#172934'));
const s=initialState('standard');
const result=resolveTurn(s,emptyPlan(),{}).state;
assert.equal(result.turn,2);
console.log('PASS: saturated isometric modern map, distinguishable 4x4 campuses, road/apartment geometry, stable camera and original turn rules');
