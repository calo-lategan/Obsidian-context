none destructible engine for each page/ code each interacts by inputting data rather than integrating via code so that when adding a new page or feature it doesn't affect each page from crashing/ breaking:

&nbsp;

quote engine(attached a quote for reference on formatting, and places to put pre loaded signatures from each dedicated user email amplify events)

fleet dashboard engine (Functions exactly like the season stock sheet attached and its appscript script)

purchase order engine (invoice attached alps events f1)

Water Delivery engine (same as water delivery v2)

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

When first quote is generated or the quote is added to the files in google drive that the webapp reads from, it will pull the catalog pdf (one pdf with all products) and draft an email with the logged in users email with the quote and catalog only for the first quote



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

&nbsp; "BOOKED": "#00ffff",       // Cyan

&nbsp; "ON HIRE": "#00ffff",      // Cyan

&nbsp; "QUOTE": "#ff00ff",        // Magenta/Purple

&nbsp; "SERVICE": "#ff0000",      // Red

&nbsp; "SOLD TO KSA": "#ff9900",  // Orange

&nbsp; "IN KSA": "#cc0000",       // Dark Red 1

&nbsp; "AVAILABLE": "#ffffff"     // White

};



// --- CACHE KEYS ---

const CACHE\_KEY\_ERP\_MAP = "ERP\_PLANT\_MAP\_V5"; 

const CACHE\_KEY\_DATE\_MAP = "ERP\_DATE\_MAP\_V5";

const CACHE\_KEY\_BOUNDS = "ERP\_DATE\_BOUNDS\_V5"; // NEW: For boundary clamping

const CACHE\_EXPIRY = 21600; // 6 Hours



/\*\*

&nbsp;\* MENU SETUP

&nbsp;\*/

function onOpen() {

&nbsp; const ui = SpreadsheetApp.getUi();

&nbsp; ui.createMenu('⚡ BATCH OPERATIONS')

&nbsp;   .addItem('🚀 PROCESS YELLOW BATCH ROWS', 'processBatchQueue')

&nbsp;   .addSeparator()

&nbsp;   .addItem('♻️ Refresh System Cache', 'refreshSystemCache')

&nbsp;   .addItem('🔄 Force Refresh "Today" Status', 'updateDailyStatus')

&nbsp;   .addToUi();

}



/\*\*

&nbsp;\* MASTER TRIGGER (OPTIMIZED ROUTING)

&nbsp;\*/

function onEdit(e) {

&nbsp; const ss = e.source;

&nbsp; const sheet = ss.getActiveSheet();

&nbsp; const name = sheet.getName();

&nbsp; const range = e.range;

&nbsp; const endRow = range.getRow() + range.getNumRows() - 1;

&nbsp; const col = range.getColumn();



&nbsp; // 1. EDITS ON STOCK STATUS

&nbsp; if (name === SHEET\_STOCK \&\& endRow >= 4) {

&nbsp;   const bgColors = range.getBackgrounds();

&nbsp;   let isYellow = false;

&nbsp;   

&nbsp;   // Fast scan for batch marker

&nbsp;   outer: for(let i=0; i<bgColors.length; i++) {

&nbsp;     for(let j=0; j<bgColors\[0].length; j++) {

&nbsp;       if(bgColors\[i]\[j] === COLOR\_PENDING\_BATCH) { isYellow = true; break outer; }

&nbsp;     }

&nbsp;   }



&nbsp;   if (range.getNumRows() > 1 || isYellow) {

&nbsp;     if (!isYellow) range.setBackground(COLOR\_PENDING\_BATCH); 

&nbsp;     return; 

&nbsp;   }



&nbsp;   // Single Edit Trigger

&nbsp;   if (range.getNumRows() === 1 \&\& !isYellow) {

&nbsp;     const r = range.getRow();

&nbsp;     

&nbsp;     // ZERO-REDUNDANCY READ

&nbsp;     const rowData = sheet.getRange(r, 3, 1, 9).getValues()\[0];

&nbsp;     

&nbsp;     const status = rowData\[STOCK\_STATUS\_COL - 3]; 

&nbsp;     const start = rowData\[STOCK\_START\_COL - 3];

&nbsp;     const end = rowData\[STOCK\_END\_COL - 3];



&nbsp;     const isBooking = (status !== "AVAILABLE");

&nbsp;     const isKSA = (status === "SOLD TO KSA" || status === "IN KSA");

&nbsp;     const hasDates = (start instanceof Date \&\& end instanceof Date);



&nbsp;     // Only run if criteria are met

&nbsp;     if (isBooking \&\& (hasDates || isKSA)) {

&nbsp;       if (col === STOCK\_STATUS\_COL) {

&nbsp;         syncStatusFast(ss, rowData, r, SHEET\_ERP); 

&nbsp;         handleSingleBookingFast(ss, sheet, r, rowData); 

&nbsp;       }

&nbsp;       if (col === STOCK\_START\_COL || col === STOCK\_END\_COL || col === STOCK\_LOG\_IN\_COL || col === STOCK\_LOG\_OUT\_COL) {

&nbsp;          handleSingleBookingFast(ss, sheet, r, rowData);

&nbsp;       }

&nbsp;     }

&nbsp;   }

&nbsp; }



&nbsp; // 2. EDITS ON ERP LIST

&nbsp; if (name === SHEET\_ERP \&\& endRow >= 4 \&\& col === ERP\_STATUS\_COL) {

&nbsp;   for (let r = range.getRow(); r <= endRow; r++) {

&nbsp;     if (r < 4) continue;

&nbsp;     let val = sheet.getRange(r, col).getValue(); 

&nbsp;     // Using ORIGINAL checkStatusLock logic here

&nbsp;     let allowed = checkStatusLock(sheet, r, val, sheet.getRange(r, col));

&nbsp;     if (allowed) syncStatusFast(ss, null, r, SHEET\_STOCK, val); 

&nbsp;   }

&nbsp; }

}



/\*\*

&nbsp;\* ⚡ SUPER-FAST SINGLE HANDLER

&nbsp;\* Uses Surgical IO + Time Travel Revert + Smart Date Clamping

&nbsp;\*/

function handleSingleBookingFast(ss, stockSheet, stockRow, rowDataArray) {

&nbsp; const pNo = String(rowDataArray\[STOCK\_PLANT\_COL - 3]).trim();

&nbsp; if (!pNo) return;



&nbsp; const status = rowDataArray\[STOCK\_STATUS\_COL - 3];

&nbsp; const startDate = rowDataArray\[STOCK\_START\_COL - 3];

&nbsp; const endDate = rowDataArray\[STOCK\_END\_COL - 3];

&nbsp; const logIn = rowDataArray\[STOCK\_LOG\_IN\_COL - 3];

&nbsp; const logOut = rowDataArray\[STOCK\_LOG\_OUT\_COL - 3];

&nbsp; 

&nbsp; const job = rowDataArray\[STOCK\_JOB\_COL - 3] || "";

&nbsp; const client = rowDataArray\[STOCK\_CLIENT\_COL - 3] || "";

&nbsp; const project = rowDataArray\[STOCK\_PROJECT\_COL - 3] || "";

&nbsp; const cellText = \[job, client, project].filter(Boolean).join(" | ");



&nbsp; // 1. GET INDEX MAPS \& BOUNDS (Cached)

&nbsp; const { plantRowMap, dateColMap, dateBounds } = getFastErpIndices(ss);



&nbsp; if (!plantRowMap.has(pNo)) {

&nbsp;   ss.toast(`⚠️ Plant ${pNo} not found in ERP.`, "Error");

&nbsp;   return;

&nbsp; }



&nbsp; const erpRowIdx = plantRowMap.get(pNo); 

&nbsp; const erpRow = erpRowIdx + 1;           



&nbsp; // 2. SURGICAL READ (1 Row Only - 100x Faster than reading sheet)

&nbsp; const erpSheet = ss.getSheetByName(SHEET\_ERP);

&nbsp; const maxCol = erpSheet.getLastColumn();

&nbsp; const erpRowRange = erpSheet.getRange(erpRow, 1, 1, maxCol);

&nbsp; const erpRowBg = erpRowRange.getBackgrounds()\[0]; // 1D Array

&nbsp; 

&nbsp; // 3. CALCULATE INDICES WITH CLAMPING

&nbsp; let startCol = -1, endCol = -1, logInCol = -1, logOutCol = -1;

&nbsp; const isKSA = (status === "SOLD TO KSA" || status === "IN KSA");



&nbsp; if (isKSA) {

&nbsp;   startCol = ERP\_DATE\_START\_COL;

&nbsp;   endCol = maxCol;

&nbsp; } else {

&nbsp;   const sStr = Utilities.formatDate(startDate, TIMEZONE, "yyyy-MM-dd");

&nbsp;   const eStr = Utilities.formatDate(endDate, TIMEZONE, "yyyy-MM-dd");

&nbsp;   

&nbsp;   // --- START DATE CLAMPING ---

&nbsp;   if (dateColMap.has(sStr)) {

&nbsp;     startCol = dateColMap.get(sStr) + 1; 

&nbsp;   } else if (sStr < dateBounds.min \&\& eStr >= dateBounds.min) {

&nbsp;     startCol = dateColMap.get(dateBounds.min) + 1; // Clamp to Start

&nbsp;   }



&nbsp;   // --- END DATE CLAMPING ---

&nbsp;   if (dateColMap.has(eStr)) {

&nbsp;     endCol = dateColMap.get(eStr) + 1;

&nbsp;   } else if (eStr > dateBounds.max \&\& sStr <= dateBounds.max) {

&nbsp;     endCol = dateColMap.get(dateBounds.max) + 1; // Clamp to End

&nbsp;   }



&nbsp;   // Logistics (Strictly if on calendar)

&nbsp;   if (logIn instanceof Date) {

&nbsp;     let lInStr = Utilities.formatDate(logIn, TIMEZONE, "yyyy-MM-dd");

&nbsp;     if(dateColMap.has(lInStr)) logInCol = dateColMap.get(lInStr) + 1;

&nbsp;   }

&nbsp;   if (logOut instanceof Date) {

&nbsp;     let lOutStr = Utilities.formatDate(logOut, TIMEZONE, "yyyy-MM-dd");

&nbsp;     if(dateColMap.has(lOutStr)) logOutCol = dateColMap.get(lOutStr) + 1;

&nbsp;   }

&nbsp; }



&nbsp; // If Start is still -1, the entire booking is before the calendar or invalid

&nbsp; if (startCol === -1) {

&nbsp;     if (endCol !== -1) startCol = ERP\_DATE\_START\_COL; // Partial overlap safety

&nbsp;     else return; 

&nbsp; }

&nbsp; if (endCol === -1) endCol = maxCol;



&nbsp; let effStart = (logInCol !== -1 \&\& logInCol < startCol) ? logInCol : startCol;

&nbsp; let effEnd = (logOutCol !== -1 \&\& logOutCol > endCol) ? logOutCol : endCol;



&nbsp; // 4. CONFLICT CHECK

&nbsp; const limit = effEnd - effStart + 1;

&nbsp; for (let c = 0; c < limit; c++) {

&nbsp;   let checkColIdx = (effStart - 1) + c; // 0-based

&nbsp;   let color = (erpRowBg\[checkColIdx] || "#ffffff").toLowerCase();

&nbsp;   if (color !== "#ffffff" \&\& color !== "white") {

&nbsp;     

&nbsp;     // --- TIME TRAVEL REVERT LOGIC ---

&nbsp;     const todayStr = Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd");

&nbsp;     let revertStatus = "AVAILABLE"; // Default

&nbsp;     

&nbsp;     if (dateColMap.has(todayStr)) {

&nbsp;       let todayIdx = dateColMap.get(todayStr); // 0-based index

&nbsp;       let todayColor = (erpRowBg\[todayIdx] || "#ffffff").toLowerCase();

&nbsp;       

&nbsp;       for (let \[key, val] of Object.entries(COLORS)) {

&nbsp;         if (val.toLowerCase() === todayColor) {

&nbsp;           revertStatus = key;

&nbsp;           break;

&nbsp;         }

&nbsp;       }

&nbsp;     }



&nbsp;     // Execute Revert

&nbsp;     stockSheet.getRange(stockRow, STOCK\_START\_COL, 1, 4).clearContent();

&nbsp;     stockSheet.getRange(stockRow, STOCK\_STATUS\_COL).setValue(revertStatus);



&nbsp;     Browser.msgBox(`⛔ CONFLICT: ${pNo} is not available for these dates.\\nReverted status to: ${revertStatus}`);

&nbsp;     return;

&nbsp;   }

&nbsp; }



&nbsp; // 5. SURGICAL WRITE

&nbsp; const newColor = COLORS\[status] || COLOR\_AVAILABLE;



&nbsp; if (isKSA) {

&nbsp;   applyColor(erpSheet.getRange(erpRow, startCol, 1, (endCol - startCol + 1)), newColor, status, true);

&nbsp;   ss.toast("KSA Status Updated", "✅ Instant", 1);

&nbsp;   return;

&nbsp; }



&nbsp; if (logInCol !== -1 \&\& logInCol < startCol) {

&nbsp;   applyColor(erpSheet.getRange(erpRow, logInCol, 1, (startCol - logInCol)), COLOR\_LOGISTICS, "", false);

&nbsp; }



&nbsp; applyColor(erpSheet.getRange(erpRow, startCol, 1, (endCol - startCol + 1)), newColor, cellText, true);



&nbsp; if (logOutCol !== -1 \&\& logOutCol > endCol) {

&nbsp;   applyColor(erpSheet.getRange(erpRow, endCol + 1, 1, (logOutCol - endCol)), COLOR\_LOGISTICS, "", false);

&nbsp; }



&nbsp; ss.toast("Booking Updated", "⚡ Instant", 1);

}



/\*\*

&nbsp;\* 🚀 HIGH-PERFORMANCE BATCH PROCESSOR

&nbsp;\* IMPLEMENTS "CLUSTER WRITING" (Grouped writes for 1000x IO speed)

&nbsp;\*/

