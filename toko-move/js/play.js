// Toko Move v3 — THE STAGE (owner, 2026-11-02: "more of the new design, less
// of the old map with visible trams on a realistic schedule … more curated
// narrative roguelike with fun choices and minimalistic visuals"; signed off as
// turn-based card hops, the scenes as the main view with the board between
// moments, and a slim job strip). Act 1 since v3.1 (ACT1.md): risky cards with
// their stakes on the button, the reveal that follows, euros, the weather, the
// old trams, the key stations' landmarks, and the motion.
//
// journey.js is the game and knows nothing of a screen; this file acts it out.
// One moment at a time:
//   · AT A STOP   the iso stop scene — its landmark if it is a key station,
//                 its plate, the tram that came or is coming (six models,
//                 look only) — and ONE card at the bottom: a Toko face, one
//                 line, at most two buttons, each with its price in time and
//                 its stakes ("maybe ×1.3 · or +3:00"). A corner inset of the
//                 board shows the offers as the paths they are
//   · ABOARD      the tram interior (the night car on NIGHT) with the in-car
//                 display, and, if the deck deals one there, its card
//   · BETWEEN     the board: the courier disc rides the real line; a walk is
//                 a dash; the weather falls on it
//   · A REVEAL    what a choice did: the line (often the funny one) and its
//                 chips — ×1.3, +3:00, +€120 · job gone
//   · DELIVERED   a stamp: the fee, and what was inside all along
// The clock moves only by the prices you choose and what they cost you, so
// nothing happens while you read. Every animation is skippable by a tap and
// none of them is a timer the game waits on to be fair: the state has already
// moved when it starts.
import { tr } from './lang.js?v=22';
import * as J from './journey.js?v=14';
import * as Runs from './runs.js?v=7';
import { HopBoard } from './hopboard.js?v=4';
import * as PL from './playlog.js?v=2';
import { loadGround } from './ground.js?v=12';
import { skinFor } from './skin.js?v=1';
import { moodFace, MOODS } from './events.js?v=10';
import { buildRealHelsinki } from './real-helsinki.js?v=5';
import { colourOf, parcelHtml } from './parcels.js?v=1';
import { esc } from './ui.js?v=2';
import { STORE } from './platform.js?v=1';
import { lineFamily } from './board.js?v=8';
import { TRAMS } from './cards.js?v=4';
import { mountAudio } from './audio.js?v=2';
import { loadStanding, saveStanding } from './regulars.js?v=4';
import { addNote } from './sealed.js?v=2';
import { MISSIONS, PERKS, STRIKES, loadMissions, missionOpen, recordMission, perkPool, doneCount } from './missions.js?v=5';
import { MOMENTS, faceIn, keepIn, pickupMoment, deliveryMoment, boardMoment, walkMoment, cardMoment, choiceMoment, haltMoment } from './moments.js?v=4';
import { resolveMode, dailyShare, errandShare, errandStore, errandOf, W } from './modes.js?v=8';
import { recordDaily, todayRecord, streak, dateKey } from './daily.js?v=2';

