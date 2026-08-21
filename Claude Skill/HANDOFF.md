# Workshop Stock — resume point

**Last updated:** 2026-07-31 13:47. Read this first if you are picking the work up cold.

## Where things stand

**devtest is at @138, production is at @98.** Both carry the same feature set; production
additionally has no `?bench=` harness.
Calo asked for the production port on 2026-07-31; see "Production port" below for what carried
across and the one trap that port hit.

Devtest URL:
`https://script.google.com/a/macros/allaith.com/s/AKfycbxKK6wmD9YUU0iq438pWT3x2e0L13m79qQHLpOY5HXWkYAblEsa3TIvxCKdxnPCBHBs/exec`

Deploy command (the deployment id is fixed — always update this one, never create a new one):

```bash
cd "C:/Users/USER/Desktop/Claude Skill/workshop-stock-app-devtest" && npx clasp push -f && npx clasp deploy -i AKfycbxKK6wmD9YUU0iq438pWT3x2e0L13m79qQHLpOY5HXWkYAblEsa3TIvxCKdxnPCBHBs -d "<what changed>"
```

If clasp says `invalid_grant`, the OAuth token expired: run `npx clasp login` (it opens a browser
on Calo's machine and needs him to click through).

## AUDIT STATUS

Three audit passes are done; **26 confirmed bugs found and fixed** (10 of them in the third pass).

  pass 1  84-agent run, died at 23 agents  ->  8 confirmed, fixed (@123)
  pass 2  resumed, died at 48 agents       ->  8 confirmed, fixed (@124)
  pass 3  TARGETED 26-agent run, completed -> 10 confirmed, fixed (@125)

**Do NOT re-run the big 84-agent audit.** It kept dying on session limits and mostly re-verified
settled findings. Pass 3's script is the model: a handful of finders aimed at genuinely untested
ground, one skeptic each, with the already-fixed list pasted into the prompt so nothing is
re-litigated. It found MORE real bugs than either big run.

Pass 3 script (reusable template):
`…/workflows/scripts/targeted-gap-audit-wf_3721f994-340.js`

Areas now audited: people admin, identity refactor, plants/aliases, new-vs-old integration,
money, flow, perf, consistency, client, schema, security.

## Test suites — run these before and after every change

```bash
cd "C:/Users/USER/Desktop/Claude Skill/workshop-stock-tests" && for t in statik.js harness.js harness2.js dngeometry.js matching.js jobonly.js useradmin.js recent5.js; do node $t; done
```

824 assertions across 12 suites, all passing — 547 against the production tree, which is lower only
because `statik.js` iterates files and production ships two fewer.
Run them with `WSC_ROOT=workshop-stock-app node <suite>.js` to check what is actually shipping.

**statik.js now also catches OUT-OF-SCOPE IDENTIFIERS.** This class has bitten three times:
`locationId: loc` where the parameter was `locId` (swallowed by a try/catch, left a field
unwired); `res.canGrantPurge` inside `userEditModal_` which takes only `u` (killed the Edit click
entirely — the button did nothing); and `(t && t.locationId)` in `processDiscard` where `t` was
never declared (a bare undeclared identifier throws ReferenceError even inside a `&&` guard, so
the whole success path died whenever the server omitted locationId).

All three parse fine and all three pass a regex that only checks the text is present — which is
exactly the mistake the assertions made. The checker walks each top-level view function, collects
every binding (params including nested and named functions, multi-declarator `var a = 1, b = 2`,
catch and loop bindings), and flags any `x.` whose `x` is neither local, nor a top-level function
in the bundle, nor a known global. **When an assertion checks that code exists, ask whether it
would also catch that code being wrong.**

**`statik.js` is the one that matters most.** It exists because of a shipped, self-inflicted bug:
code appended to a view file landed AFTER its closing `</script>`, so ~28KB of JavaScript was
served as page markup. Every function in it was undefined, and Settings and Deliveries both threw
ReferenceError for controllers. It passed a full static pass and 275 assertions because the old
checker only extracted what lay BETWEEN `<script>` and `</script>` — the orphaned tail was
literally invisible to it. **Never append to a `.html` view file with `s += …`. Insert before the
closing tag, and run `statik.js` afterwards.**

All seven suites live OUTSIDE both clasp roots so `clasp push` never uploads them. They load the
real source into a node VM with stubbed Google globals and execute it — crypto, escaping,
part-number reservation, JSON sizing, PDF geometry, picker matching, the job-only pipeline, role
resolution, the lockout guards, and schema completeness.

## What was built, newest first

| Schema | What |
|---|---|
| 36 | People admin + User access, both controller-only, both showing PR number and the same three activity totals (requests / stock updates / issues) from ONE shared helper `user_activityCounts_`: per-user full names, PR numbers, controller/gatekeeper toggles, notification switches, request counts (`UserAdminService.js`). Roles resolve registry-first, falling back to the CSV settings, so legacy rows keep working |
| 35 | Prefix type-ahead for plants + token matching for parts (`Js_Autocomplete.html`); client plant references and asset transfer between locations (`PlantService.js`) |
| 34 | Outbound delivery notes, dispatch, customer signing link, return notes (`OutboundService.js`, `Js_Views_Outbound.html`); gatekeeper role |
| 33 | Inbound goods receipt (`DeliveryService.js`, `Js_Views_Deliveries.html`), GRN PDF, one-step "book straight in" |
| — | Job-only requests: a request may now have a job number and NO plant number |

## Things that will bite you if you forget them

- **Positional headers.** `HEADERS[sheet]` order IS the sheet layout. New columns append LAST,
  never insert. `HEADERS[X_ARCHIVE] === HEADERS[X]` is the same array by reference.
- **Never nest `db_withLock_`.** Use the lock-free cores (`catalog_savePartCore_`,
  `cost_logEntryCore_`, `dlv_prevalidate_`, `dlv_applyLines_`) when you already hold it.
- **`google.script.run` drops null-valued keys** (a server `null` arrives as `undefined`) and a
  single `NaN` anywhere breaks serialisation of the whole response.
- **No transactions.** Everything that can fail must be hoisted above the first write.
- **`Part_ID` is not globally unique** — `P-0007` exists at every location and means something
  different at each. This is why the delivery review binds to the delivery's own location and the
  server rejects a mismatched `locationId` echo.
- **Blank `Signature_Status` means SIGNED on tickets but "not requested" on deliveries.**
- **Sheets cell cap is 50,000 characters.**

## Not verified by execution (needs a human on devtest)

Everything requiring the Apps Script runtime or a browser: the script lock under load, Sheets I/O,
Drive uploads, `google.script.run` transport, the photo canvas pipeline, the DOM round trip in the
line editors, the type-ahead's keyboard/mobile behaviour, and Google's HTML→PDF conversion fidelity
for the one-for-one delivery note (the renderer is proven; the conversion is not).

The devtest project also carries a `?bench=` load harness that production does not
(`doGet_bench_`, `BenchmarkRun.js`, `BenchmarkSeed.js`) — use it for the high-load audit Calo asked
for: `?bench=seedLoop&target=requests&upto=1000`, `?bench=run&tier=1k`, `?bench=counts`.

## Production port (done — @87)

`workshop-stock-app/` was at SCHEMA 32 with none of this work. The whole devtest tree was copied
across, **excluding** `BenchmarkRun.js`, `BenchmarkSeed.js` and the `?bench=` hook in `Code.js`
(`doGet_bench_` plus its dispatch line) — the only intentional devtest divergence.

Two things worth knowing before the next port:

1. **The live production script had newer PushService copy than this repo.** Six notification
   strings had been hand-tuned in the Apps Script editor and never came back into source
   (`'⚠ Low stock — …'`, `'Signature needed'`, and four others). A straight copy would have rolled
   production's own wording backwards. They were grafted into BOTH trees, so the repo is now the
   source of truth again. **Always `clasp pull` production into a scratch dir and diff before
   overwriting it** — the local checkout is not proof of what is live.
2. **Test suites take a `WSC_ROOT` env var** so they can be pointed at whatever is about to ship:
   `WSC_ROOT=workshop-stock-app node statik.js`. Run every suite against the production tree, not
   just the devtest copy it was made from.

Production's live deployment id is `AKfycbwqnEDnoWWBuwK0TLo4T1JFPmPVVDBmG0_7G0VzBzRsVnuFX2oJ2wmlmFCl-wL3Seb5sg`
(script `12vgrhCyrMhce-…`). Devtest's is `AKfycbxKK6wmD9YUU0iq438pWT3x2e0L13m79qQHLpOY5HXWkYAblEsa3TIvxCKdxnPCBHBs`.
Never cross them.

**The 32→37 migration has NOT been exercised on production yet.** `ensureSetup_` runs on the first
page load, and that load will create `Deliveries` (32 cols), `Delivery_Notes` (46) and
`Return_Notes` (15), and widen `Known_Users` 5→17, `Plants_List` 4→9, `Stock_Lots` 12→13,
`Notifications` 9→10, `Stock_Adjustments` 8→9. Production's widest sheet today is 20 columns, so a
46-column `syncHeader` write is new ground *for that spreadsheet* — it is the same code devtest ran
through the same bumps, but nobody has opened production since the deploy.

## The attribution bug (SCHEMA 38, prod @88) — read before touching identity anywhere

Calo reported "it says Vincent did 12 issues" when Calo had issued all of them. Four things had
to line up, and they all still exist as hazards elsewhere:

1. `user_identity_` falls back to `SET_KEYS.CONTROLLER_NAME` — ONE shared setting — for any
   controller with no `Full_Name`.
2. `loc_touchKnownUser_` wrote that resolved `user.name` into that person's OWN
   `Known_Users.Name` cell on every bootstrap. So a second controller's row literally read
   "Calo Lategan", and because `Name` is itself a fallback source for `user.name`, it was
   self-perpetuating — their tickets would print someone else's name too.
3. `Issuance_Tickets` stored only `Issued_By`, a display NAME. No email.
4. `user_activityCounts_` reverse-mapped that name through a **last-write-wins** index, so
   whichever row was read last harvested every ticket bearing the shared name.

**The rule this establishes: never use a display name as a key.** If a sheet records who did
something, it records an email. `Issued_By_Email` (SCHEMA 38, appended after `Issued_Lines_JSON`)
is that column for tickets; `Requested_By_Email` and `Adjusted_By` already were.

For rows written before the column existed, the name index is precedence-ordered
(`Full_Name` > `User_Signatures.Display_Name` > auto-captured `Name`), never indexes a name equal
to the shared `CONTROLLER_NAME`, and marks a name claimed by two accounts AMBIGUOUS — attributed
to nobody. Whatever cannot be attributed is returned as `unattributed` and shown as an amber note
on both people screens, because a screen that silently omits 12 issues reads as "nobody did them".

`workshop-stock-tests/attribution.js` runs the real counter against synthetic sheets reproducing
the exact scenario. It also caught a positional-header violation during the fix: `Issued_By_Email`
was first inserted before `Issued_Lines_JSON`, which would have shifted every existing ticket's
per-line data by one column.

## Two things the attribution work taught, worth not re-learning

**A blank identity column is not always a defect.** `api_directIssue` leaves
`Requested_By_Email` blank on purpose for a walk-in — the receiver has no account, which is the
same test `NotificationService` uses to decide there is nobody to notify. The first version of
the "could not be matched to a person" note counted those as mysteries and told the controller to
go and set full names, advice that could never work. Walk-ins are now counted separately and
stated neutrally; only genuinely unresolvable rows get the amber warning. Before flagging missing
data as broken, check whether some writer omits it deliberately.

**Book straight in is gatekeeper-level, prices are not.** `api_directReceipt` now takes
`requireGatekeeper_` — the person at the gate is the one who knows what arrived. The unit-price
field is hidden from a non-controller AND stripped server-side, because hiding an input is not a
permission. Goods land at zero cost and a controller prices them afterwards through the existing
`assetcost_backfillEstimated_` path.

## db_setCellsMany_ — use it for any multi-row write

`db_setCells_` issues one `setValue` RPC per cell. On the plants sheet that is 771 rows x 6
columns = ~4,600 round trips, which blows the 6-minute cap AND holds the script-wide lock for the
whole time, so every other user sees "The system is busy". `db_setCellsMany_(name, idCol,
{id: patch})` reads once, mutates in memory and writes ONE range per touched COLUMN — the RPC
count is the number of columns, not the number of rows. It returns `missing` rather than throwing,
so a caller can validate the entire batch before writing anything.

Both bulk plant endpoints use it. `workshop-stock-tests/bulkplants.js` runs the real writer
against a fake sheet that counts RPCs and asserts 771 rows x 2 columns = 2 `setValues` calls.

**The on-loan trap in bulk scoping:** a loaned asset has its destination in `Locations` and its
real home in `Home_Locations`. Writing a new scope to `Locations` would yank it back mid-loan and
lose the destination, so `api_bulkSetPlantScope` writes to `Home_Locations` for those and reports
the count separately.

## Plant scope is access control — treat it like it

A plant scoped to one yard must be unreachable from another, and that includes a stock controller
with all-location access. All-location access means they may WORK in any yard, not that they may
put a Dubai ablution unit on a Qatar note. `plant_canonical_` / `plant_require_` enforce it and
deliberately contain NO controller exemption; `bulkplants.js` asserts the string `isController`
appears in neither.

Three holes were found and closed at @93:

1. **The client plant cache never expired.** `App.cache.plantsByLocation` was written once and read
   for the rest of the session, and boot pre-seeds the default location into it — so a scope change
   could not reach an open tab at all. `PLANTS_TTL_MS` (60s) now bounds it. "Reload the page" is
   not an acceptable propagation mechanism for an access-control rule.
2. **The outbound delivery note's plant field was a bare `<input>`** — the only plant field in the
   app not going through `wirePlantInput_`, and `OutboundService` never called `plant_require_`.
   Both fixed; the validation is hoisted ABOVE `db_withLock_` so a rejection never holds the lock.
3. **Nothing showed which plants were still unscoped**, so "did my bulk change land?" was
   unanswerable. The plant list has an "only ones assignable everywhere" filter, judging an
   on-loan asset on where it RETURNS to.

### Round 2 (@94) — six more, found by a 54-agent adversarial sweep

The @93 fix was not enough, and one of its own patches was a defect. All six confirmed by two
independent skeptics each, and pinned by `workshop-stock-tests/plantscope.js` (54 assertions, which
EXECUTE the real client functions against a fake api()):

1. `locationId: loc` in the delivery review table — `loc` is undeclared (the parameter is
   `locId`). The ReferenceError was thrown while EVALUATING the argument, so `wirePlantInput_`
   never ran and the catch swallowed it: that field was a bare text box with NO scoping at all.
   **A try/catch around a wiring call hides the wiring never happening.**
2. Outbound captured `locId` as a VALUE and its own "Send from" dropdown had no change listener,
   so switching yards left the previous one's plants both offered and accepted. Plant options must
   be GETTERS — `acAttach_` no-ops on re-wire, so re-calling `wirePlantInput_` cannot fix a stale
   captured value.
3. Both delivery forms had the same missing listener on `#dlv-loc`.
4. `api_getPlants('')` skipped BOTH the access check and the scope filter — the endpoint is
   whitelisted, so `api('api_getPlants')` with no argument returned every plant in every yard.
5. `api_clockIn` stored the typed plant raw, with no validation and no location at all.
6. `ensurePlants_` fired once PER ROW in the delivery table, so an N-line delivery made N
   concurrent fetches that each blanked the live list.

The invariant now: the live list is STAMPED with its location (`App.activePlantsLoc`), every
picker and validator checks that stamp and fails CLOSED, the field is visibly locked while loading,
and `plantCanonicalMap_` no longer falls back to `App.boot.plants` (the default location's list).

When adding any new surface that stores a plant number, call `plant_require_(value, required,
locationId)`. Grep it — the call sites are the complete list of paths that are safe.

## Permanent removal (SCHEMA 40) — the one permission a controller does not get

`Is_Purge_Admin` on Known_Users, resolved by `user_roleFor_`, exposed as `canPurge`, enforced by
`requirePurgeAdmin_`. **Not implied by Is_Controller** — unlike gatekeeper, which is. Only an
existing holder may grant or revoke it, and the last holder cannot strip their own. Seeded from
`SET_KEYS.PURGE_ADMIN_EMAILS` (create-if-missing) so there is a first holder; without one nobody
could ever grant it.

**`user_roleFor_` was a two-way ternary** — controller read `Is_Controller`, EVERYTHING else fell
through to `Is_Gatekeeper`. Adding a third role therefore made the gatekeeper tick grant permanent
deletion while `Is_Purge_Admin` was written but never read. It is now a `USER_ROLE_COLUMNS_` table.
**Add a role to that table or it silently aliases onto gatekeeper.** `purge.js` executes the real
resolver against synthetic rows and would have caught it again.

`PurgeService.js` deletes the part, inventory row, lots, cost entries, asset costs, adjustments,
request lines (live + archive), returns, discards and ERP rows. Calo chose this scope explicitly,
including that old ticket PDFs will stop reconciling; the dialog says so.

**THE SCOPING HAZARD is the reason that file is careful.** `Part_ID` is not globally unique —
P-0007 exists at every location. Sheets carrying `Location_ID` are filtered on part AND location;
the three that do not (Request_Line_Items, Returns, EResource_Bridge) are filtered by membership of
Request_ID / Ticket_ID sets built from THIS location first. Lines also match on `Item_Type`, or a
tool sharing the id string would be swept up. The write phase deletes by the collected row IDs,
never by re-matching Part_ID.

Everything removed is written to `Purged_Records` BEFORE the deletes, so a failure halfway still
leaves an account of what was there.

## Booking straight in is CONTROLLER-only (@97)

It shipped gatekeeper-gated at @120 with a comment arguing the gate is where goods arrive. Calo
reversed that: `api_directReceipt` creates the delivery AND posts it to inventory in one call, so
catalog entries, quantities and unit prices land with nobody reviewing them. A gatekeeper logs what
arrived (`api_submitDelivery`, open to any signed-in user with location access) and a controller
reviews and posts it. That separation is the point.

## The feature switches were only half-enforced

`canDeliveries` / `canOutbound` were checked on just 2 of 19 endpoints — the two list ones. Someone
with a page switched off could still submit, save lines, reject, post, upload photos, or drive the
whole outbound flow from a kept-open tab. All 19 now wrap their role check in
`user_requireFeature_`. `purge.js` enumerates both lists and fails if any endpoint is missing it —
**add new endpoints to those arrays.**

## Stock updates split into stock in / stock out

Computed but NOT rendered — the in/out columns were tried and dropped; only the running total is
shown. The split stays in the payload (`additionCount` / `removalCount`) because it costs one
comparison in a loop that already reads the row. No schema change: `Stock_Adjustments` already
carries `Old_Qty` and `New_Qty`, so direction is derivable. An EQUAL pair is an audit note (api_deleteCostEntry writes one when it deliberately does
not reverse stock) and counts as neither. Issuing and returning move stock through
`inv_changeQty_`, which writes no adjustment row — those show under Issues / Returns instead.

## Deliberately NOT done
- The phantom-stock issue in `api_deleteCostEntry` is CONTAINED (refuse-and-ask), not fixed. The
  real fix is splitting `Qty_Remaining` into separate physical and costing counters across
  `AssetCostService.js` — a deliberate refactor Calo has not asked for.
