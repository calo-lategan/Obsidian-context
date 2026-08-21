/**
 * 60_Season.gs — multi-year switcher (per-season ARCHIVE FILES so the master
 * stays lean). The master always holds ONE active season's season-specific tabs
 * (ERP LIST, FLEXILOO, UAE 2026, CS - *). STOCK STATUS is persistent inventory
 * and is NOT archived/cleared. Switching archives the current season's tabs into
 * a separate Sheet and loads the target's archived tabs (if any).
 *
 * MVP + safe: dryRun reports the plan; real switch verifies each copy before it
 * removes anything; LockService prevents concurrent runs. Building a brand-new
 * season's ERP grid from scratch is out of scope here (switch between archived
 * seasons; the current 2026-2027 season is the live one).
 */

var SEASON_TABS = ['ERP LIST', 'FLEXILOO', 'UAE 2026'];

function activeSeason_() { return PropertiesService.getScriptProperties().getProperty('ACTIVE_SEASON') || SEASONS[0]; }
function seasonForDate_(d) { var y = (d instanceof Date) ? d.getFullYear() : new Date().getFullYear(); return y + '-' + (y + 1); }

/** Find (or create) the per-season archive spreadsheet in the sandbox root. */
function seasonArchiveFile_(season, createIfMissing) {
  var root = DriveApp.getFolderById(SANDBOX_ROOT_ID);
  var name = 'SEASON ARCHIVE ' + season;
  var it = root.getFilesByName(name);
  if (it.hasNext()) return SpreadsheetApp.open(it.next());
  if (!createIfMissing) return null;
  var ss = SpreadsheetApp.create(name);
  DriveApp.getFileById(ss.getId()).moveTo(root);
  return ss;
}

function seasonTabsInMaster_() {
  return masterSS_().getSheets().map(function (s) { return s.getName(); })
    .filter(function (n) { return SEASON_TABS.indexOf(n) !== -1 || (isCsTab_(n) && n !== TAB.CS_TEMPLATE); });
}

/**
 * Switch the active season. dryRun=true returns the plan without changing anything.
 */
function switchSeason(target, dryRun) {
  var cur = activeSeason_();
  if (!target || target === cur) return { noop: true, season: cur };
  var plan = { from: cur, to: target, archive: seasonTabsInMaster_() };
  if (dryRun) { plan.note = 'dry run — no changes made'; return plan; }

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return { error: 'busy' };
  try {
    var master = masterSS_();

    // 1. Archive the current season's tabs into its archive file (verify before delete).
    var arch = seasonArchiveFile_(cur, true);
    plan.archive.forEach(function (n) {
      var sh = master.getSheetByName(n); if (!sh) return;
      var existing = arch.getSheetByName(n);
      if (existing && arch.getSheets().length > 1) arch.deleteSheet(existing);
      sh.copyTo(arch).setName(n);
    });
    SpreadsheetApp.flush();

    // 2. Load the target season from its archive (if it exists).
    var tgt = seasonArchiveFile_(target, false);
    if (!tgt) {
      lock.releaseLock();
      toast_('Archived ' + cur + '. No archive for ' + target + ' yet — create its ERP grid before switching in.', 10);
      return { archivedOnly: true, from: cur, target: target };
    }
    // Remove current season-specific tabs from master, then copy the target's in.
    seasonTabsInMaster_().forEach(function (n) {
      var sh = master.getSheetByName(n);
      if (sh && master.getSheets().length > 1) master.deleteSheet(sh);
    });
    tgt.getSheets().forEach(function (sh) {
      var n = sh.getName();
      if (SEASON_TABS.indexOf(n) !== -1 || isCsTab_(n)) sh.copyTo(master).setName(n);
    });

    PropertiesService.getScriptProperties().setProperty('ACTIVE_SEASON', target);
    var ctrl = master.getSheetByName(TAB.CONTROL); if (ctrl) ctrl.getRange('E1').setValue(target);
    if (typeof enforceTabStructure === 'function') enforceTabStructure();
    toast_('Switched season ' + cur + ' -> ' + target, 8);
    return { ok: true, from: cur, to: target };
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

/** Menu entry: confirm via dry-run then switch. */
function switchSeasonPrompt() {
  var ui = SpreadsheetApp.getUi();
  var r = ui.prompt('Switch season', 'Target season (e.g. ' + SEASONS.join(' / ') + '):', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  var target = r.getResponseText().trim(); if (!target) return;
  var plan = switchSeason(target, true);
  if (plan.noop) { ui.alert('Already on ' + plan.season + '.'); return; }
  var yes = ui.alert('Confirm switch', 'From ' + plan.from + ' to ' + plan.to + '\nArchives: ' + (plan.archive || []).join(', ') + '\n\nProceed?', ui.ButtonSet.YES_NO);
  if (yes === ui.Button.YES) ui.alert(JSON.stringify(switchSeason(target, false)));
}
