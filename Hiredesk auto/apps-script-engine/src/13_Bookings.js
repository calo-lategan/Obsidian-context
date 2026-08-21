/**
 * 13_Bookings.gs — the _BOOKINGS hidden sheet: SINGLE SOURCE OF TRUTH for every
 * automated allocation. One row per (jobNo, baseRef, plant).
 *
 * Columns:
 *  A jobNo | B baseRef | C refFull | D revision | E tier (QUOTE|PO|INVOICE|HIRE)
 *  F state (QUOTE|BOOKED|ON HIRE) | G plant | H start | I end | J logIn | K logOut
 *  L label | M client | N project | O updatedAt
 *
 * Everything renders FROM this store (ERP bars, dashboard, availability).
 * ERP cell colours are output only — never read them for logic.
 */

var BOOKINGS_TAB = '_BOOKINGS';
var BK = { JOB:1, BASEREF:2, REF:3, REV:4, TIER:5, STATE:6, PLANT:7, START:8, END:9, LOGIN:10, LOGOUT:11, LABEL:12, CLIENT:13, PROJECT:14, UPDATED:15 };
var BK_HEADERS = ['jobNo','baseRef','refFull','revision','tier','state','plant','start','end','logIn','logOut','label','client','project','updatedAt'];

function bookingsSheet_() {
  var ss = masterSS_();
  var sh = ss.getSheetByName(BOOKINGS_TAB);
  if (!sh) {
    sh = ss.insertSheet(BOOKINGS_TAB);
    sh.getRange(1, 1, 1, BK_HEADERS.length).setValues([BK_HEADERS]);
    try { sh.hideSheet(); } catch (e) {}
  }
  return sh;
}

/** All booking rows as objects (ONE getValues). */
function bookingsAll_() {
  var sh = bookingsSheet_(), last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, BK_HEADERS.length).getValues().map(function (r) {
    return {
      jobNo: String(r[BK.JOB-1]), baseRef: String(r[BK.BASEREF-1]), refFull: String(r[BK.REF-1]),
      revision: +r[BK.REV-1] || 0, tier: String(r[BK.TIER-1]), state: String(r[BK.STATE-1]),
      plant: String(r[BK.PLANT-1]), start: r[BK.START-1] instanceof Date ? r[BK.START-1] : null,
      end: r[BK.END-1] instanceof Date ? r[BK.END-1] : null,
      logIn: r[BK.LOGIN-1] instanceof Date ? r[BK.LOGIN-1] : null,
      logOut: r[BK.LOGOUT-1] instanceof Date ? r[BK.LOGOUT-1] : null,
      label: String(r[BK.LABEL-1]), client: String(r[BK.CLIENT-1]), project: String(r[BK.PROJECT-1])
    };
  });
}

function bookingsForJob_(jobNo) {
  var J = String(jobNo);
  return bookingsAll_().filter(function (b) { return b.jobNo === J; });
}

/** Locate a thread by any revision of its ref → {jobNo, baseRef, project} or null. */
function bookingsFindThread_(ref) {
  var want = baseRef_(ref); if (!want) return null;
  var all = bookingsAll_();
  for (var i = 0; i < all.length; i++) if (all[i].baseRef === want) return all[i];
  return null;
}

/**
 * Replace ONE thread's rows atomically: delete every row of (jobNo, baseRef),
 * append the new rows. Sibling threads and other jobs untouched.
 * rows: [{plant, start, end, logIn, logOut}] + shared thread fields in `meta`.
 */
function bookingsReplaceThread_(jobNo, ref, meta, rows) {
  var sh = bookingsSheet_(), last = sh.getLastRow();
  var J = String(jobNo), B = baseRef_(ref);
  // Delete old thread rows bottom-up (values-read once).
  if (last >= 2) {
    var vals = sh.getRange(2, 1, last - 1, 2).getValues();
    for (var i = vals.length - 1; i >= 0; i--) {
      if (String(vals[i][0]) === J && String(vals[i][1]) === B) sh.deleteRow(i + 2);
    }
  }
  if (rows && rows.length) {
    var now = new Date();
    var out = rows.map(function (r) {
      return [J, B, normRef_(ref), revisionOf_(ref), meta.tier || 'QUOTE', meta.state || 'QUOTE',
              r.plant || '', r.start || '', r.end || '', r.logIn || '', r.logOut || '',
              meta.label || '', meta.client || '', meta.project || '', now];
    });
    sh.getRange(sh.getLastRow() + 1, 1, out.length, BK_HEADERS.length).setValues(out);
  }
  return { deletedThread: J + '/' + B, inserted: (rows || []).length };
}

