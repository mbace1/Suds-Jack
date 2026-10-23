// announcer.js — 1.x's game-show announcer (v109): original soap-themed lines
// in the spirit of the classic arena shooters, spoken by the browser's own
// speech synthesis — whatever stock voice the device has, pitched down for
// game-show bombast, never an imitation of anyone. Off until OPTIONS turns it
// on (1.x's default), with its own volume (1.x v137: speech caps at 1.0 and
// tied to the master it went inaudible on a quiet setup). The lines and the
// pacing are 1.x's (audio.js:6-41, 149-170); what calls it is main.js, off
// the sim's events.
const LINES = {
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
  bounty:   ['BOUNTY ON THE FIELD — TAG IT!', 'GOLD TARGET! EIGHT SECONDS!',
             'MARKED! MAKE IT PAY!'],
  phase:    ['IT\'S FURIOUS NOW!', 'FINAL FORM?! I LOVE IT!',
             'OH, IT REMEMBERS YOU!', 'SOMEONE WOKE IT UP PROPERLY!'],
  // 2.0's own: a new world under the droplet
  world:    ['NEW FLOOR! SAME MESS!', 'DOWN THE DRAIN AND STRAIGHT BACK ON AIR!',
             'WELCOME TO THE NEXT ROOM, CONTESTANT!'],
};
// game over and a boss cut off whatever is mid-sentence; the rest waits its turn
const URGENT = new Set(['gameover', 'boss']);
const GAP_MS = 3000;

export class Announcer {
  constructor() { this.on = false; this.volume = 1; this.last = -1e9; this.spoken = 0; }

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
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US'; u.pitch = 0.6; u.rate = 1.12; u.volume = this.volume;   // a deep game-show boom, excited pacing
      speechSynthesis.speak(u);
      this.last = now; this.spoken++;
      return true;
    } catch { return false; }
  }

  stop() { try { if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel(); } catch { /* none to stop */ } }
}
