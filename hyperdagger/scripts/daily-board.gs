/**
 * Hyper Dagger global daily leaderboard — Google Apps Script web app.
 * Zero-cost backend: every daily-run death POSTs one row to a Google Sheet
 * you own, and the death screen GETs the day's top 10 back.
 *
 * Setup (~3 minutes):
 *   1. Create a Google Sheet (any name).
 *   2. Extensions → Apps Script, delete the stub, paste this whole file, save.
 *   3. Deploy → New deployment → type "Web app":
 *        Execute as:      Me
 *        Who has access:  Anyone
 *      (required — the game posts anonymously from players' browsers)
 *   4. Copy the deployment's /exec URL into BOARD_ENDPOINT near the top of
 *      the daily-runs section in hyperdagger/js/main.js and ship. With the
 *      endpoint empty the game never fetches and shows no board — everything
 *      else works identically.
 *
 * Notes:
 *   - The game sends Content-Type: text/plain (Apps Script can't answer CORS
 *     preflights); the JSON body is parsed here regardless. Responses ride
 *     Apps Script's googleusercontent redirect, which serves
 *     Access-Control-Allow-Origin: * — so browser fetch works for both verbs.
 *   - Re-deploying the script creates a NEW /exec URL unless you use
 *     "Manage deployments → edit → new version" on the existing deployment.
 */

const SHEET_NAME = 'daily';
const COLUMNS = ['date', 'mode', 't', 'name', 'at'];

/** Append one finished daily run: {date: 'YYYY-MM-DD', mode: 'pure'|'hyper',
 *  t: seconds, name: 3-char initials}. */
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const date = String(data.date || '').slice(0, 10);
  const mode = data.mode === 'hyper' ? 'hyper' : 'pure';
  const t = Number(data.t);
  const name = String(data.name || '???').toUpperCase().replace(/[^A-Z0-9?]/g, '').slice(0, 3) || '???';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !isFinite(t) || t <= 0 || t > 36000) {
    return ContentService.createTextOutput('bad');
  }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) sheet.appendRow(COLUMNS);
  sheet.appendRow([date, mode, Math.round(t * 10) / 10, name, new Date().toISOString()]);
  return ContentService.createTextOutput('ok');
}

/** ?date=YYYY-MM-DD&mode=pure|hyper[&t=seconds] → JSON
 *  {top: [{name, t}], count, rank} — top 10 for that day+mode, total entry
 *  count, and (when t is passed) the 1-based rank that time holds today. */
function doGet(e) {
  const date = String((e.parameter.date || '')).slice(0, 10);
  const mode = e.parameter.mode === 'hyper' ? 'hyper' : 'pure';
  const myT = Number(e.parameter.t);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  const rows = sheet && sheet.getLastRow() > 1
    ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).getValues()
    : [];
  const day = rows
    .filter(function (r) {
      const d = r[0] instanceof Date ? r[0].toISOString().slice(0, 10) : String(r[0]).slice(0, 10);
      return d === date && String(r[1]) === mode;
    })
    .map(function (r) { return { name: String(r[3] || '???'), t: Number(r[2]) }; })
    .filter(function (r) { return isFinite(r.t) && r.t > 0; })
    .sort(function (a, b) { return b.t - a.t; });
  const out = {
    top: day.slice(0, 10),
    count: day.length,
    rank: isFinite(myT) && myT > 0 ? 1 + day.filter(function (r) { return r.t > myT; }).length : null,
  };
  return ContentService.createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}
