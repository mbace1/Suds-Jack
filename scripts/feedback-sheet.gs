/**
 * TOKO MIDORI GAMES — the feedback sink. A Google Apps Script web app.
 *
 * One Sheet behind the WHOLE floor: the counter at the top of the arcade, the
 * games' own forms, anything added later. Unlimited, unlike the Formspree free
 * tier (~50 notes a month), and it lands somewhere you can sort by game rather
 * than in an inbox.
 *
 * SETUP (~3 minutes, once):
 *   1. Create a Google Sheet (any name).
 *   2. Extensions -> Apps Script, delete the stub, paste this whole file, save.
 *   3. Deploy -> New deployment -> type "Web app":
 *        Execute as:      Me
 *        Who has access:  Anyone
 *      (required — notes post anonymously from players' browsers)
 *   4. Copy the deployment's /exec URL into SHEET_ENDPOINT in hub/feedback.js.
 *      That is the whole switch: the arcade, the counter and every surface
 *      posting through that module follow it, and Formspree stops being used.
 *      (toko-drop ships its own copy of the transport and has its own
 *      SHEET_ENDPOINT to paste the same URL into.)
 *
 * WRITTEN IN ES5 ON PURPOSE. An Apps Script project created before the V8
 * switch — or any project whose runtime got set back to Rhino — rejects
 * `const` outright with "SyntaxError: Unexpected token 'const'", which is a
 * baffling first thing to meet when you are three minutes into a setup you
 * were promised was easy. `var` and a hand-rolled copy loop run on both
 * runtimes, so this file does not care which one you have.
 *
 * ONE HONEST CAVEAT, and it is in the code as well as the docs: Apps Script
 * cannot answer a CORS preflight, so the browser posts no-cors and CANNOT
 * READ THIS FUNCTION'S ANSWER. The site therefore reports such a note as
 * "sent-blind" and never as delivered. If you want confirmed delivery, keep
 * Formspree. If you want volume, use this. You cannot have both.
 *
 * UPDATING IT LATER — read this before you touch Deploy:
 *   Deploy -> MANAGE deployments -> pencil -> Version: New version.
 *   NOT "New deployment". That one mints a brand new /exec URL and quietly
 *   orphans the old one, so the site keeps posting into a dead endpoint and
 *   nothing anywhere says so. If you do it by accident: nothing is broken,
 *   the new URL just has to be pasted into SHEET_ENDPOINT again.
 *
 * IF NOTHING ARRIVES, in the order that finds it fastest:
 *   1. Open the /exec URL in a browser tab.
 *      "ok — sheet reachable, N row(s)"  -> the script side is fine, the
 *                                           problem is on the site.
 *      "BROKEN: ..."                     -> the script runs, the sheet does
 *                                           not open. Check SHEET_ID.
 *      a Google sign-in page             -> access is "Anyone with Google
 *                                           account". Manage deployments ->
 *                                           pencil -> Who has access: Anyone.
 *      "Script function not found: doGet"-> the deployment is serving code
 *                                           from before your last paste.
 *                                           Manage deployments -> New version.
 *   2. Apps Script sidebar -> Executions. Shows whether doPost ran at all and
 *      what it threw. This is the only place a failure is visible: the site
 *      posts no-cors and CANNOT be told anything went wrong.
 *
 * THAT LAST LINE IS WHY THIS FILE IS SHAPED THE WAY IT IS. Nothing here can
 * report a failure to the thing that called it. So: ES5, because the runtime
 * might be Rhino and `const` would be a syntax error nobody sees; the sheet
 * BY ID, because getActiveSpreadsheet() returns null in a standalone project
 * and throws where no one is looking; and a doGet, so the whole path can be
 * proved with one browser tab instead of a note left on a live site.
 */

// The spreadsheet, BY ID. getActiveSpreadsheet() only works when the script
// is container-bound — created from inside the sheet via Extensions -> Apps
// Script. A standalone project gets null back and every POST throws, which
// from the outside looks exactly like "nothing happens": the site cannot read
// the reply anyway, so the note vanishes with no error anywhere a player or
// an author would see it. Naming the id works either way.
var SHEET_ID = '1OIZ1EdEPRHhKgAJ0p08_PjUWwkeXP2XrIX14a9sZps8';
var SHEET_NAME = 'feedback';

function book() {
  return SHEET_ID ? SpreadsheetApp.openById(SHEET_ID)
                  : SpreadsheetApp.getActiveSpreadsheet();
}

// Visiting the /exec URL in a browser is the fastest way to prove the
// deployment is alive and can reach the sheet. Without this, a GET answers
// "Script function not found: doGet", which tells you the deployment exists
// but nothing about whether it works.
function doGet() {
  try {
    var sh = book().getSheetByName(SHEET_NAME);
    var n = sh ? sh.getLastRow() : 0;
    return ContentService.createTextOutput(
      'ok — sheet reachable, ' + n + ' row(s) including the header');
  } catch (err) {
    return ContentService.createTextOutput('BROKEN: ' + err);
  }
}

// The default header, written only when the sheet is EMPTY. Ordered
// most-useful-first, because this is a thing a person reads on a Monday:
// which game, what they said, where they were when they said it.
var COLUMNS = [
  'date', 'game', 'kind', 'note', 'topic', 'source',
  'liked', 'reasons', 'comment',
  'build', 'wave', 'time', 'score', 'seed', 'mode',
  'lang', 'layout', 'screen', 'ua',
];

function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var ss = book();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);

  // Map onto whatever header the sheet ALREADY has, rather than assuming this
  // file's. A sheet that has been collecting since the toko-drop-only days
  // has the old header in row 1, and appending this file's column order to it
  // would silently shift every value one column sideways from the day the
  // script was updated. Existing sheets keep their shape; new fields land in
  // "extra" until you add a column for them by hand.
  if (sheet.getLastRow() === 0) sheet.appendRow(COLUMNS.concat('extra'));
  var header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  // a shallow copy, the long way round: Rhino has no Object.assign
  var rest = {}, k;
  for (k in data) if (Object.prototype.hasOwnProperty.call(data, k)) rest[k] = data[k];

  var row = header.map(function (col) {
    if (col === 'extra') return '';               // filled in below
    var v = rest[col];
    delete rest[col];
    if (Object.prototype.toString.call(v) === '[object Array]') return v.join(' | ');
    return (v === undefined || v === null) ? '' : v;
  });

  // a readable stamp in whatever column the sheet calls its first one
  if (header[0] === 'date' && !row[0]) row[0] = new Date();

  var extraAt = header.indexOf('extra');
  var leftovers = Object.keys(rest).length ? JSON.stringify(rest) : '';
  if (extraAt >= 0) row[extraAt] = leftovers;
  else if (leftovers) row.push(leftovers);

  sheet.appendRow(row);
  return ContentService.createTextOutput('ok');
}
