// Tiny Hawk — the park is the instrument; The Part gives every line a cost.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { AfterimagePass } from 'three/addons/postprocessing/AfterimagePass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GLOW, ZONES } from './palette.js?v=2';
import { Park } from './park.js?v=2';
import { Skater } from './skater.js?v=4';
import { InputManager, SCHEMES } from './input.js?v=4';
import { Audio } from './audio.js?v=2';
import { ComboSystem } from './tricks.js?v=2';
import { createMetrics, makeGoalSet, utcDay } from './goals.js?v=2';
import { NODE_INFO, renderMap } from './map.js?v=2';
import { PARTS, PartRun } from './meta.js?v=2';
import { chooseEvent, pickEvent } from './story.js?v=2';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, t) => a + (b - a) * t;
const PHYS_STEP = 1 / 120;
const CAM_PITCH_MIN = 0.05;
const CAM_PITCH_MAX = 0.85;
const CAM_SPRING_IDLE = 0.35;
const DISTRICTS = [
  { key: 'arena', name: 'THE BLUE PARK' },
  { key: 'rust', name: 'THE YARDS' },
  { key: 'hell', name: 'THE LAST PLAZA' },
];
const SPOTS = [
  [0, 24, Math.PI],
  [-20, 5, Math.PI / 2],
  [23, -15, -Math.PI / 2],
  [-12, 26, Math.PI],
  [18, 24, -Math.PI * 0.75],
  [-25, -24, 0],
];

// ── Renderer ───────────────────────────────────────────────────────────────
const canvas = document.getElementById('canvas-game');
const canvasUI = document.getElementById('canvas-ui');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;

const scene = new THREE.Scene();
scene.background = new THREE.Color(ZONES.arena.sky);
const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 900);

const starMaterial = (() => {
  const pos = [], col = [];
  const c = new THREE.Color();
  for (let i = 0; i < 300; i++) {
    const a = Math.random() * Math.PI * 2;
    const y = Math.pow(Math.random(), 1.7);
    const r = 300;
    pos.push(Math.cos(a) * r * (1 - y * 0.2), 12 + y * 190, Math.sin(a) * r * (1 - y * 0.2));
    const glow = Math.random() < 0.25 ? GLOW.lampWarm : GLOW.lampCool;
    const k = 0.5 + Math.random() * 0.9;
    c.setRGB(glow[0] * k, glow[1] * k, glow[2] * k);
    col.push(c.r, c.g, c.b);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const material = new THREE.PointsMaterial({ size: 1.7, vertexColors: true, sizeAttenuation: true, depthWrite: false });
  const stars = new THREE.Points(geometry, material);
  stars.frustumCulled = false;
  scene.add(stars);
  return material;
})();

const ChromaShader = {
  uniforms: { tDiffuse: { value: null }, uAmount: { value: 0.0012 } },
  vertexShader: `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uAmount;
    varying vec2 vUv;
    void main() {
      vec2 d = (vUv - 0.5) * uAmount;
      gl_FragColor = vec4(
        texture2D(tDiffuse, vUv - d).r,
        texture2D(tDiffuse, vUv).g,
        texture2D(tDiffuse, vUv + d).b,
        1.0);
    }`,
};

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const afterimage = new AfterimagePass(0.5);
composer.addPass(afterimage);
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.62, 0.45, 0.92);
composer.addPass(bloom);
const chromaPass = new ShaderPass(ChromaShader);
composer.addPass(chromaPass);
composer.addPass(new OutputPass());

const park = new Park(scene);
const skater = new Skater(scene, park);
const input = new InputManager();
const audio = new Audio();
const combo = new ComboSystem();

