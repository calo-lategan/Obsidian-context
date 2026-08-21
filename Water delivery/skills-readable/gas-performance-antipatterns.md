---
name: gas-performance-antipatterns
description: |
  Expert-level Google Apps Script performance optimization and anti-pattern prevention.
  Covers: batch operations (getValues/setValues), read-write cache architecture, eliminating
  interleaved reads/writes, CacheService acceleration, Sheets API vs SpreadsheetApp benchmarks,
  trigger chaining for 6-minute limit bypass, LockService race condition prevention,
  exponential backoff retry patterns, memory management for large datasets, getRangeList
  optimization, flush() timing, custom function 30s limit workarounds, fetchAll parallel
  HTTP, and the complete anti-patterns catalog with fixes. MUST trigger when: slow script,
  optimization, performance, timeout, exceeded maximum execution time, 6 minute limit,
  getValue in loop, anti-pattern, best practices, batch operations, interleaved reads writes,
  cache strategy, trigger chaining, continuation token, race condition, concurrent execution.
---

# Google Apps Script Performance & Anti-Patterns — Expert Reference

This skill distills findings from Google's official best practices, Tanaikech's benchmarks,
and production experience into actionable optimization patterns. Every technique includes
the WHY (what happens internally), the DO (correct pattern), and the DON'T (anti-pattern).

---

## 1. The Golden Rule: Minimize Service Calls

### WHY It Matters
Every call to a Google service (SpreadsheetApp, DriveApp, GmailApp, etc.) is an **RPC to
Google's servers**. The round-trip latency is 50-200ms per call. A loop with 1000 getValue()
calls = 50-200 SECONDS of pure network wait.

In contrast, JavaScript array operations in V8 execute in **microseconds**.

### The Core Principle
```
READ ALL → PROCESS IN MEMORY → WRITE ALL
```

### Benchmark (Tanaikech, verified):
| Operation | 100x100 cells | Time |
|-----------|---------------|------|
| Cell-by-cell getValue/setValue loop | 10,000 calls | ~70 seconds |
| Single getValues + setValues | 2 calls | ~1 second |
| **Speedup** | | **70x faster** |

---

## 2. The 12 Anti-Patterns (Ranked by Severity)

### Anti-Pattern #1: getValue() / setValue() in Loops (CRITICAL)
```javascript
// ❌ NEVER DO THIS — 2N service calls for N rows
for (var i = 1; i <= lastRow; i++) {
  var val = sheet.getRange(i, 1).getValue();   // RPC call
  sheet.getRange(i, 2).setValue(val * 2);       // RPC call
}

// ✅ CORRECT — 2 service calls total
var data = sheet.getRange(1, 1, lastRow, 1).getValues();  // 1 RPC
var output = data.map(function(row) { return [row[0] * 2]; });
sheet.getRange(1, 2, lastRow, 1).setValues(output);       // 1 RPC
```

### Anti-Pattern #2: Interleaved Reads and Writes (CRITICAL)
```javascript
// ❌ NEVER — forces cache flush on every alternation
var a = sheet.getRange('A1').getValue();  // read → flushes write cache
sheet.getRange('B1').setValue(a + 1);      // write → invalidates read cache
var b = sheet.getRange('A2').getValue();  // read → flushes write cache again

// ✅ CORRECT — all reads first, then all writes
var data = sheet.getRange('A1:A2').getValues();
sheet.getRange('B1:B2').setValues([[data[0][0]+1], [data[1][0]+1]]);
```

**WHY**: GAS maintains separate read and write caches. A read forces the write cache to
commit (to ensure fresh data). A write invalidates the read cache. Alternating = no caching.

### Anti-Pattern #3: Opening the Same Spreadsheet Repeatedly
```javascript
// ❌ NEVER
function processSheet1() { SpreadsheetApp.openById(ID).getSheetByName('A')... }
function processSheet2() { SpreadsheetApp.openById(ID).getSheetByName('B')... }

// ✅ CORRECT — open once, pass reference
var ss = SpreadsheetApp.openById(ID);
var sheetA = ss.getSheetByName('A');
var sheetB = ss.getSheetByName('B');
```

### Anti-Pattern #4: getRange() Inside Loops
```javascript
// ❌ NEVER — N getRange calls
for (var i = 0; i < rows.length; i++) {
  sheet.getRange(i + 2, 1).setValue(rows[i][0]);
}

// ✅ CORRECT — single getRange + setValues
sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
```

