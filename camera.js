// Fixed near-overhead orthographic view. At 70°, ground depth retains 94% of its shape
// (versus 83% at 56°), without independently stretching either ground axis.
export const CAMERA_MODE='strategy-fixed';
export const DEFAULT_PITCH=70, MIN_PITCH=DEFAULT_PITCH, MAX_PITCH=DEFAULT_PITCH;
export const DEFAULT_ANGLE=Math.PI/4, ANGLE_FREEDOM=0;
export const clampPitch=value=>Math.max(MIN_PITCH,Math.min(MAX_PITCH,Number.isFinite(value)?value:DEFAULT_PITCH));
export const clampAngle=value=>Math.max(DEFAULT_ANGLE-ANGLE_FREEDOM,Math.min(DEFAULT_ANGLE+ANGLE_FREEDOM,Number.isFinite(value)?value:DEFAULT_ANGLE));
// The strategic map never changes orientation or tilt while panning or zooming.
export function orbitPosition(angle,pitch,target={x:0,y:0,z:0}){
 const radians=clampPitch(pitch)*Math.PI/180,r=38,horizontal=r*Math.cos(radians);
 const yaw=clampAngle(angle);
 return {x:target.x+Math.sin(yaw)*horizontal,y:target.y+r*Math.sin(radians),z:target.z+Math.cos(yaw)*horizontal};
}
// Orthographic world X/Z have *one* scale; the viewport is fitted in projected
// camera coordinates to avoid the stretching/cropping from arbitrary 19/aspect.
// Desktop and portrait screens show different amounts of map, never distort it.
export function mapHalfSpan(size,worldTile,pitch,angle,aspect,pad=0.65){
 const a=clampAngle(angle),p=clampPitch(pitch)*Math.PI/180;
 const half=size*worldTile/2;
 const diamond=half*(Math.abs(Math.cos(a))+Math.abs(Math.sin(a)));
 const aspectSafe=Math.max(.25,Number.isFinite(aspect)?aspect:1);
 return Math.max(diamond*Math.sin(p)+pad,(diamond+pad)/aspectSafe);
}

// In a correctly fitted orthographic camera, both screen axes must have
// exactly the same world-unit-to-CSS-pixel scale at every viewport aspect.
export function orthographicPixelScales(size,worldTile,pitch,angle,width,height,zoom=1){
 const w=Math.max(1,width),h=Math.max(1,height),span=mapHalfSpan(size,worldTile,pitch,angle,w/h);
 const z=Number.isFinite(zoom)&&zoom>0?zoom:1;
 return {x:w/(2*span*(w/h)/z),y:h/(2*span/z),span};
}
