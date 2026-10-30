// THE KIT for "Grade Your Own Homework" (RFH Brink/Coxon): the papercut box in CLEAN LIGHT (rfp_clean.js), a VIRAL
// cut from its first version (plan/films/32-grade-your-own-homework.md). A desk seen from above: a folder with the
// Pentagon's outline on it; four contracts fan out of it (AI LAB A–D: no names, no logos, all four alike); the clause
// RISK FORECASTING · THREAT IDEATION highlighted; the page turns over into an exam the company marks itself: STUDENT and
// MARKED BY are the same name, every answer ticked, A+, SELF-GRADED. The last second slides the exam back into the
// folder: frame 0's framing, the loop.
// Fair on purpose: one of the four labs is the maker of the tools that made this film, so none is named on screen and
// all four are drawn the same; only the clause heading is the contracts' own words (as reported); every other line on
// every page is a blank typed bar. The disclosure tag closes the film (owner approves its wording).
// Every scene is registered here ("scenes": [] in film.json). Times come from window.FILM_PLAN (pipeline/plan.mjs).
(() => {
  const R = RFP, { W, H, sheet, sprite, stack, box, put, K, hand } = R, TAU = Math.PI * 2, { clamp, lerp } = U;
  const FP = window.FILM_PLAN || { shots: [], cues: {}, ui: {} };
  const shotOf = (id) => FP.shots.find((s) => s.id === id) || { t0: 0, dur: 4 };
  const at = (id, name, d = 0) => { const v = FP.cues[`${id}.${name}`]; return v === undefined ? d : v - shotOf(id).t0; };
  const dur = (id) => shotOf(id).dur;
  const ui = (k, d) => (FP.ui && FP.ui[k]) || d;
  const ease = {
    out: (k) => 1 - Math.pow(1 - clamp(k, 0, 1), 3),
    io: (k) => { k = clamp(k, 0, 1); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; },
    back: (k) => { k = clamp(k, 0, 1); const s = 1.7; return 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2); },
  };
  const JP = '"NotoSansJP-800"';
  const C = {
    blot: '#1d2826', blotL: '#24302e', wood: '#3a2618', woodL: '#55382a',
    manila: '#d9b766', manilaD: '#b8933f', manilaL: '#ead08c', page: '#efe6cf', pageD: '#cfc4ab', line: '#b9ae96',
    ink: '#15120f', red: '#c8321f', redD: '#8e2214', hi: 'rgba(246,214,60,', suit: '#2b2f36', cuff: '#d9d3c4',
    tab: ['#9fb4c6', '#c9a6b8', '#a9c29c', '#d6b98a'],   // four plain tab colours: none is any company's
  };
  const LETTERS = ['A', 'B', 'C', 'D'];

  // ── type
  function fitFont(c, text, size, maxW, face) { let s = size; c.font = face.replace('$', s); while (c.measureText(text).width > maxW && s > 18) { s -= 2; c.font = face.replace('$', s); } return s; }
  /** the where/what tag in the lower corner, as the other films have it */
  function tag(c, text, lt, dd, x = 110, t0 = 0.4) {
    const y = R.SAFE_B - 66, a = clamp((lt - t0) / 0.3, 0, 1) * clamp((dd - 0.5 - lt) / 0.3, 0, 1); if (a <= 0) return;
    c.save(); c.globalAlpha = a; fitFont(c, text, 30, 905 - x - 44, `$px "ArchivoBlack-400", ${JP}`); const w = c.measureText(text).width + 44;
    c.shadowColor = 'rgba(4,6,12,.6)'; c.shadowBlur = 12; c.shadowOffsetX = 6; c.shadowOffsetY = 9; c.fillStyle = K.ochre; c.beginPath(); c.roundRect(x, y, w, 66, 8); c.fill(); c.shadowColor = 'transparent';
    c.fillStyle = K.ink; c.fillText(text, x + 22, y + 45); c.restore();
  }
  /** the disclosure: two lines on cream, bottom centre, clear of the right-hand rail */
  function disclose(c, text, a) {
    if (a <= 0) return;
    const parts = text.split(' · '), x0 = 110, x1 = 905, y1 = R.SAFE_B, lh = 40, h = parts.length * lh + 30;
    c.save(); c.globalAlpha = a; let fs = 28; for (const p of parts) fs = Math.min(fs, fitFont(c, p, 28, x1 - x0 - 44, `$px "ArchivoBlack-400", ${JP}`));
    c.font = `${fs}px "ArchivoBlack-400", ${JP}`; const w = Math.max(...parts.map((p) => c.measureText(p).width)) + 44;
    c.shadowColor = 'rgba(4,6,12,.6)'; c.shadowBlur = 12; c.shadowOffsetX = 6; c.shadowOffsetY = 9; c.fillStyle = C.page; c.beginPath(); c.roundRect(x0, y1 - h, w, h, 8); c.fill(); c.shadowColor = 'transparent';
    c.fillStyle = K.ink; parts.forEach((p, i) => c.fillText(p, x0 + 22, y1 - h + 15 + lh * (i + 0.75))); c.restore();
  }
  function stampMark(c, text, x, y, { k = 1, sc = 1, rot = -0.2, size = 92 } = {}) {
    if (k <= 0) return; const kk = ease.out(clamp(k, 0, 1)), s = sc * lerp(1.9, 1, kk);
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s); c.globalAlpha = clamp(k * 3, 0, 1) * 0.92;
    fitFont(c, text, size, 700, `400 $px "Anton-400", ${JP}`); const tw = c.measureText(text).width, fs = parseFloat(c.font), w = tw + 70, h = fs + 56;
    c.strokeStyle = C.red; c.lineWidth = 9; c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, 12); c.stroke();
    c.lineWidth = 3; c.beginPath(); c.roundRect(-w / 2 + 14, -h / 2 + 14, w - 28, h - 28, 6); c.stroke();
    c.fillStyle = C.red; c.textAlign = 'center'; c.fillText(text, 0, fs * 0.36);
    c.globalCompositeOperation = 'destination-out'; const r = U.rng(text.length * 7 + 3);
    for (let i = 0; i < 160; i++) { c.fillStyle = `rgba(0,0,0,${0.3 + r() * 0.5})`; c.fillRect(-w / 2 + r() * w, -h / 2 + r() * h, 2 + r() * 4, 1 + r() * 3); }
    c.restore();
  }

  // ── the camera
  const vcam = (lt, dd, { hits = [], kick = 0.03, amp = 4, z = 1 } = {}) => {
    let zz = z; for (const h of hits) if (lt >= h) zz += kick * Math.exp(-(lt - h) * 7) * (1 - Math.exp(-(lt - h) * 60));
    const e = Math.sin(Math.PI * clamp(lt / dd, 0, 1));
    return { x: Math.sin(lt * 2.1) * amp * e, y: Math.cos(lt * 1.7 + 1.2) * amp * 0.8 * e, z: zz, fx: 540, fy: 1040 };
  };
  /** a whole-frame zoom about (fx, fy), for the pushes the camera makes between shots */
  const zoomed = (c, z, fx = 540, fy = 1060, fn) => { c.save(); c.translate(fx, fy); c.scale(z, z); c.translate(-fx, -fy); fn(); c.restore(); };

  // ══ THE DESK ═══════════════════════════════════════════════════════════════════════════════════════════════
  const deskSheet = () => sheet('gyh_desk', (g) => {
    g.fillStyle = C.wood; g.fillRect(-90, -90, W + 180, H + 180);
    const r = U.rng(11); for (let i = 0; i < 90; i++) { g.fillStyle = r() < 0.5 ? C.woodL : 'rgba(0,0,0,.18)'; g.fillRect(-90 + r() * (W + 180), -90 + r() * (H + 180), 160 + r() * 300, 2 + r() * 2); }
    // the blotter: a big green card with a leather-ish rim, most of the frame
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(52, 182, 1000, 1640);
    g.fillStyle = C.blot; g.fillRect(40, 170, 1000, 1640);
    g.fillStyle = C.blotL; for (let i = 0; i < 40; i++) g.fillRect(40 + r() * 960, 170 + r() * 1600, 60 + r() * 160, 1.5);
    g.fillStyle = '#5a2e22'; g.fillRect(40, 170, 1000, 34); g.fillRect(40, 1776, 1000, 34);
  }, 12);

  // ── the folder: manila, a tab with the label, the Pentagon's outline on its face (a plain pentagon in a pentagon)
  const FW = 720, FH = 520;
  function pentagon(g, x, y, r, rot = -Math.PI / 2) { g.beginPath(); for (let i = 0; i < 5; i++) { const a = rot + (i / 5) * TAU; i ? g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : g.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.closePath(); }
  const FOLDER_BACK = () => sprite('gyh_folder_back', FW + 40, FH + 120, (FW + 40) / 2, (FH + 120) / 2 + 30, (g) => {
    g.fillStyle = C.manilaD; g.beginPath(); g.roundRect(-FW / 2, -FH / 2 - 10, FW, FH + 10, 12); g.fill();
  }, 10);
  const FOLDER_FRONT = (label) => sprite('gyh_folder_front_' + label, FW + 40, FH + 120, (FW + 40) / 2, (FH + 120) / 2 + 30, (g) => {
    g.fillStyle = C.manila; g.beginPath(); g.moveTo(-FW / 2, -FH / 2 + 60); g.lineTo(-FW / 2 + 40, -FH / 2 + 30); g.lineTo(FW / 2 - 40, -FH / 2 + 30); g.lineTo(FW / 2, -FH / 2 + 60); g.lineTo(FW / 2, FH / 2); g.lineTo(-FW / 2, FH / 2); g.closePath(); g.fill();
    g.fillStyle = C.manilaL; g.fillRect(-FW / 2, -FH / 2 + 60, FW, 6);
    // the tab, with the label
    g.fillStyle = C.manila; g.beginPath(); g.roundRect(-FW / 2 + 30, -FH / 2 - 30, 480, 80, 12); g.fill();
    g.fillStyle = C.page; g.fillRect(-FW / 2 + 48, -FH / 2 - 16, 444, 46);
    g.fillStyle = C.ink; g.textAlign = 'center'; fitFont(g, label, 30, 420, `$px "ArchivoBlack-400", ${JP}`); g.fillText(label, -FW / 2 + 270, -FH / 2 + 18);
    // the building: a pentagon inside a pentagon, inked
    g.strokeStyle = C.ink; g.lineWidth = 9; pentagon(g, 0, 70, 150); g.stroke(); g.lineWidth = 6; pentagon(g, 0, 70, 82); g.stroke();
    g.lineWidth = 3; for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i / 5) * TAU; g.beginPath(); g.moveTo(Math.cos(a) * 82, 70 + Math.sin(a) * 82); g.lineTo(Math.cos(a) * 150, 70 + Math.sin(a) * 150); g.stroke(); }
    g.strokeStyle = 'rgba(0,0,0,.14)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-FW / 2 + 20, FH / 2 - 30); g.lineTo(FW / 2 - 20, FH / 2 - 30); g.stroke();
  }, 10);

  // ── a contract sheet: header, a big LAB letter, typed bars, a seal; all four the same but the letter and the tab colour
  const SW = 300, SH = 420;
  function typed(g, x, y, w, n, seed, gap = 26) { const r = U.rng(seed); g.fillStyle = C.line; for (let i = 0; i < n; i++) g.fillRect(x, y + i * gap, w * (0.55 + r() * 0.45), 9); }
  const SHEET = (i, lab, head) => sprite(`gyh_sheet_${i}_${lab}_${head}`, SW + 40, SH + 40, (SW + 40) / 2, (SH + 40) / 2, (g) => {
    g.fillStyle = C.page; g.fillRect(-SW / 2, -SH / 2, SW, SH);
    g.fillStyle = C.tab[i]; g.fillRect(-SW / 2, -SH / 2, SW, 70);
    g.fillStyle = C.ink; g.textAlign = 'center'; fitFont(g, head, 22, SW - 30, `$px "ArchivoBlack-400", ${JP}`); g.fillText(head, 0, -SH / 2 + 44);
    const L = lab.replace('{L}', LETTERS[i]); fitFont(g, L, 66, SW - 40, `400 $px "Anton-400", ${JP}`); g.fillText(L, 0, -SH / 2 + 150);
    typed(g, -SW / 2 + 30, -SH / 2 + 190, SW - 60, 7, 20 + i);
    g.strokeStyle = C.ink; g.lineWidth = 3; g.beginPath(); g.moveTo(-SW / 2 + 40, SH / 2 - 60); for (let x = 0; x < 120; x += 6) g.lineTo(-SW / 2 + 40 + x, SH / 2 - 60 - Math.sin(x * 0.2 + i) * 10); g.stroke();
    g.fillStyle = C.red; g.beginPath(); g.arc(SW / 2 - 70, SH / 2 - 66, 30, 0, TAU); g.fill(); g.fillStyle = '#e8705c'; g.beginPath(); g.arc(SW / 2 - 78, SH / 2 - 74, 10, 0, TAU); g.fill();
  }, 9);

  // ── the big page (shots 2–4): contract on the front, exam on the back
  const PW = 860, PH = 1120, PX = 540, PY = 1070;
  const CONTRACT = (head, clause, lab) => sprite(`gyh_contract_${head}_${clause}`, PW + 60, PH + 60, (PW + 60) / 2, (PH + 60) / 2, (g) => {
    g.fillStyle = C.page; g.fillRect(-PW / 2, -PH / 2, PW, PH);
    g.fillStyle = C.ink; g.fillRect(-PW / 2, -PH / 2, PW, 92);
    g.fillStyle = C.page; g.textAlign = 'left'; fitFont(g, head, 40, PW - 80, `$px "ArchivoBlack-400", ${JP}`); g.fillText(head, -PW / 2 + 40, -PH / 2 + 62);
    typed(g, -PW / 2 + 50, -PH / 2 + 150, PW - 100, 6, 41, 34);
    // the clause: section mark and the contract's own two terms, big
    g.fillStyle = C.ink; g.font = '400 64px "Anton-400"'; g.fillText('§ 7', -PW / 2 + 50, -PH / 2 + 430);
    const parts = clause.split(' · ');
    parts.forEach((p, j) => { fitFont(g, p, 76, PW - 150, `400 $px "Anton-400", ${JP}`); g.fillText(p, -PW / 2 + 140, -PH / 2 + 430 + j * 92); });
    typed(g, -PW / 2 + 50, -PH / 2 + 640, PW - 100, 9, 43, 34);
    g.strokeStyle = C.ink; g.lineWidth = 3; g.beginPath(); g.moveTo(-PW / 2 + 60, PH / 2 - 90); for (let x = 0; x < 200; x += 6) g.lineTo(-PW / 2 + 60 + x, PH / 2 - 90 - Math.sin(x * 0.15) * 14); g.stroke();
    g.fillStyle = C.red; g.beginPath(); g.arc(PW / 2 - 110, PH / 2 - 110, 48, 0, TAU); g.fill(); g.fillStyle = '#e8705c'; g.beginPath(); g.arc(PW / 2 - 122, PH / 2 - 122, 16, 0, TAU); g.fill();
  }, 12);
  /** four coloured tabs down the page's right edge: the stack of four, the same clause in each */
  function tabs(c, x, y, a = 1) {
    c.save(); c.globalAlpha = a;
    for (let i = 0; i < 4; i++) { const ty = y - PH / 2 + 160 + i * 130; c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(x + PW / 2 - 4, ty + 6, 64, 104); c.fillStyle = C.tab[i]; c.fillRect(x + PW / 2 - 10, ty, 64, 104);
      c.fillStyle = C.ink; c.font = '400 54px "Anton-400"'; c.textAlign = 'center'; c.fillText(LETTERS[i], x + PW / 2 + 22, ty + 72); }
    c.restore();
  }
  const Q_Y = (j) => -PH / 2 + 520 + j * 104;   // the five questions
  const EXAM = (head, student, marker) => sprite(`gyh_exam_${head}_${student}_${marker}`, PW + 60, PH + 60, (PW + 60) / 2, (PH + 60) / 2, (g) => {
    g.fillStyle = C.page; g.fillRect(-PW / 2, -PH / 2, PW, PH);
    // ruled lines, a margin, three punched holes: a school sheet
    g.strokeStyle = 'rgba(80,120,170,.35)'; g.lineWidth = 2; for (let y = -PH / 2 + 130; y < PH / 2 - 30; y += 52) { g.beginPath(); g.moveTo(-PW / 2, y); g.lineTo(PW / 2, y); g.stroke(); }
    g.strokeStyle = 'rgba(200,60,60,.5)'; g.beginPath(); g.moveTo(-PW / 2 + 110, -PH / 2); g.lineTo(-PW / 2 + 110, PH / 2); g.stroke();
    g.fillStyle = C.blot; for (const y of [-300, 0, 300]) { g.beginPath(); g.arc(-PW / 2 + 52, y, 20, 0, TAU); g.fill(); }
    g.fillStyle = C.ink; g.textAlign = 'left'; fitFont(g, head, 64, PW - 210, `400 $px "Anton-400", ${JP}`); g.fillText(head, -PW / 2 + 140, -PH / 2 + 110);
    g.font = `30px "ArchivoBlack-400", ${JP}`; g.fillText(student, -PW / 2 + 140, -PH / 2 + 250); g.fillText(marker, -PW / 2 + 140, -PH / 2 + 350);
    const sx = -PW / 2 + 160 + g.measureText(student).width, mx = -PW / 2 + 160 + g.measureText(marker).width;
    g.fillStyle = C.ink; g.fillRect(sx, -PH / 2 + 262, 90 - sx, 3); g.fillRect(mx, -PH / 2 + 362, 90 - mx, 3);   // v2: lines stop short; the grade has the right
    for (let j = 0; j < 5; j++) { const y = Q_Y(j); g.fillStyle = C.ink; g.font = '400 44px "Anton-400"'; g.fillText(`${j + 1}.`, -PW / 2 + 140, y); g.fillStyle = C.line; g.fillRect(-PW / 2 + 210, y - 22, 430 - (j % 3) * 60, 12);
      g.strokeStyle = C.ink; g.lineWidth = 4; g.strokeRect(PW / 2 - 150, y - 50, 62, 62); }
  }, 12);
  /** the student's name, typed in ink on the STUDENT line (always there: the company sat the exam) */
  function studentName(c, name, x, y) { c.save(); c.fillStyle = C.ink; c.textAlign = 'left'; c.font = `400 52px "Anton-400", ${JP}`; c.fillText(name, x - PW / 2 + 400, y - PH / 2 + 248); c.restore(); }
  /** handwriting in red, revealed left to right (k 0..1) */
  function redWrite(c, text, x, y, k, size = 60, rot = -0.04) {
    if (k <= 0) return; c.save(); c.translate(x, y); c.rotate(rot); c.font = `italic 400 ${size}px "Anton-400", ${JP}`; const w = c.measureText(text).width;
    c.beginPath(); c.rect(-10, -size, (w + 20) * clamp(k, 0, 1), size * 1.5); c.clip(); c.fillStyle = C.red; c.textAlign = 'left'; c.fillText(text, 0, 0); c.restore(); }
  /** a red tick drawn into box j, k 0..1 */
  function tick(c, x, y, j, k) {
    if (k <= 0) return; const bx = x + PW / 2 - 150 + 31, by = y + Q_Y(j) - 19, pts = [[-30, 0], [-8, 26], [40, -44]];
    const L1 = Math.hypot(22, 26), L2 = Math.hypot(48, 70), d = clamp(k, 0, 1) * (L1 + L2);
    c.save(); c.translate(bx, by); c.strokeStyle = C.red; c.lineWidth = 11; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); c.moveTo(...pts[0]);
    if (d <= L1) c.lineTo(lerp(pts[0][0], pts[1][0], d / L1), lerp(pts[0][1], pts[1][1], d / L1));
    else { c.lineTo(...pts[1]); const e = (d - L1) / L2; c.lineTo(lerp(pts[1][0], pts[2][0], e), lerp(pts[1][1], pts[2][1], e)); }
    c.stroke(); c.restore();
  }
  /** the grade: A+ in red with a scribbled ring drawn round it */
  function grade(c, text, x, y, k) {
    if (k <= 0) return; const e = ease.back(clamp(k / 0.6, 0, 1));
    c.save(); c.translate(x, y); c.rotate(-0.12); c.scale(e, e); c.fillStyle = C.red; c.textAlign = 'center'; c.font = `400 150px "Anton-400", ${JP}`; c.fillText(text, 0, 54); c.restore();
    const kr = clamp((k - 0.3) / 0.7, 0, 1); if (kr <= 0) return;
    c.save(); c.translate(x, y); c.rotate(-0.12); c.strokeStyle = C.red; c.lineWidth = 8; c.lineCap = 'round'; c.beginPath(); c.ellipse(0, 0, 118, 100, 0, -2.2, -2.2 + kr * TAU * 1.08); c.stroke(); c.restore();
  }
  /** the red pen, in a gloved hand in a dark sleeve: the pen's tip at (x, y) */
  function penHand(c, x, y, rot = -0.55, s = 0.95) {
    c.save(); c.translate(x, y); c.rotate(rot);
    c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(-8, 6, 22, 260);
    c.fillStyle = C.red; c.fillRect(-11, 0, 22, 250); c.fillStyle = C.redD; c.fillRect(-11, 160, 22, 90); c.fillStyle = '#e8e2d4'; c.beginPath(); c.moveTo(-11, 0); c.lineTo(11, 0); c.lineTo(0, -34); c.closePath(); c.fill();
    c.fillStyle = C.ink; c.beginPath(); c.moveTo(-3, -24); c.lineTo(3, -24); c.lineTo(0, -34); c.closePath(); c.fill();
    c.restore();
    hand(c, x - Math.sin(rot) * 140, y + Math.cos(rot) * 140, s, rot, { sleeve: C.suit, cuff: C.cuff, glove: K.ink });   // the fist round the pen's barrel
  }

  // ═════════ 1 · gyh_hook: frame 0 — the folder, four contracts peeking out of it; on "four" they fan out, each its
  //            LAB letter; the tag: JULY 2025 · UP TO $200M EACH ═════════
  const FOLD = { x: 540, y: 1260 };
  const FAN = (i) => ({ x: 540 + (i - 1.5) * 238, y: 800 + Math.abs(i - 1.5) * 30, rot: (i - 1.5) * 0.09 });   // spread so every LAB letter reads
  function folderScene(c, lt, fanK, cam, { peek = 1, inside = null } = {}) {
    stack(c, [{ sh: deskSheet(), d: 0.03, lift: 0 }, { d: 0.1, fn: (g, ox, oy) => {
      g.save(); g.translate(ox, oy);
      put(g, FOLDER_BACK(), FOLD.x, FOLD.y, { lift: 1 });
      for (let i = 0; i < 4; i++) { const f = FAN(i), k = ease.back(clamp((fanK - i * 0.08) / 0.7, 0, 1)), hid = { x: FOLD.x - 120 + i * 80, y: FOLD.y - 210 + 80 * (1 - peek), rot: (i - 1.5) * 0.04 };
        put(g, SHEET(i, ui('labFmt', 'AI LAB {L}'), ui('contract', 'CONTRACT · UP TO $200M')), lerp(hid.x, f.x, k), lerp(hid.y, f.y, k), { rot: lerp(hid.rot, f.rot, k), sc: lerp(0.86, 1, k), lift: 1.2 + k * 0.6 }); }
      if (inside) inside(g);
      put(g, FOLDER_FRONT(ui('folder', 'PENTAGON · AI CONTRACTS')), FOLD.x, FOLD.y, { lift: 1.1 });
      g.restore(); } }], cam);
  }
  SCENES.gyh_hook = { draw(c, lt) {
    const id = 'gyh_hook', dd = dur(id), tF = at(id, 'four', 1.8);
    const cam = vcam(lt, dd, { hits: [tF], kick: 0.03 });
    folderScene(c, lt, (lt - tF + 0.1) / 0.55, cam);
    tag(c, ui('tag1', 'JULY 2025 · UP TO $200M EACH'), lt, dd, 110, tF + 0.2);
    box(c);
  } };

  // ═════════ 2 · gyh_task: close on the contract: § 7, RISK FORECASTING · THREAT IDEATION; four tabs (A–D) on its edge;
  //            on "forecast" a highlighter sweeps the clause; the tag: contracts won in a FOIA lawsuit ═════════
  function page(c, front, lt, cam, { flip = 0, slideK = 1, sc = 1 } = {}) {
    const s = Math.cos(clamp(flip, 0, 1) * Math.PI), y = PY + (1 - ease.out(slideK)) * 900;
    stack(c, [{ sh: deskSheet(), d: 0.03, lift: 0 }, { d: 0.1, fn: (g, ox, oy) => {
      g.save(); g.translate(ox, oy);
      // three more sheets under it, a little askew: the stack of four
      for (let i = 3; i >= 1; i--) { g.save(); g.translate(PX + i * 10, y + i * 14); g.rotate(0.012 * i); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(-PW / 2 + 10, -PH / 2 + 14, PW, PH); g.fillStyle = i % 2 ? C.pageD : C.page; g.fillRect(-PW / 2, -PH / 2, PW, PH); g.restore(); }
      g.save(); g.translate(PX, y); g.scale(Math.max(0.02, Math.abs(s)) * sc, sc); g.translate(-PX, -y);
      front(g, s >= 0, y); g.restore();
      g.restore(); } }], cam);
  }
  SCENES.gyh_task = { draw(c, lt) {
    const id = 'gyh_task', dd = dur(id), tS = at(id, 'slide', 0.1), tM = at(id, 'mark', 1.6);
    const cam = vcam(lt, dd, { hits: [tM], kick: 0.025, z: lerp(1.0, 1.04, ease.io(lt / dd)) });
    const head = ui('contract', 'CONTRACT · UP TO $200M'), clause = ui('clause', 'RISK FORECASTING · THREAT IDEATION');
    page(c, (g, front, y) => {
      put(g, CONTRACT(head, clause), PX, y, { lift: 1.3 });
      // the highlighter: a translucent yellow sweep over both lines of the clause, on the pop word
      const k = ease.out((lt - tM + 0.1) / 0.45); if (k > 0) { g.save(); g.globalCompositeOperation = 'multiply';
        for (let j = 0; j < 2; j++) { const kk = clamp(k * 2 - j * 0.6, 0, 1); g.fillStyle = C.hi + '0.85)'; g.fillRect(PX - PW / 2 + 130, y - PH / 2 + 370 + j * 92, (PW - 170) * kk, 78); } g.restore(); }
      tabs(g, PX, y);
    }, lt, cam, { slideK: (lt - tS) / 0.45 });
    tag(c, ui('tag2', 'CONTRACTS WON IN A FOIA LAWSUIT · THE INTERCEPT'), lt, dd, 110, tM + 0.2);
    box(c);
  } };

  // ═════════ 3 · gyh_critic: the page turns over — an exam: HOW RISKY IS YOUR OWN AI?; STUDENT: AI LAB; on "interest"
  //            the company's own hand writes the same name on MARKED BY, in red; the tag: CRITIC: AI NOW INSTITUTE ═════════
  const EXAMSPRITE = () => EXAM(ui('exam', 'EXAM: HOW RISKY IS YOUR OWN AI?'), ui('student', 'STUDENT:'), ui('marker', 'MARKED BY:'));
  const MARK_AT = (y) => ({ x: PX - PW / 2 + 400, y: y - PH / 2 + 350 });
  SCENES.gyh_critic = { draw(c, lt) {
    const id = 'gyh_critic', dd = dur(id), tF = at(id, 'flip', 0.15), tR = at(id, 'red', 2.0);
    const cam = vcam(lt, dd, { hits: [tR], kick: 0.025, z: 1.04 });
    const fk = clamp((lt - tF) / 0.5, 0, 1), name = ui('lab', 'AI LAB');
    const head = ui('contract', 'CONTRACT · UP TO $200M'), clause = ui('clause', 'RISK FORECASTING · THREAT IDEATION');
    page(c, (g, front, y) => {
      if (front) { put(g, CONTRACT(head, clause), PX, y, { lift: 1.3 }); g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = C.hi + '0.85)'; for (let j = 0; j < 2; j++) g.fillRect(PX - PW / 2 + 130, y - PH / 2 + 370 + j * 92, PW - 170, 78); g.restore(); }
      else { put(g, EXAMSPRITE(), PX, y, { lift: 1.3 }); studentName(g, name, PX, y); }
    }, lt, cam, { flip: ease.io(fk) });
    if (fk >= 0.5) {
      const m = MARK_AT(PY), wk = clamp((lt - tR + 0.15) / 0.55, 0, 1);
      redWrite(c, name, m.x, m.y, wk, 58);
      // the hand comes in from the lower right, writes along the line
      const hin = ease.out((lt - tF - 0.5) / 0.5), w = 240 * wk;
      penHand(c, lerp(1200, m.x + 20 + w, hin), lerp(1500, m.y + 6 - Math.sin(lt * 40) * 3 * (wk > 0 && wk < 1), hin));
    }
    tag(c, ui('tag3', 'CRITIC: AI NOW INSTITUTE'), lt, dd, 110, tR + 0.15);
    box(c);
  } };

  // ═════════ 4 · gyh_end: every answer ticked in red, the hand moving box to box; on "homework" A+ with a ring; the
  //            SELF-GRADED stamp; the disclosure; the last second the exam slides into the folder: frame 0 ═════════
  SCENES.gyh_end = { draw(c, lt) {
    const id = 'gyh_end', dd = dur(id), tT = at(id, 'ticks', 0.35), tG = at(id, 'grade', 1.6), tS = at(id, 'stamp', 3.2), tD = at(id, 'disclose', dd - 3.0);
    const tOut = dd - 1.05, ko = ease.io((lt - tOut) / 0.95);
    const cam = vcam(lt, dd, { hits: [tG, tS], kick: 0.03, z: 1.04 }); cam.x *= 1 - ko; cam.y *= 1 - ko; cam.z = lerp(cam.z, 1, ko);
    const name = ui('lab', 'AI LAB'), m = MARK_AT(PY), step = Math.max(0.16, (tG - 0.25 - tT) / 5);
    const drawPage = (g, y) => { put(g, EXAMSPRITE(), PX, y, { lift: 1.3 }); studentName(g, name, PX, y); redWrite(g, name, m.x, m.y + (y - PY), 1, 58);
      for (let j = 0; j < 5; j++) tick(g, PX, y, j, (lt - tT - j * step) / (step * 0.8));
      grade(g, ui('grade', 'A+'), PX + PW / 2 - 150, y - PH / 2 + 300, (lt - tG + 0.05) / 0.6);
      stampMark(g, ui('stamp', 'SELF-GRADED'), PX - 20, y + PH / 2 - 380, { k: (lt - tS) / 0.16, rot: -0.14, size: 104 }); };
    const draw = () => {
      if (ko > 0) {   // the last second: the exam shrinks and drops INTO the folder, behind its front: frame 0, the loop
        const sc = lerp(1, 0.4, ko), ty = lerp(PY, FOLD.y + 20, ko);
        folderScene(c, lt, 0, cam, { peek: ko, inside: (g) => { g.save(); g.translate(PX, ty); g.scale(sc, sc); g.translate(-PX, -PY); drawPage(g, PY); g.restore(); } });
        return; }
      page(c, (g) => drawPage(g, PY), lt, cam, {});
      // the hand: box to box with the ticks, then up to the grade, then away before the stamp
      const jt = clamp((lt - tT) / step, 0, 4.99), j = Math.floor(jt), f = jt - j;
      const bx = () => PX + PW / 2 - 150 + 31 + 40, byy = (jj) => PY + Q_Y(jj) - 30;
      let hx = bx(), hy = lerp(byy(j), byy(Math.min(4, j + 1)), ease.io(f));
      const kg = ease.io((lt - tG + 0.3) / 0.35); hx = lerp(hx, PX + PW / 2 - 90, kg); hy = lerp(hy, PY - PH / 2 + 340, kg);
      const kaway = ease.io((lt - tG - 0.7) / 0.5);
      if (kaway < 1) penHand(c, lerp(hx, 1250, kaway), lerp(hy, 1700, kaway));
    };
    draw();
    disclose(c, ui('disclose', "MADE WITH ANTHROPIC'S TOOLS · ANTHROPIC IS ONE OF THE FOUR"), clamp((lt - tD) / 0.3, 0, 1));
    box(c);
  } };
})();
