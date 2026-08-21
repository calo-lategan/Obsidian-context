---
name: gas-advanced-architecture
description: |
  Advanced Google Apps Script architecture patterns for building production-grade systems.
  Covers: state machine patterns for complex workflows, event-driven architecture with
  triggers, MVC separation for maintainable scripts, dependency injection for testable code,
  trigger chaining state machines (bypass 6-min limit), concurrent user handling with
  LockService, sidebar/dialog UI architecture, web app API design (doGet/doPost REST),
  multi-sheet relational data modeling, error recovery and self-healing patterns,
  production logging, testing with QUnitGS2/GasT/mocks, manifest scope management,
  and Tanaikech's advanced library patterns. MUST trigger when: complex GAS project,
  multi-user spreadsheet, production script, state machine, design pattern, architecture,
  trigger chaining, web app API, sidebar dialog, MVC, testing GAS, concurrent users,
  error recovery, self-healing script, relational sheets, multi-sheet, data modeling.
---

# Google Apps Script Advanced Architecture — Production Patterns

This skill covers the architectural patterns that separate hobby scripts from production
systems handling multiple concurrent users, large datasets, and complex business logic.

---

## 1. State Machine Pattern for Complex Workflows

### Why State Machines in GAS?
GAS executions are stateless — every trigger/menu invocation starts fresh. For multi-step
workflows (import → validate → process → report), you need an explicit state machine
persisted in PropertiesService.

### Implementation
```javascript
var STATES = {
  IDLE: 'idle',
  IMPORTING: 'importing',
  VALIDATING: 'validating',
  PROCESSING: 'processing',
  COMPLETE: 'complete',
  ERROR: 'error'
};

function StateMachine() {
  var props = PropertiesService.getScriptProperties();

  this.getState = function() {
    var raw = props.getProperty('workflow_state');
    return raw ? JSON.parse(raw) : { phase: STATES.IDLE, cursor: 0, errors: [] };
  };

  this.setState = function(state) {
    props.setProperty('workflow_state', JSON.stringify(state));
  };

  this.transition = function(newPhase, data) {
    var state = this.getState();
    state.previousPhase = state.phase;
    state.phase = newPhase;
    state.lastTransition = new Date().toISOString();
    if (data) {
      for (var key in data) state[key] = data[key];
    }
    this.setState(state);
    return state;
  };

  this.reset = function() {
    props.deleteProperty('workflow_state');
  };
}

// Usage in trigger-chained workflow:
function runWorkflow() {
  var sm = new StateMachine();
  var state = sm.getState();
  var startTime = Date.now();
  var SAFETY = 5 * 60 * 1000;

  switch (state.phase) {
    case STATES.IDLE:
      sm.transition(STATES.IMPORTING);
      importPhase_(sm, startTime, SAFETY);
      break;
    case STATES.IMPORTING:
      importPhase_(sm, startTime, SAFETY);
      break;
    case STATES.VALIDATING:
      validatePhase_(sm, startTime, SAFETY);
      break;
    case STATES.PROCESSING:
      processPhase_(sm, startTime, SAFETY);
      break;
    case STATES.COMPLETE:
      Logger.log('Workflow complete.');
      sm.reset();
      cleanupTriggers_('runWorkflow');
      return;
    case STATES.ERROR:
      Logger.log('Workflow in error state: ' + JSON.stringify(state.errors));
      return;
  }
}

// Each phase checks time budget and chains if needed:
function importPhase_(sm, startTime, safety) {
  var state = sm.getState();
  // ... process rows from state.cursor ...
  if (Date.now() - startTime > safety) {
    sm.transition(STATES.IMPORTING, { cursor: currentRow });
    scheduleResume_('runWorkflow');
    return;
  }
  sm.transition(STATES.VALIDATING, { cursor: 0 });
  // Continue immediately or chain
}

function scheduleResume_(fnName) {
  cleanupTriggers_(fnName);
  ScriptApp.newTrigger(fnName).timeBased().after(60 * 1000).create();
}

function cleanupTriggers_(fnName) {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === fnName
        && t.getTriggerSource() === ScriptApp.TriggerSource.CLOCK) {
      ScriptApp.deleteTrigger(t);
    }
  });
}
```

---

## 2. Event-Driven Architecture with Triggers

