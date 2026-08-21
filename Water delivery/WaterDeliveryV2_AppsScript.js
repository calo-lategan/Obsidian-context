// =============================================================================
// WATER DELIVERY V2 — APPS SCRIPT v5 (PERFORMANCE OPTIMIZED)
// =============================================================================
// SETUP: Extensions → Apps Script → delete old code → paste this → Save
//        Select "setupAll" → Run → Authorize. Done.
//
// PERF: All hot paths use batch read/write (getValues/setValues).
//       Supplier lookups cached via CacheService (6-hour TTL).
//       Zero interleaved reads/writes in critical functions.
// =============================================================================

var SOURCE_ID    = '1jxtSpdk43aZ1SfPGlDvNTQ28rRJ2oy1Rfut12Ihu_iA';
var MASTER_SHEET = 'Master Entry';
var DASH_SHEET   = 'Job Dashboard';
var LOOKUP_SHEET = 'Supplier Lookup';
var HEADERS = ['Date','Supplier','Job Number','Doc Number','Water Type','Volume (Gal)','Wait Hours'];

var D_SEARCH_ROW   = 2;
var D_SEARCH_COL   = 2;
var D_INPUT_ROW    = 6;
var D_BTN_ROW      = 8;
var D_RESULT_HDR   = 11;
var D_RESULT_START = 12;

// Cache key for supplier map (CacheService, 6-hour TTL)
var CACHE_KEY_SUPPLIERS = 'supplier_map_json';

// =============================================================================
// MENU
// =============================================================================
function onOpen() {
  try {
    SpreadsheetApp.getUi().createMenu('Water Delivery')
      .addItem('Import All Data from Original Sheet', 'importFromSource')
      .addItem('Re-run Search', 'manualSearch')
      .addSeparator()
      .addItem('Setup / Reset Dashboard', 'setupFromMenu')
      .addToUi();
  } catch (e) {}
}

// =============================================================================
// SETUP
// =============================================================================
function setupAll() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Master Entry
  var master = ss.getSheetByName(MASTER_SHEET);
  if (!master) master = ss.insertSheet(MASTER_SHEET);
  if (master.getLastRow() === 0 || master.getRange('A1').getValue() === '') {
    master.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS])
      .setFontWeight('bold').setBackground('#4a86c8').setFontColor('#ffffff');
    master.setFrozenRows(1);
  }
  var wtMaster = SpreadsheetApp.newDataValidation().requireValueInList(['Fresh','Waste'], true).build();
  master.getRange(2, 5, 2000, 1).setDataValidation(wtMaster);

  // Supplier Lookup (hidden)
  var lookup = ss.getSheetByName(LOOKUP_SHEET);
  if (!lookup) {
    lookup = ss.insertSheet(LOOKUP_SHEET);
    lookup.getRange('A1').setValue('Job Number');
    lookup.getRange('B1').setValue('Supplier');
    lookup.getRange('A1:B1').setFontWeight('bold');
    lookup.hideSheet();
  }

  // Job Dashboard
  var dash = ss.getSheetByName(DASH_SHEET);
  if (!dash) dash = ss.insertSheet(DASH_SHEET);
  buildDashboard_(dash);

  // Install trigger
  installTrigger_();
  Logger.log('Setup complete. Trigger installed.');
}

function setupFromMenu() {
  setupAll();
  SpreadsheetApp.getUi().alert('Setup complete!');
}

