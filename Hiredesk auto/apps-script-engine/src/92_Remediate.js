/**
 * 92_Remediate.gs — ONE-TIME data remediation for the live-sheet damage found
 * in the audit (run once from the menu after deploying the rework):
 *   1. De-dupe FLEXILOO rows by thread (Wicked existed at R2 AND R21 — double-
 *      counted in the totals) and rewrite totals I..N as live SUMs.
 *   2. De-dupe UAE 2026 rows by thread (Wicked was quadruplicated).
 *   3. Restore a clean CS template (it holds real 60594 job data).
 *   4. Wipe job 60660's partial/stale ERP paint + dead span indexes.
 *   5. Move stray loose PDFs from the sandbox root into the projects root.
 *   6. Clear _PROCESSED / SCAN_TRIES so the sweep re-ingests cleanly.
 *   7. Flag (never delete) the stray master copy for manual removal.
 */

function remediateData_() {
  var report = {};
  try { report.flexiloo = remediateFlexiloo_(); } catch (e) { report.flexilooError = String(e); }
  try { report.uae = remediateUae_(); } catch (e) { report.uaeError = String(e); }
  try { report.template = remediateTemplate_(); } catch (e) { report.templateError = String(e); }
  try { report.erp = remediateErpJob_('60660'); } catch (e) { report.erpError = String(e); }
  try { report.strays = remediateMoveStrays_(); } catch (e) { report.straysError = String(e); }
  try { clearProcessedStore_(); report.processed = 'cleared'; } catch (e) { report.processedError = String(e); }
  try { report.copies = remediateFlagCopies_(); } catch (e) { report.copiesError = String(e); }
  notify_('Remediation done: ' + JSON.stringify(report));
  toast_('Remediation complete — see ⚙ CONTROL log. Next sweep re-ingests loose files.', 10);
  return report;
}

/** De-dupe FLEXILOO data rows by thread (base ref in col O, else normalized client text). */
function remediateFlexiloo_() {
  var sh = masterSS_().getSheetByName(TAB.FLEXI);
  var totalsRow = flexiTotalsRow_(sh);
  if (totalsRow <= 2) return { removed: 0 };
  var n = totalsRow - 2;
  var vals = sh.getRange(2, 1, n, FX_COL.REMARKS).getValues();
  var keyOf = function (row) {
    var refs = refsInText_(row[FX_COL.REMARKS - 1]);
    if (refs.length) return 'R:' + baseRef_(refs[0]);
    // fallback: client+counts fingerprint (catches the manual row with no ref)
    var client = String(row[FX_COL.CLIENT - 1]).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 24);
    return 'C:' + client + ':' + [FX_COL.WC, FX_COL.VA, FX_COL.UR].map(function (c) { return row[c - 1] || 0; }).join('/');
  };
  // Special case LS-B: the manual Wicked row (no ref) and the automation row
  // (ref RP-27/2026) share client+counts — normalize both to the ref key.
  var seen = {}, toDelete = [];
  for (var i = 0; i < vals.length; i++) {
    var k = keyOf(vals[i]);
    // fold client-fingerprint keys into a ref key when a later/earlier row has the same fingerprint AND a ref
    if (seen[k] != null) toDelete.push(i);
    else seen[k] = i;
  }
  // second pass: client-key rows whose fingerprint matches a ref-key row's fingerprint
  var fpOfRow = function (row) {
    var client = String(row[FX_COL.CLIENT - 1]).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
    return client + ':' + [FX_COL.WC, FX_COL.VA, FX_COL.UR].map(function (c) { return row[c - 1] || 0; }).join('/');
  };
  var refRows = {}, clientRows = [];
  Object.keys(seen).forEach(function (k) {
    var i = seen[k];
    if (k.charAt(0) === 'R') refRows[fpOfRow(vals[i])] = i; else clientRows.push(i);
  });
  clientRows.forEach(function (i) {
    var twin = refRows[fpOfRow(vals[i])];
    if (twin != null && twin !== i && toDelete.indexOf(i) === -1) {
      // keep the MANUAL row's approval status on the surviving (ref-tagged) row
      var manualStatus = String(vals[i][FX_COL.STATUS - 1]).trim();
      if (manualStatus) sh.getRange(twin + 2, FX_COL.STATUS).setValue(manualStatus);
      toDelete.push(i);
    }
  });
  toDelete.sort(function (a, b) { return b - a; }).forEach(function (i) { sh.deleteRow(i + 2); });
  flexiFixTotals_(sh, flexiTotalsRow_(sh));
  return { removed: toDelete.length };
}

