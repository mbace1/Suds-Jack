// Scale + origin normalisation in post.
// Bbox HEIGHT is the wrong scale anchor: body-height rhythm (Bible 7.4) is a
// required feature, so normalising it would delete the animation. Head width
// is near pose-invariant instead — the head neither compresses nor extends
// through a run cycle. Measured as the widest ink run in the top slice.
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const HEAD_SLICE = 0.22, FOOT_MARGIN = 10;
(async () => {
  const [dir, outDir, ...files] = process.argv.slice(2);
  fs.mkdirSync(outDir, { recursive: true });
  const br = await chromium.launch(); const pg = await br.newPage();
  await pg.goto('data:text/html,<html><body></body></html>');
  const LIB = `
  function measure(d,W,H){
    let x0=W,y0=H,x1=-1,y1=-1;
    for(let y=0;y<H;y++)for(let x=0;x<W;x++) if(d[(y*W+x)*4+3]>127){
      if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; }
    const ih=y1-y0+1;
    let headW=0;
    for(let y=y0;y<y0+Math.round(ih*${HEAD_SLICE});y++){
      let run=0,best=0;
      for(let x=0;x<W;x++){ if(d[(y*W+x)*4+3]>127){run++; if(run>best)best=run;} else run=0; }
      if(best>headW)headW=best;
    }
    let fx0=W,fx1=-1;
    for(let y=Math.max(0,y1-5);y<=y1;y++)for(let x=0;x<W;x++)
      if(d[(y*W+x)*4+3]>127){ if(x<fx0)fx0=x; if(x>fx1)fx1=x; }
    return {x0,y0,x1,y1,ih,headW,footCx:(fx0+fx1)/2};
  }`;
  const stats = [];
  for (const pass of ['measure', 'apply']) {
    const target = stats.length ? Math.round(stats.reduce((s, m) => s + m.headW, 0) / stats.length) : 0;
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const b64 = fs.readFileSync(path.join(dir, f)).toString('base64');
      const r = await pg.evaluate(async ({ url, lib, mode, target, margin }) => {
        eval(lib);
        const im = new Image(); im.src = url; await im.decode();
        const W = im.width, H = im.height;
        const c = document.createElement('canvas'); c.width = W; c.height = H;
        const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0);
        const m = measure(g.getImageData(0, 0, W, H).data, W, H);
        if (mode === 'measure') return { headW: m.headW, ih: m.ih };
        const s = target / m.headW;
        const o = document.createElement('canvas'); o.width = W; o.height = H;
        const og = o.getContext('2d'); og.imageSmoothingEnabled = false;
        // scale about the ground-contact point, then park that point at a fixed spot
        og.translate(W / 2, H - margin);
        og.scale(s, s);
        og.drawImage(c, -m.footCx, -m.y1);
        return { url: o.toDataURL('image/png'), headW: m.headW, ih: m.ih };
      }, { url: `data:image/png;base64,${b64}`, lib: LIB, mode: pass, target, margin: FOOT_MARGIN });
      if (pass === 'measure') stats.push(r);
      else fs.writeFileSync(path.join(outDir, f), Buffer.from(r.url.split(',')[1], 'base64'));
    }
  }
  const hw = stats.map(s => s.headW);
  const spread = a => Math.max(...a) - Math.min(...a);
  console.log(`head widths before: ${hw.join(', ')}  spread ${spread(hw)}px (${(100*spread(hw)/(hw.reduce((s,v)=>s+v,0)/hw.length)).toFixed(1)}%)`);
  await br.close();
})();
