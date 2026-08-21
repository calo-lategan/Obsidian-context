/**
 * 📥 IMPORT TOOL & ENTERPRISE ROUTING
 * Connects to an old season's sheet and pulls Status + Job Details into the current sheet.
 * Hosts the high-throughput Job Lookup SPA.
 */

/* legacy onOpen removed — consolidated in 05_Menu.js */

/**
 * 📥 IMPORT TOOL (SAFE MODE)
 * Connects to an old season's sheet and pulls Status + Job Details into the current sheet.
 * STRICTLY PROTECTS existing data. Will not overwrite any populated cells or rows with dates.
 */

/* legacy onOpen removed — consolidated in 05_Menu.js */

/** Menu entry: prompt for the old sheet, then import its STOCK STATUS fields. */
function importStockStatus() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    'Connect to Old Sheet',
    'Please paste the URL or ID of the OLD Season Sheet:',
    ui.ButtonSet.OK_CANCEL
  );
  if (response.getSelectedButton() !== ui.Button.OK) return;
  const input = response.getResponseText().trim();
  if (!input) return;

  let sourceId = input;
  if (input.includes("docs.google.com")) {
    const match = input.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match) sourceId = match[1];
  }

  let sourceSS;
  try { sourceSS = SpreadsheetApp.openById(sourceId); }
  catch (e) { ui.alert("❌ Error: Access denied or invalid ID.\n" + e.message); return; }

  const updates = importStockStatusFrom_(sourceSS);
  if (updates == null) return;
  if (updates > 0) {
    ui.alert(`✅ Safe Import Complete!\n\nImported data for ${updates} items into empty cells. All your existing data and dates were protected.\n\nYellow items are ready for Batch Processing!`);
  } else {
    ui.alert("⚠️ Data scanned, but no empty cells needed filling or rows were protected by existing dates.");
  }
}

/**
 * Import STOCK STATUS fields from an already-opened old-season spreadsheet.
 * Safe mode: only fills blank cells; rows with existing dates are untouched.
 * Returns the number of rows updated (null when the tabs can't be found).
 */