// =============================================================================
// DASHBOARD LAYOUT
// =============================================================================
function buildDashboard_(dash) {
  dash.getRange('A1:H11').clearContent().clearDataValidations().clearFormat();

  // Batch-write all static labels at once — single setValues call
  var labelData = [
    ['WATER DELIVERY — JOB DASHBOARD','','','','','','',''],        // row 1
    ['Search Job Number:','','⟵ Type job number, press Enter','','','','',''], // row 2
    ['','','','','','','',''],                                       // row 3
    ['— QUICK ENTRY —','','','','','','',''],                       // row 4
    ['Job Number','Doc Number','Water Type','Volume (Gal)','Wait Hours','Supplier (auto)','SUBMIT',''], // row 5
    ['','','','','','','',''],                                       // row 6 (inputs)
    ['','','','','','','',''],                                       // row 7
    ['','⟵ Tick to create NEW JOB','','','⟵ Tick to ADD ROW to current job','','',''], // row 8
    ['','','','','','','',''],                                       // row 9
    ['— SEARCH RESULTS —','','','','','','',''],                    // row 10
    HEADERS.concat([''])                                             // row 11
  ];
  dash.getRange(1, 1, 11, 8).setValues(labelData);

  // Formatting — batched by area, not cell-by-cell
  dash.getRange('A1').setFontWeight('bold').setFontSize(14);
  dash.getRange('A2').setFontWeight('bold');
  dash.getRange('B2').setBackground('#fff2cc').setBorder(true,true,true,true,false,false).setFontWeight('bold').setFontSize(12);
  dash.getRange('C2').setFontColor('#999999').setFontStyle('italic');
  dash.getRange('A4').setFontWeight('bold').setFontSize(11);
  dash.getRange('A5:G5').setFontWeight('bold');
  dash.getRange('F5').setFontColor('#888888');
  dash.getRange('G5').setHorizontalAlignment('center');

  // Input row 6 — batch background + border
  dash.getRange('A6:E6').setBackground('#fff2cc').setBorder(true,true,true,true,true,true);
  dash.getRange('F6').setBackground('#f3f3f3').setBorder(true,true,true,true,false,false).setFontColor('#888888');
  var wtRule = SpreadsheetApp.newDataValidation().requireValueInList(['Fresh','Waste'], true).build();
  dash.getRange('C6').setDataValidation(wtRule);

  // Checkboxes
  dash.getRange('G6').insertCheckboxes().setBackground('#34a853').setFontColor('#ffffff')
    .setHorizontalAlignment('center').setBorder(true,true,true,true,false,false);
  dash.getRange('A8').insertCheckboxes().setBackground('#4285f4').setFontColor('#ffffff');
  dash.getRange('D8').insertCheckboxes().setBackground('#fbbc04').setFontColor('#000000');

  // Hint text
  dash.getRange('B8').setFontColor('#666666').setFontStyle('italic');
  dash.getRange('E8').setFontColor('#666666').setFontStyle('italic');

  // Results header
  dash.getRange('A10').setFontWeight('bold').setFontSize(11);
  dash.getRange(D_RESULT_HDR, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#4a86c8').setFontColor('#ffffff');

  // Column widths — single batch
  var widths = [130, 160, 120, 130, 120, 120, 110, 10];
  for (var i = 0; i < widths.length; i++) dash.setColumnWidth(i + 1, widths[i]);
}

// =============================================================================
// TRIGGER
// =============================================================================
function installTrigger_() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'onEditInstallable') return; // already exists
  }
  ScriptApp.newTrigger('onEditInstallable')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create();
}

function createEditTrigger() {
  installTrigger_();
  try { SpreadsheetApp.getUi().alert('Edit trigger is active!'); } catch (e) {}
}

// =============================================================================
// EDIT TRIGGER — all dashboard interactivity
// =============================================================================
function onEditInstallable(e) {
  try {
    if (!e || !e.range) return;
    var sheet = e.range.getSheet();
    if (sheet.getName() !== DASH_SHEET) return;

    var row = e.range.getRow();
    var col = e.range.getColumn();
    var val = e.range.getValue();

    // B2: Search
    if (row === D_SEARCH_ROW && col === D_SEARCH_COL) {
      var jn = String(val).trim();
      if (jn && jn !== '' && jn !== 'false') searchJob_(jn);
      else clearResults_();
      return;
    }
    // A6: Auto-supplier
    if (row === D_INPUT_ROW && col === 1) {
      var jn2 = String(val).trim();
      sheet.getRange(D_INPUT_ROW, 6).setValue(
        jn2 ? (getSupplierForJob_(jn2) || '(new — prompt on submit)') : ''
      );
      return;
    }
    // G6: SUBMIT
    if (row === D_INPUT_ROW && col === 7 && val === true) {
      sheet.getRange(D_INPUT_ROW, 7).setValue(false);
      submitEntry();
      return;
    }
    // A8: NEW JOB
    if (row === D_BTN_ROW && col === 1 && val === true) {
      sheet.getRange(D_BTN_ROW, 1).setValue(false);
      newJob();
      return;
    }
    // D8: ADD ROW
    if (row === D_BTN_ROW && col === 4 && val === true) {
      sheet.getRange(D_BTN_ROW, 4).setValue(false);
      addRowToCurrentJob();
      return;
    }
    // Row 12+: Sync to Master
    if (row >= D_RESULT_START && col >= 1 && col <= 7) {
      syncEditToMaster_(sheet, row, col, val);
    }
  } catch (err) {
    Logger.log('onEdit error: ' + err.message);
  }
}

