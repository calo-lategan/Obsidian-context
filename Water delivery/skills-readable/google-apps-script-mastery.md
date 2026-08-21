---
name: google-apps-script-mastery
description: |
  Complete Google Apps Script (GAS) mastery covering V8 runtime architecture, execution model,
  all services (SpreadsheetApp, DriveApp, GmailApp, etc.), triggers (simple, installable,
  time-driven), event objects, authMode, quotas & limits, CacheService, PropertiesService,
  LockService, Advanced Services (Sheets API), web apps (doGet/doPost), HTML Service,
  clasp/TypeScript workflow, and production deployment patterns. Use this skill for ANY
  Google Apps Script task: writing scripts, debugging errors, designing automation,
  optimizing performance, understanding triggers, working with quotas, or building
  web apps. Trigger on: Apps Script, Google Script, GAS, spreadsheet script, onEdit,
  trigger, Google Sheets automation, CacheService, PropertiesService, LockService,
  doGet, doPost, clasp, UrlFetchApp, SpreadsheetApp, time-driven, quota, getValues,
  setValues, batch operations, custom function, web app, HTML service, installable trigger.
---

# Google Apps Script Mastery — Complete Technical Reference

This skill contains the condensed knowledge from Google's official documentation, Tanaikech's
benchmark research, community best practices, and production battle-testing. It covers everything
needed to build professional-grade Google Apps Script solutions.

---

## 1. V8 Runtime Architecture & Execution Model

### Runtime Foundation
- GAS runs on Google's V8 JavaScript engine (same as Chrome and Node.js)
- **Rhino runtime deprecated** Feb 20, 2025; ceases execution Jan 31, 2026
- V8 enables: `let`/`const`, arrow functions, template literals, destructuring, classes,
  default params, `Array.from()`, `Map`/`Set`, spread operator, `async`/`await` (limited)

### Execution Context
- Each project + its libraries run in **separate execution contexts** with different globals
- Every function call from a trigger/menu/button is a **fresh execution** — no persistent
  state between calls (use PropertiesService/CacheService for persistence)
- Scripts are **single-threaded per execution** but multiple users can trigger concurrent runs

### Memory & Limits
- **Heap limit**: ~2.25–2.5 GB (experimentally determined, not officially documented)
- **Max data via google.script.run**: ~50 MB
- **Max execution time**: 6 minutes per invocation (all account types)
- **Daily trigger quota**: 90 minutes cumulative trigger execution per day
- **Custom function timeout**: 30 seconds (displays `#ERROR!` if exceeded)

---

## 2. Services Architecture

### Built-in Services (No Authorization Required)
```
Utilities        — formatDate, sleep, base64, zip, computeDigest
Logger           — log() for script editor console
console          — log/warn/error for Stackdriver (Cloud Logging)
CacheService     — short-term key-value cache (max 6hr TTL, 100KB/value, 1000 items)
PropertiesService — persistent key-value store (no expiry, 9KB/value, 500KB total)
LockService      — mutual exclusion locks (script/document/user scope)
```

### Services Requiring Authorization
```
SpreadsheetApp   — read/write/format sheets
DriveApp         — file/folder CRUD
GmailApp         — send/read/label emails
DocumentApp      — Google Docs manipulation
SlidesApp        — Google Slides manipulation
CalendarApp      — calendar events
FormApp          — Google Forms
UrlFetchApp      — HTTP requests (fetch/fetchAll)
HtmlService      — serve web pages from doGet/doPost
ContentService   — serve JSON/text from web apps
ScriptApp        — manage triggers programmatically
```

### Advanced Services (Sheets API, Drive API, etc.)
- Must be enabled in script editor: Resources → Advanced Google Services
- `Sheets.Spreadsheets.Values.batchUpdate()` — 19-35% faster than SpreadsheetApp for
  bulk operations (Tanaikech benchmark)