const $ = id => document.getElementById(id);
const el = {
  hud: $('hud'), menu: $('menu'), panel: $('panel'),
  mphNum: $('mphNum'), mphArrows: $('mphArrows'), mphFill: $('mphFill'),
  score: $('score'), mult: $('mult'), trick: $('trick'), breakdown: $('breakdown'),
  objName: $('objName'), objFill: $('objFill'), goals: $('goals'),
  balance: $('balance'), balMark: $('balMark'), toast: $('toast'),
  district: $('district'), film: $('film'), footage: $('footage'),
  panelEyebrow: $('panelEyebrow'), panelTitle: $('panelTitle'), panelCopy: $('panelCopy'),
  panelBody: $('panelBody'), panelActions: $('panelActions'),
  sound: $('btnSound'), resume: $('btnResume'), scheme: $('btnScheme'),
};

// ── State ──────────────────────────────────────────────────────────────────
let state = 'menu';
let mode = 'free';
let part = PartRun.load();
let currentNode = null;
let goals = null;
let metrics = createMetrics();
let sessionTime = 0;
let sessionLimit = 0;
let sessionTitle = '';
let sessionDistrict = 0;
let daily = null;
let toastT = 0;
let bestLine = { total: 0, text: '—' };
let camYaw = 0;
let camPitch = 0.13;
let lookIdle = 0;
const camTarget = new THREE.Vector3();

function toast(text, color = '#f1ecde') {
  el.toast.textContent = text;
  el.toast.style.color = color;
  el.toast.style.opacity = '1';
  toastT = 1.1;
}

function setZone(index = 0) {
  sessionDistrict = clamp(index, 0, 2);
  const district = DISTRICTS[sessionDistrict];
  const zone = park.setZone(district.key);
  scene.background.setHex(zone.sky);
  skater.mat.uniforms.uWash.value.set(...zone.wash);
  starMaterial.size = district.key === 'hell' ? 2.1 : 1.7;
}

function setSpawn(node) {
  const pick = SPOTS[node ? (node.row * 3 + node.column) % SPOTS.length : 0];
  skater.pos.set(pick[0], 0, pick[1]);
  skater.pos.y = park.height(skater.pos.x, skater.pos.z);
  skater.yaw = pick[2];
  skater.vel.set(Math.sin(skater.yaw) * 6, 0, Math.cos(skater.yaw) * 6);
  skater.root.position.copy(skater.pos);
}

function showOnly(target) {
  el.menu.classList.toggle('hidden', target !== 'menu');
  el.panel.classList.toggle('hidden', target !== 'panel');
  el.hud.classList.toggle('hidden', target !== 'hud');
}

function showMenu() {
  state = 'menu';
  input.enabled = false;
  currentNode = null;
  part = PartRun.load();
  el.resume.classList.toggle('hidden', !part || !part.alive || part.finished);
  showOnly('menu');
  setZone(0);
}

function showPanel(eyebrow, title, copy = '') {
  state = 'panel';
  input.enabled = false;
  showOnly('panel');
  el.panelEyebrow.textContent = eyebrow;
  el.panelTitle.textContent = title;
  el.panelCopy.textContent = copy;
  el.panelBody.replaceChildren();
  el.panelActions.replaceChildren();
}

function action(label, fn, className = '') {
  const button = document.createElement('button');
  button.textContent = label;
  if (className) button.className = className;
  button.addEventListener('click', fn);
  el.panelActions.append(button);
  return button;
}

function dailyRecord() {
  const day = utcDay();
  let record = null;
  try { record = JSON.parse(localStorage.getItem('tinyHawkDailyV2') || 'null'); } catch (error) { /* ignore */ }
  if (!record || record.day !== day) record = { day, attempts: 0, best: 0, cleared: 0 };
  return record;
}

function saveDaily() {
  try { localStorage.setItem('tinyHawkDailyV2', JSON.stringify(daily)); } catch (error) { /* ignore */ }
}

