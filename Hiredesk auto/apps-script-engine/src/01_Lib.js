/**
 * 01_Lib.gs — small shared utilities.
 */

/** Open the combined master spreadsheet. */
function masterSS_() { return SpreadsheetApp.openById(MASTER_ID); }

/** Get a sheet by name or throw a clear error. */
function sheetOrThrow_(ss, name) {
  var sh = ss.getSheetByName(name);
  if (!sh) throw new Error('Sheet not found: "' + name + '" in ' + ss.getName());
  return sh;
}

/** Delete a sheet by name if it exists (never deletes the last remaining sheet). */
function deleteSheetIfExists_(ss, name) {
  var sh = ss.getSheetByName(name);
  if (sh && ss.getSheets().length > 1) { ss.deleteSheet(sh); return true; }
  return false;
}

/** JSON HTTP response helper for the web-app harness. */
function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Log a line to the CONTROL status area (best-effort; never throws). */
function logStatus_(msg) {
  try {
    Logger.log(msg);
  } catch (e) { /* no-op */ }
}

/** Trim + upper-case a value safely. */
function up_(v) { return (v == null ? '' : String(v)).trim().toUpperCase(); }
