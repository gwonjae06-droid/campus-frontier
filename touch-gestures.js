// Deterministic gesture helpers; all values are CSS pixels or unitless zoom levels.
export const MIN_ZOOM=0.7,MAX_ZOOM=7;
export const clampZoom=v=>Math.max(MIN_ZOOM,Math.min(MAX_ZOOM,Number.isFinite(v)?v:1));
export function gestureMetrics(points){
 if(points.length<2)return null;
 const [a,b]=points;
 return {x:(a.x+b.x)/2,y:(a.y+b.y)/2,distance:Math.hypot(b.x-a.x,b.y-a.y)};
}
export function pinchZoom(startZoom,startDistance,currentDistance){
 if(!Number.isFinite(startDistance)||startDistance<8||!Number.isFinite(currentDistance))return clampZoom(startZoom);
 return clampZoom(startZoom*currentDistance/startDistance);
}
export function groundPan(dx,dy,angle,worldPerPixel){
 const rightX=Math.cos(angle),rightZ=-Math.sin(angle);
 const upX=-Math.sin(angle),upZ=-Math.cos(angle);
 return {x:(-dx*rightX+dy*upX)*worldPerPixel,z:(-dx*rightZ+dy*upZ)*worldPerPixel};
}

// A single drag moves the world under the finger/mouse while orientation
// remains fixed. The vertical isometric projection shrinks ground distances
// by sin(pitch); correcting it gives equal movement in either screen axis.
export function swipePan(start,dx,dy,angle,pitch,worldPerPixel,bounds){
 const sine=Math.max(.25,Math.sin(pitch*Math.PI/180));
 const shift=groundPan(dx,dy/sine,angle,worldPerPixel);
 const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
 return {x:clamp(start.x+shift.x,bounds.min,bounds.max),
         z:clamp(start.z+shift.z,bounds.min,bounds.max)};
}