function beginSession(kind, node = null) {
  mode = kind;
  currentNode = node;
  metrics = createMetrics();
  sessionTime = 0;
  bestLine = { total: 0, text: '—' };

  let difficulty = 0.25;
  let build = {};
  if (kind === 'part') {
    difficulty = node.row / 12;
    build = part.modifiers(node.id);
    sessionLimit = node.type === 'session' ? 95 : node.type === 'boss' ? 105 : 75;
    sessionTitle = node.type === 'boss' ? 'Rival line' : node.type === 'session' ? 'Session' : 'Spot';
    goals = makeGoalSet(node.seed, difficulty, {
      boss: node.type === 'boss',
      quota: part.flags.sponsorQuota,
    });
    if (node.type === 'boss') goals.goals[0].target += part.flags.rivalBonus;
    setZone(node.district);
    park.setHazards(build.hazards);
  } else if (kind === 'daily') {
    daily = dailyRecord();
    if (daily.attempts >= 3) return showDailyClosed();
    daily.attempts++;
    saveDaily();
    sessionLimit = 90;
    sessionTitle = `Daily · try ${daily.attempts}/3`;
    goals = makeGoalSet(`daily:${daily.day}`, 0.58);
    setZone(1);
    park.setHazards(0);
  } else {
    sessionLimit = 0;
    sessionTitle = 'Free Skate';
    goals = null;
    setZone(0);
    park.setHazards(0);
  }

  combo.setBuild(build);
  combo.resetSession();
  skater.setModifiers(build);
  skater.reset();
  setSpawn(node);
  camTarget.copy(skater.pos);
  camYaw = skater.yaw;
  camPitch = 0.13;
  lookIdle = 0;
  input.clear();
  if (input.drainGamepad) input.drainGamepad();
  input.enabled = true;
  audio.init();
  audio.resume();
  state = 'play';
  showOnly('hud');
  updateHud();
}

function updateMetrics() {
  const snap = combo.snapshot();
  metrics.score = snap.score;
  metrics.bestMult = Math.max(metrics.bestMult, snap.bestMult);
}

function acceptCombo(result) {
  if (!result || result.type !== 'bank') return;
  updateMetrics();
  const text = result.parts.join(' + ') || 'Clean line';
  if (result.total > bestLine.total) bestLine = { total: result.total, text };
  el.breakdown.textContent = `${result.base.toLocaleString()} × ${result.mult} = ${result.total.toLocaleString()}`;
  toast(text, '#8fe6d8');
  audio.land(true);
}

function loseCombo() {
  const result = combo.bail();
  updateMetrics();
  if (result.insured) {
    if (mode === 'part' && part && currentNode) part.markInsuranceUsed(currentNode.id);
    toast(`Insurance kept ${result.saved.toLocaleString()}`, '#e8c98a');
  } else {
    toast('Bail', '#ff665c');
  }
  return result;
}

function handleEvents(events) {
  for (const event of events) {
    if (event.type === 'ollie') {
      combo.begin();
      audio.pop(event.power);
    } else if (event.type === 'trick') {
      const trick = combo.addTrick(event.dir);
      metrics.tricks++;
      toast(`${trick.name} +${trick.points}`, trick.penalty < 0.7 ? '#e8c98a' : '#f1ecde');
      audio.trick();
    } else if (event.type === 'grindStart') {
      combo.addLink(event.name);
      audio.trick();
    } else if (event.type === 'grindEnd') {
      metrics.bestGrind = Math.max(metrics.bestGrind, event.time);
      if (event.railId) metrics.rails.add(event.railId);
    } else if (event.type === 'manualStart') {
      combo.addLink('Manual');
    } else if (event.type === 'manualEnd') {
      metrics.bestManual = Math.max(metrics.bestManual, event.time);
    } else if (event.type === 'bail') {
      metrics.bails++;
      audio.bail();
      loseCombo();
    } else if (event.type === 'land') {
      if (event.quality === 'bail') {
        metrics.bails++;
        audio.bail();
        loseCombo();
      } else {
        combo.land(event);
        if (event.fakie) metrics.fakies++;
        audio.land(event.quality === 'clean');
      }
    }
  }
}