- `Sheets.Spreadsheets.batchUpdate()` — formatting, conditional rules, charts in one call
- **When to use**: Large bulk reads/writes, complex formatting, field masking for payload
  reduction (~60% response time improvement with selective fields)

---

## 3. Triggers — The Complete Guide

### Simple Triggers (No Authorization)
```javascript
function onOpen(e)  { }  // Spreadsheet/Doc/Form opened
function onEdit(e)  { }  // Cell value changed by user
function onInstall(e) { } // Add-on installed
function doGet(e)   { }  // Web app HTTP GET
function doPost(e)  { }  // Web app HTTP POST
```
**Restrictions**: Cannot call services requiring auth, cannot open other spreadsheets,
cannot send email, cannot create triggers. Run in `AuthMode.LIMITED`.

**Critical**: onEdit simple trigger queues **max 2 events**. Rapid edits drop events silently.

### Installable Triggers (Full Authorization)
```javascript
// Created programmatically:
ScriptApp.newTrigger('myFunction')
  .forSpreadsheet(ss)
  .onEdit()           // or .onChange(), .onFormSubmit()
  .create();

// Time-driven:
ScriptApp.newTrigger('dailyJob')
  .timeBased()
  .everyHours(1)      // or .everyMinutes(1), .atHour(9).everyDays(1)
  .create();
```

**Advantages**: Full auth, can write to other sheets, send email, make HTTP calls.
**Limit**: 20 triggers per user per script. Add-ons: 1 trigger per type per user per doc.

### Event Object (e) Properties
```javascript
// onEdit event:
e.range          // Range that was edited
e.value          // New value (single cell only)
e.oldValue       // Previous value (single cell only, installable only)
e.source         // Spreadsheet object
e.authMode       // ScriptApp.AuthMode.FULL or LIMITED
e.triggerUid     // Unique trigger ID
e.user           // User object (installable only, Workspace only)

// onChange event:
e.changeType     // EDIT, INSERT_ROW, INSERT_COLUMN, REMOVE_ROW, REMOVE_COLUMN,
                 // INSERT_GRID, REMOVE_GRID, FORMAT, OTHER
```

**Critical Bug**: `e.range.getValue()` is NOT the same as `e.value` for multi-cell pastes.
For multi-cell edits, `e.value` is undefined — use `e.range.getValues()` instead.

### Trigger Anti-Pattern: Script-Triggered Edits Don't Fire onEdit
```javascript
// This does NOT fire onEdit:
sheet.getRange('A1').setValue('hello');  // Programmatic edit = no trigger

// Only USER edits fire onEdit triggers
```

---

## 4. CacheService — In-Depth

### Three Cache Scopes
```javascript
CacheService.getScriptCache()    // Shared across ALL users of the script
CacheService.getUserCache()      // Private to current user
CacheService.getDocumentCache()  // Shared per-document
```

### Limits
| Property | Limit |
|----------|-------|
| Max value size | 100 KB |
| Max key length | 250 characters |
| Max items | 1,000 |
| Max TTL | 21,600 seconds (6 hours) |
| Default TTL | 600 seconds (10 minutes) |

### Cache-Aside Pattern (Production Standard)
```javascript
function getCachedData(key, fetcherFn, ttl) {
  var cache = CacheService.getScriptCache();
  var cached = cache.get(key);
  if (cached) {
    try { return JSON.parse(cached); } catch (e) { /* corrupted, refetch */ }
  }
  var data = fetcherFn();
  try {
    cache.put(key, JSON.stringify(data), ttl || 21600);
  } catch (e) {
    // Value too large or cache full — degrade gracefully
  }
  return data;
}
```

### Batch Cache Operations
```javascript
// putAll — set multiple keys at once (more efficient than individual puts)
cache.putAll({
  'key1': JSON.stringify(data1),
  'key2': JSON.stringify(data2)
}, 21600);

// getAll — retrieve multiple keys at once
var results = cache.getAll(['key1', 'key2', 'key3']);
```

