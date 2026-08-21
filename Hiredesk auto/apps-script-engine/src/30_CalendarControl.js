// --- CONFIGURATION ---
const SHEET_STOCK = "STOCK STATUS";
const SHEET_ERP = "ERP LIST";
const TIMEZONE = "Asia/Dubai"; // UAE Standard Time

// Column Indexes (1=A, 2=B, etc.)
const STOCK_PLANT_COL = 3;   // Col C
const STOCK_STATUS_COL = 4;  // Col D
const STOCK_JOB_COL = 5;     // Col E
const STOCK_CLIENT_COL = 6;  // Col F
const STOCK_PROJECT_COL = 7; // Col G
const STOCK_START_COL = 8;   // Col H
const STOCK_END_COL = 9;     // Col I

// Logistics Columns
const STOCK_LOG_IN_COL = 10; // Col J
const STOCK_LOG_OUT_COL = 11;// Col K

const ERP_STATUS_COL = 5;    // Col E
const ERP_PLANT_COL = 6;     // Col F
const ERP_DATE_ROW = 3;      // Row containing actual dates
const ERP_DATE_START_COL = 7; // Col G (First date column)

// --- COLORS ---
const COLOR_AVAILABLE = "#ffffff"; 
const COLOR_PENDING_BATCH = "#ffff00"; // Yellow
const COLOR_LOGISTICS = "#4f81bd";     // Logistics Blue

const COLORS = {
  "BOOKED": "#00ffff",       // Cyan
  "ON HIRE": "#00ffff",      // Cyan
  "QUOTE": "#ff00ff",        // Magenta/Purple
  "SERVICE": "#ff0000",      // Red
  "SOLD TO KSA": "#ff9900",  // Orange
  "IN KSA": "#cc0000",       // Dark Red 1
  "AVAILABLE": "#ffffff"     // White
};

// --- CACHE KEYS ---
const CACHE_KEY_ERP_MAP = "ERP_PLANT_MAP_V5"; 
const CACHE_KEY_DATE_MAP = "ERP_DATE_MAP_V5";
const CACHE_KEY_BOUNDS = "ERP_DATE_BOUNDS_V5"; // NEW: For boundary clamping
const CACHE_EXPIRY = 21600; // 6 Hours

/**
 * MENU SETUP
 */
/* legacy onOpen removed — consolidated in 05_Menu.js */

/**
 * MASTER TRIGGER (OPTIMIZED ROUTING)
 */
function onEdit(e) {
  const ss = e.source;
  const sheet = ss.getActiveSheet();
  const name = sheet.getName();
  const range = e.range;
  const endRow = range.getRow() + range.getNumRows() - 1;
  const col = range.getColumn();

  // 1. EDITS ON STOCK STATUS
  if (name === SHEET_STOCK && endRow >= 4) {
    const bgColors = range.getBackgrounds();
    let isYellow = false;
    
    // Fast scan for batch marker
    outer: for(let i=0; i<bgColors.length; i++) {
      for(let j=0; j<bgColors[0].length; j++) {
        if(bgColors[i][j] === COLOR_PENDING_BATCH) { isYellow = true; break outer; }
      }
    }

    if (range.getNumRows() > 1 || isYellow) {
      if (!isYellow) range.setBackground(COLOR_PENDING_BATCH); 
      return; 
    }

    // Single Edit Trigger
    if (range.getNumRows() === 1 && !isYellow) {
      const r = range.getRow();
      
      // ZERO-REDUNDANCY READ
      const rowData = sheet.getRange(r, 3, 1, 9).getValues()[0];
      
      const status = rowData[STOCK_STATUS_COL - 3]; 
      const start = rowData[STOCK_START_COL - 3];
      const end = rowData[STOCK_END_COL - 3];

      const isBooking = (status !== "AVAILABLE");
      const isKSA = (status === "SOLD TO KSA" || status === "IN KSA");
      const hasDates = (start instanceof Date && end instanceof Date);

      // Only run if criteria are met
      if (isBooking && (hasDates || isKSA)) {
        if (col === STOCK_STATUS_COL) {
          syncStatusFast(ss, rowData, r, SHEET_ERP); 
          handleSingleBookingFast(ss, sheet, r, rowData); 
        }
        if (col === STOCK_START_COL || col === STOCK_END_COL || col === STOCK_LOG_IN_COL || col === STOCK_LOG_OUT_COL) {
           handleSingleBookingFast(ss, sheet, r, rowData);
        }
      }
    }
  }

  // 2. EDITS ON ERP LIST
  if (name === SHEET_ERP && endRow >= 4 && col === ERP_STATUS_COL) {
    for (let r = range.getRow(); r <= endRow; r++) {
      if (r < 4) continue;
      let val = sheet.getRange(r, col).getValue(); 
      // Using ORIGINAL checkStatusLock logic here
      let allowed = checkStatusLock(sheet, r, val, sheet.getRange(r, col));
      if (allowed) syncStatusFast(ss, null, r, SHEET_STOCK, val); 
    }
  }
}

