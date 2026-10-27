// The reference image informs an isometric presentation; all streets,
// apartment forms, and colors here are original simplified city scenery.
export const CITY_ASPHALT='#374750';
export const CITY_LANE='#efce66';
export const CITY_SIDEWALK='#a7b8ba';
export const CAMPUS_COLORS={
  campus:'#248453', 'enemy-base':'#a73d52', 'rival-base':'#3265a3'
};
export const isUniversity=type=>Object.hasOwn(CAMPUS_COLORS,type);
const roadX=new Set([1,6,9,14,19]);
const roadZ=new Set([1,6,9,14,19]);
export function streetPlan(x,z,type){
 if(isUniversity(type)||type==='water'||type==='resource'||type==='void')return null;
 const northSouth=roadX.has(x),eastWest=roadZ.has(z);
 return northSouth||eastWest?{northSouth,eastWest}:null;
}
export function apartmentPlan(x,z,type){
 if(type!=='grass'||streetPlan(x,z,type))return null;
 const hash=(x*23+z*41+x*z*3)%19;
 if(hash>7)return null;
 const tall=(x*5+z*7)%4===0;
 return {floors:tall?8+(hash%4):4+(hash%4),
     width:tall?.52:.42,depth:tall?.52:.47,
     xOffset:hash%2?.17:-.17,zOffset:hash%3?.14:-.14,
     tone:(x*3+z)%3};
}
export function addUrbanCell(T,cell,x,z,type,wx,wz,box,mat){
 const street=streetPlan(x,z,type);
 if(street){
   // Every road runs from edge to edge of its cell, so junctions stay joined.
   box(cell,1.088,.025,1.088,CITY_ASPHALT,wx,.016,wz);
   if(street.northSouth&&street.eastWest){
     for(const i of [-.28,-.14,.14,.28]){
       box(cell,.055,.007,.20,'#f4f1de',wx+i,.033,wz-.30);
       box(cell,.055,.007,.20,'#f4f1de',wx+i,.033,wz+.30);
     }
   }else if(street.northSouth){
     box(cell,.025,.008,.28,CITY_LANE,wx,.036,wz);
     for(const i of [-1,1])box(cell,.09,.028,1.05,CITY_SIDEWALK,wx+i*.48,.027,wz);
   }else{
     box(cell,.28,.008,.025,CITY_LANE,wx,.036,wz);
     for(const i of [-1,1])box(cell,1.05,.028,.09,CITY_SIDEWALK,wx,.027,wz+i*.48);
   }
   return 'street';
 }
 const building=apartmentPlan(x,z,type);
 if(building){
   // Apartment blocks are decorative, do not alter game movement/passability.
   // Place them off-center so a unit always remains visible/clickable.
   const px=wx+building.xOffset*1.3,pz=wz+building.zOffset*1.3,h=building.floors*.052;
   const walls=['#dce4e7','#f0e7d5','#b7ced2'][building.tone];
   box(cell,building.width+.16,.035,building.depth+.16,'#75878a',px,.03,pz);
   box(cell,building.width,h,building.depth,walls,px,.055+h/2,pz);
   box(cell,building.width+.035,.055,building.depth+.035,'#485d68',px,.08+h,pz);
   for(const level of [2,4,6,8,10]){
     if(level>building.floors)continue;
     const y=.06+level*.052;
     box(cell,building.width*.65,.035,.012,'#47788f',px,y,pz+building.depth/2+.008);
     box(cell,.012,.035,building.depth*.60,'#47788f',px+building.width/2+.008,y,pz);
   }
   return 'apartments';
 }
 return null;
}
