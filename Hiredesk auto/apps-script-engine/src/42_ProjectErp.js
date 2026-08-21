/**
 * 42_ProjectErp.gs — THREAD-DRIVEN ERP engine (state-first).
 *
 * A job holds one or more THREADS (base quote ref + revisions). Each thread's
 * tier comes from its documents: HIRE (delivery note) > INVOICE > PO > QUOTE.
 * Scope (plants) always comes from the thread's newest quote; dates come from
 * the newest quote until a higher-tier doc carries parseable dates (invoice
 * outranks PO; delivery-note dates are final).
 *
 * SOURCES: the _DOCS registry (parsed once at drop time — never re-OCR here)
 * and the _BOOKINGS store (single source of truth for allocations/state).
 * The ERP grid is a RENDER TARGET: renderJob_ paints it from _BOOKINGS with
 * TWO Sheets-API batchUpdate calls (clears, then paints) instead of N×5
 * SpreadsheetApp round-trips. Cell colours are never read back for logic.
 */

/** The Drive job folder whose name contains the job number, else null. */
function findJobFolder_(jobNo) {
  var jobs = (typeof allJobFolders_ === 'function') ? allJobFolders_() : [];
  for (var i = 0; i < jobs.length; i++) if (String(jobs[i].name).indexOf(String(jobNo)) !== -1) return jobs[i].folder;
  return null;
}

/** The CS sheet for a job (by DeveloperMetadata jobNo), else null. */
function findCsSheet_(jobNo) {
  var sheets = masterSS_().getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var s = sheets[i];
    if (/^CS\s*-/i.test(s.getName()) && String(csIdentity_(s).jobNo) === String(jobNo)) return s;
  }
  return null;
}

/**
 * Find a project by quote reference — BASE-ref compare (a PO carrying
 * "RP-050/2025 R1" resolves the CS stored with "RP-050/2025" and vice versa).
 * Checks CS DeveloperMetadata ss_quoteRef first, then the _BOOKINGS store.
 */
function findProjectByQuoteRef_(ref) {
  if (!ref) return null;
  var sheets = masterSS_().getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var s = sheets[i]; if (!/^CS\s*-/i.test(s.getName())) continue;
    var id = csIdentity_(s);
    if (id.quoteRef && baseRef_(id.quoteRef) === baseRef_(ref)) {
      var folder = findJobFolder_(id.jobNo);
      if (folder) return { folder: folder, jobNo: id.jobNo, project: id.project };
    }
  }
  if (typeof bookingsFindThread_ === 'function') {
    var t = bookingsFindThread_(ref);
    if (t) {
      var f2 = findJobFolder_(t.jobNo);
      if (f2) return { folder: f2, jobNo: t.jobNo, project: t.project || '' };
    }
  }
  return null;
}

// =====================================================================
// THREAD RESOLUTION (from the _DOCS registry — no OCR here)
// =====================================================================

/**
 * Group a job's registered docs into threads by baseRef.
 * Docs with no ref (typical delivery notes) land in `jobwide` and apply to all
 * confirmed threads of the job.
 * Returns { threads: {baseRef: {QUOTE:[], PO:[], INVOICE:[], HIRE:[]}}, jobwide: {…} }.
 */
function threadsForJob_(jobNo) {
  var out = { threads: {}, jobwide: { QUOTE: [], PO: [], INVOICE: [], HIRE: [] } };
  docsForJob_(jobNo).forEach(function (d) {
    var bucket;
    if (d.baseRef) {
      bucket = out.threads[d.baseRef] = out.threads[d.baseRef] || { QUOTE: [], PO: [], INVOICE: [], HIRE: [] };
    } else {
      bucket = out.jobwide;
    }
    (bucket[d.tier] = bucket[d.tier] || []).push(d);
  });
  return out;
}

/**
 * Resolve ONE thread's tier/state/dates. `jobwide` docs (ref-less delivery
 * notes / POs) count for every thread that is at least PO-confirmed.
 */
