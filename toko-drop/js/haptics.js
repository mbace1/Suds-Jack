// v229 HAPTICS (roadmap-v2 Phase 4). navigator.vibrate() is Android Chrome
// only — no iOS Safari, no desktop — so this is deliberately best-effort:
// feature-detected once, a silent no-op everywhere else. A NEW call to
// vibrate() replaces whatever pattern is still running (that's the spec,
// not something this file has to manage), so there's no queue to drain.
//
// Its own toggle, independent of REDUCE MOTION — a player may want the
// buzz without the screen shake, or vice versa; they're different senses.
const SUPPORTED = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

class Haptics {
  constructor() {
    this.enabled = localStorage.getItem('tokoDropHaptics') !== '0';   // opt-out, harmless where unsupported
  }
  setEnabled(on) {
    this.enabled = on;
    localStorage.setItem('tokoDropHaptics', on ? '1' : '0');
    if (!on && SUPPORTED) navigator.vibrate(0);   // cancel anything running
  }
  _fire(pattern) {
    if (!SUPPORTED || !this.enabled) return;
    navigator.vibrate(pattern);
  }
  // A non-fatal hit — short, so it doesn't fight the next one in a bad stretch.
  hit()      { this._fire(35); }
  // The one-time shield absorbing a hit that would otherwise have cost a
  // life — a save worth its own distinct, punchier buzz, not silence.
  shield()   { this._fire([20, 30, 20]); }
  // Death — longer, and shaped differently from a hit so it doesn't read as "one more hit."
  death()    { this._fire([50, 40, 90]); }
  // Rush overheat lockout — the boost shield just died; worth a distinct buzz
  // since it's the mode's core resource, not a damage event.
  overheat() { this._fire(60); }
  // Confirmation buzz when the setting itself is switched on — on the ~90%
  // of devices this silently does nothing on (no vibrate API, iOS, desktop),
  // so turning the toggle on is otherwise the only feature in this whole
  // settings panel that gives zero feedback either way.
  test() { this._fire(35); }
}

export const haptics = new Haptics();