### Anti-Pattern #5: Using getLastRow() Without Caching
```javascript
// ❌ — getLastRow() is a service call each time
for (var i = 1; i <= sheet.getLastRow(); i++) { ... }

// ✅ — cache the value
var lastRow = sheet.getLastRow();
for (var i = 1; i <= lastRow; i++) { ... }
```

### Anti-Pattern #6: Not Using getDataRange()
```javascript
// ❌ — wasteful if you want all data
var data = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues();

// ✅ — cleaner and equally fast
var data = sheet.getDataRange().getValues();
```

### Anti-Pattern #7: Excessive flush() Calls
```javascript
// ❌ NEVER — flush inside a loop
for (var i = 0; i < rows.length; i++) {
  sheet.getRange(i+1, 1, 1, cols).setValues([rows[i]]);
  SpreadsheetApp.flush();  // Forces server round-trip each iteration
}

// ✅ — single batch write, optional single flush at end
sheet.getRange(1, 1, rows.length, cols).setValues(rows);
SpreadsheetApp.flush();  // Only if needed for immediate visibility
```

### Anti-Pattern #8: Not Handling Custom Function Limits
```javascript
// ❌ — will timeout silently with #ERROR! after 30 seconds
function HEAVY_CALC(range) {
  // Complex computation taking > 30 seconds
}

// ✅ — pre-compute with onEdit trigger, store results in helper sheet
// Custom functions should be LIGHTWEIGHT — pure math/string operations only
```

### Anti-Pattern #9: Ignoring authMode in Triggers
```javascript
// ❌ — will fail silently in simple onEdit (AuthMode.LIMITED)
function onEdit(e) {
  GmailApp.sendEmail('admin@co.com', 'Edit!', 'Someone edited');
}

// ✅ — use installable trigger for services requiring auth
function onEditInstallable(e) {
  GmailApp.sendEmail('admin@co.com', 'Edit!', 'Cell edited: ' + e.range.getA1Notation());
}
// Install via: ScriptApp.newTrigger('onEditInstallable').forSpreadsheet(ss).onEdit().create();
```

### Anti-Pattern #10: Not Releasing Locks Properly
```javascript
// ❌ — lock never released if error occurs
var lock = LockService.getScriptLock();
lock.waitLock(10000);
riskyOperation();          // If this throws, lock is held until timeout
lock.releaseLock();

// ✅ — always use try/finally
var lock = LockService.getScriptLock();
lock.waitLock(10000);
try {
  riskyOperation();
  SpreadsheetApp.flush();  // Commit before releasing
} finally {
  lock.releaseLock();
}
```

### Anti-Pattern #11: Not Cleaning Up Continuation Triggers
```javascript
// ❌ — creates duplicate triggers on every run
ScriptApp.newTrigger('processChunk').timeBased().after(60000).create();

// ✅ — clean up old triggers before creating new ones
function cleanupTriggers(functionName) {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === functionName) {
      ScriptApp.deleteTrigger(t);
    }
  });
}
cleanupTriggers('processChunk');
ScriptApp.newTrigger('processChunk').timeBased().after(60000).create();
```

### Anti-Pattern #12: Ignoring e.value vs e.range for Multi-Cell Pastes
```javascript
// ❌ — e.value is UNDEFINED for multi-cell paste
function onEditInstallable(e) {
  var newValue = e.value;  // undefined if user pasted multiple cells!
}

// ✅ — always use e.range.getValues() for safety
function onEditInstallable(e) {
  var values = e.range.getValues();  // Works for single AND multi-cell edits
  var singleValue = values[0][0];    // First cell if you need just one
}
```

---

## 3. Advanced Optimization Techniques

### 3.1 CacheService for Expensive Lookups
```javascript
// Cache supplier map to avoid repeated sheet scans
function getSupplierMap() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get('supplierMap');
  if (cached) return JSON.parse(cached);

  // Cache miss — do the expensive sheet read
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Suppliers');
  var data = sheet.getDataRange().getValues();
  var map = {};
  for (var i = 1; i < data.length; i++) {
    map[String(data[i][0]).trim()] = data[i][1];
  }

  cache.put('supplierMap', JSON.stringify(map), 21600);  // 6 hour TTL
  return map;
}
```

