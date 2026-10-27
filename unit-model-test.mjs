import assert from 'node:assert/strict';
import * as T from './vendor/three.module.js';
import {unitModel,TEAM_STYLE} from './unit-model.js';
const mat=color=>new T.MeshBasicMaterial({color});
function add(g,geometry,color,x,y,z){const m=new T.Mesh(geometry,mat(color));m.position.set(x,y,z);g.add(m);return m;}
const box=(g,w,h,d,c,x,y,z)=>add(g,new T.BoxGeometry(w,h,d),c,x,y,z);
const cone=(g,r,h,c,x,y,z,n=5)=>add(g,new T.ConeGeometry(r,h,n),c,x,y,z);
const silhouettes=new Set();
for(const team of Object.keys(TEAM_STYLE)) for(const kind of ['infantry','scout','cavalry','siege']){
 const g=unitModel({id:'test',team,kind},box,cone,mat),bounds=new T.Box3().setFromObject(g),size=bounds.getSize(new T.Vector3());
 assert.equal(g.userData.unitId,'test');assert.equal(g.userData.kind,kind);
 assert.ok(size.x<=1.12&&size.z<=1.12,'unit must fit one tile');
 assert.ok(bounds.min.y>=0&&bounds.max.y<1.5,'unit is grounded and below its badge');
 if(team==='ally')silhouettes.add(JSON.stringify([g.children.length,...size.toArray()]));
}
assert.equal(silhouettes.size,4,'four distinct unit silhouettes');
assert.equal(new Set(Object.values(TEAM_STYLE).map(t=>t.sides)).size,3,'faction shapes distinguish teams without color');
console.log('PASS: all 12 faction/unit models are grounded, fit tiles, and have distinct silhouettes');