### Event Router Pattern
Instead of a monolithic onEdit handler, use a router that delegates to focused handlers:
```javascript
function onEditInstallable(e) {
  if (!e || !e.range) return;
  var sheet = e.range.getSheet();
  var sheetName = sheet.getName();
  var row = e.range.getRow();
  var col = e.range.getColumn();

  // Route to appropriate handler
  var handlers = getHandlerMap_();
  var key = sheetName;
  if (handlers[key]) {
    handlers[key](e, sheet, row, col);
  }
}

function getHandlerMap_() {
  return {
    'Job Dashboard': handleDashboardEdit_,
    'Master Entry': handleMasterEdit_,
    'Settings': handleSettingsEdit_
  };
}

function handleDashboardEdit_(e, sheet, row, col) {
  var val = e.range.getValue();

  // Sub-route by cell position
  if (row === 2 && col === 2) return searchJob_(val);
  if (row === 6 && col === 1) return autoSupplier_(val);
  if (row === 6 && col === 7 && val === true) return submitEntry_();
  if (row >= 12 && col <= 7) return syncToMaster_(sheet, row, col, val);
}
```

### onChange for Structural Events
```javascript
// onChange catches things onEdit misses:
// INSERT_ROW, REMOVE_ROW, INSERT_COLUMN, REMOVE_COLUMN, FORMAT, INSERT_GRID, REMOVE_GRID

function onChangeInstallable(e) {
  if (e.changeType === 'INSERT_ROW' || e.changeType === 'REMOVE_ROW') {
    rebuildRowIndex_();  // Recalculate hidden row indices
  }
  if (e.changeType === 'REMOVE_GRID') {
    validateRequiredSheets_();  // Ensure critical sheets weren't deleted
  }
}
```

---

## 3. MVC-ish Separation for Maintainable Scripts

### File Organization Pattern
```
Code.gs          — Entry points (onOpen, onEditInstallable, setupAll)
Model.gs         — Data access layer (readMaster_, writeMaster_, getSupplier_)
Controller.gs    — Business logic (searchJob_, submitEntry_, importData_)
View.gs          — Dashboard building, formatting (buildDashboard_, clearResults_)
Config.gs        — Constants, sheet names, cell references
Utils.gs         — Generic helpers (withRetry, safeAlert, formatDate)
```

### Data Access Layer (Model)
```javascript
// Model.gs — ONLY file that calls SpreadsheetApp
var Model = {
  getMaster: function() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(CONFIG.MASTER_SHEET);
    if (!sheet || sheet.getLastRow() < 2) return [];
    return sheet.getRange(2, 1, sheet.getLastRow() - 1, CONFIG.HEADERS.length).getValues();
  },

  writeMaster: function(rows) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(CONFIG.MASTER_SHEET);
    if (rows.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
    }
  },

  getDashValue: function(row, col) {
    return SpreadsheetApp.getActiveSpreadsheet()
      .getSheetByName(CONFIG.DASH_SHEET).getRange(row, col).getValue();
  },

  setDashValues: function(startRow, startCol, data) {
    SpreadsheetApp.getActiveSpreadsheet()
      .getSheetByName(CONFIG.DASH_SHEET)
      .getRange(startRow, startCol, data.length, data[0].length).setValues(data);
  }
};
```

### Config Centralization
```javascript
// Config.gs — single source of truth for all magic numbers
var CONFIG = {
  SOURCE_ID: '1jxtSpdk43aZ1SfPGlDvNTQ28rRJ2oy1Rfut12Ihu_iA',
  MASTER_SHEET: 'Master Entry',
  DASH_SHEET: 'Job Dashboard',
  LOOKUP_SHEET: 'Supplier Lookup',
  HEADERS: ['Date','Supplier','Job Number','Doc Number','Water Type','Volume (Gal)','Wait Hours'],
  DASH: {
    SEARCH_ROW: 2,
    SEARCH_COL: 2,
    INPUT_ROW: 6,
    BTN_ROW: 8,
    RESULT_HDR: 11,
    RESULT_START: 12
  },
  CACHE_TTL: 21600,  // 6 hours
  SAFETY_MARGIN: 5 * 60 * 1000  // 5 min before timeout
};
```

---

## 4. Multi-Sheet Relational Data Modeling

