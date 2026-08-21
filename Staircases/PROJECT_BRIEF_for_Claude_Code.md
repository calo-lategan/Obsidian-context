# Project Brief — Foldable, Modular Staircase ⇄ Ladder (Blender, one-bone rig, fabrication-ready)

**For:** Claude Code (autonomous research + build)
**Working folder:** this folder (`Staircases/`)
**Date:** 2026-06-08
**Engine:** Blender 3.6–4.x, Python (`bpy`), metric units (1 BU = 1 m)

---

## 1. Mission (one sentence)

Research, design and deliver a **parametric, fabrication-ready Blender model** of a steel staircase — built to the AL LAITH "STEEL STEPS" dimensions — where **moving a single bone** folds/unfolds the whole assembly through **flat-pack → staircase → ladder**, the unit is **modular** (splits in two, extends in width/height/length), a **one-piece-per-side handrail detaches and locks** onto the stairs, **every connecting joint, lock and fastener is modeled and mapped** so it can go straight to fabrication, and the whole thing is **textured to look like a real metal staircase** — all wrapped up by a **one-click showcase animation**.

---

## 2. THE TWO HEADLINE REQUIREMENTS — read first

1. **One bone does the fold.** The user grabs/moves **one** control bone and the entire rig animates smoothly flat-pack → staircase → ladder, treads self-leveling, clamps locking at detents.
2. **One button does the demo.** A single **Showcase** button plays the full story: handrails detach & re-attach, the stair slowly folds & unfolds, it splits in two, and a second unit slides in and couples on. (See §9.)

Everything must also be **buildable for real** — model the actual joints/locks and map them (§10).

---

## 3. Start from the existing, validated assets (do NOT start from scratch)

| File | What it is | Use |
|---|---|---|
| `01_DESIGN_PLAN.md` | Engineering + rig plan (mechanism, kinematics, BOM, modular system) | Primary design reference |
| `02_blender_build.py` | **Working** parametric builder, proven in Blender this session (self-leveling parallelogram, `fold_angle` driver, IK handle, detachable handrail) | Starting codebase — extend it |
| `preview_01..04_*.png` | Workbench renders of stair / ladder / flat / no-handrail | Visual baseline |

The mechanism + dimensions below are **already validated numerically and posed correctly in Blender** (Tread 1 at z=0.2 m, Tread 5 at z=1.0 m, treads level at all angles). Treat them as the baseline; research is to refine the **locks, joints, handrail and showcase**, not to reinvent the core motion.

---

## 4. Dimensions & materials (lock to these — from the drawings)

| Item | Value |
|---|---|
| Riser | 200 mm × 5 = 1000 mm rise |
| Going (tread) | 300 mm × 4 = 1200 mm + 600 mm landing |
| Total run / rise | 1800 mm / 1000 mm |
| Width (full unit) | ≈ 2350 mm → **half-unit = 1175 mm** |
| Tread | 3 mm steel checker plate on 50×50×3 L-angle frame — **or aluminium plank / punched grating** (see design tip) |
| Legs / stringer | 50×50×3 SHS (moving members) |
| Control tie-rod | 40×40×3 SHS |
| Handrail | 25×25×3 tube, ~1000 mm high |
| Handrail socket | 31×31×3 bent profile |

> **Design tip — treads (strength-to-weight):** to maximise strength while minimising weight, use **aluminium plank treads or punched grating**, which give heavy-duty load-bearing support at much lower mass. Lighter treads also make the fold/handling and the modular add-on units easier to move. Make the tread material a **parameter** (`steel_checker` | `alu_plank` | `punched_grating`) and reflect it in the texture (R11) and the BOM (§10).

---

## 5. Functional requirements

