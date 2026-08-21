const { baseRef_, revisionOf_, refsInText_, cellMatchesRef_, docRank_, newestDoc_ } = require('./pure');

function eq(actual, expected, label) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) { console.error(`FAIL ${label}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`); process.exitCode = 1; }
}

// base + revision
eq(baseRef_('RP-050/2025 R1'), 'RP-050/2025', 'base RP spaced');
eq(revisionOf_('RP-050/2025 R1'), 1, 'rev RP spaced');
eq(baseRef_('RP-27/2026'), 'RP-27/2026', 'base RP unrevised');
eq(revisionOf_('RP-27/2026'), 0, 'rev unrevised');
eq(baseRef_('ALPS/SSQTN/00220/2026R2'), 'ALPS/SSQTN/00220/2026', 'base ALPS glued');
eq(revisionOf_('ALPS/SSQTN/00220/2026R2'), 2, 'rev ALPS glued');
eq(baseRef_('rp-2024/009 r3'), 'RP-2024/009', 'case/space-insensitive');

// multi-ref cells (the real UAE R111 case)
eq(refsInText_('ALPS/SSQTN/00273/2026 (RP-27/2026)'), ['ALPS/SSQTN/00273/2026', 'RP-27/2026'], 'two refs in one cell');
eq(cellMatchesRef_('ALPS/SSQTN/00273/2026 (RP-27/2026)', 'RP-27/2026 R1'), true, 'revised ref matches base in multi-ref cell');
eq(cellMatchesRef_('RP-27/2026', 'RP-27/2026 R2'), true, 'revision matches stored base');
eq(cellMatchesRef_('RP-27/2026 R1', 'RP-27/2026'), true, 'base matches stored revision');
eq(cellMatchesRef_('RP-28/2026', 'RP-27/2026'), false, 'different thread no match');
eq(cellMatchesRef_('', 'RP-27/2026'), false, 'empty cell');

// ranking: revision beats mtime
const r0 = { ref: 'RP-050/2025',    modified: '2026-07-01T00:00:00Z' }; // old rev re-uploaded LATER
const r1 = { ref: 'RP-050/2025 R1', modified: '2026-06-01T00:00:00Z' };
eq(docRank_(r1, r0) > 0, true, 'R1 outranks base despite older mtime');
eq(newestDoc_([r0, r1]).ref, 'RP-050/2025 R1', 'newestDoc picks highest revision');
eq(newestDoc_([]), null, 'newestDoc empty');

// same revision -> mtime tiebreak
const a = { ref: 'RP-1/2026', modified: '2026-01-01T00:00:00Z' };
const b = { ref: 'RP-1/2026', modified: '2026-02-01T00:00:00Z' };
eq(newestDoc_([a, b]).modified, b.modified, 'mtime tiebreak');

if (process.exitCode) { console.error('refs.test.js: FAILURES'); } else { console.log('refs.test.js: ALL PASS ✅'); }
