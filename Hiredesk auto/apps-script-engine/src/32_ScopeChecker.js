/**
 * 🚀 MAIN FUNCTION: CHECK AVAILABILITY (Quantum Speed v2)
 * Architecture: Block Memory Read + Integer Indexing
 */
function checkStandaloneAvailability() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  const ui = SpreadsheetApp.getUi();

  // 1. FAST HEADER SCAN (Limit to top 15 rows)
  const topData = sheet.getRange(1, 1, 15, sheet.getLastColumn()).getValues();
  let headerRowIdx = -1;
  let headers = [];
  for (let r = 0; r < topData.length; r++) {
    const rowStr = topData[r].join(" ").toUpperCase();
    if (rowStr.includes("PLANT NO")) {
      headerRowIdx = r;
      headers = topData[r].map(h => String(h).toUpperCase().trim());
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
  let checkRequests = [];
  const toEpoch = (d) => {
    if (!(d instanceof Date)) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); // Midnight Epoch
  };

  for (let i = 0; i < numRows; i++) {
    // Read from Memory (Instant)
    let rowValues = fullRowData[i];
    
    let rawPlantNo = String(rowValues[colMap.plant]).trim();
    if (!rawPlantNo) continue;

    let sDate = (rowValues[colMap.drop] instanceof Date) ? rowValues[colMap.drop] : rowValues[colMap.onHire];
    let eDate = (rowValues[colMap.collect] instanceof Date) ? rowValues[colMap.collect] : rowValues[colMap.offHire];

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
  const erpSheet = ss.getSheetByName(SHEET_ERP);
  
  // Use existing cache keys if possible (requires Calendar control.gs to have run once)
  // Otherwise, fast read
  const erpRange = erpSheet.getDataRange();
  const erpValues = erpRange.getValues(); 
  const erpBg = erpRange.getBackgrounds();
  
  // A. Header Date Indexing (Integer Map)
  const headerDates = erpValues[ERP_DATE_ROW - 1];
  const dateToColMap = new Map();
  const startSearchCol = (typeof ERP_DATE_START_COL !== 'undefined') ? ERP_DATE_START_COL - 1 : 6;
  
  for (let c = startSearchCol; c < headerDates.length; c++) {
    if (headerDates[c] instanceof Date) {
      let d = headerDates[c];
      let epoch = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      dateToColMap.set(epoch, c);
    }
  }
  const maxCol = headerDates.length - 1;

  // B. Plant Indexing
  const rowMap = new Map(); 
  const prefixMap = new Map();
  const plantColIdx = (typeof ERP_PLANT_COL !== 'undefined') ? ERP_PLANT_COL - 1 : 5;

  for (let i = 3; i < erpValues.length; i++) {
    let p = String(erpValues[i][plantColIdx]).trim();
    if (p) {
      rowMap.set(p, i);
      let dotIdx = p.lastIndexOf(".");
      if (dotIdx > 0) {
        let prefix = p.substring(0, dotIdx + 1);
        if (!prefixMap.has(prefix)) prefixMap.set(prefix, []);
        prefixMap.get(prefix).push(i);
      }
    }
  }

  // 5. EXECUTE CHECKS
  let report = [];
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

  let msg = report.join("\n");
  if (msg.length > 4000) msg = msg.substring(0, 4000) + "\n... (Report Truncated)";
  let summary = (conflictCount === 0) ? "🎉 ALL AVAILABLE" : `⚠️ ${conflictCount} CONFLICTS FOUND`;
  
  ui.alert(`🔍 SCOPE CHECKER RESULTS\n\n${msg}\n\n${summary}`);
}

// Optimized Helper: Removed Date Object dependency inside loop
function checkItemInstant(id, startCol, endCol, rowMap, erpBg) {
  if (!rowMap.has(id)) return { available: false };
  const r = rowMap.get(id);
  const rowColors = erpBg[r]; 

  for (let c = startCol; c <= endCol; c++) {
    let color = rowColors[c];
    if (color && color !== "#ffffff" && color !== "white") {
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
    let r = candidates[i];
    let candidateId = String(erpValues[r][plantColIdx]).trim();
    if (candidateId === badId) continue;
    let isFree = true;
    const rowColors = erpBg[r];
    for (let c = startCol; c <= endCol; c++) {
      let color = rowColors[c];
      if (color && color !== "#ffffff" && color !== "white") {
        isFree = false; break;
      }
    }
    if (isFree) return candidateId;
  }
  return "None";
}