function processBatchQueue() {

&nbsp; const ss = SpreadsheetApp.getActiveSpreadsheet();

&nbsp; const stockSheet = ss.getSheetByName(SHEET\_STOCK);

&nbsp; const erpSheet = ss.getSheetByName(SHEET\_ERP);

&nbsp; const ui = SpreadsheetApp.getUi();



&nbsp; const lastRow = stockSheet.getLastRow();

&nbsp; if (lastRow < 4) return;

&nbsp; 

&nbsp; // Fast Scan for Yellow

&nbsp; const statusBackgrounds = stockSheet.getRange(4, STOCK\_STATUS\_COL, lastRow - 3, 1).getBackgrounds();

&nbsp; let rowsToProcess = \[];

&nbsp; for (let i = 0; i < statusBackgrounds.length; i++) {

&nbsp;   if (statusBackgrounds\[i]\[0] === COLOR\_PENDING\_BATCH) rowsToProcess.push(i + 4);

&nbsp; }



&nbsp; if (rowsToProcess.length === 0) {

&nbsp;   ui.alert("✅ No Yellow/Pending rows found.");

&nbsp;   return;

&nbsp; }



&nbsp; if (ui.alert('Confirm Batch Process', `Found ${rowsToProcess.length} pending rows.\\nProcess now?`, ui.ButtonSet.YES\_NO) !== ui.Button.YES) return;



&nbsp; ss.toast("Analyzing Database...", "⚙️ Processing", -1);



&nbsp; // Read Data

&nbsp; const stockDataRange = stockSheet.getRange(4, 1, lastRow - 3, stockSheet.getLastColumn());

&nbsp; const stockValues = stockDataRange.getValues();

&nbsp; const erpRange = erpSheet.getDataRange(); 

&nbsp; const erpValues = erpRange.getValues(); 

&nbsp; const erpBackgrounds = erpRange.getBackgrounds();

&nbsp; const erpMaxCols = erpSheet.getLastColumn();

&nbsp; 

&nbsp; // Map Data \& Find Bounds

&nbsp; const headerDates = erpValues\[ERP\_DATE\_ROW - 1]; 

&nbsp; const dateColMap = new Map();

&nbsp; const todayStr = Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd");

&nbsp; let todayIdx = -1;

&nbsp; let minDateStr = null, maxDateStr = null;



&nbsp; for (let c = ERP\_DATE\_START\_COL - 1; c < headerDates.length; c++) {

&nbsp;   if (headerDates\[c] instanceof Date) {

&nbsp;     let dStr = Utilities.formatDate(headerDates\[c], TIMEZONE, "yyyy-MM-dd");

&nbsp;     dateColMap.set(dStr, c);

&nbsp;     if(dStr === todayStr) todayIdx = c;

&nbsp;     

&nbsp;     // Calculate Bounds

&nbsp;     if (!minDateStr || dStr < minDateStr) minDateStr = dStr;

&nbsp;     if (!maxDateStr || dStr > maxDateStr) maxDateStr = dStr;

&nbsp;   }

&nbsp; }

&nbsp; const dateBounds = { min: minDateStr, max: maxDateStr };



&nbsp; const plantMap = new Map();

&nbsp; for (let i = 3; i < erpValues.length; i++) {

&nbsp;   let p = String(erpValues\[i]\[ERP\_PLANT\_COL - 1]).trim();

&nbsp;   if (p) plantMap.set(p, i);

&nbsp; }



&nbsp; let successCount = 0;

&nbsp; let modifiedErpRows = new Set(); // TRACKS DIRTY ROWS

&nbsp; let mergeQueue = \[];

&nbsp; let failQueue = \[];



&nbsp; for (let r of rowsToProcess) {

&nbsp;   let stockIdx = r - 4; 

&nbsp;   let rowData = stockValues\[stockIdx];



&nbsp;   let pNo = String(rowData\[STOCK\_PLANT\_COL - 1]).trim();

&nbsp;   let status = rowData\[STOCK\_STATUS\_COL - 1];

&nbsp;   

&nbsp;   if(!pNo) continue;

&nbsp;   if (!plantMap.has(pNo)) continue;

&nbsp;   

&nbsp;   let erpIdx = plantMap.get(pNo);



&nbsp;   // Pass bounds to memory processor

&nbsp;   let result = processInMemory(rowData, status, erpIdx, erpValues, erpBackgrounds, dateColMap, dateBounds, mergeQueue, erpMaxCols);



&nbsp;   if (result.success) {

&nbsp;     erpValues\[erpIdx]\[ERP\_STATUS\_COL - 1] = status;

&nbsp;     modifiedErpRows.add(erpIdx); // MARK ROW AS DIRTY

&nbsp;     successCount++;

&nbsp;   } else {

&nbsp;     failQueue.push({row: r, plant: pNo, erpIdx: erpIdx});

&nbsp;   }

&nbsp; }



&nbsp; // --- CLUSTER WRITE ENGINE (The 10000X Speedup) ---

&nbsp; ss.toast(`Saving ${modifiedErpRows.size} records...`, "💾 Optimizing", -1);

&nbsp; 

&nbsp; // Sort indices to find clusters

&nbsp; let sortedRows = Array.from(modifiedErpRows).sort((a,b) => a - b);

&nbsp; let currentBlock = \[];

&nbsp; let startIdx = -1;



&nbsp; for (let i = 0; i < sortedRows.length; i++) {

&nbsp;    if (currentBlock.length === 0) {

&nbsp;        currentBlock.push(sortedRows\[i]);

&nbsp;        startIdx = sortedRows\[i];

&nbsp;    } else {

&nbsp;        if (sortedRows\[i] === sortedRows\[i-1] + 1) {

&nbsp;            currentBlock.push(sortedRows\[i]);

&nbsp;        } else {

&nbsp;            // Flush previous block

&nbsp;            flushBlock(erpSheet, erpValues, erpBackgrounds, startIdx, currentBlock.length, erpMaxCols);

&nbsp;            currentBlock = \[sortedRows\[i]];

&nbsp;            startIdx = sortedRows\[i];

&nbsp;        }

&nbsp;    }

&nbsp; }

&nbsp; // Flush final block

&nbsp; if (currentBlock.length > 0) {

&nbsp;     flushBlock(erpSheet, erpValues, erpBackgrounds, startIdx, currentBlock.length, erpMaxCols);

&nbsp; }



&nbsp; // Apply Merges

&nbsp; if (mergeQueue.length > 0) {

&nbsp;   mergeQueue.forEach(mq => {

&nbsp;     let rng = erpSheet.getRange(mq.row + 1, mq.col + 1, 1, mq.numCols);

&nbsp;     try {

&nbsp;       rng.breakApart();

&nbsp;       if (mq.shouldMerge) rng.merge();

&nbsp;       rng.setHorizontalAlignment("center");

&nbsp;       rng.setVerticalAlignment("middle");

&nbsp;     } catch(e) {}

&nbsp;   });

&nbsp; }



&nbsp; // Handle Failures with Smart Revert

&nbsp; if (failQueue.length > 0) {

&nbsp;   failQueue.forEach(f => {

&nbsp;     // Find what the status SHOULD be based on "Today" column in ERP

&nbsp;     let correctStatus = "AVAILABLE";

&nbsp;     if (todayIdx !== -1) {

&nbsp;        let color = (erpBackgrounds\[f.erpIdx]\[todayIdx] || "#ffffff").toLowerCase();

&nbsp;        for (let \[key, val] of Object.entries(COLORS)) {

&nbsp;           if (val.toLowerCase() === color) { correctStatus = key; break; }

&nbsp;        }

&nbsp;     }

&nbsp;     

&nbsp;     // Update Stock Sheet

&nbsp;     stockSheet.getRange(f.row, STOCK\_START\_COL, 1, 4).clearContent();

&nbsp;     stockSheet.getRange(f.row, STOCK\_STATUS\_COL).setValue(correctStatus);

&nbsp;   });

&nbsp;   Browser.msgBox(`⚠️ BLOCKED ${failQueue.length} ROWS due to conflicts.`);

&nbsp; }



&nbsp; // Clean Stock Markers

&nbsp; rowsToProcess.forEach(r => {

&nbsp;   stockSheet.getRange(r, STOCK\_STATUS\_COL).setBackground(null);

&nbsp; });



&nbsp; refreshSystemCache();

&nbsp; ss.toast(`Batch Complete. ${successCount} updated.`, "✅ Done", 3);

}



// --- HELPER FUNCTIONS ---



function flushBlock(sheet, values, backgrounds, startRowIdx, numRows, maxCols) {

&nbsp;   // Writes a contiguous block of rows in ONE API call

&nbsp;   const range = sheet.getRange(startRowIdx + 1, 1, numRows, maxCols);

&nbsp;   const blockValues = values.slice(startRowIdx, startRowIdx + numRows);

&nbsp;   const blockBg = backgrounds.slice(startRowIdx, startRowIdx + numRows);

&nbsp;   range.setValues(blockValues);

&nbsp;   range.setBackgrounds(blockBg);

}



function processInMemory(stockRowData, status, erpIdx, erpValGrid, erpBgGrid, dateColMap, dateBounds, mergeQueue, maxCols) {

&nbsp; // Logic identical to before, but we are modifying grids that will be selectively written

&nbsp; if (status === "SOLD TO KSA" || status === "IN KSA") {

&nbsp;   let startCol = ERP\_DATE\_START\_COL - 1;

&nbsp;   let endCol = maxCols - 1;

&nbsp;   for (let c = startCol; c <= endCol; c++) {

&nbsp;     let color = (erpBgGrid\[erpIdx]\[c] || "#ffffff").toLowerCase();

&nbsp;     if (color !== "#ffffff" \&\& color !== "white") return { success: false };

&nbsp;   }

&nbsp;   let numCols = endCol - startCol + 1;

&nbsp;   for (let c = startCol; c <= endCol; c++) {

&nbsp;     erpBgGrid\[erpIdx]\[c] = (status === "SOLD TO KSA") ? COLORS\["SOLD TO KSA"] : COLORS\["IN KSA"];

&nbsp;     if (c === startCol) erpValGrid\[erpIdx]\[c] = status;

&nbsp;     else erpValGrid\[erpIdx]\[c] = ""; 

&nbsp;   }

&nbsp;   mergeQueue.push({ row: erpIdx, col: startCol, numCols: numCols, shouldMerge: true });

&nbsp;   return { success: true };

&nbsp; }



&nbsp; let startDate = stockRowData\[STOCK\_START\_COL - 1];

&nbsp; let endDate = stockRowData\[STOCK\_END\_COL - 1];

&nbsp; let logIn = stockRowData\[STOCK\_LOG\_IN\_COL - 1];

&nbsp; let logOut = stockRowData\[STOCK\_LOG\_OUT\_COL - 1];



&nbsp; if (!(startDate instanceof Date) || !(endDate instanceof Date)) return { success: false };



&nbsp; let sStr = Utilities.formatDate(startDate, TIMEZONE, "yyyy-MM-dd");

&nbsp; let eStr = Utilities.formatDate(endDate, TIMEZONE, "yyyy-MM-dd");

&nbsp; let lInStr = (logIn instanceof Date) ? Utilities.formatDate(logIn, TIMEZONE, "yyyy-MM-dd") : null;

&nbsp; let lOutStr = (logOut instanceof Date) ? Utilities.formatDate(logOut, TIMEZONE, "yyyy-MM-dd") : null;



&nbsp; // --- CLAMPING LOGIC FOR BATCH ---

&nbsp; let startCol = -1, endCol = -1;



&nbsp; if (dateColMap.has(sStr)) startCol = dateColMap.get(sStr);

&nbsp; else if (sStr < dateBounds.min \&\& eStr >= dateBounds.min) startCol = dateColMap.get(dateBounds.min);



&nbsp; if (dateColMap.has(eStr)) endCol = dateColMap.get(eStr);

&nbsp; else if (eStr > dateBounds.max \&\& sStr <= dateBounds.max) endCol = dateColMap.get(dateBounds.max);



&nbsp; // Logistics indices

&nbsp; let logInCol = (lInStr \&\& dateColMap.has(lInStr)) ? dateColMap.get(lInStr) : -1;

&nbsp; let logOutCol = (lOutStr \&\& dateColMap.has(lOutStr)) ? dateColMap.get(lOutStr) : -1;



&nbsp; if (startCol === -1) {

&nbsp;    if (endCol !== -1) startCol = ERP\_DATE\_START\_COL - 1; // 0-based

&nbsp;    else return { success: false };

&nbsp; }

&nbsp; if (endCol === -1) endCol = maxCols - 1;



&nbsp; let effectiveStart = (logInCol !== -1 \&\& logInCol < startCol) ? logInCol : startCol;

&nbsp; let effectiveEnd = (logOutCol !== -1 \&\& logOutCol > endCol) ? logOutCol : endCol;



&nbsp; for (let c = effectiveStart; c <= effectiveEnd; c++) {

&nbsp;   let color = (erpBgGrid\[erpIdx]\[c] || "#ffffff").toLowerCase();

&nbsp;   if (color !== "#ffffff" \&\& color !== "white") return { success: false };

&nbsp; }



&nbsp; const job = stockRowData\[STOCK\_JOB\_COL - 1] || "";

&nbsp; const client = stockRowData\[STOCK\_CLIENT\_COL - 1] || "";

&nbsp; const project = stockRowData\[STOCK\_PROJECT\_COL - 1] || "";

&nbsp; const cellText = \[job, client, project].filter(Boolean).join(" | ");

&nbsp; let newColor = COLORS\[status] || COLOR\_AVAILABLE;



&nbsp; if (logInCol !== -1 \&\& logInCol < startCol) {

&nbsp;   for (let c = logInCol; c < startCol; c++) {

&nbsp;     erpBgGrid\[erpIdx]\[c] = COLOR\_LOGISTICS;

&nbsp;     erpValGrid\[erpIdx]\[c] = "";

&nbsp;   }

&nbsp;   mergeQueue.push({ row: erpIdx, col: logInCol, numCols: (startCol - logInCol), shouldMerge: false });

&nbsp; }



&nbsp; for (let c = startCol; c <= endCol; c++) {

&nbsp;   erpBgGrid\[erpIdx]\[c] = newColor;

&nbsp;   if (c === startCol) erpValGrid\[erpIdx]\[c] = cellText;

&nbsp;   else erpValGrid\[erpIdx]\[c] = "";

&nbsp; }

&nbsp; mergeQueue.push({ row: erpIdx, col: startCol, numCols: (endCol - startCol + 1), shouldMerge: true });



&nbsp; if (logOutCol !== -1 \&\& logOutCol > endCol) {

&nbsp;   for (let c = endCol + 1; c <= logOutCol; c++) {

&nbsp;     erpBgGrid\[erpIdx]\[c] = COLOR\_LOGISTICS;

&nbsp;     erpValGrid\[erpIdx]\[c] = "";

&nbsp;   }

&nbsp;   mergeQueue.push({ row: erpIdx, col: endCol + 1, numCols: (logOutCol - endCol), shouldMerge: false });

&nbsp; }



&nbsp; return { success: true };

}