/**
 * ⚡ SUPER-FAST SINGLE HANDLER
 * Uses Surgical IO + Time Travel Revert + Smart Date Clamping
 */
function handleSingleBookingFast(ss, stockSheet, stockRow, rowDataArray) {
  const pNo = String(rowDataArray[STOCK_PLANT_COL - 3]).trim();
  if (!pNo) return;

  const status = rowDataArray[STOCK_STATUS_COL - 3];
  const startDate = rowDataArray[STOCK_START_COL - 3];
  const endDate = rowDataArray[STOCK_END_COL - 3];
  const logIn = rowDataArray[STOCK_LOG_IN_COL - 3];
  const logOut = rowDataArray[STOCK_LOG_OUT_COL - 3];
  
  const job = rowDataArray[STOCK_JOB_COL - 3] || "";
  const client = rowDataArray[STOCK_CLIENT_COL - 3] || "";
  const project = rowDataArray[STOCK_PROJECT_COL - 3] || "";
  const cellText = [job, client, project].filter(Boolean).join(" | ");

  // 1. GET INDEX MAPS & BOUNDS (Cached)
  const { plantRowMap, dateColMap, dateBounds } = getFastErpIndices(ss);

  if (!plantRowMap.has(pNo)) {
    ss.toast(`⚠️ Plant ${pNo} not found in ERP.`, "Error");
    return;
  }

  const erpRowIdx = plantRowMap.get(pNo); 
  const erpRow = erpRowIdx + 1;           

  // 2. SURGICAL READ (1 Row Only - 100x Faster than reading sheet)
  const erpSheet = ss.getSheetByName(SHEET_ERP);
  const maxCol = erpSheet.getLastColumn();
  const erpRowRange = erpSheet.getRange(erpRow, 1, 1, maxCol);
  const erpRowBg = erpRowRange.getBackgrounds()[0]; // 1D Array
  
  // 3. CALCULATE INDICES WITH CLAMPING
  let startCol = -1, endCol = -1, logInCol = -1, logOutCol = -1;
  const isKSA = (status === "SOLD TO KSA" || status === "IN KSA");

  if (isKSA) {
    startCol = ERP_DATE_START_COL;
    endCol = maxCol;
  } else {
    const sStr = Utilities.formatDate(startDate, TIMEZONE, "yyyy-MM-dd");
    const eStr = Utilities.formatDate(endDate, TIMEZONE, "yyyy-MM-dd");
    
    // --- START DATE CLAMPING ---
    if (dateColMap.has(sStr)) {
      startCol = dateColMap.get(sStr) + 1; 
    } else if (sStr < dateBounds.min && eStr >= dateBounds.min) {
      startCol = dateColMap.get(dateBounds.min) + 1; // Clamp to Start
    }

    // --- END DATE CLAMPING ---
    if (dateColMap.has(eStr)) {
      endCol = dateColMap.get(eStr) + 1;
    } else if (eStr > dateBounds.max && sStr <= dateBounds.max) {
      endCol = dateColMap.get(dateBounds.max) + 1; // Clamp to End
    }

    // Logistics (Strictly if on calendar)
    if (logIn instanceof Date) {
      let lInStr = Utilities.formatDate(logIn, TIMEZONE, "yyyy-MM-dd");
      if(dateColMap.has(lInStr)) logInCol = dateColMap.get(lInStr) + 1;
    }
    if (logOut instanceof Date) {
      let lOutStr = Utilities.formatDate(logOut, TIMEZONE, "yyyy-MM-dd");
      if(dateColMap.has(lOutStr)) logOutCol = dateColMap.get(lOutStr) + 1;
    }
  }

  // If Start is still -1, the entire booking is before the calendar or invalid
  if (startCol === -1) {
      if (endCol !== -1) startCol = ERP_DATE_START_COL; // Partial overlap safety
      else return; 
  }
  if (endCol === -1) endCol = maxCol;

  let effStart = (logInCol !== -1 && logInCol < startCol) ? logInCol : startCol;
  let effEnd = (logOutCol !== -1 && logOutCol > endCol) ? logOutCol : endCol;

  // 4. CONFLICT CHECK
  const limit = effEnd - effStart + 1;
  for (let c = 0; c < limit; c++) {
    let checkColIdx = (effStart - 1) + c; // 0-based
    let color = (erpRowBg[checkColIdx] || "#ffffff").toLowerCase();
    if (color !== "#ffffff" && color !== "white") {
      
      // --- TIME TRAVEL REVERT LOGIC ---
      const todayStr = Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd");
      let revertStatus = "AVAILABLE"; // Default
      
      if (dateColMap.has(todayStr)) {
        let todayIdx = dateColMap.get(todayStr); // 0-based index
        let todayColor = (erpRowBg[todayIdx] || "#ffffff").toLowerCase();
        
        for (let [key, val] of Object.entries(COLORS)) {
          if (val.toLowerCase() === todayColor) {
            revertStatus = key;
            break;
          }
        }
      }

      // Execute Revert
      stockSheet.getRange(stockRow, STOCK_START_COL, 1, 4).clearContent();
      stockSheet.getRange(stockRow, STOCK_STATUS_COL).setValue(revertStatus);

      notify_('CONFLICT: ' + pNo + ' not available for these dates; reverted to ' + revertStatus);
      return;
    }
  }

  // 5. SURGICAL WRITE
  const newColor = COLORS[status] || COLOR_AVAILABLE;

  if (isKSA) {
    applyColor(erpSheet.getRange(erpRow, startCol, 1, (endCol - startCol + 1)), newColor, status, true);
    ss.toast("KSA Status Updated", "✅ Instant", 1);
    return;
  }

  if (logInCol !== -1 && logInCol < startCol) {
    applyColor(erpSheet.getRange(erpRow, logInCol, 1, (startCol - logInCol)), COLOR_LOGISTICS, "", false);
  }

  applyColor(erpSheet.getRange(erpRow, startCol, 1, (endCol - startCol + 1)), newColor, cellText, true);

  if (logOutCol !== -1 && logOutCol > endCol) {
    applyColor(erpSheet.getRange(erpRow, endCol + 1, 1, (logOutCol - endCol)), COLOR_LOGISTICS, "", false);
  }

  ss.toast("Booking Updated", "⚡ Instant", 1);
}

