// THE MOTION LAB — four open-source libraries tried inside the papercut shadowbox (owner, 19 Oct: "look into motion
// graphics side and suggest some cool options. Maybe new graphics or popular things from GitHub"). Each test is one
// thing our own kit cannot do, drawn in the house card so it is judged as a film shot rather than as a library demo.
// The libraries are vendored in scenes/vendor/ (all MIT) and loaded before this file by the film's SCENE_LIBS.
//   ml_pile   matter.js   paper with weight: the terms rain down and pile up on a masked Toko
//   ml_flow   pretext     text that makes way: the small print flows round his mask, in en, then fi, then ja
//   ml_morph  flubber     one shape becomes another: a shield becomes a padlock becomes an eye
//   ml_mark   rough.js    marks by hand: a marker circles, underlines, strikes and highlights the clause
// Everything is a pure function of the shot's local time; the physics re-simulates from 0 whenever time goes back.
(() => {
  const { K, W, H, sheet, sprite, stack, box, dusk, put, pop, ease, glow, walker, fist, words } = RFP, TAU = Math.PI * 2, { clamp, lerp } = U;
  const sm = (k) => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
  const room = (key) => [{ sh: dusk('ml_' + key, 1300), d: 0.05 }, { sh: desk(), d: 0.3 }];
  const desk = () => sheet('ml_desk', (g) => {
    g.fillStyle = '#4a2f1f'; g.fillRect(-90, 1500, W + 180, H); g.fillStyle = '#6a4630'; g.fillRect(-90, 1500, W + 180, 22);
    g.fillStyle = 'rgba(0,0,0,.18)'; for (let x = -40; x < W + 90; x += 210) g.fillRect(x, 1530, 5, H);
  }, 12);
  /** the test's name at the top, in cut card: what it does, then the library and its licence */
  function title(c, lt, big, small) {
    const a = pop(lt, 0.05, 0.35), b = pop(lt, 0.2, 0.35);
    put(c, sprite('ml_band', 900, 190, 450, 95, (g) => { g.fillStyle = K.ink; g.beginPath(); g.roundRect(-450, -95, 900, 190, 14); g.fill(); }, 12), W / 2, 282, { lift: 1.2 });
    if (a > 0) put(c, words(big, '400 86px "Anton-400"', K.card), W / 2, 250, { sc: a });
    if (b > 0) put(c, words(small, '700 40px "Poppins-700"', K.ochre), W / 2, 330, { sc: b, lift: 0.5 });
  }

  // ───────────────────────── 1 · matter.js: paper with weight ─────────────────────────
  const KINDS = [['TERMS', K.card], ['UPDATE', '#e8d9b8'], ['COOKIES', K.card], ['CONSENT', '#e2cfa8'], ['PRIVACY', K.card], ['I AGREE', '#efe4cf']];
  const cardSprite = (i) => { const [word, col] = KINDS[i % KINDS.length], w = 230, h = 150;
    return sprite(`ml_card_${i % KINDS.length}`, w, h, w / 2, h / 2, (g) => {
      g.fillStyle = col; g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, 8); g.fill();
      g.fillStyle = K.ink; g.font = '400 40px "Anton-400"'; g.textAlign = 'left'; g.fillText(word, -w / 2 + 18, -h / 2 + 50);
      g.fillStyle = 'rgba(21,18,15,.35)'; for (let j = 0; j < 4; j++) g.fillRect(-w / 2 + 18, -h / 2 + 70 + j * 16, w - 36 - (j === 3 ? 70 : 0), 6);
    }, 7); };
  const TOKO = { x: 540, y: 1100, s: 0.9 };            // the walker's neck; his body stands on the desk at y 1500
  // most of the paper is aimed at him; the rest lands where it lands. Then one heavy stamp, so weight shows.
  const N = 15, SPAWN = Array.from({ length: N }, (_, i) => { const r = U.rng(100 + i), aimed = r() < 0.65;
    return { t: 0.3 + i * 0.2, x: aimed ? TOKO.x + (r() - 0.5) * 300 : 170 + r() * 740, a: (r() - 0.5) * 2, w: (r() - 0.5) * 0.25, k: i }; });
  const STAMP = { t: 3.55, x: TOKO.x + 40, w: 300, h: 130 };
  const stampSprite = () => sprite('ml_stamp', STAMP.w, STAMP.h, STAMP.w / 2, STAMP.h / 2, (g) => {
    g.fillStyle = K.red; g.beginPath(); g.roundRect(-STAMP.w / 2, -STAMP.h / 2, STAMP.w, STAMP.h, 12); g.fill();
    g.fillStyle = K.card; g.font = '400 66px "Anton-400"'; g.textAlign = 'center'; g.fillText('I AGREE', 0, 24); }, 9);
  let SIM = null;
  function makeSim() {
    const { Engine, Bodies, Composite } = Matter, eng = Engine.create({ gravity: { x: 0, y: 1, scale: 0.0011 } });
    const st = { isStatic: true, friction: 0.9 };
    Composite.add(eng.world, [Bodies.rectangle(W / 2, 1500 + 60, W * 2, 120, st), Bodies.rectangle(56 - 60, H / 2, 120, H * 2, st), Bodies.rectangle(W - 56 + 60, H / 2, 120, H * 2, st),
      Bodies.trapezoid(TOKO.x, TOKO.y + 200, 250, 400, -0.18, st), Bodies.circle(TOKO.x, TOKO.y - 44, 72, st)]);
    return { eng, t: 0, next: 0, cards: [] };
  }
  function simTo(lt) {
    if (!SIM || lt < SIM.t - 1e-6) SIM = makeSim();
    const dt = 1 / 120;
    while (SIM.t + dt <= lt + 1e-9) {
      while (SIM.next < N && SPAWN[SIM.next].t <= SIM.t) {
        const s = SPAWN[SIM.next++], b = Matter.Bodies.rectangle(s.x, -120, 230, 150, { angle: s.a, frictionAir: 0.035, friction: 0.6, restitution: 0.05, density: 0.0008, chamfer: { radius: 6 } });
        Matter.Body.setAngularVelocity(b, s.w); Matter.Composite.add(SIM.eng.world, b); SIM.cards.push({ k: s.k, b });
      }
      if (!SIM.stamp && STAMP.t <= SIM.t) { SIM.stamp = Matter.Bodies.rectangle(STAMP.x, -150, STAMP.w, STAMP.h, { angle: 0.15, frictionAir: 0.004, friction: 0.8, density: 0.012, chamfer: { radius: 10 } });
        Matter.Body.setVelocity(SIM.stamp, { x: 0, y: 14 }); Matter.Composite.add(SIM.eng.world, SIM.stamp); }
      Matter.Engine.update(SIM.eng, dt * 1000); SIM.t += dt;
    }
    return SIM;
  }
  SCENES.ml_pile = { draw(c, lt) {
    const sim = simTo(lt);
    const cam = { x: Math.sin(lt * 0.5) * 6, y: 0, z: 1 + 0.03 * sm(lt / 5) };
    stack(c, [...room('pile'), { d: 0.6, fn: (g, ox, oy) => {
      glow(g, 840 + ox, 560 + oy, 420, 'rgba(255,214,140,', 0.25);
      walker(g, TOKO.x + ox, TOKO.y + oy, TOKO.s, { t: lt, look: Math.sin(lt * 2.2) * 0.4 * clamp(lt - 0.6, 0, 1), led: lt > 3.6 ? true : 0 });
      for (const s of sim.cards) put(g, cardSprite(s.k), s.b.position.x + ox, s.b.position.y + oy, { rot: s.b.angle, lift: 0.8 });
      if (sim.stamp) put(g, stampSprite(), sim.stamp.position.x + ox, sim.stamp.position.y + oy, { rot: sim.stamp.angle, lift: 1.3, alpha: 0.6 });
    } }], cam);
    title(c, lt, 'PAPER WITH WEIGHT', 'matter.js  ·  MIT  ·  physics');
    box(c);
  } };

  // ───────────────────────── 2 · pretext: text that makes way ─────────────────────────
  const SMALL = {
    en: { head: 'TERMS OF SERVICE', font: '400 31px "LibreBaskerville-400"', lh: 46,
      text: 'By reading this sentence you agree to these terms. We may change the terms at any time, and reading on means you accept the change. Your attention is collected to improve your experience. Your experience is collected to improve our product. Some agreements cannot be undone. Silence counts as consent. Looking away counts as looking. If you do not agree, stop reading, which you have already agreed not to do. ' },
    fi: { head: 'KÄYTTÖEHDOT', font: '400 31px "LibreBaskerville-400"', lh: 46,
      text: 'Lukemalla tämän lauseen hyväksyt nämä ehdot. Voimme muuttaa ehtoja milloin tahansa, ja lukemisen jatkaminen tarkoittaa, että hyväksyt muutoksen. Huomiotasi kerätään kokemuksesi parantamiseksi. Kokemustasi kerätään tuotteemme parantamiseksi. Joitakin sopimuksia ei voi perua. Hiljaisuus on suostumus. Poispäin katsominen on katsomista. Jos et hyväksy, lopeta lukeminen, minkä olet jo luvannut olla tekemättä. ' },
    ja: { head: '利用規約', font: '600 32px "NotoSerifJP-600"', lh: 50,
      text: 'この文を読んだ時点で、あなたは本規約に同意したものとみなされます。当社はいつでも規約を変更でき、読み続けることは変更への同意を意味します。あなたの注意は、体験の向上のために収集されます。あなたの体験は、製品の向上のために収集されます。取り消せない同意もあります。沈黙は同意です。目をそらすことも、見ることです。同意しない場合は読むのをやめてください。ただし、やめないことにもすでに同意しています。' },
  };
  const PREP = {};
  const prep = (k) => PREP[k] || (PREP[k] = PT.prepareWithSegments(SMALL[k].text.repeat(4), SMALL[k].font));
  const DOC = { x: 130, y: 430, w: 820, h: 1120, pad: 56 };
  const page = () => sheet('ml_page', (g) => { g.fillStyle = '#efe4cf'; g.beginPath(); g.roundRect(DOC.x, DOC.y, DOC.w, DOC.h, 10); g.fill();
    g.fillStyle = 'rgba(0,0,0,.06)'; g.fillRect(DOC.x, DOC.y + 150, DOC.w, 3); }, 16);
  /** the head that pushes the words aside: where it is at time lt (a slow figure-of-eight over the page) */
  const headAt = (lt) => ({ x: 540 + 250 * Math.sin(lt * 1.15 - 0.6), y: 1010 + 230 * Math.sin(lt * 0.8 + 0.4), r: 118 });
  SCENES.ml_flow = { draw(c, lt) {
    const lang = lt < 1.85 ? 'en' : lt < 3.7 ? 'fi' : 'ja', L = SMALL[lang], P = prep(lang), hd = headAt(lt), gap = 22;
    stack(c, [...room('flow'), { sh: page(), d: 0.45 }, { d: 0.45, fn: (g, ox, oy) => {
      g.save(); g.translate(ox, oy);
      g.fillStyle = K.ink; g.font = lang === 'ja' ? '800 64px "NotoSerifJP-600"' : '400 66px "Anton-400"'; g.textAlign = 'left'; g.fillText(L.head, DOC.x + DOC.pad, DOC.y + 110);
      g.font = L.font; g.fillStyle = '#2a231c';
      let cur = { segmentIndex: 0, graphemeIndex: 0 };
      const x0 = DOC.x + DOC.pad, x1 = DOC.x + DOC.w - DOC.pad;
      for (let y = DOC.y + 200; y + L.lh <= DOC.y + DOC.h - 40; y += L.lh) {
        // the widest chord of the head's circle inside this line's band, plus a margin: the line splits round it
        const near = clamp(hd.y, y, y + L.lh), d = Math.abs(near - hd.y), R = hd.r + gap, half = d < R ? Math.sqrt(R * R - d * d) : -1;
        const spans = half < 0 ? [[x0, x1]] : [[x0, hd.x - half], [hd.x + half, x1]];
        for (const [a, b] of spans) {
          if (b - a < 170) continue;                       // a sliver would only hold half a word
          const line = PT.layoutNextLine(P, b - a, cur); if (!line) break;
          g.fillText(line.text, a, y + L.lh * 0.72); cur = line.end;
        }
      }
      g.restore();
      // the head itself, above the page: Toko's mask, lit from the lamp, with its shadow on the paper
      g.save(); g.filter = 'blur(14px)'; g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.arc(hd.x + ox + 18, hd.y + oy + 26, hd.r * 0.95, 0, TAU); g.fill(); g.restore();
      RFM.mask(g, hd.x + ox, hd.y + oy, hd.r * 0.92, K.mag, { strap: true, shade: false, face: K.card, frame: K.ink, ink: K.ink, t: lt, tilt: Math.sin(lt * 1.3) * 0.12 });
    } }], { x: 0, y: 0, z: 1 });
    title(c, lt, 'TEXT THAT MAKES WAY', 'pretext  ·  MIT  ·  layout in en / fi / ja');
    box(c);
  } };

  // ───────────────────────── 3 · flubber: one shape becomes another ─────────────────────────
  const arc = (cx, cy, r, a0, a1, n = 24) => Array.from({ length: n + 1 }, (_, i) => { const a = lerp(a0, a1, i / n); return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; });
  const bez = (p0, p1, p2, p3, n = 16) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, u = 1 - t;
    return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]; });
  const SHIELD = [...bez([540, 690], [640, 750], [740, 760], [800, 750]), ...bez([800, 750], [810, 900], [800, 1000], [800, 1000]),
    ...bez([800, 1000], [790, 1160], [680, 1260], [540, 1330]), ...bez([540, 1330], [400, 1260], [290, 1160], [280, 1000]),
    ...bez([280, 1000], [280, 1000], [270, 900], [280, 750]), ...bez([280, 750], [340, 760], [440, 750], [540, 690])];
  // the padlock is one ring: the hole inside the shackle is reached by a zero-width slit along the body's top, wound
  // the other way, so a non-zero fill leaves it empty
  const LOCK = [[300, 940], [390, 940], ...arc(540, 820, 150, Math.PI, TAU), [690, 940], [632, 940], ...arc(540, 820, 92, 0, -Math.PI), [448, 940], [632, 940],
    [690, 940], [780, 940], [780, 1320], [300, 1320]];
  const EYE = [...bez([250, 1010], [380, 820], [700, 820], [830, 1010], 30), ...bez([830, 1010], [700, 1200], [380, 1200], [250, 1010], 30)];
  let MORPH = null;
  const morphs = () => MORPH || (MORPH = [flubber.interpolate(SHIELD, LOCK, { maxSegmentLength: 6 }), flubber.interpolate(LOCK, EYE, { maxSegmentLength: 6 })]);
  const mixHex = (a, b, k) => { const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)), A = p(a), B = p(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], k))).join(',')})`; };
  SCENES.ml_morph = { draw(c, lt) {
    const [m1, m2] = morphs(), k1 = ease.back((lt - 0.9) / 0.6), k2 = ease.back((lt - 2.3) / 0.6);
    const d = lt < 2.3 ? m1(clamp(k1, 0, 1)) : m2(clamp(k2, 0, 1)), col = lt < 2.3 ? mixHex(K.green, K.ochre, clamp(k1, 0, 1)) : mixHex(K.ochre, '#efe4cf', clamp(k2, 0, 1));
    // the overshoot of the back-ease, as a squash on the whole card so the change lands like a slap of card
    const over = lt < 2.3 ? Math.max(0, k1 - 1) : Math.max(0, k2 - 1), sq = 1 + over * 0.6;
    const word = lt < 1.05 ? 'PRIVATE' : lt < 2.45 ? 'LOCKED' : 'WATCHING';
    stack(c, [...room('morph'), { d: 0.5, fn: (g, ox, oy) => {
      glow(g, 540 + ox, 1000 + oy, 640, 'rgba(255,214,140,', 0.22);
      const p = new Path2D(d);
      g.save(); g.translate(540 + ox, 1010 + oy); g.scale(sq, 1 / sq); g.translate(-540, -1010);
      g.save(); g.filter = 'blur(12px)'; g.globalAlpha = 0.55; g.translate(16, 22); g.fillStyle = '#000'; g.fill(p); g.restore();
      g.fillStyle = col; g.fill(p);
      g.save(); g.clip(p); g.strokeStyle = 'rgba(255,245,220,.25)'; g.lineWidth = 6; g.translate(-3, -4); g.stroke(p); g.restore();
      if (lt > 2.75) { // the iris pops in, looks at us, then the eye blinks once
        const ip = pop(lt, 2.8, 0.3), bl = lt > 3.8 && lt < 4.05 ? Math.sin((lt - 3.8) / 0.25 * Math.PI) : 0;
        g.save(); g.clip(p); g.translate(540 + Math.sin(lt * 2) * 12, 1010); g.scale(ip, ip * (1 - 0.92 * bl));
        g.fillStyle = K.ink; g.beginPath(); g.arc(0, 0, 118, 0, TAU); g.fill(); g.fillStyle = K.mag; g.beginPath(); g.arc(0, 0, 66, 0, TAU); g.fill();
        g.fillStyle = K.ink; g.beginPath(); g.arc(0, 0, 34, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(-30, -36, 14, 0, TAU); g.fill(); g.restore();
        if (bl > 0) { g.save(); g.clip(p); g.fillStyle = col; g.fillRect(200, 800, 680, 210 * bl); g.fillRect(200, 1220 - 210 * bl, 680, 210 * bl); g.restore(); }
      }
      g.restore();
      const wp = pop(lt, word === 'PRIVATE' ? 0.3 : word === 'LOCKED' ? 1.05 : 2.45, 0.3);
      put(g, words(word, '400 92px "Anton-400"', K.card), 540 + ox, 1480 + oy, { sc: wp });
    } }], { x: Math.sin(lt * 0.6) * 5, y: 0, z: 1 });
    title(c, lt, 'SHAPES THAT TURN', 'flubber  ·  MIT  ·  shape morph');
    box(c);
  } };

  // ───────────────────────── 4 · rough.js: marks by hand ─────────────────────────
  const LINES = ['Update to our terms', '', 'We may change these terms', 'at any time.', 'Some purchases cannot be', 'undone.', 'You can opt out by post.', 'Silence counts as consent.', 'Thank you for agreeing.'];
  const LY = (i) => 640 + i * 92;
  const memo = () => sheet('ml_memo', (g) => { g.fillStyle = '#efe4cf'; g.beginPath(); g.roundRect(130, 470, 820, 1020, 10); g.fill();
    g.fillStyle = K.ink; g.textAlign = 'left';
    LINES.forEach((s, i) => { g.font = i ? '400 44px "LibreBaskerville-400"' : '700 50px "LibreBaskerville-700"'; g.fillText(s, 190, LY(i)); }); }, 16);
  // each mark: its rough shapes, the time it is drawn over, and its ink
  let MARKS = null;
  function marks() {
    if (MARKS) return MARKS;
    const gen = rough.generator(), red = '#d8402f', o = (seed, extra = {}) => ({ seed, roughness: 1.6, bowing: 1.4, stroke: red, strokeWidth: 7, ...extra });
    const spec = [
      [0.7, 0.8, gen.ellipse(470, LY(4) + 30, 720, 210, o(3))],                                                   // circle the clause
      [1.7, 0.45, gen.line(190, LY(3) + 16, 470, LY(3) + 14, o(5)), gen.line(195, LY(3) + 30, 440, LY(3) + 30, o(6, { strokeWidth: 5 }))],  // underline it twice
      [2.35, 0.4, gen.line(180, LY(6) - 14, 760, LY(6) - 18, o(7, { strokeWidth: 9 }))],                           // strike the opt-out
      [2.9, 0.5, gen.linearPath([[820, LY(6) - 30], [890, LY(5)], [880, LY(4) + 70]], o(8, { strokeWidth: 6 }))],  // an arrow to the margin
      [3.6, 0.7, gen.rectangle(180, LY(7) - 46, 600, 64, o(9, { stroke: 'none', fill: 'rgba(245,196,0,.55)', fillStyle: 'hachure', hachureGap: 9, fillWeight: 6, hachureAngle: -30 }))],
    ];
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    MARKS = spec.map(([t0, dur, ...ds]) => {
      const parts = ds.flatMap((dr) => gen.toPaths(dr)).filter((p) => p.d && (p.stroke !== 'none' || p.fill)).map((p) => { el.setAttribute('d', p.d);
        return { p: new Path2D(p.d), d: p.d, len: el.getTotalLength(), stroke: p.stroke === 'none' ? p.fill : p.stroke, w: p.strokeWidth || 6 }; });
      return { t0, dur, parts, total: parts.reduce((s, q) => s + q.len, 0) };
    });
    return MARKS;
  }
  /** draw a mark up to progress k; return where the pen is */
  function drawMark(g, m, k) {
    let left = m.total * clamp(k, 0, 1), tip = null; const el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    for (const q of m.parts) {
      if (left <= 0) break; const run = Math.min(q.len, left); left -= run;
      g.save(); g.strokeStyle = q.stroke; g.lineWidth = q.w; g.lineCap = 'round'; g.lineJoin = 'round'; g.setLineDash([run, q.len + 10]); g.stroke(q.p); g.restore();
      if (run < q.len || left <= 0) { el.setAttribute('d', q.d); const pt = el.getPointAtLength(run); tip = [pt.x, pt.y]; }
    }
    return tip;
  }
  SCENES.ml_mark = { draw(c, lt) {
    const M = marks();
    stack(c, [...room('mark'), { sh: memo(), d: 0.45 }, { d: 0.45, fn: (g, ox, oy) => {
      g.save(); g.translate(ox, oy); let tip = null;
      for (const m of M) { const k = (lt - m.t0) / m.dur; if (k <= 0) continue; const t = drawMark(g, m, ease.out(k)); if (k < 1) tip = t; }
      if (lt > 3.15) { g.fillStyle = '#d8402f'; g.font = '600 92px "Caveat-600"'; g.textAlign = 'center'; g.globalAlpha = clamp((lt - 3.15) / 0.25, 0, 1); g.fillText('?!', 900, LY(4) + 40); }
      g.restore();
      // the marker in a gloved hand, following the tip while it draws, resting off the page when it is not
      const rest = [930, 1640], at = tip || rest, pen = [at[0] + ox, at[1] + oy];
      // a right hand: the marker's body runs down-right from the tip, through the fist
      const rot = -0.5, ax = Math.sin(-rot), ay = Math.cos(rot);
      g.save(); g.translate(pen[0], pen[1]); g.rotate(rot);
      g.fillStyle = '#d8402f'; g.beginPath(); g.moveTo(0, 0); g.lineTo(-10, 26); g.lineTo(10, 26); g.closePath(); g.fill();
      g.fillStyle = '#2a2420'; g.fillRect(-16, 26, 32, 190); g.fillStyle = '#d8402f'; g.fillRect(-16, 196, 32, 22); g.restore();
      fist(g, pen[0] + ax * 120, pen[1] + ay * 120, 0.62, rot, { sleeve: K.green, cuff: K.red, len: 1500 });
    } }], { x: 0, y: 0, z: 1 });
    title(c, lt, 'MARKS BY HAND', 'rough.js  ·  MIT  ·  sketchy strokes');
    box(c);
  } };
})();
