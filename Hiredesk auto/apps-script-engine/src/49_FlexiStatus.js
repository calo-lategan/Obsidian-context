/**
 * 49_FlexiStatus.gs — daily FLEXILOO approval auto-advance.
 * Only CONFIRM -> JOB COMPLETED once the end/dismantle date is past; never
 * touches CANCELLED / PENDING APPROVAL / TBC. Headless-safe. Runs from
 * dailyMaintenance. (flexiNextStatus_ is mirrored in parser-dev/pure.js for tests.)
 */

function flexiNextStatus_(current, endDate, dismantleDate, today) {
  var cur = String(current || '').toUpperCase().trim();
  if (cur !== 'CONFIRM') return current;
  function past(d) { return d instanceof Date && d.getTime() < today.getTime(); }
  if (past(dismantleDate) || past(endDate)) return 'JOB COMPLETED';
  return current;
}

function refreshFlexilooStatuses() {
  var sh = masterSS_().getSheetByName(TAB.FLEXI);
  var totals = (typeof flexiTotalsRow_ === 'function') ? flexiTotalsRow_(sh) : sh.getLastRow() + 1;
  var lastData = Math.min(sh.getLastRow(), totals - 1);
  if (lastData < 2) return 0;
  var n = lastData - 1;
  var statusRng = sh.getRange(2, FX_COL.STATUS, n, 1);
  var statuses = statusRng.getValues();
  var ends = sh.getRange(2, FX_COL.END, n, 1).getValues();
  var dis = sh.getRange(2, FX_COL.DISMANTLE, n, 1).getValues();
  var t = new Date(); var today = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  var changed = 0;
  for (var i = 0; i < n; i++) {
    var next = flexiNextStatus_(statuses[i][0], ends[i][0], dis[i][0], today);
    if (next !== statuses[i][0]) { statuses[i][0] = next; changed++; }
  }
  if (changed) statusRng.setValues(statuses);
  return changed;
}
