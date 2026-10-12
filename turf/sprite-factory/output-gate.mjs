#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const MAGENTA = { r: 255, g: 0, b: 255 };
const TOL = 8;

function near(a, b, tol = TOL) { return Math.abs(a - b) <= tol; }
function isMagenta(r, g, b) { return near(r, MAGENTA.r) && near(g, MAGENTA.g) && near(b, MAGENTA.b); }

export async function gateImage(input) {
  const image = sharp(input).ensureAlpha();
  const meta = await image.metadata();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  let magenta = 0;
  let perimeter = 0;
  let perimeterMagenta = 0;
  let subjectMinX = width, subjectMaxX = -1, subjectMinY = height, subjectMaxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      const mag = a > 250 && isMagenta(r, g, b);
      if (mag) magenta++;
      else if (a > 10) {
        subjectMinX = Math.min(subjectMinX, x); subjectMaxX = Math.max(subjectMaxX, x);
        subjectMinY = Math.min(subjectMinY, y); subjectMaxY = Math.max(subjectMaxY, y);
      }
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
        perimeter++;
        if (mag) perimeterMagenta++;
      }
    }
  }

  const pixels = width * height;
  const magentaRatio = magenta / pixels;
  const perimeterMagentaRatio = perimeter ? perimeterMagenta / perimeter : 0;
  const hasSubject = subjectMaxX >= subjectMinX && subjectMaxY >= subjectMinY;
  const subjectBox = hasSubject ? {
    x: subjectMinX, y: subjectMinY,
    width: subjectMaxX - subjectMinX + 1,
    height: subjectMaxY - subjectMinY + 1
  } : null;
  const subjectAreaRatio = subjectBox ? (subjectBox.width * subjectBox.height) / pixels : 0;

  const failures = [];
  if (meta.format !== 'png') failures.push('O1: output must be PNG');
  if (magentaRatio < 0.45) failures.push(`O1/O2: magenta plate coverage too low (${(magentaRatio * 100).toFixed(1)}%)`);
  if (perimeterMagentaRatio < 0.98) failures.push(`O1/O3: perimeter is not clean #FF00FF (${(perimeterMagentaRatio * 100).toFixed(1)}%)`);
  if (!hasSubject) failures.push('O1: no sprite subject detected');
  if (subjectAreaRatio > 0.72) failures.push(`O1/O2: subject/background layout looks like a poster or full-canvas composition (${(subjectAreaRatio * 100).toFixed(1)}% bbox)`);

  return {
    pass: failures.length === 0,
    width, height,
    magentaRatio,
    perimeterMagentaRatio,
    subjectBox,
    subjectAreaRatio,
    failures
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const input = process.argv[2];
  if (!input) {
    console.error('usage: node output-gate.mjs <generated.png> [report.json]');
    process.exit(2);
  }
  const report = await gateImage(input);
  const json = JSON.stringify(report, null, 2) + '\n';
  if (process.argv[3]) fs.writeFileSync(path.resolve(process.argv[3]), json);
  process.stdout.write(json);
  if (!report.pass) process.exit(1);
}
