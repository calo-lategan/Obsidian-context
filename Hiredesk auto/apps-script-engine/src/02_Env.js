/**
 * 02_Env.gs — headless-safe UI / notification helpers.
 *
 * The automation path (time triggers, Drive-changes poll) has NO UI context.
 * Calling SpreadsheetApp.getUi()/Browser.msgBox()/ui.alert() there throws.
 * Use these helpers everywhere in code that can run unattended.
 */

/** True when there is no UI context (running from a trigger / API). */
function isHeadless_() {
  try { SpreadsheetApp.getUi(); return false; } catch (e) { return true; }
}

/** Non-throwing toast (no-op when nobody is viewing / headless). */
function toast_(msg, secs) {
  try { masterSS_().toast(String(msg), 'Site Services', secs || 5); } catch (e) {}
}

/** Append a line to the ⚙ CONTROL automation log (newest at row 2). Never throws.
 *  Also mirrors to Cloud Logging (console.log) — Logger.log is editor-only and
 *  invisible for trigger runs. */
function notify_(msg) {
  try { console.log(String(msg)); } catch (e) { Logger.log(msg); }
  try {
    var sh = masterSS_().getSheetByName(TAB.CONTROL);
    if (!sh) return;                 // CONTROL tab created by setupControlTabs; no-op until then
    sh.insertRowAfter(1);
    sh.getRange(2, 1, 1, 2).setValues([[new Date(), String(msg)]]);
  } catch (e) {}
}

/** Confirm dialog that auto-proceeds (returns true) when headless. */
function confirmOrProceed_(title, body) {
  if (isHeadless_()) return true;
  var ui = SpreadsheetApp.getUi();
  return ui.alert(title, body, ui.ButtonSet.YES_NO) === ui.Button.YES;
}
