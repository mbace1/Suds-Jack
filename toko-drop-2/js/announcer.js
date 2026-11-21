// announcer.js — 1.x's game-show announcer (v109): original soap-themed lines
// in the spirit of the classic arena shooters, spoken by the browser's own
// speech synthesis — whatever stock voice the device has, pitched down for
// game-show bombast, never an imitation of anyone. Off until OPTIONS turns it
// on (1.x's default), with its own volume (1.x v137: speech caps at 1.0 and
// tied to the master it went inaudible on a quiet setup). The lines and the
// pacing are 1.x's (audio.js:6-41, 149-170); what calls it is main.js, off
// the sim's events.
import { INTRO_VOICE } from './introvoice.js?v=159';

// v156 (owner, 18 Nov: the announcer's trouble "is what he says, those are from the Smash tv mode"): 1.x's lines
// were its SMASH TV cabinet's game show — the studio, the contestant, prizes, money, the mop. 2.0 is one drop of
// gel against nine worlds of it, so the lines are about that: gel and splats, the floor you are on, the boss that
// owns it. Same keys, same pacing, same voice; a new world and a boss now get a line of their own (`world` and
// `boss` take the world's number as `extra`, and fall back to the generic lines).
const LINES = {
  start:    ['DROP IN!', 'ONE DROP AGAINST THE SWARM!', 'STAY LIQUID!', 'LET\'S GET STICKY!'],
  wave:     ['HERE THEY COME!', 'MORE GEL INCOMING!', 'THEY\'RE MULTIPLYING!', 'KEEP MOVING!',
             'DON\'T GET STUCK!', 'SPLAT THEM ALL!', 'STAY FLUID!', 'HERE COMES THE WOBBLE!'],
  boss:     ['BIG ONE INCOMING!', 'HERE COMES THE BOSS!', 'THIS FLOOR HAS AN OWNER!'],
  streak:   ['ON FIRE!', 'HEAT RISING!', 'UNSTOPPABLE!', 'THE FLOOR IS YOURS!', 'NOTHING STICKS TO YOU!'],
  prize:    ['POWER UP!', 'GRAB IT!', 'UPGRADE!'],
  money:    ['BONUS!', 'POINTS!', 'SCORE!'],
  mult:     ['DOUBLE POINTS!', 'EVERYTHING COUNTS TWICE!'],
  ouch:     ['OUCH!', 'SHAKE IT OFF!', 'YOU\'RE LEAKING!', 'HOLD TOGETHER!'],
  gameover: ['SPLAT! GAME OVER!', 'EVAPORATED!', 'DROPPED! GO AGAIN!'],
  clear:    ['WAVE CLEAR!', 'CLEAN SWEEP!', 'NOT A DROP LEFT!', 'SPOTLESS!'],
  bounty:   ['BOUNTY! TAG IT!', 'GOLD TARGET! GO!', 'MARKED! MAKE IT PAY!'],
  paid:     ['BOUNTY PAID!', 'COLLECTED!'],
  phase:    ['IT\'S ANGRY NOW!', 'SECOND WIND!', 'FINAL FORM!', 'IT\'S NOT DONE YET!'],
  world:    ['NEW FLOOR!', 'DOWN YOU GO!', 'ONE MORE WORLD!'],
};
// the floor you land on (`world`, by the world's number) and the boss that owns it (`boss`): DESIGN.md's nine worlds
const WORLD_LINES = { 2: 'THE DRIVEWAY! MIND THE BALL!', 3: 'DOWN THE SEWER!', 4: 'THE CISTERN! DUCK THE SWEEP!',
  5: 'THE BOILER ROOM! IT\'S HEATING UP!', 6: 'THE RIVER! GO WITH THE FLOW!', 7: 'THE ICE! NO BRAKES!',
  8: 'THE DEEP! IT\'S DARK DOWN HERE!', 9: 'THE CORE! THIS IS IT!' };
const BOSS_LINES = { 1: 'THE TWIN PRISMS!', 2: 'THE CURB KING!', 3: 'MAW RISES!', 4: 'BLISTER! HIT IT WHEN IT\'S BARE!',
  5: 'THE KETTLE IS BOILING!', 6: 'PIKE! STAY OUT OF ITS LINE!', 7: 'BERG!', 8: 'THE ANGLER IS FISHING FOR YOU!', 9: 'OMEGA!' };
// game over and a boss cut off whatever is mid-sentence; the rest waits its turn
const URGENT = new Set(['gameover', 'boss']);
const GAP_MS = 3000;

export class Announcer {
  constructor() { this.on = false; this.introOn = true; this.volume = 1; this.last = -1e9; this.spoken = 0; this._intro = null; }

  // v156: the owner's recorded title shout, as 1.x played it (audio.js introJingle, v121/v122): its own switch
  // (INTRO VOICE, on unless turned off), at the announcer's volume, silent when the sound is off. Returns play()'s
  // promise, which an autoplay block rejects before the first gesture, so the caller can try again on one.
  intro(master = 1) {
    if (!this.introOn || this.volume <= 0 || master <= 0 || typeof Audio === 'undefined') return null;
    try {
      if (!this._intro) { this._intro = new Audio(INTRO_VOICE); this._intro.preload = 'auto'; }
      this._intro.volume = Math.max(0, Math.min(1, this.volume * master));
      this._intro.currentTime = 0;
      return this._intro.play();
    } catch { return null; }
  }

  // `extra` puts "WAVE 5!" in front of a wave line, as 1.x did
  say(key, extra = null) {
    if (!this.on || this.volume <= 0 || typeof speechSynthesis === 'undefined') return false;
    const lines = LINES[key];
    if (!lines) return false;
    const now = performance.now(), urgent = URGENT.has(key);
    if (!urgent && (now - this.last < GAP_MS || speechSynthesis.speaking)) return false;
    try {
      if (urgent) speechSynthesis.cancel();
      let text = lines[Math.floor(Math.random() * lines.length)];
      if (key === 'wave' && extra != null) text = `WAVE ${extra}! ${text}`;
      else if (key === 'world' && WORLD_LINES[extra]) text = WORLD_LINES[extra];
      else if (key === 'boss' && BOSS_LINES[extra]) text = BOSS_LINES[extra];
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US'; u.pitch = 0.6; u.rate = 1.12; u.volume = this.volume;   // a deep game-show boom, excited pacing
      speechSynthesis.speak(u);
      this.last = now; this.spoken++;
      return true;
    } catch { return false; }
  }

  stop() { try { if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel(); } catch { /* none to stop */ } }
  stopIntro() { try { this._intro?.pause(); } catch { /* none playing */ } }
}