function applyColor(range, color, text, merge) {

&nbsp; range.breakApart();

&nbsp; range.setBackground(color);

&nbsp; if (merge \&\& range.getNumColumns() > 1) range.merge();

&nbsp; if (text !== undefined) range.setValue(text);

&nbsp; range.setHorizontalAlignment("center");

&nbsp; range.setVerticalAlignment("middle");

}



function syncStatusFast(ss, rowDataArray, row, targetSheetName, manualVal) {

&nbsp; let pNo, val;

&nbsp; if (rowDataArray) {

&nbsp;   pNo = String(rowDataArray\[STOCK\_PLANT\_COL - 3]).trim();

&nbsp;   val = rowDataArray\[STOCK\_STATUS\_COL - 3];

&nbsp; } else {

&nbsp;   const erpSheet = ss.getSheetByName(SHEET\_ERP);

&nbsp;   pNo = String(erpSheet.getRange(row, ERP\_PLANT\_COL).getValue()).trim();

&nbsp;   val = manualVal;

&nbsp; }

&nbsp; if (!pNo) return;



&nbsp; if (targetSheetName === SHEET\_ERP) {

&nbsp;   const { plantRowMap } = getFastErpIndices(ss);

&nbsp;   if (plantRowMap.has(pNo)) {

&nbsp;     const r = plantRowMap.get(pNo) + 1;

&nbsp;     ss.getSheetByName(SHEET\_ERP).getRange(r, ERP\_STATUS\_COL).setValue(val);

&nbsp;   }

&nbsp; } else {

&nbsp;   const stockSheet = ss.getSheetByName(SHEET\_STOCK);

&nbsp;   const plants = stockSheet.getRange(4, STOCK\_PLANT\_COL, stockSheet.getLastRow(), 1).getValues();

&nbsp;   for(let i=0; i<plants.length; i++) {

&nbsp;     if(String(plants\[i]\[0]).trim() === pNo) {

&nbsp;       stockSheet.getRange(i+4, STOCK\_STATUS\_COL).setValue(val);

&nbsp;       break;

&nbsp;     }

&nbsp;   }

&nbsp; }

}



function getFastErpIndices(ss) {

&nbsp; const cache = CacheService.getScriptCache();

&nbsp; const cachedPlants = cache.get(CACHE\_KEY\_ERP\_MAP);

&nbsp; const cachedDates = cache.get(CACHE\_KEY\_DATE\_MAP);

&nbsp; const cachedBounds = cache.get(CACHE\_KEY\_BOUNDS);

&nbsp; if (cachedPlants \&\& cachedDates \&\& cachedBounds) {

&nbsp;   return {

&nbsp;     plantRowMap: new Map(JSON.parse(cachedPlants)),

&nbsp;     dateColMap: new Map(JSON.parse(cachedDates)),

&nbsp;     dateBounds: JSON.parse(cachedBounds)

&nbsp;   };

&nbsp; }

&nbsp; return refreshSystemCache();

}



function refreshSystemCache() {

&nbsp; const ss = SpreadsheetApp.getActiveSpreadsheet();

&nbsp; const erpSheet = ss.getSheetByName(SHEET\_ERP);

&nbsp; const lastRow = erpSheet.getLastRow();

&nbsp; const lastCol = erpSheet.getLastColumn();

&nbsp; const plantVals = erpSheet.getRange(1, ERP\_PLANT\_COL, lastRow, 1).getValues();

&nbsp; const plantRowMap = new Map();

&nbsp; for (let i = 3; i < plantVals.length; i++) {

&nbsp;   let p = String(plantVals\[i]\[0]).trim();

&nbsp;   if (p) plantRowMap.set(p, i); 

&nbsp; }

&nbsp; const dateVals = erpSheet.getRange(ERP\_DATE\_ROW, 1, 1, lastCol).getValues()\[0];

&nbsp; const dateColMap = new Map();

&nbsp; let minStr = null, maxStr = null;



&nbsp; for (let c = ERP\_DATE\_START\_COL - 1; c < dateVals.length; c++) {

&nbsp;   if (dateVals\[c] instanceof Date) {

&nbsp;     let dStr = Utilities.formatDate(dateVals\[c], TIMEZONE, "yyyy-MM-dd");

&nbsp;     dateColMap.set(dStr, c);

&nbsp;     // Capture Min/Max for clamping

&nbsp;     if (!minStr || dStr < minStr) minStr = dStr;

&nbsp;     if (!maxStr || dStr > maxStr) maxStr = dStr;

&nbsp;   }

&nbsp; }

&nbsp; const bounds = { min: minStr, max: maxStr };



&nbsp; const cache = CacheService.getScriptCache();

&nbsp; try {

&nbsp;   cache.put(CACHE\_KEY\_ERP\_MAP, JSON.stringify(Array.from(plantRowMap.entries())), CACHE\_EXPIRY);

&nbsp;   cache.put(CACHE\_KEY\_DATE\_MAP, JSON.stringify(Array.from(dateColMap.entries())), CACHE\_EXPIRY);

&nbsp;   cache.put(CACHE\_KEY\_BOUNDS, JSON.stringify(bounds), CACHE\_EXPIRY);

&nbsp; } catch(e) {}

&nbsp; 

&nbsp; // This explicitly returns the structure needed by getFastErpIndices

&nbsp; return { plantRowMap, dateColMap, dateBounds: bounds };

}



// --- ORIGINAL EXACT LOGIC AS REQUESTED ---

function checkStatusLock(sheet, row, newVal, range) {

&nbsp; if (newVal === "AVAILABLE") {

&nbsp;   const todayStr = Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd");

&nbsp;   const headerDates = sheet.getRange(ERP\_DATE\_ROW, 1, 1, sheet.getLastColumn()).getValues()\[0];

&nbsp;   let todayCol = -1;

&nbsp;   for (let c = ERP\_DATE\_START\_COL - 1; c < headerDates.length; c++) {

&nbsp;     if (headerDates\[c] instanceof Date \&\& Utilities.formatDate(headerDates\[c], TIMEZONE, "yyyy-MM-dd") === todayStr) {

&nbsp;       todayCol = c + 1; break;

&nbsp;     }

&nbsp;   }

&nbsp;   if (todayCol !== -1) {

&nbsp;     let cell = sheet.getRange(row, todayCol);

&nbsp;     let color = (cell.getBackground() || "#ffffff").toLowerCase();

&nbsp;     if ((color === "#ffffff" || color === "white") \&\& cell.isPartOfMerge()) {

&nbsp;        let ranges = cell.getMergedRanges();

&nbsp;        if (ranges.length > 0) color = (ranges\[0].getCell(1, 1).getBackground() || "#ffffff").toLowerCase();

&nbsp;     }

&nbsp;     if (color !== COLOR\_AVAILABLE \&\& color !== "#ffffff" \&\& color !== "white") {

&nbsp;       Browser.msgBox("⛔ STATUS LOCKED\\\\n\\\\nItem is booked for TODAY.");

&nbsp;       let correctStatus = "BOOKED";

&nbsp;       for (let key in COLORS) { if (COLORS\[key].toLowerCase() === color) correctStatus = key; }

&nbsp;       range.setValue(correctStatus); 

&nbsp;       return false; 

&nbsp;     }

&nbsp;   }

&nbsp; }

&nbsp; return true;

}

// ==========================================

// --- APPSHEET AUTOMATION BRIDGE (AUTO-SERVICE) ---

// ==========================================

function onAppSheetSync(e) {

&nbsp; if (e \&\& e.changeType !== 'EDIT' \&\& e.changeType !== 'INSERT\_ROW' \&\& e.changeType !== 'OTHER') return;



&nbsp; const ss = SpreadsheetApp.getActiveSpreadsheet();

&nbsp; const stockSheet = ss.getSheetByName(SHEET\_STOCK);

&nbsp; const erpSheet = ss.getSheetByName(SHEET\_ERP);

&nbsp; 

&nbsp; const lastRow = stockSheet.getLastRow();

&nbsp; if (lastRow < 4) return;



&nbsp; // 1. Read all Stock Data

&nbsp; const stockData = stockSheet.getRange(4, 1, lastRow - 3, 11).getValues();



&nbsp; // 2. Read ERP Statuses to compare

&nbsp; const erpLastRow = erpSheet.getLastRow();

&nbsp; const erpPlants = erpSheet.getRange(4, ERP\_PLANT\_COL, erpLastRow - 3, 1).getValues();

&nbsp; const erpStatuses = erpSheet.getRange(4, ERP\_STATUS\_COL, erpLastRow - 3, 1).getValues();



&nbsp; const erpStatusMap = new Map();

&nbsp; for (let i = 0; i < erpPlants.length; i++) {

&nbsp;    let p = String(erpPlants\[i]\[0]).trim();

&nbsp;    if (p) erpStatusMap.set(p, String(erpStatuses\[i]\[0]).trim());

&nbsp; }



&nbsp; let processedAny = false;



&nbsp; // 3. Find newly added "SERVICE" statuses from AppSheet

&nbsp; for (let i = 0; i < stockData.length; i++) {

&nbsp;    let rowData = stockData\[i];

&nbsp;    let pNo = String(rowData\[STOCK\_PLANT\_COL - 1]).trim();

&nbsp;    let status = String(rowData\[STOCK\_STATUS\_COL - 1]).trim(); 

&nbsp;    

&nbsp;    // If AppSheet set it to SERVICE...

&nbsp;    if (pNo \&\& status === "SERVICE") {

&nbsp;        

&nbsp;        // ...and it hasn't been synced to the ERP List yet

&nbsp;        if (erpStatusMap.get(pNo) !== "SERVICE") {

&nbsp;            

&nbsp;            const stockRow = i + 4;

&nbsp;            // Extract the specific array format your engine expects

&nbsp;            let targetDataArray = stockSheet.getRange(stockRow, 3, 1, 9).getValues()\[0];

&nbsp;            

&nbsp;            // Fix AppSheet's Text Dates (Convert "DD/MM/YYYY" to real Date objects)

&nbsp;            // Indices: Start=5, End=6, LogIn=7, LogOut=8

&nbsp;            \[5, 6, 7, 8].forEach(idx => {

&nbsp;                let val = targetDataArray\[idx];

&nbsp;                if (typeof val === "string" \&\& val.includes("/")) {

&nbsp;                    let parts = val.trim().split("/");

&nbsp;                    if (parts.length === 3) {

&nbsp;                        targetDataArray\[idx] = new Date(parts\[2], parts\[1] - 1, parts\[0], 0, 0, 0);

&nbsp;                    }

&nbsp;                } else if (typeof val === "string" \&\& val.includes("-")) {

&nbsp;                    targetDataArray\[idx] = new Date(val); // Fallback just in case

&nbsp;                }

&nbsp;            });



&nbsp;            // AUTO-PROCESS: Send it directly to your calendar engine!

&nbsp;            syncStatusFast(ss, targetDataArray, stockRow, SHEET\_ERP);

&nbsp;            handleSingleBookingFast(ss, stockSheet, stockRow, targetDataArray);

&nbsp;            

&nbsp;            // Overwrite the weird AppSheet text dates with real Dates in the spreadsheet so it looks clean

&nbsp;            stockSheet.getRange(stockRow, STOCK\_START\_COL, 1, 4).setValues(\[\[

&nbsp;                targetDataArray\[5] instanceof Date ? targetDataArray\[5] : "",

&nbsp;                targetDataArray\[6] instanceof Date ? targetDataArray\[6] : "",

&nbsp;                targetDataArray\[7] instanceof Date ? targetDataArray\[7] : "",

&nbsp;                targetDataArray\[8] instanceof Date ? targetDataArray\[8] : ""

&nbsp;            ]]);



&nbsp;            processedAny = true;

&nbsp;        }

&nbsp;    }

&nbsp; }



&nbsp; // 4. Clean up and refresh the cache

&nbsp; if (processedAny) {

&nbsp;     refreshSystemCache();

&nbsp; }

}



// --- ORIGINAL EXACT LOGIC AS REQUESTED ---

// --- ORIGINAL EXACT LOGIC AS REQUESTED ---

