// Does a tile actually tile? Lay it 3x3 and measure the seam.
// A seamless tile means column W-1 continues into column 0 as naturally as any
// interior neighbour — so compare the mean colour step ACROSS the seam against
// the mean step between interior columns. Ratio ~1 = seamless; >>1 = visible seam.
const fs=require('fs'),path=require('path');
const {loadImage,createCanvas}=require('@napi-rs/canvas');
(async()=>{
 const [src,out]=process.argv.slice(2);
 const im=await loadImage(fs.readFileSync(src));
 const W=im.width,H=im.height;
 const c=createCanvas(W,H);const g=c.getContext('2d');g.drawImage(im,0,0);
 const d=g.getImageData(0,0,W,H).data;
 const px=(x,y)=>[d[(y*W+x)*4],d[(y*W+x)*4+1],d[(y*W+x)*4+2]];
 const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
 let interiorX=0,nx=0;
 for(let x=0;x<W-1;x++)for(let y=0;y<H;y++){interiorX+=dist(px(x,y),px(x+1,y));nx++;}
 let seamX=0;for(let y=0;y<H;y++)seamX+=dist(px(W-1,y),px(0,y));
 let interiorY=0,ny=0;
 for(let y=0;y<H-1;y++)for(let x=0;x<W;x++){interiorY+=dist(px(x,y),px(x,y+1));ny++;}
 let seamY=0;for(let x=0;x<W;x++)seamY+=dist(px(x,H-1),px(x,0));
 const ix=interiorX/nx, sx=seamX/H, iy=interiorY/ny, sy=seamY/W;
 console.log(`horizontal: interior step ${ix.toFixed(1)}  seam step ${sx.toFixed(1)}  ratio ${(sx/ix).toFixed(2)}`);
 console.log(`vertical:   interior step ${iy.toFixed(1)}  seam step ${sy.toFixed(1)}  ratio ${(sy/iy).toFixed(2)}`);
 console.log(`(ratio ~1.0 = seamless; >1.5 = a visible seam)`);
 const S=3,sc=4;const t=createCanvas(W*S*sc,H*S*sc);const tg=t.getContext('2d');tg.imageSmoothingEnabled=false;
 for(let j=0;j<S;j++)for(let i=0;i<S;i++)tg.drawImage(c,i*W*sc,j*H*sc,W*sc,H*sc);
 fs.writeFileSync(out,t.toBuffer('image/png'));console.log('→ '+out);
})();