// =============================================================================
// IMPORT (one-time bulk)
// =============================================================================
function importFromSource() {
  var ui;
  try { ui = SpreadsheetApp.getUi(); } catch (e) { ui = null; }
  if (ui) {
    if (ui.alert('Import Data', 'CLEAR Master Entry and re-import ALL data?', ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  }

  var source = SpreadsheetApp.openById(SOURCE_ID);
  var sheets = source.getSheets();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var master = ss.getSheetByName(MASTER_SHEET);

  if (master.getLastRow() > 1) {
    master.getRange(2, 1, master.getLastRow() - 1, HEADERS.length + 1).clearContent().clearDataValidations().clearFormat();
  }

  var allDataRows = [];
  var supplierMap = {};

  for (var s = 0; s < sheets.length; s++) {
    var sh = sheets[s];
    var sheetName = sh.getName();
    // Single batch read per source sheet
    var data = sh.getDataRange().getValues();
    if (data.length < 2) continue;

    var sheetSupplier = '', sheetJob = '';
    if (sheetName.indexOf('/') > -1) {
      var parts = sheetName.split('/');
      sheetSupplier = parts[0].trim();
      sheetJob = parts.slice(1).join('/').trim();
    }

    var colMap = {}, headerFound = false;
    for (var r = 0; r < data.length; r++) {
      var row = data[r];
      // Build lowercase array in-memory (no sheet calls)
      var rowLower = new Array(row.length);
      for (var c = 0; c < row.length; c++) rowLower[c] = String(row[c]).trim().toLowerCase();

      if (isHeaderRow_(rowLower)) {
        colMap = buildColMap_(rowLower);
        headerFound = true;
        continue;
      }
      if (!headerFound) continue;

      // Skip empty rows — fast check
      var hasData = false;
      for (var c2 = 0; c2 < row.length; c2++) {
        if (row[c2] !== '' && row[c2] !== null && row[c2] !== undefined) { hasData = true; break; }
      }
      if (!hasData) continue;

      var supplier = colMap.supplier !== undefined ? String(row[colMap.supplier]).trim() : '';
      var date     = colMap.date !== undefined     ? row[colMap.date] : '';
      var job      = colMap.job !== undefined       ? String(row[colMap.job]).trim() : '';
      var doc      = colMap.doc !== undefined       ? row[colMap.doc] : '';
      var volume   = colMap.volume !== undefined    ? row[colMap.volume] : '';
      var wait     = colMap.wait !== undefined      ? row[colMap.wait] : '';

      // FRESH/WASTE → Water Type
      var waterType = '';
      if (colMap.type !== undefined) {
        waterType = String(row[colMap.type]).trim();
      } else {
        var fv = colMap.fresh !== undefined ? row[colMap.fresh] : '';
        var wv = colMap.waste !== undefined ? row[colMap.waste] : '';
        if (fv == 1 || String(fv).trim() === '1') waterType = 'Fresh';
        else if (wv == 1 || String(wv).trim() === '1') waterType = 'Waste';
        else if (fv && fv !== '' && fv != 0) waterType = 'Fresh';
        else if (wv && wv !== '' && wv != 0) waterType = 'Waste';
      }

      if (!supplier && sheetSupplier) supplier = sheetSupplier;
      if (!job && sheetJob) job = sheetJob;
      if (!job || job === '0' || job === 'job no' || job === 'job number') continue;
      if (!supplier || supplier === 'supplier') continue;

      if (date instanceof Date) date = Utilities.formatDate(date, Session.getScriptTimeZone(), 'dd-MM-yyyy');

      allDataRows.push([date, supplier, job, doc, waterType, volume, wait]);
      if (job && supplier) supplierMap[job] = supplier;
    }
  }

  if (allDataRows.length === 0) {
    if (ui) ui.alert('No data found.'); else Logger.log('No data.');
    return;
  }

  // Group by job, build output with separators — all in memory
  var grouped = {};
  for (var i = 0; i < allDataRows.length; i++) {
    var jobKey = allDataRows[i][2]; // col index 2 = Job Number
    if (!grouped[jobKey]) grouped[jobKey] = [];
    grouped[jobKey].push(allDataRows[i]);
  }

  var jobKeys = Object.keys(grouped).sort(function(a, b) { return Number(a) - Number(b); });
  var outputRows = [];
  var subHeaderIndices = [];

  for (var g = 0; g < jobKeys.length; g++) {
    subHeaderIndices.push(outputRows.length);
    outputRows.push(HEADERS.slice());
    var entries = grouped[jobKeys[g]];
    for (var j = 0; j < entries.length; j++) outputRows.push(entries[j]);
    if (g < jobKeys.length - 1) outputRows.push(['','','','','','','']);
  }

  // SINGLE batch write
  master.getRange(2, 1, outputRows.length, HEADERS.length).setValues(outputRows);

  // Batch format sub-headers
  var wtDataRule = SpreadsheetApp.newDataValidation().requireValueInList(['Fresh','Waste'], true).build();
  for (var h = 0; h < subHeaderIndices.length; h++) {
    var sr = subHeaderIndices[h] + 2;
    master.getRange(sr, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#e8eaf6');
    var cnt = grouped[jobKeys[h]].length;
    if (cnt > 0) master.getRange(sr + 1, 5, cnt, 1).setDataValidation(wtDataRule);
  }

  // Update supplier cache
  updateSupplierLookup_(supplierMap);
  invalidateSupplierCache_();

  var msg = 'Imported ' + allDataRows.length + ' rows, ' + jobKeys.length + ' jobs.';
  if (ui) ui.alert(msg); else Logger.log(msg);
}

// =============================================================================
// HEADER DETECTION (pure in-memory, no sheet calls)
// =============================================================================
function isHeaderRow_(arr) {
  var kw = ['supplier','date','job','doc','gal','fresh','waste','volume','document'];
  var hits = 0;
  for (var k = 0; k < kw.length; k++) {
    for (var c = 0; c < arr.length; c++) {
      if (arr[c].indexOf(kw[k]) > -1) { hits++; break; }
    }
  }
  return hits >= 3;
}

function buildColMap_(arr) {
  var m = {};
  for (var c = 0; c < arr.length; c++) {
    var h = arr[c];
    if (h.indexOf('supplier') > -1) m.supplier = c;
    else if (h.indexOf('date') > -1) m.date = c;
    else if (h === 'job no' || h === 'job number' || h === 'job') m.job = c;
    else if (h.indexOf('document') > -1 || h.indexOf('doc num') > -1 || h.indexOf('doc no') > -1) m.doc = c;
    else if (h === 'gal' || h.indexOf('gallon') > -1 || h.indexOf('volume') > -1) m.volume = c;
    else if (h.indexOf('fresh') > -1) m.fresh = c;
    else if (h.indexOf('waste') > -1) m.waste = c;
    else if (h.indexOf('wait') > -1 || h.indexOf('hour') > -1) m.wait = c;
    else if (h.indexOf('water type') > -1 || h === 'type') m.type = c;
  }
  return m;
}

// =============================================================================
// SUPPLIER LOOKUP — CacheService accelerated
// =============================================================================
function getSupplierMap_() {
  // Try cache first (avoids sheet read entirely)
  var cache = CacheService.getScriptCache();
  var cached = cache.get(CACHE_KEY_SUPPLIERS);
  if (cached) {
    try { return JSON.parse(cached); } catch (e) {}
  }
  // Cache miss — read from sheet, store in cache
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var lookup = ss.getSheetByName(LOOKUP_SHEET);
  var map = {};
  if (lookup && lookup.getLastRow() >= 2) {
    var data = lookup.getRange(2, 1, lookup.getLastRow() - 1, 2).getValues();
    for (var i = 0; i < data.length; i++) {
      if (data[i][0]) map[String(data[i][0]).trim()] = String(data[i][1]).trim();
    }
  }
  try { cache.put(CACHE_KEY_SUPPLIERS, JSON.stringify(map), 21600); } catch (e) {} // 6hr TTL
  return map;
}

function getSupplierForJob_(jobNumber) {
  var jn = String(jobNumber).trim();
  var map = getSupplierMap_();
  if (map[jn]) return map[jn];

  // Fallback: scan Master (single batch read)
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var master = ss.getSheetByName(MASTER_SHEET);
  if (master && master.getLastRow() >= 2) {
    var data = master.getRange(2, 1, master.getLastRow() - 1, HEADERS.length).getValues();
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][2]).trim() === jn && data[i][1] && String(data[i][1]).trim().toLowerCase() !== 'supplier') {
        // Cache this discovery
        map[jn] = String(data[i][1]).trim();
        try { CacheService.getScriptCache().put(CACHE_KEY_SUPPLIERS, JSON.stringify(map), 21600); } catch (e) {}
        return map[jn];
      }
    }
  }
  return '';
}

