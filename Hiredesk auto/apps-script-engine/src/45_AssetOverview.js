/**
 * 45_AssetOverview.gs — ⚙ CONTROL setup + the 📊 ASSET OVERVIEW dashboard v2.
 *
 * Dashboard panels (user's choice):
 *   A. AVAILABILITY — flexiloo yard free-now counts, then per category:
 *      total / available today / on job today / next free date.
 *   B. ALERTS — needs-plant-assignment CS rows, double-booking conflicts,
 *      stale quotes with no PO, parse/match failures, jobs ending soon.
 *
 * Sources: ONE ERP grid read (values+backgrounds — covers engine AND manual
 * bars) + the _BOOKINGS/_DOCS/_PROCESSED stores. Correct off-calendar "today"
 * handling (no first-column fallback).
 */

var ASSET_TAB = '📊 ASSET OVERVIEW';
var ALERT_QUOTE_STALE_DAYS = 14;
var ALERT_ENDING_SOON_DAYS = 7;

/** Create ⚙ CONTROL + 📊 ASSET OVERVIEW (if missing), incl. the projects-folder cell; lock structure. */
function setupControlTabs() {
  var ss = masterSS_();
  var ctrl = ss.getSheetByName(TAB.CONTROL);
  if (!ctrl) ctrl = ss.insertSheet(TAB.CONTROL, 0);
  ctrl.getRange('A1:B1').setValues([['When', 'Automation Log']]).setFontWeight('bold');
  ctrl.getRange('D1').setValue('Active season:').setFontWeight('bold');
  if (!ctrl.getRange('E1').getValue()) ctrl.getRange('E1').setValue(SEASONS[0]);
  // Folder config cell: the pipeline scans whatever folder URL/ID is here.
  ctrl.getRange(CTRL_FOLDER_LABEL_CELL).setValue('Projects folder:').setFontWeight('bold');
  if (!ctrl.getRange(CTRL_FOLDER_CELL).getValue()) {
    var p = PropertiesService.getScriptProperties().getProperty(P_ROOT);
    if (p) ctrl.getRange(CTRL_FOLDER_CELL).setValue('https://drive.google.com/drive/folders/' + p);
  }
  ctrl.setColumnWidth(2, 420);
  if (!ss.getSheetByName(ASSET_TAB)) ss.insertSheet(ASSET_TAB, 1);
  lockTabStructure();
  try { refreshAssetOverview(); } catch (e) { notify_('setup asset refresh: ' + e); }
  toast_('Control tabs ready + structure locked.', 6);
  return 'ok';
}

function isWhite_(c) { c = String(c || '').toLowerCase(); return c === '' || c === '#ffffff' || c === 'white'; }

/** Excel-serial-free date helpers (Dubai tz). */
function dayStr_(d) { return Utilities.formatDate(d, TIMEZONE, 'dd/MM/yyyy'); }

