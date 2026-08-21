/**
 * pure.js — pure helpers mirrored from the GAS engine for local Node unit tests.
 * Keep in sync with the GAS copies (40_Ingest.js etc.) — GAS can't require().
 */

function isoToDate_(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  var iso = (typeof v === 'object' && v.iso) ? v.iso : (typeof v === 'string' ? v : null);
  if (!iso) return null;
  var m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3]);
}

function plantMatchesPrefix_(plant, prefix) {
  plant = String(plant).toUpperCase(); prefix = String(prefix).toUpperCase();
  if (prefix === 'FLX.POD') return /^FLX\.(POD|EAWC)/.test(plant);
  return plant.indexOf(prefix) === 0;
}

/** Daily flexiloo status rule (Phase 7): only auto-advance CONFIRM -> JOB COMPLETED. */
function flexiNextStatus_(current, endDate, dismantleDate, today) {
  var cur = String(current || '').toUpperCase().trim();
  if (cur !== 'CONFIRM') return current;            // never touch CANCELLED/PENDING/TBC/etc.
  var past = function (d) { return d instanceof Date && d.getTime() < today.getTime(); };
  if (past(dismantleDate) || past(endDate)) return 'JOB COMPLETED';
  return current;
}

// ---- Ref/thread helpers (mirror of src/03_Refs.js) ----
function normRef_(ref) { return String(ref || '').toUpperCase().replace(/\s+/g, ''); }
function baseRef_(ref) { return normRef_(ref).replace(/R\d+$/, ''); }
function revisionOf_(ref) {
  var m = normRef_(ref).match(/R(\d+)$/);
  return m ? parseInt(m[1], 10) : 0;
}
function refsInText_(text) {
  var out = [], m;
  var re = /ALPS\/SSQTN\/\d{4,5}\/\d{4}(?:\s*R\d+)?|RP-?\s*\d{1,4}\/\d{2,4}(?:\s*R\d+)?/gi;
  var s = String(text || '');
  while ((m = re.exec(s))) out.push(normRef_(m[0]));
  return out;
}
function cellMatchesRef_(cellText, ref) {
  var want = baseRef_(ref);
  if (!want) return false;
  var refs = refsInText_(cellText);
  for (var i = 0; i < refs.length; i++) if (baseRef_(refs[i]) === want) return true;
  return false;
}
var DOC_TIER = { QUOTE: 1, PO: 2, INVOICE: 3, HIRE: 4 };
var TIER_STATE = { QUOTE: 'QUOTE', PO: 'BOOKED', INVOICE: 'BOOKED', HIRE: 'ON HIRE' };
function docRank_(a, b) {
  var ra = revisionOf_(a.ref || ''), rb = revisionOf_(b.ref || '');
  if (ra !== rb) return ra - rb;
  var ma = a.modified ? new Date(a.modified).getTime() : 0;
  var mb = b.modified ? new Date(b.modified).getTime() : 0;
  return ma - mb;
}
function newestDoc_(docs) {
  if (!docs || !docs.length) return null;
  var best = docs[0];
  for (var i = 1; i < docs.length; i++) if (docRank_(docs[i], best) > 0) best = docs[i];
  return best;
}

module.exports = {
  isoToDate_, plantMatchesPrefix_, flexiNextStatus_,
  normRef_, baseRef_, revisionOf_, refsInText_, cellMatchesRef_,
  DOC_TIER, TIER_STATE, docRank_, newestDoc_
};