### Cache + Lock Pattern (Race Condition Prevention)
```javascript
function safeIncrementCounter() {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var cache = CacheService.getScriptCache();
    var count = Number(cache.get('counter') || 0);
    count++;
    cache.put('counter', String(count), 21600);
  } finally {
    lock.releaseLock();
  }
  return count;
}
```

---

## 5. PropertiesService — Persistent State

### Three Scopes
```javascript
PropertiesService.getScriptProperties()    // Shared, persistent, survives deployments
PropertiesService.getUserProperties()      // Per-user persistent storage
PropertiesService.getDocumentProperties()  // Per-document persistent storage
```

### Limits
| Property | Limit |
|----------|-------|
| Max value size | 9 KB per property |
| Max total storage | 500 KB per property store |
| No expiry | Data persists until explicitly deleted |

### Best Use: Continuation Tokens & State
```javascript
// Save progress for trigger chaining:
PropertiesService.getScriptProperties().setProperty('lastRow', String(processedRow));
PropertiesService.getScriptProperties().setProperty('state', JSON.stringify(stateObj));

// Resume on next execution:
var lastRow = Number(PropertiesService.getScriptProperties().getProperty('lastRow') || 0);
```

---

## 6. LockService — Concurrency Control

### Lock Types
```javascript
LockService.getScriptLock()    // One execution across ALL users
LockService.getDocumentLock()  // One execution per document
LockService.getUserLock()      // One execution per user
```

### Production Pattern: Try/Finally + Flush
```javascript
function criticalWrite(data) {
  var lock = LockService.getScriptLock();
  var acquired = lock.tryLock(15000);  // 15 second timeout
  if (!acquired) {
    throw new Error('Could not acquire lock — another process is running');
  }
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Data');
    sheet.getRange(sheet.getLastRow() + 1, 1, data.length, data[0].length)
      .setValues(data);
    SpreadsheetApp.flush();  // CRITICAL: commit before releasing lock
  } finally {
    lock.releaseLock();
  }
}
```

---

## 7. Quotas & Limits — Complete Reference

### Per-Execution Limits
| Limit | Consumer | Workspace |
|-------|----------|-----------|
| Execution time | 6 min | 6 min (30 min for certain time-driven) |
| Custom function | 30 sec | 30 sec |
| Simultaneous executions | 30 | 30 |
| URL Fetch calls/exec | 50 | 50 |
| URL Fetch payload | 50 MB | 50 MB |

### Daily Quotas (per user, resets 24hr after first request)
| Quota | Consumer | Workspace |
|-------|----------|-----------|
| Trigger total runtime | 90 min/day | 6 hr/day |
| URL Fetch calls | 20,000/day | 100,000/day |
| Email recipients | 100/day | 1,500/day |
| Properties read/write | 50,000/day | 500,000/day |
| Spreadsheet created | 250/day | 250/day |

### Bypassing the 6-Minute Limit: Trigger Chaining
```javascript
function processLargeDataset() {
  var props = PropertiesService.getScriptProperties();
  var startRow = Number(props.getProperty('startRow') || 0);
  var startTime = Date.now();
  var MAX_RUNTIME = 5 * 60 * 1000;  // 5 min safety margin

  var data = SpreadsheetApp.getActiveSheet().getDataRange().getValues();

  for (var i = startRow; i < data.length; i++) {
    if (Date.now() - startTime > MAX_RUNTIME) {
      // Save state and schedule continuation
      props.setProperty('startRow', String(i));
      ScriptApp.newTrigger('processLargeDataset')
        .timeBased().after(1 * 60 * 1000).create();  // Resume in 1 min
      return;
    }
    // Process row i...
  }

  // Cleanup — all done
  props.deleteProperty('startRow');
  // Delete the continuation trigger
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'processLargeDataset'
        && t.getTriggerSource() === ScriptApp.TriggerSource.CLOCK) {
      ScriptApp.deleteTrigger(t);
    }
  });
}
```

---