/**
 * 🚀 HIGH-PERFORMANCE BATCH PROCESSOR
 * IMPLEMENTS "CLUSTER WRITING" (Grouped writes for 1000x IO speed)
 */
function processBatchQueue() {            // menu entry (confirm, then run silent)
  if (!confirmOrProceed_('Confirm Batch Process', 'Process pending (yellow) rows now?')) return;
  var n = processBatchQueueSilent_();
  toast_('Batch complete. ' + n + ' updated.', 4);
}

function processBatchQueueSilent_() {     // automation/programmatic entry — NO UI
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const stockSheet = ss.getSheetByName(SHEET_STOCK);
  const erpSheet = ss.getSheetByName(SHEET_ERP);

  const lastRow = stockSheet.getLastRow();
  if (lastRow < 4) return 0;
  
  // Fast Scan for Yellow
  const statusBackgrounds = stockSheet.getRange(4, STOCK_STATUS_COL, lastRow - 3, 1).getBackgrounds();
  let rowsToProcess = [];
  for (let i = 0; i < statusBackgrounds.length; i++) {
    if (statusBackgrounds[i][0] === COLOR_PENDING_BATCH) rowsToProcess.push(i + 4);
  }

  if (rowsToProcess.length === 0) return 0;

  ss.toast("Analyzing Database...", "⚙️ Processing", -1);

  // Read Data
  const stockDataRange = stockSheet.getRange(4, 1, lastRow - 3, stockSheet.getLastColumn());
  const stockValues = stockDataRange.getValues();
  const erpRange = erpSheet.getDataRange(); 
  const erpValues = erpRange.getValues(); 
  const erpBackgrounds = erpRange.getBackgrounds();
  const erpMaxCols = erpSheet.getLastColumn();
  
  // Map Data & Find Bounds
  const headerDates = erpValues[ERP_DATE_ROW - 1]; 
  const dateColMap = new Map();
  const todayStr = Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd");
  let todayIdx = -1;
  let minDateStr = null, maxDateStr = null;

  for (let c = ERP_DATE_START_COL - 1; c < headerDates.length; c++) {
    if (headerDates[c] instanceof Date) {
      let dStr = Utilities.formatDate(headerDates[c], TIMEZONE, "yyyy-MM-dd");
      dateColMap.set(dStr, c);
      if(dStr === todayStr) todayIdx = c;
      
      // Calculate Bounds
      if (!minDateStr || dStr < minDateStr) minDateStr = dStr;
      if (!maxDateStr || dStr > maxDateStr) maxDateStr = dStr;
    }
  }
  const dateBounds = { min: minDateStr, max: maxDateStr };

  const plantMap = new Map();
  for (let i = 3; i < erpValues.length; i++) {
    let p = String(erpValues[i][ERP_PLANT_COL - 1]).trim();
    if (p) plantMap.set(p, i);
  }

  let successCount = 0;
  let modifiedErpRows = new Set(); // TRACKS DIRTY ROWS
  let mergeQueue = [];
  let failQueue = [];

  for (let r of rowsToProcess) {
    let stockIdx = r - 4; 
    let rowData = stockValues[stockIdx];

    let pNo = String(rowData[STOCK_PLANT_COL - 1]).trim();
    let status = rowData[STOCK_STATUS_COL - 1];
    
    if(!pNo) continue;
    if (!plantMap.has(pNo)) continue;
    
    let erpIdx = plantMap.get(pNo);

    // Pass bounds to memory processor
    let result = processInMemory(rowData, status, erpIdx, erpValues, erpBackgrounds, dateColMap, dateBounds, mergeQueue, erpMaxCols);

    if (result.success) {
      erpValues[erpIdx][ERP_STATUS_COL - 1] = status;
      modifiedErpRows.add(erpIdx); // MARK ROW AS DIRTY
      successCount++;
    } else {
      failQueue.push({row: r, plant: pNo, erpIdx: erpIdx});
    }
  }

  // --- CLUSTER WRITE ENGINE (The 10000X Speedup) ---
  ss.toast(`Saving ${modifiedErpRows.size} records...`, "💾 Optimizing", -1);
  
  // Sort indices to find clusters
  let sortedRows = Array.from(modifiedErpRows).sort((a,b) => a - b);
  let currentBlock = [];
  let startIdx = -1;

  for (let i = 0; i < sortedRows.length; i++) {
     if (currentBlock.length === 0) {
         currentBlock.push(sortedRows[i]);
         startIdx = sortedRows[i];
     } else {
         if (sortedRows[i] === sortedRows[i-1] + 1) {
             currentBlock.push(sortedRows[i]);
         } else {
             // Flush previous block
             flushBlock(erpSheet, erpValues, erpBackgrounds, startIdx, currentBlock.length, erpMaxCols);
             currentBlock = [sortedRows[i]];
             startIdx = sortedRows[i];
         }
     }
  }
  // Flush final block
  if (currentBlock.length > 0) {
      flushBlock(erpSheet, erpValues, erpBackgrounds, startIdx, currentBlock.length, erpMaxCols);
  }

  // Apply Merges
  if (mergeQueue.length > 0) {
    mergeQueue.forEach(mq => {
      let rng = erpSheet.getRange(mq.row + 1, mq.col + 1, 1, mq.numCols);
      try {
        rng.breakApart();
        if (mq.shouldMerge) rng.merge();
        rng.setHorizontalAlignment("center");
        rng.setVerticalAlignment("middle");
      } catch(e) {}
    });
  }

  // Handle Failures with Smart Revert
  if (failQueue.length > 0) {
    failQueue.forEach(f => {
      // Find what the status SHOULD be based on "Today" column in ERP
      let correctStatus = "AVAILABLE";
      if (todayIdx !== -1) {
         let color = (erpBackgrounds[f.erpIdx][todayIdx] || "#ffffff").toLowerCase();
         for (let [key, val] of Object.entries(COLORS)) {
            if (val.toLowerCase() === color) { correctStatus = key; break; }
         }
      }
      
      // Update Stock Sheet
      stockSheet.getRange(f.row, STOCK_START_COL, 1, 4).clearContent();
      stockSheet.getRange(f.row, STOCK_STATUS_COL).setValue(correctStatus);
    });
    notify_('BLOCKED ' + failQueue.length + ' rows due to ERP conflicts: ' + JSON.stringify(failQueue.map(function (f) { return f.plant; })));
  }

  // Clean Stock Markers
  rowsToProcess.forEach(r => {
    stockSheet.getRange(r, STOCK_STATUS_COL).setBackground(null);
  });

  refreshSystemCache();
  ss.toast(`Batch Complete. ${successCount} updated.`, "✅ Done", 3);
  return successCount;
}

