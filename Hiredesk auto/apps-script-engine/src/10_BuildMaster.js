/**
 * 10_BuildMaster.gs — Phase 1 (first slice): assemble the combined master file
 * by importing every tab from the three source workbooks verbatim (formatting,
 * formulas, colours, merged cells all preserved via Sheet.copyTo).
 *
 * This produces a single file that "looks exactly the same" as today's three
 * sheets combined. The normalized data model + per-season view regeneration is
 * layered on in later slices.
 *
 * Idempotent: re-running deletes and re-imports same-named tabs.
 */

var BUILD_SOURCES = [
  { id: SRC_STOCK_ID,  label: 'Season Stock' },
  { id: SRC_FLEXI_ID,  label: 'Flexiloo' },
  { id: SRC_QUOTES_ID, label: 'Quotes Fleetboard' }
];

/**
 * Import all tabs from one source workbook into the master.
 * Big tabs (ERP LIST, FLX PLANT NOS) are large but copyTo is a server-side copy.
 * Returns the list of tab names imported from this source.
 */
function importSourceTabs_(master, sourceId) {
  var src = SpreadsheetApp.openById(sourceId);
  var names = [];
  src.getSheets().forEach(function (sh) {
    var name = sh.getName();
    deleteSheetIfExists_(master, name);
    var ns = sh.copyTo(master);
    ns.setName(name);
    names.push(name);
  });
  return names;
}

/**
 * ONE-TIME BOOTSTRAP ONLY. Imports every tab from the three source workbooks.
 * This is intentionally NOT on the menu — re-running it would re-add tabs that
 * were pruned from the master and reorder things. The master is now the source
 * of truth; use lockTabStructure()/enforceTabStructure() instead.
 */
function bootstrapImportFromSources() {
  var master = masterSS_();
  var result = { sources: [], copied: [], errors: [] };

  BUILD_SOURCES.forEach(function (s) {
    try {
      var names = importSourceTabs_(master, s.id);
      result.sources.push({ label: s.label, count: names.length });
      result.copied = result.copied.concat(names);
    } catch (e) {
      result.errors.push({ source: s.label, error: String(e) });
    }
  });

  // Drop the default empty "Sheet1" once real tabs exist.
  deleteSheetIfExists_(master, 'Sheet1');

  result.totalTabs = master.getSheets().length;
  logStatus_('buildMaster done: ' + result.copied.length + ' tabs imported');
  return result;
}

/** List the master's current tabs (verification helper). */
function listTabs() {
  var master = masterSS_();
  return master.getSheets().map(function (sh) {
    return { name: sh.getName(), rows: sh.getMaxRows(), cols: sh.getMaxColumns() };
  });
}
