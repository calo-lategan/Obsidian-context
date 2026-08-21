# Folding Modular Self-Leveling Staircase ⇄ Ladder

A parametric, fabrication-ready Blender model (Blender 5.1, EEVEE Next, metric) of a steel-steps
unit built to the AL LAITH "STEEL STEPS" dimensions, where **moving one bone folds the whole
assembly** flat-pack → staircase → ladder, the unit **splits into two 1175 mm halves**, couples
**modularly** (side-by-side and stacked into a long ladder), carries **two detachable handrails**,
and is finished as a real **black powder-coat 6061-T6 aluminium** staircase.

## The two things you actually do

1. **Fold it with one bone.** Select the armature `STAIR_RIG`, grab the **`Fold_Handle`** bone, and
   move it up/down (local-Y) → the whole rig sweeps **FLAT (0°) → STAIR (33.69°) → LADDER (75°)**.
   Treads stay perfectly level the whole way; the detent pawls snap "locked" at each of the three
   states. (Backup: the `fold_angle` slider / `State` dropdown in the panel.)
2. **Press one button.** In the 3D-View **N-panel → "Folding Stair"** tab, click **▶ SHOWCASE** to
   play the full 54-second story live: handrails off → fold flat → unfold to ladder → split in two →
   a second unit slides in and couples flush (camera zooms to the joint then pulls back) → the two
   halves extend to ladders and stack into one longer ladder → reset. **⟲ RESET** restores the start.

Plus, **click any part** in the panel's Part Browser → it selects, frames in the viewport, and shows
its real fabrication spec (section, length, material, joints).

## How to open

1. Open **`folding_staircase.blend`** in Blender 5.1+.
2. **Enable scripted drivers:** Edit → Preferences → Save & Load → **Auto Run Python Scripts** ON
   (otherwise the fold/level/clamp **drivers don't evaluate and the rig renders flat** — this is the
   one required setting). Re-open the file after enabling.
3. Press `N` in the 3D view → **Folding Stair** tab.

To **rebuild from scratch / re-parametrise:** open `build_staircase.py` in the Scripting tab and Run
(`build_all()` runs on execute), or edit the `PARAMS` block at the top and re-run. One parameter
block drives the mesh, rig, materials, BOM and showcase.

## What's in the box

| File | What |
|---|---|
| `folding_staircase.blend` | The finished, rigged, textured, animated model |
| `build_staircase.py` | The single parametric regenerator (geometry → rig → clamps → handrails → split/modular → materials → fab export → showcase → app) |
| `docs/SPEC_folding_staircase.md` | Full design/engineering spec (+ `docs/lanes/` source research) |
| `docs/fab/bom.csv` | Bill of materials — every member + fastener, section, length, qty per full unit & per 1175 half, aluminium masses |
| `docs/fab/joint_schedule.csv` | Connection schedule — 14 joint types with xyz location formulas, fastener sizes, DOF, tolerances |
| `docs/renders/` | Beauty stills: `final_hero`, `final_exploded`, the `show_*` showcase beats, and the M2–M5 build renders |
| `modules/` | The M5–M8 source modules (materials, showcase, app, fab) before consolidation |

In-scene fabrication aids: **90 `JNT_*` empties** at every joint instance (carry joint id / type /
members / fastener), and an **exploded view** (the panel's Explode slider, or `STAIR_RIG['explode']`).

## Specs (locked)

- Riser 200 × 5 = **1000 mm rise**; going 300 × 4 + 600 landing = **1800 mm run**; width **2350 mm**
  (half = **1175 mm**); leg link **L = 360.56 mm**; ladder rung pitch **348 mm ≤ OSHA 356**.
- Structure **6061-T6 aluminium**, **black powder-coat RAL 9005 over zinc primer**; locking hardware
  **A4 stainless**; **nylon/Delrin isolating bushes** (no bronze — galvanic); handrail top rail wears a
  **rope/WPC thermal-break grip** so it stays hand-safe in the sun. ≈ **145 kg per full unit** (≈72 kg/half).
- Tread deck is a parameter — `tread_material` = **alu_plank** (default) | steel_checker | punched_grating
  (swap live in the panel).

## Acceptance (all pass — `acceptance()` in the script)

One-bone sweep FLAT/STAIR/LADDER ✓ · tread normals stay +Z (1.000) ✓ · stair tops 200/400/600/800/1000 mm ✓ ·
ladder pitch ≤356 ✓ · split → two 1175 halves (0.30 m gap) ✓ · two single-object handrails detach + reseat ✓ ·
clamps lock at the 3 detents ✓.

## Notes / tuning

- **Structural:** 6061-T6 has ~⅓ the stiffness of steel. For the real build, have a structural engineer
  check the moving sections (they may need 60×60 or 5 mm wall) and steel/stainless inserts at the pivots.
  The model uses the drawing's section sizes as-is.
- **Showcase polish:** in the ladder-stack beat the second unit is still on screen; if you want it cleaner,
  retract `unit2_slide` to 0 at the start of NLA strip `09_Ladder_stack`.
- Renders use EEVEE Next + AgX; raise `scene.eevee.taa_render_samples` for final-quality stills.
