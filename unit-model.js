import * as T from './vendor/three.module.js';

// Team IDs are save-game identities, independent of the player's chosen university.
export const TEAM_STYLE = {
 ally: {color:'#168263', edge:'#e8dfb9', metal:'#b9a263', dark:'#284b40', sides:6},
 enemy:{color:'#962f49', edge:'#d8b184', metal:'#637078', dark:'#30333e', sides:4},
 rival:{color:'#356fae', edge:'#e3edf4', metal:'#a5bdce', dark:'#283e60', sides:3}
};
const KINDS = ['infantry','scout','cavalry','siege'];
const templates = new Map();

// Bake low-poly parts into one geometry per color once per school/class.
// Instances own clones: board cleanup can dispose them without invalidating templates.
function buildTemplate(team, kind) {
 const s=TEAM_STYLE[team], parts=new Map();
 function part(geometry,color,x,y,z,rx=0,ry=0,rz=0){
  const matrix=new T.Matrix4().compose(new T.Vector3(x,y,z),new T.Quaternion().setFromEuler(new T.Euler(rx,ry,rz)),new T.Vector3(1,1,1));
  const flat=geometry.index?geometry.toNonIndexed():geometry;
  flat.applyMatrix4(matrix);
  if(!parts.has(color))parts.set(color,[]);
  parts.get(color).push(flat);
  if(flat!==geometry)geometry.dispose();
 }
 const box=(w,h,d,c,x,y,z,rx=0,ry=0,rz=0)=>part(new T.BoxGeometry(w,h,d),c,x,y,z,rx,ry,rz);
 const cone=(r,h,c,x,y,z,n=4,rx=0,ry=0,rz=0)=>part(new T.ConeGeometry(r,h,n),c,x,y,z,rx,ry,rz);
 const cyl=(r,h,c,x,y,z,n=8,rx=0,ry=0,rz=0)=>part(new T.CylinderGeometry(r,r,h,n),c,x,y,z,rx,ry,rz);
 cyl(.42,.09,s.color,0,.07,0,s.sides);
 // A solid inset replaces the old high-segment torus, retaining color-free team markers.
 cyl(.34,.018,s.edge,0,.124,0,s.sides);
 function person(y,scout=false){
  const width=team==='enemy'?.32:team==='rival'?.21:.25;
  box(width,.29,.20,s.color,0,y,0);
  box(.17,.18,.17,'#e8d0a6',0,y+.23,-.015);
  if(team==='ally'){
   // Long ivory lapels and square scholar's hat, readable from above.
   cone(scout?.19:.24,.3,s.color,0,y-.12,0,4,0,Math.PI/4);
   box(.07,.31,.025,s.edge,0,y,-.115);
   box(.29,.055,.24,s.dark,0,y+.35,0);
   box(.16,.09,.16,s.dark,0,y+.4,0);
  }else if(team==='enemy'){
   box(scout?.32:.46,.12,.26,s.metal,0,y+.11,0);
   cone(.16,.18,s.dark,0,y+.34,0,4,0,Math.PI/4);
   box(.06,.11,.20,s.color,0,y+.43,0);
  }else{
   box(scout?.27:.32,.34,.045,s.edge,0,y-.015,.14,-.28);
   cone(.14,.17,s.metal,0,y+.34,0,4);
   cone(.075,.17,s.edge,0,y+.4,.13,3,.6);
  }
 }
 function spear(x,y,z){
  box(.035,.55,.035,s.dark,x,y,z);
  cone(.07,.17,s.metal,x,y+.35,z);
 }
 if(kind==='siege'){
  // School-specific machines: counterweight catapult, armored ram, crossbow carriage.
  box(.48,.12,.57,s.dark,0,.29,0);
  for(const x of [-.29,.29])for(const z of [-.22,.22])cyl(.13,.075,s.metal,x,.25,z,8,0,0,Math.PI/2);
  if(team==='ally'){
   for(const x of [-.18,.18])box(.07,.42,.10,s.color,x,.54,.02);
   box(.09,.12,.78,s.edge,0,.73,0,.48);
   box(.24,.2,.18,s.dark,0,.63,.31);
   box(.24,.07,.21,s.color,0,.94,-.31);
   cyl(.085,.1,s.metal,0,.99,-.31,6);
  }else if(team==='enemy'){
   box(.53,.12,.62,s.color,0,.65,0);
   for(const x of [-.2,.2])box(.06,.3,.07,s.metal,x,.46,.18);
   cyl(.13,.78,s.dark,0,.46,-.03,6,Math.PI/2);
   cone(.20,.24,s.metal,0,.46,-.49,4,-Math.PI/2);
   for(const x of [-.15,.15])cone(.09,.16,s.edge,x,.78,-.12);
  }else{
   box(.13,.4,.18,s.color,0,.51,.08);
   box(.10,.09,.76,s.edge,0,.73,-.03);
   for(const sign of [-1,1])box(.39,.065,.09,s.metal,sign*.18,.72,-.2,0,sign*.35);
   box(.66,.025,.025,s.dark,0,.72,-.02);
   cone(.065,.17,s.metal,0,.73,-.48,4,-Math.PI/2);
  }
 }else if(kind==='cavalry'){
  const horse=team==='ally'?s.edge:team==='enemy'?s.dark:s.metal;
  box(.29,.25,.57,horse,0,.42,.04);
  box(.18,.3,.18,horse,0,.62,-.23,-.25);
  box(.17,.14,.29,horse,0,.78,-.32);
  for(const x of [-.10,.10])for(const z of [-.18,.25])box(.07,.25,.08,s.dark,x,.26,z);
  box(team==='enemy'?.39:.33,.22,.36,s.color,0,.45,.1);
  person(.78);
  spear(.24,.87,-.02);
  if(team==='ally')box(.19,.16,.025,s.edge,.33,1.08,-.02);
  if(team==='enemy')cone(.20,.18,s.metal,0,.7,-.26,4,0,Math.PI/4);
  if(team==='rival')box(.035,.30,.06,s.edge,0,.5,.39,-.6);
 }else{
  for(const x of [-.085,.085])box(.09,.21,.12,s.dark,x,.25,0);
  person(.52,kind==='scout');
  if(kind==='infantry'){
   if(team==='ally'){
    box(.26,.39,.065,s.edge,.22,.51,-.16);
    box(.06,.29,.025,s.color,.22,.51,-.205);
    spear(-.23,.57,0);
   }else if(team==='enemy'){
    box(.31,.37,.08,s.dark,.23,.5,-.15);
    cone(.13,.1,s.metal,.23,.5,-.24,4,-Math.PI/2);
    box(.045,.53,.045,s.edge,-.26,.57,0);
    box(.23,.19,.065,s.metal,-.26,.8,0);
   }else{
    cone(.23,.085,s.edge,.22,.51,-.17,3,Math.PI/2);
    box(.035,.49,.05,s.metal,-.22,.6,0,0,0,-.14);
    box(.14,.04,.06,s.dark,-.19,.43,0);
   }
  }else if(team==='ally'){
   // Map case plus light walking staff; no infantry shield.
   cyl(.065,.30,s.edge,-.20,.49,.11,6,0,0,-.25);
   spear(.22,.53,-.02);
  }else if(team==='enemy'){
   box(.27,.21,.12,s.dark,0,.5,.16);
   for(const sign of [-1,1])box(.06,.29,.065,s.metal,sign*.23,.52,-.09,0,0,-sign*.4);
  }else{
   // Wide horizontal light crossbow, short hooded cloak.
   box(.40,.05,.065,s.metal,0,.53,-.24);
   box(.055,.07,.32,s.dark,0,.53,-.22);
   cone(.18,.22,s.color,0,.83,.01,4);
  }
 }
 const result=[];
 for(const [color,geometries] of parts){
  const merged=new T.BufferGeometry();
  for(const name of ['position','normal']){
   const data=new Float32Array(geometries.reduce((n,g)=>n+g.attributes[name].array.length,0));
   let offset=0;
   for(const g of geometries){data.set(g.attributes[name].array,offset);offset+=g.attributes[name].array.length;}
   merged.setAttribute(name,new T.BufferAttribute(data,3));
  }
  merged.computeBoundingSphere();
  geometries.forEach(g=>g.dispose());
  result.push({color,geometry:merged});
 }
 return result;
}

// Keep the board's factory signature; models never mutate units or saved state.
export function unitModel(u,_box,_cone,mat){
 const team=Object.hasOwn(TEAM_STYLE,u.team)?u.team:'ally';
 const kind=KINDS.includes(u.kind)?u.kind:'infantry';
 const key=team+':'+kind;
 if(!templates.has(key))templates.set(key,buildTemplate(team,kind));
 const g=new T.Group();g.userData.unitId=u.id;g.userData.kind=kind;
 for(const {color,geometry} of templates.get(key)){
  const mesh=new T.Mesh(geometry.clone(),mat(color));
  mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);
 }
 return g;
}
