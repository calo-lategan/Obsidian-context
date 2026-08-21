/**
 * 11_Structure.gs — tab-structure governance.
 *
 * Contract (per user): the master's CURRENT tabs (after manual pruning) are the
 * only allowed tabs and their positions must stay fixed across rebuilds. The
 * ONLY tabs allowed to grow are "CS -" client-scope tabs. Nothing is ever
 * re-imported from the source workbooks.
 *
 * Workflow:
 *   1. Prune the master to the exact tabs you want.
 *   2. Run lockTabStructure() once  -> snapshots the non-CS tabs + order.
 *   3. enforceTabStructure() (a.k.a. buildMaster) thereafter removes any stray
 *      non-canonical, non-CS tab and restores canonical order. CS tabs are
 *      always kept and ordered after the canonical tabs.
 */

var CANONICAL_PROP = 'CANONICAL_TABS';

/** True for client-scope tabs (template + per-job), which may always be added. */
function isCsTab_(name) { return /^\s*CS\s*-/i.test(String(name)); }

/** The locked canonical (non-CS) tab list, or null if not locked yet. */
function getCanonicalTabs_() {
  var p = PropertiesService.getScriptProperties().getProperty(CANONICAL_PROP);
  return p ? JSON.parse(p) : null;
}

/** Internal/engine tabs (prefixed with "_") are exempt from structure governance. */
function isInternalTab_(name) { return String(name).charAt(0) === '_'; }

/** Snapshot the current non-CS, non-internal tabs (in order) as the canonical structure. */
function lockTabStructure() {
  var ss = masterSS_();
  var nonCs = ss.getSheets().map(function (s) { return s.getName(); })
    .filter(function (n) { return !isCsTab_(n) && !isInternalTab_(n); });
  PropertiesService.getScriptProperties().setProperty(CANONICAL_PROP, JSON.stringify(nonCs));
  ss.toast('Locked ' + nonCs.length + ' canonical tabs: ' + nonCs.join(', '), 'Site Services', 8);
  return { locked: nonCs };
}

/**
 * Enforce the locked structure: delete stray non-canonical non-CS tabs, then
 * restore order (canonical first in locked order, CS tabs after). Never deletes
 * a canonical tab or any CS tab. No-op (with a prompt) if nothing is locked.
 */
function enforceTabStructure() {
  var ss = masterSS_();
  var canon = getCanonicalTabs_();
  if (!canon) {
    ss.toast('No locked structure yet. Run "Lock current tab structure" first.', 'Site Services', 8);
    return { locked: false };
  }
  var deleted = [], kept = [];

  // 1. Remove strays (anything that is neither canonical nor a CS tab).
  ss.getSheets().forEach(function (sh) {
    var n = sh.getName();
    if (isCsTab_(n) || isInternalTab_(n) || canon.indexOf(n) !== -1) { kept.push(n); return; }
    if (ss.getSheets().length > 1) { ss.deleteSheet(sh); deleted.push(n); }
  });

  // 2. Restore order: canonical tabs first (locked order), CS tabs after.
  var csNames = ss.getSheets().map(function (s) { return s.getName(); }).filter(isCsTab_);
  canon.forEach(function (name, i) {
    var sh = ss.getSheetByName(name);
    if (sh) { ss.setActiveSheet(sh); ss.moveActiveSheet(i + 1); }
  });
  csNames.forEach(function (name, i) {
    var sh = ss.getSheetByName(name);
    if (sh) { ss.setActiveSheet(sh); ss.moveActiveSheet(canon.length + 1 + i); }
  });

  ss.toast('Structure enforced. Kept ' + kept.length + ', removed ' + deleted.length + '.', 'Site Services', 6);
  return { locked: true, canonical: canon, kept: kept, deleted: deleted };
}

/**
 * buildMaster() now means "enforce the locked structure" (safe, non-importing).
 * The old destructive source-import lives in bootstrapImportFromSources().
 */
function buildMaster() { return enforceTabStructure(); }
