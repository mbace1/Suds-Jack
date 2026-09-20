// Experimental sprite generator: free-form prompt + optional reference image(s).
// Decoupled from assets/manifest.mjs on purpose — this is the probe harness, and
// a future standalone app would want exactly this shape (prompt in, PNG out).
//   node gen.mjs <promptFile> <out.png> [ref1.png] [ref2.png]
import { readFileSync, writeFileSync } from 'node:fs';
import * as banana from '../../../scripts/lib/nano-banana.mjs';

const [, , promptFile, out, ...refs] = process.argv;
const prompt = readFileSync(promptFile, 'utf8');
const key = banana.keyFrom(process.env);
if (!key) { console.log('no GEMINI_API_KEY'); process.exit(1); }

// nano-banana's generateImage takes a single `image`; when more than one
// reference matters we pass the first and name the rest in the prompt text.
const image = refs[0] ? { bytes: readFileSync(refs[0]), mime: 'image/png' } : undefined;

const t0 = Date.now();
const { bytes } = await banana.generateImage({
  prompt,
  model: 'gemini-2.5-flash-image',
  aspect: process.env.ASPECT || '1:1',
  apiKey: key,
  image,
});
writeFileSync(out, bytes);
console.log(`→ ${out}  ${(bytes.length / 1024).toFixed(0)}kb  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
