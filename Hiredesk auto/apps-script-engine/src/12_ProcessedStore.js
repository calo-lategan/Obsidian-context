/**
 * 12_ProcessedStore.gs — durable "processed file IDs" (hidden sheet) and the
 * per-poll "dirty projects" set (Script Properties). ScriptProperties is too
 * small for an unbounded ID set, so processed IDs live in a hidden _PROCESSED tab.
 */

var PROCESSED_TAB = '_PROCESSED';
var _seenCache = null;

function processedSheet_() {
  var ss = masterSS_();
  var sh = ss.getSheetByName(PROCESSED_TAB);
  if (!sh) {
    sh = ss.insertSheet(PROCESSED_TAB);
    sh.getRange(1, 1, 1, 3).setValues([['fileId', 'note', 'when']]);
    try { sh.hideSheet(); } catch (e) {}
  }
  return sh;
}

function loadSeen_() {
  if (_seenCache) return _seenCache;
  _seenCache = {};
  var sh = processedSheet_(), last = sh.getLastRow();
  if (last >= 2) sh.getRange(2, 1, last - 1, 1).getValues().forEach(function (r) { if (r[0]) _seenCache[r[0]] = 1; });
  return _seenCache;
}
function seenHas_(id) { return !!loadSeen_()[id]; }
function seenAdd_(id, note) {
  if (seenHas_(id)) return;
  loadSeen_()[id] = 1;
  processedSheet_().appendRow([id, note || '', new Date()]);
}

/** Remove ONE file from the processed set (re-dropped files get reprocessed). */
function seenRemove_(id) {
  var sh = processedSheet_(), last = sh.getLastRow();
  if (last >= 2) {
    var ids = sh.getRange(2, 1, last - 1, 1).getValues();
    for (var i = ids.length - 1; i >= 0; i--) if (String(ids[i][0]) === String(id)) sh.deleteRow(i + 2);
  }
  if (_seenCache) delete _seenCache[id];
}

/** Wipe the processed-file cache + retry counters (used by rescanAll). */
function clearProcessedStore_() {
  _seenCache = null;
  var sh = processedSheet_(), last = sh.getLastRow();
  if (last >= 2) sh.getRange(2, 1, last - 1, sh.getLastColumn()).clearContent();
  PropertiesService.getScriptProperties().deleteProperty('SCAN_TRIES');
}

// --- per-file retry counter: lets transient failures self-heal, capped to avoid
//     re-OCR'ing a genuinely-unmatchable file forever. ---
function triesGet_(id) { return (JSON.parse(PropertiesService.getScriptProperties().getProperty('SCAN_TRIES') || '{}')[id]) || 0; }
function triesBump_(id) {
  var p = PropertiesService.getScriptProperties(), m = JSON.parse(p.getProperty('SCAN_TRIES') || '{}');
  m[id] = (m[id] || 0) + 1; p.setProperty('SCAN_TRIES', JSON.stringify(m)); return m[id];
}
function triesClear_(id) {
  var p = PropertiesService.getScriptProperties(), m = JSON.parse(p.getProperty('SCAN_TRIES') || '{}');
  if (m[id] != null) { delete m[id]; p.setProperty('SCAN_TRIES', JSON.stringify(m)); }
}

// =====================================================================
// _DOCS registry — every processed document's parsed identity, so thread
// resolution NEVER re-OCRs. One row per fileId (upsert).
// Cols: fileId | jobNo | tier(QUOTE|PO|INVOICE|HIRE) | refFull | baseRef |
//       revision | start | end | name | modified | registeredAt
// =====================================================================
var DOCS_TAB = '_DOCS';
var DK = { ID:1, JOB:2, TIER:3, REF:4, BASE:5, REV:6, START:7, END:8, NAME:9, MOD:10, AT:11 };

function docsSheet_() {
  var ss = masterSS_();
  var sh = ss.getSheetByName(DOCS_TAB);
  if (!sh) {
    sh = ss.insertSheet(DOCS_TAB);
    sh.getRange(1, 1, 1, 11).setValues([['fileId','jobNo','tier','refFull','baseRef','revision','start','end','name','modified','registeredAt']]);
    try { sh.hideSheet(); } catch (e) {}
  }
  return sh;
}

/** Upsert one document's parsed identity. */
function docsRegister_(doc) {
  var sh = docsSheet_(), last = sh.getLastRow();
  var row = 0;
  if (last >= 2) {
    var ids = sh.getRange(2, 1, last - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(doc.fileId)) { row = i + 2; break; }
  }
  var rec = [[doc.fileId, String(doc.jobNo || ''), doc.tier || 'QUOTE', normRef_(doc.ref || ''), baseRef_(doc.ref || ''),
              revisionOf_(doc.ref || ''), doc.start || '', doc.end || '', doc.name || '', doc.modified || '', new Date()]];
  if (row) sh.getRange(row, 1, 1, 11).setValues(rec);
  else sh.getRange(last + 1, 1, 1, 11).setValues(rec);
}

/** All registered docs for a job, as objects. */
function docsForJob_(jobNo) {
  var sh = docsSheet_(), last = sh.getLastRow();
  if (last < 2) return [];
  var J = String(jobNo), out = [];
  sh.getRange(2, 1, last - 1, 11).getValues().forEach(function (r) {
    if (String(r[DK.JOB-1]) !== J) return;
    out.push({ fileId: String(r[DK.ID-1]), jobNo: J, tier: String(r[DK.TIER-1]), ref: String(r[DK.REF-1]),
               baseRef: String(r[DK.BASE-1]), revision: +r[DK.REV-1] || 0,
               start: r[DK.START-1] instanceof Date ? r[DK.START-1] : null,
               end: r[DK.END-1] instanceof Date ? r[DK.END-1] : null,
               name: String(r[DK.NAME-1]), modified: r[DK.MOD-1] });
  });
  return out;
}

// --- per-poll dirty-projects set (PO/HIRE files that need an ERP recompute) ---
function addDirty_(jobNo) {
  var p = PropertiesService.getScriptProperties();
  var s = JSON.parse(p.getProperty('DIRTY_PROJECTS') || '[]');
  if (s.indexOf(String(jobNo)) === -1) { s.push(String(jobNo)); p.setProperty('DIRTY_PROJECTS', JSON.stringify(s)); }
}
function takeDirty_() {
  var p = PropertiesService.getScriptProperties();
  var s = JSON.parse(p.getProperty('DIRTY_PROJECTS') || '[]');
  p.deleteProperty('DIRTY_PROJECTS');
  return s;
}
