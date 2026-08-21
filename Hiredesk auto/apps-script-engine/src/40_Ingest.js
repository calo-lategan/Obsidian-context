/**
 * 40_Ingest.gs — the NEW automation: turn a parsed quote into
 *   (a) allocated plant numbers,
 *   (b) a filled CS (client scope) tab,
 *   (c) a FLEXILOO allocation row,
 *   (d) a UAE 2026 fleetboard row.
 * The existing engine (syncClientScopes -> processBatchQueue) then propagates
 * the CS tab into STOCK STATUS and the ERP LIST calendar.
 *
 * Column layouts are the VERIFIED current master layouts.
 */

// ---- STOCK STATUS (header row 3, data row 4+) ----
var SS_COL = { CATEGORY:1, DESC:2, PLANT:3, STATUS:4, JOB:5, CLIENT:6, PROJECT:7, START:8, END:9, LOGIN:10, LOGOUT:11, DETAILS:12 };
// ---- CS template (header row 3, data row 4+) ----
var CS_COL = { ITEM:1, DESC:2, QTY:3, PLANT:4, STATUS:5, DROP:6, ONHIRE:7, OFFHIRE:8, DURATION:9, COLLECTION:10 };
var CS_HEADER_ROW = 3, CS_DATA_ROW = 4;
// ---- FLEXILOO (header row 1, data row 2+) ----
var FX_COL = { CLIENT:1, BOOKED:2, NEWREP:3, STATUS:4, INSTALL:5, START:6, END:7, DISMANTLE:8, WC:9, VA:10, UR:11, SH:12, PUMP:13, POD:14, REMARKS:15 };
// ---- UAE 2026 fleetboard (header row 1) ----
var FB_COL = { INQ:1, CLIENT:2, EVENT:3, EQUIP:4, VALUE:5, START:6, END:7, CONTACT:8, CONTACTDET:9, TRADER:10, QUOTE:11, SENDDATE:12, PO:13, STATUS:14, COMMENTS:15, QTNREF:16 };
var FB_SECTION_QUOTE_SUBMITTED = 'QUOTE SUBMITTED JOBS';

// Map flexiloo fixture keys -> CS line description + plant prefix.
var FX_REQ = [
  { key:'WC',   desc:'FLEXILOO WC',            prefix:'FLX.WC' },
  { key:'VA',   desc:'FLEXILOO VANITY',        prefix:'FLX.VA' },
  { key:'UR',   desc:'FLEXILOO URINAL',        prefix:'FLX.UR' },
  { key:'SH',   desc:'FLEXILOO SHOWER',        prefix:'FLX.SHC' },
  { key:'PUMP', desc:'FLEXILOO PUMP',          prefix:'FLX.PU' },
  { key:'POD',  desc:'FLEXILOO POD',           prefix:'FLX.POD' }
];

/** Convert Date | {iso} | 'yyyy-mm-dd' | null -> Date|null (local midnight). */
function isoToDate_(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  var iso = (typeof v === 'object' && v.iso) ? v.iso : (typeof v === 'string' ? v : null);
  if (!iso) return null;
  var m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3]);
}

/** Does a plant number belong to a requirement prefix? POD also matches FLX.EAWC. */
function plantMatchesPrefix_(plant, prefix) {
  plant = String(plant).toUpperCase(); prefix = String(prefix).toUpperCase();
  if (prefix === 'FLX.POD') return /^FLX\.(POD|EAWC)/.test(plant);
  return plant.indexOf(prefix) === 0;
}

/**
 * Row whose `col` cell refers to the same THREAD as `ref` (base-ref compare via
 * cellMatchesRef_, so RP-050/2025 R2 upserts the row stored as RP-050/2025 and
 * cells holding several refs — "ALPS/… (RP-27/2026)" — match on any). 0 = none.
 */
function findRowByRef_(sh, col, ref) {
  if (!ref) return 0;
  var last = sh.getLastRow(); if (last < 2) return 0;
  var vals = sh.getRange(2, col, last - 1, 1).getValues();
  for (var i = 0; i < vals.length; i++) if (cellMatchesRef_(vals[i][0], ref)) return i + 2;
  return 0;
}

