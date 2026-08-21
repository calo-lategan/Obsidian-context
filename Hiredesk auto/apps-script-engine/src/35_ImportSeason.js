/**
 * 35_ImportSeason.gs — FULL-SEASON IMPORT (ERP LIST + STOCK STATUS).
 *
 * Why this exists: STOCK STATUS holds only ONE booking per plant (its current
 * job), so importing that tab alone loses the rest of the year. The ERP LIST
 * holds the COMPLETE calendar — every bar, every job, every date span. This
 * tool reads the old season's ERP LIST, reconstructs every booking, and:
 *   1. writes them into _BOOKINGS (so the dashboard, availability and conflict
 *      alerts all see them — imported history behaves like real bookings),
 *   2. repaints them onto the new ERP LIST **by date** (only the portion that
 *      overlaps the new season's calendar),
 *   3. derives each plant's current/next booking into STOCK STATUS.
 *
 * Imported bookings live on synthetic threads `IMPORT/<jobNo>` with tier
 * IMPORT, so a later real quote/PO for the same job supersedes them cleanly.
 */

var IMPORT_TIER = 'IMPORT';
var IMPORT_MAX_MS = 4.5 * 60 * 1000;   // leave headroom inside the 6-min cap

function importBaseRef_(jobNo) { return 'IMPORT/' + String(jobNo); }

/** ERP bar colour -> booking state. Logistics handled separately. */
var IMPORT_COLOR_STATE = {
  '#00ffff': 'BOOKED', '#ff00ff': 'QUOTE', '#ff0000': 'SERVICE',
  '#ff9900': 'SOLD TO KSA', '#cc0000': 'IN KSA'
};
var IMPORT_LOGISTICS_COLOR = '#4f81bd';

function normHex_(c) { return String(c || '').toLowerCase().trim(); }
function isWhiteHex_(c) { c = normHex_(c); return c === '' || c === '#ffffff' || c === 'white'; }

/** Locate the ERP-style header: the row (1-5) holding real Dates in the calendar area. */
function findErpLayout_(sheet) {
  var lastCol = sheet.getLastColumn();
  var head = sheet.getRange(1, 1, Math.min(6, sheet.getLastRow()), lastCol).getValues();
  for (var r = 0; r < head.length; r++) {
    var dateCount = 0, firstDateCol = -1;
    for (var c = 3; c < head[r].length; c++) {
      if (head[r][c] instanceof Date) { dateCount++; if (firstDateCol < 0) firstDateCol = c; }
      if (dateCount > 5) break;
    }
    if (dateCount > 5) {
      // plant column = the col in this row (or the one above) whose text says PLANT
      var plantCol = -1;
      for (var pc = 0; pc < Math.min(firstDateCol, head[r].length); pc++) {
        if (/PLANT/i.test(String(head[r][pc]))) { plantCol = pc; break; }
      }
      if (plantCol < 0) plantCol = 5;                     // template default: col F
      return { dateRow: r, firstDateCol: firstDateCol, plantCol: plantCol };
    }
  }
  return null;
}

/**
 * Extract every painted booking bar from an ERP LIST sheet.
 * Returns [{plant, label, jobNo, client, project, state, start, end, logIn, logOut}]
 */
function extractErpBars_(sheet) {
  var layout = findErpLayout_(sheet);
  if (!layout) throw new Error('Could not find a date header row in the old ERP LIST.');

  var lastRow = sheet.getLastRow(), lastCol = sheet.getLastColumn();
  var rng = sheet.getRange(1, 1, lastRow, lastCol);
  var disp = rng.getDisplayValues();
  var bg = rng.getBackgrounds();
  var merges = rng.getMergedRanges();
  var dates = sheet.getRange(layout.dateRow + 1, 1, 1, lastCol).getValues()[0];

  // Explode merged bars so every cell of a span carries its label + colour.
  merges.forEach(function (m) {
    var mRow = m.getRow() - 1, mCol = m.getColumn() - 1;
    var nR = m.getNumRows(), nC = m.getNumColumns();
    var v = disp[mRow][mCol], b = bg[mRow][mCol];
    for (var r = 0; r < nR; r++) for (var c = 0; c < nC; c++) {
      if (disp[mRow + r] === undefined) continue;
      disp[mRow + r][mCol + c] = v; bg[mRow + r][mCol + c] = b;
    }
  });

  var bars = [];
  for (var row = layout.dateRow + 1; row < lastRow; row++) {
    var plant = String(disp[row][layout.plantCol] || '').trim();
    if (!plant) continue;

    // Pass 1: contiguous runs of the same colour (+ same label).
    var runs = [], cur = null;
    for (var c = layout.firstDateCol; c < lastCol; c++) {
      var col = normHex_(bg[row][c]);
      var lbl = String(disp[row][c] || '').trim();
      if (isWhiteHex_(col)) { if (cur) { runs.push(cur); cur = null; } continue; }
      if (cur && cur.color === col && cur.label === lbl) { cur.end = c; continue; }
      if (cur) runs.push(cur);
      cur = { color: col, label: lbl, start: c, end: c };
    }
    if (cur) runs.push(cur);

    // Pass 2: main bars + adjacent logistics runs folded in as logIn/logOut.
    runs.forEach(function (r, i) {
      if (r.color === IMPORT_LOGISTICS_COLOR) return;               // handled as a margin
      var state = IMPORT_COLOR_STATE[r.color] || 'BOOKED';          // unknown colour -> treat as booked
      var logIn = null, logOut = null;
      var prev = runs[i - 1], next = runs[i + 1];
      if (prev && prev.color === IMPORT_LOGISTICS_COLOR && prev.end === r.start - 1) logIn = dates[prev.start];
      if (next && next.color === IMPORT_LOGISTICS_COLOR && next.start === r.end + 1) logOut = dates[next.end];

      var start = dates[r.start], end = dates[r.end];
      if (!(start instanceof Date) || !(end instanceof Date)) return;

      var label = r.label;
      var jm = label.match(/\b(60\d{3})\b/);
      var parts = label.split('|').map(function (x) { return x.trim(); });
      var jobNo = jm ? jm[1] : (parts[0] || '').replace(/[^0-9A-Za-z]/g, '');
      if (!jobNo) return;                                            // unlabelled bar — can't attribute it

      bars.push({
        plant: plant, label: label, jobNo: jobNo,
        client: parts[1] || '', project: parts.slice(2).join(' | ') || '',
        state: state, start: start, end: end,
        logIn: logIn instanceof Date ? logIn : null,
        logOut: logOut instanceof Date ? logOut : null
      });
    });
  }
  return bars;
}