function threadState_(thread, jobwide) {
  var t = { QUOTE: thread.QUOTE || [], PO: thread.PO || [], INVOICE: thread.INVOICE || [], HIRE: thread.HIRE || [] };
  var q = newestDoc_(t.QUOTE);

  var tier = 'QUOTE';
  if (t.PO.length) tier = 'PO';
  if (t.INVOICE.length) tier = 'INVOICE';
  if (t.HIRE.length) tier = 'HIRE';
  // Job-wide docs upgrade only already-confirmed threads (delivery note default rule).
  if (tier === 'PO' || tier === 'INVOICE') {
    if (jobwide.HIRE.length) tier = 'HIRE';
    else if (tier === 'PO' && jobwide.INVOICE.length) tier = 'INVOICE';
  } else if (tier === 'QUOTE' && jobwide.PO.length) {
    tier = 'PO'; // a job-wide PO confirms a lone thread
    if (jobwide.INVOICE.length) tier = 'INVOICE';
    if (jobwide.HIRE.length) tier = 'HIRE';
  }

  // Dates: newest quote's, overridden by the highest-tier doc that has parseable dates.
  var dates = { start: q && q.start, end: q && q.end };
  [['PO', t.PO.concat(jobwide.PO)], ['INVOICE', t.INVOICE.concat(jobwide.INVOICE)], ['HIRE', t.HIRE.concat(jobwide.HIRE)]]
    .forEach(function (pair) {
      if (DOC_TIER[pair[0]] > DOC_TIER.QUOTE && DOC_TIER[pair[0]] <= DOC_TIER[tier]) {
        var d = newestDoc_(pair[1].filter(function (x) { return x.start && x.end; }));
        if (d) dates = { start: d.start, end: d.end };
      }
    });

  return { tier: tier, state: TIER_STATE[tier], dates: dates, quoteDoc: q };
}

/**
 * Refresh a thread's state in _BOOKINGS from its documents (no re-allocation;
 * scope rows already exist from quote ingest) and update the boards.
 * Returns the resolved state or null when the thread has no bookings yet.
 */
function refreshThreadState_(jobNo, ref) {
  var all = threadsForJob_(jobNo);
  var B = baseRef_(ref);
  var thread = all.threads[B];
  if (!thread) return null;
  var st = threadState_(thread, all.jobwide);
  bookingsSetThreadState_(jobNo, ref, st.tier, st.state,
    { start: st.dates.start || null, end: st.dates.end || null });
  updateBoardsForThread_(jobNo, ref, st.state);
  return st;
}

// =====================================================================
// ERP RENDERER (from _BOOKINGS, via Sheets API batchUpdate)
// =====================================================================

function erpSheetId_() {
  return masterSS_().getSheetByName(TAB.ERP).getSheetId();
}

function hexToRgb_(hex) {
  var h = String(hex || '#ffffff').replace('#', '');
  return { red: parseInt(h.substr(0, 2), 16) / 255, green: parseInt(h.substr(2, 2), 16) / 255, blue: parseInt(h.substr(4, 2), 16) / 255 };
}

/**
 * 1-based ERP column for a date. Fully outside the calendar -> -1 (caller
 * decides skip/clamp); `clampEdge` returns the boundary column instead.
 */
function colForDate_(idx, d, clampEdge) {
  if (!(d instanceof Date)) return -1;
  var s = Utilities.formatDate(d, TIMEZONE, 'yyyy-MM-dd');
  if (idx.dateColMap.has(s)) return idx.dateColMap.get(s) + 1;
  if (!clampEdge) return -1;
  if (s < idx.dateBounds.min) return idx.dateColMap.get(idx.dateBounds.min) + 1;
  return idx.dateColMap.get(idx.dateBounds.max) + 1;
}

// --- rendered-span index (per job; verified before clearing — never blind) ---
function rendIndexKey_(jobNo) { return 'RENDIDX_' + jobNo; }
function getRendIndex_(jobNo) { try { return JSON.parse(PropertiesService.getScriptProperties().getProperty(rendIndexKey_(jobNo)) || '[]'); } catch (e) { return []; } }
function setRendIndex_(jobNo, spans) {
  var p = PropertiesService.getScriptProperties(), k = rendIndexKey_(jobNo);
  if (spans && spans.length) p.setProperty(k, JSON.stringify(spans)); else p.deleteProperty(k);
}

/**
 * Erase a job's previously-rendered ERP bars (ONE batchUpdate).
 * Each span is verified first — the first cell's value must still mention this
 * job — so a cell that has since been repainted by another job is never
 * touched. Returns the number of spans cleared.
 *
 * Called before re-allocating a revision (so the job's own units read as free
 * on the colour grid) and at the start of every render.
 */
