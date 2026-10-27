import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as T from './vendor/three.module.js';
import {unitModel,TEAM_STYLE} from './unit-model.js';
const materials=new Map(),mat=c=>{if(!materials.has(c))materials.set(c,new T.MeshBasicMaterial({color:c}));return materials.get(c);};
const signatures=new Set();
let triangles=0,draws=0;
for(const team of Object.keys(TEAM_STYLE))for(const kind of ['infantry','scout','cavalry','siege']){
 const u=Object.freeze({id:'test',team,kind,hp:10}),saved=JSON.stringify(u);
 const g=unitModel(u,null,null,mat),bounds=new T.Box3().setFromObject(g),size=bounds.getSize(new T.Vector3());
 assert.equal(JSON.stringify(u),saved,'rendering cannot mutate save data');
 assert.equal(g.userData.unitId,u.id);assert.equal(g.userData.kind,kind);
 assert.ok(size.x<=1.12&&size.z<=1.12,'one tile footprint');
 assert.ok(bounds.min.y>=0&&bounds.max.y<(kind==='cavalry'?1.38:1.14),'clear of badges');
 assert.ok(g.children.length<=5,'at most five draw calls per model');
 let count=0;const hash=createHash('sha256');
 for(const m of g.children){
  const positions=m.geometry.attributes.position;
  count+=positions.count/3;
  assert.ok([...positions.array].every(Number.isFinite));
  // Ignore material/color, checking genuine geometry differences for all 12 variants.
  hash.update(Buffer.from(positions.array.buffer));
  assert.equal(m.castShadow,true);
 }
 assert.ok(count<=280,'mobile geometry budget');triangles+=count;draws+=g.children.length;
 signatures.add(hash.digest('hex'));
 const next=unitModel(u,null,null,mat);
 assert.notEqual(g.children[0].geometry,next.children[0].geometry,'independent disposal');
 assert.equal(g.children[0].material,next.children[0].material,'shared board materials');
 g.traverse(m=>m.geometry?.dispose());
 assert.ok(new T.Box3().setFromObject(next).equals(bounds),'cleanup preserves other instances');
 // Raycasting still reaches the group carrying unitId after geometry merging.
 const ray=new T.Raycaster(new T.Vector3(0,3,0),new T.Vector3(0,-1,0));
 next.updateMatrixWorld(true);assert.ok(ray.intersectObject(next,true).length>0);
}
assert.equal(signatures.size,12,'all 12 geometries differ without relying on color');
const legacy=unitModel({id:'old'},null,null,mat);assert.equal(legacy.userData.kind,'infantry');
assert.equal(new Set(Object.values(TEAM_STYLE).map(s=>s.sides)).size,3);
console.log(`PASS: 12 distinct school/class geometries; immutable saves, picking, disposal, badge clearance; ${draws} calls / ${triangles} triangles total`);
