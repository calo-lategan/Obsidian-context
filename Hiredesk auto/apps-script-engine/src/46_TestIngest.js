/**
 * 46_TestIngest.gs — exercise the ingestion writers with a known-good parsed
 * quote (the validated Wicked DP World result), with NO PDF/OCR dependency.
 * Run testIngestSample() from the SCRIPT EDITOR only (off the live menu —
 * it writes real rows and paints the ERP for job TEST-60660).
 */

function SAMPLE_WICKED_() {
  return {
    template: 'QUOTATION',
    quoteRef: 'RP-27/2026',
    quoteDate: { iso: '2026-06-18' },
    customerName: 'WICKED TENTS (L.L.C)',
    contactPerson: 'MAUREEN ILAGA',
    contactDetails: '050 423 3730',
    customerEmail: 'maureen@bewicked.me',
    quoter: 'Rubymar Palle',
    eventName: 'DP WORLD INDIA CHAMPIONSHIP 2026 (FLEXILOO)',
    eventLocation: 'NEW DELHI INDIA',
    installDate: { iso: '2026-09-06' },
    eventStart: { iso: '2026-10-12' },
    eventEnd:   { iso: '2026-10-18' },
    dismantleDate: { iso: '2026-10-31' },
    quotationValue: 268395,
    flexi: { WC: 18, VA: 19, UR: 6, SH: 0, PUMP: 0, POD: 0 },
    isFlexiloo: true,
    equipment: ['Flexiloo Male: 2WC, 3VA & 2UR', 'Flexiloo Female: 4WC & 3VA',
                'Fresh Water Tank 1000Gal', 'Waste Water Tank 1000Gal']
  };
}

/** Full document-driven test: Fleetboard + Flexiloo + CS, then paint ERP directly. */
function testIngestSample() {
  var res = ingestQuoteObject(SAMPLE_WICKED_(), '60660', 'WICKED DP WORLD INDIA 2026');
  Logger.log(JSON.stringify(res, null, 2));
  toast_('Ingest done — check UAE 2026 / FLEXILOO / CS tab / ERP LIST.', 6);
  return res;
}
