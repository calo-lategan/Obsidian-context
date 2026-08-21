# Folding Modular Self‑Leveling Staircase ⇄ Ladder
### Design, mechanism & Blender‑simulation plan — to the AL LAITH "STEEL STEPS" dimensions

---

## 0. How this meets your intent (requirement → solution)

| Your requirement | How it is achieved |
|---|---|
| Same dimensions as the drawing | Parametric model locked to 200 riser × 300 going × 5 risers, 1800 run, 1000 rise, ~2350 wide, with the drawing's steel sections. |
| Folds **downwards** to close into a flat pack | One continuous shear of a self‑leveling parallelogram; folding the legs **down to 0°** lays the whole unit into a flat low slab. |
| Folds **open** to become a **ladder** | The *same* shear, driven the other way to **~75°**, stands the unit up into a steep ladder with level rungs. Stairs are the middle state (~34°). |
| Treads **self‑level and lock** | Marine‑accommodation‑ladder parallelogram keeps every tread horizontal at any angle; over‑center clamps + spring detent pawls lock it at FLAT / STAIR / LADDER. |
| **Clamps on joints** that lock when unfolded | Over‑center toggle clamp at each leg pivot snaps past dead‑center and resists the load direction — unfold and it locks; press to release. |
| **Splits in two** down the middle (each step + whole unit halved) | Built as two **1175 mm half‑modules** joined on the longitudinal centre plane by quick‑release couplers; pull the couplers and it separates into two identical half‑stairs. |
| **Modular** — add units for width / height / length | Standardised ring/clevis couplers on all four faces: side‑by‑side for **width**, end‑to‑end (run) for **length/height**, and chained at 75° for a **long straight ladder**. |
| Easy to **simulate with an armature, a bone at each joint, IK** | A Blender armature with a bone at every joint, **self‑leveling treads** via Copy‑Rotation, one `fold_angle` slider (FLAT→STAIR→LADDER) **and** an IK grab‑handle to fold it by hand. |

---

## 1. Source dimensions (from the three drawings)

| Item | Value | Source detail |
|---|---|---|
| Riser height | **200 mm** × 5 = 1000 mm | "5 @ 200 = 1000" elevation |
| Going (tread depth) | **300 mm** × 4 = 1200 mm | "4 @ 300 = 1200" |
| Top platform/landing depth | **600 mm** | plan + elevation |
| Total run (going) | **1800 mm** | 1200 + 600 |
| Total rise | **1000 mm** | 5 × 200 |
| Overall pitch (stair) | **≈ 29° actual / 33.7° per step** | atan(1000/1800) overall; atan(200/300) per cell |
| Overall width | **≈ 2350 mm** (core plate ~2250, inner frame ~1785) | plan views |
| Tread surface | **3 mm checkered plate** | step note |
| Step / support frames | **50 × 50 × 3 mm L‑angle** | frame notes |
| Handrail | **25 × 25 × 3 mm tube**, ~1000 mm high | railing note |
| Handrail socket | **31 × 31 × 3 mm bent profile** | socket note |
| Vertical stiffener / main support | **50 × 50 × 3 mm tube** | support notes |

> The mechanism is parametric — change one block of numbers and the whole rig + mesh rebuilds, so these can be tuned without redrawing anything.

---

## 2. The core idea — one mechanism does all four jobs

Rather than bolt together four separate gadgets (a folder, a stair, a ladder, a coupler), the whole unit is **one repeating self‑leveling parallelogram cell**. A single rotational degree of freedom — the **leg angle θ** — sweeps the unit through every state:

```
   θ = 0°            θ ≈ 34°               θ ≈ 75°
 ┌──────────┐      ┌─┐                        ┌─┐  ladder
 │ flat slab│      │ │ ┌─┐  stair             │ │  (level
 └──────────┘      └─┘ │ │ ┌─┐                ┌─┘   rungs)
  CLOSED / PACK         └─┘ │ │ ┌─┐          ┌─┘
                            └─┘ │ │         ┌─┘
                                └─┘        (steep)
```

