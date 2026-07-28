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
 * Re-deploying creates a NEW /exec URL unless you use
 * "Manage deployments -> edit -> new version" on the existing deployment.
 */

var SHEET_NAME = 'feedback';

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
  var ss = SpreadsheetApp.getActiveSpreadsheet();
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
