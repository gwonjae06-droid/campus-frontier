export const DEFAULT_PITCH=46, MIN_PITCH=18, MAX_PITCH=80;
export const clampPitch=value=>Math.max(MIN_PITCH,Math.min(MAX_PITCH,Number.isFinite(value)?value:DEFAULT_PITCH));
export function orbitPosition(angle,pitch,target={x:0,y:0,z:0}){
 const radians=clampPitch(pitch)*Math.PI/180,r=38,horizontal=r*Math.cos(radians);
 return {x:target.x+Math.sin(angle)*horizontal,y:target.y+r*Math.sin(radians),z:target.z+Math.cos(angle)*horizontal};
}