/**
 * FULL SEASON IMPORT — menu entry.
 * Prompts for the old sheet, imports its ERP LIST bars (+ STOCK STATUS fields),
 * then renders everything onto the new ERP LIST by date.
 */
function importFullSeason() {
  var ui = SpreadsheetApp.getUi();
  var resp = ui.prompt('Import full season', 'Paste the URL or ID of the OLD season sheet:', ui.ButtonSet.OK_CANCEL);
  if (resp.getSelectedButton() !== ui.Button.OK) return;
  var input = resp.getResponseText().trim(); if (!input) return;
  var srcId = input;
  var m = input.match(/\/d\/([a-zA-Z0-9-_]+)/); if (m) srcId = m[1];

  var srcSS;
  try { srcSS = SpreadsheetApp.openById(srcId); }
  catch (e) { ui.alert('❌ Could not open that sheet:\n' + e.message); return; }

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) { ui.alert('Another job is running — try again in a minute.'); return; }
  try {
    var t0 = new Date().getTime();
    var report = { bars: 0, threads: 0, plants: 0, rendered: 0, skippedOutOfRange: 0, stock: 0, remaining: [] };

    // ---------- A. ERP LIST -> _BOOKINGS ----------
    var srcErp = srcSS.getSheetByName(TAB.ERP);
    if (!srcErp) {
      ui.alert('⚠️ No "ERP LIST" tab in the old file — falling back to STOCK STATUS only.');
    } else {
      SpreadsheetApp.getActiveSpreadsheet().toast('Reading old ERP calendar…', '📥 Import', -1);
      var bars = extractErpBars_(srcErp);
      report.bars = bars.length;

      // Keep only bars that overlap the CURRENT calendar (mapping is by DATE,
      // so a different season span simply drops the non-overlapping part).
      var idx = refreshSystemCache();
      var minD = idx.dateBounds.min, maxD = idx.dateBounds.max;
      var inRange = bars.filter(function (b) {
        var s = Utilities.formatDate(b.start, TIMEZONE, 'yyyy-MM-dd');
        var e = Utilities.formatDate(b.end, TIMEZONE, 'yyyy-MM-dd');
        var ok = (s <= maxD && e >= minD);
        if (!ok) report.skippedOutOfRange++;
        return ok;
      });

      // Group by job -> one synthetic IMPORT thread per job.
      var byJob = {};
      inRange.forEach(function (b) { (byJob[b.jobNo] = byJob[b.jobNo] || []).push(b); });

      Object.keys(byJob).forEach(function (jobNo) {
        var list = byJob[jobNo];
        var first = list[0];
        bookingsReplaceThread_(jobNo, importBaseRef_(jobNo), {
          tier: IMPORT_TIER, state: first.state,
          label: first.label || [jobNo, first.client, first.project].filter(Boolean).join(' | '),
          client: first.client, project: first.project
        }, list.map(function (b) {
          return { plant: b.plant, start: b.start, end: b.end, logIn: b.logIn, logOut: b.logOut };
        }));
        report.threads++;
        report.plants += list.length;
      });

      // ---------- B. render onto the new ERP LIST (time-guarded) ----------
      SpreadsheetApp.getActiveSpreadsheet().toast('Painting ' + report.threads + ' job(s) onto the calendar…', '📥 Import', -1);
      var jobs = Object.keys(byJob);
      for (var j = 0; j < jobs.length; j++) {
        if (new Date().getTime() - t0 > IMPORT_MAX_MS) { report.remaining = jobs.slice(j); break; }
        try { renderJob_(jobs[j]); report.rendered++; }
        catch (e) { notify_('import render ' + jobs[j] + ': ' + e); }
      }

      // ---------- C. derive STOCK STATUS from the imported bookings ----------
      try { report.stock = stockFromBookings_(); } catch (e) { notify_('import stock derive: ' + e); }
    }

    // ---------- D. old STOCK STATUS fields (logistics/details the ERP can't carry) ----------
    try { report.stockFields = importStockStatusFrom_(srcSS); } catch (e) { notify_('import stock fields: ' + e); }

    try { refreshAssetOverview(); } catch (e) {}

    var msg = '✅ Season import complete\n\n' +
      'ERP bars found: ' + report.bars + '\n' +
      'Jobs imported: ' + report.threads + ' (' + report.plants + ' plant bookings)\n' +
      'Painted onto calendar: ' + report.rendered + '\n' +
      'Outside this season\'s dates (skipped): ' + report.skippedOutOfRange + '\n' +
      'STOCK STATUS rows set: ' + report.stock + '\n' +
      (report.stockFields != null ? 'STOCK STATUS fields filled: ' + report.stockFields + '\n' : '') +
      (report.remaining.length ? '\n⏳ Ran out of time on ' + report.remaining.length + ' job(s). Run the import again (or "Re-render imported jobs") to finish.' : '');
    notify_('Season import: ' + JSON.stringify(report));
    ui.alert(msg);
    return report;
  } finally { lock.releaseLock(); }
}

