/**
 * parser.js — Site Services quote parser (plain JS; portable to Apps Script).
 *
 * Input: the plain text of a quote (from `pdftotext -layout` locally, or from
 * the OCR'd Google Doc in Apps Script). Output: a structured quote object.
 *
 * Handles two templates:
 *   - QUOTATION       (RP-##/YYYY refs)               e.g. Wicked, Arena
 *   - HIRE_QUOTATION  (ALPS/SSQTN/#####/YYYY refs)    e.g. Kiwi ERP quote
 *
 * Flexiloo fixture counting rule (validated against the live allocation sheet):
 * sum the fixture numbers written in the line-item descriptions (e.g. "2WC",
 * "3VA", "2UR"); do NOT multiply by the Qty column.
 */

var MONTHS = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };

/** Parse a date token into {iso, y, m, d} or null. Accepts DD/MM/YYYY and DD-Mon-YYYY. */
function parseDate_(tok) {
  if (!tok) return null;
  tok = String(tok).trim();
  var m = tok.match(/^(\d{1,2})[\/\.](\d{1,2})[\/\.](\d{2,4})$/); // DD/MM/YYYY
  if (m) {
    var d = +m[1], mo = +m[2], y = +m[3]; if (y < 100) y += 2000;
    return mkDate_(y, mo, d);
  }
  m = tok.match(/^(\d{1,2})[\-\s]([A-Za-z]{3,})[\-\s](\d{2,4})$/); // DD-Mon-YYYY
  if (m) {
    var mm = MONTHS[m[2].slice(0,3).toLowerCase()];
    if (mm) { var yy = +m[3]; if (yy < 100) yy += 2000; return mkDate_(yy, mm, +m[1]); }
  }
  return null;
}
function mkDate_(y, m, d) {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  var iso = y + '-' + String(m).padStart(2,'0') + '-' + String(d).padStart(2,'0');
  return { iso: iso, y: y, m: m, d: d };
}

/** Find the first date token anywhere in a string. */
function firstDate_(s) {
  if (!s) return null;
  var m = s.match(/\d{1,2}[\/\.]\d{1,2}[\/\.]\d{2,4}/) || s.match(/\d{1,2}[\-\s][A-Za-z]{3,}[\-\s]\d{2,4}/);
  return m ? parseDate_(m[0]) : null;
}
/** Find all date tokens in a string (as parsed objects). */
function allDates_(s) {
  if (!s) return [];
  var out = [], re = /\d{1,2}[\/\.]\d{1,2}[\/\.]\d{2,4}|\d{1,2}[\-\s][A-Za-z]{3,}[\-\s]\d{2,4}/g, m;
  while ((m = re.exec(s))) { var p = parseDate_(m[0]); if (p) out.push(p); }
  return out;
}

/**
 * Per-line labeled-field extractor. Given the text and a list of label strings,
 * returns {label: value}. Handles the two-column layout where one physical line
 * contains two "Label: value   Label: value" pairs.
 */
function extractLabels_(text, labels) {
  var result = {};
  var lines = text.split('\n');
  // Build a regex that matches any of the labels followed by ':'
  var esc = labels.map(function (l) { return l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); });
  var labelRe = new RegExp('(' + esc.join('|') + ')\\s*:?', 'g');
  lines.forEach(function (line) {
    var hits = [], m;
    labelRe.lastIndex = 0;
    while ((m = labelRe.exec(line))) hits.push({ label: m[1], start: m.index, end: m.index + m[0].length });
    for (var i = 0; i < hits.length; i++) {
      var from = hits[i].end;
      var to = (i + 1 < hits.length) ? hits[i + 1].start : line.length;
      var val = line.slice(from, to).trim().replace(/\s{2,}/g, ' ');
      if (val && result[hits[i].label] == null) result[hits[i].label] = val;
    }
  });
  return result;
}

/** Sum fixture counts for a regex like /(\d+)\s*WC/ across the whole text. */
function sumFixtures_(text, re) {
  var total = 0, m, r = new RegExp(re.source, 'gi');
  while ((m = r.exec(text))) total += parseInt(m[1], 10) || 0;
  return total;
}

/**
 * Count flexiloo fixtures. Quotes come in two shapes:
 *  - Simple/itemized (e.g. Wicked): lines like "Flexiloo Male: 2WC, 3VA & 2UR"
 *    using VA/UR abbreviations and NO package total -> sum every line.
 *  - Package + breakdown (e.g. AMEA HDDC): a summary line spells out
 *    "36 WC, 30 VANITY & 18 URINAL" (+ "Extra ... 8 WC, 19 Vanity, 9 Urinal & 2 POD")
 *    plus an itemized "Flexiloo Set (...)" breakdown. Summing both double-counts.
 * Rule: if any line SPELLS OUT VANITY/URINAL (the summary form), count ONLY those
 * lines; otherwise count the whole text. (Validated: Wicked 18/19/6, Arena
 * 50/54/26, Kiwi 0, AMEA 44/49/27/POD2 — matches the live FLEXILOO sheet.)
 */