## 8. UrlFetchApp — HTTP & Parallel Requests

### fetch() vs fetchAll()
```javascript
// Sequential (slow):
urls.forEach(function(url) { UrlFetchApp.fetch(url); });

// Parallel (10-100x faster):
var requests = urls.map(function(url) {
  return { url: url, method: 'get', muteHttpExceptions: true };
});
var responses = UrlFetchApp.fetchAll(requests);
```

### fetchAll with Exponential Backoff
```javascript
function fetchWithRetry(requests, maxRetries) {
  maxRetries = maxRetries || 3;
  var responses = UrlFetchApp.fetchAll(requests);
  var failed = [];

  for (var i = 0; i < responses.length; i++) {
    if (responses[i].getResponseCode() === 429 || responses[i].getResponseCode() >= 500) {
      failed.push({ index: i, request: requests[i] });
    }
  }

  if (failed.length > 0 && maxRetries > 0) {
    Utilities.sleep(Math.pow(2, 4 - maxRetries) * 1000 + Math.random() * 1000);
    var retryRequests = failed.map(function(f) { return f.request; });
    var retryResponses = fetchWithRetry(retryRequests, maxRetries - 1);
    for (var j = 0; j < failed.length; j++) {
      responses[failed[j].index] = retryResponses[j];
    }
  }
  return responses;
}
```

---

## 9. Web Apps (doGet / doPost)

### Basic Structure
```javascript
function doGet(e) {
  var page = e.parameter.page || 'index';
  return HtmlService.createTemplateFromFile(page)
    .evaluate()
    .setTitle('My App')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  // Process data...
  return ContentService.createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

### HTML Service Best Practices
- Use `google.script.run` for server calls from client-side JS
- Use `.withSuccessHandler()` and `.withFailureHandler()` for async callbacks
- Keep scriptlet code (`<? ?>`) minimal — use it only for includes and static setup
- Load dynamic data via `google.script.run` calls AFTER page renders
- Use `<?!= include('Stylesheet') ?>` pattern for modular CSS/JS

---

## 10. Error Handling — Production Patterns

### Exponential Backoff Wrapper
```javascript
function withRetry(fn, maxAttempts, label) {
  maxAttempts = maxAttempts || 5;
  label = label || 'operation';
  for (var attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return fn();
    } catch (e) {
      if (attempt === maxAttempts - 1) throw e;
      var wait = Math.pow(2, attempt) * 1000 + Math.floor(Math.random() * 1000);
      Logger.log(label + ' failed (attempt ' + (attempt+1) + '): ' + e.message
        + ' — retrying in ' + wait + 'ms');
      Utilities.sleep(wait);
    }
  }
}

// Usage:
var data = withRetry(function() {
  return Sheets.Spreadsheets.Values.get(ssId, 'Sheet1!A:Z').values;
}, 3, 'Sheets API read');
```

### getUi() Context Safety
```javascript
// getUi() ONLY works when called from menu, dialog, sidebar, or button context
// It FAILS from: script editor Run, time-driven triggers, web app requests
function safeAlert(message) {
  try {
    SpreadsheetApp.getUi().alert(message);
  } catch (e) {
    Logger.log('UI unavailable: ' + message);
  }
}
```

---

## 11. clasp & TypeScript — Modern Development

### Setup
```bash
npm install -g @google/clasp
clasp login
clasp create --title "My Project" --type sheets
clasp pull    # Download existing script
clasp push    # Upload local files
clasp deploy  # Create versioned deployment
```

### TypeScript Types
```bash
npm install --save-dev @types/google-apps-script
```
Provides full autocomplete for all GAS services in VS Code.

### Project Structure
```
my-project/
├── .clasp.json          # Script ID binding
├── appsscript.json      # Manifest (scopes, runtime)
├── tsconfig.json        # TypeScript config
├── src/
│   ├── main.ts
│   ├── triggers.ts
│   └── utils.ts
└── package.json
```

---

## 12. SpreadsheetApp.flush() — When & Why

### Use flush() When:
1. You need users to see changes **during** script execution (progress indicators)
2. Before releasing a `LockService` lock (commit pending writes while you have exclusivity)
3. Before a `Utilities.sleep()` where the next operation depends on the written data
4. Between dependent write-then-read sequences that can't be restructured

### Do NOT Use flush() When:
1. Between sequential writes — batching is faster
2. At the end of a script — changes auto-commit on script completion
3. Inside loops — each flush forces a server round-trip
4. When using batch setValues() — the single call already commits efficiently

---

## 13. RangeList — Batch Multi-Range Operations

### The Problem
Formatting/clearing multiple non-contiguous ranges usually means N separate getRange() calls.

### The Solution: getRangeList()
```javascript
// ❌ SLOW — N separate formatting calls
sheet.getRange('A1:D1').setFontWeight('bold');
sheet.getRange('A5:D5').setFontWeight('bold');
sheet.getRange('A10:D10').setFontWeight('bold');