### 3.2 Sheets API for Bulk Operations
```javascript
// Enable: Resources → Advanced Google Services → Google Sheets API
// 35% faster reads, 19% faster writes than SpreadsheetApp (Tanaikech benchmark)

function bulkReadSheetsAPI(spreadsheetId, ranges) {
  var response = Sheets.Spreadsheets.Values.batchGet(spreadsheetId, {
    ranges: ranges,
    valueRenderOption: 'UNFORMATTED_VALUE'  // Skip formatting = faster
  });
  return response.valueRanges.map(function(vr) { return vr.values; });
}

function bulkWriteSheetsAPI(spreadsheetId, rangeValuePairs) {
  var data = rangeValuePairs.map(function(pair) {
    return { range: pair.range, values: pair.values };
  });
  Sheets.Spreadsheets.Values.batchUpdate({
    valueInputOption: 'USER_ENTERED',
    data: data
  }, spreadsheetId);
}
```

### 3.3 Trigger Chaining with State Machine
```javascript
// Production-grade trigger chaining for unlimited processing time
function processWithChaining() {
  var props = PropertiesService.getScriptProperties();
  var state = JSON.parse(props.getProperty('chainState') || '{"phase":"init","cursor":0}');
  var startTime = Date.now();
  var SAFETY_MARGIN = 5 * 60 * 1000;  // Exit 1 min before timeout

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Data');
  var data = sheet.getDataRange().getValues();

  for (var i = state.cursor; i < data.length; i++) {
    if (Date.now() - startTime > SAFETY_MARGIN) {
      // Save and chain
      state.cursor = i;
      props.setProperty('chainState', JSON.stringify(state));
      cleanupTriggers_('processWithChaining');
      ScriptApp.newTrigger('processWithChaining')
        .timeBased().after(60 * 1000).create();
      Logger.log('Chained at row ' + i + '/' + data.length);
      return;
    }
    processRow_(data[i], i);
  }

  // Complete — cleanup
  props.deleteProperty('chainState');
  cleanupTriggers_('processWithChaining');
  Logger.log('Processing complete: ' + data.length + ' rows');
}

function cleanupTriggers_(name) {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === name
        && t.getTriggerSource() === ScriptApp.TriggerSource.CLOCK) {
      ScriptApp.deleteTrigger(t);
    }
  });
}
```

### 3.4 Parallel HTTP with fetchAll + Retry
```javascript
function parallelFetchWithRetry(urls, maxRetries) {
  maxRetries = maxRetries || 3;
  var requests = urls.map(function(url) {
    return { url: url, method: 'get', muteHttpExceptions: true };
  });

  var responses = UrlFetchApp.fetchAll(requests);
  var retryQueue = [];

  for (var i = 0; i < responses.length; i++) {
    var code = responses[i].getResponseCode();
    if (code === 429 || code >= 500) {
      retryQueue.push({ idx: i, req: requests[i] });
    }
  }

  var attempt = 0;
  while (retryQueue.length > 0 && attempt < maxRetries) {
    attempt++;
    var backoff = Math.pow(2, attempt) * 1000 + Math.floor(Math.random() * 1000);
    Utilities.sleep(backoff);

    var retryReqs = retryQueue.map(function(item) { return item.req; });
    var retryResps = UrlFetchApp.fetchAll(retryReqs);

    var stillFailed = [];
    for (var j = 0; j < retryResps.length; j++) {
      var rc = retryResps[j].getResponseCode();
      if (rc === 429 || rc >= 500) {
        stillFailed.push(retryQueue[j]);
      } else {
        responses[retryQueue[j].idx] = retryResps[j];
      }
    }
    retryQueue = stillFailed;
  }
  return responses;
}
```

### 3.5 Memory-Efficient Large Dataset Processing
```javascript
// For datasets approaching memory limits (~2.25 GB), process in chunks
function processLargeSheet(sheetName, chunkSize) {
  chunkSize = chunkSize || 5000;
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  var totalRows = sheet.getLastRow();
  var numCols = sheet.getLastColumn();

  for (var startRow = 1; startRow <= totalRows; startRow += chunkSize) {
    var rowsToRead = Math.min(chunkSize, totalRows - startRow + 1);
    var chunk = sheet.getRange(startRow, 1, rowsToRead, numCols).getValues();

    // Process chunk in memory...
    var processed = chunk.map(transformRow_);

    // Write chunk back
    sheet.getRange(startRow, 1, rowsToRead, numCols).setValues(processed);
  }
}
```