/** Update only tier/state/dates of an existing thread (PO/invoice/DN arrival). */
function bookingsSetThreadState_(jobNo, ref, tier, state, dates) {
  var sh = bookingsSheet_(), last = sh.getLastRow();
  if (last < 2) return 0;
  var J = String(jobNo), B = baseRef_(ref);
  var rng = sh.getRange(2, 1, last - 1, BK_HEADERS.length), vals = rng.getValues();
  var n = 0, now = new Date();
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][BK.JOB-1]) === J && String(vals[i][BK.BASEREF-1]) === B) {
      vals[i][BK.TIER-1] = tier; vals[i][BK.STATE-1] = state;
      if (dates && dates.start instanceof Date) vals[i][BK.START-1] = dates.start;
      if (dates && dates.end instanceof Date) vals[i][BK.END-1] = dates.end;
      vals[i][BK.UPDATED-1] = now; n++;
    }
  }
  if (n) rng.setValues(vals);
  return n;
}

/**
 * Availability from STATE (replaces every ERP getBackgrounds() read):
 * plants of `prefix` with NO booking overlapping [start, end].
 * `allPlants` = full plant list (from the ERP plant column via refreshSystemCache).
 */
function bookingsAvailability_(allPlants, prefix, start, end, exceptThreadKey) {
  var busy = {};
  bookingsAll_().forEach(function (b) {
    if (exceptThreadKey && (b.jobNo + '/' + b.baseRef) === exceptThreadKey) return; // re-ingest: own thread doesn't block itself
    if (!b.plant || !(b.start instanceof Date) || !(b.end instanceof Date)) return;
    var s = b.logIn && b.logIn < b.start ? b.logIn : b.start;
    var e = b.logOut && b.logOut > b.end ? b.logOut : b.end;
    if (s <= end && e >= start) busy[b.plant] = true;
  });
  return allPlants.filter(function (p) { return plantMatchesPrefix_(p, prefix) && !busy[p]; });
}

/** One-time migration: seed _BOOKINGS from existing auto-managed CS tabs. */
function rebuildBookingsFromSheets_() {
  var ss = masterSS_(), seeded = 0;
  ss.getSheets().forEach(function (s) {
    if (!/^CS\s*-/i.test(s.getName())) return;
    var id = csIdentity_(s);
    if (!id.jobNo || !id.quoteRef) return;            // only auto-managed CS tabs carry ss_quoteRef
    var last = s.getLastRow(); if (last < CS_DATA_ROW) return;
    var vals = s.getRange(CS_DATA_ROW, 1, last - CS_DATA_ROW + 1, CS_COL.COLLECTION).getValues();
    var rows = [];
    vals.forEach(function (r) {
      var g = r[CS_COL.ONHIRE-1], h = r[CS_COL.OFFHIRE-1], d = r[CS_COL.DROP-1], j = r[CS_COL.COLLECTION-1];
      String(r[CS_COL.PLANT-1] || '').split(',').forEach(function (p) {
        p = p.trim(); if (!p) return;
        rows.push({ plant: p, start: g instanceof Date ? g : null, end: h instanceof Date ? h : null,
                    logIn: d instanceof Date ? d : null, logOut: j instanceof Date ? j : null });
      });
    });
    if (rows.length) {
      bookingsReplaceThread_(id.jobNo, id.quoteRef, {
        tier: 'QUOTE', state: 'QUOTE',
        label: [id.jobNo, id.client, id.project].filter(Boolean).join(' | '),
        client: id.client, project: id.project
      }, rows);
      seeded++;
    }
  });
  notify_('rebuildBookingsFromSheets_: seeded ' + seeded + ' thread(s).');
  return seeded;
}
