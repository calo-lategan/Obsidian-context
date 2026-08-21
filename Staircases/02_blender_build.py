"""
================================================================================
FOLDING MODULAR SELF-LEVELING STAIRCASE  <->  LADDER
Parametric builder for Blender (3.6 - 4.x)
================================================================================
Builds, to the AL LAITH "STEEL STEPS" dimensions:
  - a steel mesh (rails, parallelogram legs, control tie-rod, checker-plate
    treads, top landing, over-center clamps, foldable handrail)
  - an ARMATURE with a bone at every joint
  - SELF-LEVELING treads  (Copy-Rotation, World)            <- treads stay level
  - one  fold_angle  slider :  0 = FLAT pack | 33.7 = STAIR | 75 = LADDER
  - an IK "Handle" you can grab to fold it by hand
  - MODULAR replication: split in two, add side-by-side (width), stack (height)

HOW TO RUN
  Blender > Scripting tab > Open > this file > Run (Play).
  Then select the armature, open the N-panel, and drag the  fold_angle  property.
  To fold by hand: select the "Handle" bone, set its IK influence to 1, grab (G).

Everything is driven by ONE degree of freedom (the leg angle theta), exactly as
in a marine self-leveling accommodation ladder. Edit PARAMS below and re-run.
================================================================================
"""

import bpy, math
from mathutils import Vector

MM = 0.001
PARAMS = {
    # ---- geometry from the drawing (mm) ----
    "riser":            200.0,
    "going":            300.0,
    "n_cells":          5,        # 4 steps + 1 top landing cell  (5 risers)
    "step_depth":       300.0,
    "platform_depth":   600.0,
    "width_full":       2350.0,

    # ---- fold states (degrees) ----
    "theta_flat":       0.0,
    "theta_ladder":     75.0,
    "initial_state":    "STAIR",  # FLAT | STAIR | LADDER

    # ---- steel sections (mm) ----
    "rail":             50.0,     # main leg / stringer  (50x50x3 SHS)
    "control_rod":      40.0,     # parallelogram control tie-rod
    "rail_inset":       60.0,     # rail set in from the unit edge
    "ctrl_offset":      120.0,    # perpendicular spacing of the control rod
    "plate_t":          3.0,      # checker plate
    "handrail":         25.0,     # 25x25x3 handrail tube
    "handrail_h":       1000.0,

    # ---- options ----
    "split_in_two":     False,    # True = build ONE 1175 mm half-module only
    "units_side":       1,        # number of units side-by-side (width scaling)
    "units_stack":      0,        # extra units stacked up the run (height scaling)
    "build_handrail":   True,
    "build_clamps":     True,
    "wipe_scene":       False,    # True = delete everything first
}

# ---------------------------------------------------------------- derived ----
def derived(P):
    R, G = P["riser"] * MM, P["going"] * MM
    L = math.hypot(G, R)                       # leg length (pivot to pivot)
    theta_stair = math.degrees(math.atan2(R, G))
    return dict(R=R, G=G, L=L, theta_stair=theta_stair,
                W=P["width_full"] * MM,
                run=(P["n_cells"]) * G, rise=(P["n_cells"]) * R)

