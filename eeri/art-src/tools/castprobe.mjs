#!/usr/bin/env node
// How magenta is a keyed piece, really? The despill only fires where g sits
// below BOTH r and b; a surface lit by BOUNCE off a magenta backing comes back
// with r and b merely raised, which passes that test and still reads salmon.
// This measures the green-magenta axis over the whole ink so the correction
// can be sized instead of guessed.
const WORK = process.env.MESHY_WORK || '/tmp/meshy-work';
const { chromium } = await import(WORK + '/node_modules/playwright/index.mjs');
import { readdir, readFile } from 'node:fs/promises'

const KEYLIB = await readFile(new URL('./keylib.js', import.meta.url), 'utf8')
const DIR = process.argv[2] ?? 'out/pieces'
const files = (await readdir(DIR)).filter(f => /\.(jpg|png)$/.test(f)).sort()

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const page = await browser.newPage()
await page.goto('data:text/html,<html><body></body></html>')
await page.addScriptTag({ content: KEYLIB })

for (const f of files) {
  const url = `data:${f.endsWith('.png') ? 'image/png' : 'image/jpeg'};base64,${(await readFile(`${DIR}/${f}`)).toString('base64')}`
  const r = await page.evaluate(async (url) => {
    const img = new Image(); img.src = url; await img.decode()
    const cv = keyImage(img); if (!cv) return null
    const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data
    let n = 0, sum = 0, hi = 0
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 200) continue
      const m = (d[i] + d[i + 2]) / 2 - d[i + 1]      // + = magenta lean
      sum += m; if (m > 14) hi++; n++
    }
    return { mean: sum / n, pct: (100 * hi) / n }
  }, url)
  if (r) console.log(`${f.replace(/\.\w+$/, '').padEnd(16)} mean ${r.mean.toFixed(1).padStart(6)}   >14: ${r.pct.toFixed(1).padStart(5)}%`)
}
await browser.close()