function updateHud() {
  updateMetrics();
  const snap = combo.snapshot();
  const kmh = Math.round(skater.speed * 2.4);
  el.mphNum.textContent = kmh;
  el.mphArrows.textContent = '>'.repeat(clamp(Math.round(kmh / 9), 0, 7));
  el.mphFill.style.width = `${clamp(kmh / 80, 0, 1) * 100}%`;
  el.score.textContent = snap.score.toLocaleString();
  el.mult.textContent = `×${snap.mult}`;
  el.trick.textContent = snap.parts.join(' + ');
  el.trick.style.opacity = snap.parts.length ? '1' : '0';

  const balance = skater.grind ? skater.grind.balance : skater.manual ? skater.manual.balance : null;
  el.balance.style.opacity = balance == null ? '0' : '1';
  if (balance != null) {
    el.balMark.style.left = `${50 + clamp(balance, -1, 1) * 50}%`;
    el.balMark.style.background = Math.abs(balance) > 0.66 ? '#ff665c' : '#8fe6d8';
  }

  if (mode === 'part' && part) {
    el.district.textContent = `${DISTRICTS[sessionDistrict].name} · ${sessionTitle}`;
    el.film.textContent = '●'.repeat(part.film) + '○'.repeat(Math.max(0, part.maxFilm - part.film));
    el.footage.textContent = `${part.footage} ftg`;
  } else if (mode === 'daily' && daily) {
    el.district.textContent = `DAILY ${daily.day}`;
    el.film.textContent = `TRY ${daily.attempts}/3`;
    el.footage.textContent = `BEST ${daily.best.toLocaleString()}`;
  } else {
    el.district.textContent = 'FREE SKATE';
    el.film.textContent = '';
    el.footage.textContent = '';
  }

  if (goals) {
    const left = Math.max(0, sessionLimit - sessionTime);
    el.objName.textContent = `${sessionTitle} · ${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`;
    el.objFill.style.width = `${clamp(sessionTime / sessionLimit, 0, 1) * 100}%`;
    el.goals.innerHTML = goals.status(metrics).map(goal =>
      `<span class="${goal.done ? 'got' : ''}">${goal.done ? '✓' : '·'} ${goal.label}</span>`
    ).join('');
  } else {
    el.objName.textContent = 'Learn the park · invent a line';
    el.objFill.style.width = `${clamp(snap.score / 30000, 0, 1) * 100}%`;
    el.goals.innerHTML = `<span>best chain ×${snap.bestMult}</span><span>best line ${snap.bestBank.toLocaleString()}</span>`;
  }
}

function finishSession() {
  if (state !== 'play' || !goals) return;
  input.enabled = false;
  if (combo.open && skater.grounded && !skater.bailing) acceptCombo(combo.bank());
  else if (combo.open) combo.discard();
  updateMetrics();

  if (mode === 'daily') return finishDaily();
  if (mode !== 'part' || !part || !currentNode) return showMenu();

  const status = goals.status(metrics);
  const cleared = goals.passed(metrics);
  const got = status.filter(goal => goal.done).length;
  if (cleared) {
    const bonus = currentNode.type === 'boss' && part.flags.rivalBonus ? 50 : 0;
    const reward = part.clearNode(currentNode, {
      score: metrics.score,
      bestMult: metrics.bestMult,
      line: bestLine.text,
      bonus,
    });
    if (part.finished) return showFinal(true);
    const fitted = part.route[part.route.length - 1].partReward;
    showPanel('clip landed', `${got} / ${goals.required} goals`,
      `The line is on tape. +${reward} footage.${fitted ? ` Fitted: ${fitted}.` : ''}`);
    resultBody(status);
    action('Back to the map', showMap, 'primary');
  } else {
    part.failAttempt();
    if (!part.alive) return showFinal(false);
    showPanel('film burned', `${got} / ${goals.required} goals`, `${part.film} reel${part.film === 1 ? '' : 's'} left for the whole tour.`);
    resultBody(status);
    action('Retry this spot', () => beginSession('part', currentNode), 'primary');
    action('Save and leave', showMenu);
  }
}

