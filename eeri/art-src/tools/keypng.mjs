#!/usr/bin/env node
/**
 * Key a magenta-backed concept straight to a transparent PNG.
 *
 *   node keypng.mjs <in.png> <out.png> [maxWidth]
 *
 * Uses the shared keylib (hue-ratio key + despill + alpha bleed + crop to
 * ink), so a UI plate gets exactly the same treatment as a layer piece —
 * including the bleed, without which any downscale grows a magenta fringe
 * out of pixels that are supposedly invisible.
 */
const WORK = process.env.MESHY_WORK || '/tmp/meshy-work';
const { chromium } = await import(WORK + '/node_modules/playwright/index.mjs');
import { readFile, writeFile } from 'node:fs/promises'
const KEYLIB = await readFile(new URL('./keylib.js', import.meta.url), 'utf8')
const [src, out, maxW] = process.argv.slice(2)
const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const pg = await br.newPage()
await pg.goto('data:text/html,<html><body></body></html>')
await pg.addScriptTag({ content: KEYLIB })
const url = `data:image/${src.endsWith('.png')?'png':'jpeg'};base64,${(await readFile(src)).toString('base64')}`
const dataUrl = await pg.evaluate(async ({ url, maxW }) => {
  const img = new Image(); img.src = url; await img.decode()
  const cv = keyImage(img); if (!cv) return null
  if (!maxW || cv.width <= maxW) return cv.toDataURL('image/png')
  const s = maxW / cv.width, o = document.createElement('canvas')
  o.width = Math.round(cv.width * s); o.height = Math.round(cv.height * s)
  const g = o.getContext('2d'); g.imageSmoothingQuality = 'high'
  g.drawImage(cv, 0, 0, o.width, o.height)
  return o.toDataURL('image/png')
}, { url, maxW: Number(maxW || 0) })
const buf = Buffer.from(dataUrl.split(',')[1], 'base64')
await writeFile(out, buf)
console.log(`→ ${out}  ${(buf.length/1024).toFixed(0)} KB`)
await br.close()