/** De-dupe UAE 2026 data rows by thread (base ref set in col P); keep the richest QTN cell. */
function remediateUae_() {
  var sh = masterSS_().getSheetByName(TAB.Q_UAE);
  var last = sh.getLastRow();
  var vals = sh.getRange(2, 1, last - 1, FB_COL.QTNREF).getValues();
  var byThread = {};
  for (var i = 0; i < vals.length; i++) {
    var refs = refsInText_(vals[i][FB_COL.QTNREF - 1]);
    if (!refs.length) continue;
    var k = refs.map(function (r) { return baseRef_(r); }).sort()[0]; // primary thread key
    (byThread[k] = byThread[k] || []).push(i);
  }
  var toDelete = [];
  Object.keys(byThread).forEach(function (k) {
    var rows = byThread[k];
    if (rows.length < 2) return;
    // keep the row with the LONGEST QTN text (manual multi-ref rows carry extra info)
    var keep = rows[0];
    rows.forEach(function (i) { if (String(vals[i][FB_COL.QTNREF - 1]).length > String(vals[keep][FB_COL.QTNREF - 1]).length) keep = i; });
    rows.forEach(function (i) { if (i !== keep) toDelete.push(i); });
  });
  toDelete.sort(function (a, b) { return b - a; }).forEach(function (i) { sh.deleteRow(i + 2); });
  return { removed: toDelete.length };
}

/** Restore a clean CS template: keep headers/layout, wipe all job data. */
function remediateTemplate_() {
  var sh = masterSS_().getSheetByName(TAB.CS_TEMPLATE);
  if (!sh) return { cleaned: false };
  var last = sh.getLastRow();
  if (last >= CS_DATA_ROW) sh.getRange(CS_DATA_ROW, 1, last - CS_DATA_ROW + 1, CS_THREAD_COL).clearContent();
  sh.getRange('A1').setValue('12345 - TEMPLATE PROJECT (do not edit — copied for each new job)');
  return { cleaned: true };
}

/** Wipe every ERP cell whose value references a job number, plus dead span props. */
function remediateErpJob_(jobNo) {
  var ss = masterSS_();
  var erp = ss.getSheetByName(TAB.ERP);
  var rng = erp.getDataRange();
  var V = rng.getValues();
  var hits = [];
  for (var r = 3; r < V.length; r++) {          // data rows (below the 3 header rows)
    for (var c = ERP_DATE_START_COL - 1; c < V[r].length; c++) {
      if (String(V[r][c]).indexOf(jobNo) !== -1) hits.push({ r: r + 1, c: c + 1 });
    }
  }
  hits.forEach(function (h) {
    // clear a generous span around the label cell (labels sit in the first cell of a bar)
    var width = Math.min(40, V[h.r - 1].length - h.c + 1);
    var g = erp.getRange(h.r, h.c, 1, width);
    try { g.breakApart(); } catch (e) {}
    // only clear contiguous non-white cells from the label onward
    var bg = g.getBackgrounds()[0], w = 0;
    while (w < bg.length && String(bg[w]).toLowerCase() !== '#ffffff') w++;
    if (w > 0) {
      var gg = erp.getRange(h.r, h.c, 1, w);
      gg.setBackground('#ffffff'); gg.clearContent();
    } else {
      erp.getRange(h.r, h.c).clearContent();
    }
  });
  // dead span indexes (legacy ERPIDX_* + this job's RENDIDX)
  var props = PropertiesService.getScriptProperties();
  Object.keys(props.getProperties()).forEach(function (k) {
    if (/^ERPIDX_/.test(k) || k === 'RENDIDX_' + jobNo) props.deleteProperty(k);
  });
  return { cellsCleared: hits.length };
}

/** Move loose PDFs sitting in the SANDBOX root into the projects root (LS-E aftermath). */
function remediateMoveStrays_() {
  var rootId = projectsRootId_(); if (!rootId) return { moved: 0 };
  var sandbox = DriveApp.getFolderById(SANDBOX_ROOT_ID);
  var dest = DriveApp.getFolderById(rootId);
  var it = sandbox.getFiles(), moved = 0;
  while (it.hasNext()) {
    var f = it.next();
    if (/\.pdf$/i.test(f.getName())) { f.moveTo(dest); moved++; notify_('Moved stray PDF into projects root: ' + f.getName()); }
  }
  return { moved: moved };
}

/** Flag (never delete) duplicate master copies in the sandbox root. */
function remediateFlagCopies_() {
  var sandbox = DriveApp.getFolderById(SANDBOX_ROOT_ID);
  var it = sandbox.getFilesByType(MimeType.GOOGLE_SHEETS), flagged = 0;
  while (it.hasNext()) {
    var f = it.next();
    if (/^Copy of /i.test(f.getName())) { notify_('Stray duplicate found (delete manually if unwanted): "' + f.getName() + '"'); flagged++; }
  }
  return { flagged: flagged };
}
