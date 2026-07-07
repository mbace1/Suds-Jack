// Arcade game-show announcer (v109): original soap-themed lines in the spirit
// of the classic arena shooters, spoken via the browser's speech synthesis.
// Deliberately NOT an imitation of any real person's voice — it uses whatever
// stock en-US voice the device ships, pitched down for game-show bombast.
const ANNOUNCER_LINES = {
  start:    ['WELCOME TO TOKO DROP! GOOD LUCK — YOU\'LL NEED IT!',
             'LADIES AND GENTLEMEN... LET\'S DROP SOME TOKO!'],
  wave:     ['HERE THEY COME!', 'FRESH MEAT FOR THE GRINDER!',
             'MOP THEM UP!', 'NO MERCY! NO REFUNDS!'],
  boss:     ['MEGA MESS INCOMING!', 'IT\'S HUGE! IT\'S HORRIBLE! I LOVE IT!'],
  streak:   ['TOTAL CLEANUP! I LOVE IT!', 'UNSTOPPABLE!',
             'WHAT A PLAYER!', 'THE CROWD GOES WILD!'],
  prize:    ['BIG BUBBLES! BIG PRIZES!', 'GRAB THAT PRIZE!'],
  money:    ['BIG MONEY!', 'CHA-CHING!'],
  mult:     ['DOUBLE IT UP!', 'TWO FOR ONE! I LOVE IT!'],
  ouch:     ['OOOH! THAT\'S GOTTA STING!', 'RIGHT IN THE SUDS!'],
  gameover: ['TOTAL WIPEOUT! SEE YOU NEXT SHOW!',
             'AND THAT\'S THE GAME! WHAT A FINISH!'],
  clear:    ['EXCELLENT!', 'GOOD! GOOD!', 'SPOTLESS!'],
  exit:     ['THE DOORS ARE OPEN — MOVE!', 'PICK A DOOR! ANY DOOR!',
             'CHOOSE YOUR NEXT ROOM!'],
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
  }

  setVolume(v) { this._volume = Math.max(0, Math.min(1, v)); }

  setAnnouncer(on) { this._announcer = !!on; }

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
      u.volume = this._volume;
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

  shoot()     { this._tone(920, 0.07, 'square', 0.11); }
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
  // Shooter entrance (v120): sharp two-note alert — a ranged threat just arrived.
  shooterPing() {
    this._tone(1150, 0.06, 'square', 0.13);
    setTimeout(() => this._tone(1550, 0.07, 'square', 0.11), 75);
  }
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
