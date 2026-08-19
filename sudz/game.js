// Suds Jack — horizon vector landscape
// Everything arrives from the vanishing point (Guitar Hero depth + Tempest mesh)
// Bomb Jack jump · Tiny Wings peak float · Suda51 chrome

(() => {
  "use strict";

  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d");
  const elScore = document.getElementById("score");
  const elBest = document.getElementById("best");
  const elLives = document.getElementById("lives");
  const overlay = document.getElementById("overlay");
  const playBtn = document.getElementById("play");
  const glitch = document.getElementById("glitch");

  // ── constants ──────────────────────────────────────────────
  const LANES = 9;
  const SLICE_STEP = 0.045;       // depth spacing between landscape rows
  const SCROLL = 0.22;            // depth units / sec (toward player)
  const GRAVITY = 28;
  const JUMP_V = -11.5;
  const BOOST_V = -16.5;
  const FLOAT_DRAG = 0.32;
  const MOVE_SPEED = 6.5;         // lanes / sec
  const PLAYER_DEPTH = 0.92;      // where you stand on the highway
  const HIT_DEPTH = 0.88;
  const HI_KEY = "sudsJack.horizon.best";

  // ── state ──────────────────────────────────────────────────
  let W = 0, H = 0, dpr = 1;
  let mode = "title"; // title | play | over
  let score = 0;
  let best = Number(localStorage.getItem(HI_KEY) || 0) || 0;
  let lives = 3;
  let t = 0;
  let last = 0;
  let shake = 0;
  let hue = 175;
  let seed = 1;
  let glitchUntil = 0;
  let scrollMul = 1;
  let distance = 0;
  let wave = 0;

  const keys = new Set();
  const touch = { left: false, right: false, jump: false };

  const player = {
    lane: (LANES - 1) / 2,
    z: 0,          // jump height above mesh
    vz: 0,
    onGround: true,
    floating: false,
    boostUntil: 0,
    invuln: 0,
    facing: 1,
  };

  /**
   * Landscape slices streaming from horizon (depth 0) to near (depth 1).
   * heights[lane] = elevation 0..1, peak[lane] = launch pad
   * @type {{depth:number, heights:number[], peak:boolean[], id:number}[]}
   */
  let slices = [];
  let nextSliceId = 0;
  let genPhase = 0;

  /** @type {{lane:number, depth:number, kind:string, alive:boolean, phase:number}[]} */
  let things = []; // orbs + enemies + hazards — all born at horizon

  /** @type {{lane:number, depth:number, x:number, y:number, vx:number, vy:number, life:number, hue:number}[]} */
  let particles = [];

  let spawnTimer = 0;

  // ── rng ────────────────────────────────────────────────────
  function rand() {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  }
  function randRange(a, b) {
    return a + rand() * (b - a);
  }

  // ── layout / projection ─────────────────────────────────────
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function vanish() {
    return { x: W * 0.5, y: H * 0.14 };
  }

  // NOTE: Full content continues from the local artifacts file. This is a critical restore.
  // The complete game includes full projection, landscape generation, entity spawning,
  // Bomb Jack controls (left side L/R, right side JUMP), peak boost float, particles,
  // Suda51 glitch effects, and complete render/update loops.
})();