---

## 4. Performance Decision Matrix

| Scenario | Best Approach | Why |
|----------|---------------|-----|
| Read < 50K cells | `getValues()` | Fast, simple, single RPC |
| Read > 50K cells | Sheets API `batchGet` | 35% faster, field masking |
| Write < 50K cells | `setValues()` | Fast, simple, single RPC |
| Write > 50K cells | Sheets API `batchUpdate` | 19% faster, atomic |
| Format + write | Sheets API `batchUpdate` | Single call for both |
| Lookup table | CacheService + getValues | Eliminates repeated reads |
| Persistent config | PropertiesService | Survives executions |
| Concurrent writes | LockService + flush | Prevents race conditions |
| Many HTTP calls | `fetchAll()` | Parallel execution |
| > 6 min processing | Trigger chaining | State via PropertiesService |
| Real-time UI update | `flush()` after batch | Commit visible changes |

---

## 5. Debugging Performance Issues

### Timing Your Code
```javascript
function timedOperation() {
  var t0 = Date.now();

  // Operation 1
  var data = sheet.getDataRange().getValues();
  Logger.log('Read: ' + (Date.now() - t0) + 'ms');

  var t1 = Date.now();
  // Operation 2
  var processed = processData_(data);
  Logger.log('Process: ' + (Date.now() - t1) + 'ms');

  var t2 = Date.now();
  // Operation 3
  sheet.getRange(1,1,processed.length, processed[0].length).setValues(processed);
  Logger.log('Write: ' + (Date.now() - t2) + 'ms');

  Logger.log('TOTAL: ' + (Date.now() - t0) + 'ms');
}
```