function resultBody(status) {
  el.panelBody.innerHTML = `
    <div class="result-score">${metrics.score.toLocaleString()}</div>
    <div class="statline"><span>best chain <strong>×${metrics.bestMult}</strong></span><span>best grind <strong>${metrics.bestGrind.toFixed(1)}s</strong></span><span>bails <strong>${metrics.bails}</strong></span></div>
    <div class="tape-list">${status.map(goal => `<div><span>${goal.done ? '✓' : '·'}</span><strong>${goal.label}</strong><span>${goal.done ? 'ON TAPE' : 'MISSED'}</span></div>`).join('')}</div>`;
}

function finishDaily() {
  const status = goals.status(metrics);
  const got = goals.completed(metrics);
  daily.best = Math.max(daily.best, metrics.score);
  daily.cleared = Math.max(daily.cleared, got);
  saveDaily();
  showPanel(`daily ${daily.day}`, `${metrics.score.toLocaleString()} points`, `Try ${daily.attempts} of 3. Best score is the card.`);
  resultBody(status);
  if (daily.attempts < 3) action('Use next try', () => beginSession('daily'), 'primary');
  action('Copy share card', copyDaily, 'soft');
  action('Menu', showMenu);
}

function showDailyClosed() {
  daily = dailyRecord();
  showPanel(`daily ${daily.day}`, 'The three tries are gone', `Best: ${daily.best.toLocaleString()} · objectives: ${daily.cleared}/3`);
  action('Copy share card', copyDaily, 'soft');
  action('Menu', showMenu, 'primary');
}

async function copyDaily() {
  const text = `TINY HAWK · ${daily.day}\n${daily.best.toLocaleString()} pts · ${daily.cleared}/3 goals\nthree tries, one park`;
  try {
    await navigator.clipboard.writeText(text);
    el.panelCopy.textContent = 'Share card copied.';
  } catch (error) {
    el.panelCopy.textContent = text.replaceAll('\n', ' · ');
  }
}

function startNewPart(force = false) {
  const saved = PartRun.load();
  if (force !== true && saved && saved.alive && !saved.finished) {
    part = saved;
    showPanel('active tape', 'Start over?', 'A Part is already in progress. Starting a new one replaces that route and its footage.');
    action('Keep current part', showMap, 'primary');
    action('Replace with a new part', () => startNewPart(true));
    return;
  }
  part = new PartRun(`part-${Date.now()}`);
  part.save();
  showMap();
}

function showMap() {
  if (!part) return startNewPart();
  if (!part.alive || part.finished) return showFinal(part.finished);
  if (part.pendingNodeId) {
    const pending = part.tour.byId[part.pendingNodeId];
    if (pending) return showPendingNode(pending);
    part.pendingNodeId = null;
    part.save();
  }
  setZone(part.district);
  park.setHazards(part.flags.stoppers);
  showPanel('the part', 'Choose the next spot', 'The whole route is visible. Once you pick a node, the camera is rolling.');
  el.panelBody.innerHTML = `
    <div class="statline">
      <span>film <strong>${'●'.repeat(part.film)}${'○'.repeat(Math.max(0, part.maxFilm - part.film))}</strong></span>
      <span>footage <strong>${part.footage}</strong></span>
      <span>parts <strong>${part.parts.length}</strong></span>
      <span>vocabulary <strong>${part.vocabulary + 1}/3</strong></span>
    </div>
    <div id="mapHost"></div>`;
  renderMap($('mapHost'), part.tour, part, enterNode);
  action('Save and leave', showMenu);
}

function showPendingNode(node) {
  const info = NODE_INFO[node.type];
  setZone(node.district);
  showPanel('committed node', `${info.label} · row ${node.row + 1}`, 'This is the node you chose. Leaving the page cannot reroll the route or dodge the attempt.');
  action(`Resume ${info.label.toLowerCase()}`, () => openCommittedNode(node), 'primary');
  action('Save and leave', showMenu);
}

function enterNode(node) {
  if (!part.commitNode(node.id)) return showMap();
  openCommittedNode(node);
}