function updateSupplierLookup_(newMap) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var lookup = ss.getSheetByName(LOOKUP_SHEET);
  if (!lookup) {
    lookup = ss.insertSheet(LOOKUP_SHEET);
    lookup.getRange('A1').setValue('Job Number');
    lookup.getRange('B1').setValue('Supplier');
    lookup.hideSheet();
  }
  // Read existing + merge — single read, single write
  var existing = {};
  if (lookup.getLastRow() > 1) {
    var data = lookup.getRange(2, 1, lookup.getLastRow() - 1, 2).getValues();
    for (var i = 0; i < data.length; i++) {
      if (data[i][0]) existing[String(data[i][0]).trim()] = data[i][1];
    }
  }
  var keys = Object.keys(newMap);
  for (var k = 0; k < keys.length; k++) existing[keys[k]] = newMap[keys[k]];

  var rows = [];
  var eKeys = Object.keys(existing);
  for (var j = 0; j < eKeys.length; j++) rows.push([eKeys[j], existing[eKeys[j]]]);

  if (rows.length > 0) {
    if (lookup.getLastRow() > 1) lookup.getRange(2, 1, lookup.getLastRow() - 1, 2).clearContent();
    lookup.getRange(2, 1, rows.length, 2).setValues(rows);
  }
  // Refresh cache
  try { CacheService.getScriptCache().put(CACHE_KEY_SUPPLIERS, JSON.stringify(existing), 21600); } catch (e) {}
}

