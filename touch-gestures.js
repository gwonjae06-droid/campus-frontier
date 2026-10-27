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