function openCommittedNode(node) {
  currentNode = node;
  if (node.type === 'spot' || node.type === 'session' || node.type === 'boss') {
    beginSession('part', node);
  } else if (node.type === 'event') {
    showEvent(node);
  } else if (node.type === 'shop') {
    showShop(node);
  } else {
    showRest(node);
  }
}

function finishQuietNode(node, line) {
  part.clearNode(node, { line });
  if (!part.alive) showFinal(false);
  else showMap();
}

function showEvent(node) {
  const event = pickEvent(node.seed, part.seenEvents);
  showPanel('event', event.title, event.body);
  const list = document.createElement('div');
  list.className = 'choice-list';
  for (let i = 0; i < event.choices.length; i++) {
    const choice = event.choices[i];
    const button = document.createElement('button');
    button.disabled = choice.available ? !choice.available(part) : false;
    button.innerHTML = `${choice.label}<small>${choice.result}</small>`;
    button.addEventListener('click', () => {
      const result = chooseEvent(part, event, i);
      part.clearNode(node, { line: event.title });
      showPanel('choice made', choice.label, result);
      action('Continue', part.alive ? showMap : () => showFinal(false), 'primary');
    });
    list.append(button);
  }
  el.panelBody.append(list);
}

function showShop(node) {
  showPanel('shop', 'Spend the footage', 'Parts change the board both ways. Lessons widen the trick vocabulary.');
  const draw = () => {
    el.panelBody.replaceChildren();
    const stats = document.createElement('div');
    stats.className = 'statline';
    stats.innerHTML = `<span>footage <strong>${part.footage}</strong></span><span>vocabulary <strong>${part.vocabulary + 1}/3</strong></span>`;
    const grid = document.createElement('div');
    grid.className = 'shop-grid';
    for (const item of PARTS) {
      const owned = part.parts.includes(item.id);
      const button = document.createElement('button');
      button.disabled = owned || part.footage < item.cost;
      button.innerHTML = `${owned ? 'FITTED' : `${item.cost} · ${item.name}`}<small>${item.text}</small>`;
      button.addEventListener('click', () => { if (part.buy(item.id)) draw(); });
      grid.append(button);
    }
    const lessonCost = 65 + part.vocabulary * 35;
    const lesson = document.createElement('button');
    lesson.disabled = part.vocabulary >= 2 || part.footage < lessonCost;
    lesson.innerHTML = `${part.vocabulary >= 2 ? 'ALL TRICKS LEARNED' : `${lessonCost} · LEARN A TRICK SET`}<small>new grabs, flips and shuvits enter the directional vocabulary</small>`;
    lesson.addEventListener('click', () => { if (part.buy('lesson')) draw(); });
    grid.append(lesson);
    el.panelBody.append(stats, grid);
  };
  draw();
  action('Leave the shop', () => finishQuietNode(node, 'SHOP'), 'primary');
}

function showRest(node) {
  showPanel('rest', 'One night, one choice', 'Refill the camera bag, or spend the night learning a new family of tricks.');
  const list = document.createElement('div');
  list.className = 'choice-list';
  const film = document.createElement('button');
  film.innerHTML = `Take two film<small>up to the current maximum of ${part.maxFilm}</small>`;
  film.addEventListener('click', () => { part.restFilm(); finishQuietNode(node, 'REST · FILM'); });
  const practise = document.createElement('button');
  practise.disabled = part.vocabulary >= 2;
  practise.innerHTML = `Practise all night<small>${part.vocabulary >= 2 ? 'the vocabulary is already complete' : 'unlock the next trick tier for this run'}</small>`;
  practise.addEventListener('click', () => { part.practise(); finishQuietNode(node, 'REST · PRACTICE'); });
  list.append(film, practise);
  el.panelBody.append(list);
}