function importStockStatusFrom_(sourceSS) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const currentSheet = ss.getSheetByName("STOCK STATUS");
  const COLOR_PENDING_BATCH = "#ffff00"; // Yellow for batch processing

  if (!currentSheet) { notify_('Import: no STOCK STATUS tab in this file.'); return null; }
  const sourceSheet = sourceSS.getSheetByName("STOCK STATUS");
  if (!sourceSheet) { notify_('Import: no STOCK STATUS tab in the old file.'); return null; }

  ss.toast("Reading data...", "🔄 Connecting");

  // 3. Get Data & Dynamic Column Mapping
  const sourceData = sourceSheet.getDataRange().getValues();
  const currentData = currentSheet.getDataRange().getValues();

  function findCol(headers, name) {
    return headers.findIndex(h => String(h).toUpperCase().trim().includes(name.toUpperCase()));
  }

  let srcHeaderRow = 2; 
  if (findCol(sourceData[2], "PLANT") === -1) srcHeaderRow = 0;

  const srcCols = {
    plant: findCol(sourceData[srcHeaderRow], "PLANT"),
    status: findCol(sourceData[srcHeaderRow], "STATUS"),
    job: findCol(sourceData[srcHeaderRow], "JOB"),
    client: findCol(sourceData[srcHeaderRow], "CLIENT"),
    project: findCol(sourceData[srcHeaderRow], "PROJECT"),
    start: findCol(sourceData[srcHeaderRow], "START"),
    end: findCol(sourceData[srcHeaderRow], "END")
  };

  if (srcCols.plant === -1 || srcCols.status === -1) {
    notify_("Import: could not find 'PLANT NO' or 'STATUS' columns in the old sheet.");
    return null;
  }

  // 4. Build Data Map from Old Sheet
  let dataMap = new Map();
  for (let i = srcHeaderRow + 1; i < sourceData.length; i++) {
    let id = String(sourceData[i][srcCols.plant]).trim();
    if (id) {
      dataMap.set(id, {
        status: sourceData[i][srcCols.status],
        job: srcCols.job > -1 ? sourceData[i][srcCols.job] : "",
        client: srcCols.client > -1 ? sourceData[i][srcCols.client] : "",
        project: srcCols.project > -1 ? sourceData[i][srcCols.project] : "",
        start: srcCols.start > -1 ? sourceData[i][srcCols.start] : "",
        end: srcCols.end > -1 ? sourceData[i][srcCols.end] : ""
      });
    }
  }

  // 5. Map Current Sheet Columns
  const curCols = {
    plant: findCol(currentData[2], "PLANT"),   
    status: findCol(currentData[2], "STATUS"), 
    job: findCol(currentData[2], "JOB"),       
    client: findCol(currentData[2], "CLIENT"), 
    project: findCol(currentData[2], "PROJECT"),
    start: findCol(currentData[2], "START"),   
    end: findCol(currentData[2], "END")        
  };

  if (curCols.plant === -1) curCols.plant = 2;
  if (curCols.status === -1) curCols.status = 3;

  // 6. Prepare Batch Updates
  let updates = 0;
  let numRows = currentSheet.getLastRow() - 3;
  if (numRows < 1) return 0;

  let newStatus = [], newJob = [], newClient = [], newProject = [], newStart = [], newEnd = [];
  
  let rangeStatus = currentSheet.getRange(4, curCols.status + 1, numRows, 1);
  let rangeJob = currentSheet.getRange(4, curCols.job + 1, numRows, 1);
  let rangeClient = currentSheet.getRange(4, curCols.client + 1, numRows, 1);
  let rangeProject = currentSheet.getRange(4, curCols.project + 1, numRows, 1);
  let rangeStart = currentSheet.getRange(4, curCols.start + 1, numRows, 1);
  let rangeEnd = currentSheet.getRange(4, curCols.end + 1, numRows, 1);

  let valStatus = rangeStatus.getValues();
  let bgStatus = rangeStatus.getBackgrounds();
  let valJob = rangeJob.getValues();
  let valClient = rangeClient.getValues();
  let valProject = rangeProject.getValues();
  let valStart = rangeStart.getValues();
  let valEnd = rangeEnd.getValues();

  for (let i = 0; i < numRows; i++) {
    let currentRowIndex = i + 3;
    if (currentRowIndex >= currentData.length) break;

    let id = String(currentData[currentRowIndex][curCols.plant]).trim();
    let oldData = dataMap.get(id);

    // --- ROW LEVEL PROTECTION ---
    // Check if the current row already has a Start OR End date filled in
    let curStartStr = String(valStart[i][0]).trim();
    let curEndStr = String(valEnd[i][0]).trim();
    let hasExistingDates = (curStartStr !== "" || curEndStr !== "");

    // If old data exists AND the row doesn't have existing dates blocking it
    if (oldData && !hasExistingDates) {
      let isRowUpdated = false;

      // STATUS: Only apply if current status is empty or "AVAILABLE"
      let curStatusStr = String(valStatus[i][0]).trim();
      if (oldData.status && (curStatusStr === "" || curStatusStr === "AVAILABLE")) { 
         newStatus.push([oldData.status]);
         
         // Highlight for Batch Processor if it's an active booking
         if (oldData.status !== "AVAILABLE") {
             bgStatus[i][0] = COLOR_PENDING_BATCH;
         }
         isRowUpdated = true;
      } else { 
         newStatus.push([valStatus[i][0]]); 
      }

      // --- CELL LEVEL PROTECTION (NO OVERWRITING) ---
      // Only import if old data exists AND the current cell is completely blank
      
      if (oldData.job && !String(valJob[i][0]).trim()) { newJob.push([oldData.job]); isRowUpdated = true; } 
      else { newJob.push([valJob[i][0]]); }

      if (oldData.client && !String(valClient[i][0]).trim()) { newClient.push([oldData.client]); isRowUpdated = true; } 
      else { newClient.push([valClient[i][0]]); }

      if (oldData.project && !String(valProject[i][0]).trim()) { newProject.push([oldData.project]); isRowUpdated = true; } 
      else { newProject.push([valProject[i][0]]); }

      if (oldData.start && !curStartStr) { newStart.push([oldData.start]); isRowUpdated = true; } 
      else { newStart.push([valStart[i][0]]); }

      if (oldData.end && !curEndStr) { newEnd.push([oldData.end]); isRowUpdated = true; } 
      else { newEnd.push([valEnd[i][0]]); }

      if (isRowUpdated) updates++;

    } else {
      // Data is protected by dates OR no matching old data found. Keep current values exactly as they are.
      newStatus.push([valStatus[i][0]]);
      newJob.push([valJob[i][0]]);
      newClient.push([valClient[i][0]]);
      newProject.push([valProject[i][0]]);
      newStart.push([valStart[i][0]]);
      newEnd.push([valEnd[i][0]]);
    }
  }

  // 7. Write Back to Sheet
  if (updates > 0) {
    rangeStatus.setValues(newStatus);
    rangeStatus.setBackgrounds(bgStatus);
    rangeJob.setValues(newJob);
    rangeClient.setValues(newClient);
    rangeProject.setValues(newProject);
    rangeStart.setValues(newStart);
    rangeEnd.setValues(newEnd);
  }
  return updates;
}

// =====================================================================
// ⚡ ENTERPRISE JOB LOOKUP (V10: Realtime Sync & Pure Color-Status Engine)
// =====================================================================

