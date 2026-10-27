import * as T from './vendor/three.module.js';
export const TEAM_STYLE={ally:{color:'#168263',edge:'#8de8bd',sides:6},enemy:{color:'#b94a5c',edge:'#ffb8ab',sides:4},rival:{color:'#356fae',edge:'#a3d4ff',sides:3}};
export function unitModel(u,box,cone,mat){
 const g=new T.Group(),theme=TEAM_STYLE[u.team]??TEAM_STYLE.ally,kind=u.kind??'infantry';g.userData.unitId=u.id;g.userData.kind=kind;
 const base=new T.Mesh(new T.CylinderGeometry(.39,.43,.09,theme.sides),mat(theme.color));base.position.y=.07;base.receiveShadow=true;g.add(base);
 const trim=new T.Mesh(new T.TorusGeometry(.32,.022,5,24),mat(theme.edge));trim.rotation.x=Math.PI/2;trim.position.y=.12;g.add(trim);
 const body=(x,y,z)=>{box(g,.24,.32,.21,theme.color,x,y,z);box(g,.19,.19,.18,'#e8d0a6',x,y+.25,z);cone(g,.17,.13,'#eee7cf',x,y+.4,z,5);};
 if(kind==='siege'){
  box(g,.52,.19,.62,'#b39162',0,.25,0);box(g,.25,.18,.58,'#3b4d52',0,.45,-.07);box(g,.3,.07,.25,theme.color,0,.57,.08);
  for(const x of [-.3,.3])for(const z of [-.23,.23]){const wheel=new T.Mesh(new T.CylinderGeometry(.13,.13,.075,8),mat('#435452'));wheel.rotation.z=Math.PI/2;wheel.position.set(x,.23,z);g.add(wheel);}
 }else if(kind==='cavalry'){
  box(g,.28,.24,.58,'#886b53',0,.35,.02);box(g,.22,.27,.2,'#a08160',0,.54,-.25);box(g,.22,.13,.3,'#a08160',0,.69,-.29);
  for(const x of [-.1,.1])for(const z of [-.2,.23])box(g,.075,.23,.07,'#6d5748',x,.2,z);
  body(0,.66,.09);box(g,.035,.54,.035,'#e5d3a2',.21,.8,-.03);
 }else{
  for(const x of [-.085,.085])box(g,.1,.18,.12,'#364d50',x,.22,0);body(0,.48,0);
  if(kind==='infantry'){
   const shield=new T.Mesh(new T.CylinderGeometry(.2,.2,.055,6),mat('#eee6cc'));shield.rotation.x=Math.PI/2;shield.position.set(.19,.48,-.15);g.add(shield);box(g,.035,.23,.035,theme.color,.19,.48,-.184);box(g,.04,.56,.04,'#d9cba6',-.22,.55,0);
  }else{
   box(g,.3,.33,.045,'#d3bb7a',0,.48,.15);cone(g,.11,.27,theme.color,0,1,0,4);box(g,.04,.65,.04,'#a79066',.23,.52,-.02);cone(g,.07,.16,'#f5eed9',.23,.92,-.02,4);
  }
 }
 g.traverse(o=>{if(o.isMesh)o.castShadow=true;});return g;
}
