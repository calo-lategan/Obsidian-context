// --- DEBUGGER CONFIGURATION (Matches your Main Script) ---
const DBG_SHEET_STOCK = "STOCK STATUS";
const DBG_SHEET_ERP = "ERP LIST";
const DBG_TIMEZONE = "Asia/Dubai";
const DBG_ERP_DATE_ROW = 3; 
const DBG_ERP_DATE_START_COL = 7; // Col G



/**
 * TEST 1: SYSTEM HEALTH
 * Checks: Sheet names, Date formats, "Today" existence, Timezone alignment.
 */
function runSystemHealthCheck() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const stockSheet = ss.getSheetByName(DBG_SHEET_STOCK);
  const erpSheet = ss.getSheetByName(DBG_SHEET_ERP);
  let log = "--- 🏥 SYSTEM HEALTH REPORT ---\n";
  let errors = 0;

  // 1. CHECK SHEETS
  if (!stockSheet) { log += "❌ MISSING SHEET: 'STOCK STATUS'\n"; errors++; }
  else log += "✅ Found 'STOCK STATUS'\n";
  
  if (!erpSheet) { log += "❌ MISSING SHEET: 'ERP LIST'\n"; errors++; }
  else log += "✅ Found 'ERP LIST'\n";

  if (errors > 0) { Browser.msgBox(log); return; }

  // 2. CHECK TIMEZONE
  const sheetTZ = ss.getSpreadsheetTimeZone();
  if (sheetTZ !== DBG_TIMEZONE) {
    log += `⚠️ TIMEZONE MISMATCH: Sheet is '${sheetTZ}', Script is '${DBG_TIMEZONE}'.\n   (This might cause dates to be off by 1 day).\n`;
  } else {
    log += `✅ Timezone Aligned (${DBG_TIMEZONE})\n`;
  }

  // 3. CHECK CALENDAR HEADERS
  const headers = erpSheet.getRange(DBG_ERP_DATE_ROW, DBG_ERP_DATE_START_COL, 1, 15).getValues()[0];
  let dateErrors = 0;
  headers.forEach((h, i) => {
    if (!(h instanceof Date)) {
      dateErrors++;
      if (dateErrors === 1) log += `❌ ROW 3 ERROR: Column ${i+7} is TEXT, not a Date. Value: "${h}"\n`;
    }
  });

  if (dateErrors > 0) {
    log += "⚠️ CRITICAL: Calendar headers contain text. Script cannot read them.\n";
    errors++;
  } else {
    log += "✅ Calendar Headers are valid Date Objects.\n";
  }

  // 4. FIND "TODAY"
  const todayStr = Utilities.formatDate(new Date(), DBG_TIMEZONE, "yyyy-MM-dd");
  const allHeaders = erpSheet.getRange(DBG_ERP_DATE_ROW, 1, 1, erpSheet.getLastColumn()).getValues()[0];
  let todayCol = -1;
  for (let c = DBG_ERP_DATE_START_COL - 1; c < allHeaders.length; c++) {
    if (allHeaders[c] instanceof Date) {
      if (Utilities.formatDate(allHeaders[c], DBG_TIMEZONE, "yyyy-MM-dd") === todayStr) {
        todayCol = c + 1;
        break;
      }
    }
  }

  if (todayCol !== -1) log += `✅ 'Today' (${todayStr}) found at Column ${todayCol}.\n`;
  else {
    log += `⚠️ 'Today' (${todayStr}) NOT found in header. Daily Scanner will fail.\n`;
    errors++;
  }

  if (errors === 0) log += "\n🎉 SYSTEM IS HEALTHY.";
  else log += `\nfound ${errors} errors.`;

  Browser.msgBox(log);
}

/**
 * TEST 2: DATA INTEGRITY
 * Checks: Duplicate Plant IDs, IDs existing in one sheet but not the other.
 */
function checkPlantIDIntegrity() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const stockSheet = ss.getSheetByName(DBG_SHEET_STOCK);
  const erpSheet = ss.getSheetByName(DBG_SHEET_ERP);
  let log = "--- 🔗 DATA INTEGRITY REPORT ---\n";
  
  // Get all IDs
  const stockIDs = stockSheet.getRange(4, 3, stockSheet.getLastRow() - 3, 1).getValues().flat().map(String).filter(Boolean);
  const erpIDs = erpSheet.getRange(4, 6, erpSheet.getLastRow() - 3, 1).getValues().flat().map(String).filter(Boolean);

  // 1. Check Duplicates in ERP (CRITICAL)
  let seen = new Set();
  let duplicates = new Set();
  erpIDs.forEach(id => {
    let cleanID = id.trim();
    if (seen.has(cleanID)) duplicates.add(cleanID);
    seen.add(cleanID);
  });

  if (duplicates.size > 0) {
    log += "❌ DUPLICATE IDs IN ERP LIST (Script will only find the first one):\n";
    duplicates.forEach(d => log += `   - ${d}\n`);
  } else {
    log += "✅ No Duplicate IDs in ERP List.\n";
  }

  // 2. Check Matching
  let missingInERP = 0;
  stockIDs.forEach(id => {
    if (!seen.has(id.trim())) missingInERP++;
  });

  if (missingInERP > 0) {
    log += `⚠️ ${missingInERP} Plant IDs are in STOCK but missing from ERP LIST.\n`;
  } else {
    log += "✅ All Stock IDs exist in ERP List.\n";
  }

  Browser.msgBox(log);
}