This is exactly the kinematic used by **marine accommodation ladders / self‑leveling gangways**, where a parallelogram tie‑rod keeps the steps horizontal as the boat‑to‑dock angle changes ([HiSea Marine](https://en.hiseamarine.com/products/self-leveling-tread-accommodation-ladder.html)), combined with the multi‑position **articulating‑hinge** lock from the Little Giant ladder family, which detents at fixed angles to give A‑frame / extension / staircase configurations ([US4566150A](https://patents.google.com/patent/US4566150A/en), [Little Giant Velocity](https://www.littlegiantladders.com/products/velocity-articulating-ladder)).

**Why this is the right choice for "fold down = flat, fold open = ladder, stairs in the middle":** all three are the two ends and the centre of a *single* motion, the treads never need re‑setting, and it is genuinely buildable in steel.

---

## 3. Kinematics (verified)

Each cell is a four‑bar **parallelogram**: two equal parallel legs of length `L` connect tread *n* to tread *n+1*; because the legs stay parallel, every tread stays parallel to the base — i.e. **horizontal**.

```
L = √(going² + riser²) = √(300² + 200²) = 360.56 mm
per‑step offset = (L·cosθ , L·sinθ)
```

| State | Leg angle θ | Rise / step | Run / step | Total rise | Overall slope | Notes |
|---|---|---|---|---|---|---|
| **FLAT (closed)** | 0° | 0 mm | 360.6 mm | 0 mm | 0° | Treads coplanar → flat slab ~100 mm thick |
| **STAIR** | 33.69° | 200 mm | 300 mm | 1000 mm | matches drawing | Hits 200/300 exactly |
| **LADDER** | 75° | 348 mm | 93 mm | 1741 mm | 75° | 348 mm rung pitch ≤ OSHA 356 mm |

Synchronisation: a continuous **control tie‑rod** links all legs so they share one angle → **exactly 1 DOF**, so one handle (or one slider) folds the whole unit and it can't "slinky" into a bad shape. Treads self‑level **by construction** — their surface normal stays +Z at every θ. *(Both verified numerically; see §11.)*

---

## 4. The step‑cell — members & joints

One cell (the atomic, repeatable module), per half‑unit width of 1175 mm:

| Part | Section (from drawing family) | Role |
|---|---|---|
| 2 × **Leg** (parallelogram) | 50 × 50 × 3 SHS tube | Sets the angle; carries load to base |
| 1 × **Control tie‑rod** | 40 × 40 × 3 SHS tube | Keeps legs parallel → treads level + synchronises cells |
| 1 × **Tread plate** | 3 mm checker plate on 50×50×3 L‑angle frame | Walking surface (step = 300 deep, top = 600) |
| 2 × **Tread pivot lug** | 8 mm plate gusset | Pins tread to legs (the parallelogram corners) |
| Pins | Ø16 (M16 8.8) main pivots, Ø12 tread links | Hinges |
| 1 × **Over‑center clamp** | toggle + keeper + spring pawl | Locks the cell at a detent |
| Side **couplers** (×4 faces) | ring/clevis + Ø16 quick pin | Modular attachment |

The top cell carries the **600 mm landing plate** (same leg geometry, deeper plate) so every cell's mechanism is **identical** — essential for true modularity.

---

## 5. Locking system — "unfold and it locks"

Two cooperating devices at every joint, taken straight from proven ladder hardware:

1. **Spring detent pawl** (Little Giant style): a spring‑loaded pin rides the leg and **drops into a machined notch** at each preset angle — FLAT 0°, STAIR 33.7°, LADDER 75° (extra notches optional at 55°/90°). This sets the geometry. ([US4566150A](https://patents.google.com/patent/US4566150A/en), [firgelli folding‑ladder mechanism](https://www.firgelliauto.com/blogs/mechanisms/folding-ladder))
2. **Over‑center toggle clamp** ([Goebel guide](https://www.goebelfasteners.com/a-guide-to-over-center-toggle-latches/)): once the pawl seats, the toggle lever is thrown; it passes **dead‑center** so the joint load actually tightens the clamp instead of opening it — the same principle that holds tool‑case latches and machine guards shut. A finger‑pressure safety catch prevents accidental release.

Sequence: *unfold from flat → pawl clicks into the 33.7° stair notch → throw the toggle → rigid, load‑bearing staircase.* Reverse: lift safety catch → release toggle → lift pawl → refold.

---

## 6. Modular system

**Split in two (your centre split).** The full 2350 mm unit is two **1175 mm half‑modules** sharing the longitudinal centre plane (bottom step → top). They are joined by 3–4 **quick‑release centre couplers**. Pull the couplers and you have two identical half‑stairs — every tread and the whole unit halved in width, each still a complete folding stair. ([modular stair patents US10794062 / US9499991](https://patents.google.com/patent/US10794062B2/en); [Scafom‑rux RINGSCAFF stair towers](https://www.scafom-rux.com/en/solutions/modular-scaffolds/ringscaff-modular-stair-towers))

**Add for width.** Side‑face ring couplers let you pin another half/full unit alongside → 1175 → 2350 → 3525 … mm wide.

**Add for height / length.** End couplers at the base and the top landing let one unit's base pin to another's landing → a taller, longer flight (each adds 1000 mm rise / 1800 mm run).

**Long straight ladder.** Chain units end‑to‑end and lock every cell at **75–90°** → one continuous level‑rung ladder of any length.

All couplers are the **same Ø16 ring/clevis interface**, so any face mates with any face.

---

## 7. Handrail (foldable)

25 × 25 × 3 tube stanchions sit in 31 × 31 × 3 sockets on the outer treads. Because the treads self‑level, the stanchions stay **vertical** in both stair and ladder modes; the handrail tube is a parallel link that follows the slope. For flat‑packing the stanchions are pin‑drop removable or fold inboard. (Built behind a flag in the script so you can toggle it.)

---

## 8. Blender rig architecture

| Rig element | What it is | Behaviour |
|---|---|---|
| **Base** bone | Root at the bottom pivot | Never moves (the ground reference) |
| **Stringer** bone | One bone up the incline (length 5·L) | Driven by `fold_angle`; rotating it sweeps FLAT↔STAIR↔LADDER |
| **Joint** bones J0–J5 | A bone **at every pivot** | Carry the clamp geometry; give the articulated feel you asked for |
| **Tread** bones T1–T5 | One per tread | **Copy‑Rotation (World) → stay level** = self‑leveling treads |
| `fold_angle` slider | Custom property 0–90° | The hero control: 0 = flat, 33.7 = stair, 75 = ladder. Keyframe it to animate the whole transform |
| **Handle** (IK target) | Empty/bone at the top | Set IK influence = 1, then **grab and drag** to fold by hand (IK), exactly as you described |
| **Clamp** drivers | Small lever meshes on J0–J5 | Snap to "locked" near each detent angle as a visual lock indicator |

Self‑leveling uses the standard Blender **Copy‑Rotation constraint in World space** ([Blender manual](https://docs.blender.org/manual/en/latest/animation/constraints/transform/copy_rotation.html)); the grab‑fold uses the **IK solver** ([Blender IK manual](https://docs.blender.org/manual/en/latest/animation/constraints/tracking/ik_solver.html), four‑bar IK technique [xed.ch](https://xed.ch/blog/2021/1022.html)).

---

## 9. How to simulate (once you run the script)

1. Open Blender (3.6–4.x) → **Scripting** tab → Open `02_blender_build.py` → **Run** (▶). The rigged unit appears in STAIR state.
2. Select the **armature** → in the sidebar (`N`) find the **`fold_angle`** custom property.
3. Drag it **0 → flat pack**, **33.7 → staircase**, **75 → ladder**. Keyframe at a few values to animate the fold.
4. To fold by hand: select the **Handle** bone, set its **IK influence to 1**, grab (`G`) and drag.
5. Modular demos: re‑run with `split_in_two=True` (one half), `units_side=2` (wider), or `units_stack=1` (taller).

---

## 10. Fold‑state reference

| | FLAT (pack) | STAIR | LADDER |
|---|---|---|---|
| `fold_angle` | 0° | 33.7° | 75° |
| Height | ~0.1 m | 1.0 m | 1.74 m |
| Footprint length | ~2.1 m | 1.8 m | 0.47 m |
| Use | transport / store | walk up | climb |
| Treads | level, coplanar | level steps | level rungs |

---

## 11. Verification results

- Stair state reproduces the drawing **exactly**: step pivots at 300/600/900/1200 mm going, platform top at **1000 mm** rise. ✔
- Ladder rung pitch **348 mm ≤ OSHA 356 mm** maximum. ✔
- Treads horizontal for **all** θ (self‑level by parallelogram). ✔
- **Single** DOF (control tie‑rod synchronised). ✔

---

## 12. Fabrication notes

- Pins Ø16 grade 8.8 at parallelogram corners; bronze/nylon bushes for smooth fold and to take out rattle.
- Legs in 50×50×3 SHS resist twist far better than open L‑angle at the pivots — recommended upgrade over the drawing's L‑angle for the *moving* members; static frames stay as drawn.
- Load path in STAIR/LADDER goes through the seated detent + over‑center clamp, **not** the fold pins — pins see mostly shear.
- Galvanise or hot‑zinc the pivots; treads stay 3 mm checker plate as drawn.

## 13. Tradeoffs & alternative

The self‑leveling parallelogram gives the cleanest *stair⇄ladder* transform and a flat (low‑slab) pack. If you ever need a **cube‑compact** pack (small bundle, not a flat slab), the alternative is a **scissor/pantograph** stair ([ASME foldable‑stair synthesis](https://asmedigitalcollection.asme.org/mechanismsrobotics/article-abstract/4/1/014502/468363)) — more joints, harder to keep treads level and to lock, so it's the second choice given your "self‑level + lock + buildable" priorities.

---

## 14. Sources

- Self‑leveling tread accommodation ladder (parallelogram): https://en.hiseamarine.com/products/self-leveling-tread-accommodation-ladder.html
- Little Giant multi‑position articulating hinge & detent lock: https://patents.google.com/patent/US4566150A/en · https://www.littlegiantladders.com/products/velocity-articulating-ladder
- Folding‑ladder hinge/pawl mechanism: https://www.firgelliauto.com/blogs/mechanisms/folding-ladder
- Over‑center toggle latch principle: https://www.goebelfasteners.com/a-guide-to-over-center-toggle-latches/
- Modular stair systems / scaffold stair towers: https://patents.google.com/patent/US10794062B2/en · https://www.scafom-rux.com/en/solutions/modular-scaffolds/ringscaff-modular-stair-towers
- Deployable / foldable stair kinematics (scissor alternative): https://asmedigitalcollection.asme.org/mechanismsrobotics/article-abstract/4/1/014502/468363
- Blender IK solver: https://docs.blender.org/manual/en/latest/animation/constraints/tracking/ik_solver.html · Four‑bar IK: https://xed.ch/blog/2021/1022.html · Copy‑Rotation (self‑level): https://docs.blender.org/manual/en/latest/animation/constraints/transform/copy_rotation.html
