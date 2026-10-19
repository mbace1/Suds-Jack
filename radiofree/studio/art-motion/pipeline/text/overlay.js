// THE CAPTION PASS for films whose picture is drawn somewhere else (the papercut engine; later, anything that can
// write frames). It takes the finished frames and the film's plan.json (pipeline/plan.mjs) and puts the words on:
// the same captions.js, the same scrim rule (measured on these frames), the station's bug — so a papercut film and
// a canvas film have one caption look, one set of checks and one events file for the score.
//   overlay.html?plan=<url of plan.json>&src=<url of a folder of f00001.jpg…>&n=<frames>&fonts=<url>
import * as CAP from './captions.js';

const Q = new URLSearchParams(location.search), N = +Q.get('n'), SRC = Q.get('src');
await CAP.loadFonts(Q.get('fonts'));
const plan = await (await fetch(Q.get('plan'))).json(), FPS = plan.fps;
const out = document.createElement('canvas'); out.width = 1080; out.height = 1920; const g = out.getContext('2d');
const load = (i) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('no frame ' + i)); im.src = `${SRC}f${String(i + 1).padStart(5, '0')}.jpg`; });
const idx = (t) => Math.max(0, Math.min(N - 1, Math.round(t * FPS)));

// the scrim rule needs the picture behind each line: preload the frames it samples
const imgs = new Map();
for (const c of plan.captions) for (let k = 0; k < 5; k++) { const i = idx(c.t0 + ((k + 0.5) / 5) * (c.t1 - c.t0)); if (!imgs.has(i)) imgs.set(i, await load(i)); }
const BUSY = CAP.measureBusy(g, plan, (t) => { g.drawImage(imgs.get(idx(t)), 0, 0); return out; });

const keep = (t) => (plan.keep || []).filter((k) => t >= k.t0 && t <= k.t1).map((k) => ({ what: k.what, x: k.rect[0], y: k.rect[1], w: k.rect[2], h: k.rect[3] }));
async function frame(i) { const t = i / FPS; g.drawImage(await load(i), 0, 0); CAP.draw(g, plan, t, { busy: BUSY }); if (plan.series !== 'toko') CAP.bug(g, 'RADIO FREE HELSINKI', plan.captions[0]?.size || 'house'); return out; }   // a Toko film carries no station bug
const flat = Object.fromEntries(Object.entries(plan.cues).map(([k, v]) => [k, v]));
window.__film = {
  fps: FPS, frames: N, lang: plan.lang,
  events: { ...plan.T, ...flat, lang: plan.lang, holds: plan.holds, cues: plan.cues, ...CAP.events(plan), quiet: plan.quiet },
  report: CAP.report(g, plan, { keep, busy: BUSY }),
  async frame(i, q = 0.93) { return (await frame(i)).toDataURL('image/jpeg', q); },
  async still(t) { return (await frame(idx(t))).toDataURL('image/png'); },
};
window.__ready = true;