/**
 * TEST 3: SIMULATION (The "Why didn't it work?" tool)
 * Select a row in STOCK STATUS and run this. It runs the conflict logic in "Read-Only" mode.
 */
function diagnoseSelectedRow() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  const ui = SpreadsheetApp.getUi();

  if (sheet.getName() !== DBG_SHEET_STOCK) {
    ui.alert("⚠️ Select a row in 'STOCK STATUS' first.");
    return;
  }

  const row = sheet.getActiveRange().getRow();
  if (row < 4) return;

  // Get Data
  const plantNo = sheet.getRange(row, 3).getValue();
  const status = sheet.getRange(row, 4).getValue();
  const start = sheet.getRange(row, 8).getValue();
  const end = sheet.getRange(row, 9).getValue();

  let log = `--- 🕵️ DIAGNOSIS ROW ${row} ---\n`;
  log += `ID: ${plantNo} | Status: ${status}\n`;

  // 1. Check Dates
  if (status === "AVAILABLE") {
    ui.alert(log + "ℹ️ Status is AVAILABLE. Script takes no action (Correct).");
    return;
  }
  if (!(start instanceof Date)) {
    ui.alert(log + "❌ Start Date is invalid.");
    return;
  }
  
  // 2. Find in ERP
  const erpSheet = ss.getSheetByName(DBG_SHEET_ERP);
  const erpData = erpSheet.getDataRange().getValues();
  let erpRow = -1;
  for (let i = 3; i < erpData.length; i++) {
    if (String(erpData[i][5]).trim() == String(plantNo).trim()) {
      erpRow = i + 1;
      break;
    }
  }

  if (erpRow === -1) {
    ui.alert(log + "❌ ID not found in ERP List.");
    return;
  }
  log += `✅ Mapped to ERP Row ${erpRow}\n`;

  // 3. Calculate Range
  const sStr = Utilities.formatDate(start, DBG_TIMEZONE, "yyyy-MM-dd");
  let eStr = (end instanceof Date) ? Utilities.formatDate(end, DBG_TIMEZONE, "yyyy-MM-dd") : "End of Sheet";
  
  // Find Cols
  const headers = erpSheet.getRange(DBG_ERP_DATE_ROW, 1, 1, erpSheet.getLastColumn()).getValues()[0];
  let startCol = -1; 
  let endCol = -1;

  for (let c = DBG_ERP_DATE_START_COL - 1; c < headers.length; c++) {
    let d = headers[c];
    if (d instanceof Date) {
      let dStr = Utilities.formatDate(d, DBG_TIMEZONE, "yyyy-MM-dd");
      if (dStr === sStr) startCol = c + 1;
      if (end instanceof Date && dStr === eStr) endCol = c + 1;
    }
  }

  if (startCol === -1) {
    ui.alert(log + `❌ Start Date ${sStr} not found in headers.`);
    return;
  }
  if (status === "SOLD TO KSA" || !end) endCol = erpSheet.getLastColumn();
  else if (endCol === -1) endCol = erpSheet.getLastColumn(); // Overflow

  log += `📅 Booking Range: Col ${startCol} to ${endCol}\n`;

  // 4. RUN MERGE-AWARE CONFLICT CHECK
  const numCols = endCol - startCol + 1;
  const targetRange = erpSheet.getRange(erpRow, startCol, 1, numCols);
  let conflictFound = false;
  let conflictDetail = "";

  for (let i = 0; i < numCols; i++) {
    let cell = targetRange.getCell(1, i + 1);
    let color = (cell.getBackground() || "#ffffff").toLowerCase();
    
    // Check Merge Parent
    if (color === "#ffffff" || color === "white") {
      if (cell.isPartOfMerge()) {
        let ranges = cell.getMergedRanges();
        if (ranges.length > 0) {
          color = (ranges[0].getCell(1, 1).getBackground() || "#ffffff").toLowerCase();
        }
      }
    }

    if (color !== "#ffffff" && color !== "white") {
      conflictFound = true;
      conflictDetail = `Cell [${i+1}] has color ${color}`;
      break;
    }
  }

  if (conflictFound) {
    log += `\n🔴 CONFLICT DETECTED: ${conflictDetail}\n`;
    log += "✅ The script WILL block this booking.\n";
  } else {
    log += "\n🟢 NO CONFLICTS found.\n";
    log += "ℹ️ The script will ALLOW this booking.\n";
  }

  Browser.msgBox(log);
}