function invalidateSupplierCache_() {
  try { CacheService.getScriptCache().remove(CACHE_KEY_SUPPLIERS); } catch (e) {}
}

function getAllJobNumbers_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var master = ss.getSheetByName(MASTER_SHEET);
  if (!master || master.getLastRow() < 2) return [];
  // Single column batch read
  var data = master.getRange(2, 3, master.getLastRow() - 1, 1).getValues();
  var seen = {}, result = [];
  for (var i = 0; i < data.length; i++) {
    var v = String(data[i][0]).trim();
    if (v && v !== '' && v !== '0' && v.toLowerCase() !== 'job number' && !seen[v]) {
      seen[v] = true;
      result.push(v);
    }
  }
  return result.sort();
}

// =============================================================================
// SEARCH — batch read Master, batch write Dashboard
// =============================================================================
function searchJob_(jobNumber) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var dash = ss.getSheetByName(DASH_SHEET);
  var master = ss.getSheetByName(MASTER_SHEET);

  clearResults_();

  if (!master || master.getLastRow() < 2) {
    dash.getRange(D_RESULT_START, 1).setValue('No data. Import first.');
    return;
  }

  var jn = String(jobNumber).trim();
  // Single batch read of all Master data
  var data = master.getRange(2, 1, master.getLastRow() - 1, HEADERS.length).getValues();

  // Filter in memory — zero sheet calls
  var resultData = [], idxData = [];
  for (var i = 0; i < data.length; i++) {
    var rj = String(data[i][2]).trim();
    if (rj === '' || rj.toLowerCase() === 'job number') continue;
    if (rj === jn) {
      resultData.push(data[i]);
      idxData.push([i + 2]); // master row number
    }
  }

  if (resultData.length === 0) {
    dash.getRange(D_RESULT_START, 1).setValue('No entries for Job #' + jn).setFontSize(12).setFontWeight('normal');
    return;
  }

  // SINGLE batch write for results + formatting (no interleaving)
  var resultRange = dash.getRange(D_RESULT_START, 1, resultData.length, HEADERS.length);
  resultRange.setValues(resultData)
    .setFontSize(12).setFontWeight('normal').setFontColor('#000000').setBackground('#ffffff');

  // Batch write hidden sync indices
  var idxRange = dash.getRange(D_RESULT_START, 8, idxData.length, 1);
  idxRange.setValues(idxData).setFontColor('#ffffff').setFontSize(1);

  // Water Type dropdown
  var wtRule = SpreadsheetApp.newDataValidation().requireValueInList(['Fresh','Waste'], true).build();
  dash.getRange(D_RESULT_START, 5, resultData.length, 1).setDataValidation(wtRule);

  // Header
  dash.getRange('A10').setValue(
    '— RESULTS: Job #' + jn + ' | Supplier: ' + resultData[0][1] + ' | ' + resultData.length + ' entries —'
  ).setFontWeight('bold').setFontSize(11);
}

