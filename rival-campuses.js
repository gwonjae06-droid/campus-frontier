import * as T from './vendor/three.module.js';
// Stylized, geographically informed campus miniatures. Buildings are NOT survey-grade models.
// The ground is the existing 4x4 board terrain; no separate raised campus slab is created.
const PALETTE={
 yonsei:{stone:'#d8cbb0',shadow:'#adad9b',roof:'#52646f',glass:'#9eb8c6',garden:'#6e9868',lane:'#e7dfc9',trim:'#8f8574'},
 korea:{stone:'#c9bcb2',shadow:'#9b958e',roof:'#53656d',glass:'#99b0bd',garden:'#7aa069',lane:'#dbd0b9',trim:'#a18d7d'}
};
function makeModel(which){
 const p=PALETTE[which],group=new T.Group(),pick=[],mat=new Map();
 const material=color=>{if(!mat.has(color))mat.set(color,new T.MeshStandardMaterial({color,roughness:.83,metalness:0}));return mat.get(color);};
 function box(w,h,d,c,x,y,z){const o=new T.Mesh(new T.BoxGeometry(w,h,d),material(c));o.position.set(x,y,z);o.receiveShadow=true;o.castShadow=h>.15;group.add(o);return o;}
 function roof(w,d,c,x,y,z){const m=new T.Mesh(new T.ConeGeometry(Math.max(w,d)*.68,.26,4),material(c));m.position.set(x,y,z);m.rotation.y=Math.PI/4;m.castShadow=true;group.add(m);}
 function lawn(w,d,x,z){box(w,.014,d,p.garden,x,.018,z);}
 function walkway(w,d,x,z){box(w,.018,d,p.lane,x,.03,z);}
 function hall(n,x,z,w,d,h,kind='hall'){
  const stone=kind==='modern'?p.shadow:p.stone;
  const body=box(w,h,d,stone,x,h/2,z);
  body.userData.building={n,campus:which};
  pick.push(body);
  if(kind==='historic'){roof(w+.08,d+.08,p.roof,x,h+.13,z);box(w*.12,h*.44,d*.11,p.trim,x,h*.75,z+d*.53);}
  if(kind==='modern'){box(w+.08,.08,d+.08,p.roof,x,h+.04,z);}
  for(const side of [-1,1])if(kind!=='landmark'){
   const wings=box(.025,h*.47,Math.max(.09,d*.12),p.glass,x+side*(w*.35),h*.51,z+d*.5+.014);
   wings.castShadow=false;
  }
  return body;
 }
 function tree(x,z,scale=1){
  const trunk=box(.055,.16*scale,.055,p.trim,x,.08*scale,z);trunk.castShadow=false;
  const c=new T.Mesh(new T.ConeGeometry(.16*scale,.42*scale,6),material(p.garden));
  c.position.set(x,.34*scale,z);c.castShadow=true;group.add(c);
 }
 function column(x,z){box(.07,.4,.07,p.trim,x,.2,z);box(.2,.06,.2,p.stone,x,.42,z);}
 if(which==='yonsei'){
  // Official campus description: Baekyang-ro leads to the heritage
  // Underwood-Stimson-Appenzeller ensemble, with library/student spaces below.
  walkway(.42,4.08,0,0);walkway(3.6,.19,0,.86);
  lawn(.9,1.0,-.92,-.15);lawn(.9,1.0,.92,-.15);
  hall('언더우드관',0,-1.25,1.0,.57,.87,'historic');
  hall('스팀슨관',-1.28,-1.22,.7,.53,.58,'historic');
  hall('아펜젤러관',1.28,-1.22,.7,.53,.58,'historic');
  hall('중앙도서관',-1.33,.55,.74,.82,.64,'modern');
  hall('학생회관',1.28,.75,.72,.78,.57,'modern');
  hall('백양관',-1.37,1.55,.70,.48,.48,'modern');
  hall('백주년기념관',1.3,1.64,.68,.42,.42,'modern');
  hall('연희관',0,-1.86,.58,.34,.44,'historic');
  for(let z=-1.64;z<=1.75;z+=.4){tree(-.34,z,.63);tree(.34,z,.63);}
  for(const [x,z] of [[-1.72,-.15],[-1.72,1.22],[1.72,-.1],[1.7,1.25]])tree(x,z,.7);
  const statue=box(.12,.28,.12,p.trim,0,.14,-.62);statue.userData.building={n:'언더우드 동상',campus:which};
 }else{
  // Official KU maps: main building / symmetrical Central Plaza
  // with major library, business, Centennial and science landmarks.
  walkway(1.0,3.92,0,0);
  lawn(1.56,.95,0,-.40);walkway(3.65,.2,0,.58);
  hall('본관',0,-1.68,1.16,.54,.89,'historic');
  hall('중앙도서관',-1.33,-.91,.75,.72,.61,'historic');
  hall('서관',1.33,-.90,.77,.76,.62,'historic');
  hall('경영관',-1.43,.63,.75,.75,.57,'modern');
  hall('백주년기념관',1.43,.63,.75,.73,.62,'modern');
  hall('하나스퀘어',-1.34,1.59,.82,.61,.39,'modern');
  hall('과학관',1.36,1.6,.78,.59,.43,'modern');
  // Central Plaza: low flush lawn and walkways, not a thick platform.
  walkway(.27,1.18,0,-.21);
  for(const [x,z] of [[-1.89,-.2],[-1.91,1.2],[1.9,-.25],[1.84,1.18],[-.93,-1.75],[.93,-1.75]])tree(x,z,.69);
  column(-.30,-1.03);column(.30,-1.03);
 }
 group.userData={buildingCount:pick.length,kind:which,miniature:true,grounded:true};
 return {group,picks:pick,buildingCount:pick.length};
}
export const makeRivalCampus=which=>makeModel(which);