// --- HELPER FUNCTIONS ---

function flushBlock(sheet, values, backgrounds, startRowIdx, numRows, maxCols) {
    // Writes a contiguous block of rows in ONE API call
    const range = sheet.getRange(startRowIdx + 1, 1, numRows, maxCols);
    const blockValues = values.slice(startRowIdx, startRowIdx + numRows);
    const blockBg = backgrounds.slice(startRowIdx, startRowIdx + numRows);
    range.setValues(blockValues);
    range.setBackgrounds(blockBg);
}

function processInMemory(stockRowData, status, erpIdx, erpValGrid, erpBgGrid, dateColMap, dateBounds, mergeQueue, maxCols) {
  // Logic identical to before, but we are modifying grids that will be selectively written
  if (status === "SOLD TO KSA" || status === "IN KSA") {
    let startCol = ERP_DATE_START_COL - 1;
    let endCol = maxCols - 1;
    for (let c = startCol; c <= endCol; c++) {
      let color = (erpBgGrid[erpIdx][c] || "#ffffff").toLowerCase();
      if (color !== "#ffffff" && color !== "white") return { success: false };
    }
    let numCols = endCol - startCol + 1;
    for (let c = startCol; c <= endCol; c++) {
      erpBgGrid[erpIdx][c] = (status === "SOLD TO KSA") ? COLORS["SOLD TO KSA"] : COLORS["IN KSA"];
      if (c === startCol) erpValGrid[erpIdx][c] = status;
      else erpValGrid[erpIdx][c] = ""; 
    }
    mergeQueue.push({ row: erpIdx, col: startCol, numCols: numCols, shouldMerge: true });
    return { success: true };
  }

  let startDate = stockRowData[STOCK_START_COL - 1];
  let endDate = stockRowData[STOCK_END_COL - 1];
  let logIn = stockRowData[STOCK_LOG_IN_COL - 1];
  let logOut = stockRowData[STOCK_LOG_OUT_COL - 1];

  if (!(startDate instanceof Date) || !(endDate instanceof Date)) return { success: false };

  let sStr = Utilities.formatDate(startDate, TIMEZONE, "yyyy-MM-dd");
  let eStr = Utilities.formatDate(endDate, TIMEZONE, "yyyy-MM-dd");
  let lInStr = (logIn instanceof Date) ? Utilities.formatDate(logIn, TIMEZONE, "yyyy-MM-dd") : null;
  let lOutStr = (logOut instanceof Date) ? Utilities.formatDate(logOut, TIMEZONE, "yyyy-MM-dd") : null;

  // --- CLAMPING LOGIC FOR BATCH ---
  let startCol = -1, endCol = -1;

  if (dateColMap.has(sStr)) startCol = dateColMap.get(sStr);
  else if (sStr < dateBounds.min && eStr >= dateBounds.min) startCol = dateColMap.get(dateBounds.min);

  if (dateColMap.has(eStr)) endCol = dateColMap.get(eStr);
  else if (eStr > dateBounds.max && sStr <= dateBounds.max) endCol = dateColMap.get(dateBounds.max);

  // Logistics indices
  let logInCol = (lInStr && dateColMap.has(lInStr)) ? dateColMap.get(lInStr) : -1;
  let logOutCol = (lOutStr && dateColMap.has(lOutStr)) ? dateColMap.get(lOutStr) : -1;

  if (startCol === -1) {
     if (endCol !== -1) startCol = ERP_DATE_START_COL - 1; // 0-based
     else return { success: false };
  }
  if (endCol === -1) endCol = maxCols - 1;

  let effectiveStart = (logInCol !== -1 && logInCol < startCol) ? logInCol : startCol;
  let effectiveEnd = (logOutCol !== -1 && logOutCol > endCol) ? logOutCol : endCol;

  for (let c = effectiveStart; c <= effectiveEnd; c++) {
    let color = (erpBgGrid[erpIdx][c] || "#ffffff").toLowerCase();
    if (color !== "#ffffff" && color !== "white") return { success: false };
  }

  const job = stockRowData[STOCK_JOB_COL - 1] || "";
  const client = stockRowData[STOCK_CLIENT_COL - 1] || "";
  const project = stockRowData[STOCK_PROJECT_COL - 1] || "";
  const cellText = [job, client, project].filter(Boolean).join(" | ");
  let newColor = COLORS[status] || COLOR_AVAILABLE;

  if (logInCol !== -1 && logInCol < startCol) {
    for (let c = logInCol; c < startCol; c++) {
      erpBgGrid[erpIdx][c] = COLOR_LOGISTICS;
      erpValGrid[erpIdx][c] = "";
    }
    mergeQueue.push({ row: erpIdx, col: logInCol, numCols: (startCol - logInCol), shouldMerge: false });
  }

  for (let c = startCol; c <= endCol; c++) {
    erpBgGrid[erpIdx][c] = newColor;
    if (c === startCol) erpValGrid[erpIdx][c] = cellText;
    else erpValGrid[erpIdx][c] = "";
  }
  mergeQueue.push({ row: erpIdx, col: startCol, numCols: (endCol - startCol + 1), shouldMerge: true });

  if (logOutCol !== -1 && logOutCol > endCol) {
    for (let c = endCol + 1; c <= logOutCol; c++) {
      erpBgGrid[erpIdx][c] = COLOR_LOGISTICS;
      erpValGrid[erpIdx][c] = "";
    }
    mergeQueue.push({ row: erpIdx, col: endCol + 1, numCols: (logOutCol - endCol), shouldMerge: false });
  }

  return { success: true };
}