// ✅ FAST — single call for all ranges
sheet.getRangeList(['A1:D1', 'A5:D5', 'A10:D10']).setFontWeight('bold');
```

### Available RangeList Methods
```javascript
var rl = sheet.getRangeList(['A1:C3', 'E5:G7']);
rl.setBackground('#f3f3f3');           // Batch background
rl.setFontWeight('bold');              // Batch font weight
rl.setFontColor('#000000');            // Batch font color
rl.setFontSize(12);                    // Batch font size
rl.setBorder(true,true,true,true,true,true); // Batch borders
rl.clear();                            // Batch clear
rl.clearContent();                     // Batch clear content only
rl.clearDataValidations();             // Batch clear validations
rl.clearFormat();                      // Batch clear formatting
rl.setNumberFormat('#,##0.00');        // Batch number format
rl.setHorizontalAlignment('center');   // Batch alignment
rl.setVerticalAlignment('middle');     // Batch vertical alignment
rl.setWrap(true);                      // Batch text wrap
rl.setValue('');                        // Set same value across all ranges
```

---

## 14. OAuth, Scopes & Manifest (appsscript.json)

### Managing Scopes
```json
// appsscript.json — explicit scope declaration
{
  "timeZone": "Asia/Dubai",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/script.external_request"
  ]
}
```

### Using OAuth Tokens for Advanced API Calls
```javascript
// Access Google APIs directly using the script's OAuth token
function callSheetsAPIDirectly(spreadsheetId) {
  var token = ScriptApp.getOAuthToken();
  var url = 'https://sheets.googleapis.com/v4/spreadsheets/' + spreadsheetId
            + '/values/Sheet1!A1:Z?valueRenderOption=UNFORMATTED_VALUE';
  var response = UrlFetchApp.fetch(url, {
    headers: { 'Authorization': 'Bearer ' + token },
    muteHttpExceptions: true
  });
  return JSON.parse(response.getContentText());
}
```

### Service Account Authentication
```javascript
// For server-to-server automation without user context
// Requires: Google Cloud project + service account JSON key
function getServiceAccountToken(serviceAccountKey) {
  var jwt = createJWT_(serviceAccountKey);
  var response = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
    method: 'post',
    payload: {
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    }
  });
  return JSON.parse(response.getContentText()).access_token;
}
```

---

## 15. Advanced: Pseudo-Triggers & Polling Patterns

### Pseudo onEdit (Tanaikech Pattern)
When simple/installable onEdit triggers are insufficient (e.g., detecting programmatic edits),
use a time-driven polling approach:
```javascript
// Poll for changes every minute — catches ALL edits including script-made ones
function pollForChanges() {
  var props = PropertiesService.getScriptProperties();
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Data');
  var currentHash = Utilities.computeDigest(
    Utilities.DigestAlgorithm.MD5,
    JSON.stringify(sheet.getDataRange().getValues())
  ).join('');

  var previousHash = props.getProperty('dataHash');
  if (currentHash !== previousHash) {
    props.setProperty('dataHash', currentHash);
    onDataChanged_();  // Your handler
  }
}
// Install: ScriptApp.newTrigger('pollForChanges').timeBased().everyMinutes(1).create();
```

### Detecting Checkbox Rapid-Fire (Tanaikech)
```javascript
// When users rapidly check/uncheck checkboxes, onEdit can miss events
// Solution: debounce with CacheService
function onEditInstallable(e) {
  if (e.value !== 'TRUE' && e.value !== true) return;
  var key = 'debounce_' + e.range.getA1Notation();
  var cache = CacheService.getScriptCache();
  if (cache.get(key)) return;  // Skip if already processing
  cache.put(key, 'processing', 5);  // 5-second debounce
  // Process...
  cache.remove(key);
}
```

---

## 16. fetchAll — Advanced Parallel HTTP

### Chunk Size Limit
```javascript
// fetchAll maxes out at ~200 requests per call
// Beyond 200 → "Service invoked too many times" error
var CHUNK_SIZE = 100;  // Safe chunk size

