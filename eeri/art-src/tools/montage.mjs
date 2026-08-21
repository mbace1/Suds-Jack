#!/usr/bin/env node
// Lay a directory of pieces out on one sheet, KEYED, on a neutral grey — so a
// look at the pool answers both questions at once: is the piece on register,
// and does it key cleanly. A magenta contact sheet hides the second one.
const WORK = process.env.MESHY_WORK || '/tmp/meshy-work';
const { chromium } = await import(WORK + '/node_modules/playwright/index.mjs');
import { readdir, readFile, writeFile } from 'node:fs/promises'

const KEYLIB = await readFile(new URL('./keylib.js', import.meta.url), 'utf8')
const DIR = process.argv[2] ?? 'out/pieces'
const OUT = process.argv[3] ?? 'out/pieces-sheet.png'
const COLS = +(process.argv[4] ?? 7), CELL = 300;

const files = (await readdir(DIR)).filter(f => /\.(jpg|png)$/.test(f)).sort()
const imgs = []
for (const f of files) {
  imgs.push({ name: f.replace(/\.\w+$/, ''), url: `data:${f.endsWith('.png') ? 'image/png' : 'image/jpeg'};base64,${(await readFile(`${DIR}/${f}`)).toString('base64')}` })
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const page = await browser.newPage()
await page.goto('data:text/html,<html><body></body></html>')
await page.addScriptTag({ content: KEYLIB })
const url = await page.evaluate(async ({ imgs, COLS, CELL }) => {
  const rows = Math.ceil(imgs.length / COLS)
  const c = document.createElement('canvas')
  c.width = COLS * CELL; c.height = rows * (CELL + 18)
  const g = c.getContext('2d')
  g.fillStyle = '#6a6a6a'; g.fillRect(0, 0, c.width, c.height)
  for (let i = 0; i < imgs.length; i++) {
    const img = new Image(); img.src = imgs[i].url; await img.decode()
    const t = keyImage(img)
    if (!t) continue
    const s = Math.min(CELL / t.width, CELL / t.height)
    const w = t.width * s, h = t.height * s
    const cx = (i % COLS) * CELL, cy = ((i / COLS) | 0) * (CELL + 18)
    g.drawImage(t, cx + (CELL - w) / 2, cy + (CELL - h), w, h)
    g.fillStyle = '#fff'; g.font = '13px monospace'; g.textAlign = 'center'
    g.fillText(imgs[i].name, cx + CELL / 2, cy + CELL + 13)
  }
  return c.toDataURL('image/png')
}, { imgs, COLS, CELL })
await writeFile(OUT, Buffer.from(url.split(',')[1], 'base64'))
console.log(OUT, imgs.length)
await browser.close()