function flexiCounts_(text) {
  var lines = text.split('\n');
  var summary = lines.filter(function (l) { return /VANITY|VANITIES|URINAL/i.test(l); });
  var src = summary.length ? summary.join('\n') : text;
  var pod = sumFixtures_(src, /(\d+)\s*PODS?\b/);
  if (!pod) pod = podCount_(text);
  return {
    WC:   sumFixtures_(src, /(\d+)\s*WC\b/),
    VA:   sumFixtures_(src, /(\d+)\s*(?:VA\b|VANITY|VANITIES)/),
    UR:   sumFixtures_(src, /(\d+)\s*(?:UR\b|URINALS?)/),
    SH:   sumFixtures_(src, /(\d+)\s*(?:SH\b|SHOWERS?)/),
    PUMP: (src.match(/PUMP/gi) || []).length,
    POD:  pod
  };
}

/** POD count: sum the Qty on lines mentioning "Flexiloo POD" (best-effort). */
function podCount_(text) {
  var total = 0;
  text.split('\n').forEach(function (line) {
    if (/POD/i.test(line) && /flexiloo|^\s*\d+\s/i.test(line)) {
      // "2x Flexiloo POD ..." or a line-item with a trailing/leading qty
      var mult = line.match(/(\d+)\s*x\s*Flexiloo\s*POD/i);
      var qty  = line.match(/Flexiloo\s*POD[^0-9]*\)\s*(?:AED[\d,\. ]*)?\s+(\d+)\b/i);
      if (mult) total += parseInt(mult[1], 10);
      else if (qty) total += parseInt(qty[1], 10);
      else total += 1;
    }
  });
  return total;
}

/** Extract the quote reference for either template. */
function extractRef_(text) {
  var m = text.match(/ALPS\/SSQTN\/\d{4,5}\/\d{4}(?:R\d+)?/i);
  if (m) return m[0].toUpperCase();
  m = text.match(/RP-?\s*\d{1,4}\/\d{2,4}(?:\s*R\d+)?/i);
  if (m) return m[0].replace(/\s+/g, '').toUpperCase().replace(/R(\d)/, ' R$1').trim();
  return '';
}

/**
 * Compact, de-duplicated equipment summary. Works for `pdftotext -layout`
 * (leading qty + double-space) AND OCR'd-Doc text (reflowed, single-spaced):
 * a line is "equipment" if it matches the column layout OR contains a known
 * equipment keyword (Flexiloo, Tank, Ablution, Cabin, Toilet, Shower, etc.).
 */
var EQUIP_KEYWORDS = /(FLEXILOO|WATER TANK|FRESH WATER|WASTE WATER|ABLUTION|CABIN|LINKABLE|TOILET|SHOWER|URINAL|VANITY|WUDU|DRESSING|CHEMICAL|PORTALOO|GENERATOR|TOWER LIGHT|GOLF (BUGGY|CART)|MULE|CONTAINER)/i;
function equipmentSummary_(text) {
  var items = [], seen = {};
  function add(d) {
    d = String(d).trim().replace(/\s{2,}/g, ' ').replace(/\s*AED[\d,. ]*$/i, '').trim();
    if (d.length > 3 && d.length < 90 && !seen[d.toUpperCase()]) { seen[d.toUpperCase()] = 1; items.push(d); }
  }
  text.split('\n').forEach(function (line) {
    var m = line.match(/^\s*\d+\s{2,}([A-Za-z][^]{3,80}?)\s{2,}/); // -layout column form
    if (m) { add(m[1]); return; }
    var s = line.trim();
    if (EQUIP_KEYWORDS.test(s) && /[A-Za-z]/.test(s) && s.length < 90 &&
        !/CARE OF CLIENT|BUDGETARY|TERMS|CONDITIONS|QUOTATION|AGREEMENT/i.test(s)) {
      add(s.replace(/^\s*\d+[.)]?\s+/, ''));
    }
  });
  return items;
}

