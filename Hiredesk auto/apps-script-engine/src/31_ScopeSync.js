/**
 * ⚡ QUANTUM-VELOCITY SYNC ENGINE v2.0 (The "Priority" Update)
 * * INNOVATIONS:
 * 1. SESSION LOCKING: Enforces "First Sheet Wins" logic instantly.
 * 2. GREEN-SKIPPING: Ignores already processed (Green) rows.
 * 3. BATCH PAINTING: Updates CS Sheet colors in one massive operation per sheet.
 * 4. CONFLICT REPORTING: Tracks exactly what was blocked and why.
 */

// --- CONFIGURATION ---
const KEYWORD_SC = "CS -"; 
const SHEET_STOCK_NAME = "STOCK STATUS";
const SHEET_ERP_NAME = "ERP LIST";
const COLOR_SUCCESS = "#00ff00"; // Bright Green
const TIMEZONE_SC = "Asia/Dubai";

function syncClientScopes() {
  const tStart = new Date().getTime();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // --- 1. TELEPATHIC CACHE & PRELOAD ---
  // Load ERP Cache and Stock Map immediately
  const cache = CacheService.getScriptCache();
  const cachedPlants = cache.get("ERP_PLANT_MAP_V5");
  const cachedDates = cache.get("ERP_DATE_MAP_V5");
  
  let erpPlantMap, erpDateMap;

  if (!cachedPlants || !cachedDates) {
     if (typeof refreshSystemCache === 'function') {
        const fresh = refreshSystemCache();
        erpPlantMap = fresh.plantRowMap;
        erpDateMap = fresh.dateColMap;
     } else {
        notify_('Scope sync: cache missing and refreshSystemCache unavailable.');
        return;
     }
  } else {
    erpPlantMap = new Map(JSON.parse(cachedPlants));
    erpDateMap = new Map(JSON.parse(cachedDates));
  }
  
  // --- 2. SURGICAL STOCK READ ---
  const stockSheet = ss.getSheetByName(SHEET_STOCK_NAME);
  const stockLastRow = stockSheet.getLastRow();
  const stockData = stockSheet.getRange(4, 1, stockLastRow - 3, 11).getValues(); // Read columns A to K
  
  // Map Plant No (Col C / Index 2) to Row Number
  const stockMap = new Map();
  for (let i = 0; i < stockData.length; i++) {
    let p = String(stockData[i][2]).trim(); // Col C is index 2
    if (p) stockMap.set(p, i + 4); 
  }

  // --- 3. SESSION STATE (The "First-Come-First-Serve" Logic) ---
  // This Set tracks items booked IN THIS RUN. If Sheet 1 books it, Sheet 2 gets blocked.
  const sessionBookedPlants = new Set();
  const reportLog = { booked: [], blocked: [] };
  const pendingStockUpdates = []; // Updates for Stock Status
  const pendingCSUpdates = [];    // Updates for Client Scope Sheets (Green Color)

  // --- 4. DATA MINING ---
  const allSheets = ss.getSheets();
  let erpBgGrid = null; // Lazy load

  for (let sheet of allSheets) {
    let sName = sheet.getName().toUpperCase();
    if (!sName.includes(KEYWORD_SC)) continue;
    if (sheet.getLastRow() < 5) continue;

    // Header Parsing (DeveloperMetadata first, name-parse fallback)
    var ident = csIdentity_(sheet);
    // GUARD: auto-managed CS tabs (created by the quote pipeline, carry
    // ss_quoteRef metadata) are owned by the _BOOKINGS state engine — booking
    // them here would double-paint the ERP outside state tracking. Skip them;
    // this manual tool serves HAND-MADE CS tabs only.
    if (ident.quoteRef) continue;
    let jobNo = ident.jobNo;
    let project = ident.project;
    let clientName = ident.client;

    // READ SHEET (Values AND Colors)
    let range = sheet.getDataRange();
    let values = range.getValues();
    let backgrounds = range.getBackgrounds(); // Critical for "Green-Skipping"

    // Find Header
    let headerRow = -1;
    for(let r=0; r<Math.min(20, values.length); r++){
       if(String(values[r]).toUpperCase().includes("PLANT NO")) { headerRow = r; break; }
    }
    if(headerRow === -1) continue;

    // Map Columns
    let h = values[headerRow].map(String);
    let cPlant = h.findIndex(x => x.toUpperCase().includes("PLANT NO"));
    let cStat = h.findIndex(x => x.toUpperCase().includes("STATUS"));
    let cOn = h.findIndex(x => x.toUpperCase().includes("ON HIRE"));
    let cOff = h.findIndex(x => x.toUpperCase().includes("OFF HIRE"));
    let cDrop = h.findIndex(x => x.toUpperCase().includes("DROP"));      
    let cColl = h.findIndex(x => x.toUpperCase().includes("COLLECTION")); 
    
    if(cPlant === -1 || cStat === -1) continue;

    let sheetHasUpdates = false;

    // PROCESS ROWS
    for(let r = headerRow + 1; r < values.length; r++){
       // OPTIMIZATION: "Green-Skipping"
       // If the row is already green (success color), skip it entirely.
       if (backgrounds[r][0] === COLOR_SUCCESS) continue; 

       let rawP = String(values[r][cPlant]).trim();
       let stat = String(values[r][cStat]).trim();
       
       if(!rawP || !stat) continue;

       // Parse Plant String (Handles comma separated lists)
       let plants = parsePlantString(rawP);
       let rowIsSuccess = true; // Assume success, mark false if any plant in row fails

       for(let p of plants){
          if (!stockMap.has(p)) {
            // Plant doesn't exist in stock, ignore
            continue; 
          }

          // 1. SESSION CHECK (Priority Rule)
          if (sessionBookedPlants.has(p)) {
             reportLog.blocked.push(`${p} (Duplicate request in ${sName})`);
             rowIsSuccess = false;
             continue; // Skip to next plant
          }

          let start = (cOn > -1 ? values[r][cOn] : "");
          let end = (cOff > -1 ? values[r][cOff] : "");
          let logIn = (cDrop > -1 && values[r][cDrop] instanceof Date) ? values[r][cDrop] : "";
          let logOut = (cColl > -1 && values[r][cColl] instanceof Date) ? values[r][cColl] : "";

          // 2. ERP CHECK (Lazy Load only if needed)
          if (!erpBgGrid) erpBgGrid = ss.getSheetByName(SHEET_ERP_NAME).getDataRange().getBackgrounds();

          if (checkMemoryAvailability(p, start, end, logIn, logOut, erpPlantMap, erpDateMap, erpBgGrid)) {
             // SUCCESS: Book it!
             
             // A. Add to Session Lock (Blocks subsequent sheets immediately)
             sessionBookedPlants.add(p);

             // B. Queue Stock Update
             pendingStockUpdates.push({
                row: stockMap.get(p),
                values: [
                   stat,
                   jobNo,
                   clientName, // Client
                   project,
                   (start instanceof Date ? start : ""),
                   (end instanceof Date ? end : ""),
                   (logIn instanceof Date ? logIn : ""),
                   (logOut instanceof Date ? logOut : "")
                ]
             });
             
             reportLog.booked.push(`${p} -> ${jobNo}`);

          } else {
             // Failed ERP Check
             reportLog.blocked.push(`${p} (Conflict in ERP)`);
             rowIsSuccess = false;
          }
       }

       // 3. COLOR QUEUE
       // If the row was processed and ALL valid plants in it were booked (or it had valid bookings)
       // We mark this specific row in this specific sheet to turn GREEN.
       if (rowIsSuccess && plants.length > 0) {
          // Paint the whole row green in the memory grid
          for(let c=0; c<backgrounds[r].length; c++) {
             backgrounds[r][c] = COLOR_SUCCESS;
          }
          sheetHasUpdates = true;
       }
    }

    // Add this sheet's new background grid to the queue
    if (sheetHasUpdates) {
       pendingCSUpdates.push({
          sheet: sheet,
          bgGrid: backgrounds
       });
    }
  }

  // --- 5. EXECUTION PHASE (The "Flash" Write) ---
  
  // A. Write to Stock Status (Batch)
  if (pendingStockUpdates.length > 0) {
     const stockRange = stockSheet.getRange(4, 4, stockLastRow - 3, 8); // D to K
     const stockVals = stockRange.getValues();
     const stockBgs = stockRange.getBackgrounds();

     for(let up of pendingStockUpdates) {
        let idx = up.row - 4;
        if (idx >= 0 && idx < stockVals.length) {
           for(let c=0; c<8; c++) stockVals[idx][c] = up.values[c];
           stockBgs[idx][0] = "#ffff00"; // Mark Status Yellow
        }
     }
     stockRange.setValues(stockVals);
     stockRange.setBackgrounds(stockBgs);
  }

  // B. Write to CS Sheets (Visual Feedback - Green Rows)
  // This updates the Client Scope sheets to show they are "Done"
  for (let update of pendingCSUpdates) {
     update.sheet.getDataRange().setBackgrounds(update.bgGrid);
  }

  // --- 6. REPORTING & HANDOFF ---
  SpreadsheetApp.flush(); // Force writes before handing off
  
  const tEnd = new Date().getTime();
  const duration = ((tEnd - tStart) / 1000).toFixed(1);
  
  let msg = `✅ Processed in ${duration}s\n`;
  msg += `Booked: ${reportLog.booked.length}\n`;
  msg += `Blocked: ${reportLog.blocked.length}\n`;
  
  if (reportLog.blocked.length > 0) {
    // Optional: Log blocked items to console or alert
    console.log("Blocked Items:", reportLog.blocked);
    msg += "(Check Console for blocked details)";
  }

  toast_(msg, 10);

  // HANDOFF TO ERP CALENDAR SCRIPT (silent — manual tool, no extra confirm)
  if (pendingStockUpdates.length > 0) {
     if (typeof processBatchQueueSilent_ === 'function') {
        toast_("Handing off to ERP Calendar...", 3);
        processBatchQueueSilent_();
     } else {
        notify_('Scope sync: processBatchQueueSilent_ not found.');
     }
  }
}