function updateDailyStatus() {

&nbsp; const ss = SpreadsheetApp.getActiveSpreadsheet();

&nbsp; const erpSheet = ss.getSheetByName(SHEET\_ERP);

&nbsp; const stockSheet = ss.getSheetByName(SHEET\_STOCK);

&nbsp; 

&nbsp; const todayStr = Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd");

&nbsp; 

&nbsp; const lastRow = erpSheet.getLastRow();

&nbsp; const lastCol = erpSheet.getLastColumn();

&nbsp; if (lastRow < 4) return;



&nbsp; // 1. BULK READ EVERYTHING (Lightning Fast Simultaneous Execution)

&nbsp; const erpDataRange = erpSheet.getRange(1, 1, lastRow, lastCol);

&nbsp; const erpValues = erpDataRange.getValues();

&nbsp; const erpBackgrounds = erpDataRange.getBackgrounds();

&nbsp; const erpMerges = erpDataRange.getMergedRanges(); // 1 API call gets ALL merges instantly

&nbsp; 

&nbsp; const headerDates = erpValues\[ERP\_DATE\_ROW - 1];

&nbsp; let todayIdx = -1;

&nbsp; 

&nbsp; // Find "Today" Column Index

&nbsp; for (let c = ERP\_DATE\_START\_COL - 1; c < headerDates.length; c++) {

&nbsp;   if (headerDates\[c] instanceof Date \&\& Utilities.formatDate(headerDates\[c], TIMEZONE, "yyyy-MM-dd") === todayStr) {

&nbsp;     todayIdx = c; break;

&nbsp;   }

&nbsp; }



&nbsp; const erpStatuses = erpSheet.getRange(4, ERP\_STATUS\_COL, lastRow - 3, 1).getValues();

&nbsp; const erpPlants = erpSheet.getRange(4, ERP\_PLANT\_COL, lastRow - 3, 1).getValues();

&nbsp; 

&nbsp; let newStatuses = \[];

&nbsp; let statusMap = new Map(); // Stores Plant No. -> Correct Status

&nbsp; 

&nbsp; if (todayIdx === -1) {

&nbsp;   // Today is not on the calendar, retain KSA statuses, reset others.

&nbsp;   for (let i = 0; i < erpStatuses.length; i++) {

&nbsp;     let current = erpStatuses\[i]\[0];

&nbsp;     let correct = (current === "SOLD TO KSA" || current === "IN KSA") ? current : "AVAILABLE";

&nbsp;     newStatuses.push(\[correct]);

&nbsp;     

&nbsp;     let pNo = String(erpPlants\[i]\[0]).trim();

&nbsp;     if (pNo) statusMap.set(pNo, correct);

&nbsp;   }

&nbsp; } else {

&nbsp;   // 2. IN-MEMORY MERGE CALCULATION (100x Faster than checking cell by cell)

&nbsp;   let mergeColorMap = new Map(); // Maps rowIdx -> True Color of the Merge

&nbsp;   

&nbsp;   for (let i = 0; i < erpMerges.length; i++) {

&nbsp;     let m = erpMerges\[i];

&nbsp;     let mRow = m.getRow() - 1;    // 0-based row index

&nbsp;     let mCol = m.getColumn() - 1; // 0-based col index

&nbsp;     let mWidth = m.getNumColumns();

&nbsp;     let mHeight = m.getNumRows();

&nbsp;     

&nbsp;     // If this merge covers "Today" horizontally...

&nbsp;     if (todayIdx >= mCol \&\& todayIdx < mCol + mWidth) {

&nbsp;       // ...The true color is always in the top-left cell of the merge

&nbsp;       let trueColor = (erpBackgrounds\[mRow]\[mCol] || "#ffffff").toLowerCase();

&nbsp;       

&nbsp;       // Apply this color to all rows covered by this specific merge

&nbsp;       for(let hr = 0; hr < mHeight; hr++) {

&nbsp;          mergeColorMap.set(mRow + hr, trueColor);

&nbsp;       }

&nbsp;     }

&nbsp;   }



&nbsp;   // 3. MAP COLORS TO STATUSES

&nbsp;   for (let i = 0; i < erpStatuses.length; i++) {

&nbsp;     let rowIdx = i + 3; // 0-based row index for data starting on row 4

&nbsp;     let current = erpStatuses\[i]\[0];

&nbsp;     

&nbsp;     // If row is inside a merge on today's date, use the merge color. Else use standard cell color.

&nbsp;     let color = mergeColorMap.has(rowIdx) 

&nbsp;         ? mergeColorMap.get(rowIdx) 

&nbsp;         : (erpBackgrounds\[rowIdx]\[todayIdx] || "#ffffff").toLowerCase();



&nbsp;     let correct = "AVAILABLE"; 

&nbsp;     

&nbsp;     if (color === COLORS\["BOOKED"].toLowerCase() || color === COLORS\["ON HIRE"].toLowerCase()) {

&nbsp;        correct = (current === "ON HIRE") ? "ON HIRE" : "BOOKED";

&nbsp;     }

&nbsp;     else if (color === COLORS\["QUOTE"].toLowerCase()) correct = "QUOTE";

&nbsp;     else if (color === COLORS\["SERVICE"].toLowerCase()) correct = "SERVICE";

&nbsp;     else if (color === COLORS\["SOLD TO KSA"].toLowerCase()) correct = "SOLD TO KSA";

&nbsp;     else if (color === COLORS\["IN KSA"].toLowerCase()) correct = "IN KSA";

&nbsp;     else if (current === "SOLD TO KSA" || current === "IN KSA") correct = current;

&nbsp;     

&nbsp;     newStatuses.push(\[correct]);

&nbsp;     

&nbsp;     let pNo = String(erpPlants\[i]\[0]).trim();

&nbsp;     if (pNo) statusMap.set(pNo, correct);

&nbsp;   }

&nbsp; }



&nbsp; // 4. SIMULTANEOUS WRITE: ERP LIST

&nbsp; erpSheet.getRange(4, ERP\_STATUS\_COL, lastRow - 3, 1).setValues(newStatuses);



&nbsp; // 5. SIMULTANEOUS WRITE: STOCK STATUS

&nbsp; const stockLastRow = stockSheet.getLastRow();

&nbsp; if (stockLastRow >= 4) {

&nbsp;   const stockPlants = stockSheet.getRange(4, STOCK\_PLANT\_COL, stockLastRow - 3, 1).getValues();

&nbsp;   const stockStatuses = stockSheet.getRange(4, STOCK\_STATUS\_COL, stockLastRow - 3, 1).getValues();

&nbsp;   let stockUpdatesCount = 0;



&nbsp;   for (let i = 0; i < stockPlants.length; i++) {

&nbsp;     let pNo = String(stockPlants\[i]\[0]).trim();

&nbsp;     if (statusMap.has(pNo)) {

&nbsp;       let newStat = statusMap.get(pNo);

&nbsp;       if (stockStatuses\[i]\[0] !== newStat) {

&nbsp;         stockStatuses\[i]\[0] = newStat;

&nbsp;         stockUpdatesCount++;

&nbsp;       }

&nbsp;     }

&nbsp;   }



&nbsp;   // Only hit the spreadsheet if changes are actually needed

&nbsp;   if (stockUpdatesCount > 0) {

&nbsp;     stockSheet.getRange(4, STOCK\_STATUS\_COL, stockLastRow - 3, 1).setValues(stockStatuses);

&nbsp;   }

&nbsp; }

&nbsp; refreshSystemCache(); // Synced cache update for speed

&nbsp; ss.toast("Force Refresh Complete. Cache Synced.", "✅ Success", 5);

}

import tools.gs:

/\*\*

&nbsp;\* 📥 IMPORT TOOL

&nbsp;\* Connects to an old season's sheet and pulls Status + Job Details into the current sheet.

&nbsp;\*/



function onOpen() {

&nbsp; const ui = SpreadsheetApp.getUi();



&nbsp; // 🛠️ DIAGNOSTIC MENU (Updated with the new button)

&nbsp; ui.createMenu('🛠️ SYSTEM DIAGNOSTIC')

&nbsp;   .addItem('1. 🏥 Run Full System Health Check', 'runSystemHealthCheck')

&nbsp;   .addItem('2. 🔗 Check Plant ID Mapping \& Duplicates', 'checkPlantIDIntegrity')

&nbsp;   .addItem('3. 🕵️ Simulate/Diagnose Selected Row', 'diagnoseSelectedRow')

&nbsp;   .addSeparator() // Adds a line to separate the tools

&nbsp;   .addItem('⚡ FORCE REFRESH: Update Statuses for TODAY', 'updateDailyStatus') // <--- NEW BUTTON

&nbsp;   .addItem('🧹 Smart Ghost Cleaner (Safe)', 'cleanGhostDataSmart')

&nbsp;   .addItem('🎨 Optimize Formatting Rules', 'runFullSystemOptimization')

&nbsp;   .addSeparator()

&nbsp;   .addItem('♻️ Rebuild System Cache', 'refreshSystemCache')

&nbsp;   .addToUi();

&nbsp;   



&nbsp; // 🔄 IMPORT MENU

&nbsp; ui.createMenu('🔄 IMPORT DATA')

&nbsp;   .addItem('Import Status from Old Sheet', 'importStockStatus')

&nbsp;   .addToUi();



&nbsp; ui.createMenu('⚡ BATCH OPERATIONS')

&nbsp;   .addItem('🚀 PROCESS YELLOW BATCH ROWS', 'processBatchQueue')

&nbsp;   .addToUi();



&nbsp; ui.createMenu('🔄 SCOPE SYNC')

&nbsp;   .addItem('📥 Sync All "SC" Sheets to Stock', 'syncClientScopes')

&nbsp;   .addToUi();

&nbsp;  

&nbsp;ui.createMenu('🔎 SCOPE TOOLS')

&nbsp;   .addItem('🔍 Check Selected Row Availability', 'checkStandaloneAvailability')

&nbsp;   .addToUi();

}

/\*\*

&nbsp;\* 📥 IMPORT TOOL (SAFE MODE)

&nbsp;\* Connects to an old season's sheet and pulls Status + Job Details into the current sheet.

&nbsp;\* STRICTLY PROTECTS existing data. Will not overwrite any populated cells or rows with dates.

&nbsp;\*/



function onOpen() {

&nbsp; const ui = SpreadsheetApp.getUi();



&nbsp; // 🛠️ DIAGNOSTIC MENU

&nbsp; ui.createMenu('🛠️ SYSTEM DIAGNOSTIC')

&nbsp;   .addItem('1. 🏥 Run Full System Health Check', 'runSystemHealthCheck')

&nbsp;   .addItem('2. 🔗 Check Plant ID Mapping \& Duplicates', 'checkPlantIDIntegrity')

&nbsp;   .addItem('3. 🕵️ Simulate/Diagnose Selected Row', 'diagnoseSelectedRow')

&nbsp;   .addSeparator() 

&nbsp;   .addItem('⚡ FORCE REFRESH: Update Statuses for TODAY', 'updateDailyStatus') 

&nbsp;   .addItem('🧹 Smart Ghost Cleaner (Safe)', 'cleanGhostDataSmart')

&nbsp;   .addItem('🎨 Optimize Formatting Rules', 'runFullSystemOptimization')

&nbsp;   .addSeparator()

&nbsp;   .addItem('♻️ Rebuild System Cache', 'refreshSystemCache')

&nbsp;   .addToUi();

&nbsp;   

&nbsp; // 🔄 IMPORT MENU

&nbsp; ui.createMenu('🔄 IMPORT DATA')

&nbsp;   .addItem('Import Status from Old Sheet', 'importStockStatus')

&nbsp;   .addToUi();



&nbsp; // ⚡ BATCH OPERATIONS

&nbsp; ui.createMenu('⚡ BATCH OPERATIONS')

&nbsp;   .addItem('🚀 PROCESS YELLOW BATCH ROWS', 'processBatchQueue')

&nbsp;   .addToUi();



&nbsp; // 🔄 SCOPE SYNC

&nbsp; ui.createMenu('🔄 SCOPE SYNC')

&nbsp;   .addItem('📥 Sync All "SC" Sheets to Stock', 'syncClientScopes')

&nbsp;   .addToUi();

&nbsp;  

&nbsp; // 🔎 SCOPE TOOLS

&nbsp; ui.createMenu('🔎 SCOPE TOOLS')

&nbsp;   .addItem('🔍 Check Selected Row Availability', 'checkStandaloneAvailability')

&nbsp;   .addToUi();

}





