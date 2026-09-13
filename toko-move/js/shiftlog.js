// Toko Move v2.26 — THE SHIFT LOG, and the replay it feeds.
//
// A run used to end in four numbers: delivered, score, bonuses, late. Now that a
// shift can actually be LOST (v2.25 made deadlines the trip's real cost, and the
// first measured run went late), four numbers are the worst possible ending —
// they tell you that you failed and nothing about where. The design doc calls
// post-run replay "a core learning tool" and it is the one thing on its list of
// experiments that was never built.
//
// It RECORDS BY WATCHING, like turf's anim.js reads state.log rather than being
// called by combat.js: nothing in deliveries.js or mobility-v212.js knows this
// file exists. It polls, notices what changed, and writes it down. That means it
// can never break the game it is observing, and it can be deleted without
// touching a rule.
//
// The one thing it computes rather than observes is the ALTERNATIVE: at the
// moment you board, what the best plan from where you stand was worth against
// what you actually took. That comparison is the whole point — "you waited 517
// ticks at Ooppera; the 4 was standing here and would have arrived 296 sooner"
// is a sentence a player can learn from, and no tally of totals is.
export class ShiftLog {
  constructor(tm) {
    this.tm = tm;
    this.jobs = [];
    this.job = null;
    this.phase = null;
    this.lastIndex = -1;
    this.lastKind = null;
  }

  tick() { return this.tm.flow?.clock?.tick || 0; }
  name(id) { return this.tm.challenge?.name?.(id) || id; }

  // One sample. Cheap enough to run at the draw loop's pace, and every branch is
  // a comparison against what it saw last time.
  poll() {
    const tm = this.tm, ch = tm.challenge, mob = tm.mobility;
    if (!ch || !mob) return;
    const t = this.tick(), st = mob.status?.(), kind = ch.active ? (st?.kind || 'waiting') : 'idle';

    // a job ended: the index moved, or the shift did
    if (ch.index !== this.lastIndex) {
      if (this.job) this.close(this.job, t, ch.index > this.lastIndex);
      this.lastIndex = ch.index;
      this.job = null;
    }
    if (ch.active && !this.job) {
      this.job = { n: ch.index + 1, from: ch.active.stops[0], to: ch.currentTo(), cargo: ch.active.cargo,
                   value: ch.active.value, limit: ch.active.limit, took: t, segs: [], missed: [] };
      this.jobs.push(this.job);
      this.phase = null;
    }
    if (!this.job) { this.lastKind = kind; return; }

    if (kind !== this.lastKind) {
      if (this.phase) { this.phase.end = t; }
      this.phase = { kind, start: t, end: t, at: st?.at || ch.currentFrom?.(), line: st?.ride?.line || null };
      this.job.segs.push(this.phase);
      // BOARDING is the moment a decision was made, so it is the moment worth
      // pricing. Both numbers come from the same timetable the panel quoted.
      if (kind === 'riding') this.note(this.job, t, st);
    } else if (this.phase) this.phase.end = t;
    this.lastKind = kind;
  }

  // What you took against what was there. `planCostFrom` is the same estimator
  // the dispatch board and the catch panel use, so this cannot disagree with
  // what the player was shown at the time.
  note(job, t, st) {
    const tm = this.tm, ch = tm.challenge;
    const from = st?.ride?.from || ch.currentFrom?.(), to = ch.currentTo?.();
    if (!from || !to) return;
    const best = tm.planCostFrom?.(from, to);
    // the plan the player CLICKED, not the single-leg physical ride it is
    // executed as: mobility hands `catchChoice` the whole choice and keeps it,
    // and comparing the physical leg against the best plan can never fire —
    // one leg is by construction no worse than a whole trip.
    const plan = st?.ride?.plan || ch.selectedPlan;
    let chosen = null;
    if (plan) { const e = tm.planEstimateOf?.(plan); chosen = e?.total ?? null; }
    if (Number.isFinite(best) && Number.isFinite(chosen) && chosen - best > 60)
      job.missed.push({ at: from, t, chosen, best, saves: chosen - best, line: st?.ride?.line || '' });
  }

  close(job, t, delivered) {
    if (this.phase) this.phase.end = t;
    job.done = t;
    job.delivered = !!delivered;
    job.elapsed = t - job.took;
    job.late = job.elapsed > job.limit;
    job.spare = Math.max(0, job.limit - job.elapsed);
  }

  // Called when the shift ends, so an unfinished job is closed as unfinished
  // rather than left half-written.
  finish() { if (this.job && !this.job.done) this.close(this.job, this.tick(), false); this.job = null; }

  // ------------------------------------------------------------- the replay
  //
  // A bar per job, split by what you actually spent the time on. The colours
  // are the phases, not the lines: this view is about where the shift WENT.
  html() {
    if (!this.jobs.length) return '';
    const C = { waiting: '#8a939b', riding: '#4d8fb0', walking: '#8f7f52', getoff: '#5f6a72', idle: '#3a4148' };
    const rows = this.jobs.map(j => {
      const span = Math.max(1, (j.done ?? this.tick()) - j.took);
      const bars = j.segs.map(s => {
        const w = Math.max(0, (s.end - s.start)) / span * 100;
        if (w < 0.5) return '';
        const label = s.kind === 'riding' ? (s.line || 'ride') : s.kind;
        return `<i title="${label} ${Math.round(s.end - s.start)}t" style="width:${w}%;background:${C[s.kind] || C.idle}"></i>`;
      }).join('');
      const verdict = !j.delivered ? '<b style="color:#b34a36">NOT DELIVERED</b>'
        : j.late ? `<b style="color:#b34a36">LATE by ${j.elapsed - j.limit}t</b>`
        : `<b style="color:#4a7a4f">${j.spare}t to spare</b>`;
      const miss = j.missed.map(m =>
        `<div class="miss">at ${esc(this.name(m.at))} you boarded a ~${m.chosen}t plan · a ~${m.best}t one was on the board · <b>${m.saves}t</b></div>`).join('');
      return `<div class="jobRow"><div class="jobHead">${j.n}. ${esc(this.name(j.from))} → ${esc(this.name(j.to))} · ${esc(j.cargo)} · ${verdict}</div>` +
             `<div class="bar">${bars}</div>${miss}</div>`;
    }).join('');
    const tot = k => this.jobs.reduce((n, j) => n + j.segs.filter(s => s.kind === k).reduce((m, s) => m + (s.end - s.start), 0), 0);
    const all = ['waiting', 'riding', 'walking', 'getoff'].reduce((n, k) => n + tot(k), 0) || 1;
    const key = ['waiting', 'riding', 'walking'].map(k =>
      `<span><i style="background:${C[k]}"></i>${k} ${Math.round(100 * tot(k) / all)}%</span>`).join('');
    return `<div id="replay"><h3>THE SHIFT BACK</h3><div class="rkey">${key}</div>${rows}</div>`;
  }
}
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] || c));