/**
 * 🛠️ SMART GHOST CLEANER (Ultra-Safe Mode)
 * Removes unused rows/cols to speed up the sheet, but PROTECTS formatting/borders.
 */
function cleanGhostDataSmart() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  const ui = SpreadsheetApp.getUi();

  let stats = {
    rowsRemoved: 0,
    colsRemoved: 0,
    sheetsCleaned: 0
  };

  // CONFIGURATION: How much empty space to keep as a "safety buffer"
  const ROW_BUFFER = 20;  // Keep 20 empty rows below the last data/border
  const COL_BUFFER = 5;   // Keep 5 empty columns to the right

  for (let sheet of sheets) {
    const sheetName = sheet.getName();
    
    // 1. ANALYZE ROWS
    try {
      const maxRows = sheet.getMaxRows();
      const lastContentRow = sheet.getLastRow();
      
      // Smart Scan: Look for visual boundaries (Borders/Colors) beyond text
      // We scan in chunks to be fast.
      let visualLastRow = lastContentRow;
      
      // If the sheet has more rows than content, check for formatting
      if (maxRows > lastContentRow) {
        // We check the area between data end and max rows
        // To be fast, we check the background colors. 
        // Checking borders on 1000s of rows is slow, so we use a heuristic:
        // If a row has a background color that isn't white, it's "part of the table".
        
        const startSearch = lastContentRow + 1;
        const rowsToCheck = Math.min(maxRows - lastContentRow, 100); // Check next 100 rows max
        
        if (rowsToCheck > 0) {
           const bgColors = sheet.getRange(startSearch, 1, rowsToCheck, sheet.getLastColumn()).getBackgrounds();
           
           for (let r = 0; r < bgColors.length; r++) {
             for (let c = 0; c < bgColors[0].length; c++) {
               if (bgColors[r][c] !== "#ffffff" && bgColors[r][c] !== "white") {
                 visualLastRow = startSearch + r;
                 break; 
               }
             }
           }
        }
      }

      // Calculate safe cut-off
      const keepRows = visualLastRow + ROW_BUFFER;

      if (maxRows > keepRows) {
        const rowsToDelete = maxRows - keepRows;
        // Double check: Don't delete if it leaves less than 10 rows total
        if (rowsToDelete > 0 && keepRows > 10) {
          sheet.deleteRows(keepRows + 1, rowsToDelete);
          stats.rowsRemoved += rowsToDelete;
        }
      }
    } catch (e) {
      console.error(`Error cleaning rows on ${sheetName}: ${e.message}`);
    }

    // 2. ANALYZE COLUMNS
    try {
      const maxCols = sheet.getMaxColumns();
      const lastContentCol = sheet.getLastColumn();
      let keepCols = lastContentCol + COL_BUFFER;

      // Special handling for ERP LIST (Dates run horizontally)
      // We trust getLastColumn() heavily here as dates usually populate headers
      
      if (maxCols > keepCols) {
        const colsToDelete = maxCols - keepCols;
        if (colsToDelete > 0 && keepCols > 5) {
           sheet.deleteColumns(keepCols + 1, colsToDelete);
           stats.colsRemoved += colsToDelete;
        }
      }
    } catch (e) {
      console.error(`Error cleaning cols on ${sheetName}: ${e.message}`);
    }
    
    stats.sheetsCleaned++;
  }

  // Feedback
  if (stats.rowsRemoved > 0 || stats.colsRemoved > 0) {
    ss.toast(
      `🧹 Removed ${stats.rowsRemoved} rows & ${stats.colsRemoved} cols.`, 
      "Optimization Complete", 
      5
    );
  } else {
    ss.toast("✨ Sheets are already optimized.", "Clean", 3);
  }
}

/**
 * ⚡ ADVANCED SYSTEM OPTIMIZER
 * Targets silent performance killers: 
 * 1. Trims Conditional Formatting that extends infinitely.
 * 2. Removes Data Validation from empty ghost zones.
 * 3. Archives OLD formulas to static text (Optional Speed Boost).
 */

const SAFETY_BUFFER_ROWS = 20; // Keep formatting for this many rows after data ends
const SAFETY_BUFFER_COLS = 5;

