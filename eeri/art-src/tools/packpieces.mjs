#!/usr/bin/env node
// Carry the piece pool into the repo at a sane size. The generator returns
// 1200–1500 px frames; a piece is composited at most ~400 px tall into a
// layer, so the full-size frames are pure weight. Stored as JPEG because
// these are SOURCES — the pipeline re-keys them on every build, and the key
// is chroma-based, so mild JPEG ringing at an edge is despilled anyway.
const WORK = process.env.MESHY_WORK || '/tmp/meshy-work';
const { chromium } = await import(WORK + '/node_modules/playwright/index.mjs');
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises'
const SRC = process.env.PIECES ?? 'out/pieces', DST = process.argv[2], MAX = 1024
await mkdir(DST, { recursive: true })
const files = (await readdir(SRC)).filter(f => /\.(jpg|png)$/.test(f)).sort()
const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const pg = await br.newPage()
let total = 0
for (const f of files) {
  const url = `data:${f.endsWith('.png') ? 'image/png' : 'image/jpeg'};base64,${(await readFile(`${SRC}/${f}`)).toString('base64')}`
  const out = await pg.evaluate(async ({ url, MAX }) => {
    const img = new Image(); img.src = url; await img.decode()
    const s = Math.min(1, MAX / Math.max(img.width, img.height))
    const c = document.createElement('canvas')
    c.width = Math.round(img.width * s); c.height = Math.round(img.height * s)
    const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'
    g.drawImage(img, 0, 0, c.width, c.height)
    return c.toDataURL('image/jpeg', 0.88)
  }, { url, MAX })
  const buf = Buffer.from(out.split(',')[1], 'base64')
  await writeFile(`${DST}/${f.replace(/\.\w+$/, '.jpg')}`, buf)
  total += buf.length
}
console.log(`${files.length} pieces → ${DST}  ${(total / 1e6).toFixed(1)} MB`)
await br.close()
