// plain contact sheet — no keying, for concepts that are NOT magenta-backed
import { chromium } from '/tmp/claude-0/-home-user-Suds-Jack/8c6f8b94-82be-5dd4-8983-4375ef54b08e/scratchpad/node_modules/playwright/index.mjs'
import { readdir, readFile, writeFile } from 'node:fs/promises'
const DIR = process.argv[2], OUT = process.argv[3], COLS = +(process.argv[4] ?? 4), CELL = 300
const files = (await readdir(DIR)).filter(f => /\.(jpg|png)$/.test(f)).sort()
const imgs = []
for (const f of files) imgs.push({ name: f.replace(/\.\w+$/, ''), url: `data:image/${f.endsWith('.png')?'png':'jpeg'};base64,${(await readFile(`${DIR}/${f}`)).toString('base64')}` })
const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const pg = await br.newPage(); await pg.goto('data:text/html,<html><body></body></html>')
const url = await pg.evaluate(async ({ imgs, COLS, CELL }) => {
  const rows = Math.ceil(imgs.length / COLS), c = document.createElement('canvas')
  c.width = COLS * CELL; c.height = rows * (CELL + 18)
  const g = c.getContext('2d'); g.fillStyle = '#2a2a2a'; g.fillRect(0, 0, c.width, c.height)
  for (let i = 0; i < imgs.length; i++) {
    const im = new Image(); im.src = imgs[i].url; await im.decode()
    const s = Math.min(CELL / im.width, CELL / im.height), w = im.width*s, h = im.height*s
    const cx = (i % COLS) * CELL, cy = ((i / COLS) | 0) * (CELL + 18)
    g.drawImage(im, cx + (CELL-w)/2, cy + (CELL-h)/2, w, h)
    g.fillStyle = '#fff'; g.font = '13px monospace'; g.textAlign = 'center'
    g.fillText(imgs[i].name, cx + CELL/2, cy + CELL + 13)
  }
  return c.toDataURL('image/png')
}, { imgs, COLS, CELL })
await writeFile(OUT, Buffer.from(url.split(',')[1], 'base64')); console.log(OUT, imgs.length); await br.close()