/**
 * Allocate plant numbers for a list of requirements over a date range.
 * Availability comes from the _BOOKINGS STATE (authoritative for automation),
 * plus ONE legacy colour-grid check per call as the guard against MANUAL
 * bookings (STOCK STATUS path) that live only as painted cells.
 * reqs: [{prefix, qty, desc}]  -> [{desc, prefix, qty, plants:[], shortfall}]
 * exceptThreadKey ("job/BASEREF") lets a re-ingested revision reuse its own plants.
 */
function allocatePlants_(reqs, startDate, endDate, logIn, logOut, exceptThreadKey, preferPlants) {
  var ss = masterSS_();
  var idx = (typeof refreshSystemCache === 'function') ? refreshSystemCache() : null;
  var erpPlantMap = idx ? idx.plantRowMap : new Map();
  var erpDateMap  = idx ? idx.dateColMap : new Map();
  var erpBg = ss.getSheetByName(TAB.ERP).getDataRange().getBackgrounds(); // once per call — manual-bar guard

  var allPlants = [];
  erpPlantMap.forEach(function (rowIdx, plant) { allPlants.push(plant); });

  // Amendment stability: try the units this thread ALREADY holds first, so a
  // revised quote keeps its plant numbers and only the delta moves (a cut frees
  // the surplus; an addition tops up from free stock).
  var prefer = {};
  (preferPlants || []).forEach(function (p) { prefer[p] = true; });
  var ordered = allPlants.filter(function (p) { return prefer[p]; })
                         .concat(allPlants.filter(function (p) { return !prefer[p]; }));

  var booked = {}; // within this quote
  return reqs.map(function (req) {
    // State-side candidates (authoritative for automated bookings; the thread's
    // own rows are excluded via exceptThreadKey so it never blocks itself).
    var stateFree = {};
    bookingsAvailability_(allPlants, req.prefix, startDate, endDate, exceptThreadKey)
      .forEach(function (p) { stateFree[p] = true; });
    var want = req.qty || 0, got = [];
    for (var i = 0; i < ordered.length && got.length < want; i++) {
      var plant = ordered[i];
      if (booked[plant] || !plantMatchesPrefix_(plant, req.prefix) || !stateFree[plant]) continue;
      // Manual-bar guard: the colour grid must also be clear (legacy/manual
      // bookings exist only as paint). The thread's own bars are erased before
      // this runs, so its own units correctly read as free.
      var ok = checkMemoryAvailability(plant, startDate, endDate, logIn, logOut, erpPlantMap, erpDateMap, erpBg);
      if (ok) { got.push(plant); booked[plant] = true; }
    }
    if (got.length < want) notify_('Allocation shortfall: ' + req.desc + ' wanted ' + want + ', got ' + got.length + ' (short ' + (want - got.length) + ')');
    return { desc: req.desc, prefix: req.prefix, qty: want, plants: got, shortfall: Math.max(0, want - got.length) };
  });
}

/** Build flexiloo requirements from a parsed quote's fixture counts. */
function flexiRequirements_(q) {
  var out = [];
  FX_REQ.forEach(function (t) {
    var n = q.flexi ? (q.flexi[t.key] || 0) : 0;
    if (n > 0) out.push({ prefix: t.prefix, qty: n, desc: t.desc, key: t.key });
  });
  return out;
}

/** Thread-ref column on CS tabs (col K, past the template's J columns). */
var CS_THREAD_COL = 11;

/**
 * THREAD-SCOPED CS writer. One CS tab per JOB; each row is tagged with its
 * thread's base ref in col K. Re-ingesting a revision replaces ONLY its own
 * thread's row-block; sibling threads' rows are untouched (additive model).
 * The tab is located by ss_jobNo DeveloperMetadata (never by name), created
 * from the template on first use — with template data rows CLEARED (LS-H).
 */