# ---------------------------------------------------------------- helpers ----
def box(name, sx, sy, sz, center=(0, 0, 0)):
    """Axis-aligned box mesh object, coordinates baked at `center` (meters)."""
    x, y, z = sx / 2, sy / 2, sz / 2
    cx, cy, cz = center
    v = [(cx - x, cy - y, cz - z), (cx + x, cy - y, cz - z),
         (cx + x, cy + y, cz - z), (cx - x, cy + y, cz - z),
         (cx - x, cy - y, cz + z), (cx + x, cy - y, cz + z),
         (cx + x, cy + y, cz + z), (cx - x, cy + y, cz + z)]
    f = [(0, 1, 2, 3), (4, 5, 6, 7), (0, 1, 5, 4),
         (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    me = bpy.data.meshes.new(name)
    me.from_pydata(v, [], f)
    me.update()
    return bpy.data.objects.new(name, me)


def link(obj, coll):
    coll.objects.link(obj)
    return obj


def join(objs, name, coll):
    """Join a list of box objects into one mesh object."""
    objs = [o for o in objs if o is not None]
    for o in objs:
        link(o, coll)
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    objs[0].name = name
    return objs[0]


def bind(obj, arm, bone):
    """Rigidly weight `obj` to one bone via vertex group + Armature modifier."""
    vg = obj.vertex_groups.new(name=bone)
    vg.add(range(len(obj.data.vertices)), 1.0, "REPLACE")
    m = obj.modifiers.new("Arm", "ARMATURE")
    m.object = arm
    m.use_vertex_groups = True


# ---------------------------------------------------------------- armature ---
def make_armature(P, D, origin, idx):
    R, G, L = D["R"], D["G"], D["L"]
    n, W = P["n_cells"], D["W"]
    ox, oy, oz = origin

    arm_data = bpy.data.armatures.new(f"StairArm_{idx}")
    arm = bpy.data.objects.new(f"FoldingStair_{idx}", arm_data)
    bpy.context.scene.collection.objects.link(arm)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode="EDIT")
    eb = arm_data.edit_bones

    def newbone(name, head, tail, parent=None):
        b = eb.new(name)
        b.head = Vector((head[0] + ox, head[1] + oy, head[2] + oz))
        b.tail = Vector((tail[0] + ox, tail[1] + oy, tail[2] + oz))
        if parent:
            b.parent = parent
            b.use_connect = False
        return b

    base = newbone("Base", (0, 0, 0), (0, 0, 0.2))            # ground reference, +Z
    string = newbone("Stringer", (0, 0, 0), (n * L, 0, 0), base)  # along +X (flat)
    for i in range(n + 1):                                    # a bone at EVERY joint
        newbone(f"Joint_{i}", (i * L, 0, 0), (i * L, 0, 0.12), string)
    for i in range(1, n + 1):                                 # one bone per tread, +Z
        newbone(f"Tread_{i}", (i * L, 0, 0), (i * L, 0, 0.2), string)
    newbone("Handle", (n * L, 0, 0), (n * L, 0, 0.25), base)  # IK grab target

    bpy.ops.object.mode_set(mode="POSE")
    pb = arm.pose.bones

    # --- one DOF: fold_angle slider drives the stringer rotation ---
    theta0 = {"FLAT": P["theta_flat"], "STAIR": D["theta_stair"],
              "LADDER": P["theta_ladder"]}[P["initial_state"]]
    arm["fold_angle"] = float(theta0)
    try:
        ui = arm.id_properties_ui("fold_angle")
        ui.update(min=0.0, max=90.0, soft_min=0.0, soft_max=90.0,
                  description="0=FLAT pack | 33.7=STAIR | 75=LADDER")
    except Exception:
        pass

    pb["Stringer"].rotation_mode = "XYZ"
    fc = arm.driver_add('pose.bones["Stringer"].rotation_euler', 0)
    drv = fc.driver
    drv.type = "SCRIPTED"
    var = drv.variables.new()
    var.name = "fa"
    var.type = "SINGLE_PROP"
    var.targets[0].id = arm
    var.targets[0].data_path = '["fold_angle"]'
    drv.expression = "radians(fa)"   # +local-X lifts +X toward +Z (verified in Blender)

    # --- self-leveling treads: copy Base's (never-rotating) world rotation ---
    for i in range(1, n + 1):
        c = pb[f"Tread_{i}"].constraints.new("COPY_ROTATION")
        c.target = arm
        c.subtarget = "Base"
        c.target_space = "WORLD"
        c.owner_space = "WORLD"
        c.mix_mode = "REPLACE"

    # --- optional IK grab handle (set influence to 1 in the UI to use) ---
    ik = pb["Stringer"].constraints.new("IK")
    ik.target = arm
    ik.subtarget = "Handle"
    ik.chain_count = 1
    ik.influence = 0.0

    bpy.ops.object.mode_set(mode="OBJECT")
    return arm


# ---------------------------------------------------------------- mesh ------
def make_meshes(P, D, origin, idx, half):
    R, G, L = D["R"], D["G"], D["L"]
    n = P["n_cells"]
    rail = P["rail"] * MM
    ctrl = P["control_rod"] * MM
    inset = P["rail_inset"] * MM
    coff = P["ctrl_offset"] * MM
    pt = P["plate_t"] * MM
    ox, oy, oz = origin

    # width: full unit or single half-module
    Wf = D["W"]
    if half:
        y0, y1 = 0.0, Wf / 2.0
    else:
        y0, y1 = 0.0, Wf
    yc = (y0 + y1) / 2.0
    ys = [y0 + inset, y1 - inset]                      # left / right rail lines

    coll = bpy.data.collections.new(f"StairMesh_{idx}")
    bpy.context.scene.collection.children.link(coll)

    def b(name, sx, sy, sz, c):
        return box(name, sx, sy, sz, (c[0] + ox, c[1] + oy, c[2] + oz))

    # ---- rails + control rods (the parallelogram bars) -> Stringer ----
    stringer_parts = []
    for y in ys:
        stringer_parts.append(b("rail", n * L, rail, rail, (n * L / 2, y, 0)))
        stringer_parts.append(b("ctrl", n * L, ctrl, ctrl, (n * L / 2, y, coff)))
    # centre couplers / split interface (only on full unit)
    if not half:
        for xc in (0.0, n * L):
            stringer_parts.append(b("coupler", 0.08, 0.08, 0.08, (xc, yc, 0)))
    # handrail top tube rides the slope -> Stringer
    if P["build_handrail"]:
        hr = P["handrail"] * MM
        for y in (y0, y1):
            stringer_parts.append(
                b("handrail", n * L, hr, hr, (n * L / 2, y, P["handrail_h"] * MM)))
    stringer_obj = join(stringer_parts, f"Stringers_{idx}", coll)

    # ---- treads (checker plate + front frame) -> Tread_i ----
    tread_objs = {}
    for i in range(1, n + 1):
        depth = (P["platform_depth"] if i == n else P["step_depth"]) * MM
        x = i * L
        parts = [b("plate", depth, (y1 - y0), pt, (x, yc, 0.0)),
                 b("frame", 0.05, (y1 - y0), 0.05, (x - depth / 2, yc, -0.03))]
        if P["build_handrail"]:
            hr = P["handrail"] * MM
            for y in (y0 + hr, y1 - hr):
                parts.append(b("stanchion", hr, hr, P["handrail_h"] * MM,
                               (x, y, P["handrail_h"] * MM / 2)))
        tread_objs[i] = join(parts, f"Tread_{idx}_{i}", coll)

    # ---- over-center clamps at every joint -> Joint_i ----
    clamp_objs = {}
    if P["build_clamps"]:
        for i in range(n + 1):
            x = i * L
            parts = []
            for y in ys:
                parts.append(b("clampbase", 0.07, 0.05, 0.05, (x, y, 0)))
                parts.append(b("lever", 0.10, 0.02, 0.02, (x + 0.04, y, 0.04)))
            clamp_objs[i] = join(parts, f"Clamp_{idx}_{i}", coll)

    return stringer_obj, tread_objs, clamp_objs


# ---------------------------------------------------------------- unit -------
def build_unit(P, D, origin, idx):
    half = P["split_in_two"]
    stringer, treads, clamps = make_meshes(P, D, origin, idx, half)
    arm = make_armature(P, D, origin, idx)
    bind(stringer, arm, "Stringer")
    for i, ob in treads.items():
        bind(ob, arm, f"Tread_{i}")
    for i, ob in clamps.items():
        bind(ob, arm, f"Joint_{i}")
    return arm


# ---------------------------------------------------------------- main -------
def main():
    P = PARAMS
    D = derived(P)

    if P["wipe_scene"]:
        bpy.ops.object.select_all(action="SELECT")
        bpy.ops.object.delete()
        for c in list(bpy.data.collections):
            bpy.data.collections.remove(c)

    bpy.context.scene.unit_settings.system = "METRIC"
    if bpy.context.object and bpy.context.object.mode != "OBJECT":
        bpy.ops.object.mode_set(mode="OBJECT")

    Wf = D["W"]
    gap = 0.05
    idx = 0
    # width scaling: units side-by-side in +Y
    for s in range(max(1, P["units_side"])):
        # height/length scaling: units stacked up the run in +X / +Z
        for k in range(P["units_stack"] + 1):
            origin = (k * D["run"], s * (Wf + gap), k * D["rise"])
            build_unit(P, D, origin, idx)
            idx += 1

    print("=" * 60)
    print("Folding modular self-leveling staircase built.")
    print(f"  leg length L      = {D['L']*1000:.1f} mm")
    print(f"  stair angle       = {D['theta_stair']:.2f} deg")
    print(f"  units built       = {idx}")
    print(f"  initial state     = {P['initial_state']}")
    print("  Select the armature -> N-panel -> drag  fold_angle :")
    print("     0 = FLAT pack | 33.7 = STAIR | 75 = LADDER")
    print("  Grab-fold: select 'Handle' bone, set IK influence = 1, press G.")
    print("=" * 60)


if __name__ == "__main__":
    main()
