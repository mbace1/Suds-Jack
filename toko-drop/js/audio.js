// Arcade game-show announcer (v109): original soap-themed lines in the spirit
// of the classic arena shooters, spoken via the browser's speech synthesis.
// Deliberately NOT an imitation of any real person's voice — it uses whatever
// stock en-US voice the device ships, pitched down for game-show bombast.
const ANNOUNCER_LINES = {
  start:    ['WELCOME TO TOKO DROP! GOOD LUCK — YOU\'LL NEED IT!',
             'LADIES AND GENTLEMEN... LET\'S DROP SOME TOKO!',
             'THE STUDIO IS LIVE! START SCRUBBING!',
             'CONTESTANT ON THE FLOOR! ROLL THE SUDS!'],
  wave:     ['HERE THEY COME!', 'FRESH MEAT FOR THE GRINDER!',
             'MOP THEM UP!', 'NO MERCY! NO REFUNDS!',
             'THE FLOOR IS FILTHY — FIX IT!', 'LOOK ALIVE OUT THERE!',
             'SOMEBODY ORDERED CHAOS!', 'KEEP THAT MOP MOVING!'],
  boss:     ['MEGA MESS INCOMING!', 'IT\'S HUGE! IT\'S HORRIBLE! I LOVE IT!',
             'THE HEADLINER HAS ARRIVED!', 'BIG! ANGRY! SPARKLY! RUN!'],
  streak:   ['TOTAL CLEANUP! I LOVE IT!', 'UNSTOPPABLE!',
             'WHAT A PLAYER!', 'THE CROWD GOES WILD!',
             'SOMEBODY STOP THIS MANIAC! NOT ME THOUGH!'],
  prize:    ['BIG BUBBLES! BIG PRIZES!', 'GRAB THAT PRIZE!',
             'OOOH, SHINY! TAKE IT!'],
  money:    ['BIG MONEY!', 'CHA-CHING!', 'MONEY MONEY MONEY!'],
  mult:     ['DOUBLE IT UP!', 'TWO FOR ONE! I LOVE IT!',
             'EVERYTHING COUNTS TWICE!'],
  ouch:     ['OOOH! THAT\'S GOTTA STING!', 'RIGHT IN THE SUDS!',
             'CLEAN-UP ON AISLE YOU!'],
  gameover: ['TOTAL WIPEOUT! SEE YOU NEXT SHOW!',
             'AND THAT\'S THE GAME! WHAT A FINISH!',
             'THE MOP HAS FALLEN! GOODNIGHT EVERYBODY!'],
  clear:    ['EXCELLENT!', 'GOOD! GOOD!', 'SPOTLESS!',
             'SQUEAKY CLEAN!', 'NOT A SPOT LEFT!'],
  exit:     ['THE DOORS ARE OPEN — MOVE!', 'PICK A DOOR! ANY DOOR!',
             'CHOOSE YOUR NEXT ROOM!', 'DON\'T DAWDLE — DOORS!'],
  bounty:   ['BOUNTY ON THE FIELD — TAG IT!', 'GOLD TARGET! EIGHT SECONDS!',
             'MARKED! MAKE IT PAY!'],
  // v174: boss act changes get their own commentary
  phase:    ['IT\'S FURIOUS NOW!', 'FINAL FORM?! I LOVE IT!',
             'OH, IT REMEMBERS YOU!', 'SOMEONE WOKE IT UP PROPERLY!'],
};
// gameover/boss cut off whatever is mid-sentence; everything else waits its turn.
const ANNOUNCER_URGENT = new Set(['gameover', 'boss']);

class AudioSystem {
  constructor() {
    this._ctx = null; this._volume = 1.0;
    this._announcer = false;
    this._sayLast = 0;      // performance.now() of the last spoken line
    this._voice = null;     // cached SpeechSynthesisVoice (or null = default)
    if (typeof speechSynthesis !== 'undefined') {
      const pick = () => {
        const vs = speechSynthesis.getVoices();
        this._voice = vs.find(v => v.lang?.startsWith('en') && v.localService)
                   ?? vs.find(v => v.lang?.startsWith('en')) ?? null;
      };
      pick();
      speechSynthesis.addEventListener?.('voiceschanged', pick);
    }
    this._introEl = null;   // lazy recorded title-intro clip (v121)
    this._introVoice = true; // v122: own toggle, independent of the announcer
    this._annVolume = 1.0;   // v137: announcer's own volume, NOT scaled by master
    this._lastShotAt = 0;    // v137: shot-noise ducking clock
    this._shootHeat  = 0;
  }