### Sheet-as-Database Pattern
```
Sheet: "Jobs" (Primary)
  A: JobID (PK)  B: Supplier  C: CreatedDate  D: Status

Sheet: "Entries" (Detail)
  A: EntryID (PK)  B: JobID (FK→Jobs)  C: Date  D: DocNum  E: WaterType  F: Volume

Sheet: "Suppliers" (Lookup)
  A: SupplierName (PK)  B: ContactEmail  C: Phone
```

### Join Operation in Memory
```javascript
function joinJobsAndEntries(jobNumber) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Batch read both sheets
  var jobs = ss.getSheetByName('Jobs').getDataRange().getValues();
  var entries = ss.getSheetByName('Entries').getDataRange().getValues();

  // Build index for jobs (O(n) hash map)
  var jobIndex = {};
  for (var j = 1; j < jobs.length; j++) {
    jobIndex[String(jobs[j][0])] = jobs[j];
  }

  // Filter and join entries
  var jn = String(jobNumber);
  var result = [];
  for (var e = 1; e < entries.length; e++) {
    if (String(entries[e][1]) === jn) {
      var job = jobIndex[jn] || [];
      result.push({
        entryDate: entries[e][2],
        docNum: entries[e][3],
        waterType: entries[e][4],
        volume: entries[e][5],
        supplier: job[1] || 'Unknown',
        jobStatus: job[3] || 'Unknown'
      });
    }
  }
  return result;
}
```

### Index Rebuilding Pattern
```javascript
// Maintain a hidden index sheet for fast lookups
function rebuildJobIndex() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var master = ss.getSheetByName('Master Entry');
  var data = master.getDataRange().getValues();

  var index = {};  // jobNumber → [row numbers]
  for (var i = 1; i < data.length; i++) {
    var job = String(data[i][2]).trim();
    if (job && job !== '' && job.toLowerCase() !== 'job number') {
      if (!index[job]) index[job] = [];
      index[job].push(i + 1);  // 1-based row number
    }
  }

  // Write to hidden index sheet
  var idxSheet = ss.getSheetByName('_JobIndex');
  if (!idxSheet) { idxSheet = ss.insertSheet('_JobIndex'); idxSheet.hideSheet(); }
  if (idxSheet.getLastRow() > 0) idxSheet.clear();

  var rows = Object.keys(index).map(function(job) {
    return [job, JSON.stringify(index[job])];
  });
  if (rows.length > 0) {
    idxSheet.getRange(1, 1, rows.length, 2).setValues(rows);
  }

  // Cache the index
  CacheService.getScriptCache().put('jobIndex', JSON.stringify(index), 21600);
}
```

---

## 5. Self-Healing & Auto-Recovery Patterns

### Auto-Recovery Trigger
```javascript
// Time-driven trigger that verifies system health every hour
function healthCheck() {
  var issues = [];
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Check required sheets exist
  var requiredSheets = [CONFIG.MASTER_SHEET, CONFIG.DASH_SHEET, CONFIG.LOOKUP_SHEET];
  requiredSheets.forEach(function(name) {
    if (!ss.getSheetByName(name)) {
      issues.push('Missing sheet: ' + name);
    }
  });

  // Check triggers are installed
  var triggers = ScriptApp.getProjectTriggers();
  var hasOnEdit = triggers.some(function(t) {
    return t.getHandlerFunction() === 'onEditInstallable';
  });
  if (!hasOnEdit) {
    issues.push('Missing onEdit trigger — reinstalling');
    installTrigger_();
  }

  // Check Master Entry headers intact
  var master = ss.getSheetByName(CONFIG.MASTER_SHEET);
  if (master && master.getLastRow() > 0) {
    var headers = master.getRange(1, 1, 1, CONFIG.HEADERS.length).getValues()[0];
    if (headers.join(',') !== CONFIG.HEADERS.join(',')) {
      issues.push('Master Entry headers corrupted');
    }
  }

  // Log issues
  if (issues.length > 0) {
    Logger.log('Health check found issues: ' + issues.join('; '));
    // Optionally email admin
  } else {
    Logger.log('Health check passed');
  }

  return issues;
}
```