function importStockStatus() {

&nbsp; const ui = SpreadsheetApp.getUi();

&nbsp; const ss = SpreadsheetApp.getActiveSpreadsheet();

&nbsp; const currentSheet = ss.getSheetByName("STOCK STATUS");

&nbsp; const COLOR\_PENDING\_BATCH = "#ffff00"; // Yellow for batch processing



&nbsp; if (!currentSheet) {

&nbsp;   ui.alert("❌ Error: Could not find tab named 'STOCK STATUS' in this file.");

&nbsp;   return;

&nbsp; }



&nbsp; // 1. Ask for Old Sheet URL

&nbsp; const response = ui.prompt(

&nbsp;   'Connect to Old Sheet', 

&nbsp;   'Please paste the URL or ID of the OLD Season Sheet:', 

&nbsp;   ui.ButtonSet.OK\_CANCEL

&nbsp; );



&nbsp; if (response.getSelectedButton() !== ui.Button.OK) return;

&nbsp; const input = response.getResponseText().trim();

&nbsp; if (!input) return;



&nbsp; let sourceId = input;

&nbsp; if (input.includes("docs.google.com")) {

&nbsp;   const match = input.match(/\\/d\\/(\[a-zA-Z0-9-\_]+)/);

&nbsp;   if (match) sourceId = match\[1];

&nbsp; }



&nbsp; // 2. Open Source Sheet

&nbsp; let sourceSheet;

&nbsp; try {

&nbsp;   const sourceSS = SpreadsheetApp.openById(sourceId);

&nbsp;   sourceSheet = sourceSS.getSheetByName("STOCK STATUS");

&nbsp;   if (!sourceSheet) {

&nbsp;     ui.alert("❌ Error: Connected, but could not find 'STOCK STATUS' tab in the old file.");

&nbsp;     return;

&nbsp;   }

&nbsp; } catch (e) {

&nbsp;   ui.alert("❌ Error: Access denied or invalid ID.\\n" + e.message);

&nbsp;   return;

&nbsp; }



&nbsp; ss.toast("Reading data...", "🔄 Connecting");



&nbsp; // 3. Get Data \& Dynamic Column Mapping

&nbsp; const sourceData = sourceSheet.getDataRange().getValues();

&nbsp; const currentData = currentSheet.getDataRange().getValues();



&nbsp; function findCol(headers, name) {

&nbsp;   return headers.findIndex(h => String(h).toUpperCase().trim().includes(name.toUpperCase()));

&nbsp; }



&nbsp; let srcHeaderRow = 2; 

&nbsp; if (findCol(sourceData\[2], "PLANT") === -1) srcHeaderRow = 0;



&nbsp; const srcCols = {

&nbsp;   plant: findCol(sourceData\[srcHeaderRow], "PLANT"),

&nbsp;   status: findCol(sourceData\[srcHeaderRow], "STATUS"),

&nbsp;   job: findCol(sourceData\[srcHeaderRow], "JOB"),

&nbsp;   client: findCol(sourceData\[srcHeaderRow], "CLIENT"),

&nbsp;   project: findCol(sourceData\[srcHeaderRow], "PROJECT"),

&nbsp;   start: findCol(sourceData\[srcHeaderRow], "START"),

&nbsp;   end: findCol(sourceData\[srcHeaderRow], "END")

&nbsp; };



&nbsp; if (srcCols.plant === -1 || srcCols.status === -1) {

&nbsp;   ui.alert("❌ Error: Could not find 'PLANT NO' or 'STATUS' columns in the old sheet.");

&nbsp;   return;

&nbsp; }



&nbsp; // 4. Build Data Map from Old Sheet

&nbsp; let dataMap = new Map();

&nbsp; for (let i = srcHeaderRow + 1; i < sourceData.length; i++) {

&nbsp;   let id = String(sourceData\[i]\[srcCols.plant]).trim();

&nbsp;   if (id) {

&nbsp;     dataMap.set(id, {

&nbsp;       status: sourceData\[i]\[srcCols.status],

&nbsp;       job: srcCols.job > -1 ? sourceData\[i]\[srcCols.job] : "",

&nbsp;       client: srcCols.client > -1 ? sourceData\[i]\[srcCols.client] : "",

&nbsp;       project: srcCols.project > -1 ? sourceData\[i]\[srcCols.project] : "",

&nbsp;       start: srcCols.start > -1 ? sourceData\[i]\[srcCols.start] : "",

&nbsp;       end: srcCols.end > -1 ? sourceData\[i]\[srcCols.end] : ""

&nbsp;     });

&nbsp;   }

&nbsp; }



&nbsp; // 5. Map Current Sheet Columns

&nbsp; const curCols = {

&nbsp;   plant: findCol(currentData\[2], "PLANT"),   

&nbsp;   status: findCol(currentData\[2], "STATUS"), 

&nbsp;   job: findCol(currentData\[2], "JOB"),       

&nbsp;   client: findCol(currentData\[2], "CLIENT"), 

&nbsp;   project: findCol(currentData\[2], "PROJECT"),

&nbsp;   start: findCol(currentData\[2], "START"),   

&nbsp;   end: findCol(currentData\[2], "END")        

&nbsp; };



&nbsp; if (curCols.plant === -1) curCols.plant = 2;

&nbsp; if (curCols.status === -1) curCols.status = 3;



&nbsp; // 6. Prepare Batch Updates

&nbsp; let updates = 0;

&nbsp; let numRows = currentSheet.getLastRow() - 3;

&nbsp; if (numRows < 1) return;



&nbsp; let newStatus = \[], newJob = \[], newClient = \[], newProject = \[], newStart = \[], newEnd = \[];

&nbsp; 

&nbsp; let rangeStatus = currentSheet.getRange(4, curCols.status + 1, numRows, 1);

&nbsp; let rangeJob = currentSheet.getRange(4, curCols.job + 1, numRows, 1);

&nbsp; let rangeClient = currentSheet.getRange(4, curCols.client + 1, numRows, 1);

&nbsp; let rangeProject = currentSheet.getRange(4, curCols.project + 1, numRows, 1);

&nbsp; let rangeStart = currentSheet.getRange(4, curCols.start + 1, numRows, 1);

&nbsp; let rangeEnd = currentSheet.getRange(4, curCols.end + 1, numRows, 1);



&nbsp; let valStatus = rangeStatus.getValues();

&nbsp; let bgStatus = rangeStatus.getBackgrounds();

&nbsp; let valJob = rangeJob.getValues();

&nbsp; let valClient = rangeClient.getValues();

&nbsp; let valProject = rangeProject.getValues();

&nbsp; let valStart = rangeStart.getValues();

&nbsp; let valEnd = rangeEnd.getValues();



&nbsp; for (let i = 0; i < numRows; i++) {

&nbsp;   let currentRowIndex = i + 3;

&nbsp;   if (currentRowIndex >= currentData.length) break;



&nbsp;   let id = String(currentData\[currentRowIndex]\[curCols.plant]).trim();

&nbsp;   let oldData = dataMap.get(id);



&nbsp;   // --- ROW LEVEL PROTECTION ---

&nbsp;   // Check if the current row already has a Start OR End date filled in

&nbsp;   let curStartStr = String(valStart\[i]\[0]).trim();

&nbsp;   let curEndStr = String(valEnd\[i]\[0]).trim();

&nbsp;   let hasExistingDates = (curStartStr !== "" || curEndStr !== "");



&nbsp;   // If old data exists AND the row doesn't have existing dates blocking it

&nbsp;   if (oldData \&\& !hasExistingDates) {

&nbsp;     let isRowUpdated = false;



&nbsp;     // STATUS: Only apply if current status is empty or "AVAILABLE"

&nbsp;     let curStatusStr = String(valStatus\[i]\[0]).trim();

&nbsp;     if (oldData.status \&\& (curStatusStr === "" || curStatusStr === "AVAILABLE")) { 

&nbsp;        newStatus.push(\[oldData.status]);

&nbsp;        

&nbsp;        // Highlight for Batch Processor if it's an active booking

&nbsp;        if (oldData.status !== "AVAILABLE") {

&nbsp;            bgStatus\[i]\[0] = COLOR\_PENDING\_BATCH;

&nbsp;        }

&nbsp;        isRowUpdated = true;

&nbsp;     } else { 

&nbsp;        newStatus.push(\[valStatus\[i]\[0]]); 

&nbsp;     }



&nbsp;     // --- CELL LEVEL PROTECTION (NO OVERWRITING) ---

&nbsp;     // Only import if old data exists AND the current cell is completely blank

&nbsp;     

&nbsp;     if (oldData.job \&\& !String(valJob\[i]\[0]).trim()) { newJob.push(\[oldData.job]); isRowUpdated = true; } 

&nbsp;     else { newJob.push(\[valJob\[i]\[0]]); }



&nbsp;     if (oldData.client \&\& !String(valClient\[i]\[0]).trim()) { newClient.push(\[oldData.client]); isRowUpdated = true; } 

&nbsp;     else { newClient.push(\[valClient\[i]\[0]]); }



&nbsp;     if (oldData.project \&\& !String(valProject\[i]\[0]).trim()) { newProject.push(\[oldData.project]); isRowUpdated = true; } 

&nbsp;     else { newProject.push(\[valProject\[i]\[0]]); }



&nbsp;     if (oldData.start \&\& !curStartStr) { newStart.push(\[oldData.start]); isRowUpdated = true; } 

&nbsp;     else { newStart.push(\[valStart\[i]\[0]]); }



&nbsp;     if (oldData.end \&\& !curEndStr) { newEnd.push(\[oldData.end]); isRowUpdated = true; } 

&nbsp;     else { newEnd.push(\[valEnd\[i]\[0]]); }



&nbsp;     if (isRowUpdated) updates++;



&nbsp;   } else {

&nbsp;     // Data is protected by dates OR no matching old data found. Keep current values exactly as they are.

&nbsp;     newStatus.push(\[valStatus\[i]\[0]]);

&nbsp;     newJob.push(\[valJob\[i]\[0]]);

&nbsp;     newClient.push(\[valClient\[i]\[0]]);

&nbsp;     newProject.push(\[valProject\[i]\[0]]);

&nbsp;     newStart.push(\[valStart\[i]\[0]]);

&nbsp;     newEnd.push(\[valEnd\[i]\[0]]);

&nbsp;   }

&nbsp; }



&nbsp; // 7. Write Back to Sheet

&nbsp; if (updates > 0) {

&nbsp;   rangeStatus.setValues(newStatus);

&nbsp;   rangeStatus.setBackgrounds(bgStatus);

&nbsp;   rangeJob.setValues(newJob);

&nbsp;   rangeClient.setValues(newClient);

&nbsp;   rangeProject.setValues(newProject);

&nbsp;   rangeStart.setValues(newStart);

&nbsp;   rangeEnd.setValues(newEnd);

&nbsp;   

&nbsp;   ui.alert(`✅ Safe Import Complete!\\n\\nImported data for ${updates} items into empty cells. All your existing data and dates were protected.\\n\\nYellow items are ready for Batch Processing!`);

&nbsp; } else {

&nbsp;   ui.alert("⚠️ Data scanned, but no empty cells needed filling or rows were protected by existing dates.");

&nbsp; }

}

debug.gs: 

// --- DEBUGGER CONFIGURATION (Matches your Main Script) ---

const DBG\_SHEET\_STOCK = "STOCK STATUS";

const DBG\_SHEET\_ERP = "ERP LIST";

const DBG\_TIMEZONE = "Asia/Dubai";

const DBG\_ERP\_DATE\_ROW = 3; 

const DBG\_ERP\_DATE\_START\_COL = 7; // Col G







/\*\*

&nbsp;\* TEST 1: SYSTEM HEALTH

&nbsp;\* Checks: Sheet names, Date formats, "Today" existence, Timezone alignment.

&nbsp;\*/

function runSystemHealthCheck() {

&nbsp; const ss = SpreadsheetApp.getActiveSpreadsheet();

&nbsp; const stockSheet = ss.getSheetByName(DBG\_SHEET\_STOCK);

&nbsp; const erpSheet = ss.getSheetByName(DBG\_SHEET\_ERP);

&nbsp; let log = "--- 🏥 SYSTEM HEALTH REPORT ---\\n";

&nbsp; let errors = 0;



&nbsp; // 1. CHECK SHEETS

&nbsp; if (!stockSheet) { log += "❌ MISSING SHEET: 'STOCK STATUS'\\n"; errors++; }

&nbsp; else log += "✅ Found 'STOCK STATUS'\\n";

&nbsp; 

&nbsp; if (!erpSheet) { log += "❌ MISSING SHEET: 'ERP LIST'\\n"; errors++; }

&nbsp; else log += "✅ Found 'ERP LIST'\\n";



&nbsp; if (errors > 0) { Browser.msgBox(log); return; }



&nbsp; // 2. CHECK TIMEZONE

&nbsp; const sheetTZ = ss.getSpreadsheetTimeZone();

&nbsp; if (sheetTZ !== DBG\_TIMEZONE) {

&nbsp;   log += `⚠️ TIMEZONE MISMATCH: Sheet is '${sheetTZ}', Script is '${DBG\_TIMEZONE}'.\\n   (This might cause dates to be off by 1 day).\\n`;

&nbsp; } else {

&nbsp;   log += `✅ Timezone Aligned (${DBG\_TIMEZONE})\\n`;

&nbsp; }



&nbsp; // 3. CHECK CALENDAR HEADERS

&nbsp; const headers = erpSheet.getRange(DBG\_ERP\_DATE\_ROW, DBG\_ERP\_DATE\_START\_COL, 1, 15).getValues()\[0];

&nbsp; let dateErrors = 0;

&nbsp; headers.forEach((h, i) => {

&nbsp;   if (!(h instanceof Date)) {

&nbsp;     dateErrors++;

&nbsp;     if (dateErrors === 1) log += `❌ ROW 3 ERROR: Column ${i+7} is TEXT, not a Date. Value: "${h}"\\n`;

&nbsp;   }

&nbsp; });



&nbsp; if (dateErrors > 0) {

&nbsp;   log += "⚠️ CRITICAL: Calendar headers contain text. Script cannot read them.\\n";

&nbsp;   errors++;

&nbsp; } else {

&nbsp;   log += "✅ Calendar Headers are valid Date Objects.\\n";

&nbsp; }



&nbsp; // 4. FIND "TODAY"

&nbsp; const todayStr = Utilities.formatDate(new Date(), DBG\_TIMEZONE, "yyyy-MM-dd");

&nbsp; const allHeaders = erpSheet.getRange(DBG\_ERP\_DATE\_ROW, 1, 1, erpSheet.getLastColumn()).getValues()\[0];

&nbsp; let todayCol = -1;

&nbsp; for (let c = DBG\_ERP\_DATE\_START\_COL - 1; c < allHeaders.length; c++) {

&nbsp;   if (allHeaders\[c] instanceof Date) {

&nbsp;     if (Utilities.formatDate(allHeaders\[c], DBG\_TIMEZONE, "yyyy-MM-dd") === todayStr) {

&nbsp;       todayCol = c + 1;

&nbsp;       break;

&nbsp;     }

&nbsp;   }

&nbsp; }



&nbsp; if (todayCol !== -1) log += `✅ 'Today' (${todayStr}) found at Column ${todayCol}.\\n`;

&nbsp; else {

&nbsp;   log += `⚠️ 'Today' (${todayStr}) NOT found in header. Daily Scanner will fail.\\n`;

&nbsp;   errors++;

&nbsp; }



&nbsp; if (errors === 0) log += "\\n🎉 SYSTEM IS HEALTHY.";

&nbsp; else log += `\\nfound ${errors} errors.`;



&nbsp; Browser.msgBox(log);

}



/\*\*

&nbsp;\* TEST 2: DATA INTEGRITY

&nbsp;\* Checks: Duplicate Plant IDs, IDs existing in one sheet but not the other.

&nbsp;\*/

function checkPlantIDIntegrity() {

&nbsp; const ss = SpreadsheetApp.getActiveSpreadsheet();

&nbsp; const stockSheet = ss.getSheetByName(DBG\_SHEET\_STOCK);

&nbsp; const erpSheet = ss.getSheetByName(DBG\_SHEET\_ERP);

&nbsp; let log = "--- 🔗 DATA INTEGRITY REPORT ---\\n";

&nbsp; 

&nbsp; // Get all IDs

&nbsp; const stockIDs = stockSheet.getRange(4, 3, stockSheet.getLastRow() - 3, 1).getValues().flat().map(String).filter(Boolean);

&nbsp; const erpIDs = erpSheet.getRange(4, 6, erpSheet.getLastRow() - 3, 1).getValues().flat().map(String).filter(Boolean);



&nbsp; // 1. Check Duplicates in ERP (CRITICAL)

&nbsp; let seen = new Set();

&nbsp; let duplicates = new Set();

&nbsp; erpIDs.forEach(id => {

&nbsp;   let cleanID = id.trim();

&nbsp;   if (seen.has(cleanID)) duplicates.add(cleanID);

&nbsp;   seen.add(cleanID);

&nbsp; });



&nbsp; if (duplicates.size > 0) {

&nbsp;   log += "❌ DUPLICATE IDs IN ERP LIST (Script will only find the first one):\\n";

&nbsp;   duplicates.forEach(d => log += `   - ${d}\\n`);

&nbsp; } else {

&nbsp;   log += "✅ No Duplicate IDs in ERP List.\\n";

&nbsp; }



&nbsp; // 2. Check Matching

&nbsp; let missingInERP = 0;

&nbsp; stockIDs.forEach(id => {

&nbsp;   if (!seen.has(id.trim())) missingInERP++;

&nbsp; });



&nbsp; if (missingInERP > 0) {

&nbsp;   log += `⚠️ ${missingInERP} Plant IDs are in STOCK but missing from ERP LIST.\\n`;

&nbsp; } else {

&nbsp;   log += "✅ All Stock IDs exist in ERP List.\\n";

&nbsp; }



&nbsp; Browser.msgBox(log);

}



/\*\*

&nbsp;\* TEST 3: SIMULATION (The "Why didn't it work?" tool)

&nbsp;\* Select a row in STOCK STATUS and run this. It runs the conflict logic in "Read-Only" mode.

&nbsp;\*/

