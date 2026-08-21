/**
 * 91_Setup.gs — one-time setup & authorization.
 *
 * SECURITY: no public web endpoint. The engine runs only from the menu,
 * the bound onEdit trigger, installable time-based triggers, or the editor.
 * The consolidated onOpen menu lives in 05_Menu.gs.
 */

/**
 * Run once from the editor (Run ▸ authorize ▸ Allow) to grant the
 * Drive / Sheets / Docs scopes the engine needs.
 */
function authorize() {
  var s = SpreadsheetApp.openById(MASTER_ID).getName();
  var d = DriveApp.getRootFolder().getName();
  return { authorized: true, master: s, driveRoot: d, time: new Date().toString() };
}