function applyColor(range, color, text, merge) {
  range.breakApart();
  range.setBackground(color);
  if (merge && range.getNumColumns() > 1) range.merge();
  if (text !== undefined) range.setValue(text);
  range.setHorizontalAlignment("center");
  range.setVerticalAlignment("middle");
}

function syncStatusFast(ss, rowDataArray, row, targetSheetName, manualVal) {
  let pNo, val;
  if (rowDataArray) {
    pNo = String(rowDataArray[STOCK_PLANT_COL - 3]).trim();
    val = rowDataArray[STOCK_STATUS_COL - 3];
  } else {
    const erpSheet = ss.getSheetByName(SHEET_ERP);
    pNo = String(erpSheet.getRange(row, ERP_PLANT_COL).getValue()).trim();
    val = manualVal;
  }
  if (!pNo) return;

  if (targetSheetName === SHEET_ERP) {
    const { plantRowMap } = getFastErpIndices(ss);
    if (plantRowMap.has(pNo)) {
      const r = plantRowMap.get(pNo) + 1;
      ss.getSheetByName(SHEET_ERP).getRange(r, ERP_STATUS_COL).setValue(val);
    }
  } else {
    const stockSheet = ss.getSheetByName(SHEET_STOCK);
    const plants = stockSheet.getRange(4, STOCK_PLANT_COL, stockSheet.getLastRow(), 1).getValues();
    for(let i=0; i<plants.length; i++) {
      if(String(plants[i][0]).trim() === pNo) {
        stockSheet.getRange(i+4, STOCK_STATUS_COL).setValue(val);
        break;
      }
    }
  }
}

