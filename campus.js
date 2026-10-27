import * as T from './vendor/three.module.js';

export function makeCampus(data) {
  const group=new T.Group(),picks=[];
  const points=[...data.buildings.flatMap(b=>b.o),...data.campus.flat()];
  const minX=Math.min(...points.map(p=>p[0])),maxX=Math.max(...points.map(p=>p[0]));
  const minZ=Math.min(...points.map(p=>p[1])),maxZ=Math.max(...points.map(p=>p[1]));
  const cx=(minX+maxX)/2,cz=(minZ+maxZ)/2,scale=4.13/Math.max(maxX-minX,maxZ-minZ);
  const local=(x,z)=>[(x-cx)*scale,(z-cz)*scale];
  const altitudes=data.terrain.dm.map(n=>n/10),minAltitude=Math.min(...altitudes),maxAltitude=Math.max(...altitudes);
  // Normalize real-world elevation to shallow board terrain; no raised plinth.
  const ground=(h,x=0,z=0)=>{const normalized=Math.min(1,Math.max(0,(h-minAltitude)/Math.max(1,maxAltitude-minAltitude)));const edge=Math.max(Math.abs(x),Math.abs(z))/2.12;return (0.02+normalized*.135)*Math.max(0,1-Math.pow(Math.min(1,edge),6));};
  function elevation(x,z){const t=data.terrain,fx=Math.max(0,Math.min(t.nx-1,(x-t.x0)/t.step)),fz=Math.max(0,Math.min(t.nz-1,(z-t.z0)/t.step));const ix=Math.min(t.nx-2,Math.floor(fx)),iz=Math.min(t.nz-2,Math.floor(fz)),a=fx-ix,b=fz-iz;const at=(xx,zz)=>t.dm[zz*t.nx+xx]/10;return (at(ix,iz)*(1-a)+at(ix+1,iz)*a)*(1-b)+(at(ix,iz+1)*(1-a)+at(ix+1,iz+1)*a)*b;}
  const mats=new Map();function material(c){if(!mats.has(c))mats.set(c,new T.MeshStandardMaterial({color:c,roughness:.9}));return mats.get(c);}
  // A single uniform horizontal scale keeps every building footprint and relative position.
  const positions=[],colors=[],indices=[],steps=40,half=2.13;
  for(let j=0;j<=steps;j++)for(let i=0;i<=steps;i++){const x=-half+i/steps*half*2,z=-half+j/steps*half*2,h=elevation(x/scale+cx,z/scale+cz);positions.push(x,ground(h,x,z),z);const c=new T.Color('#8da977').lerp(new T.Color('#c4ce9a'),Math.max(0,Math.min(1,(100-h)/70)));colors.push(c.r,c.g,c.b);}
  for(let j=0;j<steps;j++)for(let i=0;i<steps;i++){const a=j*(steps+1)+i;indices.push(a,a+steps+1,a+1,a+1,a+steps+1,a+steps+2);}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();const land=new T.Mesh(geo,new T.MeshStandardMaterial({vertexColors:true,roughness:1,side:T.DoubleSide}));land.receiveShadow=true;group.add(land);
  const shapeFor=ring=>new T.Shape(ring.map(([x,z])=>{const p=local(x,z);return new T.Vector2(p[0],-p[1]);}));
  for(const [index,b] of data.buildings.entries()){
    const shape=shapeFor(b.o);for(const hole of b.ho??[])shape.holes.push(new T.Path(hole.map(([x,z])=>{const p=local(x,z);return new T.Vector2(p[0],-p[1]);})));
    const h=Math.max(2,b.h)*scale*1.08;const center=b.o.reduce((acc,point)=>[acc[0]+point[0],acc[1]+point[1]],[0,0]).map(v=>v/b.o.length);const loc=local(...center),y=ground(b.g,loc[0],loc[1]);const geometry=new T.ExtrudeGeometry(shape,{depth:h,bevelEnabled:false,steps:1});geometry.rotateX(-Math.PI/2);
    const hanok=/명륜당|대성전|동재|서재|동무|서무|비천당|문$|각$|정록청|존경각|향관청|제기고/.test(b.n??'');
    const body=new T.Mesh(geometry,material(hanok?'#d8c8aa':b.fc??'#e5dfc8'));body.position.y=y;body.castShadow=true;body.receiveShadow=true;body.userData.building={...b,index};group.add(body);picks.push(body);
    const roofGeo=new T.ShapeGeometry(shape);roofGeo.rotateX(-Math.PI/2);const roof=new T.Mesh(roofGeo,material(hanok?'#466769':b.rc??'#9ea99c'));roof.position.y=y+h+.001;roof.userData.building=body.userData.building;group.add(roof);picks.push(roof);
    const edges=new T.LineSegments(new T.EdgesGeometry(geometry,35),new T.LineBasicMaterial({color:'#788375',transparent:true,opacity:.35}));edges.position.y=y;group.add(edges);
    if(hanok){const xs=b.o.map(p=>p[0]),zs=b.o.map(p=>p[1]),w=(Math.max(...xs)-Math.min(...xs))*scale,d=(Math.max(...zs)-Math.min(...zs))*scale;const mid=local((Math.min(...xs)+Math.max(...xs))/2,(Math.min(...zs)+Math.max(...zs))/2);if(w>.025&&d>.025){const ridge=new T.Mesh(new T.BoxGeometry(w,.009,.012),material('#365154'));ridge.position.set(mid[0],y+h+.012,mid[1]);group.add(ridge);}}
  }
  for(const road of data.roads){const ps=road.p.filter(([x,z])=>Math.abs((x-cx)*scale)<half&&Math.abs((z-cz)*scale)<half).map(([x,z])=>{const p=local(x,z);return new T.Vector3(p[0],ground(elevation(x,z),p[0],p[1])+.008,p[1]);});if(ps.length>1)group.add(new T.Line(new T.BufferGeometry().setFromPoints(ps),new T.LineBasicMaterial({color:'#d9d2b7'})));}
  const trees=data.trees.filter((p,i)=>i%10===0&&Math.abs((p[0]-cx)*scale)<1.56&&Math.abs((p[1]-cz)*scale)<1.56);const treeMesh=new T.InstancedMesh(new T.ConeGeometry(.022,.065,5),material('#427357'),trees.length);const dummy=new T.Object3D();trees.forEach(([x,z,s],i)=>{const p=local(x,z);dummy.position.set(p[0],ground(elevation(x,z),p[0],p[1])+.032,p[1]);dummy.scale.setScalar(Math.min(1.8,Math.max(.65,s??1)));dummy.updateMatrix();treeMesh.setMatrixAt(i,dummy.matrix)});treeMesh.castShadow=true;group.add(treeMesh);
  group.userData={buildingCount:data.buildings.length,bounds:{minX,maxX,minZ,maxZ},scale};
  return {group,picks};
}