/** Rebuild the ASSET OVERVIEW dashboard (v2). */
function refreshAssetOverview() {
  var ss = masterSS_();
  var ov = ss.getSheetByName(ASSET_TAB); if (!ov) ov = ss.insertSheet(ASSET_TAB);
  var erp = ss.getSheetByName(TAB.ERP);
  var idx = refreshSystemCache();                     // plantRowMap(0-based), dateColMap(0-based), dateBounds
  var rng = erp.getDataRange();
  var V = rng.getValues(), BG = rng.getBackgrounds(); // ONE grid read for the whole dashboard
  var today = new Date();
  var todayStr = Utilities.formatDate(today, TIMEZONE, 'yyyy-MM-dd');

  // today's 0-based column; when off-calendar use the first FUTURE column (never
  // silently pretend the first calendar day is today).
  var todayCol = -1, offCalendar = false;
  if (idx.dateColMap.has(todayStr)) todayCol = idx.dateColMap.get(todayStr);
  else {
    offCalendar = true;
    var keys = []; idx.dateColMap.forEach(function (v, k) { keys.push(k); });
    keys.sort();
    for (var k = 0; k < keys.length; k++) if (keys[k] > todayStr) { todayCol = idx.dateColMap.get(keys[k]); break; }
  }

  // --- per-plant scan: category, busy-today, next-free date (engine + manual bars) ---
  var perPlant = {};                                   // plant -> {cat, busyToday, nextFree}
  var lastCol = V[ERP_DATE_ROW - 1].length;
  idx.plantRowMap.forEach(function (rowIdx, plant) {
    var cat = String(V[rowIdx][0] || 'UNCATEGORISED').trim() || 'UNCATEGORISED';
    var busy = false, nextFree = null;
    if (todayCol >= 0) {
      busy = !isWhite_(BG[rowIdx][todayCol]);
      if (busy) {
        for (var c = todayCol + 1; c < lastCol; c++) {
          if (isWhite_(BG[rowIdx][c])) {
            var d = V[ERP_DATE_ROW - 1][c];
            if (d instanceof Date) nextFree = d;
            break;
          }
        }
      }
    }
    perPlant[plant] = { cat: cat, busyToday: busy, nextFree: nextFree };
  });

  // --- Panel A data ---
  var yard = { WC: 0, VA: 0, UR: 0, SH: 0, PUMP: 0, POD: 0 };
  Object.keys(perPlant).forEach(function (p) {
    if (perPlant[p].busyToday) return;
    FLEXI_UNIT_TYPES.forEach(function (t) { if (plantMatchesPrefix_(p, t.plantPrefix)) yard[t.key]++; });
  });

  var cats = {};                                       // cat -> {total, free, busy, nextFree}
  Object.keys(perPlant).forEach(function (p) {
    var pp = perPlant[p];
    var c = cats[pp.cat] = cats[pp.cat] || { total: 0, free: 0, busy: 0, nextFree: null };
    c.total++;
    if (pp.busyToday) {
      c.busy++;
      if (pp.nextFree && (!c.nextFree || pp.nextFree < c.nextFree)) c.nextFree = pp.nextFree;
    } else c.free++;
  });

  // --- Panel B: alerts ---
  var alerts = [];
  // 1) CS rows needing manual plant assignment
  ss.getSheets().forEach(function (s) {
    if (!/^CS\s*-/i.test(s.getName()) || s.getName() === TAB.CS_TEMPLATE) return;
    var lastR = s.getLastRow(); if (lastR < CS_DATA_ROW) return;
    var vals = s.getRange(CS_DATA_ROW, 1, lastR - CS_DATA_ROW + 1, CS_COL.PLANT).getValues();
    vals.forEach(function (r) {
      var desc = String(r[CS_COL.DESC - 1]).trim(), plant = String(r[CS_COL.PLANT - 1]).trim();
      if (desc && !plant) alerts.push(['NEEDS PLANT', s.getName() + ': "' + desc.slice(0, 60) + '"']);
    });
  });
  // 2) double-booking conflicts + 5) ending soon — from _BOOKINGS state
  var soonMs = ALERT_ENDING_SOON_DAYS * 86400000;
  var byPlant = {};
  bookingsAll_().forEach(function (b) {
    if (b.plant && b.start && b.end) (byPlant[b.plant] = byPlant[b.plant] || []).push(b);
    if (b.end && b.end >= today && (b.end - today) <= soonMs) {
      alerts.push(['ENDING SOON', b.jobNo + ' ' + (b.client || '') + ' — ' + b.plant + ' off-hire ' + dayStr_(b.end)]);
    }
  });
  Object.keys(byPlant).forEach(function (p) {
    var list = byPlant[p];
    for (var i = 0; i < list.length; i++) for (var j = i + 1; j < list.length; j++) {
      var a = list[i], b = list[j];
      if (a.baseRef === b.baseRef && a.jobNo === b.jobNo) continue;
      if (a.start <= b.end && b.start <= a.end) {
        alerts.push(['CONFLICT', p + ': ' + a.jobNo + '/' + a.baseRef + ' overlaps ' + b.jobNo + '/' + b.baseRef]);
      }
    }
  });
  // 3) stale quotes (no PO after N days) — from _DOCS thread tiers
  try {
    var staleMs = ALERT_QUOTE_STALE_DAYS * 86400000;
    var seenThreads = {};
    bookingsAll_().forEach(function (b) {
      var key = b.jobNo + '/' + b.baseRef;
      if (seenThreads[key]) return; seenThreads[key] = true;
      if (b.state !== 'QUOTE') return;
      var docs = docsForJob_(b.jobNo).filter(function (d) { return d.baseRef === b.baseRef; });
      var q = newestDoc_(docs);
      var regAt = q && q.modified instanceof Date ? q.modified : null;
      if (regAt && (today - regAt) > staleMs) {
        alerts.push(['QUOTE STALE', b.jobNo + '/' + b.baseRef + ' — quoted ' + dayStr_(regAt) + ', no PO after ' + ALERT_QUOTE_STALE_DAYS + 'd']);
      }
    });
  } catch (e) {}
  // 4) parse/match failures — from _PROCESSED notes
  try {
    var psh = processedSheet_(), plast = psh.getLastRow();
    if (plast >= 2) {
      psh.getRange(2, 1, plast - 1, 3).getValues().forEach(function (r) {
        var note = String(r[1] || '');
        if (/parse failed|no job match|ignored/i.test(note)) alerts.push(['FILE PROBLEM', note + ' — fileId ' + r[0]]);
      });
    }
  } catch (e) {}

  // --- render (single clear + block writes) ---
  ov.clear();
  var out = [], bold = [];
  function push(row, isBold) { out.push(row); if (isBold) bold.push(out.length); }
  push(['📊 ASSET OVERVIEW', '', '', '', 'updated ' + Utilities.formatDate(today, TIMEZONE, 'dd/MM/yyyy HH:mm'), ''], true);
  push(['', '', '', '', '', '']);
  push(['FLEXILOO YARD — AVAILABLE NOW' + (offCalendar ? '  (⚠ today is off the ERP calendar; showing next on-calendar day)' : ''), '', '', '', '', ''], true);
  push(['WC', 'VANITY', 'URINAL', 'SHOWER', 'PUMP', 'POD'], true);
  push([yard.WC, yard.VA, yard.UR, yard.SH, yard.PUMP, yard.POD]);
  push(['', '', '', '', '', '']);
  push(['AVAILABILITY BY CATEGORY', '', '', '', '', ''], true);
  push(['Category', 'Total', 'Available today', 'On job today', 'Next free', ''], true);
  Object.keys(cats).sort().forEach(function (c) {
    var x = cats[c];
    push([c, x.total, x.free, x.busy, x.free > 0 ? 'now' : (x.nextFree ? dayStr_(x.nextFree) : '—'), '']);
  });
  push(['', '', '', '', '', '']);
  push(['⚠ ALERTS & PROBLEMS  (' + alerts.length + ')', '', '', '', '', ''], true);
  push(['Type', 'Detail', '', '', '', ''], true);
  if (!alerts.length) push(['—', 'No issues detected', '', '', '', '']);
  alerts.slice(0, 100).forEach(function (a) { push([a[0], a[1], '', '', '', '']); });

  ov.getRange(1, 1, out.length, 6).setValues(out);
  ov.getRange(1, 1).setFontSize(14);
  bold.forEach(function (r) { try { ov.getRange(r, 1, 1, 6).setFontWeight('bold'); } catch (e) {} });
  ov.getRange(4, 1, 2, 6).setHorizontalAlignment('center');
  ov.setColumnWidth(1, 260); ov.setColumnWidth(2, 90); ov.setColumnWidth(3, 120); ov.setColumnWidth(4, 110); ov.setColumnWidth(5, 110);
  return { categories: Object.keys(cats).length, alerts: alerts.length, offCalendar: offCalendar };
}