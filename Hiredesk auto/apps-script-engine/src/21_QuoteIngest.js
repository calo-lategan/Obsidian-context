/**
 * 21_QuoteIngest.gs — turn a quote/PO PDF in Drive into structured data.
 *
 * Folder convention (verified in production):
 *   {YEAR} - JOB FOLDER / ALPS/SS/{job} - {name} / 01 - CUSTOMER /
 *       00 - QUOTES   <- quote PDFs
 *       01 - PO_S     <- purchase orders
 *
 * NOTE: parseQuote() was tuned against `pdftotext -layout` output. The OCR'd
 * Google Doc text produced here may reflow differently; after the first live
 * run we re-tune parseQuote against real OCR text. The fixture-count and
 * label-anchored logic is layout-tolerant by design.
 */

var CUSTOMER_FOLDER  = '01 - CUSTOMER';
var SUBFOLDER_QUOTES = '00 - QUOTES';
var SUBFOLDER_POS    = '01 - PO_S';

/**
 * Convert a PDF (or image) file to plain text via Drive v3 OCR conversion.
 * CACHED per fileId (6 h, chunked) so per-minute sweep retries of the same
 * unmatched file never re-convert — each conversion costs Drive quota
 * (4,000/day Workspace) and several seconds.
 */
function pdfToText_(fileId) {
  var cache = CacheService.getScriptCache();
  var key = 'OCR_' + fileId;
  var nChunks = cache.get(key + '_n');
  if (nChunks) {
    var parts = [], miss = false;
    for (var c = 0; c < +nChunks; c++) { var p = cache.get(key + '_' + c); if (p == null) { miss = true; break; } parts.push(p); }
    if (!miss) return parts.join('');
  }

  var blob = DriveApp.getFileById(fileId).getBlob();
  var resource = { name: 'TMP_OCR_' + fileId, mimeType: 'application/vnd.google-apps.document' };
  var doc = null;
  for (var attempt = 0; attempt < 2 && !doc; attempt++) {
    try { doc = Drive.Files.create(resource, blob, { ocrLanguage: 'en', supportsAllDrives: true }); } // Drive v3
    catch (e) { if (attempt === 1) throw e; Utilities.sleep(1500); }         // one retry on transient errors
  }
  var text;
  try {
    text = DocumentApp.openById(doc.id).getBody().getText();
  } finally {
    try { DriveApp.getFileById(doc.id).setTrashed(true); } catch (e) {}      // never leave temp docs behind
  }
  try {                                                                       // chunked put (100KB/value cap)
    var size = 90000, n = Math.ceil(text.length / size) || 1, obj = {};
    obj[key + '_n'] = String(n);
    for (var i = 0; i < n; i++) obj[key + '_' + i] = text.substr(i * size, size);
    cache.putAll(obj, 21600);
  } catch (e) {}
  return text;
}

/** Debug: return + log the raw OCR text of a file (used to re-tune the parser). */
function dumpOcrText_(fileId) {
  var t = pdfToText_(fileId);
  Logger.log(t);
  return t;
}

/** Read + parse a single quote PDF by file id. */
function parseQuoteFile(fileId) {
  var file = DriveApp.getFileById(fileId);
  var q = parseQuote(pdfToText_(fileId), file.getName());
  q.fileId = fileId;
  q.fileUrl = file.getUrl();
  q.fileModified = file.getLastUpdated();
  return q;
}

/**
 * Test entry: set TEST_QUOTE_FILE_ID to any quote PDF in the sandbox (or a
 * read-only production quote) and run from the editor to see the parsed object.
 */
var TEST_QUOTE_FILE_ID = '';
function testParseQuoteFile() {
  if (!TEST_QUOTE_FILE_ID) return 'Set TEST_QUOTE_FILE_ID at the top of 21_QuoteIngest.gs first.';
  var q = parseQuoteFile(TEST_QUOTE_FILE_ID);
  Logger.log(JSON.stringify(q, null, 2));
  return q;
}