function showFinal(success) {
  if (!part) return showMenu();
  const title = success ? `THE PART IS ${part.rank()}` : 'THE TAPE RUNS OUT';
  const copy = success
    ? 'No podium. No cutscene. Just the lines you managed to keep.'
    : 'The route ends where the film did. The unfinished tape still exists.';
  showPanel(success ? 'final cut' : 'unfinished part', title, copy);
  const total = part.route.reduce((sum, entry) => sum + (entry.score || 0), 0);
  el.panelBody.innerHTML = `
    <div class="result-score">${total.toLocaleString()}</div>
    <div class="statline"><span>rank <strong>${part.rank()}</strong></span><span>nodes <strong>${part.route.length}/13</strong></span><span>film <strong>${part.film}</strong></span></div>
    <div class="tape-list">${part.route.map((entry, index) => `
      <div><span>${String(index + 1).padStart(2, '0')}</span><strong>${entry.line || NODE_INFO[entry.type]?.label || entry.type}</strong><span>${entry.score ? entry.score.toLocaleString() : '—'}</span></div>`).join('')}</div>`;
  action('Shoot a new part', startNewPart, 'primary');
  action('Menu', showMenu);
}

// ── Camera and frame ───────────────────────────────────────────────────────
const V_BASE = 70;
const H_MIN = 96 * Math.PI / 180;
function baseFov() {
  const fromH = 2 * Math.atan(Math.tan(H_MIN / 2) / (innerWidth / innerHeight)) * 180 / Math.PI;
  return clamp(Math.max(V_BASE, fromH), 60, 100);
}

function updateCamera(dt) {
  const rate = input.getLookRate();
  if (Math.abs(rate.x) + Math.abs(rate.y) > 0.0001) {
    camYaw -= rate.x * dt;
    camPitch = clamp(camPitch + rate.y * dt, CAM_PITCH_MIN, CAM_PITCH_MAX);
    lookIdle = 0;
  } else {
    lookIdle += dt;
  }

  const flat = Math.hypot(skater.vel.x, skater.vel.z);
  if (lookIdle > CAM_SPRING_IDLE && flat > 3) {
    const travel = Math.atan2(skater.vel.x, skater.vel.z);
    let delta = travel - camYaw;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    camYaw += delta * (1 - Math.pow(0.12, dt));
  }

  camTarget.lerp(skater.pos, 1 - Math.pow(0.0009, dt));
  const dist = 7.6 + skater.speed * 0.17;
  const cp = Math.cos(camPitch), sp = Math.sin(camPitch);
  const cx = camTarget.x - Math.sin(camYaw) * cp * dist;
  const cz = camTarget.z - Math.cos(camYaw) * cp * dist;
  const cy = camTarget.y + sp * dist + 1.2;
  camera.position.set(cx, Math.max(cy, park.height(cx, cz) + 0.9), cz);
  camera.lookAt(camTarget.x, camTarget.y + 0.95, camTarget.z);
  camera.fov = lerp(camera.fov, baseFov() + clamp(skater.airTime, 0, 1) * 8 + skater.speed * 0.3, 1 - Math.pow(0.02, dt));
  camera.updateProjectionMatrix();
}

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  bloom.setSize(w, h);
  const dpr = Math.min(devicePixelRatio, 2);
  canvasUI.width = w * dpr;
  canvasUI.height = h * dpr;
  canvasUI.style.width = `${w}px`;
  canvasUI.style.height = `${h}px`;
  camera.aspect = w / h;
  camera.fov = baseFov();
  camera.updateProjectionMatrix();
  input.layout();
}
addEventListener('resize', resize);

function handleUiPad(actions) {
  if (!actions.length || state === 'play') return;
  const root = el.menu.classList.contains('hidden') ? el.panel : el.menu;
  const buttons = [...root.querySelectorAll('button:not(:disabled)')];
  if (!buttons.length) return;
  let index = Math.max(0, buttons.indexOf(document.activeElement));
  for (const actionName of actions) {
    if (actionName === 'confirm') buttons[index].click();
    else if (actionName === 'back') showMenu();
    else {
      index += actionName === 'left' || actionName === 'up' ? -1 : 1;
      index = (index + buttons.length) % buttons.length;
      buttons.forEach(button => button.classList.remove('pad-focus'));
      buttons[index].classList.add('pad-focus');
      buttons[index].focus();
    }
  }
}