function diagnoseSelectedRow() {

&nbsp; const ss = SpreadsheetApp.getActiveSpreadsheet();

&nbsp; const sheet = ss.getActiveSheet();

&nbsp; const ui = SpreadsheetApp.getUi();



&nbsp; if (sheet.getName() !== DBG\_SHEET\_STOCK) {

&nbsp;   ui.alert("⚠️ Select a row in 'STOCK STATUS' first.");

&nbsp;   return;

&nbsp; }



&nbsp; const row = sheet.getActiveRange().getRow();

&nbsp; if (row < 4) return;



&nbsp; // Get Data

&nbsp; const plantNo = sheet.getRange(row, 3).getValue();

&nbsp; const status = sheet.getRange(row, 4).getValue();

&nbsp; const start = sheet.getRange(row, 8).getValue();

&nbsp; const end = sheet.getRange(row, 9).getValue();



&nbsp; let log = `--- 🕵️ DIAGNOSIS ROW ${row} ---\\n`;

&nbsp; log += `ID: ${plantNo} | Status: ${status}\\n`;



&nbsp; // 1. Check Dates

&nbsp; if (status === "AVAILABLE") {

&nbsp;   ui.alert(log + "ℹ️ Status is AVAILABLE. Script takes no action (Correct).");

&nbsp;   return;

&nbsp; }

&nbsp; if (!(start instanceof Date)) {

&nbsp;   ui.alert(log + "❌ Start Date is invalid.");

&nbsp;   return;

&nbsp; }

&nbsp; 

&nbsp; // 2. Find in ERP

&nbsp; const erpSheet = ss.getSheetByName(DBG\_SHEET\_ERP);

&nbsp; const erpData = erpSheet.getDataRange().getValues();

&nbsp; let erpRow = -1;

&nbsp; for (let i = 3; i < erpData.length; i++) {

&nbsp;   if (String(erpData\[i]\[5]).trim() == String(plantNo).trim()) {

&nbsp;     erpRow = i + 1;

&nbsp;     break;

&nbsp;   }

&nbsp; }



&nbsp; if (erpRow === -1) {

&nbsp;   ui.alert(log + "❌ ID not found in ERP List.");

&nbsp;   return;

&nbsp; }

&nbsp; log += `✅ Mapped to ERP Row ${erpRow}\\n`;



&nbsp; // 3. Calculate Range

&nbsp; const sStr = Utilities.formatDate(start, DBG\_TIMEZONE, "yyyy-MM-dd");

&nbsp; let eStr = (end instanceof Date) ? Utilities.formatDate(end, DBG\_TIMEZONE, "yyyy-MM-dd") : "End of Sheet";

&nbsp; 

&nbsp; // Find Cols

&nbsp; const headers = erpSheet.getRange(DBG\_ERP\_DATE\_ROW, 1, 1, erpSheet.getLastColumn()).getValues()\[0];

&nbsp; let startCol = -1; 

&nbsp; let endCol = -1;



&nbsp; for (let c = DBG\_ERP\_DATE\_START\_COL - 1; c < headers.length; c++) {

&nbsp;   let d = headers\[c];

&nbsp;   if (d instanceof Date) {

&nbsp;     let dStr = Utilities.formatDate(d, DBG\_TIMEZONE, "yyyy-MM-dd");

&nbsp;     if (dStr === sStr) startCol = c + 1;

&nbsp;     if (end instanceof Date \&\& dStr === eStr) endCol = c + 1;

&nbsp;   }

&nbsp; }



&nbsp; if (startCol === -1) {

&nbsp;   ui.alert(log + `❌ Start Date ${sStr} not found in headers.`);

&nbsp;   return;

&nbsp; }

&nbsp; if (status === "SOLD TO KSA" || !end) endCol = erpSheet.getLastColumn();

&nbsp; else if (endCol === -1) endCol = erpSheet.getLastColumn(); // Overflow



&nbsp; log += `📅 Booking Range: Col ${startCol} to ${endCol}\\n`;



&nbsp; // 4. RUN MERGE-AWARE CONFLICT CHECK

&nbsp; const numCols = endCol - startCol + 1;

&nbsp; const targetRange = erpSheet.getRange(erpRow, startCol, 1, numCols);

&nbsp; let conflictFound = false;

&nbsp; let conflictDetail = "";



&nbsp; for (let i = 0; i < numCols; i++) {

&nbsp;   let cell = targetRange.getCell(1, i + 1);

&nbsp;   let color = (cell.getBackground() || "#ffffff").toLowerCase();

&nbsp;   

&nbsp;   // Check Merge Parent

&nbsp;   if (color === "#ffffff" || color === "white") {

&nbsp;     if (cell.isPartOfMerge()) {

&nbsp;       let ranges = cell.getMergedRanges();

&nbsp;       if (ranges.length > 0) {

&nbsp;         color = (ranges\[0].getCell(1, 1).getBackground() || "#ffffff").toLowerCase();

&nbsp;       }

&nbsp;     }

&nbsp;   }



&nbsp;   if (color !== "#ffffff" \&\& color !== "white") {

&nbsp;     conflictFound = true;

&nbsp;     conflictDetail = `Cell \[${i+1}] has color ${color}`;

&nbsp;     break;

&nbsp;   }

&nbsp; }



&nbsp; if (conflictFound) {

&nbsp;   log += `\\n🔴 CONFLICT DETECTED: ${conflictDetail}\\n`;

&nbsp;   log += "✅ The script WILL block this booking.\\n";

&nbsp; } else {

&nbsp;   log += "\\n🟢 NO CONFLICTS found.\\n";

&nbsp;   log += "ℹ️ The script will ALLOW this booking.\\n";

&nbsp; }



&nbsp; Browser.msgBox(log);

}



/\*\*

&nbsp;\* 🛠️ SMART GHOST CLEANER (Ultra-Safe Mode)

&nbsp;\* Removes unused rows/cols to speed up the sheet, but PROTECTS formatting/borders.

&nbsp;\*/

function cleanGhostDataSmart() {

&nbsp; const ss = SpreadsheetApp.getActiveSpreadsheet();

&nbsp; const sheets = ss.getSheets();

&nbsp; const ui = SpreadsheetApp.getUi();



&nbsp; let stats = {

&nbsp;   rowsRemoved: 0,

&nbsp;   colsRemoved: 0,

&nbsp;   sheetsCleaned: 0

&nbsp; };



&nbsp; // CONFIGURATION: How much empty space to keep as a "safety buffer"

&nbsp; const ROW\_BUFFER = 20;  // Keep 20 empty rows below the last data/border

&nbsp; const COL\_BUFFER = 5;   // Keep 5 empty columns to the right



&nbsp; for (let sheet of sheets) {

&nbsp;   const sheetName = sheet.getName();

&nbsp;   

&nbsp;   // 1. ANALYZE ROWS

&nbsp;   try {

&nbsp;     const maxRows = sheet.getMaxRows();

&nbsp;     const lastContentRow = sheet.getLastRow();

&nbsp;     

&nbsp;     // Smart Scan: Look for visual boundaries (Borders/Colors) beyond text

&nbsp;     // We scan in chunks to be fast.

&nbsp;     let visualLastRow = lastContentRow;

&nbsp;     

&nbsp;     // If the sheet has more rows than content, check for formatting

&nbsp;     if (maxRows > lastContentRow) {

&nbsp;       // We check the area between data end and max rows

&nbsp;       // To be fast, we check the background colors. 

&nbsp;       // Checking borders on 1000s of rows is slow, so we use a heuristic:

&nbsp;       // If a row has a background color that isn't white, it's "part of the table".

&nbsp;       

&nbsp;       const startSearch = lastContentRow + 1;

&nbsp;       const rowsToCheck = Math.min(maxRows - lastContentRow, 100); // Check next 100 rows max

&nbsp;       

&nbsp;       if (rowsToCheck > 0) {

&nbsp;          const bgColors = sheet.getRange(startSearch, 1, rowsToCheck, sheet.getLastColumn()).getBackgrounds();

&nbsp;          

&nbsp;          for (let r = 0; r < bgColors.length; r++) {

&nbsp;            for (let c = 0; c < bgColors\[0].length; c++) {

&nbsp;              if (bgColors\[r]\[c] !== "#ffffff" \&\& bgColors\[r]\[c] !== "white") {

&nbsp;                visualLastRow = startSearch + r;

&nbsp;                break; 

&nbsp;              }

&nbsp;            }

&nbsp;          }

&nbsp;       }

&nbsp;     }



&nbsp;     // Calculate safe cut-off

&nbsp;     const keepRows = visualLastRow + ROW\_BUFFER;



&nbsp;     if (maxRows > keepRows) {

&nbsp;       const rowsToDelete = maxRows - keepRows;

&nbsp;       // Double check: Don't delete if it leaves less than 10 rows total

&nbsp;       if (rowsToDelete > 0 \&\& keepRows > 10) {

&nbsp;         sheet.deleteRows(keepRows + 1, rowsToDelete);

&nbsp;         stats.rowsRemoved += rowsToDelete;

&nbsp;       }

&nbsp;     }

&nbsp;   } catch (e) {

&nbsp;     console.error(`Error cleaning rows on ${sheetName}: ${e.message}`);

&nbsp;   }



&nbsp;   // 2. ANALYZE COLUMNS

&nbsp;   try {

&nbsp;     const maxCols = sheet.getMaxColumns();

&nbsp;     const lastContentCol = sheet.getLastColumn();

&nbsp;     let keepCols = lastContentCol + COL\_BUFFER;



&nbsp;     // Special handling for ERP LIST (Dates run horizontally)

&nbsp;     // We trust getLastColumn() heavily here as dates usually populate headers

&nbsp;     

&nbsp;     if (maxCols > keepCols) {

&nbsp;       const colsToDelete = maxCols - keepCols;

&nbsp;       if (colsToDelete > 0 \&\& keepCols > 5) {

&nbsp;          sheet.deleteColumns(keepCols + 1, colsToDelete);

&nbsp;          stats.colsRemoved += colsToDelete;

&nbsp;       }

&nbsp;     }

&nbsp;   } catch (e) {

&nbsp;     console.error(`Error cleaning cols on ${sheetName}: ${e.message}`);

&nbsp;   }

&nbsp;   

&nbsp;   stats.sheetsCleaned++;

&nbsp; }



&nbsp; // Feedback

&nbsp; if (stats.rowsRemoved > 0 || stats.colsRemoved > 0) {

&nbsp;   ss.toast(

&nbsp;     `🧹 Removed ${stats.rowsRemoved} rows \& ${stats.colsRemoved} cols.`, 

&nbsp;     "Optimization Complete", 

&nbsp;     5

&nbsp;   );

&nbsp; } else {

&nbsp;   ss.toast("✨ Sheets are already optimized.", "Clean", 3);

&nbsp; }

}



/\*\*

&nbsp;\* ⚡ ADVANCED SYSTEM OPTIMIZER

&nbsp;\* Targets silent performance killers: 

&nbsp;\* 1. Trims Conditional Formatting that extends infinitely.

&nbsp;\* 2. Removes Data Validation from empty ghost zones.

&nbsp;\* 3. Archives OLD formulas to static text (Optional Speed Boost).

&nbsp;\*/



const SAFETY\_BUFFER\_ROWS = 20; // Keep formatting for this many rows after data ends

const SAFETY\_BUFFER\_COLS = 5;



function runFullSystemOptimization() {

&nbsp; const ss = SpreadsheetApp.getActiveSpreadsheet();

&nbsp; const ui = SpreadsheetApp.getUi();

&nbsp; 

&nbsp; // 1. GHOST CLEANER (Structure)

&nbsp; cleanGhostDataSmart(); // Run the Smart Cleaner from previous step first

&nbsp; 

&nbsp; // 2. FORMATTING TRIMMER (Rendering Engine)

&nbsp; trimOverextendedFormatting(ss);



&nbsp; // 3. OPTIONAL: ARCHIVER

&nbsp; // (We don't run this automatically to be safe, but we alert the user)

&nbsp; ss.toast("Structure \& Formatting Optimized. Sheet should load faster.", "🚀 Done", 5);

}



/\*\*

&nbsp;\* 🎨 CONDITIONAL FORMATTING TRIMMER

&nbsp;\* Prevents CF rules from applying to row 50,000 if data ends at 500.

&nbsp;\* This saves MASSIVE calculation power on load.

&nbsp;\*/

function trimOverextendedFormatting(ss) {

&nbsp; const sheets = ss.getSheets();

&nbsp; let rulesTrimmed = 0;



&nbsp; sheets.forEach(sheet => {

&nbsp;   const lastRow = sheet.getLastRow();

&nbsp;   const maxRow = sheet.getMaxRows();

&nbsp;   

&nbsp;   // Define the "Dead Zone" where rules shouldn't exist

&nbsp;   const cutOffRow = lastRow + SAFETY\_BUFFER\_ROWS;

&nbsp;   

&nbsp;   if (cutOffRow < maxRow) {

&nbsp;     const rules = sheet.getConditionalFormatRules();

&nbsp;     const newRules = \[];

&nbsp;     let sheetModified = false;



&nbsp;     rules.forEach(rule => {

&nbsp;       const ranges = rule.getRanges();

&nbsp;       const newRanges = \[];

&nbsp;       

&nbsp;       ranges.forEach(range => {

&nbsp;         const rRow = range.getRow();

&nbsp;         const rLast = range.getLastRow();

&nbsp;         const rCol = range.getColumn();

&nbsp;         const rLastCol = range.getLastColumn();



&nbsp;         // If the rule starts inside the data but extends into the void

&nbsp;         if (rRow <= cutOffRow \&\& rLast > cutOffRow) {

&nbsp;           // Clip it at the cutoff

&nbsp;           newRanges.push(sheet.getRange(rRow, rCol, cutOffRow - rRow + 1, rLastCol - rCol + 1));

&nbsp;           sheetModified = true;

&nbsp;         } 

&nbsp;         // If the rule is entirely in the void, drop it (don't push to newRanges)

&nbsp;         else if (rRow > cutOffRow) {

&nbsp;           sheetModified = true; // Drop it

&nbsp;         } 

&nbsp;         // Otherwise keep it

&nbsp;         else {

&nbsp;           newRanges.push(range);

&nbsp;         }

&nbsp;       });



&nbsp;       if (newRanges.length > 0) {

&nbsp;         const newRule = rule.copy().setRanges(newRanges).build();

&nbsp;         newRules.push(newRule);

&nbsp;       }

&nbsp;     });



&nbsp;     if (sheetModified) {

&nbsp;       sheet.setConditionalFormatRules(newRules);

&nbsp;       rulesTrimmed++;

&nbsp;     }

&nbsp;   }

&nbsp; });

&nbsp; 

&nbsp; if (rulesTrimmed > 0) console.log(`Optimized formatting rules on ${rulesTrimmed} sheets.`);

}