function clearJobPaint_(jobNo) {
  jobNo = String(jobNo);
  var ss = masterSS_();
  var erp = ss.getSheetByName(TAB.ERP);
  var sheetId = erp.getSheetId();
  var spans = getRendIndex_(jobNo);
  if (!spans.length) return 0;

  var reqs = [], cleared = 0;
  spans.forEach(function (sp) {
    try {
      var v = String(erp.getRange(sp.row, sp.c1).getValue());
      if (v && v.indexOf(jobNo) === -1) return;   // cell now belongs to someone else — leave it
      var gr = { sheetId: sheetId, startRowIndex: sp.row - 1, endRowIndex: sp.row, startColumnIndex: sp.c1 - 1, endColumnIndex: sp.c2 };
      reqs.push({ unmergeCells: { range: gr } });
      reqs.push({ repeatCell: { range: gr, cell: { userEnteredFormat: { backgroundColor: hexToRgb_('#ffffff') } }, fields: 'userEnteredFormat.backgroundColor' } });
      reqs.push({ updateCells: { range: gr, rows: [{ values: Array.apply(null, Array(sp.c2 - sp.c1 + 1)).map(function () { return { userEnteredValue: { stringValue: '' } }; }) }], fields: 'userEnteredValue' } });
      cleared++;
    } catch (e) {}
  });
  if (reqs.length) Sheets.Spreadsheets.batchUpdate({ requests: reqs }, ss.getId());
  if (cleared) setRendIndex_(jobNo, []);          // spans are gone; don't re-clear them later
  return cleared;
}

/**
 * Render ALL of a job's threads onto the ERP grid from _BOOKINGS.
 * Pass 1 (batchUpdate): clear this job's previous spans — each span verified
 * (first cell's value must still contain the jobNo) so a reallocated cell now
 * owned by another job is never touched (fixes cross-clobber).
 * Pass 2 (batchUpdate): unmerge+merge+colour+label every current booking span.
 * Foreign coloured cells inside a target span -> alert + skip that plant.
 */
