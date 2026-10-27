import * as T from './vendor/three.module.js';
import {campusTransform,CAMPUS_MODEL_WIDTH,visibleBuildingHeight} from './campus-scale.js?v=21';

export function makeCampus(data,school='skku') {
  const themes={
    skku:{ground:'#26764f',highlight:'#459e68',wall:'#d4e5c8',roof:'#226446',forest:'#185738'},
    yonsei:{ground:'#245989',highlight:'#3884b2',wall:'#dbe4ee',roof:'#275788',forest:'#1a5982'},
    korea:{ground:'#862f46',highlight:'#b64e60',wall:'#e8d8d6',roof:'#8a3047',forest:'#783347'}
  };
  const theme=themes[school]??themes.skku;
  const group=new T.Group(),picks=[];
  const {minX,maxX,minZ,maxZ,cx,cz,scale,worldWidth,worldDepth,sourceAspect}=campusTransform(data);
  const local=(x,z)=>[(x-cx)*scale,(z-cz)*scale];
  const altitudes=data.terrain.dm.map(n=>n/10),minAltitude=Math.min(...altitudes),maxAltitude=Math.max(...altitudes);
  // Normalize real-world elevation to shallow board terrain; no raised plinth.
  const ground=(h,x=0,z=0)=>{if(data.meta?.simplifiedTerrain)return .016;const normalized=Math.min(1,Math.max(0,(h-minAltitude)/Math.max(1,maxAltitude-minAltitude)));const edge=Math.max(Math.abs(x),Math.abs(z))/2.12;return (0.02+normalized*.135)*Math.max(0,1-Math.pow(Math.min(1,edge),6));};
  function elevation(x,z){const t=data.terrain,fx=Math.max(0,Math.min(t.nx-1,(x-t.x0)/t.step)),fz=Math.max(0,Math.min(t.nz-1,(z-t.z0)/t.step));const ix=Math.min(t.nx-2,Math.floor(fx)),iz=Math.min(t.nz-2,Math.floor(fz)),a=fx-ix,b=fz-iz;const at=(xx,zz)=>t.dm[zz*t.nx+xx]/10;return (at(ix,iz)*(1-a)+at(ix+1,iz)*a)*(1-b)+(at(ix,iz+1)*(1-a)+at(ix+1,iz+1)*a)*b;}
  const mats=new Map();function material(c){if(!mats.has(c))mats.set(c,new T.MeshStandardMaterial({color:c,roughness:.9}));return mats.get(c);}
  // A single uniform horizontal scale keeps every building footprint and relative position.
  const positions=[],colors=[],indices=[],steps=40,half=CAMPUS_MODEL_WIDTH/2;
  for(let j=0;j<=steps;j++)for(let i=0;i<=steps;i++){const x=-half+i/steps*half*2,z=-half+j/steps*half*2,h=elevation(x/scale+cx,z/scale+cz);positions.push(x,ground(h,x,z),z);const c=new T.Color(theme.ground).lerp(new T.Color(theme.highlight),Math.max(.1,Math.min(.8,(100-h)/110)));colors.push(c.r,c.g,c.b);}
  for(let j=0;j<steps;j++)for(let i=0;i<steps;i++){const a=j*(steps+1)+i;indices.push(a,a+steps+1,a+1,a+1,a+steps+1,a+steps+2);}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();const land=new T.Mesh(geo,new T.MeshStandardMaterial({vertexColors:true,roughness:1,side:T.DoubleSide}));land.receiveShadow=true;group.add(land);
  const shapeFor=ring=>new T.Shape(ring.map(([x,z])=>{const p=local(x,z);return new T.Vector2(p[0],-p[1]);}));
  for(const [index,b] of data.buildings.entries()){
    const shape=shapeFor(b.o);for(const hole of b.ho??[])shape.holes.push(new T.Path(hole.map(([x,z])=>{const p=local(x,z);return new T.Vector2(p[0],-p[1]);})));
    const h=visibleBuildingHeight(b.h);const center=b.o.reduce((acc,point)=>[acc[0]+point[0],acc[1]+point[1]],[0,0]).map(v=>v/b.o.length);const loc=local(...center),y=ground(b.g,loc[0],loc[1]);const geometry=new T.ExtrudeGeometry(shape,{depth:h,bevelEnabled:false,steps:1});geometry.rotateX(-Math.PI/2);
    const hanok=/명륜당|대성전|동재|서재|동무|서무|비천당|문$|각$|정록청|존경각|향관청|제기고/.test(b.n??'');
    const wallTone=new T.Color(hanok?'#d8c8aa':b.fc??'#e5dfc8').lerp(new T.Color(theme.wall),.62);
    const body=new T.Mesh(geometry,material(wallTone.getStyle()));body.position.y=y;body.castShadow=true;body.receiveShadow=true;body.userData.building={...b,index};group.add(body);picks.push(body);
    const roofGeo=new T.ShapeGeometry(shape);roofGeo.rotateX(-Math.PI/2);const roofTone=new T.Color(hanok?'#466769':b.rc??'#9ea99c').lerp(new T.Color(theme.roof),.75);
    const roof=new T.Mesh(roofGeo,material(roofTone.getStyle()));roof.position.y=y+h+.001;roof.userData.building=body.userData.building;group.add(roof);picks.push(roof);
    if(!data.meta?.simplifiedTerrain){const edges=new T.LineSegments(new T.EdgesGeometry(geometry,35),new T.LineBasicMaterial({color:'#788375',transparent:true,opacity:.35}));edges.position.y=y;group.add(edges);}
    if(hanok){const xs=b.o.map(p=>p[0]),zs=b.o.map(p=>p[1]),w=(Math.max(...xs)-Math.min(...xs))*scale,d=(Math.max(...zs)-Math.min(...zs))*scale;const mid=local((Math.min(...xs)+Math.max(...xs))/2,(Math.min(...zs)+Math.max(...zs))/2);if(w>.025&&d>.025){const ridge=new T.Mesh(new T.BoxGeometry(w,.009,.012),material('#365154'));ridge.position.set(mid[0],y+h+.012,mid[1]);group.add(ridge);}}
  }
  // Campus promenades use actual narrow 3D road ribbons so they remain
  // legible on modern high-DPI and mobile WebGL (GL_LINE width is often 1 px).
  const roadColor={skku:'#d2e8c9',yonsei:'#b3dbf1',korea:'#f1beb9'}[school]??'#dde4df';
  const roadMaterial=new T.MeshBasicMaterial({color:roadColor,side:T.DoubleSide,depthWrite:true});
  for(const road of data.roads){
    const ps=road.p.filter(([x,z])=>Math.abs((x-cx)*scale)<half&&Math.abs((z-cz)*scale)<half)
      .map(([x,z])=>{const p=local(x,z);return new T.Vector3(p[0],ground(elevation(x,z),p[0],p[1])+.018,p[1]);});
    if(ps.length<2)continue;
    const verts=[],width=.020;
    for(let i=1;i<ps.length;i++){
      const a=ps[i-1],b=ps[i],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);
      if(len<.0001)continue;
      const nx=-dz/len*width,nz=dx/len*width;
      verts.push(a.x+nx,a.y,a.z+nz,a.x-nx,a.y,a.z-nz,b.x-nx,b.y,b.z-nz,
                 a.x+nx,a.y,a.z+nz,b.x-nx,b.y,b.z-nz,b.x+nx,b.y,b.z+nz);
    }
    if(!verts.length)continue;
    const roadGeo=new T.BufferGeometry();roadGeo.setAttribute('position',new T.Float32BufferAttribute(verts,3));
    roadGeo.computeVertexNormals();const mesh=new T.Mesh(roadGeo,roadMaterial);group.add(mesh);
  }
  const trees=data.trees.filter((p,i)=>i%(data.meta?.simplifiedTerrain?1:10)===0&&Math.abs((p[0]-cx)*scale)<1.56&&Math.abs((p[1]-cz)*scale)<1.56);const treeMesh=new T.InstancedMesh(new T.ConeGeometry(.022,.065,5),material(theme.forest),trees.length);const dummy=new T.Object3D();trees.forEach(([x,z,s],i)=>{const p=local(x,z);dummy.position.set(p[0],ground(elevation(x,z),p[0],p[1])+.032,p[1]);dummy.scale.setScalar(Math.min(1.8,Math.max(.65,s??1)));dummy.updateMatrix();treeMesh.setMatrixAt(i,dummy.matrix)});treeMesh.castShadow=true;group.add(treeMesh);
  group.userData={buildingCount:data.buildings.length,bounds:{minX,maxX,minZ,maxZ},scale,worldWidth,worldDepth,sourceAspect,heightPolicy:'stylized, bounded, campus-independent',school};
  return {group,picks};
}
