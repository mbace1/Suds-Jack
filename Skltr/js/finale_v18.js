// SKLTR v18 — arcade run finale controller.
// Loaded before main.js so it can own the frame gate at victory without rewriting
// the large gameplay module. It counts active gameplay time only (not title/pause).
const RUN_SECONDS = 600;
let won = false;
let active = false;
let elapsed = 0;
let last = performance.now();

const nativeRAF = window.requestAnimationFrame.bind(window);
window.requestAnimationFrame = cb => nativeRAF(now => {
  if (won) return;
  cb(now);
});

function overlay() { return document.getElementById('overlay'); }
function playingNow() {
  const o = overlay();
  if (!o) return false;
  const txt = (o.textContent || '').trim().toUpperCase();
  const hidden = getComputedStyle(o).display === 'none';
  if (hidden) return true;
  if (txt.includes('PAUSED') || txt.includes('DIED') || txt.includes('SKLTR')) return false;
  return false;
}

function victory() {
  if (won) return;
  won = true; active = false;
  const o = overlay();
  if (!o) return;
  const best = Number(localStorage.getItem('skltrWins') || '0') + 1;
  localStorage.setItem('skltrWins', String(best));
  o.style.display = 'block';
  o.style.pointerEvents = 'auto';
  o.innerHTML = `<div style="font-size:13px;letter-spacing:4px;opacity:.65;margin-bottom:8px">RUN COMPLETE</div>
    <div style="font-size:clamp(38px,10vw,62px);font-weight:bold;letter-spacing:5px;color:#9bfff0;text-shadow:0 0 18px rgba(80,255,220,.6)">SURVIVED</div>
    <div style="font-size:18px;margin-top:12px">10:00 · LAST STAND CLEARED</div>
    <div style="font-size:12px;opacity:.6;margin-top:8px">HUNT → CROSSFIRE → VERTICAL → MACHINE YARD → KILL FLOOR</div>
    <div style="font-size:13px;color:#ffd36b;margin-top:12px">COMPLETIONS ${best}</div>
    <div style="font-size:12px;opacity:.55;margin-top:22px">TAP / CLICK TO RETURN</div>`;
  const restart = e => { e.preventDefault(); e.stopPropagation(); location.reload(); };
  o.addEventListener('pointerdown', restart, { once:true });
  o.addEventListener('touchend', restart, { once:true });
  window.dispatchEvent(new CustomEvent('skltr-victory', { detail: { seconds: RUN_SECONDS, completions: best } }));
}

function tick(now) {
  const dt = Math.min(.1, (now - last) / 1000); last = now;
  const p = playingNow();
  if (p) {
    if (!active) active = true;
    elapsed += dt;
    if (elapsed >= RUN_SECONDS) { victory(); return; }
  } else active = false;
  nativeRAF(tick);
}
nativeRAF(tick);

window._skltrFinale = () => ({ won, active, seconds: Math.round(elapsed), remaining: Math.max(0, Math.ceil(RUN_SECONDS - elapsed)) });