function renderJob_(jobNo) {
  jobNo = String(jobNo);
  var ss = masterSS_();
  var erp = ss.getSheetByName(TAB.ERP);
  var sheetId = erp.getSheetId();
  var idx = refreshSystemCache();               // {plantRowMap, dateColMap, dateBounds}
  var bookings = bookingsForJob_(jobNo);
  var report = { jobNo: jobNo, cleared: 0, painted: 0, skipped: [], conflicts: [] };

  // ---- Pass 1: verified clears of previous spans ----
  report.cleared = clearJobPaint_(jobNo);

  // ---- Pass 2: paint current bookings ----
  var paintReqs = [];
  var spans = [];
  bookings.forEach(function (b) {
    if (!b.plant || !idx.plantRowMap.has(b.plant)) { if (b.plant) report.skipped.push(b.plant + ' (not on ERP)'); return; }
    if (!(b.start instanceof Date) || !(b.end instanceof Date)) { report.skipped.push(b.plant + ' (no dates)'); return; }
    var row = idx.plantRowMap.get(b.plant) + 1;
    var sCol = colForDate_(idx, b.start, false), eCol = colForDate_(idx, b.end, false);
    if (sCol < 0 && eCol < 0) {                    // entirely off-calendar -> alert, don't fake an edge bar
      report.skipped.push(b.plant + ' (dates off-calendar ' + b.baseRef + ')');
      return;
    }
    if (sCol < 0) sCol = colForDate_(idx, b.start, true);   // partial overlap: clamp to grid edge
    if (eCol < 0) eCol = colForDate_(idx, b.end, true);
    if (eCol < sCol) return;

    var liCol = b.logIn ? colForDate_(idx, b.logIn, false) : -1;
    var loCol = b.logOut ? colForDate_(idx, b.logOut, false) : -1;
    var c1 = (liCol > 0 && liCol < sCol) ? liCol : sCol;
    var c2 = (loCol > 0 && loCol > eCol) ? loCol : eCol;

    // Foreign-bar guard: one small backgrounds read for this span only.
    var bg = erp.getRange(row, c1, 1, c2 - c1 + 1).getBackgrounds()[0];
    for (var i = 0; i < bg.length; i++) {
      var col = (bg[i] || '#ffffff').toLowerCase();
      if (col !== '#ffffff' && col !== 'white') {
        report.conflicts.push(b.plant + ' occupied at col ' + (c1 + i) + ' (' + b.baseRef + ')');
        notify_('ERP conflict: ' + b.plant + ' already booked in range for ' + jobNo + '/' + b.baseRef + ' — span skipped');
        return;
      }
    }

    var color = (typeof COLORS !== 'undefined' && COLORS[b.state]) ? COLORS[b.state] : '#ffffff';
    function grOf(a, z) { return { sheetId: sheetId, startRowIndex: row - 1, endRowIndex: row, startColumnIndex: a - 1, endColumnIndex: z }; }
    // logistics lead-in
    if (c1 < sCol) paintReqs.push({ repeatCell: { range: grOf(c1, sCol - 1), cell: { userEnteredFormat: { backgroundColor: hexToRgb_(COLOR_LOGISTICS) } }, fields: 'userEnteredFormat.backgroundColor' } });
    // main bar: unmerge (defensive), colour+align, merge, label
    var main = grOf(sCol, eCol);
    paintReqs.push({ unmergeCells: { range: main } });
    paintReqs.push({ repeatCell: { range: main, cell: { userEnteredFormat: { backgroundColor: hexToRgb_(color), horizontalAlignment: 'CENTER', verticalAlignment: 'MIDDLE' } }, fields: 'userEnteredFormat(backgroundColor,horizontalAlignment,verticalAlignment)' } });
    if (eCol > sCol) paintReqs.push({ mergeCells: { range: main, mergeType: 'MERGE_ALL' } });
    paintReqs.push({ updateCells: { start: { sheetId: sheetId, rowIndex: row - 1, columnIndex: sCol - 1 }, rows: [{ values: [{ userEnteredValue: { stringValue: b.label || (jobNo + ' | ' + b.client + ' | ' + b.project) } }] }], fields: 'userEnteredValue' } });
    // logistics tail
    if (c2 > eCol) paintReqs.push({ repeatCell: { range: grOf(eCol + 1, c2), cell: { userEnteredFormat: { backgroundColor: hexToRgb_(COLOR_LOGISTICS) } }, fields: 'userEnteredFormat.backgroundColor' } });

    spans.push({ plant: b.plant, row: row, c1: c1, c2: c2 });
    report.painted++;
  });
  if (paintReqs.length) Sheets.Spreadsheets.batchUpdate({ requests: paintReqs }, ss.getId());

  setRendIndex_(jobNo, spans);
  if (report.skipped.length) notify_('renderJob ' + jobNo + ': skipped ' + report.skipped.join('; '));
  return report;
}

/** Back-compat entry (scanner + ingest call this): refresh all thread states then render. */
function recomputeProjectErp(jobNo) {
  var all = threadsForJob_(jobNo);
  Object.keys(all.threads).forEach(function (B) {
    try { refreshThreadState_(jobNo, B); } catch (e) { notify_('thread ' + jobNo + '/' + B + ': ' + e); }
  });
  return renderJob_(jobNo);
}

/** Sync FLEXILOO approval + UAE checkboxes for one thread's state. */
function updateBoardsForThread_(jobNo, ref, state) {
  var ss = masterSS_();
  var fx = ss.getSheetByName(TAB.FLEXI), fr = findRowByRef_(fx, FX_COL.REMARKS, ref);
  if (fr) {
    var cur = String(fx.getRange(fr, FX_COL.STATUS).getValue()).toUpperCase().trim();
    if (state === 'BOOKED' || state === 'ON HIRE') {
      if (cur === 'TBC' || cur === 'PENDING APPROVAL' || cur === '') fx.getRange(fr, FX_COL.STATUS).setValue('CONFIRM');
    } else if (state === 'QUOTE' && cur === '') {
      fx.getRange(fr, FX_COL.STATUS).setValue('TBC');
    }
  }
  var uae = ss.getSheetByName(TAB.Q_UAE), ur = findRowByRef_(uae, FB_COL.QTNREF, ref);
  if (ur) {
    uae.getRange(ur, FB_COL.QUOTE).setValue(true);
    uae.getRange(ur, FB_COL.PO).setValue(state === 'BOOKED' || state === 'ON HIRE');
  }
}

/** Recompute every project flagged dirty during a poll. */
function recomputeDirtyProjects_() {
  var jobs = takeDirty_();
  jobs.forEach(function (j) { try { recomputeProjectErp(j); } catch (e) { notify_('recompute ' + j + ': ' + e); } });
  return jobs.length;
}
