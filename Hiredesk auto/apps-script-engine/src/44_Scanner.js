/**
 * 44_Scanner.gs — drop-anywhere quote sorter + sandbox structure builder.
 *
 * Flow:
 *   - User drops a quote/PO/invoice file in the SANDBOX projects root.
 *   - scanDriveForQuotes() finds loose root-level files, reads the FILENAME for
 *     a job number (60xxx) and/or matching name tokens, finds the matching job
 *     folder, and moves the file into  01 - CUSTOMER / {00 - QUOTES | 01 - PO_S
 *     | 03 - INVOICES}.  If nothing matches, the file is ignored (left in place).
 *   - For quote PDFs it then OCR-parses + ingests (CS + Flexiloo + UAE 2026) and
 *     runs syncClientScopes() once so STOCK STATUS -> ERP LIST update too.
 *
 * Production drive is never touched — everything is in the sandbox.
 */

// ---- Sandbox job folders to recreate (real names + one test target) ----
var SANDBOX_JOB_FOLDERS = [
  'ALPS/SS/60660 - WICKED TENTS LLC - DP WORLD INDIA CHAMPIONSHIP 2026 (FLEXILOO)', // <- test target
  'ALPS/SS/60657 - SOGECO INTERNATIONAL MIDDLE EAST DWC-LLC -SALE IETMS',
  'ALPS/SS/60656 - MECTON QATAR W.L.L - LONG TERM LINKABLES',
  'ALPS/SS/60654 - DUBAI GOLF LLC - TEMPORARY CHANGING FACILITY AT DUBAI CREEK',
  'ALPS/SS/60653 - KIWI EVENTS AND PRODUCTIONS - SOLE PROPRIETORSHIP EID AL ADHA AL QUOZ',
  'ALPS/SS/60649 - BEBEACH RESTAURANT & CAFE - BE BEACH DUBAI (VIP ABL 20FT)',
  'ALPS/SS/60644 - AMEA GULF LIMITED - DUBAI BRANCH - DIBS 2026 AT DUBAI HARBOUR (FLEXILOO)',
  'ALPS/SS/60640 - WICKED TENT - PSN EID 2026 AT MUSHRIF PALACE ABU DHABI (FLEXILOO & WUDU CABIN)',
  'ALPS/SS/60586 - AMEA GULF LIMITED - HDDC 2026 AT EMIRATES GOLF CLUB (FLEXILOO)'
];

var JOB_SUBFOLDERS = ['00 - PREQUAL', '01 - CUSTOMER', '02 - SUPPLIERS', '03 - SITE', '04 - HSEQ', '05 - MEDIA'];
var CUSTOMER_SUBFOLDERS = ['00 - QUOTES', '01 - PO_S', '02 - DELIVERY _ RETURN NOTES', '03 - INVOICES', '04 - CREDIT NOTES', '05 - RECEIVABLES', '06 - SOA'];

var P_ROOT = 'SANDBOX_PROJECTS_ROOT', P_2026 = 'SANDBOX_YEAR_2026', P_2027 = 'SANDBOX_YEAR_2027', P_SEEN = 'PROCESSED_FILES';

