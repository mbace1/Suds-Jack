#!/usr/bin/env node
// Bake the earth sources into what the game's seam actually takes.
//
// Two different products from one folder, because the ground needs two
// different things:
//
//   S-*  →  a DETAIL MAP: greyscale, histogram-stretched, multiplied onto a
//           palette colour (§3.2 — no asset invents a colour). Delegated to
//           detailmap.mjs, which is already the one place that logic lives.
//   E-*  →  a TILEABLE ALPHA STRIP. Keyed, cropped, and then MIRRORED onto
//           itself: a torn edge tiled from a raw strip shows a hard seam at
//           every join, and a mirrored tile is continuous at both of them.
//           There is no directional lighting story in a torn edge to break.
//   F-*  →  a CUTOUT: keyed, cropped, alpha, small. These are seen at under a
//           world unit, so 256 px is generous.
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
const WORK = process.env.MESHY_WORK || '/tmp/meshy-work';
const { chromium } = await import(WORK + '/node_modules/playwright/index.mjs');

const KEYLIB = await readFile(new URL('./keylib.js', import.meta.url), 'utf8')
const SRC = process.env.EARTH ?? 'craft/earth', DST = process.argv[2] ?? 'out/earth-baked'
await mkdir(DST, { recursive: true })
const files = (await readdir(SRC)).filter(f => /\.(jpg|png)$/.test(f)).sort()

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const page = await browser.newPage()
await page.goto('data:text/html,<html><body></body></html>')
await page.addScriptTag({ content: KEYLIB })

for (const f of files) {
  const stem = f.replace(/\.\w+$/, '')
  const kind = stem[0]
  if (kind === 'S') {
    // strata are a material swatch: luminance, stretched, tiling by mirror so
    // a 3.4-unit repeat does not announce itself with a hard vertical seam
    const out = `${DST}/${stem.slice(2)}_detail_v1.png`
    execFileSync('node', ['detailmap.mjs', `${SRC}/${f}`, out, '0.55', '512'], { stdio: 'inherit' })
    continue
  }
  const url = `data:${f.endsWith('.png') ? 'image/png' : 'image/jpeg'};base64,${(await readFile(`${SRC}/${f}`)).toString('base64')}`
  const dataUrl = await page.evaluate(async ({ url, kind }) => {
    const img = new Image(); img.src = url; await img.decode()
    const cv = keyImage(img)
    if (!cv) return null
    if (kind === 'F') {
      const s = Math.min(1, 256 / Math.max(cv.width, cv.height))
      const o = document.createElement('canvas')
      o.width = Math.round(cv.width * s); o.height = Math.round(cv.height * s)
      const g = o.getContext('2d'); g.imageSmoothingQuality = 'high'
      g.drawImage(cv, 0, 0, o.width, o.height)
      return o.toDataURL('image/png')
    }
    // E: a fringe/edge strip. Mirroring it onto itself was the obvious way to
    // make it tile and it is WRONG here — it makes every tile bilaterally
    // symmetric, so a run of them reads as a chain of identical scallops,
    // which is more machine-perfect than the flat bar it replaced. A hard
    // seam among grass tufts is far less visible than perfect symmetry, so
    // the strip ships as itself.
    //
    // Cropped to the RAGGED part only. The generator returns a strip with a
    // deep body under the fringe; kept, the strip's aspect is squat, the tile
    // has to be stretched horizontally to sit on a thin lip, and the tufts
    // compress into regular bumps.
    const keepTop = 0.62
    const H = 128, srcH = Math.round(cv.height * keepTop)
    const W = Math.round(H * (cv.width / srcH))
    const o = document.createElement('canvas')
    o.width = W; o.height = H
    const g = o.getContext('2d'); g.imageSmoothingQuality = 'high'
    g.drawImage(cv, 0, 0, cv.width, srcH, 0, 0, W, H)
    return o.toDataURL('image/png')
  }, { url, kind })
  if (!dataUrl) { console.log(`✗ ${stem} keyed to nothing`); continue }
  const name = kind === 'E' ? `${stem.slice(2)}_edge_v1.png` : `${stem.toLowerCase().replace('-', '_')}_v1.png`
  const buf = Buffer.from(dataUrl.split(',')[1], 'base64')
  await writeFile(`${DST}/${name}`, buf)
  console.log(`✓ ${name}  ${(buf.length / 1024).toFixed(0)} KB`)
}
await browser.close()