// --- HELPER FUNCTIONS ---

function checkMemoryAvailability(pNo, start, end, logIn, logOut, erpPlantMap, erpDateMap, erpBgGrid) {
  if (!erpPlantMap.has(pNo)) return true; // New item, allow it
  if (!(start instanceof Date) || !(end instanceof Date)) return true; 

  const erpRowIdx = erpPlantMap.get(pNo);
  const sStr = Utilities.formatDate(start, TIMEZONE_SC, "yyyy-MM-dd");
  const eStr = Utilities.formatDate(end, TIMEZONE_SC, "yyyy-MM-dd");

  let startCol = erpDateMap.get(sStr);
  let endCol = erpDateMap.get(eStr);

  if (startCol === undefined) return true; 
  if (endCol === undefined) endCol = erpBgGrid[0].length - 1;

  // Logistics Expansion
  if (logIn instanceof Date) {
    let lStr = Utilities.formatDate(logIn, TIMEZONE_SC, "yyyy-MM-dd");
    let lCol = erpDateMap.get(lStr);
    if (lCol !== undefined && lCol < startCol) startCol = lCol;
  }
  
  if (logOut instanceof Date) {
    let lStr = Utilities.formatDate(logOut, TIMEZONE_SC, "yyyy-MM-dd");
    let lCol = erpDateMap.get(lStr);
    if (lCol !== undefined && lCol > endCol) endCol = lCol;
  }

  // Scan for Conflicts (Any color other than white/transparent)
  for (let c = startCol; c <= endCol; c++) {
    let color = (erpBgGrid[erpRowIdx][c] || "#ffffff").toLowerCase();
    if (color !== "#ffffff" && color !== "white" && color !== "#00000000") return false; 
  }
  return true;
}

function parsePlantString(str) {
  if (!str) return [];
  let clean = str.toString().replace(/['"]+/g, '').replace(/[&|]/g, ',');
  let parts = clean.split(',');
  let results = [];
  let prefix = "";
  for (let p of parts) {
    let item = p.trim();
    if (!item) continue;
    if (item.includes('.') || item.length >= 3) {
      results.push(item);
      let dotIdx = item.lastIndexOf('.');
      if (dotIdx > -1) prefix = item.substring(0, dotIdx + 1);
    } else if (prefix && item.length < 4) {
      results.push(prefix + item);
    } else {
      results.push(item);
    }
  }
  return results;
}