/**
 * 03_Refs.gs — quote-reference normalization and document ranking.
 *
 * A "thread" on a job is identified by the BASE quote ref: revisions share the
 * base. Examples:
 *   RP-050/2025 R1          -> base RP-050/2025,          rev 1
 *   RP-27/2026              -> base RP-27/2026,           rev 0
 *   ALPS/SSQTN/00220/2026R2 -> base ALPS/SSQTN/00220/2026 rev 2
 *
 * Node mirror in parser-dev/pure.js — keep in sync (GAS cannot require()).
 */

/** Normalize a ref for comparison: uppercase, no spaces. */
function normRef_(ref) { return String(ref || '').toUpperCase().replace(/\s+/g, ''); }

/** Strip the revision suffix -> the thread's base ref (normalized). */
function baseRef_(ref) {
  return normRef_(ref).replace(/R\d+$/, '');
}

/** Revision number of a ref (0 when unrevised). */
function revisionOf_(ref) {
  var m = normRef_(ref).match(/R(\d+)$/);
  return m ? parseInt(m[1], 10) : 0;
}

/** Every quote ref found in a text (cells can hold several, e.g. "ALPS/SSQTN/00273/2026 (RP-27/2026)"). */
function refsInText_(text) {
  var out = [], m;
  var re = /ALPS\/SSQTN\/\d{4,5}\/\d{4}(?:\s*R\d+)?|RP-?\s*\d{1,4}\/\d{2,4}(?:\s*R\d+)?/gi;
  var s = String(text || '');
  while ((m = re.exec(s))) out.push(normRef_(m[0]));
  return out;
}

/** True when a cell's text refers to the same thread as `ref` (base-ref compare, any ref in the cell). */
function cellMatchesRef_(cellText, ref) {
  var want = baseRef_(ref);
  if (!want) return false;
  var refs = refsInText_(cellText);
  for (var i = 0; i < refs.length; i++) if (baseRef_(refs[i]) === want) return true;
  return false;
}

/** Document tiers (higher = wins). Invoice is a confirmation tier: outranks PO, still renders BOOKED. */
var DOC_TIER = { QUOTE: 1, PO: 2, INVOICE: 3, HIRE: 4 };
/** The ERP state a tier renders as. */
var TIER_STATE = { QUOTE: 'QUOTE', PO: 'BOOKED', INVOICE: 'BOOKED', HIRE: 'ON HIRE' };

/**
 * Rank two documents of the SAME type within a thread: higher revision wins,
 * modifiedTime is only the tiebreak (re-uploading an old revision must NOT win).
 * Returns >0 when a outranks b.
 */
function docRank_(a, b) {
  var ra = revisionOf_(a.ref || ''), rb = revisionOf_(b.ref || '');
  if (ra !== rb) return ra - rb;
  var ma = a.modified ? new Date(a.modified).getTime() : 0;
  var mb = b.modified ? new Date(b.modified).getTime() : 0;
  return ma - mb;
}

/** Pick the winning (newest-revision) doc from a list; null when empty. */
function newestDoc_(docs) {
  if (!docs || !docs.length) return null;
  var best = docs[0];
  for (var i = 1; i < docs.length; i++) if (docRank_(docs[i], best) > 0) best = docs[i];
  return best;
}
