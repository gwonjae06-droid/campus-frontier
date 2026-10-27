// One horizontal scale for every campus: never stretch X and Z independently.
// A 4×4 board plot is 4.48 world units wide (four 1.12-unit tiles).
export const CAMPUS_TILES=4;
export const TILE_WORLD_SIZE=1.12;
export const CAMPUS_PLOT_WIDTH=CAMPUS_TILES*TILE_WORLD_SIZE;
export const CAMPUS_MODEL_WIDTH=4.12; // Uniform margin of 0.18 on each side.

export function campusTransform(data){
 const polygons=[...data.buildings.flatMap(b=>b.o),...data.campus.flat()];
 if(!polygons.length)throw Error('캠퍼스 건물/경계 좌표가 없습니다.');
 const xs=polygons.map(p=>p[0]),zs=polygons.map(p=>p[1]);
 const minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
 const width=maxX-minX,depth=maxZ-minZ;
 if(!(width>0&&depth>0))throw Error('캠퍼스 좌표의 가로/세로 크기가 올바르지 않습니다.');
 const scale=CAMPUS_MODEL_WIDTH/Math.max(width,depth);
 return {minX,maxX,minZ,maxZ,cx:(minX+maxX)/2,cz:(minZ+maxZ)/2,scale,
         worldWidth:width*scale,worldDepth:depth*scale,sourceAspect:width/depth};
}

// Height is a deliberately *stylized* visual dimension. Reusing the very
// small 4×4 horizontal map scale for metres made thousands of buildings
// nearly flat; avoid oversized towers by capping instead of multiplying
// heights by an arbitrary campus-specific factor.
export function visibleBuildingHeight(metres){
 const h=Number.isFinite(metres)&&metres>0?metres:12;
 return Math.max(0.11,Math.min(0.82,h*0.012));
}