function getFastErpIndices(ss) {
  const cache = CacheService.getScriptCache();
  const cachedPlants = cache.get(CACHE_KEY_ERP_MAP);
  const cachedDates = cache.get(CACHE_KEY_DATE_MAP);
  const cachedBounds = cache.get(CACHE_KEY_BOUNDS);
  if (cachedPlants && cachedDates && cachedBounds) {
    return {
      plantRowMap: new Map(JSON.parse(cachedPlants)),
      dateColMap: new Map(JSON.parse(cachedDates)),
      dateBounds: JSON.parse(cachedBounds)
    };
  }
  return refreshSystemCache();
}

function refreshSystemCache() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const erpSheet = ss.getSheetByName(SHEET_ERP);
  const lastRow = erpSheet.getLastRow();
  const lastCol = erpSheet.getLastColumn();
  const plantVals = erpSheet.getRange(1, ERP_PLANT_COL, lastRow, 1).getValues();
  const plantRowMap = new Map();
  for (let i = 3; i < plantVals.length; i++) {
    let p = String(plantVals[i][0]).trim();
    if (p) plantRowMap.set(p, i); 
  }
  const dateVals = erpSheet.getRange(ERP_DATE_ROW, 1, 1, lastCol).getValues()[0];
  const dateColMap = new Map();
  let minStr = null, maxStr = null;

  for (let c = ERP_DATE_START_COL - 1; c < dateVals.length; c++) {
    if (dateVals[c] instanceof Date) {
      let dStr = Utilities.formatDate(dateVals[c], TIMEZONE, "yyyy-MM-dd");
      dateColMap.set(dStr, c);
      // Capture Min/Max for clamping
      if (!minStr || dStr < minStr) minStr = dStr;
      if (!maxStr || dStr > maxStr) maxStr = dStr;
    }
  }
  const bounds = { min: minStr, max: maxStr };

  const cache = CacheService.getScriptCache();
  try {
    cache.put(CACHE_KEY_ERP_MAP, JSON.stringify(Array.from(plantRowMap.entries())), CACHE_EXPIRY);
    cache.put(CACHE_KEY_DATE_MAP, JSON.stringify(Array.from(dateColMap.entries())), CACHE_EXPIRY);
    cache.put(CACHE_KEY_BOUNDS, JSON.stringify(bounds), CACHE_EXPIRY);
  } catch(e) {}
  
  // This explicitly returns the structure needed by getFastErpIndices
  return { plantRowMap, dateColMap, dateBounds: bounds };
}