/** Main entry. */
function parseQuote(text, filename) {
  text = String(text || '').replace(/\r/g, '');
  var isHire = /HIRE\s+QUOTATION/i.test(text);
  var q = {
    filename: filename || '',
    template: isHire ? 'HIRE_QUOTATION' : 'QUOTATION',
    quoteRef: extractRef_(text),
    quoteDate: null, customerName: '', contactPerson: '', contactDetails: '',
    customerEmail: '', quoter: '', eventName: '', eventLocation: '',
    installDate: null, eventStart: null, eventEnd: null, dismantleDate: null,
    quotationValue: null, flexi: null, isFlexiloo: false, equipment: [],
    warnings: []
  };

  if (!isHire) {
    var L = extractLabels_(text, [
      'Customer Name','Quote Ref','Quote Date','Customer Contact','Al Laith Contact',
      'Al Laith Email','Customer Telephone','Customer Email','Event Name','Event Location',
      'Begin on Site','Event Date','Begin Dismantle'
    ]);
    q.customerName  = L['Customer Name'] || '';
    q.quoteDate     = parseDate_(L['Quote Date']);
    q.contactPerson = L['Customer Contact'] || '';
    q.contactDetails= L['Customer Telephone'] || '';
    q.customerEmail = L['Customer Email'] || '';
    q.quoter        = L['Al Laith Contact'] || '';
    q.eventName     = L['Event Name'] || '';
    q.eventLocation = L['Event Location'] || '';
    q.installDate   = parseDate_(L['Begin on Site']);
    q.dismantleDate = firstDate_(L['Begin Dismantle']);
    var ed = allDates_(L['Event Date'] || '');
    if (ed.length >= 1) q.eventStart = ed[0];
    if (ed.length >= 2) q.eventEnd = ed[ed.length - 1]; else q.eventEnd = q.eventStart;
  } else {
    // HIRE_QUOTATION (ERP) — labels are jumbled by the layout, so use targeted scans.
    var cm = text.match(/Customer\s+([A-Z][^\n]+)/);
    if (cm) {
      var name = cm[1].split(/\s{2,}/)[0].trim(); // drop right-column text after the gap
      var after = text.slice(text.indexOf(cm[0]) + cm[0].length).split('\n');
      var cont = ((after[1] || '').trim().split(/\s{2,}/)[0] || '').trim();
      if (/^[A-Z][A-Z .&\-]+$/.test(cont) && cont.length < 40 &&
          !/ADDRESS|TELEPHONE|EMAIL|ATTENTION|CURRENCY/.test(cont)) name += ' ' + cont;
      q.customerName = name.replace(/\s{2,}/g, ' ');
    }
    var dM = text.match(/Quotation Date\s*:?\s*(\d{1,2}-[A-Za-z]{3}-\d{4})/) ||
             text.match(/(\d{1,2}-[A-Za-z]{3}-\d{4})/);
    q.quoteDate = dM ? parseDate_(dM[1]) : null;
    // Relationship manager / quoter (Al Laith person), best-effort.
    var rm = text.match(/Rubymar[A-Za-z ]*Palle/i);
    if (rm) q.quoter = rm[0].trim();
    // Line-item dates → event start/end (min/max across the table).
    var dts = allDates_(text).filter(function (d) { return d.y >= 2020 && d.y <= 2035; });
    if (dts.length) {
      dts.sort(function (a, b) { return a.iso < b.iso ? -1 : 1; });
      q.eventStart = dts[0]; q.eventEnd = dts[dts.length - 1];
    }
    // Totals: excl-VAT net = Gross + Discount (discount is negative).
    var gross = text.match(/Gross Amount\s*([\d,]+\.\d{2})/);
    var disc  = text.match(/Discount\s*(-?[\d,]+\.\d{2})/);
    if (gross) {
      var g = parseFloat(gross[1].replace(/,/g, ''));
      var dd = disc ? Math.abs(parseFloat(disc[1].replace(/,/g, ''))) : 0;
      q.quotationValue = Math.round((g - dd) * 100) / 100;
    }
    // Event name: a caps line containing " AT ", excluding boilerplate.
    // Take only the first 2+space-delimited chunk to drop right-column leakage.
    text.split('\n').forEach(function (line) {
      var s = line.trim();
      if (!q.eventName && / AT /.test(s) && /^[A-Z0-9]/.test(s) &&
          !/QUOTATION|AGREEMENT|LESSOR|LESSEE|DELIVERY|ACCEPTANCE|EQUIPMENT/.test(s)) {
        var chunk = s.split(/\s{2,}/)[0].trim();
        if (chunk.length > 3 && chunk.length < 80) q.eventName = chunk;
      }
    });
  }

  // Quotation value (QUOTATION template): prefer "Total excl. VAT".
  if (q.quotationValue == null) {
    var ev = text.match(/Total excl\.?\s*VAT\s*([\d,]+\.\d{2})/i) ||
             text.match(/Total\b[^\n]*?([\d,]+\.\d{2})/);
    if (ev) q.quotationValue = parseFloat(ev[1].replace(/,/g, ''));
  }

  q.flexi = flexiCounts_(text);
  q.isFlexiloo = /flexiloo/i.test(text) && (q.flexi.WC + q.flexi.VA + q.flexi.UR + q.flexi.POD) > 0;
  q.equipment = equipmentSummary_(text);

  if (!q.quoteRef) q.warnings.push('no quote ref found');
  if (!q.eventStart) q.warnings.push('no start date found');
  if (!q.customerName) q.warnings.push('no customer name found');
  return q;
}

if (typeof module !== 'undefined' && module.exports) module.exports = { parseQuote: parseQuote };