/**
 * Populate STOCK STATUS from _BOOKINGS: for each plant, the booking covering
 * today, else the next upcoming one. Safe-mode: only fills rows whose Start and
 * End are blank (never overwrites what the desk has already typed).
 */
function stockFromBookings_() {
  var ss = masterSS_();
  var sh = ss.getSheetByName(TAB.STOCK);
  var last = sh.getLastRow(); if (last < 4) return 0;
  var n = last - 3;

  var today = new Date(); today.setHours(0, 0, 0, 0);
  var best = {};                                     // plant -> chosen booking
  bookingsAll_().forEach(function (b) {
    if (!b.plant || !(b.start instanceof Date) || !(b.end instanceof Date)) return;
    var cur = best[b.plant];
    var coversToday = (b.start <= today && b.end >= today);
    if (!cur) { best[b.plant] = b; return; }
    var curCovers = (cur.start <= today && cur.end >= today);
    if (coversToday && !curCovers) { best[b.plant] = b; return; }
    if (coversToday === curCovers && b.start < cur.start && b.end >= today) best[b.plant] = b;
  });

  var rng = sh.getRange(4, 1, n, SS_COL.LOGOUT);
  var vals = rng.getValues();
  var written = 0;
  for (var i = 0; i < n; i++) {
    var plant = String(vals[i][SS_COL.PLANT - 1] || '').trim();
    if (!plant || !best[plant]) continue;
    var hasDates = String(vals[i][SS_COL.START - 1]).trim() !== '' || String(vals[i][SS_COL.END - 1]).trim() !== '';
    if (hasDates) continue;                          // protected: desk data wins
    var b = best[plant];
    vals[i][SS_COL.STATUS - 1]  = b.state || 'BOOKED';
    vals[i][SS_COL.JOB - 1]     = b.jobNo || '';
    vals[i][SS_COL.CLIENT - 1]  = b.client || '';
    vals[i][SS_COL.PROJECT - 1] = b.project || '';
    vals[i][SS_COL.START - 1]   = b.start;
    vals[i][SS_COL.END - 1]     = b.end;
    if (b.logIn)  vals[i][SS_COL.LOGIN - 1]  = b.logIn;
    if (b.logOut) vals[i][SS_COL.LOGOUT - 1] = b.logOut;
    written++;
  }
  if (written) rng.setValues(vals);
  return written;
}

/** Re-render every imported job (finishes a time-capped import). */
function rerenderImportedJobs() {
  var jobs = {}, t0 = new Date().getTime(), done = 0, left = [];
  bookingsAll_().forEach(function (b) { if (b.tier === IMPORT_TIER || /^IMPORT\//.test(b.baseRef)) jobs[b.jobNo] = true; });
  var list = Object.keys(jobs);
  for (var i = 0; i < list.length; i++) {
    if (new Date().getTime() - t0 > IMPORT_MAX_MS) { left = list.slice(i); break; }
    try { renderJob_(list[i]); done++; } catch (e) { notify_('rerender ' + list[i] + ': ' + e); }
  }
  toast_('Re-rendered ' + done + ' imported job(s)' + (left.length ? '; ' + left.length + ' left — run again.' : '.'), 8);
  return { done: done, remaining: left.length };
}
