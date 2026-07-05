/**
 * Toko Drop feedback sink — Google Apps Script web app.
 * Unlimited replacement for the Formspree free tier: every SEND & CONTINUE
 * from the death screen appends one row to a Google Sheet you own.
 *
 * Setup (~3 minutes):
 *   1. Create a Google Sheet (any name).
 *   2. Extensions → Apps Script, delete the stub, paste this whole file, save.
 *   3. Deploy → New deployment → type "Web app":
 *        Execute as:      Me
 *        Who has access:  Anyone
 *      (required — the game posts anonymously from players' browsers)
 *   4. Copy the deployment's /exec URL into SHEET_ENDPOINT near the top of
 *      toko-drop/js/main.js and ship. The Formspree fallback stops being used.
 *
 * Notes:
 *   - The game sends Content-Type: text/plain (Apps Script can't answer CORS
 *     preflights); the JSON body is parsed here regardless.
 *   - Re-deploying the script creates a NEW /exec URL unless you use
 *     "Manage deployments → edit → new version" on the existing deployment.
 */

const SHEET_NAME = 'feedback';
const COLUMNS = [
  'date', 'build', 'wave', 'time', 'score', 'seed', 'mode', 'smash',
  'announcer', 'lang', 'screen', 'hits', 'topAttacker',
  'liked', 'reasons', 'comment', 'ua',
];

function doPost(e) {
  const data  = JSON.parse(e.postData.contents);
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) sheet.appendRow(COLUMNS.concat('extra'));
  const row = COLUMNS.map(function (k) {
    const v = data[k];
    delete data[k];
    return Array.isArray(v) ? v.join(' | ') : (v === undefined || v === null ? '' : v);
  });
  row.push(JSON.stringify(data)); // anything the game adds later lands here
  sheet.appendRow(row);
  return ContentService.createTextOutput('ok');
}