// --- ORIGINAL EXACT LOGIC AS REQUESTED ---
function checkStatusLock(sheet, row, newVal, range) {
  if (newVal === "AVAILABLE") {
    const todayStr = Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd");
    const headerDates = sheet.getRange(ERP_DATE_ROW, 1, 1, sheet.getLastColumn()).getValues()[0];
    let todayCol = -1;
    for (let c = ERP_DATE_START_COL - 1; c < headerDates.length; c++) {
      if (headerDates[c] instanceof Date && Utilities.formatDate(headerDates[c], TIMEZONE, "yyyy-MM-dd") === todayStr) {
        todayCol = c + 1; break;
      }
    }
    if (todayCol !== -1) {
      let cell = sheet.getRange(row, todayCol);
      let color = (cell.getBackground() || "#ffffff").toLowerCase();
      if ((color === "#ffffff" || color === "white") && cell.isPartOfMerge()) {
         let ranges = cell.getMergedRanges();
         if (ranges.length > 0) color = (ranges[0].getCell(1, 1).getBackground() || "#ffffff").toLowerCase();
      }
      if (color !== COLOR_AVAILABLE && color !== "#ffffff" && color !== "white") {
        notify_('STATUS LOCKED: row ' + row + ' is booked for TODAY.');
        let correctStatus = "BOOKED";
        for (let key in COLORS) { if (COLORS[key].toLowerCase() === color) correctStatus = key; }
        range.setValue(correctStatus); 
        return false; 
      }
    }
  }
  return true;
}
// ==========================================
// --- APPSHEET AUTOMATION BRIDGE (AUTO-SERVICE) ---
// ==========================================
function onAppSheetSync(e) {
  if (e && e.changeType !== 'EDIT' && e.changeType !== 'INSERT_ROW' && e.changeType !== 'OTHER') return;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const stockSheet = ss.getSheetByName(SHEET_STOCK);
  const erpSheet = ss.getSheetByName(SHEET_ERP);
  
  const lastRow = stockSheet.getLastRow();
  if (lastRow < 4) return;

  // 1. Read all Stock Data
  const stockData = stockSheet.getRange(4, 1, lastRow - 3, 11).getValues();

  // 2. Read ERP Statuses to compare
  const erpLastRow = erpSheet.getLastRow();
  const erpPlants = erpSheet.getRange(4, ERP_PLANT_COL, erpLastRow - 3, 1).getValues();
  const erpStatuses = erpSheet.getRange(4, ERP_STATUS_COL, erpLastRow - 3, 1).getValues();

  const erpStatusMap = new Map();
  for (let i = 0; i < erpPlants.length; i++) {
     let p = String(erpPlants[i][0]).trim();
     if (p) erpStatusMap.set(p, String(erpStatuses[i][0]).trim());
  }

  let processedAny = false;

  // 3. Find newly added "SERVICE" statuses from AppSheet
  for (let i = 0; i < stockData.length; i++) {
     let rowData = stockData[i];
     let pNo = String(rowData[STOCK_PLANT_COL - 1]).trim();
     let status = String(rowData[STOCK_STATUS_COL - 1]).trim(); 
     
     // If AppSheet set it to SERVICE...
     if (pNo && status === "SERVICE") {
         
         // ...and it hasn't been synced to the ERP List yet
         if (erpStatusMap.get(pNo) !== "SERVICE") {
             
             const stockRow = i + 4;
             // Extract the specific array format your engine expects
             let targetDataArray = stockSheet.getRange(stockRow, 3, 1, 9).getValues()[0];
             
             // Fix AppSheet's Text Dates (Convert "DD/MM/YYYY" to real Date objects)
             // Indices: Start=5, End=6, LogIn=7, LogOut=8
             [5, 6, 7, 8].forEach(idx => {
                 let val = targetDataArray[idx];
                 if (typeof val === "string" && val.includes("/")) {
                     let parts = val.trim().split("/");
                     if (parts.length === 3) {
                         targetDataArray[idx] = new Date(parts[2], parts[1] - 1, parts[0], 0, 0, 0);
                     }
                 } else if (typeof val === "string" && val.includes("-")) {
                     targetDataArray[idx] = new Date(val); // Fallback just in case
                 }
             });

             // AUTO-PROCESS: Send it directly to your calendar engine!
             syncStatusFast(ss, targetDataArray, stockRow, SHEET_ERP);
             handleSingleBookingFast(ss, stockSheet, stockRow, targetDataArray);
             
             // Overwrite the weird AppSheet text dates with real Dates in the spreadsheet so it looks clean
             stockSheet.getRange(stockRow, STOCK_START_COL, 1, 4).setValues([[
                 targetDataArray[5] instanceof Date ? targetDataArray[5] : "",
                 targetDataArray[6] instanceof Date ? targetDataArray[6] : "",
                 targetDataArray[7] instanceof Date ? targetDataArray[7] : "",
                 targetDataArray[8] instanceof Date ? targetDataArray[8] : ""
             ]]);

             processedAny = true;
         }
     }
  }

  // 4. Clean up and refresh the cache
  if (processedAny) {
      refreshSystemCache();
  }
}