### Idempotent Operations
```javascript
// Every operation should be safe to run multiple times
function idempotentImport(sourceId) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) {
    Logger.log('Import already in progress');
    return;
  }

  try {
    var props = PropertiesService.getScriptProperties();
    var lastImportHash = props.getProperty('lastImportHash');

    // Compute hash of source data
    var source = SpreadsheetApp.openById(sourceId);
    var sourceData = [];
    source.getSheets().forEach(function(sh) {
      sourceData.push(sh.getDataRange().getValues());
    });
    var currentHash = Utilities.computeDigest(
      Utilities.DigestAlgorithm.MD5,
      JSON.stringify(sourceData)
    ).join('');

    if (currentHash === lastImportHash) {
      Logger.log('Source data unchanged — skipping import');
      return;
    }

    // Data changed — perform import
    performImport_(sourceData);
    props.setProperty('lastImportHash', currentHash);
    Logger.log('Import complete — hash updated');

  } finally {
    lock.releaseLock();
  }
}
```

---

## 6. Sidebar & Dialog UI Architecture

### Sidebar with Async Server Calls
```html
<!-- Sidebar.html -->
<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <style>
    body { font-family: Arial, sans-serif; padding: 10px; }
    .loading { color: #999; font-style: italic; }
    .btn { padding: 8px 16px; cursor: pointer; border: none; border-radius: 4px; }
    .btn-primary { background: #4285f4; color: white; }
  </style>
</head>
<body>
  <h3>Quick Actions</h3>
  <div id="status" class="loading">Loading...</div>
  <button class="btn btn-primary" onclick="refreshData()">Refresh</button>
  <div id="results"></div>

  <script>
    // Load data on sidebar open
    google.script.run
      .withSuccessHandler(function(data) {
        document.getElementById('status').textContent = 'Ready';
        renderResults(data);
      })
      .withFailureHandler(function(err) {
        document.getElementById('status').textContent = 'Error: ' + err.message;
      })
      .getJobSummary();

    function refreshData() {
      document.getElementById('status').textContent = 'Refreshing...';
      google.script.run
        .withSuccessHandler(function(data) {
          document.getElementById('status').textContent = 'Updated';
          renderResults(data);
        })
        .withFailureHandler(function(err) {
          document.getElementById('status').textContent = 'Error: ' + err.message;
        })
        .getJobSummary();
    }

    function renderResults(data) {
      var html = '<table>';
      data.forEach(function(row) {
        html += '<tr><td>' + row.join('</td><td>') + '</td></tr>';
      });
      html += '</table>';
      document.getElementById('results').innerHTML = html;
    }
  </script>
</body>
</html>
```

### Server-Side for Sidebar
```javascript
function showSidebar() {
  var html = HtmlService.createHtmlOutputFromFile('Sidebar')
    .setTitle('Water Delivery Tools')
    .setWidth(300);
  SpreadsheetApp.getUi().showSidebar(html);
}

function getJobSummary() {
  var master = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Master Entry');
  if (!master || master.getLastRow() < 2) return [];
  var data = master.getRange(2, 1, Math.min(master.getLastRow()-1, 100), 7).getValues();
  // Return serializable data (no Range/Sheet objects — they can't cross the boundary)
  return data.filter(function(r) { return r[2] !== '' && r[2] !== 'Job Number'; });
}
```

---

## 7. Web App as REST API

### Full CRUD API Pattern
```javascript
function doGet(e) {
  var action = e.parameter.action;
  var result;

  switch (action) {
    case 'jobs':
      result = listJobs_();
      break;
    case 'job':
      result = getJob_(e.parameter.id);
      break;
    case 'health':
      result = { status: 'ok', timestamp: new Date().toISOString() };
      break;
    default:
      return json_({ error: 'Unknown GET action' }, 400);
  }
  return json_(result);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return json_({ error: 'Server busy' }, 503);

  try {
    var body = JSON.parse(e.postData.contents);
    var result;

    switch (body.action) {
      case 'addEntry':
        result = addEntry_(body.data);
        break;
      case 'updateEntry':
        result = updateEntry_(body.id, body.data);
        break;
      default:
        return json_({ error: 'Unknown POST action' }, 400);
    }
    SpreadsheetApp.flush();
    return json_(result);
  } catch (err) {
    return json_({ error: err.message }, 500);
  } finally {
    lock.releaseLock();
  }
}

function json_(data, code) {
  var output = { code: code || 200, data: data, timestamp: new Date().toISOString() };
  return ContentService.createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}
```

---

## 8. Testing Architecture