export const BUILD_VERSION = '3.27';
const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
// a run of the ladder, today's daily, or a day of the week (modes.js, ACT1.md §12)
const MODE = resolveMode(params);
const RUN = MODE.run;
const SEED = MODE.seed || (1000 + Math.floor(Math.random() * 9000));
const SKIN = skinFor({ mutator: RUN.skin || null });
const NIGHT = SKIN.id === 'night';
const CALM = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── the scenes (art/minimal-metro-look/layers/*/MOTION.md; make_act1.py) ──
// Each is a stack of full-frame layers, cut once to WebP in two native plates
// (9:16 and 16:9 — each its own composition, not a crop). The frame is fitted
// to COVER the screen and every layer moves inside it, so a sway is a sway of
// the car and never of the screen. `face` is the courier's Toko face (the
// push-in's origin); `focus` is the point a cropped screen keeps in view.
const SCENES = {
  tram: { layers: ['01-outside-tile', '02-car', '03-people', '04-courier'], tile: { '916': 1222 / 1920, '169': 1670 / 1080 }, face: { '916': [.53, .34], '169': [.43, .22] }, focus: { '916': [.5, .5], '169': [.5, .45] } },
  night: { layers: ['01-outside-tile', '02-car', '03-people', '04-courier'], drift: true, face: { '916': [.29, .59], '169': [.29, .25] }, focus: { '916': [.42, .55], '169': [.45, .5] } },
  // the metro by day (v3.11): the tram's car in the metro's colours, a tunnel for a window (make_cars.py)
  metro: { layers: ['01-outside-tile', '02-car', '03-people', '04-courier'], tile: { '916': 1222 / 1920, '169': 1670 / 1080 }, face: { '916': [.53, .34], '169': [.43, .22] }, focus: { '916': [.5, .5], '169': [.5, .45] } },
  stop: { layers: ['01-backdrop', '02-street', '04-shelter', '05-people', '06-courier'], face: { '916': [.89, .32], '169': [.59, .33] }, focus: { '916': [.68, .4], '169': [.55, .45] } },
};
// THE MOMENTS (v3.12, js/moments.js): the owner's art pack, one full-frame
// picture per beat of the job, cut for each format; the push-in starts at the
// courier's face.
for (const id of Object.keys(MOMENTS)) SCENES[`m-${id}`] = { moment: id, layers: [], face: { '916': faceIn(id, '916'), '169': faceIn(id, '169') }, focus: { '916': keepIn(id, '916'), '169': keepIn(id, '169') } };
// The key stations (ACT1.md §7): their plate is the bold one. Since v3.10 every
// place has a landmark behind the stop (act1.json's `land`), not only these.
const LANDMARKS = new Set(['rautatientori', 'senaatintori', 'kauppatori', 'kamppi', 'kallionkirkko', 'hakaniemi', 'ooppera', 'lasipalatsi', 'olympiaterminaali', 'hietalahti', 'kalasatama', 'pasila']);
// Where the stop's plate stands, in frame fractions: beside the shelter, inside
// a phone's crop and clear of the card.
const PLATE = { '916': [.40, .445], '169': [.255, .52] };
const WX = { clear: { glyph: '☀', name: 'Clear', line: 'A quiet city.' }, rain: { glyph: '☂', name: 'Rain', line: 'Paper gets wet. Bring a bag.' },
  snow: { glyph: '❄', name: 'Snow', line: 'Walks are slow and the trams are full.' }, fog: { glyph: '〰', name: 'Fog', line: 'You can hear the city better than you can see it.' } };
const NIGHT_WX = { clear: 'The last trams are running. Mostly.' };

const CSS = `
@property --p{syntax:'<number>';inherits:false;initial-value:0}
#v3{position:fixed;inset:0;overflow:hidden;overflow:clip;background:#f4f1e8;color:#15262b;font-family:Inter,system-ui,-apple-system,'Segoe UI',sans-serif;-webkit-user-select:none;user-select:none;touch-action:manipulation}
#v3[hidden]{display:none}
#v3 .frame{position:absolute;left:0;top:0;transition:opacity .22s}
#v3.fmt-916 .frame{width:max(100vw,calc(100vh * 9 / 16));width:max(100vw,calc(100dvh * 9 / 16));aspect-ratio:9/16}
#v3.fmt-169 .frame{width:max(100vw,calc(100vh * 16 / 9));width:max(100vw,calc(100dvh * 16 / 9));aspect-ratio:16/9}
#v3 .frame.fade{opacity:0}
#v3 .frame.push{animation:v3push 2.4s ease-out both}
@keyframes v3push{from{transform:scale(1)}to{transform:scale(1.035)}}
#v3 .L{position:absolute;inset:0;background-size:100% 100%;background-repeat:no-repeat}
#v3 .L.tile{background-size:auto 100%;background-repeat:repeat-x;animation:v3scroll 11s linear infinite}
@keyframes v3scroll{from{background-position:0 0}to{background-position:calc(var(--tw,1000px) * -1) 0}}
#v3 .L.drift{background-size:auto 100%;background-repeat:repeat-x;animation:v3drift 9s ease-in-out infinite alternate}
@keyframes v3drift{from{background-position:0 0}to{background-position:-28px 0}}
#v3 .sway{animation:v3sway 1.6s ease-in-out infinite}
#v3 .sway.lag{animation-delay:-.08s}
#v3.night-car .sway{animation-duration:1.1s}
#v3 .bob{animation:v3sway 1.6s ease-in-out infinite,v3bob .8s ease-in-out infinite}
@keyframes v3sway{0%,100%{transform:translateY(-1.4px)}50%{transform:translateY(1.4px)}}
@keyframes v3bob{0%,100%{margin-top:0}50%{margin-top:.8px}}
#v3 .shift{animation:v3shift 4s ease-in-out infinite alternate}
@keyframes v3shift{from{transform:translateX(0)}to{transform:translateX(2px)}}
#v3 .idle{animation:v3idle 2.4s ease-in-out infinite alternate}
@keyframes v3idle{from{transform:translateY(0)}to{transform:translateY(1.5px)}}
#v3 .L.wheel{animation:v3turn 48s linear infinite}
@keyframes v3turn{to{transform:rotate(360deg)}}
#v3 .L.ferry{animation:v3ferry 3.4s ease-in-out infinite alternate}
@keyframes v3ferry{from{transform:translateY(0) rotate(0)}to{transform:translateY(2.5px) rotate(.25deg)}}
#v3 .L.dusk{background:linear-gradient(#0b1530,#1b2a4d 60%,rgba(27,42,77,0) 92%);opacity:.86}
#v3.night-stop .L:not(.dusk):not(.glow){filter:brightness(.5) saturate(.72)}
#v3 .L.tram.glow{filter:drop-shadow(0 0 14px rgba(255,196,110,.75)) brightness(1.08)}
#v3 .L.tram{will-change:transform}
#v3 .L.tram[hidden]{display:none}
#v3 .chip{position:absolute;transform:translate(-50%,-50%);display:grid;place-items:center;border-radius:6px;color:#fff;font:900 clamp(9px,1.6vmin,16px)/1 Inter,system-ui,sans-serif;letter-spacing:.5px}
#v3 .chip.halted{background:transparent;color:#ffd2c2;animation:v3pulse 2s ease-out infinite}
@keyframes v3pulse{from{box-shadow:0 0 0 0 rgba(226,104,60,.8)}to{box-shadow:0 0 0 1.4em rgba(226,104,60,0)}}
#v3 .plate{position:absolute;transform:translate(-50%,-100%);display:flex;flex-direction:column;align-items:center;pointer-events:none}
#v3 .plate .pl{display:flex;flex-direction:column;align-items:center;gap:4px;padding:6px 10px 7px;border-radius:9px;background:#15262b;color:#e6edf0;box-shadow:0 2px 0 rgba(0,0,0,.15)}
#v3 .plate .pl b{font:800 clamp(10px,2.3vmin,15px)/1 Inter,system-ui,sans-serif;letter-spacing:1.4px;white-space:nowrap}
#v3 .plate .pl .lines{display:flex;gap:3px}
#v3 .plate .pl .lines i{font-style:normal;display:grid;place-items:center;min-width:18px;height:15px;padding:0 3px;border-radius:4px;font:800 10px/1 Inter,system-ui,sans-serif;color:#fff;box-shadow:0 0 0 1.5px #fff}
#v3 .plate .pole{width:3px;height:clamp(20px,6vmin,46px);background:#15262b}
#v3 .plate.key .pl{background:#233d4d;box-shadow:0 0 0 2px #ffcc00,0 2px 0 rgba(0,0,0,.15)}
#v3wx{position:absolute;inset:0;pointer-events:none;z-index:2;opacity:0;transition:opacity .4s}
#v3wx.on{opacity:1}
#v3wx.snow{background-image:radial-gradient(circle,#fff 0 1.6px,transparent 2.2px),radial-gradient(circle,rgba(255,255,255,.9) 0 2.6px,transparent 3.2px);background-size:90px 90px,170px 170px;animation:v3snow 9s linear infinite;filter:drop-shadow(0 0 1px rgba(120,145,160,.6))}
@keyframes v3snow{from{background-position:0 0,40px 0}to{background-position:-60px 90px,10px 170px}}
#v3wx.rain{background-image:repeating-linear-gradient(105deg,transparent 0 22px,rgba(120,160,190,.38) 22px 23.5px,transparent 23.5px 47px);background-size:100% 140px;animation:v3rain .45s linear infinite}
@keyframes v3rain{from{background-position:0 0}to{background-position:-36px 140px}}
#v3wx.fog{background:linear-gradient(180deg,rgba(236,240,242,.0),rgba(236,240,242,.55) 45%,rgba(236,240,242,.15)),radial-gradient(60% 30% at 30% 55%,rgba(255,255,255,.45),transparent),radial-gradient(50% 25% at 70% 40%,rgba(255,255,255,.35),transparent);background-size:100% 100%,200% 100%,200% 100%;animation:v3fog 14s ease-in-out infinite alternate}
@keyframes v3fog{from{background-position:0 0,0 0,0 0}to{background-position:0 0,-60% 0,40% 0}}
#v3.night #v3wx.fog{background:linear-gradient(180deg,rgba(40,52,70,0),rgba(70,84,104,.5) 45%,rgba(40,52,70,.1)),radial-gradient(60% 30% at 30% 55%,rgba(110,124,146,.4),transparent);background-size:100% 100%,200% 100%}
#v3board{position:absolute;inset:0;width:100%;height:100%;opacity:0;transition:opacity .22s;pointer-events:none}
#v3 .L.actor{animation:v3actor .45s cubic-bezier(.2,.7,.2,1) both}
#v3 .L.actor.out{opacity:0;transition:opacity .25s}
@keyframes v3actor{from{opacity:0;transform:translateY(1.2%)}to{opacity:1;transform:none}}
#v3board.on{opacity:1;pointer-events:auto;animation:v3settle .55s cubic-bezier(.2,.7,.2,1)}
@keyframes v3settle{from{transform:scale(1.045)}to{transform:none}}
#v3top{position:absolute;left:0;right:0;top:calc(env(safe-area-inset-top) + 10px);display:flex;flex-direction:column;align-items:center;gap:6px;pointer-events:none;z-index:3}
#v3top .v3pill{transform-origin:50% 50%}   /* fitTop() places it between the HUB button and ♪ */
#v3sound{position:absolute;top:calc(env(safe-area-inset-top) + 8px);right:calc(env(safe-area-inset-right) + 8px);z-index:4;width:44px;height:44px;border-radius:50%;border:0;background:#fff;color:#233d4d;font:700 19px/44px system-ui,sans-serif;box-shadow:0 0 0 1px rgba(21,38,43,.12),0 2px 6px rgba(21,38,43,.14);cursor:pointer;padding:0}
#v3sound.off{color:rgba(35,61,77,.38);text-decoration:line-through}
#v3.night #v3sound{background:#161e24;color:#f6f9fc;box-shadow:0 0 0 1px #2a363e}#v3.night #v3sound.off{color:rgba(246,249,252,.38)}
.v3pill{display:inline-flex;align-items:center;gap:9px;padding:3px 3px 3px 12px;height:40px;border-radius:999px;background:#fff;box-shadow:0 0 0 1px rgba(21,38,43,.12),0 2px 6px rgba(21,38,43,.14)}
.v3pill .clk{font-size:18px;font-weight:800;font-variant-numeric:tabular-nums;line-height:1}
.v3pill .wxg{font-size:14px;line-height:1;opacity:.75}
.v3pill .dots{font-size:14px;letter-spacing:2px;color:#233d4d;line-height:1}
.v3pill .dots .dotN{font-size:12px;letter-spacing:0;margin-right:4px;font-weight:800}
.evPad{display:inline-grid;place-items:center;min-width:22px;height:22px;margin-right:8px;border-radius:50%;border:2px solid currentColor;color:inherit;font:800 12px/1 system-ui,sans-serif;flex:none;box-sizing:border-box}
.padLit{outline:3px solid #ffcc00!important;outline-offset:3px}
.v3pill .dots i{font-style:normal;color:#e2683c}
.v3pill .dots .pop{display:inline-block;animation:v3pop .5s ease-out}
@keyframes v3pop{0%{transform:scale(1)}35%{transform:scale(1.8)}100%{transform:scale(1)}}
.v3pill .eur{font-size:15px;font-weight:800;color:#3f7a45;font-variant-numeric:tabular-nums;line-height:1;min-width:2.6em;text-align:right}
.v3pill .eur.up{animation:v3pop .5s ease-out}
.v3ring{position:relative;display:inline-grid;place-items:center;width:34px;height:34px;border-radius:50%;background:conic-gradient(var(--ring,#233d4d) calc(var(--p) * 1%),#e2e6e1 0);transition:--p .9s ease-out}
.v3ring::after{content:'';position:absolute;inset:4px;border-radius:50%;background:#fff}
.v3ring .pcl{position:relative;z-index:1}
.v3strip{display:flex;align-items:center;gap:7px;max-width:min(94vw,470px);min-height:30px;padding:4px 13px;border-radius:999px;background:rgba(255,253,247,.95);box-shadow:0 0 0 1px rgba(21,38,43,.10);font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden}
.v3strip[hidden]{display:none}
.v3strip b{font-weight:800;letter-spacing:1px;overflow:hidden;text-overflow:ellipsis}
.v3strip .fee{color:#3f7a45;font-weight:800;font-variant-numeric:tabular-nums}
.v3strip .mult{color:#3f7a45;font-weight:800}.v3strip .mult.down{color:#b34a36}
.v3strip .left{color:#69777a;font-variant-numeric:tabular-nums}
.v3strip .left.late{color:#b34a36}
#v3.night .v3pill,#v3.night .v3strip{background:#161e24;color:#f6f9fc;box-shadow:0 0 0 1px #2a363e}
#v3.night .v3pill .dots{color:#f6f9fc}#v3.night .v3pill .eur,#v3.night .v3strip .fee{color:#7ad3b0}
#v3.night .v3ring{background:conic-gradient(var(--ring,#7ad3b0) calc(var(--p) * 1%),#2a363e 0)}
#v3.night .v3ring::after{background:#161e24}
#v3mini{position:absolute;right:12px;top:calc(env(safe-area-inset-top) + 98px);width:min(34vw,164px);aspect-ratio:1;padding:0;border:0;border-radius:18px;overflow:hidden;background:#f4f1e8;box-shadow:0 0 0 3px #fff,0 4px 14px rgba(21,38,43,.25);cursor:pointer;z-index:3;transition:opacity .2s}
#v3mini canvas{display:block;width:100%;height:100%}
#v3mini[hidden]{display:none}
#v3mini.left{right:auto;left:12px}   /* v3.22: the inset steps aside when Toko's face would be under it */
#v3mini .tag{position:absolute;left:8px;bottom:6px;font:800 10px/1 ui-monospace,Menlo,monospace;letter-spacing:1.5px;color:#15262b;background:rgba(255,255,255,.85);padding:3px 5px;border-radius:5px}
#v3panel{position:absolute;left:12px;right:12px;bottom:calc(env(safe-area-inset-bottom) + 12px);max-width:520px;margin:0 auto;z-index:4}
@media (orientation:landscape){#v3panel{left:auto;right:16px;width:min(440px,50vw)}#v3mini{top:calc(env(safe-area-inset-top) + 64px)}}
/* a moment (v3.12) is a picture of people at the middle of the frame: sideways, its stamp is narrower, so the parcel in their hands stays in view */
@media (orientation:landscape){#v3.moment #v3panel{width:min(340px,38vw)}}
#v3panel .eventCard{margin:0;animation:v3stamp .26s cubic-bezier(.2,.8,.3,1.2) both}
#v3panel .leaving{animation:v3leave .18s ease-in both}
@keyframes v3stamp{from{opacity:0;transform:translateY(28px) scale(.98)}to{opacity:1;transform:none}}
@keyframes v3leave{to{opacity:0;transform:translateY(16px)}}
.evAt{display:block;font-size:11px;font-weight:800;letter-spacing:1.6px;color:#69777a;margin-bottom:3px}
.evBtn .evLb{display:flex;flex-direction:column;gap:2px;min-width:0}
.evStk{display:block;font-size:11.5px;font-weight:600;line-height:1.25;opacity:.92;white-space:normal}
.evStk em{font-style:normal;font-weight:800;padding:0 4px;border-radius:4px;margin-right:2px}
.evStk em.usually{background:#dff0e3;color:#2f6b3a}.evStk em.maybe{background:#fff1c7;color:#7a5a00}.evStk em.long{background:#fde0d4;color:#a13d1d}
.evPrimary .evStk em.usually{background:#3f7a45;color:#fff}.evPrimary .evStk em.maybe{background:#ffcc00;color:#15262b}.evPrimary .evStk em.long{background:#e2683c;color:#fff}
.evStk .or{opacity:.7;margin:0 2px}
/* v3.18: the menus wear the game's own lower third (owner: "This same lower third look, should be used in
   menus and the intro screen"): the card sits at the foot of an approved picture, with the same pill buttons */
.veil{align-items:flex-end;padding:12px 12px calc(12px + env(safe-area-inset-bottom));background:rgba(237,242,238,.28)}
#title.veil{background:linear-gradient(rgba(237,242,238,0) 35%,rgba(237,242,238,.6)),url(scenes/moments/916/tram-stop.webp) center 28%/cover no-repeat,#edf2ee}
@media (orientation:landscape){.veil{justify-content:flex-end}#title.veil{background-image:linear-gradient(90deg,rgba(237,242,238,0) 40%,rgba(237,242,238,.6)),url(scenes/moments/169/tram-stop.webp)}}
.veil .card{max-width:440px;border-radius:18px;padding:14px 14px 12px;border:1px solid #c5cec8;box-shadow:0 3px 0 #d3d8d1,0 10px 30px rgba(21,38,43,.2);max-height:min(76dvh,680px);overflow-y:auto;animation:v3stamp .3s cubic-bezier(.2,.8,.3,1.2) both}
.veil .card h1{font-size:24px;display:flex;align-items:center;gap:10px}.veil .card h1 .evFace{width:40px;height:40px;flex:none}
.veil .btn{border-radius:999px;min-height:48px;border:1.5px solid #233d4d;font-weight:800;letter-spacing:.5px}
.veil .btn.ghost{background:#fffdf7;color:#15262b}
.veil .run{border-radius:999px;border:1.5px solid #233d4d;min-height:46px;padding:2px 14px}
.veil .run.on{background:#233d4d;color:#fff;border-color:#233d4d}.veil .run.on small{color:#cfe0e6}
.veil .run.locked{border:1.5px dashed #b9c2bd;color:#69777a}
.veil .mutHead{margin-top:10px}
.playsText{white-space:pre-wrap;font-size:11px;line-height:1.45;max-height:200px;overflow:auto;text-align:left}
#title .card{max-height:min(60dvh,600px)}
@media (orientation:landscape){#title .card{max-height:calc(100dvh - 24px)}}
.veil a.btn{display:block;text-align:center;text-decoration:none;line-height:1.25;padding:13px 12px}
.veil #play{position:sticky;bottom:-12px;z-index:2;box-shadow:0 0 0 6px #fffdf7,0 -10px 14px 2px #fffdf7}
/* v3.18: three at every choice; the third sometimes special (gold), now and then very special */
.ev3 .evBtn{min-height:46px;padding:6px 14px}.ev3{gap:6px!important}
.evTier{display:block;font-size:9.5px;font-weight:900;letter-spacing:1.6px;line-height:1;margin-bottom:2px}
.evSpecial{background:#fff3cf;color:#15262b;border-color:#d39a14!important;box-shadow:inset 0 0 0 1px #f2c94c}.evSpecial .evTier{color:#a9750a}
.evVery{background:linear-gradient(100deg,#e9f8fc 0%,#fff6d8 45%,#e9f8fc 90%);background-size:220% 100%;color:#15262b;border-color:#33b2d2!important;box-shadow:0 0 0 2px rgba(51,178,210,.25),0 0 14px rgba(242,201,76,.55);animation:evShine 2.6s linear infinite}.evVery .evTier{color:#1f8fae}
@keyframes evShine{to{background-position:-220% 0}}
@media (prefers-reduced-motion:reduce){.evVery{animation:none}}
.v3sign{display:flex;align-items:center;gap:10px;padding:12px 16px;border-radius:14px;background:#101418;color:#ffb648;font:700 15px/1.2 ui-monospace,'SF Mono',Menlo,Consolas,monospace;letter-spacing:1px;box-shadow:0 0 0 2px #2a2f34,0 4px 14px rgba(0,0,0,.35);animation:v3stamp .22s ease-out both;flex-wrap:wrap}
.v3sign .lb{display:inline-grid;place-items:center;min-width:34px;height:26px;padding:0 6px;border-radius:6px;color:#fff;font-weight:900}
.v3sign .nx{color:#fff}.v3sign .then{flex-basis:100%;font-size:11px;color:#ffb648;opacity:.75;letter-spacing:1.5px}.v3sign .model{flex-basis:100%;font-size:11px;color:#8a949b;letter-spacing:2px}
.v3stamp{display:flex;flex-direction:column;align-items:center;gap:5px;padding:16px;border-radius:18px;background:#fffdf7;border:3px solid #233d4d;box-shadow:0 6px 20px rgba(21,38,43,.25);text-align:center;animation:v3bump .42s cubic-bezier(.2,.9,.3,1.35) both}
@keyframes v3bump{0%{opacity:0;transform:translateY(24px) scale(.92) rotate(-1.5deg)}100%{opacity:1;transform:none}}
.v3stamp .big{font-size:21px;font-weight:900;letter-spacing:3px;color:#233d4d}
.v3stamp.late{border-color:#e2683c}.v3stamp.late .big{color:#b34a36}
.v3stamp .pts{font-size:16px;font-weight:800;color:#3f7a45}
.v3stamp .inside{font-size:13px;color:#4d5a5e;font-style:italic}
.v3stamp .xtra{font-size:12px;font-weight:700;color:#233d4d}.v3stamp .xtra.strike{color:#b34a36;letter-spacing:1px;font-weight:900}.v3stamp .xtra.note{font-weight:400;font-style:italic;color:#6b5a2e}
.v3strip .race{color:#b5532c;font-weight:700}.v3strip .race.late{text-decoration:line-through}
.v3stamp.rare{border-color:#c9a24a;background:#fffaf0}.v3stamp.rare .big{color:#8a6802}
.v3stamp.wxs{border-color:#33b2d2}.v3stamp.wxs .big{color:#176b73}
.v3rev{display:flex;gap:12px;align-items:flex-start;padding:14px 16px;border-radius:16px;background:#fffdf7;border:2px solid #233d4d;box-shadow:0 6px 20px rgba(21,38,43,.22);animation:v3bump .4s cubic-bezier(.2,.9,.3,1.35) both}
.v3rev.win{border-color:#3f7a45}.v3rev.lose{border-color:#e2683c}.v3rev.sold{border-color:#c9a24a}
.v3rev .evFace{flex:none}
.v3rev .say{font-size:14.5px;font-weight:600;line-height:1.35;color:#15262b}
.v3rev .chips{display:flex;flex-wrap:wrap;gap:5px;margin-top:7px}
.v3rev .chips i{font-style:normal;font-size:12.5px;font-weight:800;padding:3px 8px;border-radius:999px;background:#e9efe9;color:#2f6b3a}
.v3rev .chips i.bad{background:#fde0d4;color:#a13d1d}
.v3rev .tag{font-size:10.5px;font-weight:900;letter-spacing:1.6px;color:#69777a;margin-bottom:3px}
.v3tap{position:absolute;right:14px;bottom:calc(env(safe-area-inset-bottom) + 14px);font:700 11px/1 ui-monospace,Menlo,monospace;letter-spacing:1.5px;color:rgba(21,38,43,.55);pointer-events:none;z-index:4}
#v3.night .v3tap{color:rgba(246,249,252,.6)}
.carried{margin-top:10px;text-align:left}.carried h3{font-size:11px;letter-spacing:1.5px;color:var(--dim,#69777a)}.carried li{font-size:12.5px;margin:4px 0 0 18px}
.carried li small{color:var(--dim,#69777a)}
/* v3.17: the missions on the map, a pin where each one starts */
.missionMap{position:relative;margin:4px 0 8px;border-radius:14px;overflow:hidden;box-shadow:0 0 0 1px #c5cec8;background:#f4f1e8}
.missionMap canvas{display:block;width:100%;height:clamp(150px,24vh,210px);cursor:pointer;touch-action:manipulation}
@media (prefers-reduced-motion:reduce){#v3 .L,#v3 .sway,#v3 .bob,#v3 .shift,#v3 .idle,#v3 .frame.push,#v3wx,#v3 .chip.halted,#v3board.on{animation:none!important}}
`;

// ── the page ───────────────────────────────────────────────────────────────
// The old real-time game's chrome stays in index.html for ?classic and the
// tester links (boot.js); none of it belongs on this stage.
for (const id of ['hud', 'map', 'transitPanel', 'zoomRail', 'pop', 'feed', 'sheet', 'paused', 'upgrade']) $(id)?.remove();
document.head.insertAdjacentHTML('beforeend', `<style id="v3css">${CSS}</style>`);
document.body.insertAdjacentHTML('afterbegin', `<div id="v3" hidden class="${NIGHT ? 'night' : ''}"><div class="frame" id="v3frame"></div><div id="v3wx"></div><canvas id="v3board" aria-label="the board: where you are going"></canvas>
<div id="v3top"><span class="v3pill" id="v3pill"><span class="wxg" id="v3wxg" aria-hidden="true"></span><span class="clk" id="v3clock">07:00</span><span class="dots" id="v3dots" aria-label="jobs"></span><span class="eur" id="v3eur">€0</span><span class="v3ring" id="v3ring" title="time left on this job"></span></span><div class="v3strip" id="v3strip" hidden></div></div>
<button id="v3sound" type="button" aria-pressed="true" aria-label="sound on" title="sound on">♪</button><button id="v3mini" type="button" hidden aria-label="the board"><canvas id="v3minic"></canvas><span class="tag">MAP</span></button><div id="v3panel" aria-live="polite"></div></div>`);
const stage = $('v3'), frameEl = $('v3frame'), panel = $('v3panel'), wxEl = $('v3wx');
// focusing a button that is still sliding in scrolled the stage under the HUD
// (overflow:hidden is a scroll container); the stage never scrolls
stage.addEventListener('scroll', () => { stage.scrollTop = 0; stage.scrollLeft = 0; });

// ── the frame ──────────────────────────────────────────────────────────────
let fmt = '', scene = '', sceneKey = '', ACT = null;
// sound (v3.2): the house kit, mounted on the handle at the bottom of the file
let audio = null;
const sfx = name => audio?.play(name);
function sizeFrame() {
  const f = innerWidth / innerHeight < 1 ? '916' : '169';
  if (f !== fmt) { fmt = f; stage.classList.toggle('fmt-916', f === '916'); stage.classList.toggle('fmt-169', f === '169'); if (scene) paintScene(scene, view, true); }
  place();
  board?.resize(); mini?.resize(); if (still) still();
}
// Fit the frame to cover the screen, keeping the scene's focus in view.
function place() {
  const sc = SCENES[scene]; if (!sc) return;
  const W = frameEl.offsetWidth, H = frameEl.offsetHeight, vw = stage.clientWidth || innerWidth, vh = stage.clientHeight || innerHeight, [fx, fy] = sc.focus[fmt];
  const clamp = (v, lo) => Math.max(lo, Math.min(0, v));
  frameEl.style.left = `${Math.round(clamp(vw / 2 - fx * W, vw - W))}px`; frameEl.style.top = `${Math.round(clamp(vh / 2 - fy * H, vh - H))}px`;
  frameEl.style.transformOrigin = `${sc.face[fmt][0] * 100}% ${sc.face[fmt][1] * 100}%`;
  if (sc.tile) frameEl.style.setProperty('--tw', `${Math.round(H * sc.tile[fmt])}px`);
}
// THE CARD'S SUBJECT, IN THE SCENE (v3.9; owner, 2026-11-06: "lots more art and
// scenarios in these styles"). A story card dealt at the stop lays its actor —
// the gull on the parcel, the lady at the kerb — over the courier, drawn in the
// stop's own flat iso (art/minimal-metro-look/make_actors.py), and takes it
// away when the card is answered. act1.json lists who has one; a card without
// one plays over the bare stop, as every card did before.
let actorWant = null;
function setActor(id) { actorWant = id; applyActor(); }
function applyActor() {
  const cur = frameEl.querySelector('.L.actor:not(.out)'), want = scene === 'stop' ? actorWant : null;
  if (cur && cur.dataset.actor === want) return;
  if (cur) { cur.classList.add('out'); setTimeout(() => cur.remove(), 280); }
  if (!want) return;
  const html = L('stop', `07-actor-${want}`, 'actor', ` data-actor="${want}"`), courier = frameEl.querySelector('.L.idle');
  if (courier) courier.insertAdjacentHTML('afterend', html); else frameEl.insertAdjacentHTML('beforeend', html);
}
const L = (name, l, cls = '', extra = '', style = '') => `<div class="L ${cls}" style="background-image:url(scenes/${name}/${fmt}/${l}.webp);${style}"${extra}></div>`;
// A scene is built once per place: the stop's landmark and plate are part of
// it, the tram is a layer of its own that comes and goes without a rebuild.
let view = {};
function paintScene(name, v = {}, force = false) {
  const key = name === 'stop' ? `stop|${v.at || ''}|${S?.weather || ''}` : `${name}|${v.car || ''}|${v.crowd || ''}|${S?.weather || ''}`;
  view = v;
  if (key === sceneKey && !force) return 0;
  const sc = SCENES[name], first = !scene; scene = name; sceneKey = key;
  stage.classList.toggle('night-stop', NIGHT && name === 'stop');
  stage.classList.toggle('night-car', name === 'night');
  stage.classList.toggle('moment', !!sc.moment);
  const build = () => {
    let html = '';
    if (name === 'stop') {
      const land = ACT?.land?.[v.at]?.[fmt] ? v.at : null, extra = land && ACT?.land?.[land]?.[fmt];
      html += L('stop', '01-backdrop');
      if (land) html += L('stop', `01b-land-${land}`, 'land', ` data-land="${land}"`);
      if (extra?.wheel) html += L('stop', '01c-wheel', 'wheel', '', `transform-origin:${extra.wheel[0] * 100}% ${extra.wheel[1] * 100}%`);
      if (extra?.ferry) html += L('stop', '01c-ferry', 'ferry');
      if (NIGHT) html += '<div class="L dusk"></div>';      // the night sky over the far city; every layer is dimmed on its own, so a lit tram can glow
      html += L('stop', '02-street') + `<div class="L tram" id="v3tram" hidden><span class="chip" id="v3chip"></span></div>`
        + L('stop', '04-shelter') + L('stop', '05-people', 'shift')
        // the weather lying ON the stop (v3.10): snow on the roof and the bench, puddles
        + ((ACT?.wx || []).includes(S?.weather) ? L('stop', `05b-wx-${S.weather}`, 'wxl') : '')
        + L('stop', '06-courier', 'idle');
      html += plateHtml(v.at, LANDMARKS.has(v.at));
    } else if (sc.moment) html = L('moments', sc.moment, 'moment', ` data-moment="${sc.moment}"`);
    else html = sc.layers.map((l, i) => {
      const cls = i === 0 ? (sc.tile ? 'tile' : sc.drift ? 'drift' : '') : (i === 1 ? 'sway' : i === 2 ? 'sway lag' : 'bob');
      return (l = carLayer(name, l, v)) && L(name, l, cls);
    }).join('');
    frameEl.innerHTML = html;
    place();
    frameEl.classList.remove('push'); if (!CALM) { void frameEl.offsetWidth; frameEl.classList.add('push'); }
    frameEl.classList.remove('fade');
    if (name === 'stop') setTram(view.tram || null);
    applyActor();
  };
  weather();
  if (first || force || CALM) { build(); return 0; }
  frameEl.classList.add('fade'); setTimeout(build, 200); return 230;   // how long until the new scene stands
}
// The stop's plate: its name and the lines that stop there; a key station's is
// ringed in yellow.
function plateHtml(at, key) {
  if (!at || !net) return '';
  const fams = [...new Set((net.at.get(at) || []).map(l => l.mode === 'metro' ? 'M' : l.family))].sort((a, b) => (a === 'M') - (b === 'M') || String(a).localeCompare(String(b), 'en', { numeric: true })).slice(0, 6);
  const [x, y] = PLATE[fmt];
  return `<div class="plate${key ? ' key' : ''}" style="left:${x * 100}%;top:${y * 100}%"><div class="pl"><b>${esc(net.name(at).toUpperCase())}</b><span class="lines">${fams.map(f => `<i style="background:${inkOf(f)}">${esc(f)}</i>`).join('')}</span></div><div class="pole"></div></div>`;
}
const inkOf = fam => { if (fam === 'M') return SKIN.metro; const l = board?.transit.layers.find(x => x.mode !== 'SUBWAY' && lineFamily(x.name) === fam); return l?.colour || '#52676d'; };

// ── the trams at the stop (look only) ─────────────────────────────────────
// `tram` is { model, family, halted, ghost }: the model's layer, the line's
// number on its front chip (a ghost has none), and the coral pulse when halted.
function setTram(t) {
  const el = $('v3tram'); if (!el) return;
  if (!t) { el.hidden = true; return; }
  el.hidden = false; el.style.backgroundImage = `url(scenes/stop/${fmt}/03-tram-${t.model}.webp)`; el.dataset.model = t.model;
  const chip = $('v3chip'), c = ACT?.trams?.[t.model]?.[fmt];
  if (c) Object.assign(chip.style, { left: `${c[0] * 100}%`, top: `${c[1] * 100}%`, width: `${c[2] * 100}%`, height: `${c[3] * 100}%` });
  chip.textContent = t.ghost ? '' : (t.family || ''); chip.style.background = t.ghost ? 'transparent' : inkOf(t.family);
  chip.classList.toggle('halted', !!t.halted); el.classList.toggle('glow', !!t.ghost);
}
// Drive along the track: in from up the line, or on and away. A Web Animation,
// so a tap finishes it.
function drive(dir) {
  const el = $('v3tram');
  if (dir === 'in' && el && !el.hidden && !el.classList.contains('glow')) sfx(el.dataset.model === 'museum' ? 'museum' : 'bell'); if (!el || el.hidden || CALM) { if (dir === 'out' && el) el.hidden = true; return Promise.resolve(); }
  const ax = ACT?.axis?.[fmt] || [-0.866, 0.5], D = frameEl.offsetWidth * 0.9, off = `translate(${-ax[0] * D}px, ${-ax[1] * D}px)`, away = `translate(${ax[0] * D}px, ${ax[1] * D}px)`;
  const a = el.animate(dir === 'in' ? [{ transform: off }, { transform: 'none' }] : [{ transform: 'none' }, { transform: away }],
    { duration: dir === 'in' ? 950 : 850, easing: dir === 'in' ? 'cubic-bezier(.15,.7,.25,1)' : 'cubic-bezier(.6,0,.85,.4)', fill: 'forwards' });
  // the tap that hurries it is its own: a later beat's skip is never cleared by this one finishing
  return new Promise(done => { let over = false; const end = () => { if (over) return; over = true; if (skip === end) skip = null; if (dir === 'out') el.hidden = true; a.cancel(); done(); };
    skip = end; a.onfinish = end; });
}

// The weather falls on the stop and on the board, never inside the car.
function weather() {
  const w = S?.weather || 'clear', show = w !== 'clear' && (scene === 'stop' || $('v3board').classList.contains('on'));
  wxEl.className = show ? `${w} on` : w;
  audio?.bed(show ? w : (NIGHT && !stage.hidden ? 'night' : null));
}

// ── loading ────────────────────────────────────────────────────────────────
let net = null, board = null, mini = null, S = null, still = null, PACK = null;
const getJson = async url => { const r = await fetch(url, { cache: 'no-store' }); if (!r.ok) throw new Error(`${url} ${r.status}`); return r.json(); };
const ready = (async () => {
  const play = $('play'); if (play) { play.disabled = true; play.textContent = 'LOADING HELSINKI…'; }
  // the ground (v3.8): the water, the streets, the quarters and the landmarks
  // the real-time board already drew — the journey's board stands on it now
  const [pack, ground, act] = await Promise.all([getJson('./cities/helsinki.json'), loadGround('./cities/ground/').catch(() => null), getJson('./scenes/stop/act1.json').catch(() => null)]);
  net = J.network(buildRealHelsinki(pack)); ACT = act; PACK = pack;
  board = new HopBoard($('v3board'), { pack, ground, skin: SKIN, net }); board.label = tr;
  mini = new HopBoard($('v3minic'), { pack, water: ground?.water, skin: SKIN, net, detail: false }); mini.label = tr;
  if (play) { play.disabled = false; play.textContent = MODE.mode === 'mission' ? 'START THE ERRAND' : 'START SHIFT'; }
})().catch(err => { const p = $('play'); if (p) p.textContent = 'MAP LOAD FAILED'; console.error(err); throw err; });

// ── the title card: Act 1, the ladder (runs.js) ───────────────────────────
const COUNT = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six'];
const hhmm = m => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
function paintTitle() {
  // Toko on the title, as on every card (v3.18)
  const h1 = document.querySelector('#title .card h1'); if (h1 && !h1.querySelector('.face')) h1.insertAdjacentHTML('afterbegin', face('info'));
  const start = (RUN.startHour ?? 7) * 60, end = start + (RUN.shiftMin || J.SHIFT_SECONDS / 60);
  const set = (id, t) => { const e = $(id); if (e) e.textContent = t; };
  set('titleWhen', `Act 1 · Helsinki · ${hhmm(start)} · ${RUN.title}`);
  const body = document.querySelector('#title .cardBody p'); if (body) body.textContent = 'A courier in Helsinki. At every stop, one card: which tram, which way, who to help, and what to risk. The clock only moves when you choose.';
  // v3.16: the run's roguelike rules, said once (strikes, the perk draft)
  const rules = J.strikesOf(RUN) ? ` ${COUNT[J.strikesOf(RUN)]} late drops and the shift is lost; between jobs, pick a perk.` : RUN.perks ? ' Between jobs, pick a perk.' : '';
  set('titleGoal', RUN.endless ? `Jobs keep coming until ${hhmm(end)}, each clock a little shorter than the last. ${COUNT[J.strikesOf(RUN)]} late drops and it is over; between jobs, pick a perk. Stars at ${RUN.stars.join(', ')} jobs.`
    : `${COUNT[RUN.target] || RUN.target} deliveries before ${hhmm(end)}.${rules}`);
  const n = $('shiftNo'); if (n) n.hidden = true;
  const all = Runs.loadRuns(), star = k => '★'.repeat(k) + '☆'.repeat(3 - k), row = $('mutRow');
  // (v3.26) the long shift sits after the ladder, opened by EASY; its line is its best, in jobs
  if (row) row.innerHTML = `<p class="mutHead">RUNS</p><div class="runList">${[...Runs.RUNS, Runs.LONG].map((r, i) => {
    const open = Runs.unlocked(r.id, all), rec = all[r.id], prev = Runs.BY_ID[r.opens] || Runs.RUNS[i - 1];
    const what = r.endless ? `${r.title} · ${rec.best ? `best ${rec.best} jobs` : 'no end'}` : `${r.title} · ${r.target} jobs`;
    return open ? `<a class="run${r.id === RUN.id ? ' on' : ''}" href="${Runs.runHref(r.id, location.search)}" data-run="${r.id}"${r.id === RUN.id ? ' aria-current="true"' : ''}><span class="runG" aria-hidden="true">${r.glyph}</span><span class="runT"><b>${esc(r.name)}</b><small>${esc(what)}</small></span><span class="runS" title="${rec.stars} stars">${rec.done ? star(rec.stars) : ''}</span></a>`
      : `<span class="run locked" data-run="${r.id}" aria-disabled="true"><span class="runG" aria-hidden="true">🔒</span><span class="runT"><b>${esc(r.name)}</b><small>finish ${esc(prev.name)} to open</small></span></span>`;
  }).join('')}</div>${missionList(all)}<p class="hint mutBlurb">${esc(RUN.blurb)}</p>`;
  // the daily, the week and LIVE are still the real-time game, and still the
  // reward for clearing NIGHT (owner: ladder first)
  const extras = Runs.extrasOpen(all);
  const dl = $('dailyLink'); if (dl) dl.hidden = !extras;
  const wl = $('weekLink'); if (wl) { wl.hidden = !extras; wl.textContent = 'OR THE WEEK · five shifts, rent due Friday'; }
  const ll = $('liveLink'); if (ll) ll.hidden = !extras || STORE;
  if (MODE.mode !== 'run') paintModeTitle(start, end);
  paintPlays();
}
// MISSIONS (v3.14, missions.js): the errands, the first open once EASY is done,
// each after the one before; a locked one says what opens it
function missionList(all = Runs.loadRuns()) {
  const ms = loadMissions(), easy = all.easy?.done, on = MODE.mode === 'mission' ? MODE.mission.id : null;
  // the map (v3.17) once there is somewhere to go: a pin per mission, the list below it says the same in words
  const map = MISSIONS.some(m => missionOpen(m.id, ms, easy)) ? '<div class="missionMap"><canvas id="missionMap" aria-hidden="true"></canvas></div>' : '';
  queueMicrotask(paintMissionMap);
  const today = map ? errandOf(dateKey()) : null, done = today && todayRecord(dateKey(), errandStore());
  const errand = today ? `<a class="btn ghost wide" id="errandLink" href="?errand">TODAY'S ERRAND · ${esc(today.name)}${done ? ' · DONE' : ''}</a>` : '';
  return `<p class="mutHead">MISSIONS</p>${map}${errand}<div class="runList missionList">${MISSIONS.map((m, i) => missionOpen(m.id, ms, easy)
    ? `<a class="run${m.id === on ? ' on' : ''}" href="?mission=${m.id}" data-mission="${m.id}"><span class="runG" aria-hidden="true">${m.glyph}</span><span class="runT"><b>${esc(m.name)}</b><small>${esc(m.title)} · ${m.steps.length} jobs</small></span><span class="runS">${ms[m.id].done ? '✓' : ''}</span></a>`
    : `<span class="run locked" data-mission="${m.id}" aria-disabled="true"><span class="runG" aria-hidden="true">🔒</span><span class="runT"><b>${esc(m.name)}</b><small>${i ? `finish ${esc(MISSIONS[i - 1].name)} to open` : 'finish EASY to open'}</small></span></span>`).join('')}</div>`;
}
// The mission map: drawn once Helsinki is loaded, its open pin breathing while
// the title is up; a tap on a pin that is open plays it.
let pinBoard = null, pinLoop = 0;
async function paintMissionMap() {
  const cv = $('missionMap'); if (!cv) return;
  await ready;
  if (!pinBoard || pinBoard.canvas !== cv) pinBoard = new HopBoard(cv, { pack: PACK, water: board.water, skin: SKIN, net, detail: false });
  pinBoard.label = tr; pinBoard.resize();
  const ms = loadMissions(), easy = Runs.loadRuns().easy?.done, on = MODE.mode === 'mission' ? MODE.mission.id : null;
  const pins = MISSIONS.map(m => { const open = missionOpen(m.id, ms, easy), done = ms[m.id].done;
    return { id: m.id, at: m.start, glyph: m.glyph, state: done ? 'done' : open ? 'open' : 'locked', label: m.name, on: m.id === on }; });
  let spots = [];
  cancelAnimationFrame(pinLoop);
  const frame = now => { if (!cv.isConnected) return; spots = pinBoard.drawPins({ pins, t: now / 1600 }); cv.dataset.pins = spots.map(p => `${p.id}:${p.state}:${Math.round(p.x)}:${Math.round(p.y)}`).join(' ');
    if (!CALM && pins.some(p => p.state === 'open') && !$('title').hidden) pinLoop = requestAnimationFrame(frame); };
  frame(performance.now());
  cv.onclick = e => { const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    const hit = spots.filter(p => p.state !== 'locked').map(p => ({ p, d: Math.hypot(p.x - x, p.y - y) })).sort((a, b) => a.d - b.d)[0];
    if (hit && hit.d < 30) location.href = `?mission=${hit.p.id}`; };
}
// YOUR PLAY LOG (v3.21, js/playlog.js): what this device has played, as text to read and to copy back
function paintPlays() {
  const row = $('mutRow'), sessions = PL.load(); if (!row || !sessions.length) return;
  row.insertAdjacentHTML('beforeend', `<button class="btn ghost wide" id="playsBtn" type="button">YOUR PLAY LOG · ${sessions.length}</button><div class="dailyBox" id="playsBox" hidden><pre class="shareText playsText">${esc(PL.report(sessions, BUILD_VERSION))}</pre><button class="btn prime wide" id="playsCopy" type="button">COPY THE LOG</button><p class="hint">Kept on this device only. Paste it to the developer to tune the game.</p></div>`);
  $('playsBtn').onclick = () => { $('playsBox').hidden = !$('playsBox').hidden; };
  $('playsCopy').onclick = async () => { try { await navigator.clipboard.writeText(PL.report(PL.load(), BUILD_VERSION)); $('playsCopy').textContent = 'COPIED'; } catch { $('playsCopy').textContent = 'SELECT AND COPY'; } };
}
// the session being played, and where it is written down at the end (or when the page is left)
let play = null;
function endPlay(over) {
  if (!play) return; const p = play; play = null;
  PL.close(p, { done: S?.done || 0, target: S?.target || 0, late: S?.late || 0, strikes: S?.strikes || 0, failed: !!S?.failed, score: S?.score || 0, quit: !over, state: S ? J.stateOf(S) : null });
  const all = PL.load(); all.push(p); PL.save(all);
  try { globalThis.TokoPlayLog?.logPlay?.('tokomove', 'shift', PL.line(p)); } catch {}   // the arcade's shared log, when the cabinet has loaded it (never a path out of the game: itch carries none)
}
addEventListener('pagehide', () => { if (play && S && S.phase !== 'end') endPlay(false); });
// The daily and the week on the title card: what this shift is, what stands.
function paintModeTitle(start, end) {
  const set = (id, t) => { const e = $(id); if (e) e.textContent = t; };
  for (const id of ['dailyLink', 'weekLink', 'liveLink']) { const e = $(id); if (e) e.hidden = true; }
  const row = $('mutRow');
  if (MODE.errand) {
    // today's errand (v3.17): the day's mission, the same for everyone; the first finish stands
    set('titleWhen', `Errand ${MODE.number} · ${MODE.label} · ${MODE.mission.name}`);
    set('titleGoal', `The same errand for everyone today. ${MODE.mission.blurb} Two late drops and it is lost; every perk is in the pool. Your first finish stands.`);
    const rec = todayRecord(MODE.key, errandStore());
    if (row) row.innerHTML = (rec ? `<p class="mutHead">TODAY'S STANDS</p><div class="dailyBox"><p class="dailyGrid">${esc(rec.text.split('\n')[1])}</p><p class="hint">Play it again for practice; it will not count.</p></div>` : '')
      + `<p class="hint mutBlurb"><a href="?">← the runs</a></p>`;
    const p = $('play'); if (p) p.textContent = 'START THE ERRAND';
    return;
  }
  if (MODE.mode === 'mission') {
    set('titleWhen', `Mission · ${MODE.mission.name} · ${hhmm(start)}`);
    set('titleGoal', `${MODE.mission.blurb} ${COUNT[RUN.target]} jobs. Two late drops and the errand is lost; between jobs, pick a perk.`);
    if (row) row.innerHTML = missionList() + `<p class="hint mutBlurb"><a href="?">← the runs</a></p>`;
    const p = $('play'); if (p) p.textContent = 'START THE ERRAND';
    return;
  }
  if (MODE.mode === 'daily') {
    set('titleWhen', `Daily ${MODE.number} · ${MODE.label} · ${hhmm(start)}`);
    set('titleGoal', `The same shift for everyone today. ${COUNT[RUN.target]} deliveries before ${hhmm(end)}. Your first finish stands.`);
    const rec = todayRecord(MODE.key);
    if (row) row.innerHTML = rec ? `<p class="mutHead">TODAY'S STANDS</p><div class="dailyBox"><p class="dailyGrid">${esc(dailyShare(MODE, rec.results, rec.target || RUN.target, rec.score).split('\n')[1])}</p><p class="hint">Play it again for practice; it will not count.</p></div>` : '';
    return;
  }
  const w = MODE.week;
  if (W.isOver(w)) {
    const v = W.verdict(w);
    set('titleWhen', `Week ${w.seed} · over`); set('titleGoal', v.paid ? `The rent is paid, with €${v.over} over.` : `The week came up €${-v.over} short of the rent.`);
    const play = $('play'); if (play) { play.textContent = 'A NEW WEEK'; play.dataset.newWeek = '1'; }
  } else {
    const p = W.pace(w);
    set('titleWhen', `Week ${w.seed} · ${MODE.day.name} · ${hhmm(start)}`);
    set('titleGoal', `${MODE.day.name[0] + MODE.day.name.slice(1).toLowerCase()} of five. €${p.total} of the €${W.RENT} rent${p.done ? (p.need ? `, about €${p.perDay} a shift to go` : ', and the rent is covered') : ''}.`);
  }
  if (row) row.innerHTML = `<p class="mutHead">THE WEEK</p><div class="weekStrip">${W.DAY_NAMES.map((d, i) => { const sh = w.shifts[i];
    return `<span class="wd${i === w.day ? ' now' : ''}${sh ? ' done' : ''}"><b>${d.slice(0, 3)}</b><i>${sh ? `€${sh.euros}` : i === w.day ? 'today' : '·'}</i></span>`; }).join('')}</div>`;
}

// ── the HUD: one pill and one strip ────────────────────────────────────────
let shownMin = null, rollTimer = 0, shownEur = 0, eurTimer = 0, shownDone = 0;
const roll = (from, to, ms, paint, timerSet) => { const t0 = performance.now(); const id = setInterval(() => { const k = Math.min(1, (performance.now() - t0) / ms), v = Math.round(from + (to - from) * (1 - (1 - k) ** 2)); paint(v); if (k >= 1) clearInterval(id); }, 30); timerSet(id); };
function paintHud() {
  const s = S, clock = $('v3clock'), mins = (RUN.startHour ?? 7) * 60 + Math.floor(s.clock / 60);
  $('v3wxg').textContent = s.weather !== 'clear' ? WX[s.weather]?.glyph || '' : ''; $('v3wxg').title = WX[s.weather]?.name || '';
  // the clock ROLLS to its new time (art bible: transitions/hud-clock-roll)
  clearInterval(rollTimer);
  if (shownMin == null || CALM || mins - shownMin > 90 || mins < shownMin) { shownMin = mins; clock.textContent = hhmm(mins); }
  else { const from = shownMin; roll(from, mins, Math.min(900, 120 + (mins - from) * 40), m => { clock.textContent = hhmm(m); }, id => { rollTimer = id; }); shownMin = mins; }
  // the money rolls too, and bumps when it goes up
  const eur = $('v3eur'); clearInterval(eurTimer);
  if (CALM || s.score === shownEur) eur.textContent = `€${s.score}`;
  else { const up = s.score > shownEur; roll(shownEur, s.score, 700, v => { eur.textContent = `€${v}`; }, id => { eurTimer = id; }); if (up) { eur.classList.remove('up'); void eur.offsetWidth; eur.classList.add('up'); } }
  shownEur = s.score;
  const fresh = s.results.length > shownDone; shownDone = s.results.length;
  // (v3.26) the long shift has no last dot: the jobs so far (the last nine, with the count before them) and the one under way
  const dots = s.run.endless ? s.results.length + 1 : s.target, from = s.run.endless ? Math.max(0, dots - 10) : 0;
  $('v3dots').innerHTML = (from ? `<b class="dotN">${s.results.length}</b>` : '') + Array.from({ length: dots - from }, (_, k) => { const i = from + k, d = i < s.results.length ? (s.results[i] === 'late' ? '<i>●</i>' : '●') : '○'; return fresh && i === s.results.length - 1 ? `<span class="pop">${d}</span>` : d; }).join('');
  const ring = $('v3ring'), job = s.job, left = J.timeLeft(s);
  if (job) { const p = Math.max(0, Math.min(1, left / job.limit)); ring.style.setProperty('--p', String(Math.round(p * 100))); ring.style.setProperty('--ring', p < 0.3 ? '#e2683c' : (NIGHT ? '#7ad3b0' : '#233d4d')); ring.innerHTML = parcelHtml(job.cargo, { max: 17 }); }
  else { ring.style.setProperty('--p', '0'); ring.innerHTML = ''; }
  // the strip: the job, where it goes, what it pays, how long it has
  const strip = $('v3strip');
  if (job) { strip.hidden = false; const m = job.mult;
    const sealed = !dropOf(job), race = job.rival ? `<span class="left race${S.clock > job.rival.until ? ' late' : ''}">beat her by ${J.clockAt(S, job.rival.until)}</span>` : '';
    strip.innerHTML = `${parcelHtml(job.cargo, { max: 15 })}<span>${esc(job.regular ? job.regular.name : J.cargoWord(job.cargo))}</span><span aria-hidden="true">→</span><b>${sealed ? `SEALED · ${esc(job.sealed.family)}` : esc(net.name(job.to).toUpperCase())}</b><span class="fee">€${job.fee}</span>${m !== 1 ? `<span class="mult${m < 1 ? ' down' : ''}">×${+m.toFixed(2)}</span>` : ''}${race || `<span class="left${left < 0 ? ' late' : ''}">${left < 0 ? `late by ${Math.ceil(-left / 60)} min` : `${Math.max(1, Math.ceil(left / 60))} min left`}</span>`}`; }
  else strip.hidden = true;
  fitTop();
}

// The pill lives between two corners it does not own: the arcade's HUB button
// top-left and ♪ top-right. A fixed margin fitted the day's pill and put the
// night's — five jobs and the weather — under the HUB button, and nothing fits
// a 320px phone at full size. So it is MEASURED: centred if it clears both,
// slid if it fits but not centred, and scaled down only when it cannot fit.
function fitTop() {
  const pill = $('v3pill'), snd = $('v3sound'); if (!pill || !snd || stage.hidden) return;
  pill.style.transform = '';
  const W = innerWidth, home = document.querySelector('.arcade-home'), hr = home?.getBoundingClientRect();
  const L = hr && hr.width ? hr.right + 6 : 8, R = snd.getBoundingClientRect().left - 6, w = pill.offsetWidth;
  const x0 = (W - w) / 2, x1 = x0 + w;
  if (x0 >= L && x1 <= R) return;
  if (w <= R - L) { pill.style.transform = `translateX(${Math.round(x0 < L ? L - x0 : R - x1)}px)`; return; }
  const k = Math.max(0.6, (R - L) / w);
  pill.style.transform = `translateX(${Math.round((L + R) / 2 - W / 2)}px) scale(${k.toFixed(3)})`;
}

// ── the card ───────────────────────────────────────────────────────────────
// Prices read as a stopwatch, "+6:00": the classic deck's "+40 s" scaled to a
// tram ride would be "+1260 s", which nobody can compare at a glance. Under
// the label, the STAKES (ACT1.md §3): the odds as a word, then what is won,
// then what is lost — "maybe ×1.3 · or +3:00".
const price = sec => `+${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`;
const face = (mood, px = 44) => { const url = moodFace(mood), disc = (MOODS[mood] || MOODS.info).disc; return url ? `<img class="evFace" src="${url}" alt="" width="${px}" height="${px}">` : `<i class="evFace" style="background:${disc}"></i>`; };
const chipSpans = list => list.map(c => `<span>${esc(c)}</span>`).join(' ');
function stakesHtml(st) {
  if (!st) return '';
  if (st.sure) return `<small class="evStk">${chipSpans(st.sure)}</small>`;
  return `<small class="evStk"><em class="${st.odds === 'long shot' ? 'long' : st.odds}">${esc(st.odds)}</em> ${chipSpans(st.win)} <span class="or">· or</span> ${chipSpans(st.lose)}</small>`;
}
let dealt = '';
function paintCard(c) {
  const key = `${S.log.length}:${c.kind}:${c.id || ''}:${c.text}`;
  if (key !== dealt) { dealt = key; sfx(c.kind === 'halt' || c.rival ? 'event' : 'deal'); }
  const stack = c.options.length > 2 || c.options.some(o => String(tr(o.label)).length > 18 || o.stakes);
  const cls = (o, i) => o.tier === 'very' ? 'evVery' : o.tier === 'special' ? 'evSpecial' : i === 0 ? 'evPrimary' : 'evGhost';
  const tag = o => o.tier === 'very' ? '<span class="evTier">✦ VERY SPECIAL</span>' : o.tier === 'special' ? '<span class="evTier">★ SPECIAL</span>' : '';
  panel.innerHTML = `<section class="eventCard mood-${esc(c.mood)}" data-kind="${c.kind}"${c.id ? ` data-card="${c.id}"` : ''}><div class="evHead">${face(c.mood)}<b class="evLine">${c.at ? `<span class="evAt">${esc(c.at.toUpperCase())}</span>` : ''}${esc(c.text)}</b></div><div class="evOpts${stack ? ' evStack' : ''}${c.options.length > 2 ? ' ev3' : ''}">${c.options.map((o, i) => `<button class="evBtn ${cls(o, i)} eventOpt" type="button" data-i="${i}"${o.tier ? ` data-tier="${o.tier}"` : ''}><span class="evLb">${tag(o)}<span>${esc(o.label)}</span>${stakesHtml(o.stakes)}</span><span class="evCost">${price(o.price)}</span></button>`).join('')}</div></section>`;
  const armed = performance.now() + 300;
  panel.querySelectorAll('.eventOpt').forEach(b => b.addEventListener('click', () => { if (performance.now() >= armed) pick(Number(b.dataset.i)); }));
  padGlyphs();
}

// Where the drop is — unless the parcel is sealed and its label has not made
// sense yet (ACT1.md §11): the strip, the corner map and the board all ask here.
const dropOf = job => job && !(job.sealed && !job.sealed.revealed) ? job.to : undefined;
// the corner inset: here, the drop, and the hops on offer as their own paths
function paintMini(c) {
  const btn = $('v3mini'), hops = c?.kind === 'route' ? c.options.map(o => o.hop).filter(h => h?.to) : [];
  // at dispatch the drop on offer is the job's; it shows where it is before you take it
  const job = S.job || (S.offer ? { to: S.offer.to, cargo: S.offer.cargo, sealed: S.offer.sealed } : null), show = !!job && c && c.kind !== 'story';
  btn.hidden = !show; if (!show) { still = null; return; }
  clearFace(btn);
  still = () => { mini.resize(); mini.draw({ at: S.at, dest: dropOf(job), destColour: colourOf(job.cargo), previews: hops, labels: false, lift: false, halted: haltedLayer }); };
  still();
}
// Toko's face is never under the corner map (owner, 2026-11-09: "Toko face get buried behind map"):
// where the scene puts the face on screen, against where the inset sits; if they meet, the inset goes left
function clearFace(btn) {
  const sc = SCENES[scene], f = sc?.face?.[fmt]; btn.classList.remove('left'); if (!f) return;
  const fx = frameEl.offsetLeft + f[0] * frameEl.offsetWidth, fy = frameEl.offsetTop + f[1] * frameEl.offsetHeight, r = btn.getBoundingClientRect(), s0 = stage.getBoundingClientRect(), pad = 34;
  const x = fx + s0.left, y = fy + s0.top;
  if (x > r.left - pad && x < r.right + pad && y > r.top - pad && y < r.bottom + pad) btn.classList.add('left');
}
const haltedLayer = layer => !!S?.halt && String(layer.mode || '').toUpperCase() !== 'SUBWAY' && J.halted(S, lineFamily(layer.name));

// The full board, opened from the inset: the same picture with names on it.
let boardOpen = false;
function openBoard() {
  const c = J.card(net, S); if (!c || busy) return;
  boardOpen = true; panel.style.visibility = 'hidden'; $('v3mini').hidden = true;
  const cv = $('v3board'); cv.classList.add('on'); board.resize();
  const job = S.job || (S.offer ? { to: S.offer.to, cargo: S.offer.cargo, sealed: S.offer.sealed } : null);
  board.draw({ at: S.at, dest: dropOf(job), destColour: job ? colourOf(job.cargo) : undefined, previews: c.kind === 'route' ? c.options.map(o => o.hop).filter(h => h?.to) : [], lift: false, halted: haltedLayer });
  hint('TAP TO CLOSE'); weather(); markUi();
}
$('v3mini').addEventListener('click', openBoard);
$('v3board').addEventListener('click', () => { if (!boardOpen) return; boardOpen = false; $('v3board').classList.remove('on'); panel.style.visibility = ''; hint(''); render(); });
function hint(t) { let h = stage.querySelector('.v3tap'); if (!t) { h?.remove(); return; } if (!h) { h = document.createElement('div'); h.className = 'v3tap'; stage.append(h); } h.textContent = t; }

// ── the moment ─────────────────────────────────────────────────────────────
let busy = false, pendingHop = null, skip = null, arrived = null;
const interior = hop => NIGHT ? 'night' : hop?.model === 'metro' ? 'metro' : 'tram';
// The old trams from inside (v3.3, look only like the outside): the museum
// tram in varnished wood and brass, the Nr I and Nr II in their 1970s
// orange and beige; the newer three are the car as painted
// (art/minimal-metro-look/make_interiors.py). The night car is the night car.
const CAR = { museum: 'museum', nr1: 'old', nr2: 'old' };
const carOf = hop => (!NIGHT && CAR[hop?.model]) || '';
// WHO ELSE IS IN THE CAR, AND WHAT THE WINDOW SHOWS (v3.11; owner, 2026-11-06:
// "lots more art and scenarios in these styles", and 2026-11-07 on the night
// window's rain). The car fills when the card says so — the crush, or a tram
// you had to let go by because it was full — and empties for the humming at
// the back. The window carries the day's weather, which the stop's own rain
// never could (it is never drawn inside a car). A layer the art does not have
// (a rush car in the museum tram, rain in a tunnel) is the plain one.
const crowdOf = (hop, card) => card === 'humming' ? 'empty' : NIGHT || CAR[hop?.model] ? '' : card === 'crush' || hop?.full ? 'rush' : '';
const WINDOW_WX = { tram: ['rain', 'snow', 'fog'], night: ['snow', 'fog'] };   // the night window already rains
function carLayer(name, l, v) {
  if (l === '01-outside-tile') return (WINDOW_WX[name] || []).includes(S?.weather) ? `${l}-${S.weather}` : l;
  if (v.crowd === 'empty' && l === '03-people') return '';
  if (v.crowd === 'rush' && (l === '03-people' || l === '04-courier')) return `${l}-rush`;
  return v.car ? `${l}-${v.car}` : l;
}
const modelName = id => TRAMS.find(t => t.id === id)?.name || id;
function tramFor(c) {
  if (c.kind === 'halt') return { model: S.hop?.model && S.hop.model !== 'metro' ? S.hop.model : 'nr2', family: S.halt.family, halted: true };
  if (c.tram === 'museum') return { model: 'museum', family: '', ghost: true };
  return null;
}
function render() {
  paintHud();
  const c = J.card(net, S);
  if (!c) return finish();
  if (c.kind === 'story' && pendingHop) {
    // a card dealt on the way: aboard is the car, on foot is the board mid-walk
    setActor(null);
    const cm = cardMoment(c.id, fmt, sky());                               // the card's own scene (v3.13): the saved seat
    if (pendingHop.kind === 'walk') { showBoard(pendingHop, 0.5, c.id); }   // what you walk past rides beside you (v3.9)
    else if (cm) { hideBoard(); paintScene(`m-${cm}`); }
    else { hideBoard(); paintScene(interior(pendingHop), { car: carOf(pendingHop), crowd: crowdOf(pendingHop, c.id) }); }
  } else if (c.kind === 'halt' && haltMoment(c.cause, fmt, sky())) {
    // the march on Mannerheimintie (v3.16): the line held, drawn from above
    hideBoard(); setActor(null); paintScene(`m-${haltMoment(c.cause, fmt, sky())}`); arrived = null;
  } else if (c.kind === 'story' && cardMoment(c.id, fmt, sky())) {
    // a card with a scene of its own (v3.13): the tourist and her map, the sealed parcel's choice
    hideBoard(); setActor(null); paintScene(`m-${cardMoment(c.id, fmt, sky())}`); arrived = null;
  } else {
    hideBoard();
    const t = tramFor(c), leaving = !t && arrived;
    const wait = paintScene('stop', { at: S.at, tram: t || arrived || null });
    setActor(c.kind === 'story' && (ACT?.actors || []).includes(c.id) ? c.id : null);
    if (!wait) setTram(t || arrived || null);
    // the tram that brought you leaves, while the next card comes in; a ghost
    // or a halted tram pulls in to be looked at
    if (leaving) { const go = arrived; arrived = null; setTimeout(() => { if (!busy && $('v3tram')?.dataset.model === go.model) drive('out'); }, wait + 650); }
    else if (t && !CALM) setTimeout(() => drive('in'), wait);
  }
  stage.classList.toggle('halt', c.kind === 'halt');
  paintCard(c); paintMini(c); setTimeout(markUi, 320);   // once its buttons are armed
}

// Play the board for a hop from t0 to t1; resolves when done or tapped past.
function showBoard(hop, t = 1, vignette = null) { const cv = $('v3board'); cv.classList.add('on'); board.resize(); board.draw({ at: S.at, hop, t, dest: dropOf(S.job), destColour: S.job ? colourOf(S.job.cargo) : undefined, halted: haltedLayer, vignette }); weather(); }
function hideBoard() { $('v3board').classList.remove('on'); weather(); }
function rideBoard(hop, t0 = 0, t1 = 1) {
  game.boards++; sfx(hop.kind === 'walk' ? 'walk' : 'ride'); markUi();
  return new Promise(done => {
    const cv = $('v3board'); cv.classList.add('on'); board.resize(); $('v3mini').hidden = true; weather();
    const dur = CALM ? 300 : (1300 + 700 * Math.min(1, hop.price / 900)) * (t1 - t0), start = performance.now();
    const ease = k => k < .5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
    const dest = dropOf(S.job), col = S.job ? colourOf(S.job.cargo) : undefined;
    let over = false; const end = () => { if (over) return; over = true; skip = null; board.draw({ at: S.at, hop, t: t1, dest, destColour: col, halted: haltedLayer }); done(); };
    skip = end;
    const step = now => { if (over) return; const k = Math.min(1, (now - start) / dur);
      board.draw({ at: S.at, hop, t: t0 + (t1 - t0) * ease(k), dest, destColour: col, halted: haltedLayer });
      if (k >= 1) end(); else requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
}
// A beat that a tap ends early.
const beat = ms => new Promise(done => { let over = false; const end = () => { if (over) return; over = true; skip = null; done(); }; skip = end; setTimeout(end, CALM ? Math.min(ms, 600) : ms); });
// A tap that HURRIES something must not also press what appears under it:
// the skip runs on pointerup, and the browser's click for the same tap comes
// after — onto the next card's button, or the end card's NEXT (a playtest of
// v3.1 tapped through the last stamp straight into MEDIUM). That click is
// swallowed, and a fresh card's buttons arm a beat after they appear.
let quietUntil = 0;
stage.addEventListener('pointerup', e => { if (skip && !e.target.closest('button')) { quietUntil = performance.now() + 450; skip(); } });
document.addEventListener('click', e => { if (performance.now() < quietUntil) { e.preventDefault(); e.stopPropagation(); } }, true);
addEventListener('keydown', e => { if (skip && !stage.hidden && (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape')) { e.preventDefault(); skip(); } });

// ── THE SCREEN'S MACHINE (v3.20) ───────────────────────────────────────────
// The screen was a state machine held in loose variables (S, busy, skip,
// boardOpen, the title and end veils). Named once here, derived from those same
// variables so it can never disagree with them:
//   loading → title → card ⇄ moving (a hop, a moment, a reveal, a stamp)
//                       card ⇄ board (the full map, opened from the corner)
//                       … → end
// The page wears it (body[data-ui], body[data-state] = the run's state, see
// journey.js STATES) and __tm3.machine() reports it, so CSS, tests and agents
// read one name instead of inferring it from the DOM.
export const UI = {
  loading: 'Helsinki is loading', title: 'the title card: pick a run or a mission, then START',
  card: 'a card is waiting for a choice (keys 1, 2, 3 choose too)', moving: 'something is playing out; a tap hurries it',
  board: 'the whole map is open; a tap closes it', end: 'the end card' };
function uiState() {
  if (!S) return net ? 'title' : 'loading';
  if (!$('end').hidden || S.phase === 'end' && !busy) return 'end';
  if (boardOpen) return 'board';
  if (busy || skip) return 'moving';
  return panel.querySelector('.eventOpt:not([disabled])') ? 'card' : 'moving';
}
function markUi() { const b = document.body, u = uiState(); b.dataset.ui = u; b.dataset.state = S ? J.stateOf(S) : ''; if (u === 'card' && play) PL.shown(play, { state: J.stateOf(S) }); }
// a card can be answered from the keyboard too: 1, 2, 3 are its buttons (the cabinet's keys, and a pad's through the hub)
addEventListener('keydown', e => { const n = /^[1-3]$/.test(e.key) ? Number(e.key) : /^Digit[1-3]$/.test(e.code || '') ? Number(e.code.slice(5)) : 0;
  if (!n || uiState() !== 'card') return;
  const b = panel.querySelector(`.eventOpt[data-i="${n - 1}"]:not([disabled])`); if (b) { e.preventDefault(); b.click(); } });

// (v3.27) THE PAD ON EVERY SCREEN (owner: "Dualsense with ipad doesn't work"). A pad
// reached the game only through the cards: the hub's bridge (hub/padkeys.js) turns
// its buttons into keys, and only a card listened, so START SHIFT, the run list,
// the end card and the map were out of reach for anyone holding only a pad. Now:
//   · on a card, cross / circle / square (A, B, X) are its three buttons as before,
//     and each button wears its pad button while a pad is connected
//   · on the title and the end card, the d-pad (the arrow keys) walks the screen's
//     buttons and links, lit; cross (1) presses the lit one, or the screen's main
//     button when none is lit (START SHIFT; NEXT, else AGAIN)
//   · with the map open, any of them closes it
const PAD_GLYPHS = { ps: ['✕', '○', '□'], xb: ['A', 'B', 'X'] };
function padKind() {
  const p = [...(navigator.getGamepads?.() || [])].find(x => x && x.connected);
  return p ? (/054c|dualsense|dualshock|wireless controller|playstation/i.test(p.id) ? 'ps' : 'xb') : null;
}
function padGlyphs() {
  const k = padKind(), g = k && PAD_GLYPHS[k];
  panel.querySelectorAll('.eventOpt').forEach((b, i) => { let t = b.querySelector('.evPad');
    if (!g || !g[i]) { t?.remove(); return; }
    if (!t) { t = document.createElement('span'); t.className = 'evPad'; t.setAttribute('aria-hidden', 'true'); b.prepend(t); }
    t.textContent = g[i]; });
}
addEventListener('gamepadconnected', padGlyphs); addEventListener('gamepaddisconnected', padGlyphs);
const PRIMARY = { title: '#play', end: '#nextRun, #again' };
const padTargets = () => { const v = [...document.querySelectorAll('.veil:not([hidden])')].pop();
  return v ? [...v.querySelectorAll('button:not([disabled]), a[href]')].filter(el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden') : []; };
function padLight(el) { document.querySelectorAll('.padLit').forEach(x => x !== el && x.classList.remove('padLit')); el.classList.add('padLit'); el.focus({ preventScroll: true }); el.scrollIntoView?.({ block: 'nearest' }); }
addEventListener('pointerdown', () => document.querySelectorAll('.padLit').forEach(x => x.classList.remove('padLit')));
addEventListener('keydown', e => {
  const ui = uiState(), arrow = /^Arrow(Up|Down|Left|Right)$/.exec(e.key || ''), n = /^[1-3]$/.test(e.key) ? Number(e.key) : /^Digit[1-3]$/.test(e.code || '') ? Number(e.code.slice(5)) : 0;
  if (ui === 'card') { if (n) padGlyphs(); return; }                       // the card's own handler answers it
  if (ui === 'board') { if (arrow || n) { e.preventDefault(); $('v3board').click(); } return; }
  if (ui !== 'title' && ui !== 'end') return;
  if (!arrow && n !== 1) return;
  const t = padTargets(); if (!t.length) return;
  e.preventDefault();
  const at = t.findIndex(el => el.classList.contains('padLit'));
  if (n === 1) { (at >= 0 ? t[at] : document.querySelector(PRIMARY[ui]) || t[0])?.click(); return; }
  const step = arrow[1] === 'Down' || arrow[1] === 'Right' ? 1 : -1;
  padLight(t[at < 0 ? (step > 0 ? 0 : t.length - 1) : (at + step + t.length) % t.length]);
});

// The in-car display: the line, where it is going, the next stop — and, on a
// tram, which tram (look only).
function sign(hop, next = null) {
  const layer = board.transit.layers.find(l => l.id === hop.line?.sourceId), ink = layer?.colour || '#52676d';
  const where = J.terminus(net, hop);
  const end = where && where !== net.name(hop.to) ? `<span>${esc(String(where).toUpperCase())}</span><span aria-hidden="true">›</span>` : '<span aria-hidden="true">›</span>';
  const model = hop.model && hop.model !== 'metro' ? `<span class="model">${esc(modelName(hop.model).toUpperCase())}</span>` : '';
  const nx = next && next !== hop.to ? `<span class="nx">${esc(net.name(next).toUpperCase())}</span><span class="then">then ${esc(net.name(hop.to).toUpperCase())}</span>` : `<span class="nx">${esc(net.name(hop.to).toUpperCase())}</span>`;
  panel.innerHTML = `<div class="v3sign" role="status"><span class="lb" style="background:${ink}">${esc(hop.line.mode === 'metro' ? 'M' : (hop.line.family || hop.line.label))}</span>${end}${nx}${model}</div>`;
}

// THE RIDE, INSIDE (v3.19; owner: "The traveling on a tram visual is a great one and should be
// used more … the background looks great moving … a longer loop of travel"). A ride stays in
// the car for its whole length: the window carries the travel and slows at each stop the line
// passes, the sign names the next one, and the corner map follows the courier along the line.
// A tap hurries it, as a hop on the board always could.
function rideInside(hop, t0 = 0, t1 = 1) {
  game.boards++; game.rides = (game.rides || 0) + 1; sfx('ride');
  return new Promise(done => {
    const line = hop.line, step = line.k > line.i ? 1 : -1, stops = [];
    for (let k = line.i + step; k !== line.k + step; k += step) stops.push(line.nodes[k]);
    const dur = CALM ? 400 : (2600 + 2600 * Math.min(1, hop.price / 900)) * (t1 - t0), start = performance.now();
    const tile = frameEl.querySelector('.L.tile, .L.drift'), anim = tile?.getAnimations?.()[0];
    const btn = $('v3mini'); btn.hidden = false; clearFace(btn); mini.resize();
    const dest = dropOf(S.job), col = S.job ? colourOf(S.job.cargo) : undefined;
    let over = false, shown = -1;
    const end = () => { if (over) return; over = true; skip = null; if (anim) anim.playbackRate = 1; btn.hidden = true; done(); };
    skip = end;
    const tick = now => { if (over) return; const k = Math.min(1, (now - start) / dur), t = t0 + (t1 - t0) * k;
      // the stop the car is nearest: slow towards it, and the sign names the next one
      const at = Math.min(stops.length - 1, Math.floor(t * stops.length)), frac = t * stops.length - at;
      if (anim) anim.playbackRate = stops.length > 1 && at < stops.length - 1 ? 0.35 + 0.65 * Math.min(1, Math.abs(frac - 1) * 4, frac * 4) : 1 - 0.7 * Math.max(0, (t - 0.85) / 0.15);
      if (at !== shown) { shown = at; sign(hop, stops[at]); }
      mini.draw({ at: S.at, hop, t, dest, destColour: col, labels: false, lift: false, halted: haltedLayer });
      if (k >= 1) end(); else requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
}

// A moment of the job (v3.12): its picture, its line, a beat; skippable.
// the hour and the weather the art has to match (js/moments.js): 'night', or the day's weather
const sky = () => (NIGHT ? 'night' : S?.weather || 'clear');
async function moment(id, html = '', ms = 1500) {
  if (!id) return false;
  hideBoard(); setActor(null); $('v3mini').hidden = true;
  const wait = paintScene(`m-${id}`); panel.innerHTML = html;
  await beat(ms + wait); return true;
}
// What a choice did (ACT1.md §3): the line, and its chips.
async function reveal(rv) {
  if (!rv || (!rv.say && !rv.chips.length)) return;
  const mood = rv.sold ? 'opportunity' : rv.how === 'win' ? 'opportunity' : rv.how === 'lose' ? 'warning' : 'info';
  const tag = rv.sold ? (rv.sold.cash > 0 ? 'SOLD' : 'SWINDLED') : rv.how === 'win' ? 'IT WORKED' : rv.how === 'lose' ? 'IT DID NOT' : '';
  const bad = c => /^(\+\d|−€|×0\.|€0|job gone|fees)/.test(c) && !/^\+€/.test(c);
  sfx(rv.sold ? (rv.sold.cash > 0 ? 'coin' : 'lose') : rv.how === 'win' ? 'win' : rv.how === 'lose' ? 'lose' : rv.chips.some(c => /^\+€/.test(c)) ? 'coin' : 'tap');
  panel.innerHTML = `<div class="v3rev ${rv.sold ? 'sold' : rv.how}" role="status" data-how="${rv.how}">${face(mood)}<div>${tag ? `<div class="tag">${tag}</div>` : ''}<div class="say">${esc(rv.say)}</div>${rv.chips.length ? `<div class="chips">${rv.chips.map(c => `<i class="${bad(c) ? 'bad' : ''}">${esc(c)}</i>`).join('')}</div>` : ''}</div></div>`;
  paintHud();
  await beat(rv.say.length > 70 ? 3200 : 2500);
}

async function pick(i) {
  if (busy || !S || S.phase === 'end') return;
  busy = true; panel.querySelectorAll('button').forEach(b => { b.disabled = true; }); markUi();
  sfx('tap');
  const wasHop = pendingHop, before = J.card(net, S), hadJob = !!S.job;
  if (play && before) PL.picked(play, { state: before.state, i, tier: before.options[i]?.tier, n: before.options.length });
  const r = J.choose(net, S, i);
  if (r.error) { busy = false; render(); return; }
  paintHud();
  try {
    if (r.kind === 'dispatch' && !hadJob && S.job) {            // the job is taken: the parcel is handed over
      if (r.coin != null) await reveal({ say: `The coin says: ${J.cargoWord(S.job.cargo).toLowerCase()} for ${S.job.toName}.`, chips: [`+€${J.COIN_CASH}`], how: 'win' });
      if (r.coffee) await reveal({ say: 'She takes the coffee, and the job is yours. No race.', chips: [`−€${J.COFFEE}`], how: 'sure' });
      sfx('coin');
      // (a sealed parcel's address stays hidden: the line is the one its dispatch card said)
      const what = S.job.sealed ? 'A sealed parcel. No address, only a sticker.' : `${J.cargoWord(S.job.cargo)} for ${S.job.toName}.`;
      const how = r.express ? '<span class="xtra">EXPRESS · the clock ×0.7</span>' : r.slow ? '<span class="xtra">SLOW · the clock ×1.3</span>' : '';
      await moment(pickupMoment(S.at, S.job, fmt, sky()), `<div class="v3stamp pickup" role="status"><span class="big">PICKED UP</span><span>${esc(what)}</span>${how}<span class="pts">€${S.job.fee}</span></div>`, 1400);
    }
    if (r.hop) {
      $('v3mini').hidden = true;
      const tram = r.hop.kind === 'ride' && r.hop.model && r.hop.model !== 'metro';
      // the tram you chose pulls in (look only: the model is drawn, the ride is the same)
      if (tram) { const wait = scene !== 'stop' ? paintScene('stop', { at: r.hop.from }) : 0; if (wait) await beat(wait); setTram({ model: r.hop.model, family: r.hop.line.family }); panel.innerHTML = ''; await drive('in'); }
      if (r.hop.model === 'museum') await rare();
      await moment(boardMoment(r.hop, fmt, sky()), '', 1100);   // stepping aboard (v3.12): a tram stop, the Kalasatama platform, the stairs down
      await moment(walkMoment(r.hop, fmt, sky()), '', 1100);    // setting off on foot in the snow (v3.13)
      if (r.hop.kind === 'ride') { hideBoard(); paintScene(interior(r.hop), { car: carOf(r.hop), crowd: crowdOf(r.hop) }); sign(r.hop); }
      if (r.unsealed) { await beat(900); await reveal({ say: `Aboard the ${r.unsealed.family}, the label makes sense: ${r.unsealed.stop}.`, chips: [], how: 'win' }); }
      if (r.story) { pendingHop = r.hop; busy = false; return render(); }
      if (r.hop.kind === 'ride') await rideInside(r.hop);         // v3.19: the ride stays in the car
      else { panel.innerHTML = ''; await rideBoard(r.hop); }
      if (r.reveal) await reveal(r.reveal);                   // the weather's stakes on a walk land on the way
      if (tram) arrived = { model: r.hop.model, family: r.hop.line.family };
    } else if (wasHop) {
      // the card on the way is answered: what it did, the rest of the hop, then the stop
      pendingHop = null;
      if (r.reveal) await reveal(r.reveal);
      panel.innerHTML = '';
      if (wasHop.kind === 'ride') { paintScene(interior(wasHop), { car: carOf(wasHop), crowd: crowdOf(wasHop) }); await rideInside(wasHop, 0.4, 1); }
      else await rideBoard(wasHop, wasHop.kind === 'walk' ? 0.5 : 0, 1);
      if (wasHop.kind === 'ride' && wasHop.model && wasHop.model !== 'metro') arrived = { model: wasHop.model, family: wasHop.line.family };
    } else if (r.kind === 'perk' && r.cash) {
      await reveal({ say: 'You keep the cash.', chips: [`+€${r.cash}`], how: 'win' });
    } else if (r.perk) {
      // a perk drafted (v3.14; on every run since v3.16): kept for the rest of it
      await reveal({ say: `${PERKS[r.perk].name}, for the rest of the ${MODE.mode === 'mission' ? 'errand' : 'shift'}.`, chips: [PERKS[r.perk].line], how: 'win' });
    } else if (r.reveal) {
      // a choice with its consequence drawn (v3.13): walking the lady across is the crossing
      const cm = before?.kind === 'story' ? choiceMoment(before.id, before.options[i]?.label, fmt, sky()) : null;
      if (cm) { hideBoard(); setActor(null); paintScene(`m-${cm}`); arrived = null; }
      await reveal(r.reveal);
    }
    pendingHop = null;
    if (r.delivered) await stamp(r.delivered);
  } finally { busy = false; }
  render();
}

// A delivery: the fee, and what was inside all along.
async function stamp(d) {
  // at the door (or at the steps) by day; the night shift stamps it at the stop
  const m = deliveryMoment(d, fmt, sky());
  hideBoard(); setActor(null); $('v3mini').hidden = true;
  if (m) { paintScene(`m-${m}`); arrived = null; }               // the tram has gone while you were at the door
  else { paintScene('stop', { at: S.at, tram: arrived }); setTram(arrived); }
  sfx('stamp'); setTimeout(() => sfx(d.late ? 'late' : 'deliver'), 140);
  if (MODE.mode === 'week') { W.progress(MODE.week, { score: S.score * W.PER_EURO, results: S.results }); W.saveWeek(MODE.week, MODE.store); }
  const note = d.sealed ? addNote(net.name(d.to)).split(' · ').slice(1).join(' · ') : '';
  const extra = (d.race ? `<span class="xtra">${d.race === 'won' ? 'You beat the other courier. ×1.3' : 'She got there first. ×0.6'}</span>` : '')
    + (d.strike ? `<span class="xtra strike">STRIKE ${d.strike} OF ${J.strikesOf(S.run)}${d.strike >= J.strikesOf(S.run) ? ` · THE ${MODE.mode === 'mission' ? 'ERRAND' : 'SHIFT'} IS LOST` : ''}</span>` : '')
    + (d.tip ? `<span class="xtra">${esc(d.regular || 'A regular')} tips €${d.tip}</span>` : '') + (note ? `<span class="xtra note">${esc(note)}</span>` : '');
  panel.innerHTML = `<div class="v3stamp${d.late ? ' late' : ''}" role="status"><span class="big">${d.late ? 'DELIVERED LATE' : 'DELIVERED'}</span><span>${esc(net.name(d.to))}</span><span class="inside"><span>Signed for:</span> <span>${esc(d.contents)}</span></span>${extra}<span class="pts">+€${d.pay}${d.mult !== 1 ? ` <small>(×${+d.mult.toFixed(2)})</small>` : ''}</span></div>`;
  paintHud();
  await beat(2200);
}
// The museum tram: super rare (signed off), and worth a moment.
async function rare() {
  panel.innerHTML = `<div class="v3stamp rare" role="status"><span class="big">MUSEUM TRAM</span><span>It runs on the same rails. It is just older than everyone aboard.</span></div>`;
  await beat(2200);
}
// The shift's weather, said once at the start (ACT1.md §4).
async function forecast() {
  const w = WX[S.weather] || WX.clear, line = NIGHT && NIGHT_WX[S.weather] ? NIGHT_WX[S.weather] : w.line;
  paintScene('stop', { at: S.at }); sfx('forecast'); weather();
  panel.innerHTML = `<div class="v3stamp wxs" role="status"><span class="big"><span aria-hidden="true">${esc(w.glyph)}</span> <span>${esc(w.name.toUpperCase())}</span></span><span>${esc(line)}</span></div>`;
  await beat(1800);
}

// ── the end: the run's result (runs.js), and what you carried ─────────────
function finish() {
  setTimeout(markUi, 0); endPlay(true);                                  // the end card is up by then, whichever mode it is
  hideBoard(); setActor(null); $('v3mini').hidden = true; panel.innerHTML = ''; wxEl.className = ''; audio?.bed(null);
  if (MODE.mode !== 'run') return finishMode();
  Runs.remember(S.keep);                                  // what the city remembers (ACT1.md §10)
  if (S.keep.regulars) saveStanding({ ...loadStanding(), ...S.keep.regulars });   // the regulars' standing (§11)
  const r = Runs.record(RUN.id, { delivered: S.done, target: S.target, late: S.late, score: S.score, failed: !!S.failed });
  const i = Runs.ORDER.indexOf(RUN.id), next = i < 0 ? null : Runs.RUNS[i + 1], star = n => '★'.repeat(n) + '☆'.repeat(3 - n);
  const struck = J.strikesOf(RUN) && S.strikes >= J.strikesOf(RUN);
  const why = RUN.endless ? `${S.done} jobs · ${struck ? `${COUNT[S.strikes].toLowerCase()} late drops ended it` : 'the clock ended it'}${r.stars < 3 ? ` · ${RUN.stars[r.stars]} for the next star` : ''}`
    : r.done ? (r.stars === 1 ? 'every job delivered · some late' : r.stars === 2 ? `every job on time · €${RUN.par} for the third star` : 'every job on time, at par') : struck ? `${COUNT[S.strikes].toLowerCase()} late drops: the shift is lost` : `deliver all ${S.target} to complete ${RUN.name}`;
  const build = S.perks.length ? `<p class="hint">your build: ${S.perks.map(p => esc(PERKS[p].name)).join(' · ')}</p>` : '';
  const opened = r.opened.map(id => `<p class="runOpened">${esc(Runs.BY_ID[id].name)} IS OPEN</p>`).join('') + (r.extrasOpened ? '<p class="runOpened">THE DAILY AND THE WEEK ARE OPEN</p>' : '') + (RUN.id === 'night' && r.first ? '<p class="runOpened">ACT 1 COMPLETE</p>' : '');
  const go = r.done && next && Runs.unlocked(next.id, r.all) ? `<a class="btn prime wide" id="nextRun" href="${Runs.runHref(next.id, location.search)}">NEXT · ${esc(next.name)}</a>` : '';
  $('endTitle').textContent = RUN.endless ? `${S.done} JOBS` : r.done ? `${RUN.name} COMPLETE` : 'NOT YET';
  const carried = S.seen.length ? `<div class="carried"><h3>WHAT YOU CARRIED</h3><ul>${S.seen.map(x => `<li>${esc(x.contents)} <small>· ${x.how}</small></li>`).join('')}</ul></div>` : '';
  $('endStats').innerHTML = `<div class="dailyBox runBox"><p class="dailyHead">${esc(RUN.name)} · ${esc(RUN.title)}</p><p class="runStars" aria-label="${r.stars} of 3 stars">${star(r.stars)}</p><p class="hint">${esc(why)}${r.newBest && r.all[RUN.id].plays > 1 ? ' · a new best' : ''}</p>${build}${opened}${go}</div>`
    + `<p>earned <b>€${S.score}</b></p><p>deliveries <b>${RUN.endless ? `${S.done} · best ${r.all[RUN.id].best}` : `${S.done}/${S.target}`}</b></p><p>on time <b>${S.done - S.late}</b></p>${J.strikesOf(RUN) ? `<p>strikes <b>${S.strikes}/${J.strikesOf(RUN)}</b></p>` : ''}${S.sold ? `<p>sold <b>${S.sold}</b></p>` : ''}<p>best streak <b>${S.bestStreak}</b></p>${carried}`;
  $('endNote').textContent = RUN.endless ? (struck ? 'Too many late drops.' : 'Ten o\'clock. The shift is over.') : r.done ? 'Every job delivered.' : struck ? 'Too many late drops.' : 'The shift ended.';
  const again = $('again'); if (again) { again.textContent = RUN.endless ? `${RUN.name} AGAIN` : r.done ? `${RUN.name} AGAIN · A NEW SHIFT` : `TRY ${RUN.name} AGAIN`; again.classList.toggle('prime', !go); again.classList.toggle('ghost', !!go); again.onclick = () => { location.href = Runs.runHref(RUN.id, location.search); }; }
  $('end').hidden = false;
  sfx(RUN.id === 'night' && r.first && r.done ? 'act' : r.done ? 'end' : 'miss');
  game.result = r;
}

// The daily's end: the grid, the euros, whether this finish stands, the streak,
// and the line to send. The week's: the day banked, the rent, and tomorrow.
function finishMode() {
  const done = J.complete(S), again = $('again');
  if (MODE.errand) {
    // today's errand: the first finish stands, and the line to send
    const lost = !done, text = errandShare(MODE, { results: S.results, target: S.target, score: S.score, lost, perks: S.perks.map(p => PERKS[p].name) }, location.href.split('#')[0].replace(/[?&](lang|seed|date)=[^&]*/g, ''));
    const rec = recordDaily(MODE.key, { results: [...S.results], score: S.score, target: S.target, done, text }, errandStore());
    $('endTitle').textContent = `ERRAND ${MODE.number}${done ? ' DONE' : ' LOST'}`;
    $('endStats').innerHTML = `<div class="dailyBox runBox"><p class="dailyHead">${esc(MODE.mission.name)} · ${esc(MODE.label)} · the same errand for everyone</p><p class="dailyGrid">${esc(text.split('\n')[1])}</p>`
      + `<p class="hint">${rec.first ? 'This finish is the day\'s result.' : `Today's result already stands. This one was practice.`} · ${streak(MODE.key, errandStore())} day streak</p>`
      + `<button class="btn prime wide" id="shareDaily" type="button">COPY THE RESULT</button><pre class="shareText" id="shareText" hidden>${esc(text)}</pre></div>`;
    $('endNote').textContent = 'A new errand tomorrow.';
    $('shareDaily').onclick = async () => { const pre = $('shareText'); pre.hidden = false; try { await navigator.clipboard.writeText(text); $('shareDaily').textContent = 'COPIED'; } catch { $('shareDaily').textContent = 'SELECT AND COPY'; } };
    if (again) { again.textContent = 'PLAY IT AGAIN · PRACTICE'; again.classList.remove('prime'); again.classList.add('ghost'); again.onclick = () => { location.href = location.href; }; }
    $('end').hidden = false; sfx(done ? 'end' : 'miss'); game.result = { mode: 'errand', first: rec.first, done, id: MODE.mission.id, text };
    return;
  }
  if (MODE.mode === 'mission') {
    const m = MODE.mission, rec = recordMission(m.id, { done, score: S.score }), next = MISSIONS[MISSIONS.indexOf(m) + 1];
    const why = done ? 'Every errand run.' : S.strikes >= STRIKES ? `Two late drops: ${m.name.toLowerCase()} is lost.` : 'The errand did not get done.';
    $('endTitle').textContent = done ? 'MISSION COMPLETE' : 'MISSION LOST';
    $('endStats').innerHTML = `<div class="dailyBox runBox"><p class="dailyHead">${esc(m.name)} · ${esc(m.title)}</p><p class="hint">${esc(why)}</p>`
      + (S.perks.length ? `<p class="hint">your build: ${S.perks.map(p => esc(PERKS[p].name)).join(' · ')}</p>` : '')
      + (rec.opened ? `<p class="runOpened">${esc(next.name)} IS OPEN</p>` : '') + (rec.perk ? `<p class="runOpened">A NEW PERK: ${esc(PERKS[rec.perk].name.toUpperCase())}</p>` : '')
      + (done && next && rec.all && missionOpen(next.id, rec.all, true) ? `<a class="btn prime wide" id="nextRun" href="?mission=${next.id}">NEXT · ${esc(next.name)}</a>` : '')
      + `</div><p>earned <b>€${S.score}</b></p><p>deliveries <b>${S.done}/${S.target}</b></p><p>strikes <b>${S.strikes}/${STRIKES}</b></p>`;
    $('endNote').textContent = done ? 'A new version of it every time you run it.' : 'Every attempt is a different errand.';
    if (again) { again.textContent = done ? `${m.name} AGAIN · A NEW VERSION` : `TRY ${m.name} AGAIN`; again.classList.toggle('prime', !done); again.classList.toggle('ghost', done); again.onclick = () => { location.href = location.href.replace(/[?&]seed=\d+/, ''); }; }
    $('end').hidden = false; sfx(done ? 'end' : 'miss');
    game.result = { mode: 'mission', id: m.id, done, strikes: S.strikes, perks: [...S.perks], opened: rec.opened };
    return;
  }
  if (MODE.mode === 'daily') {
    const rec = recordDaily(MODE.key, { results: [...S.results], score: S.score, target: S.target, euros: true });
    const text = dailyShare(MODE, S.results, S.target, S.score, location.href.split('#')[0].replace(/[?&](lang|seed)=[^&]*/g, ''));
    $('endTitle').textContent = `DAILY ${MODE.number}${done ? ' COMPLETE' : ''}`;
    $('endStats').innerHTML = `<div class="dailyBox runBox"><p class="dailyHead">${esc(MODE.label)} · the same shift for everyone</p><p class="dailyGrid">${esc(text.split('\n')[1])}</p>`
      + `<p class="hint">${rec.first ? 'This finish is the day\'s result.' : `Today's result already stands: €${rec.record.score}. This one was practice.`} · ${streak(MODE.key)} day streak</p>`
      + `<button class="btn prime wide" id="shareDaily" type="button">COPY THE RESULT</button><pre class="shareText" id="shareText" hidden>${esc(text)}</pre></div>`;
    $('endNote').textContent = 'A new daily tomorrow.';
    $('shareDaily').onclick = async () => { const pre = $('shareText'); pre.hidden = false; try { await navigator.clipboard.writeText(text); $('shareDaily').textContent = 'COPIED'; } catch { $('shareDaily').textContent = 'SELECT AND COPY'; } };
    if (again) { again.textContent = 'PLAY IT AGAIN · PRACTICE'; again.classList.remove('prime'); again.classList.add('ghost'); again.onclick = () => { location.href = location.href; }; }
    $('end').hidden = false; game.result = { mode: 'daily', first: rec.first, score: S.score, text };
    return;
  }
  // the week: the day closes with what it banked (×PER_EURO: week.js counts points)
  Runs.remember(S.keep); if (S.keep.regulars) saveStanding({ ...loadStanding(), ...S.keep.regulars });
  const w = W.close(MODE.week, { score: S.score * W.PER_EURO, results: [...S.results] }); W.saveWeek(w, MODE.store);
  const over = W.isOver(w), v = W.verdict(w), p = W.pace(w), day = w.shifts[w.shifts.length - 1];
  $('endTitle').textContent = `${day.name} ${done ? 'DONE' : 'OVER'}`;
  $('endStats').innerHTML = `<div class="dailyBox runBox"><p class="dailyHead">Week ${w.seed} · ${esc(day.name)}</p><p class="dailyGrid">${W.dayGrid(day.results, S.target)} · €${day.euros}</p>`
    + `<div class="weekStrip">${W.DAY_NAMES.map((d, i) => `<span class="wd${w.shifts[i] ? ' done' : ''}"><b>${d.slice(0, 3)}</b><i>${w.shifts[i] ? `€${w.shifts[i].euros}` : '·'}</i></span>`).join('')}</div>`
    + (over ? `<p class="weekVerdict ${v.paid ? 'paid' : 'short'}">${v.paid ? `RENT PAID · €${v.over} over` : `SHORT €${-v.over} ON THE RENT`}</p>` : `<p class="hint">€${p.total} of €${W.RENT} · about €${p.perDay} a shift to go</p>`)
    + `</div>`;
  $('endNote').textContent = over ? 'Friday night. The week is done.' : `${W.DAY_NAMES[w.day]} is next.`;
  if (again) { again.textContent = over ? 'A NEW WEEK' : `NEXT · ${W.DAY_NAMES[w.day]}`; again.classList.add('prime'); again.classList.remove('ghost');
    again.onclick = () => { if (over) W.clearWeek(MODE.store); location.href = location.href; }; }
  $('end').hidden = false; game.result = { mode: 'week', day: day.name, euros: day.euros, over, paid: v.paid, total: v.total };
  sfx(over ? (v.paid ? 'act' : 'miss') : 'end');
}

// ── start ──────────────────────────────────────────────────────────────────
async function start() {
  await ready;
  $('title').hidden = true; stage.hidden = false;
  if (MODE.mode === 'week' && W.isOver(MODE.week)) { W.clearWeek(MODE.store); location.href = location.href; return; }
  const own = MODE.mode !== 'daily' && !MODE.errand;   // the daily is the same shift for everyone: nothing of this device's in it
  // a run's perks come from the same pool the missions grow (the daily's is the first three, the same for everyone)
  let run = MODE.mode === 'mission' || !RUN.perks ? RUN : { ...RUN, perkPool: perkPool(own ? doneCount(loadMissions()) : 0) };
  // ?written is the shift as v3.21 dealt it, for a seed a test or a trailer names: the written deck only,
  // none made from modules (v3.22), and an ordinary day (v3.23)
  if (params.has('written')) run = { ...run, modules: 0, days: false };
  S = J.newRun(net, run, SEED, { memory: own ? Runs.memoryFor() : {}, standing: own ? loadStanding() : {} }); shownMin = null;
  play = PL.start({ version: BUILD_VERSION, mode: MODE.errand ? 'errand' : MODE.mode, run: MODE.mode === 'mission' ? MODE.mission.id : RUN.id, seed: SEED, day: S.day });
  if (MODE.mode === 'week') { W.begin(MODE.week); W.saveWeek(MODE.week, MODE.store); } shownEur = 0; shownDone = 0; arrived = null;
  sizeFrame(); paintHud();
  busy = true; try { await forecast(); } finally { busy = false; }
  render();
}
paintTitle();
$('play')?.addEventListener('click', start);
addEventListener('resize', () => { if (!stage.hidden) { sizeFrame(); fitTop(); if (boardOpen) openBoard(); } });
sizeFrame();

// For the gates: what the screen is showing, read-only. Every action a gate
// takes is a tap on a real button.
// `boards` counts the hops played on the board — a hurried player skips each
// in a frame, so a gate counts them rather than hoping to sample one.
// `board()` (v3.8) says what the board stands on, and `probe(lat, lon)` reads
// the colour it painted at a real place — so a gate can ask whether the South
// Harbour is water without knowing anything about the projection.
const game = { version: BUILD_VERSION, mode: MODE.mode, run: RUN, seed: SEED, ready, state: () => S,
  // the two machines, as one reading (v3.20): where the run is (journey.js STATES), where the screen is (UI),
  // where the run may go next, what the card offers, and anything that does not hold
  plays: () => PL.summarise(PL.load()), playReport: () => PL.report(PL.load(), BUILD_VERSION), playing: () => play,
  machine: () => { const st = S ? J.stateOf(S) : null, c = S && st !== 'end' ? J.card(net, S) : null;
    return { state: st, ui: uiState(), next: st ? J.STATES[st].next : [], about: st ? J.STATES[st].card : UI[uiState()],
      options: c ? c.options.map(o => ({ label: o.label, price: o.price, tier: o.tier || null })) : [], problems: S ? J.check(net, S) : [] }; }, net: () => net, card: () => (S ? J.card(net, S) : null), busy: () => busy, scene: () => scene, result: null, boards: 0,
  board: () => ({ ground: !!board?.ground, sea: board?.sea?.sea.length || 0, islands: board?.sea?.islands.length || 0, streets: board?.streets.length || 0, marks: board?.marks.length || 0, ms: board?.baseMs ?? null, view: board?.view || null }),
  probe: (lat, lon) => { if (Array.isArray(lat)) return lat.map(([a, o]) => game.probe(a, o)); if (!board?.fit || !$('v3board').classList.contains('on')) return null; const p = board.fit(lat, lon), c = $('v3board'); if (p.x < 0 || p.y < 0 || p.x >= c.width || p.y >= c.height) return null; return [...c.getContext('2d').getImageData(Math.round(p.x), Math.round(p.y), 1, 1).data].slice(0, 3); } };
globalThis.__tm3 = game;
markUi(); ready.then(markUi, () => {});
audio = mountAudio(game, { button: 'v3sound', clock: () => S?.clock ?? 0 });