- **R1 — One-bone fold (priority).** Moving a single bone drives the whole fold: flat (0°) → stair (33.7°) → ladder (~75°). Backup `fold_angle` slider allowed; the **bone** is the hero control.
- **R2 — Self-leveling + lock.** Treads stay horizontal at every angle and visibly **lock** at the detents.
- **R3 — Foldability.** Three detented states (FLAT / STAIR / LADDER); staircase matches the drawing exactly.
- **R4 — Modularity / split in two.** The 2350 mm unit **splits down the longitudinal centre** (bottom step → top) into two identical **1175 mm** half-units; every step and the whole unit halved in width.
- **R5 — Extendability.** Units attach **side-by-side** (width), **end-to-end / stacked** (rise + run), and chain at the ladder angle into a **long straight ladder**.
- **R6 — Locking clamps.** Over-center toggle clamp + spring detent pawl at each joint; "unfold and it locks"; animate/snap locked at detents.
- **R7 — Handrail = one piece PER SIDE, detach + lock.** **Two** handrail units — left and right — **each a single rigid weldment** (its posts + top rail + tie all one object). Each **disconnects as one unit** and **locks into the tread sockets** (spigot into socket + locking pin/R-clip). Both removable so the stair can fold.
- **R8 — Showcase button.** One UI button → the full demo animation (§9).
- **R9 — Fabrication-ready joints.** Model **every** joint/lock/fastener and **map them** in a connection schedule so it is genuinely buildable (§10).
- **R10 — Riggable + parametric.** Clean topology, tidy named armature, one parameter block rebuilds mesh + rig.
- **R11 — Realistic metal textures.** Apply PBR materials so it reads as a **real metal staircase**: galvanised/brushed steel on the frame and legs, raised **checker-plate** treads (normal/height from the 5-bar pattern — not flat), painted/powder-coated handrail, darker oxide/zinc hardware for pins, clamps and locks, with correct metallic/roughness, slight edge wear, and a proper render engine + lighting. Texture the **treads to match the chosen deck material** — steel checker plate, **aluminium plank**, or **punched grating** (use an alpha/cutout map for the grating holes + real plate thickness).

---

## 6. Validated mechanism baseline (refine, don't replace)

Self-leveling **parallelogram**, **single DOF** = leg angle θ:

```
L (leg length)  = √(going² + riser²) = √(300² + 200²) = 360.56 mm
per-step offset = (L·cosθ , L·sinθ)
FLAT   θ = 0°     → treads coplanar (flat slab)
STAIR  θ = 33.69° → rise/step 200, run/step 300   (matches drawing)
LADDER θ = 75°    → rung pitch ≈ 348 mm (≤ OSHA 356)
```

Synchronise all cells with a continuous **control tie-rod** → exactly 1 DOF → one bone moves everything.

---

## 7. Research tasks (gather ideas, then commit)