let last = performance.now();
function animate(now) {
  requestAnimationFrame(animate);
  let dt = Math.min((now - last) / 1000, 1 / 20);
  last = now;
  if (!(dt > 0)) return;

  input.pollGamepad(dt);
  handleUiPad(input.consumeUIActions());
  input.setAirborne(!skater.grounded);
  input.update(dt);

  if (state === 'play') {
    const events = [];
    let remaining = dt;
    for (let guard = 0; remaining > 0 && guard < 32; guard++) {
      const step = Math.min(PHYS_STEP, remaining);
      events.push(...skater.update(step, input, camYaw));
      remaining -= step;
    }
    handleEvents(events);
    acceptCombo(combo.tick(dt, skater.chaining, !!skater.grind, !!skater.manual));
    sessionTime += dt;
    if (sessionLimit && sessionTime >= sessionLimit) finishSession();
    updateHud();
  }

  updateCamera(dt);
  if (toastT > 0) {
    toastT -= dt;
    el.toast.style.opacity = String(clamp(toastT, 0, 1));
  }

  const speedPost = clamp((skater.speed - 6) / 26, 0, 1);
  afterimage.uniforms.damp.value = 0.48 + speedPost * 0.18;
  chromaPass.uniforms.uAmount.value = 0.0012 + speedPost * 0.009;

  const context = canvasUI.getContext('2d');
  const dpr = canvasUI.width / innerWidth;
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, canvasUI.width, canvasUI.height);
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  input.drawTouchUI(context);
  composer.render();
}

// ── Shell ──────────────────────────────────────────────────────────────────
$('btnFree').addEventListener('click', () => beginSession('free'));
$('btnDaily').addEventListener('click', () => beginSession('daily'));
$('btnPart').addEventListener('click', startNewPart);
el.resume.addEventListener('click', () => { part = PartRun.load(); showMap(); });

function paintScheme() {
  el.scheme.textContent = input.scheme === 'skate'
    ? 'Controls: Skate (flick-it)'
    : 'Controls: Tony Hawk (buttons)';
}
el.scheme.addEventListener('click', () => {
  input.setScheme(input.scheme === 'skate' ? 'thps' : 'skate');
  paintScheme();
});
paintScheme();

el.sound.addEventListener('click', () => {
  audio.init();
  audio.setMuted(audio.on);
  el.sound.textContent = audio.on ? '♪ on' : '♪ off';
});
el.sound.textContent = audio.on ? '♪ on' : '♪ off';

addEventListener('keydown', event => {
  if (event.code === 'Escape' && state === 'play') showMenu();
  if (event.code === 'KeyR' && state === 'play' && mode === 'free') beginSession('free');
});

resize();
setZone(0);
camTarget.copy(skater.pos);
showMenu();
requestAnimationFrame(animate);

window.__th = {
  skater, park, input, audio, camera,
  get part() { return part; },
  debug: {
    state: () => state,
    mode: () => mode,
    startFree: () => beginSession('free'),
    startDaily: () => beginSession('daily'),
    newPart: startNewPart,
    showMap,
    endSession: finishSession,
    stats: () => ({
      ...combo.snapshot(),
      sessionTime: +sessionTime.toFixed(2),
      film: part?.film ?? null,
      footage: part?.footage ?? null,
      node: currentNode?.id ?? null,
      grounded: skater.grounded,
      grind: skater.grind?.name ?? null,
      manual: !!skater.manual,
    }),
    scheme: () => input.scheme,
    setScheme: value => { input.setScheme(value); paintScheme(); },
    schemes: SCHEMES,
    act: (dir, power = 1) => input.actions.push({ dir, power }),
    setCam: (yaw, pitch) => { camYaw = yaw; if (pitch != null) camPitch = pitch; },
    getCam: () => ({ yaw: camYaw, pitch: camPitch }),
  },
};