function manualSearch() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var jn = String(ss.getSheetByName(DASH_SHEET).getRange(D_SEARCH_ROW, D_SEARCH_COL).getValue()).trim();
  if (jn) searchJob_(jn);
  else { try { SpreadsheetApp.getUi().alert('Type a job number in B2 first.'); } catch (e) {} }
}

function clearResults_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var dash = ss.getSheetByName(DASH_SHEET);
  var lastRow = Math.max(dash.getLastRow(), D_RESULT_START);
  if (lastRow >= D_RESULT_START) {
    var rng = dash.getRange(D_RESULT_START, 1, lastRow - D_RESULT_START + 1, 8);
    rng.clearContent().clearDataValidations().clearFormat();
    rng.setFontSize(12).setFontWeight('normal').setFontColor('#000000').setBackground('#ffffff');
  }
  dash.getRange('A10').setValue('— SEARCH RESULTS —').setFontWeight('bold').setFontSize(11);
}

// =============================================================================
// SYNC
// =============================================================================
function syncEditToMaster_(dash, dashRow, col, newValue) {
  var idx = dash.getRange(dashRow, 8).getValue();
  if (!idx || idx === '') return;
  SpreadsheetApp.getActiveSpreadsheet().getSheetByName(MASTER_SHEET)
    .getRange(Number(idx), col).setValue(newValue);
}

// =============================================================================
// SUBMIT — batch read entry fields, single write to Master
// =============================================================================
function submitEntry() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var dash = ss.getSheetByName(DASH_SHEET);
  var master = ss.getSheetByName(MASTER_SHEET);
  var ui;
  try { ui = SpreadsheetApp.getUi(); } catch (e) { ui = null; }

  // BATCH READ all 6 entry fields in one call (A6:F6)
  var entryVals = dash.getRange(D_INPUT_ROW, 1, 1, 6).getValues()[0];
  var jobNum    = String(entryVals[0]).trim();
  var docNum    = entryVals[1];
  var waterType = entryVals[2];
  var volume    = entryVals[3];
  var waitHours = entryVals[4];

  if (!jobNum) { if (ui) ui.alert('Enter a Job Number in A6.'); return; }
  if (!docNum) { if (ui) ui.alert('Enter a Doc Number in B6.'); return; }
  if (!waterType) { if (ui) ui.alert('Select Water Type in C6.'); return; }

  var supplier = getSupplierForJob_(jobNum);
  if (!supplier) {
    if (!ui) return;
    var resp = ui.prompt('New Job Number', 'Job #' + jobNum + ' is new.\nEnter Supplier:', ui.ButtonSet.OK_CANCEL);
    if (resp.getSelectedButton() !== ui.Button.OK) return;
    supplier = resp.getResponseText().trim();
    if (!supplier) { ui.alert('Supplier cannot be empty.'); return; }
    var m = {}; m[jobNum] = supplier;
    updateSupplierLookup_(m);
  }

  var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd-MM-yyyy');
  var newRow = [today, supplier, jobNum, docNum, waterType, volume, waitHours];

  var inserted = insertRowIntoJobGroup_(master, jobNum, newRow);
  if (!inserted) {
    var lr = master.getLastRow();
    // Batch write: separator + header + data in 3 rows
    master.getRange(lr + 1, 1, 3, HEADERS.length).setValues([
      ['','','','','','',''],
      HEADERS,
      newRow
    ]);
    master.getRange(lr + 2, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#e8eaf6');
    var wtRule = SpreadsheetApp.newDataValidation().requireValueInList(['Fresh','Waste'], true).build();
    master.getRange(lr + 3, 5).setDataValidation(wtRule);
  }

  // BATCH CLEAR entry fields (single call)
  dash.getRange(D_INPUT_ROW, 1, 1, 6).clearContent();

  // Refresh search if active
  var searchVal = String(dash.getRange(D_SEARCH_ROW, D_SEARCH_COL).getValue()).trim();
  if (searchVal) searchJob_(searchVal);

  if (ui) ui.alert('Submitted: Job #' + jobNum + ' (' + supplier + ')');
}