/**
 * Advanced Cache Management: Google's CacheService is limited to 100KB per string.
 * This helper chunks large JSON payloads to safely bypass that limit.
 */
function setChunkedCache(key, value) {
  const cache = CacheService.getDocumentCache();
  if(!cache) return;
  const chunkSize = 100000;
  const chunks = [];
  for (let i = 0; i < value.length; i += chunkSize) {
    chunks.push(value.substring(i, i + chunkSize));
  }
  const cacheObj = {};
  cacheObj[`${key}_count`] = chunks.length.toString();
  chunks.forEach((chunk, index) => cacheObj[`${key}_${index}`] = chunk);
  cache.putAll(cacheObj, 21600); // Expires in 6 hours
}

function getChunkedCache(key) {
  const cache = CacheService.getDocumentCache();
  if(!cache) return null;
  const countStr = cache.get(`${key}_count`);
  if (!countStr) return null;
  const count = parseInt(countStr, 10);
  const keys = [];
  for (let i = 0; i < count; i++) keys.push(`${key}_${i}`);
  const chunkMap = cache.getAll(keys);
  let result = "";
  for (let i = 0; i < count; i++) result += chunkMap[`${key}_${i}`] || "";
  return result;
}

/**
 * Serves the SPA UI Framework.
 * Achieves 0ms latency by injecting ONLY the existing cache on load.
 */
function openJobLookupSPA() {
  const template = HtmlService.createTemplateFromFile('JobLookup_UI');
  
  // Instantly load existing cache so the UI opens immediately without waiting.
  let payload = getChunkedCache('ENTERPRISE_JOB_CACHE');
  template.dbPayload = payload ? payload : "{}";

  const html = template.evaluate()
    .setWidth(1200)
    .setHeight(650)
    .setTitle('Enterprise Job Routing');
  SpreadsheetApp.getUi().showModalDialog(html, 'Job & Plant Router');
}

/**
 * V10 Real-Time Sync: Called asynchronously from the UI.
 * The 'true' flag forces the engine to bypass the cache, read the live sheet,
 * and push the absolute newest data back to the user instantly.
 */
function syncJobRoutingCache() {
  return buildJobRoutingCache(true);
}

/**
 * V10 Data Engine: 
 * 1. Status strictly defined by Matrix Background Color (ignores text statuses).
 * 2. Groups strictly by pure Job Number (e.g. 60626).
 * 3. Auto-formats all " - " separators to " | " for superior UI consistency.
 */