/\*\*

&nbsp;\* 🔒 HISTORY ARCHIVER (Manual Trigger Only)

&nbsp;\* Converts formulas in "Stock Status" to static values IF the job ended 30+ days ago.

&nbsp;\* This prevents the sheet from recalculating 2024 dates every time you open it in 2026.

&nbsp;\*/

function archiveHistoricalData() {

&nbsp; const ss = SpreadsheetApp.getActiveSpreadsheet();

&nbsp; const sheet = ss.getSheetByName("STOCK STATUS"); // Or variable SHEET\_STOCK

&nbsp; const ui = SpreadsheetApp.getUi();



&nbsp; const confirm = ui.alert(

&nbsp;   "🗄️ ARCHIVE HISTORICAL DATA?",

&nbsp;   "This will convert formulas to STATIC TEXT for jobs that ended over 30 days ago.\\n\\nThis makes the sheet much faster but prevents auto-updating of those specific old rows.\\n\\nProceed?",

&nbsp;   ui.ButtonSet.YES\_NO

&nbsp; );



&nbsp; if (confirm !== ui.Button.YES) return;



&nbsp; const lastRow = sheet.getLastRow();

&nbsp; // Assuming Col I (9) is END DATE. Adjust if needed.

&nbsp; // Using your config: const STOCK\_END\_COL = 9;

&nbsp; const END\_COL\_INDEX = 9; 

&nbsp; 

&nbsp; const dataRange = sheet.getRange(4, 1, lastRow - 3, sheet.getLastColumn());

&nbsp; const values = dataRange.getValues();

&nbsp; const formulas = dataRange.getFormulas();

&nbsp; 

&nbsp; const today = new Date();

&nbsp; const thirtyDaysAgo = new Date(today.setDate(today.getDate() - 30));

&nbsp; let archivedCount = 0;



&nbsp; for (let i = 0; i < values.length; i++) {

&nbsp;   const endDate = values\[i]\[END\_COL\_INDEX - 1]; // -1 for array index

&nbsp;   

&nbsp;   // Check if it's a date, it's in the past, AND it currently has formulas

&nbsp;   if (endDate instanceof Date \&\& endDate < thirtyDaysAgo) {

&nbsp;     let hasFormula = false;

&nbsp;     // Check if row has any formulas

&nbsp;     if (formulas\[i].some(f => f !== "")) {

&nbsp;       // Overwrite the whole row with its own values (removing formulas)

&nbsp;       const range = sheet.getRange(i + 4, 1, 1, values\[0].length);

&nbsp;       range.setValues(\[values\[i]]); // Paste Values

&nbsp;       archivedCount++;

&nbsp;     }

&nbsp;   }

&nbsp; }



&nbsp; ss.toast(`Archived ${archivedCount} historical rows.`, "💾 Speed Boost", 5);

}



// Add this to your Menu in onOpen (Code.gs)

/\*

&nbsp;  ui.createMenu('⚡ BATCH OPERATIONS')

&nbsp;    ...

&nbsp;    .addItem('🧹 Clean Ghost Data', 'cleanGhostDataSmart')

&nbsp;    ...

\*/

SC Updater.gs:

/\*\*

&nbsp;\* ⚡ QUANTUM-VELOCITY SYNC ENGINE v2.0 (The "Priority" Update)

&nbsp;\* \* INNOVATIONS:

&nbsp;\* 1. SESSION LOCKING: Enforces "First Sheet Wins" logic instantly.

&nbsp;\* 2. GREEN-SKIPPING: Ignores already processed (Green) rows.

&nbsp;\* 3. BATCH PAINTING: Updates CS Sheet colors in one massive operation per sheet.

&nbsp;\* 4. CONFLICT REPORTING: Tracks exactly what was blocked and why.

&nbsp;\*/



// --- CONFIGURATION ---

const KEYWORD\_SC = "CS -"; 

const SHEET\_STOCK\_NAME = "STOCK STATUS";

const SHEET\_ERP\_NAME = "ERP LIST";

const COLOR\_SUCCESS = "#00ff00"; // Bright Green

const TIMEZONE\_SC = "Asia/Dubai";



function syncClientScopes() {

&nbsp; const tStart = new Date().getTime();

&nbsp; const ss = SpreadsheetApp.getActiveSpreadsheet();

&nbsp; 

&nbsp; // --- 1. TELEPATHIC CACHE \& PRELOAD ---

&nbsp; // Load ERP Cache and Stock Map immediately

&nbsp; const cache = CacheService.getScriptCache();

&nbsp; const cachedPlants = cache.get("ERP\_PLANT\_MAP\_V5");

&nbsp; const cachedDates = cache.get("ERP\_DATE\_MAP\_V5");

&nbsp; 

&nbsp; let erpPlantMap, erpDateMap;



&nbsp; if (!cachedPlants || !cachedDates) {

&nbsp;    if (typeof refreshSystemCache === 'function') {

&nbsp;       const fresh = refreshSystemCache();

&nbsp;       erpPlantMap = fresh.plantRowMap;

&nbsp;       erpDateMap = fresh.dateColMap;

&nbsp;    } else {

&nbsp;       SpreadsheetApp.getUi().alert("Cache Missing. Run 'Refresh System Cache' first.");

&nbsp;       return; 

&nbsp;    }

&nbsp; } else {

&nbsp;   erpPlantMap = new Map(JSON.parse(cachedPlants));

&nbsp;   erpDateMap = new Map(JSON.parse(cachedDates));

&nbsp; }

&nbsp; 

&nbsp; // --- 2. SURGICAL STOCK READ ---

&nbsp; const stockSheet = ss.getSheetByName(SHEET\_STOCK\_NAME);

&nbsp; const stockLastRow = stockSheet.getLastRow();

&nbsp; const stockData = stockSheet.getRange(4, 1, stockLastRow - 3, 11).getValues(); // Read columns A to K

&nbsp; 

&nbsp; // Map Plant No (Col C / Index 2) to Row Number

&nbsp; const stockMap = new Map();

&nbsp; for (let i = 0; i < stockData.length; i++) {

&nbsp;   let p = String(stockData\[i]\[2]).trim(); // Col C is index 2

&nbsp;   if (p) stockMap.set(p, i + 4); 

&nbsp; }



&nbsp; // --- 3. SESSION STATE (The "First-Come-First-Serve" Logic) ---

&nbsp; // This Set tracks items booked IN THIS RUN. If Sheet 1 books it, Sheet 2 gets blocked.

&nbsp; const sessionBookedPlants = new Set();

&nbsp; const reportLog = { booked: \[], blocked: \[] };

&nbsp; const pendingStockUpdates = \[]; // Updates for Stock Status

&nbsp; const pendingCSUpdates = \[];    // Updates for Client Scope Sheets (Green Color)



&nbsp; // --- 4. DATA MINING ---

&nbsp; const allSheets = ss.getSheets();

&nbsp; let erpBgGrid = null; // Lazy load



&nbsp; for (let sheet of allSheets) {

&nbsp;   let sName = sheet.getName().toUpperCase();

&nbsp;   if (!sName.includes(KEYWORD\_SC)) continue;

&nbsp;   if (sheet.getLastRow() < 5) continue; 



&nbsp;   // Header Parsing

&nbsp;   let parts = sheet.getName().split("-");

&nbsp;   let jobNo = parts.length > 1 ? parts\[1].trim() : "";

&nbsp;   let project = parts.length > 2 ? parts.slice(2).join("-").trim() : "";



&nbsp;   // READ SHEET (Values AND Colors)

&nbsp;   let range = sheet.getDataRange();

&nbsp;   let values = range.getValues();

&nbsp;   let backgrounds = range.getBackgrounds(); // Critical for "Green-Skipping"



&nbsp;   // Find Header

&nbsp;   let headerRow = -1;

&nbsp;   for(let r=0; r<Math.min(20, values.length); r++){

&nbsp;      if(String(values\[r]).toUpperCase().includes("PLANT NO")) { headerRow = r; break; }

&nbsp;   }

&nbsp;   if(headerRow === -1) continue;



&nbsp;   // Map Columns

&nbsp;   let h = values\[headerRow].map(String);

&nbsp;   let cPlant = h.findIndex(x => x.toUpperCase().includes("PLANT NO"));

&nbsp;   let cStat = h.findIndex(x => x.toUpperCase().includes("STATUS"));

&nbsp;   let cOn = h.findIndex(x => x.toUpperCase().includes("ON HIRE"));

&nbsp;   let cOff = h.findIndex(x => x.toUpperCase().includes("OFF HIRE"));

&nbsp;   let cDrop = h.findIndex(x => x.toUpperCase().includes("DROP"));      

&nbsp;   let cColl = h.findIndex(x => x.toUpperCase().includes("COLLECTION")); 

&nbsp;   

&nbsp;   if(cPlant === -1 || cStat === -1) continue;



&nbsp;   let sheetHasUpdates = false;



&nbsp;   // PROCESS ROWS

&nbsp;   for(let r = headerRow + 1; r < values.length; r++){

&nbsp;      // OPTIMIZATION: "Green-Skipping"

&nbsp;      // If the row is already green (success color), skip it entirely.

&nbsp;      if (backgrounds\[r]\[0] === COLOR\_SUCCESS) continue; 



&nbsp;      let rawP = String(values\[r]\[cPlant]).trim();

&nbsp;      let stat = String(values\[r]\[cStat]).trim();

&nbsp;      

&nbsp;      if(!rawP || !stat) continue;



&nbsp;      // Parse Plant String (Handles comma separated lists)

&nbsp;      let plants = parsePlantString(rawP);

&nbsp;      let rowIsSuccess = true; // Assume success, mark false if any plant in row fails



&nbsp;      for(let p of plants){

&nbsp;         if (!stockMap.has(p)) {

&nbsp;           // Plant doesn't exist in stock, ignore

&nbsp;           continue; 

&nbsp;         }



&nbsp;         // 1. SESSION CHECK (Priority Rule)

&nbsp;         if (sessionBookedPlants.has(p)) {

&nbsp;            reportLog.blocked.push(`${p} (Duplicate request in ${sName})`);

&nbsp;            rowIsSuccess = false;

&nbsp;            continue; // Skip to next plant

&nbsp;         }



&nbsp;         let start = (cOn > -1 ? values\[r]\[cOn] : "");

&nbsp;         let end = (cOff > -1 ? values\[r]\[cOff] : "");

&nbsp;         let logIn = (cDrop > -1 \&\& values\[r]\[cDrop] instanceof Date) ? values\[r]\[cDrop] : "";

&nbsp;         let logOut = (cColl > -1 \&\& values\[r]\[cColl] instanceof Date) ? values\[r]\[cColl] : "";



&nbsp;         // 2. ERP CHECK (Lazy Load only if needed)

&nbsp;         if (!erpBgGrid) erpBgGrid = ss.getSheetByName(SHEET\_ERP\_NAME).getDataRange().getBackgrounds();



&nbsp;         if (checkMemoryAvailability(p, start, end, logIn, logOut, erpPlantMap, erpDateMap, erpBgGrid)) {

&nbsp;            // SUCCESS: Book it!

&nbsp;            

&nbsp;            // A. Add to Session Lock (Blocks subsequent sheets immediately)

&nbsp;            sessionBookedPlants.add(p);



&nbsp;            // B. Queue Stock Update

&nbsp;            pendingStockUpdates.push({

&nbsp;               row: stockMap.get(p),

&nbsp;               values: \[

&nbsp;                  stat, 

&nbsp;                  jobNo, 

&nbsp;                  "", // Client 

&nbsp;                  project,

&nbsp;                  (start instanceof Date ? start : ""),

&nbsp;                  (end instanceof Date ? end : ""),

&nbsp;                  (logIn instanceof Date ? logIn : ""),

&nbsp;                  (logOut instanceof Date ? logOut : "")

&nbsp;               ]

&nbsp;            });

&nbsp;            

&nbsp;            reportLog.booked.push(`${p} -> ${jobNo}`);



&nbsp;         } else {

&nbsp;            // Failed ERP Check

&nbsp;            reportLog.blocked.push(`${p} (Conflict in ERP)`);

&nbsp;            rowIsSuccess = false;

&nbsp;         }

&nbsp;      }



&nbsp;      // 3. COLOR QUEUE

&nbsp;      // If the row was processed and ALL valid plants in it were booked (or it had valid bookings)

&nbsp;      // We mark this specific row in this specific sheet to turn GREEN.

&nbsp;      if (rowIsSuccess \&\& plants.length > 0) {

&nbsp;         // Paint the whole row green in the memory grid

&nbsp;         for(let c=0; c<backgrounds\[r].length; c++) {

&nbsp;            backgrounds\[r]\[c] = COLOR\_SUCCESS;

&nbsp;         }

&nbsp;         sheetHasUpdates = true;

&nbsp;      }

&nbsp;   }



&nbsp;   // Add this sheet's new background grid to the queue

&nbsp;   if (sheetHasUpdates) {

&nbsp;      pendingCSUpdates.push({

&nbsp;         sheet: sheet,

&nbsp;         bgGrid: backgrounds

&nbsp;      });

&nbsp;   }

&nbsp; }



&nbsp; // --- 5. EXECUTION PHASE (The "Flash" Write) ---

&nbsp; 

&nbsp; // A. Write to Stock Status (Batch)

&nbsp; if (pendingStockUpdates.length > 0) {

&nbsp;    const stockRange = stockSheet.getRange(4, 4, stockLastRow - 3, 8); // D to K

&nbsp;    const stockVals = stockRange.getValues();

&nbsp;    const stockBgs = stockRange.getBackgrounds();



&nbsp;    for(let up of pendingStockUpdates) {

&nbsp;       let idx = up.row - 4;

&nbsp;       if (idx >= 0 \&\& idx < stockVals.length) {

&nbsp;          for(let c=0; c<8; c++) stockVals\[idx]\[c] = up.values\[c];

&nbsp;          stockBgs\[idx]\[0] = "#ffff00"; // Mark Status Yellow

&nbsp;       }

&nbsp;    }

&nbsp;    stockRange.setValues(stockVals);

&nbsp;    stockRange.setBackgrounds(stockBgs);

&nbsp; }



&nbsp; // B. Write to CS Sheets (Visual Feedback - Green Rows)

&nbsp; // This updates the Client Scope sheets to show they are "Done"

&nbsp; for (let update of pendingCSUpdates) {

&nbsp;    update.sheet.getDataRange().setBackgrounds(update.bgGrid);

&nbsp; }



&nbsp; // --- 6. REPORTING \& HANDOFF ---

&nbsp; SpreadsheetApp.flush(); // Force writes before handing off

&nbsp; 

&nbsp; const tEnd = new Date().getTime();

&nbsp; const duration = ((tEnd - tStart) / 1000).toFixed(1);

&nbsp; 

&nbsp; let msg = `✅ Processed in ${duration}s\\n`;

&nbsp; msg += `Booked: ${reportLog.booked.length}\\n`;

&nbsp; msg += `Blocked: ${reportLog.blocked.length}\\n`;

&nbsp; 

&nbsp; if (reportLog.blocked.length > 0) {

&nbsp;   // Optional: Log blocked items to console or alert

&nbsp;   console.log("Blocked Items:", reportLog.blocked);

&nbsp;   msg += "(Check Console for blocked details)";

&nbsp; }



&nbsp; ss.toast(msg, "Sync Complete", 10);



&nbsp; // HANDOFF TO ERP CALENDAR SCRIPT

&nbsp; if (pendingStockUpdates.length > 0) {

&nbsp;    if (typeof processBatchQueue === 'function') {

&nbsp;       ss.toast("Handing off to ERP Calendar...", "Handoff", 3);

&nbsp;       processBatchQueue();

&nbsp;    } else {

&nbsp;       ss.toast("Warning: processBatchQueue function not found.", "Error");

&nbsp;    }

&nbsp; }

}