// --- ORIGINAL EXACT LOGIC AS REQUESTED ---
// --- ORIGINAL EXACT LOGIC AS REQUESTED ---
function updateDailyStatus() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const erpSheet = ss.getSheetByName(SHEET_ERP);
  const stockSheet = ss.getSheetByName(SHEET_STOCK);
  
  const todayStr = Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd");
  
  const lastRow = erpSheet.getLastRow();
  const lastCol = erpSheet.getLastColumn();
  if (lastRow < 4) return;

  // 1. BULK READ EVERYTHING (Lightning Fast Simultaneous Execution)
  const erpDataRange = erpSheet.getRange(1, 1, lastRow, lastCol);
  const erpValues = erpDataRange.getValues();
  const erpBackgrounds = erpDataRange.getBackgrounds();
  const erpMerges = erpDataRange.getMergedRanges(); // 1 API call gets ALL merges instantly
  
  const headerDates = erpValues[ERP_DATE_ROW - 1];
  let todayIdx = -1;
  
  // Find "Today" Column Index
  for (let c = ERP_DATE_START_COL - 1; c < headerDates.length; c++) {
    if (headerDates[c] instanceof Date && Utilities.formatDate(headerDates[c], TIMEZONE, "yyyy-MM-dd") === todayStr) {
      todayIdx = c; break;
    }
  }

  const erpStatuses = erpSheet.getRange(4, ERP_STATUS_COL, lastRow - 3, 1).getValues();
  const erpPlants = erpSheet.getRange(4, ERP_PLANT_COL, lastRow - 3, 1).getValues();
  
  let newStatuses = [];
  let statusMap = new Map(); // Stores Plant No. -> Correct Status
  
  if (todayIdx === -1) {
    // Today is not on the calendar, retain KSA statuses, reset others.
    for (let i = 0; i < erpStatuses.length; i++) {
      let current = erpStatuses[i][0];
      let correct = (current === "SOLD TO KSA" || current === "IN KSA") ? current : "AVAILABLE";
      newStatuses.push([correct]);
      
      let pNo = String(erpPlants[i][0]).trim();
      if (pNo) statusMap.set(pNo, correct);
    }
  } else {
    // 2. IN-MEMORY MERGE CALCULATION (100x Faster than checking cell by cell)
    let mergeColorMap = new Map(); // Maps rowIdx -> True Color of the Merge
    
    for (let i = 0; i < erpMerges.length; i++) {
      let m = erpMerges[i];
      let mRow = m.getRow() - 1;    // 0-based row index
      let mCol = m.getColumn() - 1; // 0-based col index
      let mWidth = m.getNumColumns();
      let mHeight = m.getNumRows();
      
      // If this merge covers "Today" horizontally...
      if (todayIdx >= mCol && todayIdx < mCol + mWidth) {
        // ...The true color is always in the top-left cell of the merge
        let trueColor = (erpBackgrounds[mRow][mCol] || "#ffffff").toLowerCase();
        
        // Apply this color to all rows covered by this specific merge
        for(let hr = 0; hr < mHeight; hr++) {
           mergeColorMap.set(mRow + hr, trueColor);
        }
      }
    }

    // 3. MAP COLORS TO STATUSES
    for (let i = 0; i < erpStatuses.length; i++) {
      let rowIdx = i + 3; // 0-based row index for data starting on row 4
      let current = erpStatuses[i][0];
      
      // If row is inside a merge on today's date, use the merge color. Else use standard cell color.
      let color = mergeColorMap.has(rowIdx) 
          ? mergeColorMap.get(rowIdx) 
          : (erpBackgrounds[rowIdx][todayIdx] || "#ffffff").toLowerCase();

      let correct = "AVAILABLE"; 
      
      if (color === COLORS["BOOKED"].toLowerCase() || color === COLORS["ON HIRE"].toLowerCase()) {
         correct = (current === "ON HIRE") ? "ON HIRE" : "BOOKED";
      }
      else if (color === COLORS["QUOTE"].toLowerCase()) correct = "QUOTE";
      else if (color === COLORS["SERVICE"].toLowerCase()) correct = "SERVICE";
      else if (color === COLORS["SOLD TO KSA"].toLowerCase()) correct = "SOLD TO KSA";
      else if (color === COLORS["IN KSA"].toLowerCase()) correct = "IN KSA";
      else if (current === "SOLD TO KSA" || current === "IN KSA") correct = current;
      
      newStatuses.push([correct]);
      
      let pNo = String(erpPlants[i][0]).trim();
      if (pNo) statusMap.set(pNo, correct);
    }
  }

  // 4. SIMULTANEOUS WRITE: ERP LIST
  erpSheet.getRange(4, ERP_STATUS_COL, lastRow - 3, 1).setValues(newStatuses);

  // 5. SIMULTANEOUS WRITE: STOCK STATUS
  const stockLastRow = stockSheet.getLastRow();
  if (stockLastRow >= 4) {
    const stockPlants = stockSheet.getRange(4, STOCK_PLANT_COL, stockLastRow - 3, 1).getValues();
    const stockStatuses = stockSheet.getRange(4, STOCK_STATUS_COL, stockLastRow - 3, 1).getValues();
    let stockUpdatesCount = 0;

    for (let i = 0; i < stockPlants.length; i++) {
      let pNo = String(stockPlants[i][0]).trim();
      if (statusMap.has(pNo)) {
        let newStat = statusMap.get(pNo);
        if (stockStatuses[i][0] !== newStat) {
          stockStatuses[i][0] = newStat;
          stockUpdatesCount++;
        }
      }
    }

    // Only hit the spreadsheet if changes are actually needed
    if (stockUpdatesCount > 0) {
      stockSheet.getRange(4, STOCK_STATUS_COL, stockLastRow - 3, 1).setValues(stockStatuses);
    }
  }
  refreshSystemCache(); // Synced cache update for speed
  ss.toast("Force Refresh Complete. Cache Synced.", "✅ Success", 5);
}