  setVolume(v) {
    this._volume = Math.max(0, Math.min(1, v));

  }

  setAnnouncer(on) { this._announcer = !!on; }

  setIntroVoice(on) { this._introVoice = !!on; }

  // v137: the announcer gets its own slider — speech synthesis caps at 1.0 and
  // was tied to the master volume, so a quiet-SFX setup made it inaudible.
  // Independent by design (master 0 still mutes everything via the gates).
  setAnnouncerVolume(v) {
    this._annVolume = Math.max(0, Math.min(1, v));
    if (this._introEl) this._introEl.volume = this._annVolume;
  }

  // Recorded announcer intro (v121): "TOKO DROP — START SHOOTING!", pre-baked
  // with bass boost / presence EQ / PA slap / compression / stereo widen (see
  // scripts, offline ffmpeg). Plays on the title, gated by its own INTRO VOICE
  // toggle (v122, independent of the commentary announcer). Returns the play()
  // promise so the caller can detect an autoplay block (cold load, before any
  // gesture) and retry. No-ops when muted or the intro voice is off.
  introJingle() {
    if (!this._introVoice || this._volume <= 0) return null;
    try {
      if (!this._introEl) {
        this._introEl = new Audio(new URL('../audio/announcer-intro.mp3?v=146', import.meta.url).href);
        this._introEl.preload = 'auto';
      }
      this._introEl.volume = this._annVolume;
      this._introEl.currentTime = 0;
      return this._introEl.play();   // may reject under autoplay policy
    } catch (_) { return null; }
  }

  // announce('wave', 5) → speaks a random line for the key; extra becomes a
  // "WAVE 5!" prefix on wave lines. Silently no-ops without speechSynthesis
  // (headless/older browsers), at volume 0, or when the toggle is off.
  announce(key, extra = null) {
    if (!this._announcer || this._volume <= 0) return;
    if (typeof speechSynthesis === 'undefined') return;
    const lines = ANNOUNCER_LINES[key];
    if (!lines) return;
    const now = performance.now();
    const urgent = ANNOUNCER_URGENT.has(key);
    if (!urgent && (now - this._sayLast < 3000 || speechSynthesis.speaking)) return;
    try {
      if (urgent) speechSynthesis.cancel();
      let text = lines[Math.floor(Math.random() * lines.length)];
      if (key === 'wave' && extra != null) text = `WAVE ${extra}! ${text}`;
      const u = new SpeechSynthesisUtterance(text);
      if (this._voice) u.voice = this._voice;
      u.pitch  = 0.6;   // deep game-show boom
      u.rate   = 1.12;  // excited pacing
      u.volume = this._annVolume;
      speechSynthesis.speak(u);
      this._sayLast = now;
    } catch (_) {}
  }

  _ensure() {
    if (!this._ctx) this._ctx = new AudioContext();
    if (this._ctx.state === 'suspended') this._ctx.resume();
    return this._ctx;
  }

  _tone(freq, dur, type = 'sine', vol = 0.25, freqEnd = null) {
    if (this._volume <= 0) return;
    try {
      const ctx = this._ensure();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, ctx.currentTime + dur);
      gain.gain.setValueAtTime(vol * this._volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.start(); osc.stop(ctx.currentTime + dur);
    } catch (_) {}
  }