// --- HELPER FUNCTIONS ---



function checkMemoryAvailability(pNo, start, end, logIn, logOut, erpPlantMap, erpDateMap, erpBgGrid) {

&nbsp; if (!erpPlantMap.has(pNo)) return true; // New item, allow it

&nbsp; if (!(start instanceof Date) || !(end instanceof Date)) return true; 



&nbsp; const erpRowIdx = erpPlantMap.get(pNo);

&nbsp; const sStr = Utilities.formatDate(start, TIMEZONE\_SC, "yyyy-MM-dd");

&nbsp; const eStr = Utilities.formatDate(end, TIMEZONE\_SC, "yyyy-MM-dd");



&nbsp; let startCol = erpDateMap.get(sStr);

&nbsp; let endCol = erpDateMap.get(eStr);



&nbsp; if (startCol === undefined) return true; 

&nbsp; if (endCol === undefined) endCol = erpBgGrid\[0].length - 1;



&nbsp; // Logistics Expansion

&nbsp; if (logIn instanceof Date) {

&nbsp;   let lStr = Utilities.formatDate(logIn, TIMEZONE\_SC, "yyyy-MM-dd");

&nbsp;   let lCol = erpDateMap.get(lStr);

&nbsp;   if (lCol !== undefined \&\& lCol < startCol) startCol = lCol;

&nbsp; }

&nbsp; 

&nbsp; if (logOut instanceof Date) {

&nbsp;   let lStr = Utilities.formatDate(logOut, TIMEZONE\_SC, "yyyy-MM-dd");

&nbsp;   let lCol = erpDateMap.get(lStr);

&nbsp;   if (lCol !== undefined \&\& lCol > endCol) endCol = lCol;

&nbsp; }



&nbsp; // Scan for Conflicts (Any color other than white/transparent)

&nbsp; for (let c = startCol; c <= endCol; c++) {

&nbsp;   let color = (erpBgGrid\[erpRowIdx]\[c] || "#ffffff").toLowerCase();

&nbsp;   if (color !== "#ffffff" \&\& color !== "white" \&\& color !== "#00000000") return false; 

&nbsp; }

&nbsp; return true;

}



function parsePlantString(str) {

&nbsp; if (!str) return \[];

&nbsp; let clean = str.toString().replace(/\['"]+/g, '').replace(/\[\&|]/g, ',');

&nbsp; let parts = clean.split(',');

&nbsp; let results = \[];

&nbsp; let prefix = "";

&nbsp; for (let p of parts) {

&nbsp;   let item = p.trim();

&nbsp;   if (!item) continue;

&nbsp;   if (item.includes('.') || item.length >= 3) {

&nbsp;     results.push(item);

&nbsp;     let dotIdx = item.lastIndexOf('.');

&nbsp;     if (dotIdx > -1) prefix = item.substring(0, dotIdx + 1);

&nbsp;   } else if (prefix \&\& item.length < 4) {

&nbsp;     results.push(prefix + item);

&nbsp;   } else {

&nbsp;     results.push(item);

&nbsp;   }

&nbsp; }

&nbsp; return results;

}

Scopechecker.gs:

/\*\*

&nbsp;\* 🚀 MAIN FUNCTION: CHECK AVAILABILITY (Quantum Speed v2)

&nbsp;\* Architecture: Block Memory Read + Integer Indexing

&nbsp;\*/

function checkStandaloneAvailability() {

&nbsp; const ss = SpreadsheetApp.getActiveSpreadsheet();

&nbsp; const sheet = ss.getActiveSheet();

&nbsp; const ui = SpreadsheetApp.getUi();



&nbsp; // 1. FAST HEADER SCAN (Limit to top 15 rows)

&nbsp; const topData = sheet.getRange(1, 1, 15, sheet.getLastColumn()).getValues();

&nbsp; let headerRowIdx = -1;

&nbsp; let headers = \[];

&nbsp; for (let r = 0; r < topData.length; r++) {

&nbsp;   const rowStr = topData\[r].join(" ").toUpperCase();

&nbsp;   if (rowStr.includes("PLANT NO")) {

&nbsp;     headerRowIdx = r;

&nbsp;     headers = topData\[r].map(h => String(h).toUpperCase().trim());

&nbsp;     break;

&nbsp;   }

&nbsp; }



&nbsp; if (headerRowIdx === -1) { ui.alert("❌ Error: Could not find 'PLANT NO' header row."); return; }



&nbsp; const colMap = {

&nbsp;   plant: headers.indexOf("PLANT NO"),

&nbsp;   drop: headers.indexOf("DROP DATE"),

&nbsp;   collect: headers.indexOf("COLLECTION DATE"),

&nbsp;   onHire: headers.indexOf("ON HIRE"),

&nbsp;   offHire: headers.indexOf("OFF HIRE")

&nbsp; };

&nbsp; if (colMap.plant === -1) { ui.alert("❌ 'PLANT NO' column not found."); return; }



&nbsp; // 2. GET USER SELECTION (Block Read)

&nbsp; const selection = sheet.getActiveRange();

&nbsp; const startRow = selection.getRow();

&nbsp; const numRows = selection.getNumRows();

&nbsp; 

&nbsp; if (startRow <= headerRowIdx + 1) { 

&nbsp;   ui.alert("⚠️ Please select valid data rows (below headers).");

&nbsp;   return; 

&nbsp; }



&nbsp; // OPTIMIZATION: Read ALL columns for the selected rows in ONE operation

&nbsp; // This replaces the slow "read inside loop" method

&nbsp; const fullRowData = sheet.getRange(startRow, 1, numRows, sheet.getLastColumn()).getValues();



&nbsp; // 3. PREPARE REQUESTS

&nbsp; let checkRequests = \[];

&nbsp; const toEpoch = (d) => {

&nbsp;   if (!(d instanceof Date)) return null;

&nbsp;   return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); // Midnight Epoch

&nbsp; };



&nbsp; for (let i = 0; i < numRows; i++) {

&nbsp;   // Read from Memory (Instant)

&nbsp;   let rowValues = fullRowData\[i];

&nbsp;   

&nbsp;   let rawPlantNo = String(rowValues\[colMap.plant]).trim();

&nbsp;   if (!rawPlantNo) continue;



&nbsp;   let sDate = (rowValues\[colMap.drop] instanceof Date) ? rowValues\[colMap.drop] : rowValues\[colMap.onHire];

&nbsp;   let eDate = (rowValues\[colMap.collect] instanceof Date) ? rowValues\[colMap.collect] : rowValues\[colMap.offHire];



&nbsp;   let startEpoch = toEpoch(sDate);

&nbsp;   let endEpoch = toEpoch(eDate);

&nbsp;   if (!startEpoch || !endEpoch) continue;



&nbsp;   let items = rawPlantNo.split(',').map(s => s.trim()).filter(s => s !== "");

&nbsp;   items.forEach(item => {

&nbsp;     checkRequests.push({ id: item, start: startEpoch, end: endEpoch });

&nbsp;   });

&nbsp; }



&nbsp; if (checkRequests.length === 0) { ui.alert("⚠️ No valid Plant Numbers or Dates found in selection."); return; }



&nbsp; // 4. LOAD ERP DATA (Using Cache if available, or fast read)

&nbsp; ss.toast(`Scanning ${checkRequests.length} items...`, "⚡ Rapid Check");

&nbsp; const erpSheet = ss.getSheetByName(SHEET\_ERP);

&nbsp; 

&nbsp; // Use existing cache keys if possible (requires Calendar control.gs to have run once)

&nbsp; // Otherwise, fast read

&nbsp; const erpRange = erpSheet.getDataRange();

&nbsp; const erpValues = erpRange.getValues(); 

&nbsp; const erpBg = erpRange.getBackgrounds();

&nbsp; 

&nbsp; // A. Header Date Indexing (Integer Map)

&nbsp; const headerDates = erpValues\[ERP\_DATE\_ROW - 1];

&nbsp; const dateToColMap = new Map();

&nbsp; const startSearchCol = (typeof ERP\_DATE\_START\_COL !== 'undefined') ? ERP\_DATE\_START\_COL - 1 : 6;

&nbsp; 

&nbsp; for (let c = startSearchCol; c < headerDates.length; c++) {

&nbsp;   if (headerDates\[c] instanceof Date) {

&nbsp;     let d = headerDates\[c];

&nbsp;     let epoch = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

&nbsp;     dateToColMap.set(epoch, c);

&nbsp;   }

&nbsp; }

&nbsp; const maxCol = headerDates.length - 1;



&nbsp; // B. Plant Indexing

&nbsp; const rowMap = new Map(); 

&nbsp; const prefixMap = new Map();

&nbsp; const plantColIdx = (typeof ERP\_PLANT\_COL !== 'undefined') ? ERP\_PLANT\_COL - 1 : 5;



&nbsp; for (let i = 3; i < erpValues.length; i++) {

&nbsp;   let p = String(erpValues\[i]\[plantColIdx]).trim();

&nbsp;   if (p) {

&nbsp;     rowMap.set(p, i);

&nbsp;     let dotIdx = p.lastIndexOf(".");

&nbsp;     if (dotIdx > 0) {

&nbsp;       let prefix = p.substring(0, dotIdx + 1);

&nbsp;       if (!prefixMap.has(prefix)) prefixMap.set(prefix, \[]);

&nbsp;       prefixMap.get(prefix).push(i);

&nbsp;     }

&nbsp;   }

&nbsp; }



&nbsp; // 5. EXECUTE CHECKS

&nbsp; let report = \[];

&nbsp; let conflictCount = 0;

&nbsp; 

&nbsp; checkRequests.forEach(req => {

&nbsp;   let startCol = dateToColMap.get(req.start);

&nbsp;   let endCol = dateToColMap.get(req.end);



&nbsp;   if (startCol === undefined) { 

&nbsp;      report.push(`❌ ${req.id}: Start Date out of range`); conflictCount++; return; 

&nbsp;   }

&nbsp;   if (endCol === undefined) endCol = maxCol; 



&nbsp;   let result = checkItemInstant(req.id, startCol, endCol, rowMap, erpBg);

&nbsp;   

&nbsp;   if (result.available) {

&nbsp;     report.push(`✅ ${req.id}: AVAILABLE`);

&nbsp;   } else {

&nbsp;     conflictCount++;

&nbsp;     let suggestion = findAlternativeInstant(req.id, startCol, endCol, prefixMap, erpValues, erpBg, plantColIdx);

&nbsp;     report.push(`❌ ${req.id}: BOOKED ${suggestion ? "👉 Try: " + suggestion : ""}`);

&nbsp;   }

&nbsp; });



&nbsp; let msg = report.join("\\n");

&nbsp; if (msg.length > 4000) msg = msg.substring(0, 4000) + "\\n... (Report Truncated)";

&nbsp; let summary = (conflictCount === 0) ? "🎉 ALL AVAILABLE" : `⚠️ ${conflictCount} CONFLICTS FOUND`;

&nbsp; 

&nbsp; ui.alert(`🔍 SCOPE CHECKER RESULTS\\n\\n${msg}\\n\\n${summary}`);

}



// Optimized Helper: Removed Date Object dependency inside loop

function checkItemInstant(id, startCol, endCol, rowMap, erpBg) {

&nbsp; if (!rowMap.has(id)) return { available: false };

&nbsp; const r = rowMap.get(id);

&nbsp; const rowColors = erpBg\[r]; 



&nbsp; for (let c = startCol; c <= endCol; c++) {

&nbsp;   let color = rowColors\[c];

&nbsp;   if (color \&\& color !== "#ffffff" \&\& color !== "white") {

&nbsp;      return { available: false };

&nbsp;   }

&nbsp; }

&nbsp; return { available: true };

}



function findAlternativeInstant(badId, startCol, endCol, prefixMap, erpValues, erpBg, plantColIdx) {

&nbsp; let dotIdx = badId.lastIndexOf(".");

&nbsp; if (dotIdx === -1) return "";

&nbsp; let prefix = badId.substring(0, dotIdx + 1);

&nbsp; if (!prefixMap.has(prefix)) return "";

&nbsp; 

&nbsp; let candidates = prefixMap.get(prefix);

&nbsp; for (let i = 0; i < candidates.length; i++) {

&nbsp;   let r = candidates\[i];

&nbsp;   let candidateId = String(erpValues\[r]\[plantColIdx]).trim();

&nbsp;   if (candidateId === badId) continue;

&nbsp;   let isFree = true;

&nbsp;   const rowColors = erpBg\[r];

&nbsp;   for (let c = startCol; c <= endCol; c++) {

&nbsp;     let color = rowColors\[c];

&nbsp;     if (color \&\& color !== "#ffffff" \&\& color !== "white") {

&nbsp;       isFree = false; break;

&nbsp;     }

&nbsp;   }

&nbsp;   if (isFree) return candidateId;

&nbsp; }

&nbsp; return "None";

}

"