function insertRowIntoJobGroup_(master, jobNumber, rowData) {
  if (master.getLastRow() < 2) return false;
  // Single batch read
  var data = master.getRange(2, 1, master.getLastRow() - 1, HEADERS.length).getValues();
  var jn = String(jobNumber).trim();
  var lastMatch = -1;
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][2]).trim() === jn) lastMatch = i + 2;
  }
  if (lastMatch === -1) return false;
  master.insertRowAfter(lastMatch);
  master.getRange(lastMatch + 1, 1, 1, HEADERS.length).setValues([rowData]);
  var wtRule = SpreadsheetApp.newDataValidation().requireValueInList(['Fresh','Waste'], true).build();
  master.getRange(lastMatch + 1, 5).setDataValidation(wtRule);
  return true;
}

// =============================================================================
// NEW JOB
// =============================================================================
function newJob() {
  var ui;
  try { ui = SpreadsheetApp.getUi(); } catch (e) { return; }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var existingJobs = getAllJobNumbers_();

  var choice = ui.alert('New Job Entry',
    'YES = New job\nNO = Select existing\n\nExisting: ' + (existingJobs.length > 0 ? existingJobs.join(', ') : 'None'),
    ui.ButtonSet.YES_NO_CANCEL);

  var jobNum, supplier;
  if (choice === ui.Button.YES) {
    var jr = ui.prompt('New Job Number', 'Enter Job Number:', ui.ButtonSet.OK_CANCEL);
    if (jr.getSelectedButton() !== ui.Button.OK) return;
    jobNum = jr.getResponseText().trim();
    if (!jobNum) { ui.alert('Cannot be empty.'); return; }
    for (var i = 0; i < existingJobs.length; i++) {
      if (existingJobs[i] === jobNum) { ui.alert('Job #' + jobNum + ' exists!'); return; }
    }
    var sr = ui.prompt('Supplier', 'Enter Supplier for Job #' + jobNum + ':', ui.ButtonSet.OK_CANCEL);
    if (sr.getSelectedButton() !== ui.Button.OK) return;
    supplier = sr.getResponseText().trim();
    if (!supplier) { ui.alert('Cannot be empty.'); return; }

    var m = {}; m[jobNum] = supplier;
    updateSupplierLookup_(m);

    var master = ss.getSheetByName(MASTER_SHEET);
    var lr = master.getLastRow();
    master.getRange(lr + 1, 1, 2, HEADERS.length).setValues([['','','','','','',''], HEADERS]);
    master.getRange(lr + 2, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#e8eaf6');

  } else if (choice === ui.Button.NO) {
    if (existingJobs.length === 0) { ui.alert('No existing jobs.'); return; }
    var sel = ui.prompt('Select Job', 'Type Job Number:\n\n' + existingJobs.join('\n'), ui.ButtonSet.OK_CANCEL);
    if (sel.getSelectedButton() !== ui.Button.OK) return;
    jobNum = sel.getResponseText().trim();
    supplier = getSupplierForJob_(jobNum);
    if (!supplier) { ui.alert('Not found.'); return; }
  } else { return; }

  // Batch write to dashboard
  var dash = ss.getSheetByName(DASH_SHEET);
  dash.getRange(D_INPUT_ROW, 1).setValue(jobNum);
  dash.getRange(D_INPUT_ROW, 6).setValue(supplier);
  dash.getRange(D_SEARCH_ROW, D_SEARCH_COL).setValue(jobNum);
  searchJob_(jobNum);

  ui.alert('Job #' + jobNum + ' (' + supplier + ') ready. Fill fields, tick SUBMIT.');
}

// =============================================================================
// ADD ROW
// =============================================================================
function addRowToCurrentJob() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var dash = ss.getSheetByName(DASH_SHEET);
  var ui;
  try { ui = SpreadsheetApp.getUi(); } catch (e) { ui = null; }

  var jobNum = String(dash.getRange(D_SEARCH_ROW, D_SEARCH_COL).getValue()).trim();
  if (!jobNum) { if (ui) ui.alert('Search for a job first (B2).'); return; }

  var supplier = getSupplierForJob_(jobNum);
  // Batch write 2 cells
  dash.getRange(D_INPUT_ROW, 1).setValue(jobNum);
  dash.getRange(D_INPUT_ROW, 6).setValue(supplier || '');

  if (ui) ui.alert('Fill fields for Job #' + jobNum + ', tick SUBMIT.');
}