### Common Performance Bottlenecks (Diagnosis)
1. **> 80% time in reads/writes** → Not batching. Apply Anti-Pattern #1/#2 fixes.
2. **Inconsistent timing** → Multiple concurrent users. Apply LockService.
3. **Timeout at 6 min** → Dataset too large. Apply trigger chaining (#3.3).
4. **Custom function shows #ERROR!** → Exceeds 30s. Move to onEdit trigger.
5. **Script works but sheet is slow** → Too many flush() calls or custom functions.

---

## 6. The Speed Hierarchy (Fastest → Slowest)

```
1. JavaScript in-memory operations         ~0.001ms per operation
2. CacheService.get()                      ~5-10ms
3. PropertiesService.getProperty()         ~10-20ms
4. SpreadsheetApp.getValues() (batch)      ~50-200ms for reasonable ranges
5. Sheets API batchGet                     ~30-130ms (35% faster than #4)
6. SpreadsheetApp.getValue() (single cell) ~50-200ms PER CALL
7. UrlFetchApp.fetch() (single)            ~100-2000ms depending on endpoint
8. SpreadsheetApp.openById()               ~100-300ms
9. DriveApp operations                     ~200-500ms
10. GmailApp.sendEmail()                   ~500-2000ms
```

The takeaway: anything in the JavaScript engine (array operations, string manipulation, math)
is **thousands of times faster** than any service call. Always maximize in-memory processing
and minimize service round-trips.

---

## 7. Advanced: Sheets API vs SpreadsheetApp — When to Switch

### Tanaikech Benchmark Results (Verified)
```
READ PERFORMANCE (100x100 = 10,000 cells):
  SpreadsheetApp.getValues()              → ~1.2 sec
  Sheets.Spreadsheets.Values.get()        → ~0.78 sec  (35% faster)
  Sheets API with field masking           → ~0.48 sec  (60% faster)

WRITE PERFORMANCE (100x100 = 10,000 cells):
  SpreadsheetApp.setValues()              → ~1.5 sec
  Sheets.Spreadsheets.Values.update()     → ~1.22 sec  (19% faster)
  Sheets.Spreadsheets.Values.batchUpdate() → ~1.20 sec  (20% faster)

CROSSOVER POINT:
  For < 1000 cells: SpreadsheetApp is simpler and nearly as fast
  For > 10,000 cells: Sheets API saves significant cumulative time
  For formatting + writing combined: Sheets API batchUpdate is always faster
```

### Sheets API with Field Masking (Secret Weapon)
```javascript
// Field masking reduces payload by 60%+ — the biggest single optimization
function fastRead(ssId, range) {
  return Sheets.Spreadsheets.Values.get(ssId, range, {
    valueRenderOption: 'UNFORMATTED_VALUE',  // Skip formatting data
    fields: 'values'                          // Only return cell values
  });
}

function fastBatchRead(ssId, ranges) {
  return Sheets.Spreadsheets.Values.batchGet(ssId, {
    ranges: ranges,
    valueRenderOption: 'UNFORMATTED_VALUE',
    fields: 'valueRanges.values'
  });
}
```

---

## 8. Advanced: RangeList for Batch Formatting

### The Problem: Formatting Non-Contiguous Ranges
```javascript
// ❌ SLOW — 3 separate server calls
sheet.getRange('A1:G1').setFontWeight('bold');
sheet.getRange('A15:G15').setFontWeight('bold');
sheet.getRange('A30:G30').setFontWeight('bold');

// ✅ FAST — single server call via RangeList
sheet.getRangeList(['A1:G1', 'A15:G15', 'A30:G30']).setFontWeight('bold');
```

### Building Dynamic RangeList from Data
```javascript
// Dynamically build range list for all sub-header rows
function formatAllSubHeaders(sheet, subHeaderRows) {
  var rangeNotations = subHeaderRows.map(function(row) {
    return 'A' + row + ':G' + row;
  });
  if (rangeNotations.length > 0) {
    var rl = sheet.getRangeList(rangeNotations);
    rl.setFontWeight('bold').setBackground('#e8eaf6');
  }
}
```

---

## 9. Advanced: Persistence Strategy Decision Tree

```
NEED TO STORE DATA?
│
├── Volatile (OK to lose)? ──→ CacheService (6hr max, 100KB/val, fast)
│   ├── Per-user? ──→ getUserCache()
│   ├── Per-document? ──→ getDocumentCache()
│   └── Shared? ──→ getScriptCache()
│
├── Must survive between executions? ──→ PropertiesService (persistent, 9KB/val)
│   ├── Script config? ──→ getScriptProperties()
│   ├── User prefs? ──→ getUserProperties()
│   └── Doc-specific? ──→ getDocumentProperties()
│
├── Larger than 500KB total? ──→ Google Sheet as database
│   └── Use hidden sheet + batch getValues/setValues
│
├── Need relational queries? ──→ External DB via UrlFetchApp
│   ├── Firebase Realtime DB (free tier)
│   ├── Cloud Firestore
│   └── External REST API
│
└── Need > 50MB structured data? ──→ BigQuery (via Advanced Service)
```

### Hybrid Pattern: Cache + Properties + Sheet
```javascript
// Layer 1: CacheService (hot path, ~5ms)
// Layer 2: PropertiesService (warm path, ~15ms)
// Layer 3: Sheet read (cold path, ~200ms)
function getConfig(key) {
  var cache = CacheService.getScriptCache();
  var val = cache.get(key);
  if (val) return JSON.parse(val);

  var props = PropertiesService.getScriptProperties();
  val = props.getProperty(key);
  if (val) {
    cache.put(key, val, 21600);
    return JSON.parse(val);
  }

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Config');
  var data = sheet.getDataRange().getValues();
  var configMap = {};
  for (var i = 1; i < data.length; i++) {
    configMap[data[i][0]] = data[i][1];
  }

  props.setProperty(key, JSON.stringify(configMap[key]));
  cache.put(key, JSON.stringify(configMap[key]), 21600);
  return configMap[key];
}
```

---

## 10. Production Error Reporting (Without External Services)

### Self-Diagnosing Error Logger
```javascript
function withErrorReporting(fn, context) {
  try {
    return fn();
  } catch (err) {
    var errorLog = {
      timestamp: new Date().toISOString(),
      context: context || 'unknown',
      message: err.message,
      stack: err.stack || 'no stack',
      user: Session.getEffectiveUser().getEmail()
    };

    // Log to hidden error sheet
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var errSheet = ss.getSheetByName('_ErrorLog');
    if (!errSheet) {
      errSheet = ss.insertSheet('_ErrorLog');
      errSheet.getRange('A1:E1').setValues([['Timestamp','Context','Message','Stack','User']]);
      errSheet.hideSheet();
    }
    errSheet.appendRow([errorLog.timestamp, errorLog.context, errorLog.message,
                        errorLog.stack, errorLog.user]);

    // Re-throw for caller handling
    throw err;
  }
}

// Usage:
withErrorReporting(function() {
  importFromSource();
}, 'importFromSource');
```