  _noise(vol, dur) {
    if (this._volume <= 0) return;
    try {
      const ctx = this._ensure();
      const n   = Math.floor(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, n, ctx.sampleRate);
      const d   = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      const src  = ctx.createBufferSource();
      const gain = ctx.createGain();
      src.buffer = buf;
      src.connect(gain); gain.connect(ctx.destination);
      gain.gain.setValueAtTime(vol * this._volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      src.start();
    } catch (_) {}
  }

  // v164 sound identity: each cabinet fires a different gun. null (classic)
  // reproduces the original blip EXACTLY — same byte-identical rule as the
  // render path. Set from each cabinet's setXLook() via setCabinetSound().
  setCabinetSound(mode) { this._cab = mode ?? null; }
  // v137: sustained fire ducks the shot blip toward 50% over ~2.5 s so a held
  // trigger doesn't dominate the mix; half a second of not firing resets it.
  shoot() {
    const now = performance.now();
    const gap = now - this._lastShotAt;
    this._shootHeat = gap < 500 ? Math.min(2500, this._shootHeat + gap) : 0;
    this._lastShotAt = now;
    const duck = 1 - 0.5 * (this._shootHeat / 2500);
    switch (this._cab) {
      case 'tokotron':   // zappy vector blip — high square with a fast fall
        this._tone(1250, 0.06, 'square', 0.10 * duck, 700); break;
      case 'gaundrop':   // dull dungeon thud
        this._tone(480, 0.09, 'triangle', 0.13 * duck, 260); break;
      case 'binding':    // wet basement pop
        this._tone(620, 0.10, 'sine', 0.13 * duck, 300); break;
      case 'loadout':    // punchy military report with a grain of noise
        this._tone(240, 0.11, 'sawtooth', 0.15 * duck, 110);
        this._noise(0.05 * duck, 0.05); break;
      case 'kaikki':     // gritty street crack
        this._tone(700, 0.05, 'sawtooth', 0.13 * duck, 320); break;
      case 'nexdeus':    // the god-machine hums — twin bright voices per shot
        this._tone(1500, 0.07, 'sine', 0.09 * duck, 600);
        this._tone(755, 0.05, 'square', 0.05 * duck, 380); break;
      default:           // classic — untouched
        this._tone(920, 0.07, 'square', 0.11 * duck);
    }
  }
  enemyHit()  { this._tone(500, 0.07, 'square', 0.20); }
  enemyDieType(cat) {
    if      (cat === 'blob')  { this._tone(420, 0.22, 'sine',     0.22, 75); }
    else if (cat === 'toro')  { this._tone(95,  0.45, 'sawtooth', 0.36, 38); this._noise(0.14, 0.22); }
    else if (cat === 'bambu') { this._tone(480, 0.30, 'triangle', 0.26, 190); }
    else if (cat === 'pyra')  { this._tone(1300,0.16, 'sine',     0.20, 550); }
    else                       { this._tone(380, 0.18, 'square',   0.22, 55); this._noise(0.09, 0.13); }
  }
  // BAMBU lob splashdown (v108): wet low thud + short splash of noise.
  lobSplash() { this._tone(150, 0.28, 'sine', 0.30, 55); this._noise(0.16, 0.20); }
  // BOTFLY homing launch (v108): soft rising zip — a warning you can hear.
  botShot()   { this._tone(380, 0.16, 'triangle', 0.14, 1150); }
  // WARDEN deflection (v124): dull high tink — reads "shielded", not "missed".
  shieldTink() { this._tone(1900, 0.05, 'triangle', 0.10, 1400); }
  // Civilian down (v148, TOKOTRON): a short sad slide — you were too slow.
  civDown() { this._tone(320, 0.28, 'sawtooth', 0.2, 90); }
  // SIREN scream (v141): rising two-voice wail — the pack just got faster.
  sirenScream() {
    this._tone(700, 0.45, 'sawtooth', 0.20, 1500);
    this._tone(705, 0.45, 'square',   0.10, 1520);
    this._noise(0.06, 0.3);
  }
  // BULWARK plate clank (v140): lower and duller than the warden tink —
  // reads "armor", cueing the flank without a glance.
  plateTink() { this._tone(720, 0.06, 'square', 0.15, 480); }
  // Graze (v125): whisper-quiet zip as a bullet skims past — felt, not loud.
  grazeTick() { this._tone(2400, 0.035, 'sine', 0.07, 2800); }
  // Boss phase shift (v136): two rising snarls — the fight just changed gear.
  phaseShift() {
    this._tone(160, 0.22, 'sawtooth', 0.32, 230);
    setTimeout(() => this._tone(210, 0.26, 'sawtooth', 0.30, 320), 130);
  }
  // CLEANSE burst (v133): bright rising sparkle over a soft foam wash.
  cleanse() {
    [660, 880, 1320].forEach((f, i) =>
      setTimeout(() => this._tone(f, 0.16, 'sine', 0.18), i * 60));
    this._noise(0.10, 0.35);
  }
  // Score milestone (v124): quick rising three-note sparkle.
  milestone() {
    [523, 659, 784].forEach((f, i) =>
      setTimeout(() => this._tone(f, 0.14, 'triangle', 0.18), i * 70));
  }
  // Shooter entrance (v120): sharp two-note alert — a ranged threat just arrived.
  shooterPing() {
    this._tone(1150, 0.06, 'square', 0.13);
    setTimeout(() => this._tone(1550, 0.07, 'square', 0.11), 75);
  }
  // Boss-wave klaxon (v123): two ominous rising low tones + a noise swell —
  // the "here comes the boss" beat, fires regardless of the spoken announcer.
  bossHorn() {
    this._tone(70, 0.55, 'sawtooth', 0.40, 130);
    setTimeout(() => this._tone(90, 0.70, 'sawtooth', 0.34, 155), 200);
    this._noise(0.14, 0.5);
  }
  // v164 cabinet stingers — one-shot synth SFX, never loops (GDD §10).
  // TOKOTRON wave materialize: robotic double-zap.
  waveZap() {
    this._tone(1600, 0.08, 'square', 0.16, 900);
    setTimeout(() => this._tone(1100, 0.10, 'square', 0.14, 500), 90);
  }
  // GAUNDROP key: bright ring of little teeth.
  keyJingle() {
    [1568, 1976, 2637].forEach((f, i) =>
      setTimeout(() => this._tone(f, 0.09, 'triangle', 0.14), i * 55));
  }
  // GAUNDROP hunger: a low knell — eat.
  hungerKnell() { this._tone(140, 0.5, 'sine', 0.30, 90); this._noise(0.06, 0.2); }
  // GAUNDROP descend: the floor swallows you.
  descend() { this._tone(220, 0.5, 'sawtooth', 0.26, 55); this._noise(0.10, 0.35); }
  // KAIKKI cash register: cha-ching.
  kaChing() {
    this._noise(0.10, 0.05);
    setTimeout(() => { this._tone(1568, 0.12, 'sine', 0.18); this._tone(2093, 0.14, 'sine', 0.14); }, 55);
  }
  // v171 ARENA CURTAIN: two-tone alarm, then the wall whooshes off the rail.
  // NEX DEUS surge (v173): a ring erupts — deep bloom under a rising shimmer.
  nexSurge() {
    this._tone(90, 0.35, 'sawtooth', 0.30, 45);
    this._tone(700, 0.30, 'sine', 0.16, 1600);
    this._noise(0.10, 0.22);
  }
  // STEAM VENT blast (v176): a hot hiss with a low kick under it.
  ventBlast() {
    this._noise(0.18, 0.28);
    this._tone(130, 0.2, 'sine', 0.24, 60);
  }
  // SUDS SURGE (v176): the foam wall leaves its wall — a long soft whoosh.
  surgeFoam() {
    this._noise(0.14, 0.6);
    this._tone(220, 0.5, 'sine', 0.12, 90);
  }
  curtainAlarm() {
    this._tone(880, 0.14, 'square', 0.22);
    setTimeout(() => this._tone(660, 0.16, 'square', 0.22), 170);
    setTimeout(() => this._tone(880, 0.14, 'square', 0.20), 340);
  }
  curtainSweep() { this._tone(300, 0.5, 'sawtooth', 0.22, 90); this._noise(0.16, 0.45); }
  playerHit() { this._tone(100, 0.32, 'sawtooth', 0.38); this._noise(0.22, 0.18); }
  playerDie() { this._tone(65,  0.70, 'sawtooth', 0.50); this._noise(0.42, 0.60); }
  pickup() {
    [392, 523, 659].forEach((f, i) =>
      setTimeout(() => this._tone(f, 0.13, 'sine', 0.18), i * 60));
  }
  waveClear() {
    [261, 329, 392, 523].forEach((f, i) =>
      setTimeout(() => this._tone(f, 0.22, 'sine', 0.20), i * 90));
  }
  // SMASH TV room clear (v114): studio-crowd swell — staggered, decaying
  // noise bursts read as applause through the lo-fi synth palette.
  applause() {
    [0, 90, 190, 310, 450, 620].forEach((d, i) =>
      setTimeout(() => this._noise(0.11 - i * 0.013, 0.30), d));
  }
}

export const audio = new AudioSystem();