function batchFetch(allRequests) {
  var allResponses = [];
  for (var i = 0; i < allRequests.length; i += CHUNK_SIZE) {
    var chunk = allRequests.slice(i, i + CHUNK_SIZE);
    var responses = UrlFetchApp.fetchAll(chunk);
    allResponses = allResponses.concat(responses);
    if (i + CHUNK_SIZE < allRequests.length) {
      Utilities.sleep(1000);  // Rate limit between chunks
    }
  }
  return allResponses;
}
```

### Building a REST API with Web Apps
```javascript
// Full JSON REST API endpoint pattern
function doPost(e) {
  try {
    var request = JSON.parse(e.postData.contents);
    var action = request.action;
    var result;

    switch (action) {
      case 'getJobs':   result = getAllJobs_();   break;
      case 'addEntry':  result = addEntry_(request.data); break;
      case 'search':    result = searchJob_(request.jobNumber); break;
      default: return jsonResponse_({ error: 'Unknown action: ' + action }, 400);
    }
    return jsonResponse_({ success: true, data: result });
  } catch (err) {
    return jsonResponse_({ error: err.message }, 500);
  }
}

function jsonResponse_(obj, code) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
```

---

## 17. Testing Frameworks

### QUnitGS2 (Recommended)
```javascript
// Library key: MxL38OxqIK-B73jyDTvCe-OBao7QLBR4j
function doGet(e) {
  QUnitGS2.init();
  tests_();
  QUnitGS2.run();
  return QUnitGS2.getHtmlOutput();
}

function tests_() {
  QUnit.test('getSupplierMap returns object', function(assert) {
    var map = getSupplierMap_();
    assert.ok(typeof map === 'object', 'Returns object');
    assert.ok(Object.keys(map).length >= 0, 'Has keys');
  });

  QUnit.test('searchJob returns array', function(assert) {
    var results = searchJob_('12345');
    assert.ok(Array.isArray(results), 'Returns array');
  });
}
```

### GasT (TAP Framework)
```javascript
var test = GasT.createRunner('MyTests');
test('Supplier lookup returns correct supplier', function(t) {
  var supplier = getSupplierForJob_('60575');
  t.equal(supplier, 'EMIRATES GC', 'Correct supplier');
});
```

### Mocking Pattern (Dependency Injection)
```javascript
// Make functions testable by injecting dependencies
function processData(sheetProvider) {
  sheetProvider = sheetProvider || function() {
    return SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Data');
  };
  var sheet = sheetProvider();
  var data = sheet.getDataRange().getValues();
  // Process...
  return data;
}

// In tests:
function testProcessData() {
  var mockSheet = {
    getDataRange: function() {
      return { getValues: function() { return [['a','b'],['c','d']]; } };
    }
  };
  var result = processData(function() { return mockSheet; });
  // Assert...
}
```