function buildJobRoutingCache(forceSync = false) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('ERP LIST') || ss.getSheetByName('SS 2026 - 2027 SEASON STOCK  - ERP LIST');
  if (!sheet) return "{}";

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 4 || lastCol < 7) return "{}";

  // Fetch existing cache for Differential Update
  let oldCacheStr = getChunkedCache('ENTERPRISE_JOB_CACHE');
  let currentCache = {};
  if (oldCacheStr && oldCacheStr !== "{}") {
    try { currentCache = JSON.parse(oldCacheStr); } catch(e) {}
  }

  const dataRange = sheet.getRange(1, 1, lastRow, lastCol);
  const data = dataRange.getDisplayValues(); 
  const backgrounds = dataRange.getBackgrounds();
  const merges = dataRange.getMergedRanges();

  // EXPLODE MERGED CELLS (Shares the top-left value & color to all cells in the merge)
  for (let i = 0; i < merges.length; i++) {
    const m = merges[i];
    const mRow = m.getRow() - 1; 
    const mCol = m.getColumn() - 1;
    const mRows = m.getNumRows();
    const mCols = m.getNumColumns();

    const masterVal = data[mRow][mCol];
    const masterBg = backgrounds[mRow][mCol];

    for (let r = 0; r < mRows; r++) {
      for (let c = 0; c < mCols; c++) {
        data[mRow + r][mCol + c] = masterVal;
        backgrounds[mRow + r][mCol + c] = masterBg;
      }
    }
  }

  const dateHeaders = data[2]; 
  const jobMapByJobId = {}; // Group strictly by the core ID (e.g., '60626')
  const jobIdToStandardName = {}; // Tracks the prioritized formatted string

  const saveJobSpan = (jobId, plantNo, desc, startCol, endCol, statusStr) => {
    if (!jobMapByJobId[jobId]) jobMapByJobId[jobId] = {};
    
    const startDateStr = String(dateHeaders[startCol]).trim();
    const endDateStr = String(dateHeaders[endCol]).trim();

    if (!jobMapByJobId[jobId][plantNo]) {
      jobMapByJobId[jobId][plantNo] = {
        plant: plantNo,
        desc: desc,
        start: startDateStr,
        end: endDateStr,
        status: statusStr,
        _sc: startCol,
        _ec: endCol
      };
    } else {
      if (startCol < jobMapByJobId[jobId][plantNo]._sc) {
        jobMapByJobId[jobId][plantNo]._sc = startCol;
        jobMapByJobId[jobId][plantNo].start = startDateStr;
      }
      if (endCol > jobMapByJobId[jobId][plantNo]._ec) {
        jobMapByJobId[jobId][plantNo]._ec = endCol;
        jobMapByJobId[jobId][plantNo].end = endDateStr;
      }
    }
  };

  for (let i = 3; i < data.length; i++) {
    const desc = String(data[i][1]).trim();
    const plantNo = String(data[i][5]).trim();
    
    if (!plantNo) continue; 

    let currentJobId = null;
    let currentStartCol = -1;
    let currentStatus = "";

    for (let j = 6; j < data[i].length; j++) {
      let cellValue = String(data[i][j]).trim();
      let bgColor = String(backgrounds[i][j]).toLowerCase().trim();

      // V10 FIX: Status is 100% determined by the Cell Color from Calendar control.gs
      let isBooked = false;
      let statusName = "";

      if (bgColor === '#00ffff') { statusName = "BOOKED / ON HIRE"; isBooked = true; }
      else if (bgColor === '#ff00ff') { statusName = "QUOTE"; isBooked = true; }
      else if (bgColor === '#ff0000') { statusName = "SERVICE"; isBooked = true; }
      else if (bgColor === '#ff9900') { statusName = "SOLD TO KSA"; isBooked = true; }
      else if (bgColor === '#cc0000') { statusName = "IN KSA"; isBooked = true; }
      else if (bgColor === '#4f81bd') { statusName = "LOGISTICS"; isBooked = true; }
      else if (bgColor === '#ffff00') { statusName = "PENDING BATCH"; isBooked = true; }
      // Catch manually colored cells that don't perfectly match the hex
      else if (bgColor !== '#ffffff' && bgColor !== 'white' && bgColor !== '') { 
        statusName = `UNKNOWN (${bgColor})`; 
        isBooked = true; 
      }

      if (isBooked && cellValue !== "" && cellValue !== "AVAILABLE" && cellValue !== "OFF HIRE") {
        
        // 1. Isolate the core ID ("60626") ignoring everything after dashes or pipes
        let jobId = cellValue.split(/[-|]/)[0].trim();

        // 2. Build the Perfect String: Convert all "-" to "|" globally
        let perfectJobString = cellValue.replace(/\s*-\s*/g, " | ").replace(/\r?\n|\r/g, " ").trim();

        // 3. Save the longest/most detailed version of the string to represent this Job ID
        if (!jobIdToStandardName[jobId] || perfectJobString.length > jobIdToStandardName[jobId].length) {
          jobIdToStandardName[jobId] = perfectJobString;
        }

        if (currentJobId !== jobId || currentStatus !== statusName) {
          if (currentJobId) {
             saveJobSpan(currentJobId, plantNo, desc, currentStartCol, j - 1, currentStatus);
          }
          currentJobId = jobId;
          currentStartCol = j;
          currentStatus = statusName;
        }
      } 
      else if (!isBooked) {
        if (currentJobId) {
           saveJobSpan(currentJobId, plantNo, desc, currentStartCol, j - 1, currentStatus);
           currentJobId = null;
           currentStatus = "";
        }
      }
    }
    
    if (currentJobId) {
       saveJobSpan(currentJobId, plantNo, desc, currentStartCol, data[i].length - 1, currentStatus);
    }
  }

  // Format the final dictionary using the Superior Standardized Name
  const newOutput = {};
  for (const [jobId, plantsObj] of Object.entries(jobMapByJobId)) {
    const finalFormattedName = jobIdToStandardName[jobId] || jobId;
    newOutput[finalFormattedName] = Object.values(plantsObj).map(p => ({
      plant: p.plant,
      desc: p.desc,
      start: p.start,
      end: p.end,
      status: p.status
    }));
  }

  // V10: Smart Diffing & Real-Time Sync Override
  let hasChanges = false;

  // Update changed/new keys
  for (const key in newOutput) {
    if (JSON.stringify(currentCache[key]) !== JSON.stringify(newOutput[key])) {
      currentCache[key] = newOutput[key];
      hasChanges = true;
    }
  }

  // Remove deleted keys
  for (const key in currentCache) {
    if (!newOutput[key]) {
      delete currentCache[key];
      hasChanges = true;
    }
  }

  // If forceSync is true (called via UI while typing), ALWAYS return the absolute live data
  if (forceSync || hasChanges || !oldCacheStr || oldCacheStr === "{}") {
    const finalJson = JSON.stringify(newOutput);
    setChunkedCache('ENTERPRISE_JOB_CACHE', finalJson);
    return finalJson;
  }

  return oldCacheStr; // Instantly return unmodified cache if nothing changed on background loads
}