function writeCS_(jobNo, project, lineItems, status, dates, clientName, quoteRef) {
  var ss = masterSS_();
  var sh = findCsSheet_(jobNo);
  if (!sh) {
    var tmpl = ss.getSheetByName(TAB.CS_TEMPLATE);
    if (!tmpl) throw new Error('CS template not found: ' + TAB.CS_TEMPLATE);
    var jobClean = String(jobNo).replace(/[^0-9A-Za-z]/g, '');
    var name = ('CS - ' + jobClean + ' - ' + project).replace(/\s+/g, ' ').trim().slice(0, 99);
    var clash = ss.getSheetByName(name);
    if (clash) name = (name + ' •').slice(0, 99);
    sh = tmpl.copyTo(ss).setName(name);
    // A copied template may carry stale job data (LS-H): wipe all data rows.
    var tLast = sh.getLastRow();
    if (tLast >= CS_DATA_ROW) sh.getRange(CS_DATA_ROW, 1, tLast - CS_DATA_ROW + 1, CS_THREAD_COL).clearContent();
    sh.getRange('A1').setValue(jobNo + ' - ' + project);
    sh.addDeveloperMetadata('ss_jobNo', String(jobNo));
    sh.addDeveloperMetadata('ss_project', String(project || ''));
    sh.addDeveloperMetadata('ss_client', String(clientName || ''));
    sh.addDeveloperMetadata('ss_quoteRef', String(quoteRef || ''));
  }

  // Remove THIS thread's previous rows (col K base-ref match), bottom-up.
  var B = baseRef_(quoteRef);
  var last = sh.getLastRow();
  if (last >= CS_DATA_ROW && B) {
    var tags = sh.getRange(CS_DATA_ROW, CS_THREAD_COL, last - CS_DATA_ROW + 1, 1).getValues();
    for (var i = tags.length - 1; i >= 0; i--) {
      if (baseRef_(tags[i][0]) === B) sh.deleteRow(CS_DATA_ROW + i);
    }
  }

  // Append the thread's rows in ONE setValues (values computed directly —
  // template formulas do not extend to appended rows).
  var startRow = Math.max(sh.getLastRow() + 1, CS_DATA_ROW);
  var days = (dates.onHire instanceof Date && dates.offHire instanceof Date)
    ? Math.round((dates.offHire - dates.onHire) / 86400000) + 1 : '';
  var out = [];
  lineItems.forEach(function (it, n) {
    if (!it.desc) return;
    var plants = (it.plants && it.plants.length) ? it.plants : [];
    out.push([startRow - CS_DATA_ROW + n + 1, it.desc, plants.length || '', plants.join(', '), status,
              dates.drop || '', dates.onHire || '', dates.offHire || '', days, dates.offHire || '', normRef_(quoteRef)]);
  });
  if (out.length) sh.getRange(startRow, 1, out.length, CS_THREAD_COL).setValues(out);
  return { name: sh.getName(), rows: out.length, startRow: startRow };
}

/** {jobNo, project, client} for a CS sheet — DeveloperMetadata first, name-parse fallback. */
function csIdentity_(sheet) {
  var o = {};
  sheet.getDeveloperMetadata().forEach(function (m) { o[m.getKey()] = m.getValue(); });
  if (o.ss_jobNo) return { jobNo: o.ss_jobNo, project: o.ss_project || '', client: o.ss_client || '', quoteRef: o.ss_quoteRef || '' };
  var p = sheet.getName().split('-');
  return { jobNo: (p[1] || '').trim(), project: p.slice(2).join('-').trim(), client: '', quoteRef: '' };
}

/** Distinct non-flexiloo equipment descriptions from a parsed quote. */
function nonFlexiEquipment_(q) {
  var seen = {}, out = [];
  (q.equipment || []).forEach(function (d) {
    if (/flexiloo/i.test(d)) return;
    var k = d.toUpperCase().trim();
    if (!k || seen[k]) return;
    seen[k] = 1; out.push(d);
  });
  return out;
}

