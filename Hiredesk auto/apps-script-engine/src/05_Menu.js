/**
 * 05_Menu.gs — the single consolidated onOpen menu for the master.
 * Merges the new Site Services engine actions with all the ported legacy menus
 * (Calendar control, Import, Scope Sync, Scope Tools, Job Search, Diagnostics).
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();

  // New engine
  ui.createMenu('⚙ Site Services')
    .addItem('🚀 Setup control tabs', 'setupControlTabs')
    .addItem('🏗️ Build SANDBOX Drive structure', 'buildSandboxDriveStructure')
    .addItem('▶️ Install auto-runs (1-min scan + daily)', 'installTriggers')
    .addItem('⏹️ Remove auto-runs', 'removeTriggers')
    .addSeparator()
    .addItem('🔒 Lock current tab structure (after pruning)', 'lockTabStructure')
    .addItem('🧱 Enforce tab structure (remove strays)', 'enforceTabStructure')
    .addSeparator()
    .addItem('📥 Scan Drive now (manual)', 'scanDriveForQuotes')
    .addItem('🔄 Re-scan everything (clear cache)', 'rescanAll')
    .addItem('🧹 Run data remediation (one-time)', 'remediateData_')
    .addItem('🔁 Refresh ASSET OVERVIEW', 'refreshAssetOverview')
    .addItem('🗓️ Switch season…', 'switchSeasonPrompt')
    .addSeparator()
    .addItem('List tabs', 'listTabs')
    .addItem('Authorize engine', 'authorize')
    .addToUi();

  // Calendar batch ops (from Calendar control)
  ui.createMenu('⚡ BATCH OPERATIONS')
    .addItem('🚀 PROCESS YELLOW BATCH ROWS', 'processBatchQueue')
    .addSeparator()
    .addItem('♻️ Refresh System Cache', 'refreshSystemCache')
    .addItem('🔄 Force Refresh "Today" Status', 'updateDailyStatus')
    .addToUi();

  // Scope sync (CS -> Stock -> ERP)
  ui.createMenu('🔄 SCOPE SYNC')
    .addItem('📥 Sync All "CS" Sheets to Stock', 'syncClientScopes')
    .addToUi();

  // Scope availability tools
  ui.createMenu('🔎 SCOPE TOOLS')
    .addItem('🔍 Check Selected Row Availability', 'checkStandaloneAvailability')
    .addToUi();

  // Import from an old season sheet (multi-year)
  ui.createMenu('🔄 IMPORT DATA')
    .addItem('📅 Import FULL season (ERP calendar + Stock)', 'importFullSeason')
    .addItem('🔁 Re-render imported jobs (finish a long import)', 'rerenderImportedJobs')
    .addSeparator()
    .addItem('Import Stock Status only (old behaviour)', 'importStockStatus')
    .addToUi();

  // Job lookup SPA
  ui.createMenu('⚡ Job Search')
    .addItem('Launch Job Lookup', 'openJobLookupSPA')
    .addToUi();

  // Diagnostics (from DeBug)
  ui.createMenu('🛠️ SYSTEM DIAGNOSTIC')
    .addItem('🏥 Run Full System Health Check', 'runSystemHealthCheck')
    .addItem('🔗 Check Plant ID Mapping & Duplicates', 'checkPlantIDIntegrity')
    .addItem('🕵️ Simulate/Diagnose Selected Row', 'diagnoseSelectedRow')
    .addSeparator()
    .addItem('🧹 Smart Ghost Cleaner (Safe)', 'cleanGhostDataSmart')
    .addItem('🎨 Optimize Formatting Rules', 'runFullSystemOptimization')
    .addItem('♻️ Rebuild System Cache', 'refreshSystemCache')
    .addToUi();

  // Preload job-routing cache for zero-latency lookup UI (best-effort).
  try { buildJobRoutingCache(); } catch (e) { /* simple-trigger limits */ }
}