### Test Runner with QUnitGS2
```javascript
// TestRunner.gs — deploy as separate web app for testing
function doGet() {
  QUnitGS2.init();
  registerAllTests_();
  QUnitGS2.run();
  return QUnitGS2.getHtmlOutput();
}

function registerAllTests_() {
  testModel_();
  testController_();
  testUtils_();
}

function testModel_() {
  QUnit.module('Model');
  QUnit.test('getMaster returns array', function(assert) {
    var data = Model.getMaster();
    assert.ok(Array.isArray(data));
  });
  QUnit.test('getSupplierMap returns object with string values', function(assert) {
    var map = getSupplierMap_();
    assert.ok(typeof map === 'object');
    Object.keys(map).forEach(function(key) {
      assert.ok(typeof map[key] === 'string', 'Value for ' + key + ' is string');
    });
  });
}

function testController_() {
  QUnit.module('Controller');
  QUnit.test('isHeaderRow detects headers', function(assert) {
    assert.ok(isHeaderRow_(['supplier','date','job no','doc','gal','','']));
    assert.notOk(isHeaderRow_(['hello','world','foo','','','','']));
  });
  QUnit.test('buildColMap maps correct indices', function(assert) {
    var map = buildColMap_(['supplier','date','job no','document num','gal','fresh qty','waste qty']);
    assert.equal(map.supplier, 0);
    assert.equal(map.date, 1);
    assert.equal(map.job, 2);
  });
}
```

### Mock-Based Testing (No Sheet Dependencies)
```javascript
function testUtils_() {
  QUnit.module('Utils');
  QUnit.test('withRetry retries on failure', function(assert) {
    var attempts = 0;
    var result = withRetry(function() {
      attempts++;
      if (attempts < 3) throw new Error('fail');
      return 'success';
    }, 5, 'test');
    assert.equal(result, 'success');
    assert.equal(attempts, 3);
  });
}
```

---

## 9. Production Deployment Checklist

### Before Deployment
```
□ All functions wrapped in try/catch with error logging
□ getUi() calls wrapped in try/catch (for trigger/script-editor safety)
□ LockService protecting all concurrent-write paths
□ CacheService used for expensive repeated lookups
□ No getValue/setValue in loops — all batched
□ No interleaved reads/writes
□ Trigger cleanup in all chaining functions
□ Health check trigger installed (hourly)
□ Error log sheet created (hidden)
□ SpreadsheetApp.flush() before lock release
□ All magic numbers in CONFIG object
```

### After Deployment
```
□ Run setupAll from menu (not script editor, for full UI context)
□ Verify all triggers installed (Script Editor → Triggers)
□ Test with 2+ concurrent users editing same sheet
□ Test with empty/missing sheets
□ Test import with source sheet having mid-data headers
□ Test search with non-existent job number
□ Test submit with new/existing supplier
□ Monitor error log sheet for first 24 hours
□ Verify CacheService populated (check Logs)
```

---

## 10. Tanaikech's Expert Patterns (Reference)

### Key Libraries to Know
- **RangeListApp**: Retrieve, put, and replace values using range list with A1 notation
- **FetchApp**: Create multipart/form-data for complex HTTP requests
- **ManifestsApp**: Programmatically manage appsscript.json manifests
- **GetEditType**: Determine the exact type of edit event (single cell, paste, cut, etc.)
- **TableApp**: Simplified Google Sheets Tables API management

### Expert Technique: Detecting Edit Type
```javascript
// Tanaikech's method to detect if edit was single cell, paste, cut, etc.
function onEditInstallable(e) {
  var range = e.range;
  var rows = range.getNumRows();
  var cols = range.getNumColumns();

  if (rows === 1 && cols === 1) {
    // Single cell edit
    handleSingleEdit_(e);
  } else {
    // Multi-cell paste — e.value is undefined
    handlePaste_(e, range.getValues());
  }
}
```

### Expert Technique: Hash-Based Change Detection
```javascript
// Detect whether data actually changed (not just formatting)
function hasDataChanged(sheetName) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  var data = sheet.getDataRange().getValues();
  var hash = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    JSON.stringify(data)
  ).map(function(b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');

  var cache = CacheService.getScriptCache();
  var prev = cache.get('hash_' + sheetName);
  cache.put('hash_' + sheetName, hash, 21600);
  return hash !== prev;
}
```