1. **Self-leveling treads** — accommodation-ladder / gangway parallelogram tie-rod linkages.
2. **Stair⇄ladder articulation + detents** — Little Giant multi-position articulating hinge; spring pawl detents.
3. **Locking clamps** — over-center toggle latches + safety catch.
4. **Modular coupling** — ringlock/scaffold stair towers, splice plates, snap-fit; quick-release centre couplers for the split.
5. **Detachable guardrail** — scaffold guardrail quick-clamps, drop-in spigot + R-clip/locking-pin systems.
6. **Compact-pack alternative** — deployable scissor/pantograph foldable-stair kinematics (note as option).
7. **Blender rigging** — driving many bones from ONE bone (drivers off a bone transform), IK, Copy-Rotation (World) self-leveling, **Action/NLA** for the showcase, Geometry Nodes for modular instancing, and operator/panel registration for the button.
8. **Tread decking (strength-to-weight)** — aluminium plank tread vs punched/perforated grating: load ratings, span tables, mass, slip resistance; pick the lightest section that carries the load (the user's design tip — prefer these over solid plate where possible).

Starter sources (verified this session):
- Self-leveling accommodation ladder: https://en.hiseamarine.com/products/self-leveling-tread-accommodation-ladder.html
- Little Giant articulating hinge patent: https://patents.google.com/patent/US4566150A/en
- Over-center toggle latch: https://www.goebelfasteners.com/a-guide-to-over-center-toggle-latches/
- Modular scaffold stair towers: https://www.scafom-rux.com/en/solutions/modular-scaffolds/ringscaff-modular-stair-towers
- Foldable-stair (scissor) kinematics, ASME: https://asmedigitalcollection.asme.org/mechanismsrobotics/article-abstract/4/1/014502/468363
- Blender IK: https://docs.blender.org/manual/en/latest/animation/constraints/tracking/ik_solver.html
- Blender Copy-Rotation: https://docs.blender.org/manual/en/latest/animation/constraints/transform/copy_rotation.html
- Four-bar IK in Blender: https://xed.ch/blog/2021/1022.html

---

## 8. Blender implementation requirements

- **One-bone control:** a single bone `Fold_Handle`; a driver maps its transform (local Z or rotation) → `fold_angle` so moving that one bone folds the rig. Expose `fold_angle` (0–90) as backup.
- **Self-leveling:** every tread bone gets `COPY_ROTATION` (World, Replace) targeting a never-rotating `Base` bone.
- **Clamps:** clamp bones/geo with drivers that snap to a "locked" pose within ±a few degrees of each detent (0 / 33.7 / 75).
- **Modularity:** parametric `units_side`, `units_stack`, `split_in_two` (build one 1175 half); a `split_amount` property animates the two halves apart; centre couplers visible on the full unit.
- **Handrail (one piece per side):** two objects `Handrail_L` / `Handrail_R`, each on its own bone (`HRctrl_L/R`, child of `Base`, does NOT fold with the stair). A `handrail_attached_L/R` property drives each from locked-in-sockets (down) to detached (lifted/swung clear along an arc). Spigots drop into tread sockets; a lock pin/R-clip engages when seated.
- **Showcase operator:** register `stair.showcase` in a custom N-panel tab **"Folding Stair"**; it plays a baked **NLA** sequence (§9) and can export a playblast. All motion keyed off the single `Fold_Handle` bone + the attach/split/extend properties so it is reproducible.
- **Materials & texturing (real metal look):** author PBR materials (EEVEE Next / Cycles) — (1) **galvanised steel** for stringers/legs/clamps (metallic ≈ 1, roughness 0.35–0.5, subtle spangle/anisotropy), (2) **treads per chosen deck** — steel checker plate (tiled 5-bar normal/height), **aluminium plank**, or **punched grating** (alpha-cutout holes + real thickness); model or bake the pattern, never leave flat — (3) **powder-coat paint** for the handrail (e.g. safety yellow or galv), (4) **dark oxide / zinc** for pins, R-clips, sockets and lock hardware. Add edge-wear / scratch masks and a grippy tread roughness. Provide a clean studio / HDRI lighting setup with shadows; UV-unwrap where needed; keep materials named and parametric.
- **Output:** a regenerator `.py` **and** a saved `.blend`; metric units; one named collection per subsystem (`Stringer`, `Treads`, `Clamps`, `Handrail_L/R`, `Joints`, `Unit_2`).

---

## 9. Showcase animation (the button)

A single click on **Showcase** plays one continuous, **slowly-paced** sequence (target ~40–60 s, ~24–30 fps) with a gentle camera orbit, then optionally writes a playblast/MP4 + key PNG frames to the folder, **rendered with the metal materials and proper lighting (EEVEE Next / Cycles), not flat Workbench**. Suggested shot list (tune the framing):

| # | Beat | What animates | Driver |
|---|---|---|---|
| 1 | Handrails off | `Handrail_L` then `Handrail_R` unlock, lift out of sockets, swing clear | `handrail_attached_L/R`: 1→0 |
| 2 | Handrails on | both swing back, drop into sockets, lock pins engage | `handrail_attached_L/R`: 0→1 |
| 3 | Fold closed | stair **slowly folds** down to flat-pack | `Fold_Handle` → `fold_angle` 33.7→0 |
| 4 | Unfold | flat → staircase → continue up to **ladder** → back to staircase | `fold_angle` 0→33.7→75→33.7 |
| 5 | Split | the two **1175 mm halves separate** down the centre, then rejoin | `split_amount` 0→1→0 |
| 6 | Extend | a **second unit slides in and couples on** (side-by-side for width, or stacked for height) | `units_side`/`units_stack` reveal + slide-in keys |

Requirements: clamps snap-lock visibly at each detent during the fold; handrail lock pins visibly seat/withdraw; everything is keyframed (NLA strips, one per beat) so the user can re-play, scrub, or re-render. Provide a second "Reset" button.

---

## 10. Fabrication-ready joints & connection map (go straight to fab)

Model the **real hardware** at every connection — not just visual stand-ins — with mating geometry that actually fits, and document it so a fabricator can build and join it.

**Joints to model (with sizes — refine in research):**

| Joint | Type | Members | Fastener / detail |
|---|---|---|---|
| Parallelogram leg pivot (×each cell, both sides) | Hinge pin | leg ↔ tread lug | Ø16 pin (8.8) + bush, circlip |
| Control tie-rod pin | Hinge pin | tie-rod ↔ leg | Ø12 pin + bush |
| Tread-to-leg lug | Weld + pin | lug plate ↔ tread frame | 6 mm fillet weld; Ø12 pin to leg |
| Over-center clamp | Bolt + pin | clamp body ↔ stringer | M10 bolts; lever pivot pin |
| Detent pawl | Spring + pin | pawl ↔ leg | Ø8 pin + torsion spring |
| Base pivot | Hinge pin | stringer ↔ ground frame | Ø16 pin |
| Centre-split coupler (×3–4) | Quick pin | half ↔ half | clevis + Ø16 R-clip pin |
| Side coupler (width) | Ring/clevis pin | unit ↔ unit | Ø16 pin |
| End coupler (stack) | Splice + bolt | base ↔ landing of next | splice plate + 4× M16 |
| Handrail spigot → socket | Drop-in + lock | handrail post ↔ tread socket | 31×31 spigot in 31×31 socket + Ø10 R-clip |
| Tread frame corners / socket-to-tread | Weld | L-angle ↔ plate | fillet welds |

**Deliverables that make it fabrication-ready:**
- **Connection schedule** (`joint_schedule.csv`): columns = `Joint_ID, Location(xyz), Type(weld/bolt/pin/clamp/socket), Members_Joined, Fastener_Size, DOF(fixed/hinge), Qty, Notes`.
- **Joint markers:** every joint an Empty named `JNT_<id>` placed at its real location, so each is selectable and traceable to the schedule.
- **BOM** (`bom.csv`): every member + fastener with section, length, and **quantity per full unit and per 1175 half**.
- **Exploded view** generation (a script/parameter that offsets parts along assembly vectors) + an exploded render.
- **Tolerances/clearances:** pin holes Ø+0.5 mm; spigot/socket ~1 mm clearance; document weld sizes. Mating holes/spigots must **align** in the model (verify with an assert pass).
- Optional: weld-symbol callouts, and a per-part naming convention (`<subsystem>_<part>_<n>`).

---

## 11. Definition of done (acceptance tests — make them assertable)

- [ ] Moving **one** bone sweeps FLAT→STAIR→LADDER; treads' normal stays +Z (assert) across the range.
- [ ] STAIR matches drawing: tread tops 200/400/600/800/1000 mm; run 1800; rise 1000 (assert positions).
- [ ] LADDER ≈ 75°, rung pitch ≤ 356 mm.
- [ ] `split_in_two` yields two identical 1175 mm halves; `units_side/stack` extend width/rise+run; chain → straight ladder.
- [ ] **Two** handrails (L + R), each a **single object**; each detaches and locks into sockets; stair folds only with both removed.
- [ ] Clamps visibly lock at the three detents.
- [ ] **Showcase button** plays the full sequence (handrail off/on → fold/unfold → split → second unit coupling) in one click, slowly paced, with a camera move.
- [ ] **Every joint modeled + mapped:** `joint_schedule.csv` + `bom.csv` export; `JNT_*` markers present; mating holes/spigots align within tolerance; exploded view renders. Fabrication-ready.
- [ ] **Realistic metal materials applied** (galv steel frame, checker-plate treads with a real raised pattern, painted handrail, dark hardware); a beauty render in EEVEE/Cycles reads convincingly as a real metal staircase.

---

## 12. Gotchas discovered this session (save hours)

- **Scripted drivers are inert** unless `bpy.context.preferences.filepaths.use_scripts_auto_execute = True` — otherwise the whole rig renders **flat** even though bones pose correctly.
- **Bind rigidly** via a vertex group whose **name == bone name** + an `ARMATURE` modifier. **Avoid** `bpy.ops.object.join` / `select_all` in headless/MCP contexts — accumulate geometry into one mesh instead.
- **Fold sign:** `Stringer.rotation_euler.x = +radians(fold_angle)` lifts **up**; negative folds below ground.
- **Mode switches:** enter armature EDIT/POSE via `bpy.ops.object.mode_set` inside a **VIEW_3D `temp_override`**.
- **Render to a known path:** the MCP `render_*_to_path` tools write to an internal temp dir; set `scene.render.filepath` and call `bpy.ops.render.render(write_still=True)` to control output.
- **Viewport screenshots can be stale** — force `bpy.ops.wm.redraw_timer(type='DRAW_WIN_SWAP', iterations=1)` (VIEW_3D override), or judge from renders.

---

## 13. Milestones

1. Research note (mechanism + lock + handrail + modular options chosen).
2. Rig design doc (bone map, one-bone driver scheme, constraint list).
3. Base unit: one-bone fold flat↔stair↔ladder with self-leveling + clamp snap.
4. Modularity: split-in-two + side/stack extension (+ long-ladder chain).
5. One-piece handrail **per side**: detach + socket lock.
6. **Fabrication detailing:** model every joint/lock/fastener + `joint_schedule.csv` + `bom.csv` + exploded view (§10).
7. **Materials & texturing:** PBR metal look (galv steel, checker plate, painted rail, dark hardware) + studio/HDRI lighting (§8, R11).
8. **Showcase button:** baked NLA sequence + camera + playblast, rendered with the materials (§9).
9. Deliver: final `.blend`, regenerator `.py`, fabrication pack (joint map, BOM, exploded render), README, textured showcase animation.

---

## 14. Constraints & notes

- Keep it **buildable** (real sections + real pin/clamp/lock/coupler hardware) **and** cleanly riggable.
- Parametric: changing the dimension block rebuilds mesh + rig.
- The user is non-coding and will operate this by **moving one bone** and **pressing the Showcase button** — prioritise those two experiences above all, with a genuinely fabricatable result behind them.
