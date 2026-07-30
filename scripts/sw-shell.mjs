// The arcade worker's precache list, derived rather than kept.
//
//   node scripts/sw-shell.mjs [root]        # default: the repo
//
// A precache list IS the module graph, and a hand-kept copy of a graph drifts:
// the list said `feedback.js?v=7` while the page asked for `?v=9`, which is an
// arcade that loads perfectly online and is blank the moment you lose signal —
// the worker had cached a URL nobody would ever request again. So it is read
// back off the page and off hub.js every time, by this one function, used both
// here and by deploy-hub.mjs for the deployed tree.
//
// The two callers do not share a filesystem view — deploy-hub.mjs works on an
// overlay of edits that have not landed yet — so these take TEXT, not paths.
//
// `test/hub-smoke.cjs` asserts the result, so drift fails the gate rather than
// waiting for someone to board a plane.

import fs from 'node:fs';
import path from 'node:path';

// Everything the page loads out of hub/, plus everything hub.js imports —
// which is where the modules the page never names directly come from.
export const shellOf = (indexHtml, hubJs) => [...new Set([
  ...(indexHtml.match(/hub\/[\w.-]+\.(?:js|css)\?v=\d+/g) ?? []),
  ...[...hubJs.matchAll(/from '\.\/([\w.-]+\.js\?v=\d+)'/g)].map(m => `hub/${m[1]}`),
])].sort();

// `./` and `./index.html` are the fixed head: the page shell is network-first
// and carries no token, so it can never come out of a scan for tokens.
export const withShell = (sw, list) => sw.replace(
  /(const SHELL = \[\n {2}'\.\/',\n {2}'\.\/index\.html',\n)(?: {2}'[^']*',\n)*(\];)/,
  (_, head, tail) => head + list.map(u => `  './${u}',`).join('\n') + '\n' + tail);

if (import.meta.filename === process.argv[1]) {
  const root = process.argv[2] ?? path.resolve(import.meta.dirname, '..');
  const at = f => fs.readFileSync(path.join(root, f), 'utf8');
  const list = shellOf(at('index.html'), at('hub/hub.js'));
  const was = at('sw.js');
  const out = withShell(was, list);
  if (out === was) console.log(`sw.js already names all ${list.length} modules`);
  else {
    fs.writeFileSync(path.join(root, 'sw.js'), out);
    console.log(`sw.js now precaches ${list.length} modules:\n  ${list.join('\n  ')}`);
  }
}
