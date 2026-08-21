/**
 * 50_Triggers.gs — unattended auto-runs.
 *   - autoScanTick: 1-minute trigger; sweeps loose files in the sandbox projects
 *     root and processes each via processOneFile_. A file sitting in the root IS
 *     the "unprocessed" signal, so this reliably catches files dropped at ANY
 *     time (including before the trigger existed) — unlike a Drive-Changes delta.
 *   - dailyMaintenance: 05:00 Dubai; status refresh + flexiloo rules + dashboard.
 * LockService prevents overlapping ticks on the heavy ERP sheet.
 */

function autoScanTick() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(0)) return;               // a previous tick is still running — skip
  try { sweepLooseFiles_({}); }
  catch (e) {
    try { console.error('autoScanTick failed', { error: String(e), stack: e && e.stack }); } catch (x) {}
    notify_('autoScanTick: ' + e);
  }
  finally { lock.releaseLock(); }
}

function installTriggers() {
  removeTriggers_();
  ScriptApp.newTrigger('autoScanTick').timeBased().everyMinutes(1).create();
  ScriptApp.newTrigger('dailyMaintenance').timeBased().atHour(5).everyDays(1).inTimezone('Asia/Dubai').create();
  toast_('Auto-runs installed: 1-min folder sweep + daily 05:00 maintenance.', 8);
  return 'installed';
}

function removeTriggers_() {
  var n = 0;
  ScriptApp.getProjectTriggers().forEach(function (t) {
    var h = t.getHandlerFunction();
    if (h === 'autoScanTick' || h === 'dailyMaintenance') { ScriptApp.deleteTrigger(t); n++; }
  });
  return n;
}
function removeTriggers() { var n = removeTriggers_(); toast_('Removed ' + n + ' auto-run trigger(s).', 6); return n; }

function dailyMaintenance() {
  var lock = LockService.getScriptLock();               // never race the 1-min sweep on the ERP grid
  if (!lock.tryLock(30000)) { notify_('dailyMaintenance skipped: could not acquire lock'); return; }
  try {
    try { updateDailyStatus(); } catch (e) { console.error('daily updateDailyStatus', String(e)); notify_('daily updateDailyStatus: ' + e); }
    if (typeof refreshFlexilooStatuses === 'function') { try { refreshFlexilooStatuses(); } catch (e) { console.error('daily flexi', String(e)); notify_('daily flexi: ' + e); } }
    if (typeof refreshAssetOverview === 'function') { try { refreshAssetOverview(); } catch (e) { console.error('daily asset', String(e)); notify_('daily asset: ' + e); } }
  } finally { lock.releaseLock(); }
}