function getOrCreateFolder_(parent, name) {
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

/** Recreate the full (empty) projects tree in the sandbox. Idempotent. */
function buildSandboxDriveStructure() {
  var sandbox = DriveApp.getFolderById(SANDBOX_ROOT_ID);
  var proj = getOrCreateFolder_(sandbox, '00. Site Services Projects (SANDBOX)');
  var y26 = getOrCreateFolder_(proj, '2026 - JOB FOLDER');
  var y27 = getOrCreateFolder_(proj, '2027- JOB FOLDER');

  SANDBOX_JOB_FOLDERS.forEach(function (jobName) {
    var job = getOrCreateFolder_(y26, jobName);
    JOB_SUBFOLDERS.forEach(function (s) { getOrCreateFolder_(job, s); });
    var cust = getOrCreateFolder_(job, '01 - CUSTOMER');
    CUSTOMER_SUBFOLDERS.forEach(function (s) { getOrCreateFolder_(cust, s); });
  });

  var props = PropertiesService.getScriptProperties();
  props.setProperty(P_ROOT, proj.getId());
  props.setProperty(P_2026, y26.getId());
  props.setProperty(P_2027, y27.getId());

  var msg = 'Sandbox structure ready: ' + SANDBOX_JOB_FOLDERS.length + ' job folders. Drop a quote into "' + proj.getName() + '".';
  toast_(msg, 8);
  return { projectsRoot: proj.getId(), jobFolders: SANDBOX_JOB_FOLDERS.length };
}

// --- filename / folder matching ---
var MATCH_STOP = { QUOTE:1, QUOTATION:1, FINAL:1, COPY:1, REV:1, ALPS:1, THE:1, AND:1, FOR:1, LLC:1, 'L.L.C':1, ERP:1, JOB:1, NO:1 };

function nameTokens_(s) {
  return String(s).toUpperCase().replace(/\.[A-Z0-9]+$/, '').replace(/[^A-Z0-9]+/g, ' ')
    .split(' ').filter(function (t) { return t.length >= 3 && !MATCH_STOP[t]; });
}

/** Classify by filename keyword. */
/** True if the filename matches the configured on-hire document (delivery note / hire agreement). */
function matchesOnHireDoc_(name) {
  var n = String(name).toUpperCase();
  return ONHIRE_DOC.keywords.some(function (k) { return n.indexOf(k.toUpperCase()) !== -1; });
}
function classifyFile_(name) {
  if (matchesOnHireDoc_(name)) return 'HIRE';           // delivery note / hire agreement -> ON HIRE
  // INVOICE before PO: real invoices are named "INV00054-2026 11PO-14235 …"
  // (no literal "INVOICE", and they contain a PO number).
  if (/INVOICE/i.test(name) || /\bINV[\s\-_]*\d/i.test(name)) return 'INVOICE';
  if (/\b(LPO|PO|PURCHASE\s*ORDER)\b/i.test(name) || /\d+PO-\d+/i.test(name)) return 'PO';
  return 'QUOTE';
}
function destSubfolderName_(type) {
  if (type === 'HIRE') return ONHIRE_DOC.folder;
  if (type === 'PO') return '01 - PO_S';
  if (type === 'INVOICE') return '03 - INVOICES';
  return '00 - QUOTES';
}

/** ⚙ CONTROL folder-config cell (label in G1, URL/ID in H1). */
var CTRL_FOLDER_LABEL_CELL = 'G1';
var CTRL_FOLDER_CELL = 'H1';

/**
 * The projects root the pipeline scans — configurable FROM THE SHEET:
 * ⚙ CONTROL!H1 holds a folder URL or ID (change it to re-point the whole
 * pipeline, e.g. production cutover). Falls back to the Script Prop.
 */
function projectsRootId_() {
  try {
    var sh = masterSS_().getSheetByName(TAB.CONTROL);
    if (sh) {
      var raw = String(sh.getRange(CTRL_FOLDER_CELL).getValue()).trim();
      if (raw) {
        var m = raw.match(/[-\w]{25,}/);           // extract the ID from a URL or accept a bare ID
        if (m) return m[0];
        notify_('Projects-folder cell (' + CTRL_FOLDER_CELL + ') is set but no folder ID found in: ' + raw);
      }
    }
  } catch (e) {}
  return PropertiesService.getScriptProperties().getProperty(P_ROOT);
}

var _yearFoldersCache = null;
/**
 * Year job-folders resolved DYNAMICALLY from the configured projects root
 * (subfolders whose name contains "JOB FOLDER"), so changing the folder cell
 * re-points matching too. Cached per execution.
 */
function yearFolders_() {
  if (_yearFoldersCache) return _yearFoldersCache;
  var out = [];
  var rootId = projectsRootId_();
  if (rootId) {
    try {
      var it = DriveApp.getFolderById(rootId).getFolders();
      while (it.hasNext()) {
        var f = it.next();
        if (/JOB\s*FOLDER/i.test(f.getName())) out.push(f);
      }
    } catch (e) { notify_('Projects folder not accessible (' + rootId + '): ' + e); }
  }
  _yearFoldersCache = out;
  return out;
}

/** All job folders across the year folders -> [{folder, name}]. */
function allJobFolders_() {
  var out = [];
  yearFolders_().forEach(function (yf) {
    var it = yf.getFolders();
    while (it.hasNext()) { var f = it.next(); out.push({ folder: f, name: f.getName() }); }
  });
  return out;
}

/** Match a filename to a job folder. Returns {folder, jobNo, project} or null. */
function matchJobFolder_(fileName) {
  var jobs = allJobFolders_();
  // 1) explicit job number 60xxx in the filename
  var jm = fileName.match(/\b(60\d{3})\b/);
  if (jm) {
    for (var i = 0; i < jobs.length; i++) {
      if (jobs[i].name.indexOf(jm[1]) !== -1) return folderResult_(jobs[i], jm[1]);
    }
  }
  // 2) name-token overlap
  var ft = nameTokens_(fileName);
  var best = null, bestScore = 0;
  jobs.forEach(function (j) {
    var jt = nameTokens_(j.name);
    var set = {}; jt.forEach(function (t) { set[t] = 1; });
    var shared = ft.filter(function (t) { return set[t]; });
    var hasLong = shared.some(function (t) { return t.length >= 5; });
    var score = shared.length + (hasLong ? 1 : 0);
    if (score > bestScore && shared.length >= 3 && hasLong) { bestScore = score; best = j; }
  });
  if (best) {
    var jn = (best.name.match(/\b(60\d{3})\b/) || [])[1] || '';
    return folderResult_(best, jn);
  }
  return null;
}
function folderResult_(job, jobNo) {
  // project = folder name minus the "ALPS/SS/{job} - " prefix
  var project = job.name.replace(/^.*?60\d{3}\s*-?\s*/, '').trim() || job.name;
  return { folder: job.folder, jobNo: jobNo || job.name, project: project.slice(0, 60) };
}
function folderResultFromFolder_(folder, jobNo) {
  var name = folder.getName();
  var project = name.replace(/^.*?60\d{3}\s*-?\s*/, '').trim() || name;
  return { folder: folder, jobNo: jobNo || name, project: project.slice(0, 60) };
}

/**
 * Resolve a file to a project by: (1) job number 60xxx in the filename,
 * (2) the parsed quote ref (POs carry "Quote-No: RP-…" in their content),
 * (3) name-token overlap of filename + parsed customer/event. null if none.
 */
function matchProject_(fileName, parsed) {
  var jm = String(fileName).match(/\b(60\d{3})\b/);
  if (jm) { var f = findJobFolder_(jm[1]); if (f) return folderResultFromFolder_(f, jm[1]); }
  if (parsed && parsed.quoteRef) { var byRef = findProjectByQuoteRef_(parsed.quoteRef); if (byRef) return byRef; }
  var extra = parsed ? (' ' + (parsed.customerName || '') + ' ' + (parsed.eventName || '')) : '';
  return matchJobFolder_(fileName + extra);
}

var MAX_SCAN_TRIES = 5; // give up (and stop re-OCR'ing) after this many failed sweeps

/**
 * Process ONE loose file: classify -> (OCR-)parse -> match job folder -> move
 * into the right customer subfolder -> ingest (quote) or flag the project dirty
 * (PO/HIRE). SELF-HEALING: a file that can't yet be parsed/matched is NOT marked
 * seen, so it retries on the next sweep (until MAX_SCAN_TRIES). "seen" is set
 * only on a successful move. A file that stays in the root IS the unprocessed
 * signal — this is what makes the auto sweep reliable for pre-existing drops.
 */
function processOneFile_(fileId, fileName) {
  // LS-E fix: this function is only ever handed files sitting LOOSE in the
  // scanned root — if such a file is marked seen, it was re-dropped/moved back
  // after processing. "Seen" means "successfully FILED", so reprocess it.
  if (seenHas_(fileId)) {
    seenRemove_(fileId);
    notify_('Re-dropped file detected — reprocessing: ' + fileName);
  }
  var type = classifyFile_(fileName);
  var parsed = null;
  if (/\.pdf$/i.test(fileName)) {                  // parse ALL pdfs — POs link by Quote-No in content
    try { parsed = parseQuoteFile(fileId); } catch (e) { notify_('parse ' + fileName + ': ' + e); }
  }
  // A quote we couldn't OCR-parse yet: retry next sweep (don't sort it blind), then give up.
  if (type === 'QUOTE' && /\.pdf$/i.test(fileName) && !parsed) {
    if (triesBump_(fileId) >= MAX_SCAN_TRIES) { seenAdd_(fileId, 'quote parse failed'); triesClear_(fileId); return { error: 'parse failed', name: fileName }; }
    return { retry: true, name: fileName };
  }

  var match = matchProject_(fileName, parsed);
  if (!match) {
    if (triesBump_(fileId) >= MAX_SCAN_TRIES) { seenAdd_(fileId, 'no job match'); triesClear_(fileId); return { ignored: true, gaveUp: true, name: fileName }; }
    return { ignored: true, name: fileName };       // not marked seen -> retried (self-heals once its folder/quote exists)
  }

  var cust = getOrCreateFolder_(match.folder, '01 - CUSTOMER');
  var dest = getOrCreateFolder_(cust, destSubfolderName_(type));
  try { DriveApp.getFileById(fileId).moveTo(dest); }
  catch (e) { triesBump_(fileId); notify_('move ' + fileName + ': ' + e); return { error: String(e), name: fileName }; }

  var out = { moved: true, jobNo: match.jobNo, type: type, name: fileName };

  // Register the document's parsed identity ONCE (thread resolution never re-OCRs).
  try {
    var dStart = parsed && parsed.eventStart ? isoToDate_(parsed.eventStart) : null;
    var dEnd = parsed && parsed.eventEnd ? isoToDate_(parsed.eventEnd) : null;
    docsRegister_({
      fileId: fileId, jobNo: match.jobNo, tier: type,
      ref: (parsed && parsed.quoteRef) || '',
      start: dStart, end: dEnd, name: fileName, modified: new Date()
    });
  } catch (e) { notify_('docsRegister ' + fileName + ': ' + e); }

  if (type === 'QUOTE') {
    try { ingestQuoteObject(parsed, match.jobNo, match.project); out.ingested = true; }
    catch (e) { notify_('ingest ' + fileName + ': ' + e); out.error = String(e); }
  } else {
    addDirty_(match.jobNo); // PO / INVOICE / HIRE -> thread-state refresh + re-render on poll end
  }
  seenAdd_(fileId, match.jobNo + '/' + type); triesClear_(fileId);
  return out;
}

/** Sweep all loose root-level files and process each. Shared by manual + auto. */
function sweepLooseFiles_(opts) {
  opts = opts || {};
  _yearFoldersCache = null;                          // honour a changed folder cell each sweep
  var rootId = projectsRootId_();
  if (!rootId) { if (opts.toast) toast_('Set the projects folder on ⚙ CONTROL (H1) or run "Build SANDBOX Drive structure".', 8); return { error: 'no projects root configured' }; }
  var report = { moved: [], ingested: [], ignored: [], retry: [], errors: [] };
  var files = DriveApp.getFolderById(rootId).getFiles();
  while (files.hasNext()) {
    var f = files.next();
    var r = processOneFile_(f.getId(), f.getName());
    if (r.moved) report.moved.push(r.name + ' -> ' + r.jobNo + '/' + r.type);
    if (r.ingested) report.ingested.push(r.jobNo);
    if (r.ignored) report.ignored.push(r.name);
    if (r.retry) report.retry.push(r.name);
    if (r.error) report.errors.push(r.error);
  }
  recomputeDirtyProjects_(); // PO/HIRE-only files
  if (report.ingested.length && typeof refreshAssetOverview === 'function') { try { refreshAssetOverview(); } catch (e) {} }
  Logger.log(JSON.stringify(report, null, 2));
  if (opts.toast) toast_('Scan: moved ' + report.moved.length + ', ingested ' + report.ingested.length + ', ignored ' + report.ignored.length + '.', 8);
  else if (report.moved.length || report.ingested.length) notify_('Auto-scan: moved ' + report.moved.length + ', ingested ' + report.ingested.length + '.');
  return report;
}

/** Manual menu: sweep loose root files now. */
function scanDriveForQuotes() { return sweepLooseFiles_({ toast: true }); }

/** Menu: clear the processed cache and re-sweep (recovers stuck/ignored files). */
function rescanAll() { clearProcessedStore_(); return sweepLooseFiles_({ toast: true }); }
