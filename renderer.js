import {WIDTH,HEIGHT,FACTIONS,TROOPS,baseContains,hubAt,occupants,terrain,movementRange,describeCell,contacts} from './engine.mjs';

const clamp=(a,b,c)=>Math.max(b,Math.min(c,a));
const mix=(a,b,p)=>`rgba(${Math.round(a[0]*(1-p)+b[0]*p)},${Math.round(a[1]*(1-p)+b[1]*p)},${Math.round(a[2]*(1-p)+b[2]*p)},1)`;
const COLORS=['#43d4a7','#77b5fb','#f1888d'];
const faceColor=(hex,d)=>{const v=hex.match(/[a-f\d]{2}/ig)||['88','a0','ac'];return '#'+v.slice(0,3).map(x=>Math.max(0,Math.min(255,Math.round(parseInt(x,16)*d))).toString(16).padStart(2,'0')).join('')};
export class BoardRenderer {
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.angle=0;this.zoom=1;this.panX=0;this.panY=0;this.w=1000;this.h=650;this.skku=[];this.hover=null;this.moving=[];this.canvas.style.touchAction='none';this.setSize();window.addEventListener('resize',()=>this.setSize());}
 setSize(){const b=this.canvas.getBoundingClientRect();const dpr=Math.min(2,window.devicePixelRatio||1);this.w=b.width||1000;this.h=b.height||650;this.canvas.width=Math.ceil(this.w*dpr);this.canvas.height=Math.ceil(this.h*dpr);this.ctx.setTransform(dpr,0,0,dpr,0,0);}
 setSkku(rows){this.skku=rows;}
 rot(x,y){const dx=x-WIDTH/2,dy=y-HEIGHT/2;switch(this.angle%4){case 0:return [dx,dy];case 1:return [-dy,dx];case 2:return [-dx,-dy];default:return [dy,-dx];}}
 proj(x,y,z=0){const [a,b]=this.rot(x,y);const tw=42*this.zoom,th=23*this.zoom;return [this.w/2+(a-b)*tw/2+this.panX,this.h/2+(a+b)*th/2+this.panY-z*38*this.zoom];}
 hit(px,py){const tw=42*this.zoom,th=23*this.zoom;const a=(px-this.w/2-this.panX)/tw, b=(py-this.h/2-this.panY)/th;const rx=a+b,ry=b-a;let dx,dy;switch(this.angle%4){case 0:dx=rx;dy=ry;break;case 1:dx=ry;dy=-rx;break;case 2:dx=-rx;dy=-ry;break;default:dx=-ry;dy=rx;}
 const x=Math.floor(dx+WIDTH/2),y=Math.floor(dy+HEIGHT/2);return (x>=0&&y>=0&&x<WIDTH&&y<HEIGHT)?{x,y}:null;}
 depth(x,y){const [a,b]=this.rot(x,y);return a+b;}
 poly(points,color,stroke=null,line=1){const c=this.ctx;c.beginPath();for(let i=0;i<points.length;i++){if(i===0)c.moveTo(...points[i]);else c.lineTo(...points[i]);}c.closePath();c.fillStyle=color;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=line;c.stroke();}}
 line(a,b,col,w=1){const c=this.ctx;c.beginPath();c.moveTo(...a);c.lineTo(...b);c.lineWidth=w;c.strokeStyle=col;c.stroke();}
 rectDiamond(x,y,color,stroke){this.poly([this.proj(x,y),this.proj(x+1,y),this.proj(x+1,y+1),this.proj(x,y+1)],color,stroke,0.7);}
 text(label,x,y,size,color='#eaf4f3',weight=600,align='center'){const c=this.ctx;c.font=`${weight} ${size}px system-ui,'Noto Sans KR',sans-serif`;c.fillStyle=color;c.textAlign=align;c.textBaseline='middle';c.fillText(label,x,y);}
 cubePolygon(vertices,h,color){if(vertices.length<3)return;
  let sides=[];for(let i=0;i<vertices.length;i++){const a=vertices[i],b=vertices[(i+1)%vertices.length];const side=[this.proj(a[0],a[1],0.06),this.proj(b[0],b[1],0.06),this.proj(b[0],b[1],h),this.proj(a[0],a[1],h)];
    const visible=(side[1][0]-side[0][0])*(side[3][1]-side[0][1])-(side[1][1]-side[0][1])*(side[3][0]-side[0][0]);
    if(visible>0)sides.push({p:side,col:faceColor(color,0.62)});
    else sides.push({p:side,col:faceColor(color,0.79)});
  }
  for(const s of sides)this.poly(s.p,s.col,'#172b34a6',0.36);
  this.poly(vertices.map(p=>this.proj(p[0],p[1],h)),faceColor(color,1.07),'#dbf5ee69',0.4);
 }
 drawBuilding(f,building){const [name,h,coords]=building;let verts=coords.map(p=>[f.base[0]+3*p[0]/1000,f.base[1]+3*p[1]/1000]);const height=Math.max(.08,Math.min(.92,h/56));
  const traditional=h<=5;this.cubePolygon(verts,height,traditional?'#ad7e59':'#7aa0a3');}
 drawMiniBuildings(f){let seed=1;for(let y=0;y<4;y++)for(let x=0;x<4;x++){
   const px=f.base[0]+0.28+x*.7,py=f.base[1]+0.3+y*.7;
   const v=[[px,py],[px+.4,py],[px+.4,py+.37],[px,py+.37]];
   const h=.25+((x*7+y*13+f.id*11)%7)*.073;
   this.cubePolygon(v,h,f.id===1?'#6d89b8':'#b88186');seed++;
 }}
 drawTree(x,y,t){const c=this.ctx;const base=this.proj(x+.5,y+.5,0); const sway=Math.sin(t/1300+(x*13+y*17))*.75;
  this.line([base[0],base[1]+2],[base[0],base[1]-6],'#536653',2*this.zoom);
  c.beginPath();c.ellipse(base[0]+sway,base[1]-9*this.zoom,6*this.zoom,7*this.zoom,0,0,Math.PI*2);c.fillStyle='#2c7b6a';c.fill();
  c.beginPath();c.ellipse(base[0]-3*this.zoom,base[1]-12*this.zoom,4*this.zoom,4.5*this.zoom,0,0,Math.PI*2);c.fillStyle='#4b9e7f';c.fill();
 }
 drawHub(h,time){const c=this.ctx,p=this.proj(h.x+.5,h.y+.5,.1),col=h.owner===null?'#f4be65':COLORS[h.owner];const size=(h.central?11:8)*this.zoom;
  c.save();c.shadowColor=col;c.shadowBlur=8+(Math.sin(time/650)+1)*4;
  c.beginPath();c.ellipse(p[0],p[1]+6*this.zoom,size*1.2,size*.57,0,0,Math.PI*2);c.fillStyle='#07151baf';c.fill();
  c.beginPath();c.moveTo(p[0],p[1]-size*1.0);c.lineTo(p[0]+size*.85,p[1]);c.lineTo(p[0],p[1]+size*.45);c.lineTo(p[0]-size*.85,p[1]);c.closePath();c.fillStyle=col;c.fill();c.restore();
  this.text(h.central?'★':'◆',p[0],p[1]-2*this.zoom,Math.max(8,10*this.zoom),'#122330',800);
 }
 drawUnit(u,selected=false){const c=this.ctx,p=this.proj(u.x+.5,u.y+.5,.2),col=COLORS[u.owner],r=12.5*this.zoom;
   c.save();c.shadowColor=col;c.shadowBlur=selected?19:9;
   c.beginPath();c.ellipse(p[0],p[1]+9*this.zoom,r*1.02,r*.47,0,0,Math.PI*2);c.fillStyle='#071722aa';c.fill();
   c.beginPath();c.moveTo(p[0],p[1]-r);c.lineTo(p[0]+r*.92,p[1]-r*.4);c.lineTo(p[0]+r*.85,p[1]+r*.55);c.lineTo(p[0],p[1]+r*.93);c.lineTo(p[0]-r*.85,p[1]+r*.55);c.lineTo(p[0]-r*.92,p[1]-r*.4);c.closePath();c.fillStyle=col;c.fill();c.strokeStyle=selected?'#fff9d4':'#17313c';c.lineWidth=selected?3:1.5;c.stroke();c.restore();
   this.text(u.type==='scout'?'✦':'♟',p[0],p[1]-1*this.zoom,13*this.zoom,'#0b1b2d',900);
   const barw=24*this.zoom;c.fillStyle='#132936';c.fillRect(p[0]-barw/2,p[1]+r+3,barw,3.5*this.zoom);c.fillStyle=col;c.fillRect(p[0]-barw/2,p[1]+r+3,barw*u.hp/TROOPS[u.type].hp,3.5*this.zoom);
 }
 drawCampusLabel(f){const p=this.proj(f.base[0]+1.5,f.base[1]+1.5,1.6);const c=this.ctx;const text=f.id===0?'성균관대':f.id===1?'연세대':'고려대';const w=77;c.fillStyle='#081b2de7';c.beginPath();c.roundRect(p[0]-w/2,p[1]-12,w,24,6);c.fill();c.strokeStyle=COLORS[f.id]+'c0';c.lineWidth=1;c.stroke();this.text(text,p[0],p[1],12,'#f4f8fb');
  c.fillStyle='#0d1927';c.fillRect(p[0]-38,p[1]+15,76,5);c.fillStyle=COLORS[f.id];c.fillRect(p[0]-38,p[1]+15,76*f.hp/30,5);
 }
 render(s,selection,mode,now){const c=this.ctx;const w=this.w,h=this.h;
  c.save();const bg=c.createLinearGradient(0,0,0,h);bg.addColorStop(0,'#142438');bg.addColorStop(.7,'#0b1828');bg.addColorStop(1,'#101b2a');c.fillStyle=bg;c.fillRect(0,0,w,h);
  // subtle cartographic grid
  c.strokeStyle='#ffffff09';c.lineWidth=.7;for(let i=0;i<w;i+=40){c.beginPath();c.moveTo(i,0);c.lineTo(i,h);c.stroke();}
  for(let i=0;i<h;i+=40){c.beginPath();c.moveTo(0,i);c.lineTo(w,i);c.stroke();}
  let items=[];
  for(let y=0;y<HEIGHT;y++)for(let x=0;x<WIDTH;x++)items.push({kind:'tile',x,y,d:this.depth(x+.5,y+.5)});
  items.sort((a,b)=>a.d-b.d);
  for(const it of items){const x=it.x,y=it.y,kind=terrain(s,x,y);const base=s.factions.find(f=>baseContains(f,x,y));const own=s.hubs.find(he=>he.owner!==null&&Math.abs(he.x-x)+Math.abs(he.y-y)<=1)?.owner;
    let fill=kind==='forest'?'#274c46':'#28444d';if((x+y)%2===0)fill=kind==='forest'?'#28584e':'#2b4a53';if(base)fill=base.id===0?'#41645f':base.id===1?'#3b5267':'#654c58';
    else if(own!==undefined)fill=own===0?'#325b53':own===1?'#344f67':'#5b434e';
    this.rectDiamond(x,y,fill,'#4e6b7340');
  }
  // Queue features according to camera depth
  let objs=[];
  for(let y=0;y<HEIGHT;y++)for(let x=0;x<WIDTH;x++){
   if(terrain(s,x,y)==='forest'&&!s.factions.some(f=>baseContains(f,x,y))&&!hubAt(s,x,y))objs.push({d:this.depth(x+.5,y+.5),kind:'tree',x,y});
  }
  for(const f of s.factions){const rows=f.id===0&&this.skku.length?this.skku:null;
    if(rows){for(const b of rows){const cent=b[2].reduce((v,p)=>[v[0]+p[0],v[1]+p[1]],[0,0]).map(v=>v/b[2].length);objs.push({kind:'building',d:this.depth(f.base[0]+cent[0]*3/1000,f.base[1]+cent[1]*3/1000),f,b});}}
    else objs.push({kind:'mini',d:this.depth(f.base[0]+1.5,f.base[1]+1.5),f});
   objs.push({kind:'label',d:this.depth(f.base[0]+1.5,f.base[1]+1.5)+.25,f});
  }
  for(const hu of s.hubs)objs.push({kind:'hub',d:this.depth(hu.x+.5,hu.y+.5)+.1,hu});
  for(const u of s.units)objs.push({kind:'unit',d:this.depth(u.x+.5,u.y+.5)+.2,u});
  objs.sort((a,b)=>a.d-b.d);
  for(const o of objs){switch(o.kind){case 'tree':this.drawTree(o.x,o.y,now);break;case 'building':this.drawBuilding(o.f,o.b);break;case 'mini':this.drawMiniBuildings(o.f);break;case 'label':this.drawCampusLabel(o.f);break;case 'hub':this.drawHub(o.hu,now);break;case 'unit':this.drawUnit(o.u,selection?.id===o.u.id);break;}}
  // selection and movement area are drawn as high-contrast outlines, remain readable at all depths.
  if(selection){if(s.phase==='planning'&&mode==='move')for(const p of movementRange(s,selection)){this.poly([this.proj(p.x,p.y,.12),this.proj(p.x+1,p.y,.12),this.proj(p.x+1,p.y+1,.12),this.proj(p.x,p.y+1,.12)],'#49e1b020','#a2fff0aa',1.5);}
    const ord=s.orders[0]?.[selection.id];if(ord?.kind==='move'){const a=this.proj(selection.x+.5,selection.y+.5,.5),b=this.proj(ord.x+.5,ord.y+.5,.5);this.line(a,b,'#87f6dc',3);c.beginPath();c.arc(b[0],b[1],7,0,Math.PI*2);c.fillStyle='#befae7';c.fill();}
  }
  if(this.hover){const p=this.hover;this.poly([this.proj(p.x,p.y,.08),this.proj(p.x+1,p.y,.08),this.proj(p.x+1,p.y+1,.08),this.proj(p.x,p.y+1,.08)],'#fff2ac14','#fff3ba',1.2);}
  const hint=this.hover?`X ${this.hover.x} · Y ${this.hover.y}`:'지도 위로 마우스를 이동하세요';this.text(hint,16,h-22,11,'#93b4c1',500,'left');
  c.restore();}
}