/** NEW vs REPEAT: REPEAT if the full client name already appears in FLEXILOO or UAE 2026. */
function detectNewRepeat_(q) {
  try {
    var name = (q.customerName || '').toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!name || name.length < 4) return 'NEW';
    var ss = masterSS_();
    function hit(sheetName, col) {
      var sh = ss.getSheetByName(sheetName); if (!sh) return false;
      var n = Math.max(1, sh.getLastRow() - 1);
      var vals = sh.getRange(2, col, n, 1).getValues();
      for (var i = 0; i < vals.length; i++) {
        var v = String(vals[i][0]).toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ');
        if (v.indexOf(name) !== -1) return true;
      }
      return false;
    }
    return (hit(TAB.FLEXI, FX_COL.CLIENT) || hit(TAB.Q_UAE, FB_COL.CLIENT)) ? 'REPEAT' : 'NEW';
  } catch (e) { return 'NEW'; }
}

/**
 * Find the FLEXILOO totals row: the `=SUM(` formula in col I, OR (real sheet
 * today, LS-A) a STATIC totals row — a row with blank client (col A) whose
 * I..N cells are numeric. Returns lastRow+1 when neither exists.
 */
function flexiTotalsRow_(sh) {
  var last = sh.getLastRow();
  if (last < 2) return last + 1;
  var f = sh.getRange(2, FX_COL.WC, last - 1, 1).getFormulas();
  for (var i = 0; i < f.length; i++) if (/^=SUM\(/i.test(f[i][0])) return i + 2;
  var vals = sh.getRange(2, 1, last - 1, FX_COL.WC).getValues();
  for (var j = 0; j < vals.length; j++) {
    if (!String(vals[j][0]).trim() && typeof vals[j][FX_COL.WC - 1] === 'number') return j + 2;
  }
  return last + 1;
}

/** Rewrite ALL six totals formulas (I..N) to span every data row (2..lastData). */
function flexiFixTotals_(sh, totalsRow) {
  var lastData = totalsRow - 1;
  if (lastData < 2) return;
  var formulas = ['I', 'J', 'K', 'L', 'M', 'N'].map(function (c) { return ['=SUM(' + c + '2:' + c + lastData + ')']; });
  sh.getRange(totalsRow, FX_COL.WC, 1, 6).setFormulas([formulas.map(function (x) { return x[0]; })]);
}

/**
 * Add or update a FLEXILOO allocation row (upsert by BASE quote ref — a
 * revision replaces its thread's row, never duplicates). New rows are inserted
 * above the totals row; totals I..N are rewritten as live SUMs spanning ALL
 * data rows (fixes the static J–N totals too). The totals row is always last.
 * The whole data row is written with ONE setValues.
 */
function writeFlexilooRow_(q, newOrRepeat, dates) {
  var ss = masterSS_();
  var sh = ss.getSheetByName(TAB.FLEXI);
  var totalsRow = flexiTotalsRow_(sh);
  var r = findRowByRef_(sh, FX_COL.REMARKS, q.quoteRef);
  if (r >= totalsRow) r = 0;                        // never treat totals-or-below as a data row
  if (!r) {
    sh.insertRowBefore(totalsRow);
    r = totalsRow; totalsRow++;
    if (r > 2) sh.getRange(2, 1, 1, FX_COL.REMARKS).copyTo(sh.getRange(r, 1, 1, FX_COL.REMARKS), { formatOnly: true });
  }
  flexiFixTotals_(sh, totalsRow);                    // always: keeps I..N live and spanning 2..lastData

  var f = q.flexi || {};
  var cur = String(sh.getRange(r, FX_COL.STATUS).getValue()).trim();
  var row = [
    [q.customerName, q.eventName, q.eventLocation].filter(Boolean).join(' / '),  // A client/event
    0,                                                                            // B booked
    newOrRepeat || 'NEW',                                                         // C new/repeat
    cur || 'TBC',                                                                 // D approval (preserve manual)
    dates.install || '', dates.onHire || '', dates.offHire || '', dates.dismantle || '',
    f.WC || '', f.VA || '', f.UR || '', f.SH || '', f.PUMP || '', f.POD || '',
    normRef_(q.quoteRef || '')                                                    // O remarks = thread ref
  ];
  sh.getRange(r, 1, 1, FX_COL.REMARKS).setValues([row]);
  return { row: r };
}

/** Find the data row just after a section banner (col A == sectionName). */
function fleetSectionInsertRow_(sh, sectionName) {
  var last = sh.getLastRow();
  var aVals = sh.getRange(1, 1, last, 1).getValues();
  for (var i = 0; i < aVals.length; i++) {
    if (String(aVals[i][0]).trim().toUpperCase() === sectionName.toUpperCase()) return i + 2; // row under banner
  }
  return last + 1;
}

/**
 * Add or update a UAE 2026 fleetboard row under "QUOTE SUBMITTED JOBS".
 * Upsert by BASE ref (revisions replace, never duplicate — and a cell holding
 * several refs matches on any). Preserves manual STATUS/Comments/Send-Date;
 * writes the row with two batched setValues (A–J block + K..P block).
 */
function writeFleetboardRow_(q, dates) {
  var ss = masterSS_();
  var sh = ss.getSheetByName(TAB.Q_UAE);
  var r = findRowByRef_(sh, FB_COL.QTNREF, q.quoteRef);
  if (!r) {
    var insertAt = fleetSectionInsertRow_(sh, FB_SECTION_QUOTE_SUBMITTED);
    sh.insertRowBefore(insertAt);
    r = insertAt;
    // inherit a data row's format (checkbox validation in K/M), not the banner above
    if (sh.getLastRow() > insertAt) sh.getRange(insertAt + 1, 1, 1, FB_COL.QTNREF).copyTo(sh.getRange(r, 1, 1, FB_COL.QTNREF), { formatOnly: true });
  }
  // Preserve any manual QTN-cell text that already references this thread (multi-ref cells).
  var qtnCell = String(sh.getRange(r, FB_COL.QTNREF).getValue());
  var qtnOut = cellMatchesRef_(qtnCell, q.quoteRef) && refsInText_(qtnCell).length > 1 ? qtnCell : normRef_(q.quoteRef || '');

  sh.getRange(r, FB_COL.INQ, 1, FB_COL.TRADER).setValues([[
    q.quoteDate ? isoToDate_(q.quoteDate) : '', q.customerName || '', q.eventName || '',
    (q.equipment || []).slice(0, 6).join('; '), (q.quotationValue != null ? q.quotationValue : ''),
    dates.onHire || '', dates.offHire || '', q.contactPerson || '', q.contactDetails || '', q.quoter || ''
  ]]);
  sh.getRange(r, FB_COL.QUOTE).setValue(true);          // Quote ☑ (checkbox cell — keep native boolean)
  sh.getRange(r, FB_COL.QTNREF).setValue(qtnOut);       // QTN REF auto-filled
  return { row: r };
}

/**
 * Orchestrate a single parsed quote into the master.
 * jobNo / project come from the Drive job-folder name (or the quote).
 */
function ingestQuoteObject(q, jobNo, project) {
  project = project || (q.eventName || '').slice(0, 60);
  var dates = {
    install:   isoToDate_(q.installDate),
    onHire:    isoToDate_(q.eventStart),
    offHire:   isoToDate_(q.eventEnd),
    dismantle: isoToDate_(q.dismantleDate)
  };
  dates.drop = dates.install || dates.onHire;

  var result = { jobNo: jobNo, quoteRef: q.quoteRef, isFlexiloo: q.isFlexiloo };
  var threadKey = String(jobNo) + '/' + baseRef_(q.quoteRef || '');

  // 1. Fleetboard row (upsert by base ref — a revision replaces its row)
  try { result.fleetboard = writeFleetboardRow_(q, dates); }
  catch (e) { result.fleetboardError = String(e); }

  // 2. Build CS line items: flexiloo (auto-allocated) + non-flexiloo (manual plant).
  //    exceptThreadKey lets a REVISION reuse its own thread's plants (supersede,
  //    not conflict-with-self).
  var lineItems = [], bookingRows = [];
  if (q.isFlexiloo) {
    // AMENDMENT HANDLING — before re-allocating:
    //  (a) the units this thread already holds, so the revision keeps its plant
    //      numbers and only the delta changes;
    //  (b) erase this job's painted bars, so its own units read as FREE on the
    //      colour grid (otherwise a revision sees itself as a conflict and
    //      needlessly moves to different plants / reports a false shortage).
    //      Sibling threads and other jobs stay blocked via the state check.
    var ownPlants = [];
    try {
      var B = baseRef_(q.quoteRef || '');
      bookingsForJob_(jobNo).forEach(function (b) { if (b.baseRef === B && b.plant) ownPlants.push(b.plant); });
    } catch (e) {}
    if (jobNo && typeof clearJobPaint_ === 'function') { try { clearJobPaint_(jobNo); } catch (e) { notify_('pre-clear ' + jobNo + ': ' + e); } }

    var reqs = flexiRequirements_(q);
    var allocations = allocatePlants_(reqs, dates.onHire, dates.offHire, dates.drop, dates.dismantle, threadKey, ownPlants);
    result.allocations = allocations.map(function (a) { return { desc: a.desc, qty: a.qty, got: a.plants.length, shortfall: a.shortfall }; });
    allocations.forEach(function (a) {
      lineItems.push({ desc: a.desc, plants: a.plants });
      a.plants.forEach(function (p) {
        bookingRows.push({ plant: p, start: dates.onHire, end: dates.offHire, logIn: dates.drop, logOut: dates.dismantle });
      });
    });

    // Flexiloo allocation row (NEW/REPEAT auto-suggested; upsert by base ref)
    try { result.flexiloo = writeFlexilooRow_(q, detectNewRepeat_(q), dates); }
    catch (e) { result.flexilooError = String(e); }
  }
  // Non-flexiloo equipment -> CS rows with blank plant (manual assignment).
  nonFlexiEquipment_(q).forEach(function (d) { lineItems.push({ desc: d, plants: [] }); });

  // 3. CS tab: replace ONLY this thread's row-block (sibling threads untouched).
  if (jobNo && lineItems.length) {
    try { result.cs = writeCS_(jobNo, project, lineItems, 'QUOTE', dates, q.customerName, q.quoteRef); }
    catch (e) { result.csError = String(e); }
  } else if (!jobNo) {
    result.csSkipped = 'no job number yet';
  }

  // 4. STATE: replace this thread's bookings atomically (supersede, thread-scoped),
  //    then resolve the thread's tier from ALL its registered docs (a quote
  //    revision after a PO/invoice keeps the confirmed state — tier wins).
  if (jobNo && q.quoteRef) {
    try {
      // A real document supersedes any IMPORTED history for this job: the
      // imported thread was a best-effort reconstruction of old bars, the quote
      // is authoritative. (No-op when nothing was imported.)
      if (typeof importBaseRef_ === 'function') {
        bookingsReplaceThread_(jobNo, importBaseRef_(jobNo), { tier: IMPORT_TIER, state: 'QUOTE' }, []);
      }
      bookingsReplaceThread_(jobNo, q.quoteRef, {
        tier: 'QUOTE', state: 'QUOTE',
        label: [String(jobNo), q.customerName || '', project || ''].filter(Boolean).join(' | '),
        client: q.customerName || '', project: project || ''
      }, bookingRows);
      var st = refreshThreadState_(jobNo, q.quoteRef);
      result.threadState = st ? st.state : 'QUOTE';
    } catch (e) { result.stateError = String(e); }
  }

  // 5. Render the job's ERP bars from state (all threads, two batchUpdates).
  if (jobNo) {
    try { result.erp = renderJob_(jobNo); } catch (e) { result.erpError = String(e); }
  }

  return result;
}
