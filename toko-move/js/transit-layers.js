// Toko Move v2.9 — exact HSL transit display layers.
// Geometry is never simplified here. Colours come from GTFS route_color when
// present; where the source has none, board.js assigns one per line FAMILY —
// see the recorded owner override at the top of that file for why the old
// tram-green fallback had to go (route_color is null on all 34 lines, so it
// painted thirty distinct services one identical green).
import {lineColour} from './board.js?v=5';
export class TransitLayers{
 constructor(pack){this.pack=pack;this.layers=pack.lines.map(line=>({id:line.id,name:line.name,mode:line.mode,colour:normaliseColour(line.hex,line.mode,line.name),path:line.path,stops:line.stops||[],visible:true}));this.bounds=pack.clippedTo||boundsFromLines(this.layers);}
 static async load(url='./cities/helsinki.json'){const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw new Error(`Transit pack ${response.status}`);return new TransitLayers(await response.json());}
 get source(){return{source:this.pack.source,licence:this.pack.licence,fetched:this.pack.fetched,feed:this.pack.feed,clippedTo:this.pack.clippedTo,note:this.pack.note,exactGeometry:this.pack.exactGeometry};}
 setVisible(id,visible){const layer=this.layers.find(line=>line.id===id);if(layer)layer.visible=Boolean(visible);} toggle(id){const layer=this.layers.find(line=>line.id===id);if(layer)layer.visible=!layer.visible;return layer?.visible??false;} solo(id){for(const layer of this.layers)layer.visible=layer.id===id;} showAll(mode=null){for(const layer of this.layers)layer.visible=!mode||layer.mode===mode;} hideAll(){for(const layer of this.layers)layer.visible=false;} visibleLines(){return this.layers.filter(line=>line.visible);}
 draw(ctx,width,height,{fit=null,alpha=.9,lineWidth=3,filter=null}={}){const project=fit||bboxFit(this.bounds,width,height);ctx.save();ctx.globalAlpha=alpha;ctx.lineCap='round';ctx.lineJoin='round';for(const layer of this.layers){if(!layer.visible||(filter&&!filter(layer))||!Array.isArray(layer.path)||layer.path.length<2)continue;ctx.strokeStyle=layer.colour;ctx.lineWidth=layer.mode==='SUBWAY'?lineWidth*1.45:lineWidth;ctx.beginPath();for(let i=0;i<layer.path.length;i++){const[lat,lon]=layer.path[i],p=project(lat,lon);i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);}ctx.stroke();}ctx.restore();}
}
export function boundsFromLines(lines){let s=Infinity,n=-Infinity,w=Infinity,e=-Infinity;for(const line of lines)for(const p of line.path||[]){const[lat,lon]=p;if(!Number.isFinite(lat)||!Number.isFinite(lon))continue;s=Math.min(s,lat);n=Math.max(n,lat);w=Math.min(w,lon);e=Math.max(e,lon);}if(!Number.isFinite(s))throw new Error('Transit pack has no finite source geometry');return{s,n,w,e};}
export function bboxFit(box,width,height,pad=14){const usableW=Math.max(1,width-pad*2),usableH=Math.max(1,height-pad*2),lonSpan=Math.max(1e-9,box.e-box.w),latSpan=Math.max(1e-9,box.n-box.s),kx=Math.cos(((box.n+box.s)*.5)*Math.PI/180),scale=Math.min(usableW/(lonSpan*kx),usableH/latSpan),drawnW=lonSpan*kx*scale,drawnH=latSpan*scale,ox=(width-drawnW)*.5,oy=(height-drawnH)*.5;return(lat,lon)=>({x:ox+(lon-box.w)*kx*scale,y:oy+(box.n-lat)*scale});}
function normaliseColour(hex,mode,name){return lineColour(name,mode,hex);}
