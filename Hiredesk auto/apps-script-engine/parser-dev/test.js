const fs = require('fs');
const path = require('path');
const { parseQuote } = require('./parser');

const samples = [
  { f: 'samples/wicked.txt', name: 'WICKED TENTS — DP World India (RP-27/2026)', expect: { WC: 18, VA: 19, UR: 6 } },
  { f: 'samples/arena.txt',  name: 'ARENA — F1 (RP-2024/009 R3)', expect: null },
  { f: 'samples/kiwi.txt',   name: 'KIWI — Eid Al Adha (ALPS/SSQTN/00220/2026)', expect: { WC: 0, VA: 0, UR: 0 } },
  { f: 'samples/amea.txt',   name: 'AMEA/ARENA — HDDC EGC (RP-050/2025 R1, package+breakdown)', expect: { WC: 44, VA: 49, UR: 27 } }
];

for (const s of samples) {
  const text = fs.readFileSync(path.join(__dirname, s.f), 'utf8');
  const q = parseQuote(text, s.f);
  console.log('\n==================================================');
  console.log(s.name);
  console.log('==================================================');
  console.log('template     :', q.template);
  console.log('quoteRef     :', q.quoteRef);
  console.log('quoteDate    :', q.quoteDate && q.quoteDate.iso);
  console.log('customerName :', q.customerName);
  console.log('contactPerson:', q.contactPerson);
  console.log('contactDetail:', q.contactDetails);
  console.log('customerEmail:', q.customerEmail);
  console.log('quoter       :', q.quoter);
  console.log('eventName    :', q.eventName);
  console.log('eventLocation:', q.eventLocation);
  console.log('installDate  :', q.installDate && q.installDate.iso);
  console.log('eventStart   :', q.eventStart && q.eventStart.iso);
  console.log('eventEnd     :', q.eventEnd && q.eventEnd.iso);
  console.log('dismantleDate:', q.dismantleDate && q.dismantleDate.iso);
  console.log('quotationVal :', q.quotationValue);
  console.log('isFlexiloo   :', q.isFlexiloo);
  console.log('flexi counts :', JSON.stringify(q.flexi));
  if (s.expect) {
    const ok = q.flexi.WC === s.expect.WC && q.flexi.VA === s.expect.VA && q.flexi.UR === s.expect.UR;
    console.log('FLEXI CHECK  :', ok ? 'PASS ✅' : `FAIL ❌ expected ${JSON.stringify(s.expect)}`);
  }
  console.log('equipment[0..4]:', q.equipment.slice(0, 5));
  console.log('warnings     :', q.warnings);
}
