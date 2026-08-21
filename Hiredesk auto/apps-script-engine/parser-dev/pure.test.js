const assert = require('assert');
const { isoToDate_, plantMatchesPrefix_, flexiNextStatus_ } = require('./pure');

// --- isoToDate_ (C5) ---
let d = isoToDate_({ iso: '2026-10-12' });
assert(d instanceof Date && d.getFullYear() === 2026 && d.getMonth() === 9 && d.getDate() === 12, 'iso object');
assert(isoToDate_('2026-10-12') instanceof Date, 'iso string');
assert(isoToDate_(null) === null && isoToDate_('garbage') === null && isoToDate_({}) === null, 'null-safe');
const nd = new Date(2026, 0, 5);
assert(isoToDate_(nd) === nd, 'Date passthrough');

// --- plantMatchesPrefix_ (M2) ---
assert(plantMatchesPrefix_('FLX.WC.002', 'FLX.WC') === true, 'WC match');
assert(plantMatchesPrefix_('FLX.WC.002', 'FLX.POD') === false, 'WC !POD');
assert(plantMatchesPrefix_('FLX.POD', 'FLX.POD') === true, 'POD self');
assert(plantMatchesPrefix_('FLX.EAWC.004', 'FLX.POD') === true, 'EAWC counts as POD');
assert(plantMatchesPrefix_('FLX.SHC.001', 'FLX.SHC') === true, 'shower');
assert(plantMatchesPrefix_('FLX.WC.001', 'FLX.VA') === false, 'no cross');

// --- flexiNextStatus_ (Phase 7) ---
const today = new Date(2026, 10, 20); // 2026-11-20
assert(flexiNextStatus_('CONFIRM', new Date(2026, 10, 18), null, today) === 'JOB COMPLETED', 'past end -> completed');
assert(flexiNextStatus_('CONFIRM', new Date(2026, 11, 1), null, today) === 'CONFIRM', 'future end -> stays');
assert(flexiNextStatus_('CANCELLED', new Date(2020, 0, 1), null, today) === 'CANCELLED', 'never touch cancelled');
assert(flexiNextStatus_('PENDING APPROVAL', new Date(2020, 0, 1), null, today) === 'PENDING APPROVAL', 'never touch pending');

console.log('pure.test.js: ALL PASS ✅');