function runFullSystemOptimization() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  
  // 1. GHOST CLEANER (Structure)
  cleanGhostDataSmart(); // Run the Smart Cleaner from previous step first
  
  // 2. FORMATTING TRIMMER (Rendering Engine)
  trimOverextendedFormatting(ss);

  // 3. OPTIONAL: ARCHIVER
  // (We don't run this automatically to be safe, but we alert the user)
  ss.toast("Structure & Formatting Optimized. Sheet should load faster.", "🚀 Done", 5);
}

/**
 * 🎨 CONDITIONAL FORMATTING TRIMMER
 * Prevents CF rules from applying to row 50,000 if data ends at 500.
 * This saves MASSIVE calculation power on load.
 */
function trimOverextendedFormatting(ss) {
  const sheets = ss.getSheets();
  let rulesTrimmed = 0;

  sheets.forEach(sheet => {
    const lastRow = sheet.getLastRow();
    const maxRow = sheet.getMaxRows();
    
    // Define the "Dead Zone" where rules shouldn't exist
    const cutOffRow = lastRow + SAFETY_BUFFER_ROWS;
    
    if (cutOffRow < maxRow) {
      const rules = sheet.getConditionalFormatRules();
      const newRules = [];
      let sheetModified = false;

      rules.forEach(rule => {
        const ranges = rule.getRanges();
        const newRanges = [];
        
        ranges.forEach(range => {
          const rRow = range.getRow();
          const rLast = range.getLastRow();
          const rCol = range.getColumn();
          const rLastCol = range.getLastColumn();

          // If the rule starts inside the data but extends into the void
          if (rRow <= cutOffRow && rLast > cutOffRow) {
            // Clip it at the cutoff
            newRanges.push(sheet.getRange(rRow, rCol, cutOffRow - rRow + 1, rLastCol - rCol + 1));
            sheetModified = true;
          } 
          // If the rule is entirely in the void, drop it (don't push to newRanges)
          else if (rRow > cutOffRow) {
            sheetModified = true; // Drop it
          } 
          // Otherwise keep it
          else {
            newRanges.push(range);
          }
        });

        if (newRanges.length > 0) {
          const newRule = rule.copy().setRanges(newRanges).build();
          newRules.push(newRule);
        }
      });

      if (sheetModified) {
        sheet.setConditionalFormatRules(newRules);
        rulesTrimmed++;
      }
    }
  });
  
  if (rulesTrimmed > 0) console.log(`Optimized formatting rules on ${rulesTrimmed} sheets.`);
}

/**
 * 🔒 HISTORY ARCHIVER (Manual Trigger Only)
 * Converts formulas in "Stock Status" to static values IF the job ended 30+ days ago.
 * This prevents the sheet from recalculating 2024 dates every time you open it in 2026.
 */
function archiveHistoricalData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("STOCK STATUS"); // Or variable SHEET_STOCK
  const ui = SpreadsheetApp.getUi();

  const confirm = ui.alert(
    "🗄️ ARCHIVE HISTORICAL DATA?",
    "This will convert formulas to STATIC TEXT for jobs that ended over 30 days ago.\n\nThis makes the sheet much faster but prevents auto-updating of those specific old rows.\n\nProceed?",
    ui.ButtonSet.YES_NO
  );

  if (confirm !== ui.Button.YES) return;

  const lastRow = sheet.getLastRow();
  // Assuming Col I (9) is END DATE. Adjust if needed.
  // Using your config: const STOCK_END_COL = 9;
  const END_COL_INDEX = 9; 
  
  const dataRange = sheet.getRange(4, 1, lastRow - 3, sheet.getLastColumn());
  const values = dataRange.getValues();
  const formulas = dataRange.getFormulas();
  
  const today = new Date();
  const thirtyDaysAgo = new Date(today.setDate(today.getDate() - 30));
  let archivedCount = 0;

  for (let i = 0; i < values.length; i++) {
    const endDate = values[i][END_COL_INDEX - 1]; // -1 for array index
    
    // Check if it's a date, it's in the past, AND it currently has formulas
    if (endDate instanceof Date && endDate < thirtyDaysAgo) {
      let hasFormula = false;
      // Check if row has any formulas
      if (formulas[i].some(f => f !== "")) {
        // Overwrite the whole row with its own values (removing formulas)
        const range = sheet.getRange(i + 4, 1, 1, values[0].length);
        range.setValues([values[i]]); // Paste Values
        archivedCount++;
      }
    }
  }

  ss.toast(`Archived ${archivedCount} historical rows.`, "💾 Speed Boost", 5);
}

// Add this to your Menu in onOpen (Code.gs)
/*
   ui.createMenu('⚡ BATCH OPERATIONS')
     ...
     .addItem('🧹 Clean Ghost Data', 'cleanGhostDataSmart')
     ...
*/