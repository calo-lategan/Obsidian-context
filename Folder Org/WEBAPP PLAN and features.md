none destructible engine for each page/ code each interacts by inputting data rather than integrating via code so that when adding a new page or feature it doesn't affect each page from crashing/ breaking:

 

quote engine(attached a quote for reference on formatting, and places to put pre loaded signatures from each dedicated user email amplify events)

fleet dashboard engine (Functions exactly like the 2026 - 2027 season stock sheet attached and its appscript script)

purchase order engine ((based on standard format same as invoice attached alps events f1)

Water Delivery engine ((based on standard format same as water delivery v2)

maintenance engine (same as site services maintenance 2026)

Site services workshop stock engine (same as https://vigilant-zebra-4jgpq69wxp4x2j74x.github.dev/ but needs dynamic importing of item types with multiple excel formatts )

delivery note engine (based on standard format... eg: J60571 PGA DELIVERY NOTE.pdf)

return note engine (based on standard format... eg: 0118 2026 J60571 PGA GROUP DUBAI INV 2026 CREEK RN.pdf )

catalog engine

presentation engine

process engine

Risk assessment and method statement engine (pre made MSRA Documents for different project from scrapping to disposal to scaffolding building both in yard and on site and just input auto sign and link of designs, calculations, and description of task/ project and then draft email to send to health and safety to easily make or produce documents for MS AND RA(eg: Risk Assesment Yard Activities - SS Tank scaff.docx and Method Statement Yard Activities - SS Tank scaff.docx))



**Process engine details:**



**process 1:** quote - update fleet dashboard - notification to yard - maintenance yes or no - confirm plant no - quote with plant nos - pictures for those plant nos - full catalog pdf - presentation with standard formatting (plant no images get input to presentation) - send quote to client with catalog and presentation based on quoted items - quote reversions - resend same process with updated quote rev 1 plant nos - repeat until no revisions needed



**Process 2:** Quote confirmation and sign off - receive quote back with customer signature - Prepare process 3



**Process 3:** Send quote and purchase order - receive signed purchase order by client - change fleetboard status to booked with start dates and end dates, project name, job number, attach all docs to fleetboards row/ column for all items in that quote for quick reference or to edit and add more items - confirm maintenance status - makes delivery notes - delivery note signed and stock sent out - on return date - return note filed with full projects plant nos - return note notification to sign - return note signed - maintenance/ QC check notification - set fleet dashboard status to available



**catalog engine:**

When first quote is generated or the quote is added to the files in google drive that the webapp reads from, it will pull the catalog pdf (one pdf with all products/ items) and draft an email with the logged in users email with the quote and catalog only for the first quote



**presentation engine:**

uses a pre-defined template using google slides, and inputs pre-defined descriptions and photos of different items into the presentation description and image sections based off of the items quoted from the client



**fleet dashboard reference:**

must look and operate exactly like the 2026 - 2027 SEASON STOCK specifically the ERP LIST SHEET (exact formatting with filters across catagories, descriptions, plant nos, status, with the same color coding system for each status) AND HAS THE FOLLOWING APPSCRIPT:



**google Appscript code reference for 2026 - 2027 SEASON STOCK:**"

calendar control gs:

// --- CONFIGURATION ---

const SHEET\_STOCK = "STOCK STATUS";

const SHEET\_ERP = "ERP LIST";

const TIMEZONE = "Asia/Dubai"; // UAE Standard Time



// Column Indexes (1=A, 2=B, etc.)

const STOCK\_PLANT\_COL = 3;   // Col C

const STOCK\_STATUS\_COL = 4;  // Col D

const STOCK\_JOB\_COL = 5;     // Col E

const STOCK\_CLIENT\_COL = 6;  // Col F

const STOCK\_PROJECT\_COL = 7; // Col G

const STOCK\_START\_COL = 8;   // Col H

const STOCK\_END\_COL = 9;     // Col I



// Logistics Columns

const STOCK\_LOG\_IN\_COL = 10; // Col J

const STOCK\_LOG\_OUT\_COL = 11;// Col K



const ERP\_STATUS\_COL = 5;    // Col E

const ERP\_PLANT\_COL = 6;     // Col F

const ERP\_DATE\_ROW = 3;      // Row containing actual dates

const ERP\_DATE\_START\_COL = 7; // Col G (First date column)



// --- COLORS ---

const COLOR\_AVAILABLE = "#ffffff";

const COLOR\_PENDING\_BATCH = "#ffff00"; // Yellow

const COLOR\_LOGISTICS = "#4f81bd";     // Logistics Blue



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

const CACHE\_KEY\_ERP\_MAP = "ERP\_PLANT\_MAP\_V5";

const CACHE\_KEY\_DATE\_MAP = "ERP\_DATE\_MAP\_V5";

const CACHE\_KEY\_BOUNDS = "ERP\_DATE\_BOUNDS\_V5"; // NEW: For boundary clamping

const CACHE\_EXPIRY = 21600; // 6 Hours



/\*\*

 \* MENU SETUP

 \*/

function onOpen() {

  const ui = SpreadsheetApp.getUi();

  ui.createMenu('⚡ BATCH OPERATIONS')

    .addItem('🚀 PROCESS YELLOW BATCH ROWS', 'processBatchQueue')

    .addSeparator()

    .addItem('♻️ Refresh System Cache', 'refreshSystemCache')

    .addItem('🔄 Force Refresh "Today" Status', 'updateDailyStatus')

    .addToUi();

}



/\*\*

 \* MASTER TRIGGER (OPTIMIZED ROUTING)

 \*/

function onEdit(e) {

  const ss = e.source;

  const sheet = ss.getActiveSheet();

  const name = sheet.getName();

  const range = e.range;

  const endRow = range.getRow() + range.getNumRows() - 1;

  const col = range.getColumn();



  // 1. EDITS ON STOCK STATUS

  if (name === SHEET\_STOCK \&\& endRow >= 4) {

    const bgColors = range.getBackgrounds();

    let isYellow = false;

 

    // Fast scan for batch marker

    outer: for(let i=0; i<bgColors.length; i++) {

      for(let j=0; j<bgColors\[0].length; j++) {

        if(bgColors\[i]\[j] === COLOR\_PENDING\_BATCH) { isYellow = true; break outer; }

      }

    }



    if (range.getNumRows() > 1 || isYellow) {

      if (!isYellow) range.setBackground(COLOR\_PENDING\_BATCH);

      return;

    }



    // Single Edit Trigger

    if (range.getNumRows() === 1 \&\& !isYellow) {

      const r = range.getRow();

 

      // ZERO-REDUNDANCY READ

      const rowData = sheet.getRange(r, 3, 1, 9).getValues()\[0];

 

      const status = rowData\[STOCK\_STATUS\_COL - 3];

      const start = rowData\[STOCK\_START\_COL - 3];

      const end = rowData\[STOCK\_END\_COL - 3];



      const isBooking = (status !== "AVAILABLE");

      const isKSA = (status === "SOLD TO KSA" || status === "IN KSA");

      const hasDates = (start instanceof Date \&\& end instanceof Date);



      // Only run if criteria are met

      if (isBooking \&\& (hasDates || isKSA)) {

        if (col === STOCK\_STATUS\_COL) {

          syncStatusFast(ss, rowData, r, SHEET\_ERP);

          handleSingleBookingFast(ss, sheet, r, rowData);

        }

        if (col === STOCK\_START\_COL || col === STOCK\_END\_COL || col === STOCK\_LOG\_IN\_COL || col === STOCK\_LOG\_OUT\_COL) {

           handleSingleBookingFast(ss, sheet, r, rowData);

        }

      }

    }

  }



  // 2. EDITS ON ERP LIST

  if (name === SHEET\_ERP \&\& endRow >= 4 \&\& col === ERP\_STATUS\_COL) {

    for (let r = range.getRow(); r <= endRow; r++) {

      if (r < 4) continue;

      let val = sheet.getRange(r, col).getValue();

      // Using ORIGINAL checkStatusLock logic here

      let allowed = checkStatusLock(sheet, r, val, sheet.getRange(r, col));

      if (allowed) syncStatusFast(ss, null, r, SHEET\_STOCK, val);

    }

  }

}



/\*\*

 \* ⚡ SUPER-FAST SINGLE HANDLER

 \* Uses Surgical IO + Time Travel Revert + Smart Date Clamping

 \*/

function handleSingleBookingFast(ss, stockSheet, stockRow, rowDataArray) {

  const pNo = String(rowDataArray\[STOCK\_PLANT\_COL - 3]).trim();

  if (!pNo) return;



  const status = rowDataArray\[STOCK\_STATUS\_COL - 3];

  const startDate = rowDataArray\[STOCK\_START\_COL - 3];

  const endDate = rowDataArray\[STOCK\_END\_COL - 3];

  const logIn = rowDataArray\[STOCK\_LOG\_IN\_COL - 3];

  const logOut = rowDataArray\[STOCK\_LOG\_OUT\_COL - 3];

 

  const job = rowDataArray\[STOCK\_JOB\_COL - 3] || "";

  const client = rowDataArray\[STOCK\_CLIENT\_COL - 3] || "";

  const project = rowDataArray\[STOCK\_PROJECT\_COL - 3] || "";

  const cellText = \[job, client, project].filter(Boolean).join(" | ");



  // 1. GET INDEX MAPS \& BOUNDS (Cached)

  const { plantRowMap, dateColMap, dateBounds } = getFastErpIndices(ss);



  if (!plantRowMap.has(pNo)) {

    ss.toast(`⚠️ Plant ${pNo} not found in ERP.`, "Error");

    return;

  }



  const erpRowIdx = plantRowMap.get(pNo);

  const erpRow = erpRowIdx + 1;



  // 2. SURGICAL READ (1 Row Only - 100x Faster than reading sheet)

  const erpSheet = ss.getSheetByName(SHEET\_ERP);

  const maxCol = erpSheet.getLastColumn();

  const erpRowRange = erpSheet.getRange(erpRow, 1, 1, maxCol);

  const erpRowBg = erpRowRange.getBackgrounds()\[0]; // 1D Array

 

  // 3. CALCULATE INDICES WITH CLAMPING

  let startCol = -1, endCol = -1, logInCol = -1, logOutCol = -1;

  const isKSA = (status === "SOLD TO KSA" || status === "IN KSA");



  if (isKSA) {

    startCol = ERP\_DATE\_START\_COL;

    endCol = maxCol;

  } else {

    const sStr = Utilities.formatDate(startDate, TIMEZONE, "yyyy-MM-dd");

    const eStr = Utilities.formatDate(endDate, TIMEZONE, "yyyy-MM-dd");

 

    // --- START DATE CLAMPING ---

    if (dateColMap.has(sStr)) {

      startCol = dateColMap.get(sStr) + 1;

    } else if (sStr < dateBounds.min \&\& eStr >= dateBounds.min) {

      startCol = dateColMap.get(dateBounds.min) + 1; // Clamp to Start

    }



    // --- END DATE CLAMPING ---

    if (dateColMap.has(eStr)) {

      endCol = dateColMap.get(eStr) + 1;

    } else if (eStr > dateBounds.max \&\& sStr <= dateBounds.max) {

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

      if (endCol !== -1) startCol = ERP\_DATE\_START\_COL; // Partial overlap safety

      else return;

  }

  if (endCol === -1) endCol = maxCol;



  let effStart = (logInCol !== -1 \&\& logInCol < startCol) ? logInCol : startCol;

  let effEnd = (logOutCol !== -1 \&\& logOutCol > endCol) ? logOutCol : endCol;



  // 4. CONFLICT CHECK

  const limit = effEnd - effStart + 1;

  for (let c = 0; c < limit; c++) {

    let checkColIdx = (effStart - 1) + c; // 0-based

    let color = (erpRowBg\[checkColIdx] || "#ffffff").toLowerCase();

    if (color !== "#ffffff" \&\& color !== "white") {

 

      // --- TIME TRAVEL REVERT LOGIC ---

      const todayStr = Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd");

      let revertStatus = "AVAILABLE"; // Default

 

      if (dateColMap.has(todayStr)) {

        let todayIdx = dateColMap.get(todayStr); // 0-based index

        let todayColor = (erpRowBg\[todayIdx] || "#ffffff").toLowerCase();

 

        for (let \[key, val] of Object.entries(COLORS)) {

          if (val.toLowerCase() === todayColor) {

            revertStatus = key;

            break;

          }

        }

      }



      // Execute Revert

      stockSheet.getRange(stockRow, STOCK\_START\_COL, 1, 4).clearContent();

      stockSheet.getRange(stockRow, STOCK\_STATUS\_COL).setValue(revertStatus);



      Browser.msgBox(`⛔ CONFLICT: ${pNo} is not available for these dates.\\\\nReverted status to: ${revertStatus}`);

      return;

    }

  }



  // 5. SURGICAL WRITE

  const newColor = COLORS\[status] || COLOR\_AVAILABLE;



  if (isKSA) {

    applyColor(erpSheet.getRange(erpRow, startCol, 1, (endCol - startCol + 1)), newColor, status, true);

    ss.toast("KSA Status Updated", "✅ Instant", 1);

    return;

  }



  if (logInCol !== -1 \&\& logInCol < startCol) {

    applyColor(erpSheet.getRange(erpRow, logInCol, 1, (startCol - logInCol)), COLOR\_LOGISTICS, "", false);

  }



  applyColor(erpSheet.getRange(erpRow, startCol, 1, (endCol - startCol + 1)), newColor, cellText, true);



  if (logOutCol !== -1 \&\& logOutCol > endCol) {

    applyColor(erpSheet.getRange(erpRow, endCol + 1, 1, (logOutCol - endCol)), COLOR\_LOGISTICS, "", false);

  }



  ss.toast("Booking Updated", "⚡ Instant", 1);

}



/\*\*

 \* 🚀 HIGH-PERFORMANCE BATCH PROCESSOR

 \* IMPLEMENTS "CLUSTER WRITING" (Grouped writes for 1000x IO speed)

 \*/

function processBatchQueue() {

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const stockSheet = ss.getSheetByName(SHEET\_STOCK);

  const erpSheet = ss.getSheetByName(SHEET\_ERP);

  const ui = SpreadsheetApp.getUi();



  const lastRow = stockSheet.getLastRow();

  if (lastRow < 4) return;

 

  // Fast Scan for Yellow

  const statusBackgrounds = stockSheet.getRange(4, STOCK\_STATUS\_COL, lastRow - 3, 1).getBackgrounds();

  let rowsToProcess = \[];

  for (let i = 0; i < statusBackgrounds.length; i++) {

    if (statusBackgrounds\[i]\[0] === COLOR\_PENDING\_BATCH) rowsToProcess.push(i + 4);

  }



  if (rowsToProcess.length === 0) {

    ui.alert("✅ No Yellow/Pending rows found.");

    return;

  }



  if (ui.alert('Confirm Batch Process', `Found ${rowsToProcess.length} pending rows.\\\\nProcess now?`, ui.ButtonSet.YES\_NO) !== ui.Button.YES) return;



  ss.toast("Analyzing Database...", "⚙️ Processing", -1);



  // Read Data

  const stockDataRange = stockSheet.getRange(4, 1, lastRow - 3, stockSheet.getLastColumn());

  const stockValues = stockDataRange.getValues();

  const erpRange = erpSheet.getDataRange();

  const erpValues = erpRange.getValues();

  const erpBackgrounds = erpRange.getBackgrounds();

  const erpMaxCols = erpSheet.getLastColumn();

 

  // Map Data \& Find Bounds

  const headerDates = erpValues\[ERP\_DATE\_ROW - 1];

  const dateColMap = new Map();

  const todayStr = Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd");

  let todayIdx = -1;

  let minDateStr = null, maxDateStr = null;



  for (let c = ERP\_DATE\_START\_COL - 1; c < headerDates.length; c++) {

    if (headerDates\[c] instanceof Date) {

      let dStr = Utilities.formatDate(headerDates\[c], TIMEZONE, "yyyy-MM-dd");

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

    let p = String(erpValues\[i]\[ERP\_PLANT\_COL - 1]).trim();

    if (p) plantMap.set(p, i);

  }



  let successCount = 0;

  let modifiedErpRows = new Set(); // TRACKS DIRTY ROWS

  let mergeQueue = \[];

  let failQueue = \[];



  for (let r of rowsToProcess) {

    let stockIdx = r - 4;

    let rowData = stockValues\[stockIdx];



    let pNo = String(rowData\[STOCK\_PLANT\_COL - 1]).trim();

    let status = rowData\[STOCK\_STATUS\_COL - 1];

 

    if(!pNo) continue;

    if (!plantMap.has(pNo)) continue;

 

    let erpIdx = plantMap.get(pNo);



    // Pass bounds to memory processor

    let result = processInMemory(rowData, status, erpIdx, erpValues, erpBackgrounds, dateColMap, dateBounds, mergeQueue, erpMaxCols);



    if (result.success) {

      erpValues\[erpIdx]\[ERP\_STATUS\_COL - 1] = status;

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

  let currentBlock = \[];

  let startIdx = -1;



  for (let i = 0; i < sortedRows.length; i++) {

     if (currentBlock.length === 0) {

         currentBlock.push(sortedRows\[i]);

         startIdx = sortedRows\[i];

     } else {

         if (sortedRows\[i] === sortedRows\[i-1] + 1) {

             currentBlock.push(sortedRows\[i]);

         } else {

             // Flush previous block

             flushBlock(erpSheet, erpValues, erpBackgrounds, startIdx, currentBlock.length, erpMaxCols);

             currentBlock = \[sortedRows\[i]];

             startIdx = sortedRows\[i];

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

         let color = (erpBackgrounds\[f.erpIdx]\[todayIdx] || "#ffffff").toLowerCase();

         for (let \[key, val] of Object.entries(COLORS)) {

            if (val.toLowerCase() === color) { correctStatus = key; break; }

         }

      }

 

      // Update Stock Sheet

      stockSheet.getRange(f.row, STOCK\_START\_COL, 1, 4).clearContent();

      stockSheet.getRange(f.row, STOCK\_STATUS\_COL).setValue(correctStatus);

    });

    Browser.msgBox(`⚠️ BLOCKED ${failQueue.length} ROWS due to conflicts.`);

  }



  // Clean Stock Markers

  rowsToProcess.forEach(r => {

    stockSheet.getRange(r, STOCK\_STATUS\_COL).setBackground(null);

  });



  refreshSystemCache();

  ss.toast(`Batch Complete. ${successCount} updated.`, "✅ Done", 3);

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

    let startCol = ERP\_DATE\_START\_COL - 1;

    let endCol = maxCols - 1;

    for (let c = startCol; c <= endCol; c++) {

      let color = (erpBgGrid\[erpIdx]\[c] || "#ffffff").toLowerCase();

      if (color !== "#ffffff" \&\& color !== "white") return { success: false };

    }

    let numCols = endCol - startCol + 1;

    for (let c = startCol; c <= endCol; c++) {

      erpBgGrid\[erpIdx]\[c] = (status === "SOLD TO KSA") ? COLORS\["SOLD TO KSA"] : COLORS\["IN KSA"];

      if (c === startCol) erpValGrid\[erpIdx]\[c] = status;

      else erpValGrid\[erpIdx]\[c] = "";

    }

    mergeQueue.push({ row: erpIdx, col: startCol, numCols: numCols, shouldMerge: true });

    return { success: true };

  }



  let startDate = stockRowData\[STOCK\_START\_COL - 1];

  let endDate = stockRowData\[STOCK\_END\_COL - 1];

  let logIn = stockRowData\[STOCK\_LOG\_IN\_COL - 1];

  let logOut = stockRowData\[STOCK\_LOG\_OUT\_COL - 1];



  if (!(startDate instanceof Date) || !(endDate instanceof Date)) return { success: false };



  let sStr = Utilities.formatDate(startDate, TIMEZONE, "yyyy-MM-dd");

  let eStr = Utilities.formatDate(endDate, TIMEZONE, "yyyy-MM-dd");

  let lInStr = (logIn instanceof Date) ? Utilities.formatDate(logIn, TIMEZONE, "yyyy-MM-dd") : null;

  let lOutStr = (logOut instanceof Date) ? Utilities.formatDate(logOut, TIMEZONE, "yyyy-MM-dd") : null;



  // --- CLAMPING LOGIC FOR BATCH ---

  let startCol = -1, endCol = -1;



  if (dateColMap.has(sStr)) startCol = dateColMap.get(sStr);

  else if (sStr < dateBounds.min \&\& eStr >= dateBounds.min) startCol = dateColMap.get(dateBounds.min);



  if (dateColMap.has(eStr)) endCol = dateColMap.get(eStr);

  else if (eStr > dateBounds.max \&\& sStr <= dateBounds.max) endCol = dateColMap.get(dateBounds.max);



  // Logistics indices

  let logInCol = (lInStr \&\& dateColMap.has(lInStr)) ? dateColMap.get(lInStr) : -1;

  let logOutCol = (lOutStr \&\& dateColMap.has(lOutStr)) ? dateColMap.get(lOutStr) : -1;



  if (startCol === -1) {

     if (endCol !== -1) startCol = ERP\_DATE\_START\_COL - 1; // 0-based

     else return { success: false };

  }

  if (endCol === -1) endCol = maxCols - 1;



  let effectiveStart = (logInCol !== -1 \&\& logInCol < startCol) ? logInCol : startCol;

  let effectiveEnd = (logOutCol !== -1 \&\& logOutCol > endCol) ? logOutCol : endCol;



  for (let c = effectiveStart; c <= effectiveEnd; c++) {

    let color = (erpBgGrid\[erpIdx]\[c] || "#ffffff").toLowerCase();

    if (color !== "#ffffff" \&\& color !== "white") return { success: false };

  }



  const job = stockRowData\[STOCK\_JOB\_COL - 1] || "";

  const client = stockRowData\[STOCK\_CLIENT\_COL - 1] || "";

  const project = stockRowData\[STOCK\_PROJECT\_COL - 1] || "";

  const cellText = \[job, client, project].filter(Boolean).join(" | ");

  let newColor = COLORS\[status] || COLOR\_AVAILABLE;



  if (logInCol !== -1 \&\& logInCol < startCol) {

    for (let c = logInCol; c < startCol; c++) {

      erpBgGrid\[erpIdx]\[c] = COLOR\_LOGISTICS;

      erpValGrid\[erpIdx]\[c] = "";

    }

    mergeQueue.push({ row: erpIdx, col: logInCol, numCols: (startCol - logInCol), shouldMerge: false });

  }



  for (let c = startCol; c <= endCol; c++) {

    erpBgGrid\[erpIdx]\[c] = newColor;

    if (c === startCol) erpValGrid\[erpIdx]\[c] = cellText;

    else erpValGrid\[erpIdx]\[c] = "";

  }

  mergeQueue.push({ row: erpIdx, col: startCol, numCols: (endCol - startCol + 1), shouldMerge: true });



  if (logOutCol !== -1 \&\& logOutCol > endCol) {

    for (let c = endCol + 1; c <= logOutCol; c++) {

      erpBgGrid\[erpIdx]\[c] = COLOR\_LOGISTICS;

      erpValGrid\[erpIdx]\[c] = "";

    }

    mergeQueue.push({ row: erpIdx, col: endCol + 1, numCols: (logOutCol - endCol), shouldMerge: false });

  }



  return { success: true };

}



function applyColor(range, color, text, merge) {

  range.breakApart();

  range.setBackground(color);

  if (merge \&\& range.getNumColumns() > 1) range.merge();

  if (text !== undefined) range.setValue(text);

  range.setHorizontalAlignment("center");

  range.setVerticalAlignment("middle");

}



function syncStatusFast(ss, rowDataArray, row, targetSheetName, manualVal) {

  let pNo, val;

  if (rowDataArray) {

    pNo = String(rowDataArray\[STOCK\_PLANT\_COL - 3]).trim();

    val = rowDataArray\[STOCK\_STATUS\_COL - 3];

  } else {

    const erpSheet = ss.getSheetByName(SHEET\_ERP);

    pNo = String(erpSheet.getRange(row, ERP\_PLANT\_COL).getValue()).trim();

    val = manualVal;

  }

  if (!pNo) return;



  if (targetSheetName === SHEET\_ERP) {

    const { plantRowMap } = getFastErpIndices(ss);

    if (plantRowMap.has(pNo)) {

      const r = plantRowMap.get(pNo) + 1;

      ss.getSheetByName(SHEET\_ERP).getRange(r, ERP\_STATUS\_COL).setValue(val);

    }

  } else {

    const stockSheet = ss.getSheetByName(SHEET\_STOCK);

    const plants = stockSheet.getRange(4, STOCK\_PLANT\_COL, stockSheet.getLastRow(), 1).getValues();

    for(let i=0; i<plants.length; i++) {

      if(String(plants\[i]\[0]).trim() === pNo) {

        stockSheet.getRange(i+4, STOCK\_STATUS\_COL).setValue(val);

        break;

      }

    }

  }

}



function getFastErpIndices(ss) {

  const cache = CacheService.getScriptCache();

  const cachedPlants = cache.get(CACHE\_KEY\_ERP\_MAP);

  const cachedDates = cache.get(CACHE\_KEY\_DATE\_MAP);

  const cachedBounds = cache.get(CACHE\_KEY\_BOUNDS);

  if (cachedPlants \&\& cachedDates \&\& cachedBounds) {

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

  const erpSheet = ss.getSheetByName(SHEET\_ERP);

  const lastRow = erpSheet.getLastRow();

  const lastCol = erpSheet.getLastColumn();

  const plantVals = erpSheet.getRange(1, ERP\_PLANT\_COL, lastRow, 1).getValues();

  const plantRowMap = new Map();

  for (let i = 3; i < plantVals.length; i++) {

    let p = String(plantVals\[i]\[0]).trim();

    if (p) plantRowMap.set(p, i);

  }

  const dateVals = erpSheet.getRange(ERP\_DATE\_ROW, 1, 1, lastCol).getValues()\[0];

  const dateColMap = new Map();

  let minStr = null, maxStr = null;



  for (let c = ERP\_DATE\_START\_COL - 1; c < dateVals.length; c++) {

    if (dateVals\[c] instanceof Date) {

      let dStr = Utilities.formatDate(dateVals\[c], TIMEZONE, "yyyy-MM-dd");

      dateColMap.set(dStr, c);

      // Capture Min/Max for clamping

      if (!minStr || dStr < minStr) minStr = dStr;

      if (!maxStr || dStr > maxStr) maxStr = dStr;

    }

  }

  const bounds = { min: minStr, max: maxStr };



  const cache = CacheService.getScriptCache();

  try {

    cache.put(CACHE\_KEY\_ERP\_MAP, JSON.stringify(Array.from(plantRowMap.entries())), CACHE\_EXPIRY);

    cache.put(CACHE\_KEY\_DATE\_MAP, JSON.stringify(Array.from(dateColMap.entries())), CACHE\_EXPIRY);

    cache.put(CACHE\_KEY\_BOUNDS, JSON.stringify(bounds), CACHE\_EXPIRY);

  } catch(e) {}

 

  // This explicitly returns the structure needed by getFastErpIndices

  return { plantRowMap, dateColMap, dateBounds: bounds };

}



// --- ORIGINAL EXACT LOGIC AS REQUESTED ---

function checkStatusLock(sheet, row, newVal, range) {

  if (newVal === "AVAILABLE") {

    const todayStr = Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd");

    const headerDates = sheet.getRange(ERP\_DATE\_ROW, 1, 1, sheet.getLastColumn()).getValues()\[0];

    let todayCol = -1;

    for (let c = ERP\_DATE\_START\_COL - 1; c < headerDates.length; c++) {

      if (headerDates\[c] instanceof Date \&\& Utilities.formatDate(headerDates\[c], TIMEZONE, "yyyy-MM-dd") === todayStr) {

        todayCol = c + 1; break;

      }

    }

    if (todayCol !== -1) {

      let cell = sheet.getRange(row, todayCol);

      let color = (cell.getBackground() || "#ffffff").toLowerCase();

      if ((color === "#ffffff" || color === "white") \&\& cell.isPartOfMerge()) {

         let ranges = cell.getMergedRanges();

         if (ranges.length > 0) color = (ranges\[0].getCell(1, 1).getBackground() || "#ffffff").toLowerCase();

      }

      if (color !== COLOR\_AVAILABLE \&\& color !== "#ffffff" \&\& color !== "white") {

        Browser.msgBox("⛔ STATUS LOCKED\\\\n\\\\nItem is booked for TODAY.");

        let correctStatus = "BOOKED";

        for (let key in COLORS) { if (COLORS\[key].toLowerCase() === color) correctStatus = key; }

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

  if (e \&\& e.changeType !== 'EDIT' \&\& e.changeType !== 'INSERT\_ROW' \&\& e.changeType !== 'OTHER') return;



  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const stockSheet = ss.getSheetByName(SHEET\_STOCK);

  const erpSheet = ss.getSheetByName(SHEET\_ERP);

 

  const lastRow = stockSheet.getLastRow();

  if (lastRow < 4) return;



  // 1. Read all Stock Data

  const stockData = stockSheet.getRange(4, 1, lastRow - 3, 11).getValues();



  // 2. Read ERP Statuses to compare

  const erpLastRow = erpSheet.getLastRow();

  const erpPlants = erpSheet.getRange(4, ERP\_PLANT\_COL, erpLastRow - 3, 1).getValues();

  const erpStatuses = erpSheet.getRange(4, ERP\_STATUS\_COL, erpLastRow - 3, 1).getValues();



  const erpStatusMap = new Map();

  for (let i = 0; i < erpPlants.length; i++) {

     let p = String(erpPlants\[i]\[0]).trim();

     if (p) erpStatusMap.set(p, String(erpStatuses\[i]\[0]).trim());

  }



  let processedAny = false;



  // 3. Find newly added "SERVICE" statuses from AppSheet

  for (let i = 0; i < stockData.length; i++) {

     let rowData = stockData\[i];

     let pNo = String(rowData\[STOCK\_PLANT\_COL - 1]).trim();

     let status = String(rowData\[STOCK\_STATUS\_COL - 1]).trim();

 

     // If AppSheet set it to SERVICE...

     if (pNo \&\& status === "SERVICE") {

 

         // ...and it hasn't been synced to the ERP List yet

         if (erpStatusMap.get(pNo) !== "SERVICE") {

 

             const stockRow = i + 4;

             // Extract the specific array format your engine expects

             let targetDataArray = stockSheet.getRange(stockRow, 3, 1, 9).getValues()\[0];

 

             // Fix AppSheet's Text Dates (Convert "DD/MM/YYYY" to real Date objects)

             // Indices: Start=5, End=6, LogIn=7, LogOut=8

             \[5, 6, 7, 8].forEach(idx => {

                 let val = targetDataArray\[idx];

                 if (typeof val === "string" \&\& val.includes("/")) {

                     let parts = val.trim().split("/");

                     if (parts.length === 3) {

                         targetDataArray\[idx] = new Date(parts\[2], parts\[1] - 1, parts\[0], 0, 0, 0);

                     }

                 } else if (typeof val === "string" \&\& val.includes("-")) {

                     targetDataArray\[idx] = new Date(val); // Fallback just in case

                 }

             });



             // AUTO-PROCESS: Send it directly to your calendar engine!

             syncStatusFast(ss, targetDataArray, stockRow, SHEET\_ERP);

             handleSingleBookingFast(ss, stockSheet, stockRow, targetDataArray);

 

             // Overwrite the weird AppSheet text dates with real Dates in the spreadsheet so it looks clean

             stockSheet.getRange(stockRow, STOCK\_START\_COL, 1, 4).setValues(\[\[

                 targetDataArray\[5] instanceof Date ? targetDataArray\[5] : "",

                 targetDataArray\[6] instanceof Date ? targetDataArray\[6] : "",

                 targetDataArray\[7] instanceof Date ? targetDataArray\[7] : "",

                 targetDataArray\[8] instanceof Date ? targetDataArray\[8] : ""

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

  const erpSheet = ss.getSheetByName(SHEET\_ERP);

  const stockSheet = ss.getSheetByName(SHEET\_STOCK);

 

  const todayStr = Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd");

 

  const lastRow = erpSheet.getLastRow();

  const lastCol = erpSheet.getLastColumn();

  if (lastRow < 4) return;



  // 1. BULK READ EVERYTHING (Lightning Fast Simultaneous Execution)

  const erpDataRange = erpSheet.getRange(1, 1, lastRow, lastCol);

  const erpValues = erpDataRange.getValues();

  const erpBackgrounds = erpDataRange.getBackgrounds();

  const erpMerges = erpDataRange.getMergedRanges(); // 1 API call gets ALL merges instantly

 

  const headerDates = erpValues\[ERP\_DATE\_ROW - 1];

  let todayIdx = -1;

 

  // Find "Today" Column Index

  for (let c = ERP\_DATE\_START\_COL - 1; c < headerDates.length; c++) {

    if (headerDates\[c] instanceof Date \&\& Utilities.formatDate(headerDates\[c], TIMEZONE, "yyyy-MM-dd") === todayStr) {

      todayIdx = c; break;

    }

  }



  const erpStatuses = erpSheet.getRange(4, ERP\_STATUS\_COL, lastRow - 3, 1).getValues();

  const erpPlants = erpSheet.getRange(4, ERP\_PLANT\_COL, lastRow - 3, 1).getValues();

 

  let newStatuses = \[];

  let statusMap = new Map(); // Stores Plant No. -> Correct Status

 

  if (todayIdx === -1) {

    // Today is not on the calendar, retain KSA statuses, reset others.

    for (let i = 0; i < erpStatuses.length; i++) {

      let current = erpStatuses\[i]\[0];

      let correct = (current === "SOLD TO KSA" || current === "IN KSA") ? current : "AVAILABLE";

      newStatuses.push(\[correct]);

 

      let pNo = String(erpPlants\[i]\[0]).trim();

      if (pNo) statusMap.set(pNo, correct);

    }

  } else {

    // 2. IN-MEMORY MERGE CALCULATION (100x Faster than checking cell by cell)

    let mergeColorMap = new Map(); // Maps rowIdx -> True Color of the Merge

 

    for (let i = 0; i < erpMerges.length; i++) {

      let m = erpMerges\[i];

      let mRow = m.getRow() - 1;    // 0-based row index

      let mCol = m.getColumn() - 1; // 0-based col index

      let mWidth = m.getNumColumns();

      let mHeight = m.getNumRows();

 

      // If this merge covers "Today" horizontally...

      if (todayIdx >= mCol \&\& todayIdx < mCol + mWidth) {

        // ...The true color is always in the top-left cell of the merge

        let trueColor = (erpBackgrounds\[mRow]\[mCol] || "#ffffff").toLowerCase();

 

        // Apply this color to all rows covered by this specific merge

        for(let hr = 0; hr < mHeight; hr++) {

           mergeColorMap.set(mRow + hr, trueColor);

        }

      }

    }



    // 3. MAP COLORS TO STATUSES

    for (let i = 0; i < erpStatuses.length; i++) {

      let rowIdx = i + 3; // 0-based row index for data starting on row 4

      let current = erpStatuses\[i]\[0];

 

      // If row is inside a merge on today's date, use the merge color. Else use standard cell color.

      let color = mergeColorMap.has(rowIdx)

          ? mergeColorMap.get(rowIdx)

          : (erpBackgrounds\[rowIdx]\[todayIdx] || "#ffffff").toLowerCase();



      let correct = "AVAILABLE";

 

      if (color === COLORS\["BOOKED"].toLowerCase() || color === COLORS\["ON HIRE"].toLowerCase()) {

         correct = (current === "ON HIRE") ? "ON HIRE" : "BOOKED";

      }

      else if (color === COLORS\["QUOTE"].toLowerCase()) correct = "QUOTE";

      else if (color === COLORS\["SERVICE"].toLowerCase()) correct = "SERVICE";

      else if (color === COLORS\["SOLD TO KSA"].toLowerCase()) correct = "SOLD TO KSA";

      else if (color === COLORS\["IN KSA"].toLowerCase()) correct = "IN KSA";

      else if (current === "SOLD TO KSA" || current === "IN KSA") correct = current;

 

      newStatuses.push(\[correct]);

 

      let pNo = String(erpPlants\[i]\[0]).trim();

      if (pNo) statusMap.set(pNo, correct);

    }

  }



  // 4. SIMULTANEOUS WRITE: ERP LIST

  erpSheet.getRange(4, ERP\_STATUS\_COL, lastRow - 3, 1).setValues(newStatuses);



  // 5. SIMULTANEOUS WRITE: STOCK STATUS

  const stockLastRow = stockSheet.getLastRow();

  if (stockLastRow >= 4) {

    const stockPlants = stockSheet.getRange(4, STOCK\_PLANT\_COL, stockLastRow - 3, 1).getValues();

    const stockStatuses = stockSheet.getRange(4, STOCK\_STATUS\_COL, stockLastRow - 3, 1).getValues();

    let stockUpdatesCount = 0;



    for (let i = 0; i < stockPlants.length; i++) {

      let pNo = String(stockPlants\[i]\[0]).trim();

      if (statusMap.has(pNo)) {

        let newStat = statusMap.get(pNo);

        if (stockStatuses\[i]\[0] !== newStat) {

          stockStatuses\[i]\[0] = newStat;

          stockUpdatesCount++;

        }

      }

    }



    // Only hit the spreadsheet if changes are actually needed

    if (stockUpdatesCount > 0) {

      stockSheet.getRange(4, STOCK\_STATUS\_COL, stockLastRow - 3, 1).setValues(stockStatuses);

    }

  }

  refreshSystemCache(); // Synced cache update for speed

  ss.toast("Force Refresh Complete. Cache Synced.", "✅ Success", 5);

}

import tools.gs:

/\*\*

 \* 📥 IMPORT TOOL

 \* Connects to an old season's sheet and pulls Status + Job Details into the current sheet.

 \*/



function onOpen() {

  const ui = SpreadsheetApp.getUi();



  // 🛠️ DIAGNOSTIC MENU (Updated with the new button)

  ui.createMenu('🛠️ SYSTEM DIAGNOSTIC')

    .addItem('1. 🏥 Run Full System Health Check', 'runSystemHealthCheck')

    .addItem('2. 🔗 Check Plant ID Mapping \& Duplicates', 'checkPlantIDIntegrity')

    .addItem('3. 🕵️ Simulate/Diagnose Selected Row', 'diagnoseSelectedRow')

    .addSeparator() // Adds a line to separate the tools

    .addItem('⚡ FORCE REFRESH: Update Statuses for TODAY', 'updateDailyStatus') // <--- NEW BUTTON

    .addItem('🧹 Smart Ghost Cleaner (Safe)', 'cleanGhostDataSmart')

    .addItem('🎨 Optimize Formatting Rules', 'runFullSystemOptimization')

    .addSeparator()

    .addItem('♻️ Rebuild System Cache', 'refreshSystemCache')

    .addToUi();

 



  // 🔄 IMPORT MENU

  ui.createMenu('🔄 IMPORT DATA')

    .addItem('Import Status from Old Sheet', 'importStockStatus')

    .addToUi();



  ui.createMenu('⚡ BATCH OPERATIONS')

    .addItem('🚀 PROCESS YELLOW BATCH ROWS', 'processBatchQueue')

    .addToUi();



  ui.createMenu('🔄 SCOPE SYNC')

    .addItem('📥 Sync All "SC" Sheets to Stock', 'syncClientScopes')

    .addToUi();

 

 ui.createMenu('🔎 SCOPE TOOLS')

    .addItem('🔍 Check Selected Row Availability', 'checkStandaloneAvailability')

    .addToUi();

}

/\*\*

 \* 📥 IMPORT TOOL (SAFE MODE)

 \* Connects to an old season's sheet and pulls Status + Job Details into the current sheet.

 \* STRICTLY PROTECTS existing data. Will not overwrite any populated cells or rows with dates.

 \*/



function onOpen() {

  const ui = SpreadsheetApp.getUi();



  // 🛠️ DIAGNOSTIC MENU

  ui.createMenu('🛠️ SYSTEM DIAGNOSTIC')

    .addItem('1. 🏥 Run Full System Health Check', 'runSystemHealthCheck')

    .addItem('2. 🔗 Check Plant ID Mapping \& Duplicates', 'checkPlantIDIntegrity')

    .addItem('3. 🕵️ Simulate/Diagnose Selected Row', 'diagnoseSelectedRow')

    .addSeparator()

    .addItem('⚡ FORCE REFRESH: Update Statuses for TODAY', 'updateDailyStatus')

    .addItem('🧹 Smart Ghost Cleaner (Safe)', 'cleanGhostDataSmart')

    .addItem('🎨 Optimize Formatting Rules', 'runFullSystemOptimization')

    .addSeparator()

    .addItem('♻️ Rebuild System Cache', 'refreshSystemCache')

    .addToUi();

 

  // 🔄 IMPORT MENU

  ui.createMenu('🔄 IMPORT DATA')

    .addItem('Import Status from Old Sheet', 'importStockStatus')

    .addToUi();



  // ⚡ BATCH OPERATIONS

  ui.createMenu('⚡ BATCH OPERATIONS')

    .addItem('🚀 PROCESS YELLOW BATCH ROWS', 'processBatchQueue')

    .addToUi();



  // 🔄 SCOPE SYNC

  ui.createMenu('🔄 SCOPE SYNC')

    .addItem('📥 Sync All "SC" Sheets to Stock', 'syncClientScopes')

    .addToUi();

 

  // 🔎 SCOPE TOOLS

  ui.createMenu('🔎 SCOPE TOOLS')

    .addItem('🔍 Check Selected Row Availability', 'checkStandaloneAvailability')

    .addToUi();

}





function importStockStatus() {

  const ui = SpreadsheetApp.getUi();

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const currentSheet = ss.getSheetByName("STOCK STATUS");

  const COLOR\_PENDING\_BATCH = "#ffff00"; // Yellow for batch processing



  if (!currentSheet) {

    ui.alert("❌ Error: Could not find tab named 'STOCK STATUS' in this file.");

    return;

  }



  // 1. Ask for Old Sheet URL

  const response = ui.prompt(

    'Connect to Old Sheet',

    'Please paste the URL or ID of the OLD Season Sheet:',

    ui.ButtonSet.OK\_CANCEL

  );



  if (response.getSelectedButton() !== ui.Button.OK) return;

  const input = response.getResponseText().trim();

  if (!input) return;



  let sourceId = input;

  if (input.includes("docs.google.com")) {

    const match = input.match(/\\/d\\/(\[a-zA-Z0-9-\_]+)/);

    if (match) sourceId = match\[1];

  }



  // 2. Open Source Sheet

  let sourceSheet;

  try {

    const sourceSS = SpreadsheetApp.openById(sourceId);

    sourceSheet = sourceSS.getSheetByName("STOCK STATUS");

    if (!sourceSheet) {

      ui.alert("❌ Error: Connected, but could not find 'STOCK STATUS' tab in the old file.");

      return;

    }

  } catch (e) {

    ui.alert("❌ Error: Access denied or invalid ID.\\n" + e.message);

    return;

  }



  ss.toast("Reading data...", "🔄 Connecting");



  // 3. Get Data \& Dynamic Column Mapping

  const sourceData = sourceSheet.getDataRange().getValues();

  const currentData = currentSheet.getDataRange().getValues();



  function findCol(headers, name) {

    return headers.findIndex(h => String(h).toUpperCase().trim().includes(name.toUpperCase()));

  }



  let srcHeaderRow = 2;

  if (findCol(sourceData\[2], "PLANT") === -1) srcHeaderRow = 0;



  const srcCols = {

    plant: findCol(sourceData\[srcHeaderRow], "PLANT"),

    status: findCol(sourceData\[srcHeaderRow], "STATUS"),

    job: findCol(sourceData\[srcHeaderRow], "JOB"),

    client: findCol(sourceData\[srcHeaderRow], "CLIENT"),

    project: findCol(sourceData\[srcHeaderRow], "PROJECT"),

    start: findCol(sourceData\[srcHeaderRow], "START"),

    end: findCol(sourceData\[srcHeaderRow], "END")

  };



  if (srcCols.plant === -1 || srcCols.status === -1) {

    ui.alert("❌ Error: Could not find 'PLANT NO' or 'STATUS' columns in the old sheet.");

    return;

  }



  // 4. Build Data Map from Old Sheet

  let dataMap = new Map();

  for (let i = srcHeaderRow + 1; i < sourceData.length; i++) {

    let id = String(sourceData\[i]\[srcCols.plant]).trim();

    if (id) {

      dataMap.set(id, {

        status: sourceData\[i]\[srcCols.status],

        job: srcCols.job > -1 ? sourceData\[i]\[srcCols.job] : "",

        client: srcCols.client > -1 ? sourceData\[i]\[srcCols.client] : "",

        project: srcCols.project > -1 ? sourceData\[i]\[srcCols.project] : "",

        start: srcCols.start > -1 ? sourceData\[i]\[srcCols.start] : "",

        end: srcCols.end > -1 ? sourceData\[i]\[srcCols.end] : ""

      });

    }

  }



  // 5. Map Current Sheet Columns

  const curCols = {

    plant: findCol(currentData\[2], "PLANT"),

    status: findCol(currentData\[2], "STATUS"),

    job: findCol(currentData\[2], "JOB"),

    client: findCol(currentData\[2], "CLIENT"),

    project: findCol(currentData\[2], "PROJECT"),

    start: findCol(currentData\[2], "START"),

    end: findCol(currentData\[2], "END")

  };



  if (curCols.plant === -1) curCols.plant = 2;

  if (curCols.status === -1) curCols.status = 3;



  // 6. Prepare Batch Updates

  let updates = 0;

  let numRows = currentSheet.getLastRow() - 3;

  if (numRows < 1) return;



  let newStatus = \[], newJob = \[], newClient = \[], newProject = \[], newStart = \[], newEnd = \[];

 

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



    let id = String(currentData\[currentRowIndex]\[curCols.plant]).trim();

    let oldData = dataMap.get(id);



    // --- ROW LEVEL PROTECTION ---

    // Check if the current row already has a Start OR End date filled in

    let curStartStr = String(valStart\[i]\[0]).trim();

    let curEndStr = String(valEnd\[i]\[0]).trim();

    let hasExistingDates = (curStartStr !== "" || curEndStr !== "");



    // If old data exists AND the row doesn't have existing dates blocking it

    if (oldData \&\& !hasExistingDates) {

      let isRowUpdated = false;



      // STATUS: Only apply if current status is empty or "AVAILABLE"

      let curStatusStr = String(valStatus\[i]\[0]).trim();

      if (oldData.status \&\& (curStatusStr === "" || curStatusStr === "AVAILABLE")) {

         newStatus.push(\[oldData.status]);

 

         // Highlight for Batch Processor if it's an active booking

         if (oldData.status !== "AVAILABLE") {

             bgStatus\[i]\[0] = COLOR\_PENDING\_BATCH;

         }

         isRowUpdated = true;

      } else {

         newStatus.push(\[valStatus\[i]\[0]]);

      }



      // --- CELL LEVEL PROTECTION (NO OVERWRITING) ---

      // Only import if old data exists AND the current cell is completely blank

 

      if (oldData.job \&\& !String(valJob\[i]\[0]).trim()) { newJob.push(\[oldData.job]); isRowUpdated = true; }

      else { newJob.push(\[valJob\[i]\[0]]); }



      if (oldData.client \&\& !String(valClient\[i]\[0]).trim()) { newClient.push(\[oldData.client]); isRowUpdated = true; }

      else { newClient.push(\[valClient\[i]\[0]]); }



      if (oldData.project \&\& !String(valProject\[i]\[0]).trim()) { newProject.push(\[oldData.project]); isRowUpdated = true; }

      else { newProject.push(\[valProject\[i]\[0]]); }



      if (oldData.start \&\& !curStartStr) { newStart.push(\[oldData.start]); isRowUpdated = true; }

      else { newStart.push(\[valStart\[i]\[0]]); }



      if (oldData.end \&\& !curEndStr) { newEnd.push(\[oldData.end]); isRowUpdated = true; }

      else { newEnd.push(\[valEnd\[i]\[0]]); }



      if (isRowUpdated) updates++;



    } else {

      // Data is protected by dates OR no matching old data found. Keep current values exactly as they are.

      newStatus.push(\[valStatus\[i]\[0]]);

      newJob.push(\[valJob\[i]\[0]]);

      newClient.push(\[valClient\[i]\[0]]);

      newProject.push(\[valProject\[i]\[0]]);

      newStart.push(\[valStart\[i]\[0]]);

      newEnd.push(\[valEnd\[i]\[0]]);

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

 

    ui.alert(`✅ Safe Import Complete!\\\\n\\\\nImported data for ${updates} items into empty cells. All your existing data and dates were protected.\\\\n\\\\nYellow items are ready for Batch Processing!`);

  } else {

    ui.alert("⚠️ Data scanned, but no empty cells needed filling or rows were protected by existing dates.");

  }

}

debug.gs:

// --- DEBUGGER CONFIGURATION (Matches your Main Script) ---

const DBG\_SHEET\_STOCK = "STOCK STATUS";

const DBG\_SHEET\_ERP = "ERP LIST";

const DBG\_TIMEZONE = "Asia/Dubai";

const DBG\_ERP\_DATE\_ROW = 3;

const DBG\_ERP\_DATE\_START\_COL = 7; // Col G







/\*\*

 \* TEST 1: SYSTEM HEALTH

 \* Checks: Sheet names, Date formats, "Today" existence, Timezone alignment.

 \*/

function runSystemHealthCheck() {

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const stockSheet = ss.getSheetByName(DBG\_SHEET\_STOCK);

  const erpSheet = ss.getSheetByName(DBG\_SHEET\_ERP);

  let log = "--- 🏥 SYSTEM HEALTH REPORT ---\\n";

  let errors = 0;



  // 1. CHECK SHEETS

  if (!stockSheet) { log += "❌ MISSING SHEET: 'STOCK STATUS'\\n"; errors++; }

  else log += "✅ Found 'STOCK STATUS'\\n";

 

  if (!erpSheet) { log += "❌ MISSING SHEET: 'ERP LIST'\\n"; errors++; }

  else log += "✅ Found 'ERP LIST'\\n";



  if (errors > 0) { Browser.msgBox(log); return; }



  // 2. CHECK TIMEZONE

  const sheetTZ = ss.getSpreadsheetTimeZone();

  if (sheetTZ !== DBG\_TIMEZONE) {

    log += `⚠️ TIMEZONE MISMATCH: Sheet is '${sheetTZ}', Script is '${DBG\\\_TIMEZONE}'.\\\\n   (This might cause dates to be off by 1 day).\\\\n`;

  } else {

    log += `✅ Timezone Aligned (${DBG\\\_TIMEZONE})\\\\n`;

  }



  // 3. CHECK CALENDAR HEADERS

  const headers = erpSheet.getRange(DBG\_ERP\_DATE\_ROW, DBG\_ERP\_DATE\_START\_COL, 1, 15).getValues()\[0];

  let dateErrors = 0;

  headers.forEach((h, i) => {

    if (!(h instanceof Date)) {

      dateErrors++;

      if (dateErrors === 1) log += `❌ ROW 3 ERROR: Column ${i+7} is TEXT, not a Date. Value: "${h}"\\\\n`;

    }

  });



  if (dateErrors > 0) {

    log += "⚠️ CRITICAL: Calendar headers contain text. Script cannot read them.\\n";

    errors++;

  } else {

    log += "✅ Calendar Headers are valid Date Objects.\\n";

  }



  // 4. FIND "TODAY"

  const todayStr = Utilities.formatDate(new Date(), DBG\_TIMEZONE, "yyyy-MM-dd");

  const allHeaders = erpSheet.getRange(DBG\_ERP\_DATE\_ROW, 1, 1, erpSheet.getLastColumn()).getValues()\[0];

  let todayCol = -1;

  for (let c = DBG\_ERP\_DATE\_START\_COL - 1; c < allHeaders.length; c++) {

    if (allHeaders\[c] instanceof Date) {

      if (Utilities.formatDate(allHeaders\[c], DBG\_TIMEZONE, "yyyy-MM-dd") === todayStr) {

        todayCol = c + 1;

        break;

      }

    }

  }



  if (todayCol !== -1) log += `✅ 'Today' (${todayStr}) found at Column ${todayCol}.\\\\n`;

  else {

    log += `⚠️ 'Today' (${todayStr}) NOT found in header. Daily Scanner will fail.\\\\n`;

    errors++;

  }



  if (errors === 0) log += "\\n🎉 SYSTEM IS HEALTHY.";

  else log += `\\\\nfound ${errors} errors.`;



  Browser.msgBox(log);

}



/\*\*

 \* TEST 2: DATA INTEGRITY

 \* Checks: Duplicate Plant IDs, IDs existing in one sheet but not the other.

 \*/

function checkPlantIDIntegrity() {

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const stockSheet = ss.getSheetByName(DBG\_SHEET\_STOCK);

  const erpSheet = ss.getSheetByName(DBG\_SHEET\_ERP);

  let log = "--- 🔗 DATA INTEGRITY REPORT ---\\n";

 

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

    log += "❌ DUPLICATE IDs IN ERP LIST (Script will only find the first one):\\n";

    duplicates.forEach(d => log += `   - ${d}\\\\n`);

  } else {

    log += "✅ No Duplicate IDs in ERP List.\\n";

  }



  // 2. Check Matching

  let missingInERP = 0;

  stockIDs.forEach(id => {

    if (!seen.has(id.trim())) missingInERP++;

  });



  if (missingInERP > 0) {

    log += `⚠️ ${missingInERP} Plant IDs are in STOCK but missing from ERP LIST.\\\\n`;

  } else {

    log += "✅ All Stock IDs exist in ERP List.\\n";

  }



  Browser.msgBox(log);

}



/\*\*

 \* TEST 3: SIMULATION (The "Why didn't it work?" tool)

 \* Select a row in STOCK STATUS and run this. It runs the conflict logic in "Read-Only" mode.

 \*/

function diagnoseSelectedRow() {

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const sheet = ss.getActiveSheet();

  const ui = SpreadsheetApp.getUi();



  if (sheet.getName() !== DBG\_SHEET\_STOCK) {

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



  let log = `--- 🕵️ DIAGNOSIS ROW ${row} ---\\\\n`;

  log += `ID: ${plantNo} | Status: ${status}\\\\n`;



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

  const erpSheet = ss.getSheetByName(DBG\_SHEET\_ERP);

  const erpData = erpSheet.getDataRange().getValues();

  let erpRow = -1;

  for (let i = 3; i < erpData.length; i++) {

    if (String(erpData\[i]\[5]).trim() == String(plantNo).trim()) {

      erpRow = i + 1;

      break;

    }

  }



  if (erpRow === -1) {

    ui.alert(log + "❌ ID not found in ERP List.");

    return;

  }

  log += `✅ Mapped to ERP Row ${erpRow}\\\\n`;



  // 3. Calculate Range

  const sStr = Utilities.formatDate(start, DBG\_TIMEZONE, "yyyy-MM-dd");

  let eStr = (end instanceof Date) ? Utilities.formatDate(end, DBG\_TIMEZONE, "yyyy-MM-dd") : "End of Sheet";

 

  // Find Cols

  const headers = erpSheet.getRange(DBG\_ERP\_DATE\_ROW, 1, 1, erpSheet.getLastColumn()).getValues()\[0];

  let startCol = -1;

  let endCol = -1;



  for (let c = DBG\_ERP\_DATE\_START\_COL - 1; c < headers.length; c++) {

    let d = headers\[c];

    if (d instanceof Date) {

      let dStr = Utilities.formatDate(d, DBG\_TIMEZONE, "yyyy-MM-dd");

      if (dStr === sStr) startCol = c + 1;

      if (end instanceof Date \&\& dStr === eStr) endCol = c + 1;

    }

  }



  if (startCol === -1) {

    ui.alert(log + `❌ Start Date ${sStr} not found in headers.`);

    return;

  }

  if (status === "SOLD TO KSA" || !end) endCol = erpSheet.getLastColumn();

  else if (endCol === -1) endCol = erpSheet.getLastColumn(); // Overflow



  log += `📅 Booking Range: Col ${startCol} to ${endCol}\\\\n`;



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

          color = (ranges\[0].getCell(1, 1).getBackground() || "#ffffff").toLowerCase();

        }

      }

    }



    if (color !== "#ffffff" \&\& color !== "white") {

      conflictFound = true;

      conflictDetail = `Cell \\\[${i+1}] has color ${color}`;

      break;

    }

  }



  if (conflictFound) {

    log += `\\\\n🔴 CONFLICT DETECTED: ${conflictDetail}\\\\n`;

    log += "✅ The script WILL block this booking.\\n";

  } else {

    log += "\\n🟢 NO CONFLICTS found.\\n";

    log += "ℹ️ The script will ALLOW this booking.\\n";

  }



  Browser.msgBox(log);

}



/\*\*

 \* 🛠️ SMART GHOST CLEANER (Ultra-Safe Mode)

 \* Removes unused rows/cols to speed up the sheet, but PROTECTS formatting/borders.

 \*/

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

  const ROW\_BUFFER = 20;  // Keep 20 empty rows below the last data/border

  const COL\_BUFFER = 5;   // Keep 5 empty columns to the right



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

             for (let c = 0; c < bgColors\[0].length; c++) {

               if (bgColors\[r]\[c] !== "#ffffff" \&\& bgColors\[r]\[c] !== "white") {

                 visualLastRow = startSearch + r;

                 break;

               }

             }

           }

        }

      }



      // Calculate safe cut-off

      const keepRows = visualLastRow + ROW\_BUFFER;



      if (maxRows > keepRows) {

        const rowsToDelete = maxRows - keepRows;

        // Double check: Don't delete if it leaves less than 10 rows total

        if (rowsToDelete > 0 \&\& keepRows > 10) {

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

      let keepCols = lastContentCol + COL\_BUFFER;



      // Special handling for ERP LIST (Dates run horizontally)

      // We trust getLastColumn() heavily here as dates usually populate headers

 

      if (maxCols > keepCols) {

        const colsToDelete = maxCols - keepCols;

        if (colsToDelete > 0 \&\& keepCols > 5) {

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

      `🧹 Removed ${stats.rowsRemoved} rows \\\& ${stats.colsRemoved} cols.`,

      "Optimization Complete",

      5

    );

  } else {

    ss.toast("✨ Sheets are already optimized.", "Clean", 3);

  }

}



/\*\*

 \* ⚡ ADVANCED SYSTEM OPTIMIZER

 \* Targets silent performance killers:

 \* 1. Trims Conditional Formatting that extends infinitely.

 \* 2. Removes Data Validation from empty ghost zones.

 \* 3. Archives OLD formulas to static text (Optional Speed Boost).

 \*/



const SAFETY\_BUFFER\_ROWS = 20; // Keep formatting for this many rows after data ends

const SAFETY\_BUFFER\_COLS = 5;



function runFullSystemOptimization() {

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const ui = SpreadsheetApp.getUi();

 

  // 1. GHOST CLEANER (Structure)

  cleanGhostDataSmart(); // Run the Smart Cleaner from previous step first

 

  // 2. FORMATTING TRIMMER (Rendering Engine)

  trimOverextendedFormatting(ss);



  // 3. OPTIONAL: ARCHIVER

  // (We don't run this automatically to be safe, but we alert the user)

  ss.toast("Structure \& Formatting Optimized. Sheet should load faster.", "🚀 Done", 5);

}



/\*\*

 \* 🎨 CONDITIONAL FORMATTING TRIMMER

 \* Prevents CF rules from applying to row 50,000 if data ends at 500.

 \* This saves MASSIVE calculation power on load.

 \*/

function trimOverextendedFormatting(ss) {

  const sheets = ss.getSheets();

  let rulesTrimmed = 0;



  sheets.forEach(sheet => {

    const lastRow = sheet.getLastRow();

    const maxRow = sheet.getMaxRows();

 

    // Define the "Dead Zone" where rules shouldn't exist

    const cutOffRow = lastRow + SAFETY\_BUFFER\_ROWS;

 

    if (cutOffRow < maxRow) {

      const rules = sheet.getConditionalFormatRules();

      const newRules = \[];

      let sheetModified = false;



      rules.forEach(rule => {

        const ranges = rule.getRanges();

        const newRanges = \[];

 

        ranges.forEach(range => {

          const rRow = range.getRow();

          const rLast = range.getLastRow();

          const rCol = range.getColumn();

          const rLastCol = range.getLastColumn();



          // If the rule starts inside the data but extends into the void

          if (rRow <= cutOffRow \&\& rLast > cutOffRow) {

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



/\*\*

 \* 🔒 HISTORY ARCHIVER (Manual Trigger Only)

 \* Converts formulas in "Stock Status" to static values IF the job ended 30+ days ago.

 \* This prevents the sheet from recalculating 2024 dates every time you open it in 2026.

 \*/

function archiveHistoricalData() {

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const sheet = ss.getSheetByName("STOCK STATUS"); // Or variable SHEET\_STOCK

  const ui = SpreadsheetApp.getUi();



  const confirm = ui.alert(

    "🗄️ ARCHIVE HISTORICAL DATA?",

    "This will convert formulas to STATIC TEXT for jobs that ended over 30 days ago.\\n\\nThis makes the sheet much faster but prevents auto-updating of those specific old rows.\\n\\nProceed?",

    ui.ButtonSet.YES\_NO

  );



  if (confirm !== ui.Button.YES) return;



  const lastRow = sheet.getLastRow();

  // Assuming Col I (9) is END DATE. Adjust if needed.

  // Using your config: const STOCK\_END\_COL = 9;

  const END\_COL\_INDEX = 9;

 

  const dataRange = sheet.getRange(4, 1, lastRow - 3, sheet.getLastColumn());

  const values = dataRange.getValues();

  const formulas = dataRange.getFormulas();

 

  const today = new Date();

  const thirtyDaysAgo = new Date(today.setDate(today.getDate() - 30));

  let archivedCount = 0;



  for (let i = 0; i < values.length; i++) {

    const endDate = values\[i]\[END\_COL\_INDEX - 1]; // -1 for array index

 

    // Check if it's a date, it's in the past, AND it currently has formulas

    if (endDate instanceof Date \&\& endDate < thirtyDaysAgo) {

      let hasFormula = false;

      // Check if row has any formulas

      if (formulas\[i].some(f => f !== "")) {

        // Overwrite the whole row with its own values (removing formulas)

        const range = sheet.getRange(i + 4, 1, 1, values\[0].length);

        range.setValues(\[values\[i]]); // Paste Values

        archivedCount++;

      }

    }

  }



  ss.toast(`Archived ${archivedCount} historical rows.`, "💾 Speed Boost", 5);

}



// Add this to your Menu in onOpen (Code.gs)

/\*

   ui.createMenu('⚡ BATCH OPERATIONS')

     ...

     .addItem('🧹 Clean Ghost Data', 'cleanGhostDataSmart')

     ...

\*/

SC Updater.gs:

/\*\*

 \* ⚡ QUANTUM-VELOCITY SYNC ENGINE v2.0 (The "Priority" Update)

 \* \* INNOVATIONS:

 \* 1. SESSION LOCKING: Enforces "First Sheet Wins" logic instantly.

 \* 2. GREEN-SKIPPING: Ignores already processed (Green) rows.

 \* 3. BATCH PAINTING: Updates CS Sheet colors in one massive operation per sheet.

 \* 4. CONFLICT REPORTING: Tracks exactly what was blocked and why.

 \*/



// --- CONFIGURATION ---

const KEYWORD\_SC = "CS -";

const SHEET\_STOCK\_NAME = "STOCK STATUS";

const SHEET\_ERP\_NAME = "ERP LIST";

const COLOR\_SUCCESS = "#00ff00"; // Bright Green

const TIMEZONE\_SC = "Asia/Dubai";



function syncClientScopes() {

  const tStart = new Date().getTime();

  const ss = SpreadsheetApp.getActiveSpreadsheet();

 

  // --- 1. TELEPATHIC CACHE \& PRELOAD ---

  // Load ERP Cache and Stock Map immediately

  const cache = CacheService.getScriptCache();

  const cachedPlants = cache.get("ERP\_PLANT\_MAP\_V5");

  const cachedDates = cache.get("ERP\_DATE\_MAP\_V5");

 

  let erpPlantMap, erpDateMap;



  if (!cachedPlants || !cachedDates) {

     if (typeof refreshSystemCache === 'function') {

        const fresh = refreshSystemCache();

        erpPlantMap = fresh.plantRowMap;

        erpDateMap = fresh.dateColMap;

     } else {

        SpreadsheetApp.getUi().alert("Cache Missing. Run 'Refresh System Cache' first.");

        return;

     }

  } else {

    erpPlantMap = new Map(JSON.parse(cachedPlants));

    erpDateMap = new Map(JSON.parse(cachedDates));

  }

 

  // --- 2. SURGICAL STOCK READ ---

  const stockSheet = ss.getSheetByName(SHEET\_STOCK\_NAME);

  const stockLastRow = stockSheet.getLastRow();

  const stockData = stockSheet.getRange(4, 1, stockLastRow - 3, 11).getValues(); // Read columns A to K

 

  // Map Plant No (Col C / Index 2) to Row Number

  const stockMap = new Map();

  for (let i = 0; i < stockData.length; i++) {

    let p = String(stockData\[i]\[2]).trim(); // Col C is index 2

    if (p) stockMap.set(p, i + 4);

  }



  // --- 3. SESSION STATE (The "First-Come-First-Serve" Logic) ---

  // This Set tracks items booked IN THIS RUN. If Sheet 1 books it, Sheet 2 gets blocked.

  const sessionBookedPlants = new Set();

  const reportLog = { booked: \[], blocked: \[] };

  const pendingStockUpdates = \[]; // Updates for Stock Status

  const pendingCSUpdates = \[];    // Updates for Client Scope Sheets (Green Color)



  // --- 4. DATA MINING ---

  const allSheets = ss.getSheets();

  let erpBgGrid = null; // Lazy load



  for (let sheet of allSheets) {

    let sName = sheet.getName().toUpperCase();

    if (!sName.includes(KEYWORD\_SC)) continue;

    if (sheet.getLastRow() < 5) continue;



    // Header Parsing

    let parts = sheet.getName().split("-");

    let jobNo = parts.length > 1 ? parts\[1].trim() : "";

    let project = parts.length > 2 ? parts.slice(2).join("-").trim() : "";



    // READ SHEET (Values AND Colors)

    let range = sheet.getDataRange();

    let values = range.getValues();

    let backgrounds = range.getBackgrounds(); // Critical for "Green-Skipping"



    // Find Header

    let headerRow = -1;

    for(let r=0; r<Math.min(20, values.length); r++){

       if(String(values\[r]).toUpperCase().includes("PLANT NO")) { headerRow = r; break; }

    }

    if(headerRow === -1) continue;



    // Map Columns

    let h = values\[headerRow].map(String);

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

       if (backgrounds\[r]\[0] === COLOR\_SUCCESS) continue;



       let rawP = String(values\[r]\[cPlant]).trim();

       let stat = String(values\[r]\[cStat]).trim();

 

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



          let start = (cOn > -1 ? values\[r]\[cOn] : "");

          let end = (cOff > -1 ? values\[r]\[cOff] : "");

          let logIn = (cDrop > -1 \&\& values\[r]\[cDrop] instanceof Date) ? values\[r]\[cDrop] : "";

          let logOut = (cColl > -1 \&\& values\[r]\[cColl] instanceof Date) ? values\[r]\[cColl] : "";



          // 2. ERP CHECK (Lazy Load only if needed)

          if (!erpBgGrid) erpBgGrid = ss.getSheetByName(SHEET\_ERP\_NAME).getDataRange().getBackgrounds();



          if (checkMemoryAvailability(p, start, end, logIn, logOut, erpPlantMap, erpDateMap, erpBgGrid)) {

             // SUCCESS: Book it!

 

             // A. Add to Session Lock (Blocks subsequent sheets immediately)

             sessionBookedPlants.add(p);



             // B. Queue Stock Update

             pendingStockUpdates.push({

                row: stockMap.get(p),

                values: \[

                   stat,

                   jobNo,

                   "", // Client

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

       if (rowIsSuccess \&\& plants.length > 0) {

          // Paint the whole row green in the memory grid

          for(let c=0; c<backgrounds\[r].length; c++) {

             backgrounds\[r]\[c] = COLOR\_SUCCESS;

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

        if (idx >= 0 \&\& idx < stockVals.length) {

           for(let c=0; c<8; c++) stockVals\[idx]\[c] = up.values\[c];

           stockBgs\[idx]\[0] = "#ffff00"; // Mark Status Yellow

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



  // --- 6. REPORTING \& HANDOFF ---

  SpreadsheetApp.flush(); // Force writes before handing off

 

  const tEnd = new Date().getTime();

  const duration = ((tEnd - tStart) / 1000).toFixed(1);

 

  let msg = `✅ Processed in ${duration}s\\\\n`;

  msg += `Booked: ${reportLog.booked.length}\\\\n`;

  msg += `Blocked: ${reportLog.blocked.length}\\\\n`;

 

  if (reportLog.blocked.length > 0) {

    // Optional: Log blocked items to console or alert

    console.log("Blocked Items:", reportLog.blocked);

    msg += "(Check Console for blocked details)";

  }



  ss.toast(msg, "Sync Complete", 10);



  // HANDOFF TO ERP CALENDAR SCRIPT

  if (pendingStockUpdates.length > 0) {

     if (typeof processBatchQueue === 'function') {

        ss.toast("Handing off to ERP Calendar...", "Handoff", 3);

        processBatchQueue();

     } else {

        ss.toast("Warning: processBatchQueue function not found.", "Error");

     }

  }

}



// --- HELPER FUNCTIONS ---



function checkMemoryAvailability(pNo, start, end, logIn, logOut, erpPlantMap, erpDateMap, erpBgGrid) {

  if (!erpPlantMap.has(pNo)) return true; // New item, allow it

  if (!(start instanceof Date) || !(end instanceof Date)) return true;



  const erpRowIdx = erpPlantMap.get(pNo);

  const sStr = Utilities.formatDate(start, TIMEZONE\_SC, "yyyy-MM-dd");

  const eStr = Utilities.formatDate(end, TIMEZONE\_SC, "yyyy-MM-dd");



  let startCol = erpDateMap.get(sStr);

  let endCol = erpDateMap.get(eStr);



  if (startCol === undefined) return true;

  if (endCol === undefined) endCol = erpBgGrid\[0].length - 1;



  // Logistics Expansion

  if (logIn instanceof Date) {

    let lStr = Utilities.formatDate(logIn, TIMEZONE\_SC, "yyyy-MM-dd");

    let lCol = erpDateMap.get(lStr);

    if (lCol !== undefined \&\& lCol < startCol) startCol = lCol;

  }

 

  if (logOut instanceof Date) {

    let lStr = Utilities.formatDate(logOut, TIMEZONE\_SC, "yyyy-MM-dd");

    let lCol = erpDateMap.get(lStr);

    if (lCol !== undefined \&\& lCol > endCol) endCol = lCol;

  }



  // Scan for Conflicts (Any color other than white/transparent)

  for (let c = startCol; c <= endCol; c++) {

    let color = (erpBgGrid\[erpRowIdx]\[c] || "#ffffff").toLowerCase();

    if (color !== "#ffffff" \&\& color !== "white" \&\& color !== "#00000000") return false;

  }

  return true;

}



function parsePlantString(str) {

  if (!str) return \[];

  let clean = str.toString().replace(/\['"]+/g, '').replace(/\[\&|]/g, ',');

  let parts = clean.split(',');

  let results = \[];

  let prefix = "";

  for (let p of parts) {

    let item = p.trim();

    if (!item) continue;

    if (item.includes('.') || item.length >= 3) {

      results.push(item);

      let dotIdx = item.lastIndexOf('.');

      if (dotIdx > -1) prefix = item.substring(0, dotIdx + 1);

    } else if (prefix \&\& item.length < 4) {

      results.push(prefix + item);

    } else {

      results.push(item);

    }

  }

  return results;

}

Scopechecker.gs:

/\*\*

 \* 🚀 MAIN FUNCTION: CHECK AVAILABILITY (Quantum Speed v2)

 \* Architecture: Block Memory Read + Integer Indexing

 \*/

function checkStandaloneAvailability() {

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const sheet = ss.getActiveSheet();

  const ui = SpreadsheetApp.getUi();



  // 1. FAST HEADER SCAN (Limit to top 15 rows)

  const topData = sheet.getRange(1, 1, 15, sheet.getLastColumn()).getValues();

  let headerRowIdx = -1;

  let headers = \[];

  for (let r = 0; r < topData.length; r++) {

    const rowStr = topData\[r].join(" ").toUpperCase();

    if (rowStr.includes("PLANT NO")) {

      headerRowIdx = r;

      headers = topData\[r].map(h => String(h).toUpperCase().trim());

      break;

    }

  }



  if (headerRowIdx === -1) { ui.alert("❌ Error: Could not find 'PLANT NO' header row."); return; }



  const colMap = {

    plant: headers.indexOf("PLANT NO"),

    drop: headers.indexOf("DROP DATE"),

    collect: headers.indexOf("COLLECTION DATE"),

    onHire: headers.indexOf("ON HIRE"),

    offHire: headers.indexOf("OFF HIRE")

  };

  if (colMap.plant === -1) { ui.alert("❌ 'PLANT NO' column not found."); return; }



  // 2. GET USER SELECTION (Block Read)

  const selection = sheet.getActiveRange();

  const startRow = selection.getRow();

  const numRows = selection.getNumRows();

 

  if (startRow <= headerRowIdx + 1) {

    ui.alert("⚠️ Please select valid data rows (below headers).");

    return;

  }



  // OPTIMIZATION: Read ALL columns for the selected rows in ONE operation

  // This replaces the slow "read inside loop" method

  const fullRowData = sheet.getRange(startRow, 1, numRows, sheet.getLastColumn()).getValues();



  // 3. PREPARE REQUESTS

  let checkRequests = \[];

  const toEpoch = (d) => {

    if (!(d instanceof Date)) return null;

    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); // Midnight Epoch

  };



  for (let i = 0; i < numRows; i++) {

    // Read from Memory (Instant)

    let rowValues = fullRowData\[i];

 

    let rawPlantNo = String(rowValues\[colMap.plant]).trim();

    if (!rawPlantNo) continue;



    let sDate = (rowValues\[colMap.drop] instanceof Date) ? rowValues\[colMap.drop] : rowValues\[colMap.onHire];

    let eDate = (rowValues\[colMap.collect] instanceof Date) ? rowValues\[colMap.collect] : rowValues\[colMap.offHire];



    let startEpoch = toEpoch(sDate);

    let endEpoch = toEpoch(eDate);

    if (!startEpoch || !endEpoch) continue;



    let items = rawPlantNo.split(',').map(s => s.trim()).filter(s => s !== "");

    items.forEach(item => {

      checkRequests.push({ id: item, start: startEpoch, end: endEpoch });

    });

  }



  if (checkRequests.length === 0) { ui.alert("⚠️ No valid Plant Numbers or Dates found in selection."); return; }



  // 4. LOAD ERP DATA (Using Cache if available, or fast read)

  ss.toast(`Scanning ${checkRequests.length} items...`, "⚡ Rapid Check");

  const erpSheet = ss.getSheetByName(SHEET\_ERP);

 

  // Use existing cache keys if possible (requires Calendar control.gs to have run once)

  // Otherwise, fast read

  const erpRange = erpSheet.getDataRange();

  const erpValues = erpRange.getValues();

  const erpBg = erpRange.getBackgrounds();

 

  // A. Header Date Indexing (Integer Map)

  const headerDates = erpValues\[ERP\_DATE\_ROW - 1];

  const dateToColMap = new Map();

  const startSearchCol = (typeof ERP\_DATE\_START\_COL !== 'undefined') ? ERP\_DATE\_START\_COL - 1 : 6;

 

  for (let c = startSearchCol; c < headerDates.length; c++) {

    if (headerDates\[c] instanceof Date) {

      let d = headerDates\[c];

      let epoch = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

      dateToColMap.set(epoch, c);

    }

  }

  const maxCol = headerDates.length - 1;



  // B. Plant Indexing

  const rowMap = new Map();

  const prefixMap = new Map();

  const plantColIdx = (typeof ERP\_PLANT\_COL !== 'undefined') ? ERP\_PLANT\_COL - 1 : 5;



  for (let i = 3; i < erpValues.length; i++) {

    let p = String(erpValues\[i]\[plantColIdx]).trim();

    if (p) {

      rowMap.set(p, i);

      let dotIdx = p.lastIndexOf(".");

      if (dotIdx > 0) {

        let prefix = p.substring(0, dotIdx + 1);

        if (!prefixMap.has(prefix)) prefixMap.set(prefix, \[]);

        prefixMap.get(prefix).push(i);

      }

    }

  }



  // 5. EXECUTE CHECKS

  let report = \[];

  let conflictCount = 0;

 

  checkRequests.forEach(req => {

    let startCol = dateToColMap.get(req.start);

    let endCol = dateToColMap.get(req.end);



    if (startCol === undefined) {

       report.push(`❌ ${req.id}: Start Date out of range`); conflictCount++; return;

    }

    if (endCol === undefined) endCol = maxCol;



    let result = checkItemInstant(req.id, startCol, endCol, rowMap, erpBg);

 

    if (result.available) {

      report.push(`✅ ${req.id}: AVAILABLE`);

    } else {

      conflictCount++;

      let suggestion = findAlternativeInstant(req.id, startCol, endCol, prefixMap, erpValues, erpBg, plantColIdx);

      report.push(`❌ ${req.id}: BOOKED ${suggestion ? "👉 Try: " + suggestion : ""}`);

    }

  });



  let msg = report.join("\\n");

  if (msg.length > 4000) msg = msg.substring(0, 4000) + "\\n... (Report Truncated)";

  let summary = (conflictCount === 0) ? "🎉 ALL AVAILABLE" : `⚠️ ${conflictCount} CONFLICTS FOUND`;

 

  ui.alert(`🔍 SCOPE CHECKER RESULTS\\\\n\\\\n${msg}\\\\n\\\\n${summary}`);

}



// Optimized Helper: Removed Date Object dependency inside loop

function checkItemInstant(id, startCol, endCol, rowMap, erpBg) {

  if (!rowMap.has(id)) return { available: false };

  const r = rowMap.get(id);

  const rowColors = erpBg\[r];



  for (let c = startCol; c <= endCol; c++) {

    let color = rowColors\[c];

    if (color \&\& color !== "#ffffff" \&\& color !== "white") {

       return { available: false };

    }

  }

  return { available: true };

}



function findAlternativeInstant(badId, startCol, endCol, prefixMap, erpValues, erpBg, plantColIdx) {

  let dotIdx = badId.lastIndexOf(".");

  if (dotIdx === -1) return "";

  let prefix = badId.substring(0, dotIdx + 1);

  if (!prefixMap.has(prefix)) return "";

 

  let candidates = prefixMap.get(prefix);

  for (let i = 0; i < candidates.length; i++) {

    let r = candidates\[i];

    let candidateId = String(erpValues\[r]\[plantColIdx]).trim();

    if (candidateId === badId) continue;

    let isFree = true;

    const rowColors = erpBg\[r];

    for (let c = startCol; c <= endCol; c++) {

      let color = rowColors\[c];

      if (color \&\& color !== "#ffffff" \&\& color !== "white") {

        isFree = false; break;

      }

    }

    if (isFree) return candidateId;

  }

  return "None";

}

"

