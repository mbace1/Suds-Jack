/**
 * Toko Drop daily leaderboard — Google Apps Script web app.
 * Trust-based top-10 for DAILY runs: the death screen POSTs initials + score
 * on the player's explicit "POST SCORE" tap, and GETs the day's top 10.
 *
 * Setup (~3 minutes, same as feedback-sheet.gs — use a separate deployment,
 * either in the same Sheet's script or its own Sheet):
 *   1. Create a Google Sheet (any name).
 *   2. Extensions → Apps Script, delete the stub, paste this whole file, save.
 *   3. Deploy → New deployment → type "Web app":
 *        Execute as:      Me
 *        Who has access:  Anyone
 *      (required — players' browsers post/read anonymously)
 *   4. Copy the deployment's /exec URL into LEADERBOARD_ENDPOINT near the top
 *      of toko-drop/js/main.js and ship. Until then the game shows no
 *      leaderboard UI at all.
 *
 * Trust-based by design: no accounts, no signatures. Light server-side
 * plausibility caps below reject only the absurd (a determined cheater can
 * still lie — accepted for a friends-scale arcade board):
 *   - score 0..2,000,000, wave 1..200, initials sanitized to 1-3 [A-Z0-9]
 *   - daily key must look like YYYY-MM-DD
 * GET responses are cached for 60 s (CacheService), so hammering the board
 * costs one sheet read a minute.
 */

const SHEET_NAME = 'daily';
const MAX_SCORE  = 2000000;
const MAX_WAVE   = 200;

function _sheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(['posted', 'daily', 'initials', 'score', 'wave', 'seed', 'mode', 'build']);
  }
  return sh;
}

function doPost(e) {
  const d = JSON.parse(e.postData.contents);
  const daily = String(d.daily || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(daily)) return ContentService.createTextOutput('bad daily');
  const initials = String(d.initials || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
  const score = Math.floor(Number(d.score));
  const wave  = Math.floor(Number(d.wave));
  if (!initials || !(score >= 0 && score <= MAX_SCORE) || !(wave >= 1 && wave <= MAX_WAVE)) {
    return ContentService.createTextOutput('implausible');
  }
  _sheet().appendRow([
    new Date().toISOString(), daily, initials, score, wave,
    String(d.seed || ''), String(d.mode || ''), String(d.build || ''),
  ]);
  CacheService.getScriptCache().remove('top:' + daily); // fresh board next GET
  return ContentService.createTextOutput('ok');
}

function doGet(e) {
  const daily = String((e.parameter && e.parameter.daily) || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(daily)) {
    return ContentService.createTextOutput('[]').setMimeType(ContentService.MimeType.JSON);
  }
  const cache = CacheService.getScriptCache();
  const hit = cache.get('top:' + daily);
  if (hit) return ContentService.createTextOutput(hit).setMimeType(ContentService.MimeType.JSON);

  const sh = _sheet();
  const rows = sh.getLastRow() > 1
    ? sh.getRange(2, 1, sh.getLastRow() - 1, 5).getValues() : [];
  const top = rows
    .filter(function (r) { return r[1] === daily; })
    .map(function (r) { return { initials: r[2], score: Number(r[3]), wave: Number(r[4]) }; })
    .sort(function (a, b) { return b.score - a.score; })
    .slice(0, 10);
  const out = JSON.stringify(top);
  cache.put('top:' + daily, out, 60);
  return ContentService.createTextOutput(out).setMimeType(ContentService.MimeType.JSON);
}
