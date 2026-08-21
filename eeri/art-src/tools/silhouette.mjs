// The §6.3 test: "unmistakably NOT a bolt at 32 px — different silhouette".
// So render each pickup keyed, at 32 px, as a FLAT BLACK SHAPE — colour and
// detail stripped out, because at that size neither survives. Top row is the
// object; bottom row is all the player's eye actually gets.
const WORK = process.env.MESHY_WORK || '/tmp/meshy-work';
const { chromium } = await import(WORK + '/node_modules/playwright/index.mjs');
import { readdir, readFile, writeFile } from 'node:fs/promises'
const KEYLIB = await readFile(new URL('./keylib.js', import.meta.url), 'utf8')
const DIR = 'out/pickups'
const files = (await readdir(DIR)).filter(f => /\.(png|jpg)$/.test(f)).sort()
const imgs = []
for (const f of files) imgs.push({ name: f.replace(/\.\w+$/,''), url:`data:image/${f.endsWith('.png')?'png':'jpeg'};base64,${(await readFile(`${DIR}/${f}`)).toString('base64')}` })
const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const pg = await br.newPage(); await pg.goto('data:text/html,<html><body></body></html>'); await pg.addScriptTag({ content: KEYLIB })
const url = await pg.evaluate(async (imgs) => {
  const CELL = 260, S = 32, c = document.createElement('canvas')
  c.width = CELL*imgs.length; c.height = CELL + 200
  const g = c.getContext('2d'); g.fillStyle='#8a8a8a'; g.fillRect(0,0,c.width,c.height)
  for (let i=0;i<imgs.length;i++){
    const im=new Image(); im.src=imgs[i].url; await im.decode()
    const cv=keyImage(im); if(!cv) continue
    const s=Math.min(CELL/cv.width,CELL/cv.height), w=cv.width*s, h=cv.height*s
    g.drawImage(cv, i*CELL+(CELL-w)/2, (CELL-h)/2, w, h)
    // the 32px silhouette, then blown up 4x nearest-neighbour so it is judgeable
    const t=document.createElement('canvas'); t.width=t.height=S
    const tg=t.getContext('2d'); tg.imageSmoothingEnabled=true
    const ss=Math.min(S/cv.width,S/cv.height)
    tg.drawImage(cv,(S-cv.width*ss)/2,(S-cv.height*ss)/2,cv.width*ss,cv.height*ss)
    const d=tg.getImageData(0,0,S,S), p=d.data
    for(let j=0;j<p.length;j+=4){ const a=p[j+3]; p[j]=p[j+1]=p[j+2]=0; p[j+3]=a>90?255:0 }
    tg.putImageData(d,0,0)
    g.imageSmoothingEnabled=false
    g.drawImage(t, i*CELL+(CELL-S*4)/2, CELL+20, S*4, S*4)
    g.imageSmoothingEnabled=true
    g.fillStyle='#fff'; g.font='15px monospace'; g.textAlign='center'
    g.fillText(imgs[i].name, i*CELL+CELL/2, CELL+178)
  }
  return c.toDataURL('image/png')
}, imgs)
await writeFile('out/pickup-silhouettes.png', Buffer.from(url.split(',')[1],'base64'))
console.log('out/pickup-silhouettes.png')
await br.close()
