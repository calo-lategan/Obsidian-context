"""
================================================================================
FOLDING MODULAR SELF-LEVELING STAIRCASE  <->  LADDER   (parametric regenerator)
Blender 5.1.2 / Python 3.13 / EEVEE Next.   1 BU = 1 m.   Metric.
================================================================================
Extends the proven 02_blender_build.py base. Built milestone by milestone:
  M0 verify numbers -> M1 geometry -> M2 rig/one-bone -> M3 self-level + clamps
  -> M4 handrail + split + modular -> M5 materials -> M6 showcase -> M7 app
  -> M8 fab export (joint_schedule.csv + bom.csv + JNT_* markers + exploded)
  -> M9 acceptance pass.

MATERIAL REVISION 2026-06-08: all-6061-T6 aluminium structure, BLACK powder coat
(RAL 9005) over zinc primer; A4 stainless locking hardware; nylon/Delrin
ISOLATING bushes (no bronze -> galvanic); handrail thermal-break grip sleeve.

The hero control is ONE bone (Fold_Handle); a single Showcase button plays the
whole story. See docs/SPEC_folding_staircase.md for the full design.

Run from Blender (Scripting > Run) for a full rebuild, or exec the file and call
individual milestone functions (m0_verify, scene_init, ...) from the MCP bridge.
================================================================================
"""

import bpy, math
from mathutils import Vector

MM = 0.001
PROJECT_DIR = r"C:/Users/USER/Desktop/Staircases/idea one"   # deliverables root (CSVs, renders)

# ------------------------------------------------------------------ params ----
PARAMS = dict(
    # --- core stair geometry (mm) ---
    riser=200.0, going=300.0, n_cells=5, step_depth=300.0, platform_depth=600.0,
    total_rise=1000.0, walking_run=1800.0,
    # --- width / modularity (mm) ---
    width_full=2350.0, half_unit=1175.0,
    # --- 1-DOF detents (deg) ---
    theta_flat=0.0, theta_ladder=75.0, initial_state="STAIR",
    # --- steel sections from the drawing family (mm) ---
    sec_rail=50.0, sec_ctrl=40.0, sec_handrail=25.0, sec_socket=31.0,
    rail_inset=60.0, ctrl_offset=120.0, plate_t=3.0, handrail_h=1000.0,
    # --- MATERIAL REVISION: all-aluminium, black powder-coat ---
    struct_alloy="6061-T6 aluminium",
    deck_alloy="5052/6061 aluminium",
    finish="zinc primer + black UV powder coat RAL 9005",
    fastener_grade="A4 stainless",
    bush_material="nylon/Delrin",          # isolating (NO bronze -> galvanic)
    tread_material="alu_plank",            # alu_plank | steel_checker | punched_grating
    handrail_grip="rope",                  # thermal break: rope | wpc | none
    # --- fabrication ---
    centre_couplers=4,                     # landing seam must split -> 4 (not 3)
    # --- modular / options ---
    split_in_two=False, units_side=1, units_stack=0,
    build_handrail=True, build_clamps=True, wipe_scene=False,
)

# aluminium 6061-T6 section mass (kg/m), rho = 2700 kg/m^3
ALU_KG_PER_M = {
    "50x50x3 SHS": 1.523, "40x40x3 SHS": 1.199, "25x25x3 tube": 0.713,
    "31x31x3 socket": 0.907, "50x50x3 L-angle": 0.786,
}
ALU_PLATE_KG_PER_M2 = 8.10   # 3 mm aluminium deck

# ----------------------------------------------------------------- derived ----
def derived(P=None):
    P = P or PARAMS
    R, G = P["riser"] * MM, P["going"] * MM
    L = math.hypot(G, R)
    theta_stair = math.degrees(math.atan2(R, G))
    tl = math.radians(P["theta_ladder"])
    ts = math.radians(theta_stair)
    return dict(
        R=R, G=G, L=L, theta_stair=theta_stair,
        W=P["width_full"] * MM, half=P["half_unit"] * MM,
        run=P["n_cells"] * G, rise=P["n_cells"] * R,
        stair_run_per_step=L * math.cos(ts),
        stair_rise_per_step=L * math.sin(ts),
        ladder_pitch=L * math.sin(tl),
    )

# ------------------------------------------------------------- M0 : verify ----
def m0_verify(P=None):
    """Pure-numeric acceptance pre-checks. No scene mutation."""
    P = P or PARAMS
    D = derived(P)
    checks = []

    def chk(name, got, want, tol):
        ok = abs(got - want) <= tol
        checks.append({"check": name, "got": round(got, 3), "want": want,
                       "tol": tol, "ok": ok})

    L_mm = D["L"] * 1000.0
    chk("leg_length_L_mm", L_mm, 360.56, 0.05)
    chk("theta_stair_deg", D["theta_stair"], 33.69, 0.02)
    chk("stair_rise_per_step_mm", D["stair_rise_per_step"] * 1000, 200.0, 0.2)
    chk("stair_run_per_step_mm", D["stair_run_per_step"] * 1000, 300.0, 0.2)

    tops = [round(i * D["stair_rise_per_step"] * 1000, 1) for i in range(1, P["n_cells"] + 1)]
    chk("tread_top_1_mm", tops[0], 200.0, 0.5)
    chk("tread_top_5_mm", tops[-1], 1000.0, 0.5)

    pitch = D["ladder_pitch"] * 1000.0
    chk("ladder_rung_pitch_mm", pitch, 348.0, 1.0)
    checks.append({"check": "ladder_pitch_<=_356_OSHA", "got": round(pitch, 2),
                   "want": "<=356", "tol": None, "ok": pitch <= 356.0})

    chk("half_unit_mm", P["half_unit"], P["width_full"] / 2.0, 0.01)

    return {
        "L_mm": round(L_mm, 3),
        "theta_stair_deg": round(D["theta_stair"], 3),
        "tread_tops_mm": tops,
        "ladder_rung_pitch_mm": round(pitch, 2),
        "walking_run_mm": P["walking_run"],
        "full_width_mm": P["width_full"], "half_unit_mm": P["half_unit"],
        "all_pass": all(c["ok"] for c in checks),
        "n_checks": len(checks),
        "checks": checks,
    }

# ------------------------------------------------------------- scene init -----
def scene_init():
    """Idempotent scene prep: metric units, EEVEE Next, auto-exec, root collection."""
    prefs = bpy.context.preferences.filepaths
    prefs.use_scripts_auto_execute = True            # scripted drivers must evaluate
    sc = bpy.context.scene
    sc.unit_settings.system = "METRIC"
    sc.unit_settings.scale_length = 1.0
    try:
        sc.render.engine = "BLENDER_EEVEE"            # EEVEE Next in 5.1
    except Exception as e:
        pass
    # drop the default cube only (keep camera/light for now)
    cube = bpy.data.objects.get("Cube")
    if cube:
        bpy.data.objects.remove(cube, do_unlink=True)
    # master collection
    root = bpy.data.collections.get("FoldingStair")
    if not root:
        root = bpy.data.collections.new("FoldingStair")
        sc.collection.children.link(root)
    return {
        "engine": sc.render.engine,
        "units": sc.unit_settings.system,
        "scale_length": sc.unit_settings.scale_length,
        "auto_exec": prefs.use_scripts_auto_execute,
        "objects": [o.name for o in bpy.data.objects],
        "collections": [c.name for c in bpy.data.collections],
    }


# ===================================================================== M1 ===
# Geometry of one full unit, authored in the FLAT REST frame (along +X, z~0)
# so it binds cleanly to the armature; the rig poses it to stair/ladder.
# (Handrail, split-into-halves, clamps/pawls, couplers and JNT markers are
#  layered in by later milestones; this is the load-bearing folding structure.)

def _box(sx, sy, sz, c):
    x, y, z = sx / 2, sy / 2, sz / 2
    cx, cy, cz = c
    v = [(cx-x, cy-y, cz-z), (cx+x, cy-y, cz-z), (cx+x, cy+y, cz-z), (cx-x, cy+y, cz-z),
         (cx-x, cy-y, cz+z), (cx+x, cy-y, cz+z), (cx+x, cy+y, cz+z), (cx-x, cy+y, cz+z)]
    f = [(0,1,2,3), (4,5,6,7), (0,1,5,4), (1,2,6,5), (2,3,7,6), (3,0,4,7)]
    return v, f


def _seg(p0, p1, r):
    """Oriented square-section prism (tube) from p0 to p1, cross-size r (for sloped members)."""
    p0, p1 = Vector(p0), Vector(p1)
    d = p1 - p0
    Ln = d.length
    if Ln < 1e-7:
        return [], []
    z = d / Ln
    up = Vector((0, 0, 1))
    if abs(z.dot(up)) > 0.99:
        up = Vector((1, 0, 0))
    x = z.cross(up).normalized() * (r / 2)
    y = z.cross(x).normalized() * (r / 2)
    v = []
    for c in (p0, p1):
        v += [c - x - y, c + x - y, c + x + y, c - x + y]
    f = [(0,1,2,3), (4,5,6,7), (0,1,5,4), (1,2,6,5), (2,3,7,6), (3,0,4,7)]
    return v, f


def _make_part(name, boxes, coll, props=None):
    """Accumulate many boxes into ONE mesh object (no bpy.ops.join / select_all)."""
    V, F = [], []
    for (sx, sy, sz, c) in boxes:
        v, f = _box(sx, sy, sz, c)
        o = len(V)
        V += v
        F += [tuple(i + o for i in fc) for fc in f]
    me = bpy.data.meshes.new(name)
    me.from_pydata(V, [], F)
    me.update()
    ob = bpy.data.objects.new(name, me)
    coll.objects.link(ob)
    for k, val in (props or {}).items():
        ob[k] = val
    return ob


def _get_coll(name, parent=None):
    c = bpy.data.collections.get(name)
    if not c:
        c = bpy.data.collections.new(name)
        (parent or bpy.context.scene.collection).children.link(c)
    return c


def m1_geometry(P=None, D=None):
    """Build the unit as TWO 1175 mm halves (A: y<0 keeps the primary names;
    B: y>0 gets a '_B' suffix). Both halves bind to the same rig bones (they fold
    together); B-side objects also receive a split driver (see wire_split) so the
    unit separates down the longitudinal centre."""
    P = P or PARAMS
    D = D or derived(P)
    L, n, W = D["L"], P["n_cells"], D["W"]
    rc, tc, pt = P["sec_rail"] * MM, P["sec_ctrl"] * MM, P["plate_t"] * MM
    rail_z = -0.05
    tie_z = rail_z + P["ctrl_offset"] * MM
    root = _get_coll("FoldingStair")
    c_str, c_trd, c_bas = (_get_coll("Stringer", root),
                           _get_coll("Treads", root),
                           _get_coll("Base", root))
    made = []   # (object_name, bone, is_half_B)

    def build_half(side):
        suf = "" if side == "A" else "_B"
        is_b = (side == "B")
        if side == "A":
            rail_ys, tie_y, y0, y1 = [-(W/2 - rc*1.2), -0.06], -W/4, -W/2, 0.0
        else:
            rail_ys, tie_y, y0, y1 = [0.06, (W/2 - rc*1.2)], W/4, 0.0, W/2
        yc, wj = (y0 + y1)/2.0, (y1 - y0)

        sb = [(n*L, rc, rc, (n*L/2, y, rail_z)) for y in rail_ys]          # rails / leg chains
        sb.append((n*L, tc, tc, (n*L/2, tie_y, tie_z)))                    # control tie-rod
        for i in range(n + 1):
            for y in rail_ys:
                sb.append((0.014, rc*0.8, (tie_z - rail_z), (i*L, y, (rail_z + tie_z)/2)))  # node lug
        s = _make_part(f"Stringer_struct{suf}", sb, c_str, {
            "part_id": f"STR_assembly{suf}", "subsystem": "Stringer",
            "section": "50x50x3 SHS rails + 40x40x3 SHS tie-rod",
            "material": P["struct_alloy"], "finish": P["finish"],
            "length_mm": round(n*L*1000, 1), "joints": "JNT_LEGPIV,JNT_TIEROD,JNT_BASEPIV"})
        made.append((s.name, "Stringer", is_b))

        for i in range(1, n + 1):
            depth = (P["platform_depth"] if i == n else P["step_depth"]) * MM
            x = i * L
            tb = [(depth, wj, pt, (x, yc, -pt/2)),                          # deck (top at z=0)
                  (depth, rc, rc, (x, y0 + rc/2, -rc/2)),                   # L-angle frame
                  (depth, rc, rc, (x, y1 - rc/2, -rc/2)),
                  (rc, wj, rc, (x - depth/2 + rc/2, yc, -rc/2)),
                  (rc, wj, rc, (x + depth/2 - rc/2, yc, -rc/2))]
            t = _make_part(f"Tread_{i}{suf}", tb, c_trd, {
                "part_id": f"TRD_{i}{suf}", "subsystem": "Treads",
                "section": f"3mm {P['tread_material']} deck on 50x50x3 L-angle",
                "material": P["deck_alloy"], "finish": P["finish"],
                "depth_mm": round(depth*1000, 1), "width_mm": round(wj*1000, 1),
                "joints": "JNT_TREADLUG,JNT_HRSOCKWELD"})
            made.append((t.name, f"Tread_{i}", is_b))

        bb = [(0.18, rc, rc, (0.0, y, rail_z)) for y in rail_ys]
        bb.append((0.06, wj, rc, (0.0, yc, rail_z)))
        b = _make_part(f"Base_frame{suf}", bb, c_bas, {
            "part_id": f"BAS_frame{suf}", "subsystem": "Base", "section": "50x50x3 SHS",
            "material": P["struct_alloy"], "finish": P["finish"], "joints": "JNT_BASEPIV"})
        made.append((b.name, "Base", is_b))

    build_half("A")
    build_half("B")
    return {"bind": made}


# ===================================================================== M3 ===
# Over-center toggle clamps + spring detent pawls at every node. Clamp bodies
# are rigid with the Stringer; the per-cell pawl seats into a notch at each
# detent via the clamp-snap driver (see make_armature). Visual lock indicator.

def make_clamps(P=None, D=None):
    """Per-half over-center clamps + one detent pawl per node per half. Pawls bind
    to Pawl_i bones (clamp-snap); B-side objects also get the split driver."""
    P = P or PARAMS
    D = D or derived(P)
    L, n, W = D["L"], P["n_cells"], D["W"]
    rc = P["sec_rail"] * MM
    rail_z = -0.05
    root = _get_coll("FoldingStair")
    c_clp = _get_coll("Clamps", root)
    binds = []   # (object_name, bone, is_half_B)
    for side in ("A", "B"):
        suf = "" if side == "A" else "_B"
        is_b = (side == "B")
        rail_ys = [-(W/2 - rc*1.2), -0.06] if side == "A" else [0.06, (W/2 - rc*1.2)]
        cb = []
        for i in range(n + 1):
            x = i * L
            for y in rail_ys:
                cb.append((0.060, 0.045, 0.050, (x, y, rail_z)))               # clamp body
                cb.append((0.100, 0.018, 0.018, (x + 0.05, y, rail_z + 0.03))) # over-center lever
                cb.append((0.050, 0.006, 0.070, (x, y, rail_z)))               # detent notch plate
        cobj = _make_part(f"Clamps_struct{suf}", cb, c_clp, {
            "part_id": f"CLP_assembly{suf}", "subsystem": "Clamps",
            "section": "over-center toggle (M10) + spring detent pawl",
            "material": P["fastener_grade"], "finish": "dark A4 stainless",
            "joints": "JNT_TOGGLE,JNT_DETENT"})
        binds.append((cobj.name, "Stringer", is_b))
        yL = rail_ys[0]
        for i in range(n + 1):
            x = i * L
            pob = _make_part(f"Pawl_{i}{suf}", [(0.012, 0.045, 0.050, (x, yL, rail_z + 0.04))], c_clp, {
                "part_id": f"PWL_{i}{suf}", "subsystem": "Clamps",
                "section": "detent pawl + torsion spring (Ø8 pin)",
                "material": P["fastener_grade"], "finish": "dark A4 stainless",
                "joints": "JNT_DETENT"})
            binds.append((pob.name, f"Pawl_{i}", is_b))
    return {"bind": binds}


# ===================================================================== M4 ===
# Handrails: ONE rigid weldment per side (posts + sloped top rail + tie + a
# thermal-break grip sleeve). Bound to HRctrl_L/R, which are children of Base
# and DO NOT fold -- so the rails stay put when the stair folds (you detach
# them first). The handrail_attached_L/R props lift + swing them clear.

def _seg_part(name, segs, coll, props=None):
    V, F = [], []
    for (p0, p1, r) in segs:
        v, f = _seg(p0, p1, r)
        o = len(V)
        V += v
        F += [tuple(i + o for i in fc) for fc in f]
    me = bpy.data.meshes.new(name)
    me.from_pydata(V, [], F)
    me.update()
    ob = bpy.data.objects.new(name, me)
    coll.objects.link(ob)
    for k, val in (props or {}).items():
        ob[k] = val
    return ob


def make_handrails(P=None, D=None):
    P = P or PARAMS
    D = D or derived(P)
    L, W = D["L"], D["W"]
    hr = P["sec_handrail"] * MM
    gh = P["handrail_h"] * MM
    ts = math.radians(D["theta_stair"])
    c, s = math.cos(ts), math.sin(ts)
    y_out = W/2 - 0.06
    posts_i = (1, 3, 5)
    root = _get_coll("FoldingStair")
    out = {"sides": {}, "grips": []}
    for sgn, side in ((-1.0, "L"), (1.0, "R")):
        y = sgn * y_out
        coll = _get_coll(f"Handrail_{side}", root)
        tops = []
        segs = []
        for i in posts_i:                                          # posts (vary in length over the slope)
            base = (i*L*c, y, i*L*s)
            top = (i*L*c, y, i*L*s + gh)
            segs.append((base, top, hr))
            tops.append(top)
        segs.append((tops[0], tops[-1], hr))                       # sloped top rail
        m0 = (posts_i[0]*L*c, y, posts_i[0]*L*s + gh*0.5)
        m1 = (posts_i[-1]*L*c, y, posts_i[-1]*L*s + gh*0.5)
        segs.append((m0, m1, hr*0.8))                              # mid tie
        ob = _seg_part(f"Handrail_{side}", segs, coll, {
            "part_id": f"HRL_{side}", "subsystem": f"Handrail_{side}",
            "section": "25x25x3 tube weldment (posts+rail+tie)",
            "material": P["struct_alloy"], "finish": P["finish"],
            "joints": "JNT_HRSPIG"})
        out["sides"][side] = ob.name
        if P["handrail_grip"] != "none":                           # thermal-break grip sleeve
            g = _seg_part(f"Grip_{side}", [(tops[0], tops[-1], hr*1.35)], coll, {
                "part_id": f"GRP_{side}", "subsystem": f"Handrail_{side}",
                "section": f"thermal-break grip sleeve ({P['handrail_grip']})",
                "material": P["handrail_grip"], "finish": P["handrail_grip"], "joints": ""})
            out["grips"].append(g.name)
    return out


# ===================================================================== M2 ===
# Armature + the ONE-bone fold. Single input = Fold_Handle (its local-Y travel,
# which points along world +Z). A driver maps it to the Stringer rotation; a
# second driver exposes fold_angle as a degree readout. Treads self-level via
# COPY_ROTATION(World, REPLACE) -> Base.

def _view3d_override():
    win = bpy.context.window
    if not win:
        return {}
    for area in win.screen.areas:
        if area.type == 'VIEW_3D':
            region = next((r for r in area.regions if r.type == 'WINDOW'), None)
            return {"window": win, "area": area, "region": region}
    return {"window": win}


def make_armature(P=None, D=None):
    P = P or PARAMS
    D = D or derived(P)
    L, n = D["L"], P["n_cells"]
    adata = bpy.data.armatures.new("STAIR_RIG")
    arm = bpy.data.objects.new("STAIR_RIG", adata)
    _get_coll("FoldingStair").objects.link(arm)
    bpy.context.view_layer.objects.active = arm
    arm.select_set(True)

    with bpy.context.temp_override(**_view3d_override()):
        bpy.ops.object.mode_set(mode='EDIT')
        eb = adata.edit_bones

        def nb(name, head, tail, parent=None):
            b = eb.new(name)
            b.head, b.tail = Vector(head), Vector(tail)
            if parent:
                b.parent = parent
                b.use_connect = False
            return b

        base = nb("Base", (0, 0, 0), (0, 0, 0.2))
        string = nb("Stringer", (0, 0, 0), (n*L, 0, 0), base)
        for i in range(1, n + 1):
            nb(f"Tread_{i}", (i*L, 0, 0), (i*L, 0, 0.2), string)
        nb("Fold_Handle", (-0.4, 0, 0.0), (-0.4, 0, 0.3), base)   # local Y == world +Z
        for i in range(n + 1):                                    # clamp / pawl carriers
            jb = nb(f"Joint_{i}", (i*L, 0, 0), (i*L, 0, 0.12), string)
            nb(f"Pawl_{i}", (i*L, 0, 0.04), (i*L, 0.05, 0.04), jb)
        nb("HRctrl_L", (0, -0.9, 0.0), (0, -0.9, 0.2), base)      # handrails: child of Base, don't fold
        nb("HRctrl_R", (0,  0.9, 0.0), (0,  0.9, 0.2), base)
        nb("Split_Ctrl", (0, 0, -0.1), (0, 0.2, -0.1), base)     # split / modular control
        bpy.ops.object.mode_set(mode='OBJECT')

    pb = arm.pose.bones
    pb["Stringer"].rotation_mode = 'XYZ'
    pb["Fold_Handle"].rotation_mode = 'XYZ'
    for i in range(n + 1):
        pb[f"Pawl_{i}"].rotation_mode = 'XYZ'
    for sd in ("L", "R"):
        pb[f"HRctrl_{sd}"].rotation_mode = 'XYZ'

    arm["fold_angle"] = float(D["theta_stair"])
    try:
        arm.id_properties_ui("fold_angle").update(
            min=0.0, max=90.0, soft_min=0.0, soft_max=90.0,
            description="READOUT deg: 0=FLAT 33.69=STAIR 75=LADDER (driven by Fold_Handle)")
    except Exception:
        pass

    EXPR = "min(max(33.69 + ly*90.0, 0.0), 90.0)"   # rest (ly=0) = STAIR

    def add_handle_var(drv):
        v = drv.variables.new()
        v.name, v.type = "ly", 'TRANSFORMS'
        t = v.targets[0]
        t.id = arm
        t.bone_target = "Fold_Handle"
        t.transform_type = 'LOC_Y'
        t.transform_space = 'LOCAL_SPACE'

    # the one-bone fold: Stringer rotation <- handle
    fc = arm.driver_add('pose.bones["Stringer"].rotation_euler', 0)
    fc.driver.type = 'SCRIPTED'
    add_handle_var(fc.driver)
    fc.driver.expression = f"radians({EXPR})"

    # fold_angle degree readout <- handle
    fr = arm.driver_add('["fold_angle"]')
    fr.driver.type = 'SCRIPTED'
    add_handle_var(fr.driver)
    fr.driver.expression = EXPR

    # self-leveling treads
    for i in range(1, n + 1):
        c = pb[f"Tread_{i}"].constraints.new('COPY_ROTATION')
        c.target = arm
        c.subtarget = "Base"
        c.target_space = 'WORLD'
        c.owner_space = 'WORLD'
        c.mix_mode = 'REPLACE'
        c.use_x = c.use_y = c.use_z = True

    # showcase / modular state props (read by later milestones M4-M8)
    for k, dv in (("split_amount", 0.0), ("handrail_attached_L", 1.0), ("handrail_attached_R", 1.0),
                  ("unit2_slide", 0.0), ("half_extend", 0.0), ("stack_amount", 0.0), ("explode", 0.0)):
        arm[k] = float(dv)
        try:
            arm.id_properties_ui(k).update(min=0.0, max=1.0, soft_min=0.0, soft_max=1.0)
        except Exception:
            pass
    arm["tread_material"] = 0
    try:
        arm.id_properties_ui("tread_material").update(
            min=0, max=2, soft_min=0, soft_max=2,
            description="0=alu_plank 1=steel_checker 2=punched_grating")
    except Exception:
        pass

    # clamp-snap: pawl seats into the notch within +/-3 deg of each detent (0 / 33.69 / 75)
    for i in range(n + 1):
        fcp = arm.driver_add(f'pose.bones["Pawl_{i}"].rotation_euler', 0)
        fcp.driver.type = 'SCRIPTED'
        v = fcp.driver.variables.new()
        v.name, v.type = "fa", 'SINGLE_PROP'
        v.targets[0].id = arm
        v.targets[0].data_path = '["fold_angle"]'
        fcp.driver.expression = ("radians(-14.0)*max(0.0, 1.0 - "
                                 "min(abs(fa-0.0), abs(fa-33.69), abs(fa-75.0))/3.0)")

    # handrail attach: 1 = seated in sockets, 0 = lifted + swung clear (per side)
    for side, sgn in (("L", 1.0), ("R", -1.0)):
        bone = f"HRctrl_{side}"
        prop = f'["handrail_attached_{side}"]'
        fz = arm.driver_add(f'pose.bones["{bone}"].location', 2)   # lift
        fz.driver.type = 'SCRIPTED'
        vz = fz.driver.variables.new()
        vz.name, vz.type = "a", 'SINGLE_PROP'
        vz.targets[0].id = arm
        vz.targets[0].data_path = prop
        fz.driver.expression = "0.22*(1.0 - a)"
        fy = arm.driver_add(f'pose.bones["{bone}"].rotation_euler', 1)  # swing clear
        fy.driver.type = 'SCRIPTED'
        vy = fy.driver.variables.new()
        vy.name, vy.type = "a", 'SINGLE_PROP'
        vy.targets[0].id = arm
        vy.targets[0].data_path = prop
        fy.driver.expression = f"radians({sgn}*32.0)*(1.0 - a)"

    return arm


def bind(obj, arm, bone):
    vg = obj.vertex_groups.new(name=bone)
    vg.add(range(len(obj.data.vertices)), 1.0, 'REPLACE')
    m = obj.modifiers.new("Arm", "ARMATURE")
    m.object = arm
    m.use_vertex_groups = True


def set_fold(arm, state_or_deg):
    """Move the ONE hero bone -> the whole rig folds. Returns the cascade readout."""
    deg = {"FLAT": 0.0, "STAIR": 33.69, "LADDER": 75.0}.get(state_or_deg)
    if deg is None:
        deg = float(state_or_deg)
    ly = (deg - 33.69) / 90.0
    arm.pose.bones["Fold_Handle"].location = (0.0, ly, 0.0)
    bpy.context.view_layer.update()
    return {"target_deg": deg, "handle_locY": round(ly, 4),
            "fold_angle_readout": round(arm["fold_angle"], 3),
            "stringer_rot_x_deg": round(math.degrees(arm.pose.bones["Stringer"].rotation_euler[0]), 3)}


def check_tread_normals(arm, states=("FLAT", "STAIR", "LADDER")):
    """Assert every tread's top-face world normal stays +Z across the fold."""
    res = {}
    for s in states:
        set_fold(arm, s)
        deps = bpy.context.evaluated_depsgraph_get()
        worst = 1.0
        for i in range(1, PARAMS["n_cells"] + 1):
            ob = bpy.data.objects.get(f"Tread_{i}")
            obe = ob.evaluated_get(deps)
            me = obe.to_mesh()
            mw = obe.matrix_world
            best_z, nz = -1e9, 0.0
            for poly in me.polygons:
                nrm = (mw.to_3x3() @ poly.normal).normalized()
                ctr = mw @ poly.center
                if nrm.z > 0.5 and ctr.z > best_z:
                    best_z, nz = ctr.z, nrm.z
            worst = min(worst, nz)
            obe.to_mesh_clear()
        res[s] = round(worst, 4)
    return res


def _sp_var(drv, name, prop, arm):
    v = drv.variables.new()
    v.name, v.type = name, 'SINGLE_PROP'
    v.targets[0].id = arm
    v.targets[0].data_path = prop
    return v


def wire_modular(arm, obj_names, D, gap=0.30):
    """Half-B objects: split apart in Y (split_amount), then rejoin + lift to STACK on
    top of half-A (stack_amount) -> one longer ladder when folded to LADDER."""
    stack_rise = D["L"] * PARAMS["n_cells"] * math.sin(math.radians(PARAMS["theta_ladder"]))
    for nm in obj_names:
        ob = bpy.data.objects.get(nm)
        if not ob:
            continue
        fy = ob.driver_add('location', 1)
        fy.driver.type = 'SCRIPTED'
        _sp_var(fy.driver, "sa", '["split_amount"]', arm)
        _sp_var(fy.driver, "st", '["stack_amount"]', arm)
        fy.driver.expression = f"{gap}*sa*(1.0 - st)"
        fz = ob.driver_add('location', 2)
        fz.driver.type = 'SCRIPTED'
        _sp_var(fz.driver, "st", '["stack_amount"]', arm)
        fz.driver.expression = f"{stack_rise:.4f}*st"


def make_unit2(P=None, D=None):
    """A second unit (static copy of the posed meshes) that slides in along +Y and
    couples flush (unit2_slide 0=offscreen -> 1=flush, reads as one continuous unit)."""
    P = P or PARAMS
    D = D or derived(P)
    arm = bpy.data.objects["STAIR_RIG"]
    set_fold(arm, "STAIR")
    arm["split_amount"] = 0.0
    arm["stack_amount"] = 0.0
    arm.update_tag()
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    dg.update()
    root = _get_coll("FoldingStair")
    u2 = _get_coll("Unit_2", root)
    for ob in list(u2.objects):
        bpy.data.objects.remove(ob, do_unlink=True)
    W = D["W"]
    flush_y, far = W, 4.5
    names = []
    for cn in ("Stringer", "Treads", "Base", "Clamps", "Handrail_L", "Handrail_R"):
        c = bpy.data.collections.get(cn)
        if not c:
            continue
        for ob in list(c.objects):
            if ob.type != 'MESH':
                continue
            obe = ob.evaluated_get(dg)
            me = bpy.data.meshes.new_from_object(obe)
            nob = bpy.data.objects.new(ob.name + "_U2", me)
            u2.objects.link(nob)
            nob["part_id"] = str(ob.get("part_id", "")) + "_U2"
            nob["subsystem"] = "Unit_2"
            nob["section"] = ob.get("section", "")
            fc = nob.driver_add('location', 1)
            fc.driver.type = 'SCRIPTED'
            _sp_var(fc.driver, "u", '["unit2_slide"]', arm)
            fc.driver.expression = f"{flush_y} + {far}*(1.0 - u)"
            names.append(nob.name)
    ce = bpy.data.objects.get("Conn_Empty")
    if not ce:
        ce = bpy.data.objects.new("Conn_Empty", None)
        root.objects.link(ce)
    ce.location = (0.0, W/2.0, 0.0)   # the side-coupling seam between unit 1 and unit 2
    ce.empty_display_size = 0.15
    return {"unit2_objs": names, "conn": ce.name}


def build_core(P=None):
    P = P or PARAMS
    D = derived(P)
    scene_init()
    g = m1_geometry(P, D)
    arm = make_armature(P, D)
    cl = make_clamps(P, D)
    structure = g["bind"] + cl["bind"]                       # (name, bone, is_B)
    for name, bone, _is_b in structure:
        bind(bpy.data.objects[name], arm, bone)
    hrl = make_handrails(P, D)
    bind(bpy.data.objects[hrl["sides"]["L"]], arm, "HRctrl_L")
    bind(bpy.data.objects[hrl["sides"]["R"]], arm, "HRctrl_R")
    for gn in hrl["grips"]:
        bind(bpy.data.objects[gn], arm, f"HRctrl_{'L' if gn.endswith('L') else 'R'}")
    # split: every half-B object (+ the right handrail/grip, which live on half B)
    b_objs = [name for (name, _b, is_b) in structure if is_b]
    b_objs.append(hrl["sides"]["R"])
    b_objs += [gn for gn in hrl["grips"] if gn.endswith("R")]
    wire_modular(arm, b_objs, D)
    u2 = make_unit2(P, D)
    set_fold(arm, "STAIR")
    for k in ("split_amount", "stack_amount", "unit2_slide"):
        arm[k] = 0.0
    return {"armature": arm.name, "bones": [b.name for b in arm.data.bones],
            "n_objects": len(bpy.data.objects), "n_parts": len(structure),
            "split_objs": b_objs, "unit2": u2}


# ----------------------------------------------------- preview cam / render --
def setup_preview(res=(1100, 800)):
    sc = bpy.context.scene
    sc.render.engine = "BLENDER_EEVEE"
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.film_transparent = False
    try:
        sc.view_settings.view_transform = "AgX"
    except Exception:
        pass
    w = bpy.data.worlds.get("World") or bpy.data.worlds.new("World")
    sc.world = w
    w.use_nodes = True
    bg = w.node_tree.nodes.get("Background")
    if bg:
        bg.inputs[0].default_value = (0.05, 0.05, 0.06, 1.0)
        bg.inputs[1].default_value = 1.0
    tgt = bpy.data.objects.get("CamTarget")
    if not tgt:
        tgt = bpy.data.objects.new("CamTarget", None)
        bpy.context.scene.collection.objects.link(tgt)
    tgt.location = (0.9, 0.0, 0.55)
    cam = bpy.data.objects.get("Camera")
    if not cam:
        cd = bpy.data.cameras.new("Camera")
        cam = bpy.data.objects.new("Camera", cd)
        bpy.context.scene.collection.objects.link(cam)
    cam.location = (4.8, -4.8, 3.2)
    for cns in list(cam.constraints):
        cam.constraints.remove(cns)
    tc = cam.constraints.new('TRACK_TO')
    tc.target = tgt
    tc.track_axis = 'TRACK_NEGATIVE_Z'
    tc.up_axis = 'UP_Y'
    sc.camera = cam
    sun = bpy.data.objects.get("Sun")
    if not sun:
        sd = bpy.data.lights.new("Sun", 'SUN')
        sun = bpy.data.objects.new("Sun", sd)
        bpy.context.scene.collection.objects.link(sun)
    sun.data.energy = 4.0
    sun.rotation_euler = (math.radians(55), math.radians(18), math.radians(40))
    return {"camera": cam.name, "target": list(tgt.location)}


def render_pose(arm, state, path):
    import os
    os.makedirs(os.path.dirname(path), exist_ok=True)
    set_fold(arm, state)
    bpy.context.view_layer.update()
    sc = bpy.context.scene
    sc.render.filepath = path
    sc.render.image_settings.file_format = 'PNG'
    bpy.ops.render.render(write_still=True)
    return {"state": state, "path": path}


# ===================================================================== M8 ===
# FABRICATION EXPORT: bom.csv + joint_schedule.csv, JNT_* empty markers, and an
# exploded view (driver on delta_location from arm['explode'] + a direct setter).
# Read-only w.r.t. the structural rig; only adds Empties + delta_location offsets.
# All masses are recomputed from the REVISED all-aluminium section table so the
# BOM stays in lock-step with ALU_KG_PER_M / ALU_PLATE_KG_PER_M2 above.

import csv as _csv
import os as _os

# 6 mm structural aluminium plate (lugs, splice plates): 0.006 m * 2700 kg/m^3
_ALU_PLATE6_KG_PER_M2 = 0.006 * 2700.0          # = 16.20 kg/m^2
# grip sleeve (rope / WPC) — non-metal, light; ~0.25 kg per 1 m run sleeve
_GRIP_KG_PER_M = 0.25


def _sec_mass(profile, length_mm, qty=1):
    """Linear-section mass (kg) for one piece from ALU_KG_PER_M * length."""
    return round(ALU_KG_PER_M[profile] * (length_mm * MM), 3)


def _plate_mass(w_mm, h_mm, kg_per_m2):
    return round((w_mm * MM) * (h_mm * MM) * kg_per_m2, 3)


def _build_part_registry(P=None, D=None):
    """Assemble the BOM rows from the parametric geometry + revised Al masses."""
    P = P or PARAMS
    D = D or derived(P)
    L_mm = D["L"] * 1000.0                      # 360.56
    span_mm = P["n_cells"] * L_mm              # 5L = 1802.78
    Wmm = P["width_full"]                      # 2350
    step_d, land_d = P["step_depth"], P["platform_depth"]
    n = P["n_cells"]
    # handrail top-rail sloped length over the 1800 run @ theta_stair
    toprail_mm = round(P["walking_run"] / math.cos(math.radians(D["theta_stair"])), 2)  # ~2163
    post_mm = P["handrail_h"]                  # 1000
    sock_mm = 150.0
    stiff_mm = 600.0
    # base frame cut length: 2350x1200 rect perimeter + 1 centre brace (~W)
    base_cut_mm = 2.0 * Wmm + 2.0 * 1200.0 + Wmm     # = 8650
    base_half_cut_mm = round(base_cut_mm / 2.0, 1)
    # step / landing L-angle frame perimeters
    step_perim = 2.0 * Wmm + 2.0 * step_d            # 5300
    land_perim = 2.0 * Wmm + 2.0 * land_d            # 5900

    rows = []

    def add(part_id, desc, section, length_mm, qty_full, qty_half,
            material, mass_each, notes):
        rows.append(dict(
            part_id=part_id, description=desc, section=section,
            length_mm=round(length_mm, 2) if length_mm is not None else "",
            qty_full=qty_full, qty_half=qty_half, material=material,
            mass_kg_each=round(mass_each, 3), notes=notes))

    SHS50, SHS40, T25, SOCK, LANG = ("50x50x3 SHS", "40x40x3 SHS",
                                     "25x25x3 tube", "31x31x3 socket",
                                     "50x50x3 L-angle")
    alloy, finish = P["struct_alloy"], P["finish"]
    deck_alloy = P["deck_alloy"]
    hw = P["fastener_grade"]

    # --- primary folding structure (per-side members split 1->1 to a half) ---
    add("STR_rail", "Stringer / main chord rail", SHS50, span_mm, 4, 2,
        alloy, _sec_mass(SHS50, span_mm), "2 per side (top+bottom chord), spans 5L")
    add("LEG_link", "Parallelogram leg link", SHS50, L_mm, 20, 10,
        alloy, _sec_mass(SHS50, L_mm), "L=360.56; 2/cell x 5 cells x 2 sides")
    add("TIE_rod", "Control tie-rod (1-DOF sync)", SHS40, span_mm, 2, 1,
        alloy, _sec_mass(SHS40, span_mm), "links all legs per side, =5L; Ø12 crank pins")

    # --- tread frames + decks (full-width; whole frame goes to each half) ---
    add("FRM_step", "Tread frame, step (300 deep)", LANG, step_perim, 4, 4,
        alloy, _sec_mass(LANG, step_perim), "2x2350 + 2x300 L-angle perimeter")
    add("FRM_land", "Tread frame, landing (600 deep)", LANG, land_perim, 1, 1,
        alloy, _sec_mass(LANG, land_perim), "2x2350 + 2x600 L-angle perimeter")

    # decks: built family selected by tread_material; HERO = aluminium plank
    tm = P.get("tread_material", "alu_plank")
    if tm == "steel_checker":
        deck_kg_m2, deck_desc, deck_mat = 23.55, "steel checker plate", "steel checker"
    elif tm == "punched_grating":
        deck_kg_m2, deck_desc, deck_mat = 14.13, "punched grating (~60% solid)", "steel grating"
    else:
        deck_kg_m2, deck_desc, deck_mat = ALU_PLATE_KG_PER_M2, "aluminium plank", deck_alloy
    add("DCK_step", "Step deck - %s" % deck_desc, "3 mm deck %dx%d" % (Wmm, step_d),
        None, 4, 4, deck_mat, _plate_mass(Wmm, step_d, deck_kg_m2),
        "%.2f m2 @ %.2f kg/m2 (selected by tread_material=%s)" % (Wmm*step_d*MM*MM, deck_kg_m2, tm))
    add("DCK_land", "Landing deck - %s" % deck_desc, "3 mm deck %dx%d" % (Wmm, land_d),
        None, 1, 1, deck_mat, _plate_mass(Wmm, land_d, deck_kg_m2),
        "%.2f m2 @ %.2f kg/m2" % (Wmm*land_d*MM*MM, deck_kg_m2))

    # --- pivot lugs / gussets (6 mm Al plate) ---
    add("LUG_pivot", "Tread pivot lug / gusset", "6 mm Al plate 120x80", 120.0, 40, 20,
        alloy, _plate_mass(120.0, 80.0, _ALU_PLATE6_KG_PER_M2),
        "2 per leg end; weld to frame, pin to leg (JNT_TREADLUG)")

    # --- locking hardware (A4 stainless, ~steel masses per spec) ---
    add("CLP_oc", "Over-center toggle clamp", "M10 toggle clamp body", None, 10, 5,
        hw, 0.80, "1 per cell per side; locks theta (JNT_TOGGLE)")
    add("PWL_detent", "Detent pawl + torsion spring", "machined 6 mm + Ø8 pin", None, 10, 5,
        hw, 0.25, "1 per cell per side; theta indexing (JNT_DETENT)")

    # --- base / ground frame ---
    add("BAS_frame", "Base / ground frame", SHS50, base_cut_mm, 1, 0,
        alloy, _sec_mass(SHS50, base_cut_mm), "2350x1200 + centre brace; full unit")
    add("BAS_frame_H", "Base / ground frame (half)", SHS50, base_half_cut_mm, 0, 1,
        alloy, _sec_mass(SHS50, base_half_cut_mm), "half-unit ground frame (split at centre)")

    # --- couplers / splice ---
    add("CPL_side", "Side coupler - Ø16 ring/clevis", "Ø16 ring/clevis", None, 4, 2,
        hw, 0.90, "width faces; side-by-side join (JNT_SIDECPL)")
    add("CPL_ctr", "Centre coupler - Ø16 ring/clevis", "Ø16 ring/clevis", None,
        P.get("centre_couplers", 4), int(math.ceil(P.get("centre_couplers", 4) / 2.0)),
        hw, 0.90, "longitudinal centre-split interface (JNT_CSPLIT); qty=centre_couplers")
    add("SPL_end", "End splice plate", "6 mm Al plate 250x120", 250.0, 4, 2,
        alloy, _plate_mass(250.0, 120.0, _ALU_PLATE6_KG_PER_M2),
        "4x M16 splice; end-to-end / stack join (JNT_ENDCPL)")

    # --- handrail family ---
    add("HRL_post", "Handrail post", T25, post_mm, 6, 3,
        alloy, _sec_mass(T25, post_mm), "~1000 high; 3 per side")
    add("HRL_toprail", "Handrail top rail", T25, toprail_mm, 2, 1,
        alloy, _sec_mass(T25, toprail_mm), "sloped over 1800 run @ %.2f deg" % D["theta_stair"])
    add("HRL_tie", "Handrail tie / mid brace", T25, span_mm, 2, 1,
        alloy, _sec_mass(T25, span_mm), "stiffens post line, =5L")
    add("HRL_grip", "Handrail grip sleeve (thermal break)",
        "grip sleeve (%s)" % P.get("handrail_grip", "rope"), toprail_mm, 2, 1,
        P.get("handrail_grip", "rope"),
        round(_GRIP_KG_PER_M * (toprail_mm * MM), 3),
        "NON-metal, non-black thermal break; over top rail")
    add("HRL_sock", "Handrail socket", SOCK, sock_mm, 6, 3,
        alloy, _sec_mass(SOCK, sock_mm), "1 per post; welded to frame (JNT_HRSOCKWELD)")

    # --- vertical stiffeners ---
    add("STF_vert", "Vertical stiffener / support", SHS50, stiff_mm, 10, 5,
        alloy, _sec_mass(SHS50, stiff_mm), "1 per cell per side")

    return rows


# module-level BOM mirror (built once at import from the default PARAMS)
PART_REGISTRY = _build_part_registry()


# ------------------------------------------------------------ JOINT SCHEDULE --
# Locations are formulas in i and L (mm), origin = front-bottom base pivot.
# c = cos(theta), s = sin(theta), W = full width (y_rail = +/- W/2 = +/-1175),
# L = 360.56 mm. e_t = 120 mm tie-rod crank offset; h_post = 1000 mm handrail.
JOINT_SCHEDULE = [
    dict(joint_id="JNT_LEGPIV_L",
         location_formula_xyz="( i*L*c , -W/2 , i*L*s ) , i=0..4",
         type="pin", members="LEG_link,STR_rail",
         fastener_size="Ø16 A4 stainless pin", dof="hinge", qty_full=5,
         tolerance="hole Ø16.5 (+0.5); nylon bush ID16.05/OD22",
         notes="left-rail parallelogram pivot; nylon/Delrin isolating bush + circlip; axis || Y"),
    dict(joint_id="JNT_LEGPIV_R",
         location_formula_xyz="( i*L*c , +W/2 , i*L*s ) , i=0..4",
         type="pin", members="LEG_link,STR_rail",
         fastener_size="Ø16 A4 stainless pin", dof="hinge", qty_full=5,
         tolerance="hole Ø16.5; nylon bush ID16.05/OD22",
         notes="right-rail pivot; coaxial with JNT_LEGPIV_L (shared Y axis)"),
    dict(joint_id="JNT_LEGPIV_T",
         location_formula_xyz="( i*L*c , +/-W/2 , i*L*s + L ) , i=0..4",
         type="pin", members="LEG_link,FRM_step/FRM_land",
         fastener_size="Ø16 A4 stainless pin", dof="hinge", qty_full=10,
         tolerance="hole Ø16.5; nylon bush ID16.05/OD22",
         notes="upper parallelogram pivot completing 4-bar; circlip retained; both rails"),
    dict(joint_id="JNT_TIEROD",
         location_formula_xyz="( i*L*c + 120*c , +/-W/2 , i*L*s + 120*s ) , e_t=120 , i=0..4",
         type="pin", members="TIE_rod,LEG_link",
         fastener_size="Ø12 A4 stainless pin + nylon bush", dof="hinge", qty_full=10,
         tolerance="hole Ø12.5; nylon bush ID12.05/OD18",
         notes="couples all legs -> 1 DOF; crank offset e_t=120 mm; both rails"),
    dict(joint_id="JNT_TREADLUG",
         location_formula_xyz="( i*L*c , +/-W/2 +/-175 , i*L*s + L ) , i=0..4",
         type="weld+pin", members="FRM_step/FRM_land,LUG_pivot,LEG_link",
         fastener_size="6 mm fillet weld + Ø12 pin", dof="fixed", qty_full=10,
         tolerance="weld leg a=6; hole Ø12.5",
         notes="lug welded to frame, pinned to leg; weld all-round lug perimeter"),
    dict(joint_id="JNT_TOGGLE",
         location_formula_xyz="( i*L*c + 60 , +/-W/2 , i*L*s + 80 ) , i=4 (landing)",
         type="clamp", members="CLP_oc,TIE_rod,STR_rail",
         fastener_size="M10 bolt x2 + Ø8 lever pin", dof="fixed (locked)", qty_full=2,
         tolerance="bolt hole Ø11; pin Ø8.5",
         notes="over-center toggle locks theta; 1 per rail at landing cell i=4"),
    dict(joint_id="JNT_DETENT",
         location_formula_xyz="( 0 , +/-W/2 , 0 ) at base-pivot hub",
         type="pin+spring", members="PWL_detent,BAS_frame",
         fastener_size="Ø8 pin + torsion spring", dof="ratchet", qty_full=2,
         tolerance="hole Ø8.5; notch +/-0.25 deg",
         notes="V-notches @ 0 / 33.69 / 75 deg (FLAT/STAIR/LADDER); one per rail at base"),
    dict(joint_id="JNT_BASEPIV",
         location_formula_xyz="( 0 , +/-W/2 , 0 )",
         type="pin", members="STR_rail,BAS_frame",
         fastener_size="Ø16 A4 stainless pin", dof="hinge", qty_full=2,
         tolerance="hole Ø16.5; nylon bush ID16.05/OD22",
         notes="ground pivot; carries reaction; circlip both ends"),
    dict(joint_id="JNT_CSPLIT",
         location_formula_xyz="( 0.45*i*L*c , 0 , i*L*s ) , i in {0,1,2,3}",
         type="pin (clevis)", members="CPL_ctr (half-A clevis),CPL_ctr (half-B clevis)",
         fastener_size="Ø16 R-clip pin", dof="fixed", qty_full=4,
         tolerance="jaw clr 1 mm/side; hole Ø16.5",
         notes="centre-split coupler x4 along seam y=0; mates 2x 1175 half-units"),
    dict(joint_id="JNT_SIDECPL",
         location_formula_xyz="( {0, 2*L*c, 4*L*c} , +/-W/2 , {0, 2*L*s, 4*L*s} )",
         type="pin (ring/clevis)", members="CPL_side,neighbour unit",
         fastener_size="Ø16 ring/clevis pin", dof="fixed", qty_full=4,
         tolerance="hole Ø16.5; ring OD 60",
         notes="width-tiling coupler; 2 stations per +/-Y face (4 total full unit)"),
    dict(joint_id="JNT_ENDCPL",
         location_formula_xyz="( {0, 4*L*c} , +/-W/2 , {0, 4*L*s} ) end faces",
         type="bolt (splice)", members="SPL_end,adjoining unit end",
         fastener_size="4x M16 A4 stainless", dof="fixed", qty_full=4,
         tolerance="hole Ø18; plate 250x120x10",
         notes="end-to-end / stacked tiling; 4 bore stations (2 ends x 2 rails); 2 splice plates"),
    dict(joint_id="JNT_HRSPIG",
         location_formula_xyz="( i*L*c , +/-W/2 , i*L*s + L + 1000 ) , i in {1,3,5 posts}",
         type="socket", members="HRL_post,HRL_sock",
         fastener_size="31x31 spigot + Ø10 R-clip", dof="fixed", qty_full=6,
         tolerance="spigot/socket clr ~1 mm; pin Ø10.5",
         notes="post 1000 mm above tread; R-clip cross-pin locks spigot; 3 per rail"),
    dict(joint_id="JNT_HRSOCKWELD",
         location_formula_xyz="( i*L*c , +/-W/2 , i*L*s + L ) , i in {1,3,5}",
         type="weld", members="HRL_sock,FRM_step/FRM_land",
         fastener_size="6 mm fillet weld", dof="fixed", qty_full=6,
         tolerance="weld a=6 all-round",
         notes="socket welded to frame top; receives handrail spigot"),
    dict(joint_id="JNT_FRAMECNR",
         location_formula_xyz="tread frame corners: ( i*L*c +/-d/2 , +/-W/2 , i*L*s + L ) , i=0..4",
         type="weld", members="FRM_step/FRM_land,FRM_step/FRM_land",
         fastener_size="6 mm fillet weld (mitre)", dof="fixed", qty_full=20,
         tolerance="gap <=1 mm; mitre 45 deg",
         notes="4 corners x 5 treads = 20 mitre welds; weld both flanges"),
]


def _bom_total_mass(rows=None):
    """Hero (built-deck) total = sum(mass_each * qty_full) over rows."""
    rows = rows if rows is not None else PART_REGISTRY
    tot = 0.0
    for r in rows:
        try:
            tot += float(r["mass_kg_each"]) * float(r["qty_full"])
        except (TypeError, ValueError):
            pass
    return round(tot, 2)


def _default_out_dir():
    """build folder = directory of this module (fallback to cwd if unsaved)."""
    try:
        base = _os.path.dirname(_os.path.abspath(__file__))
    except NameError:
        base = bpy.path.abspath("//") or _os.getcwd()
    if not base:
        base = _os.getcwd()
    return _os.path.join(base, "fab_export")


def export_fab(out_dir=None, P=None):
    """Write bom.csv + joint_schedule.csv (UTF-8) from PART_REGISTRY/JOINT_SCHEDULE.

    Reconciles mass after a tread_material swap by rebuilding the registry from
    the live PARAMS (so the deck rows + total reflect the selected deck family)."""
    P = P or PARAMS
    out_dir = out_dir or _default_out_dir()
    _os.makedirs(out_dir, exist_ok=True)

    # reconcile: rebuild rows from current PARAMS so a tread_material swap is captured
    rows = _build_part_registry(P)
    global PART_REGISTRY
    PART_REGISTRY = rows

    bom_path = _os.path.join(out_dir, "bom.csv")
    bom_cols = ["part_id", "description", "section", "length_mm",
                "qty_full", "qty_half", "material", "mass_kg_each",
                "mass_kg_total_full", "notes"]
    with open(bom_path, "w", newline="", encoding="utf-8") as fh:
        w = _csv.DictWriter(fh, fieldnames=bom_cols, extrasaction="ignore")
        w.writeheader()
        for r in rows:
            try:
                tot = round(float(r["mass_kg_each"]) * float(r["qty_full"]), 3)
            except (TypeError, ValueError):
                tot = ""
            out = dict(r)
            out["mass_kg_total_full"] = tot
            w.writerow(out)
        # summary footer rows
        w.writerow(dict(part_id="TOTAL_HERO", description="Sum mass_each*qty_full",
                        mass_kg_total_full=_bom_total_mass(rows),
                        notes="deck family = %s" % P.get("tread_material", "alu_plank")))

    jnt_path = _os.path.join(out_dir, "joint_schedule.csv")
    jnt_cols = ["joint_id", "location_formula_xyz", "type", "members",
                "fastener_size", "dof", "qty_full", "tolerance", "notes"]
    with open(jnt_path, "w", newline="", encoding="utf-8") as fh:
        w = _csv.DictWriter(fh, fieldnames=jnt_cols, extrasaction="ignore")
        w.writeheader()
        for r in JOINT_SCHEDULE:
            w.writerow(r)

    return {"out_dir": out_dir, "bom_csv": bom_path, "joint_csv": jnt_path,
            "n_bom_rows": len(rows), "n_joint_rows": len(JOINT_SCHEDULE),
            "total_mass_hero_kg": _bom_total_mass(rows),
            "tread_material": P.get("tread_material", "alu_plank"),
            "total_joint_instances": sum(int(j["qty_full"]) for j in JOINT_SCHEDULE)}


# --------------------------------------------------- JNT_* marker placement ---
def _jnt_instance_points(P, D):
    """Yield (joint_id, instance_index, (x,y,z)_m, pin, members) at current theta.

    Locations evaluate the schedule formulas at STAIR theta (theta_stair) using
    derived() geometry. Units: metres (L is in metres from derived())."""
    L = D["L"]
    th = math.radians(D["theta_stair"])
    c, s = math.cos(th), math.sin(th)
    W2 = D["W"] / 2.0
    n = P["n_cells"]
    h_post = P["handrail_h"] * MM
    e_t = P["ctrl_offset"] * MM
    posts_i = (1, 3, 5)

    def emit(jid, idx, p, pin, members):
        return (jid, idx, (round(p[0], 5), round(p[1], 5), round(p[2], 5)), pin, members)

    idx = 0
    # leg pivots L / R (lower), i = 0..n-1 (5 cells)
    for i in range(n):
        yield emit("JNT_LEGPIV_L", i, (i*L*c, -W2, i*L*s), "Ø16", "LEG_link,STR_rail")
    for i in range(n):
        yield emit("JNT_LEGPIV_R", i, (i*L*c, +W2, i*L*s), "Ø16", "LEG_link,STR_rail")
    # leg-top pivots (both rails)
    idx = 0
    for i in range(n):
        for sgn in (-1.0, 1.0):
            yield emit("JNT_LEGPIV_T", idx, (i*L*c, sgn*W2, i*L*s + L), "Ø16",
                       "LEG_link,FRM"); idx += 1
    # tie-rod crank pins (both rails)
    idx = 0
    for i in range(n):
        for sgn in (-1.0, 1.0):
            yield emit("JNT_TIEROD", idx, (i*L*c + e_t*c, sgn*W2, i*L*s + e_t*s),
                       "Ø12", "TIE_rod,LEG_link"); idx += 1
    # tread lugs (both rails)
    idx = 0
    for i in range(n):
        for sgn in (-1.0, 1.0):
            yield emit("JNT_TREADLUG", idx, (i*L*c, sgn*(W2 - 0.175), i*L*s + L),
                       "Ø12", "FRM,LUG_pivot,LEG_link"); idx += 1
    # over-center toggles at landing cell (i = n-1), both rails
    idx = 0
    for sgn in (-1.0, 1.0):
        yield emit("JNT_TOGGLE", idx, ((n-1)*L*c + 0.060, sgn*W2, (n-1)*L*s + 0.080),
                   "M10", "CLP_oc,TIE_rod,STR_rail"); idx += 1
    # detents + base pivots at base hub, both rails
    idx = 0
    for sgn in (-1.0, 1.0):
        yield emit("JNT_DETENT", idx, (0.0, sgn*W2, 0.0), "Ø8",
                   "PWL_detent,BAS_frame"); idx += 1
    idx = 0
    for sgn in (-1.0, 1.0):
        yield emit("JNT_BASEPIV", idx, (0.0, sgn*W2, 0.0), "Ø16",
                   "STR_rail,BAS_frame"); idx += 1
    # centre-split couplers x4 along seam y=0
    for j, i in enumerate((0, 1, 2, 3)):
        yield emit("JNT_CSPLIT", j, (0.45*i*L*c, 0.0, i*L*s), "Ø16 R-clip",
                   "CPL_ctr,CPL_ctr")
    # side couplers: 2 stations per +/-Y face
    idx = 0
    for sgn in (-1.0, 1.0):
        for i in (0, n-1):
            yield emit("JNT_SIDECPL", idx, (i*L*c, sgn*W2, i*L*s), "Ø16",
                       "CPL_side,neighbour"); idx += 1
    # end couplers (splice) at both end faces, both rails
    idx = 0
    for i in (0, n-1):
        for sgn in (-1.0, 1.0):
            yield emit("JNT_ENDCPL", idx, (i*L*c, sgn*W2, i*L*s), "M16",
                       "SPL_end,adjoining"); idx += 1
    # handrail spigots (posts at i in {1,3,5}), both rails
    idx = 0
    for i in posts_i:
        for sgn in (-1.0, 1.0):
            yield emit("JNT_HRSPIG", idx, (i*L*c, sgn*(W2 - 0.06), i*L*s + L + h_post),
                       "Ø10 R-clip", "HRL_post,HRL_sock"); idx += 1
    # handrail socket welds, both rails
    idx = 0
    for i in posts_i:
        for sgn in (-1.0, 1.0):
            yield emit("JNT_HRSOCKWELD", idx, (i*L*c, sgn*(W2 - 0.06), i*L*s + L),
                       "weld", "HRL_sock,FRM"); idx += 1
    # frame corners: 4 per tread x n treads
    idx = 0
    for i in range(n):
        depth = (P["platform_depth"] if (i == n-1) else P["step_depth"]) * MM
        for dx in (-depth/2.0, depth/2.0):
            for sgn in (-1.0, 1.0):
                yield emit("JNT_FRAMECNR", idx,
                           (i*L*c + dx, sgn*(W2 - 0.025), i*L*s + L),
                           "weld", "FRM,FRM"); idx += 1


def place_jnt_markers(P=None):
    """Create one Empty per joint instance: JNT_<id>_<i> in a 'Joints' collection.

    Idempotent: existing JNT_* empties are removed first. Each empty carries
    custom props joint_id, type, members (CSV part_ids), pin. Positions are the
    schedule formulas evaluated at STAIR theta via derived()."""
    P = P or PARAMS
    D = derived(P)

    root = _get_coll("FoldingStair")
    coll = _get_coll("Joints", root)

    # if the rig exists, ensure it is in the STAIR pose so the readout matches
    arm = bpy.data.objects.get("STAIR_RIG")
    if arm is not None:
        try:
            set_fold(arm, "STAIR")
        except Exception:
            pass

    # idempotent clear: remove any prior JNT_ markers (in any collection)
    for ob in list(bpy.data.objects):
        if ob.name.startswith("JNT_") and ob.type == 'EMPTY':
            bpy.data.objects.remove(ob, do_unlink=True)

    # type lookup from the schedule for each joint_id
    type_of = {j["joint_id"]: j["type"] for j in JOINT_SCHEDULE}

    made = []
    counts = {}
    for jid, idx, (x, y, z), pin, members in _jnt_instance_points(P, D):
        name = "JNT_%s_%d" % (jid, idx)
        emp = bpy.data.objects.get(name)
        if emp is None:
            emp = bpy.data.objects.new(name, None)        # None data -> Empty
            coll.objects.link(emp)
        elif emp.name not in coll.objects:
            coll.objects.link(emp)
        emp.empty_display_type = 'PLAIN_AXES'
        emp.empty_display_size = 0.04
        emp.location = (x, y, z)
        emp["joint_id"] = jid
        emp["type"] = type_of.get(jid, "")
        emp["members"] = members
        emp["pin"] = pin
        made.append(name)
        counts[jid] = counts.get(jid, 0) + 1

    return {"collection": coll.name, "n_markers": len(made),
            "per_joint": counts, "theta_deg": round(D["theta_stair"], 3)}


# --------------------------------------------------------- exploded view -----
# Each part is pushed outward from its cell origin by arm['explode'] (0..1).
# We bake a per-object explode vector (metres) and either (a) drive
# delta_location[0..2] = explode * comp, or (b) set delta_location directly.

_EXPLODE_MAX = 0.45        # metres of separation at explode = 1.0

# subsystem -> (radial_xy_gain, vertical_gain) shaping of the blow-apart
_EXPLODE_GAIN = {
    "Stringer": (1.0, -0.6), "Treads": (1.2, 1.0), "Base": (0.6, -1.2),
    "Clamps": (1.5, 0.3), "Handrail_L": (1.3, 1.4), "Handrail_R": (1.3, 1.4),
}

# the structural mesh objects that participate in the exploded view
_EXPLODE_OBJECTS = (
    ["Stringer_struct", "Base_frame", "Clamps_struct",
     "Handrail_L", "Handrail_R", "Grip_L", "Grip_R"]
    + ["Tread_%d" % i for i in range(1, 6)]
    + ["Pawl_%d" % i for i in range(0, 6)]
)


def _bbox_center_local(ob):
    """Local-space bounding-box centre of an object (mathutils.Vector)."""
    bb = [Vector(corner) for corner in ob.bound_box]
    return sum(bb, Vector((0.0, 0.0, 0.0))) / 8.0


def _explode_vector(ob, P, D):
    """Per-object outward offset (metres) at explode = 1.0, from its cell origin."""
    sub = ob.get("subsystem", "")
    rg, vg = _EXPLODE_GAIN.get(sub, (1.0, 0.5))
    ctr = _bbox_center_local(ob)            # part centre in its own (rest) frame
    # radial direction in XY away from the run centreline (y=0); avoid /0
    ry = ctr.y
    if abs(ry) < 1e-4:
        ry = 1e-4 if sub.endswith("_R") else -1e-4
    yspread = (1.0 if ry >= 0 else -1.0) * abs(rg) * _EXPLODE_MAX
    # treads also fan along +X so the diagram reads as a stack
    xspread = 0.0
    if sub == "Treads":
        try:
            idx = int(ob.name.split("_")[1])
        except (IndexError, ValueError):
            idx = 0
        xspread = (idx - (P["n_cells"] + 1) / 2.0) * 0.10 * abs(rg)
    zspread = vg * _EXPLODE_MAX
    return Vector((xspread, yspread, zspread))


def make_exploded(P=None):
    """Install drivers so delta_location = arm['explode'] * baked_vector per part.

    The explode factor is the existing arm['explode'] custom prop (0..1).
    Idempotent: clears prior delta_location drivers before re-adding."""
    P = P or PARAMS
    D = derived(P)
    arm = bpy.data.objects.get("STAIR_RIG")

    # make sure the driver source prop exists (it is created in make_armature,
    # but guard for standalone use of this function)
    if arm is not None and "explode" not in arm.keys():
        arm["explode"] = 0.0
        try:
            arm.id_properties_ui("explode").update(min=0.0, max=1.0,
                                                   soft_min=0.0, soft_max=1.0)
        except Exception:
            pass

    done = []
    for name in _EXPLODE_OBJECTS:
        ob = bpy.data.objects.get(name)
        if ob is None:
            continue
        vec = _explode_vector(ob, P, D)
        ob["explode_vec"] = [round(v, 5) for v in vec]   # record for set_explode

        # clear existing delta_location drivers (idempotent)
        ad = ob.animation_data
        if ad:
            for i in range(3):
                try:
                    ob.driver_remove("delta_location", i)
                except Exception:
                    pass

        if arm is None:
            # no rig: fall back to a static reassembled state
            ob.delta_location = (0.0, 0.0, 0.0)
            done.append(name)
            continue

        for i in range(3):
            fc = ob.driver_add("delta_location", i)
            drv = fc.driver
            drv.type = 'SCRIPTED'
            v = drv.variables.new()
            v.name = "ex"
            v.type = 'SINGLE_PROP'
            v.targets[0].id = arm
            v.targets[0].data_path = '["explode"]'
            drv.expression = "ex*%.6f" % vec[i]
        done.append(name)

    return {"armature": (arm.name if arm else None),
            "n_parts": len(done), "parts": done,
            "explode_prop": "STAIR_RIG['explode'] (0..1)",
            "max_separation_m": _EXPLODE_MAX}


def set_explode(amount=0.0, P=None):
    """Direct setter: delta_location = amount * baked vector for every part.

    amount=0 fully reassembles. Also writes arm['explode'] so the driver path
    (make_exploded) and this direct path stay in agreement. Recomputes the
    baked vector if a part has none yet."""
    P = P or PARAMS
    D = derived(P)
    amount = float(amount)
    arm = bpy.data.objects.get("STAIR_RIG")
    if arm is not None and "explode" in arm.keys():
        arm["explode"] = amount

    moved = []
    for name in _EXPLODE_OBJECTS:
        ob = bpy.data.objects.get(name)
        if ob is None:
            continue
        ev = ob.get("explode_vec")
        if ev is None:
            ev = list(_explode_vector(ob, P, D))
            ob["explode_vec"] = [round(v, 5) for v in ev]
        # if a driver owns delta_location it will fight a direct write; only
        # set directly when there is no delta_location driver on this object
        has_drv = False
        ad = ob.animation_data
        if ad and ad.drivers:
            has_drv = any(d.data_path == "delta_location" for d in ad.drivers)
        if not has_drv:
            ob.delta_location = (ev[0]*amount, ev[1]*amount, ev[2]*amount)
        moved.append(name)

    bpy.context.view_layer.update()
    return {"amount": amount, "n_parts": len(moved), "reassembled": amount == 0.0}


def export_and_mark(out_dir=None, P=None):
    """Convenience M8 entry: write CSVs, place markers, install explode drivers."""
    P = P or PARAMS
    fab = export_fab(out_dir, P)
    mk = place_jnt_markers(P)
    ex = make_exploded(P)
    return {"export": fab, "markers": mk, "exploded": ex}


def acceptance(P=None):
    """M9 (mechanism subset): assert the headline acceptance criteria on the live rig."""
    P = P or PARAMS
    D = derived(P)
    arm = bpy.data.objects["STAIR_RIG"]
    r = {}

    sweep = {s: set_fold(arm, s)["fold_angle_readout"] for s in ("FLAT", "STAIR", "LADDER")}
    r["one_bone_sweep_deg"] = sweep
    r["sweep_ok"] = (abs(sweep["FLAT"]) < 0.1 and abs(sweep["STAIR"] - 33.69) < 0.1
                     and abs(sweep["LADDER"] - 75) < 0.1)

    r["tread_normal_min"] = check_tread_normals(arm)
    r["normals_ok"] = all(v > 0.999 for v in r["tread_normal_min"].values())

    set_fold(arm, "STAIR")
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get(); dg.update()
    tops = []
    for i in range(1, P["n_cells"] + 1):
        ob = bpy.data.objects[f"Tread_{i}"].evaluated_get(dg)
        me = ob.to_mesh()
        zmax = max((ob.matrix_world @ v.co).z for v in me.vertices)
        ob.to_mesh_clear()
        tops.append(round(zmax * 1000, 1))
    r["stair_tread_top_mm"] = tops
    r["tops_ok"] = all(abs(tops[i] - (i + 1) * 200) < 6 for i in range(P["n_cells"]))

    r["ladder_pitch_mm"] = round(D["ladder_pitch"] * 1000, 1)
    r["pitch_ok"] = D["ladder_pitch"] * 1000 <= 356

    arm["split_amount"] = 1.0; arm.update_tag(); bpy.context.view_layer.update(); dg.update()
    yb = bpy.data.objects["Tread_3_B"].evaluated_get(dg).matrix_world.translation.y
    ya = bpy.data.objects["Tread_3"].evaluated_get(dg).matrix_world.translation.y
    r["split_gap_m"] = round(yb - ya, 3)
    r["split_ok"] = abs((yb - ya) - 0.30) < 0.01
    arm["split_amount"] = 0.0; arm.update_tag()

    hr = [o for o in ("Handrail_L", "Handrail_R") if bpy.data.objects.get(o)]
    r["handrails"] = hr
    r["handrails_ok"] = len(hr) == 2

    clamp = {}
    for d in (0, 20, 33.69, 50, 75):
        set_fold(arm, d)
        clamp[str(d)] = round(math.degrees(arm.pose.bones["Pawl_0"].rotation_euler[0]), 1)
    r["pawl_rot_by_fold"] = clamp
    r["clamps_ok"] = (clamp["0"] < -10 and clamp["33.69"] < -10 and clamp["75"] < -10
                      and abs(clamp["20"]) < 1 and abs(clamp["50"]) < 1)
    set_fold(arm, "STAIR")

    keys = ("sweep_ok", "normals_ok", "tops_ok", "pitch_ok", "split_ok", "handrails_ok", "clamps_ok")
    r["ALL_PASS"] = all(r[k] for k in keys)
    return r


# --- M5-M8 modules and build_all() / __main__ are appended below by integration ---
    print(export_and_mark())


# ######################## integrated module: m5_materials.py ########################
# ============================================================ M5 : MATERIALS ===
# EEVEE-Next PBR for the all-black powder-coat aluminium folding staircase.
# Verified vs bundled Blender 5.1 docs (read-only doc tools):
#   * bpy.types.SceneEEVEE CONFIRMED: use_raytracing / ray_tracing_method
#     ('SCREEN'|'PROBE') / use_shadows / use_fast_gi / shadow_ray_count [1..4] /
#     shadow_step_count [1..16] / taa_render_samples -- all present; hasattr-guarded.
#   * bpy.types.Material CONFIRMED: surface_render_method ('DITHERED'|'BLENDED'),
#     blend_method/show_transparent_back/use_transparency_overlap (DEPRECATED but
#     present), use_backface_culling -- all hasattr+try/except guarded.
#   * NodeTreeInterface.new_socket(name, *, in_out=, socket_type=) CONFIRMED -- the
#     '*' makes in_out / socket_type KEYWORD-ONLY, so they are passed by keyword.
#     Doc literal for socket_type is 'DEFAULT' but the concrete 'NodeSocketFloat'
#     id is accepted at runtime; wrapped so a failure can't abort group creation.
#   * AreaLight CONFIRMED: shape/size/size_y(rectangle)/energy/shadow_soft_size;
#     Light.use_temperature + Light.temperature for Kelvin (guarded, colour fallback).
#   * ShaderNodeTexVoronoi CONFIRMED: feature='F1', voronoi_dimensions (default
#     '1D' -> we set '2D'), Distance output, Randomness input.
#   * ShaderNodeTexWave CONFIRMED: wave_type/bands_direction/wave_profile attrs.
#   * ShaderNodeTexNoise CONFIRMED: noise_dimensions default '1D' uses ONLY the
#     scalar W input -> an unconnected noise is CONSTANT.  FIX: every procedural
#     noise here sets noise_dimensions='3D' so the implicit generated coordinate
#     drives it (otherwise the orange-peel, the EEVEE convex wear proxy and the
#     rope fibre would all be dead flat -- the core M5 quality bug).
#   * ShaderNodeMix data_type='RGBA' CONFIRMED.  Multi-type sockets share the
#     names "Factor"/"A"/"B" across float/vector/colour variants, so colour A/B
#     MUST be addressed BY INDEX (inputs[6]=A, inputs[7]=B, outputs[2]=Result);
#     by-name .get("A") would resolve the hidden FLOAT A and silently mis-set.
#   * ShaderNodeAmbientOcclusion CONFIRMED present ('AO'+'Color' outputs, samples
#     in [1,128]).  GOTCHA (manual render/eevee/limitations/nodes_support):
#     EEVEE-Next does NOT support Geometry>Pointiness NOR the Bevel node, so
#     NG_edgewear BLENDS the (Cycles-true) Pointiness signal 50/50 with a
#     procedural 3D-noise convex proxy + AO so wear/dirt read in EEVEE-Next.
# Idempotent: .get() before create; node trees cleared+rebuilt; no bpy.ops.join /
# select_all; never mutates the rig topology.

_BLACK_RAL9005 = (0.02, 0.02, 0.02, 1.0)
_BARE_ALU      = (0.55, 0.55, 0.56, 1.0)
_OXIDE_SS      = (0.06, 0.06, 0.07, 1.0)
_BRIGHT_SS     = (0.70, 0.70, 0.72, 1.0)
_ROPE_TAN      = (0.45, 0.32, 0.16, 1.0)
_WPC_CHARCOAL  = (0.06, 0.06, 0.07, 1.0)

_TREAD_MAT_NAMES = ("MAT_tread_alu", "MAT_tread_checker", "MAT_tread_grating")
_TREAD_ENUM = {"alu_plank": 0, "steel_checker": 1, "punched_grating": 2}


# ------------------------------------------------------------ node utilities ---
def _new(nt, idname, name=None, loc=(0, 0)):
    n = nt.nodes.new(idname)
    if name:
        n.name = n.label = name
    n.location = loc
    return n


def _sock_in(node, key, default=None):
    """Fetch an input socket by name or index; tolerant of renames; set default."""
    s = None
    if isinstance(key, str):
        s = node.inputs.get(key)
    elif isinstance(key, int) and key < len(node.inputs):
        s = node.inputs[key]
    if s is not None and default is not None:
        try:
            s.default_value = default
        except Exception:
            pass
    return s


def _set_principled(p, base=None, metallic=None, rough=None,
                    coat_w=None, coat_r=None, spec=None):
    """Set Principled inputs by NAME (5.1 OpenPBR), each individually guarded."""
    pairs = [("Base Color", base), ("Metallic", metallic), ("Roughness", rough),
             ("Coat Weight", coat_w), ("Coat Roughness", coat_r),
             ("Specular IOR Level", spec)]
    for nm, val in pairs:
        if val is None:
            continue
        s = p.inputs.get(nm)
        if s is not None:
            try:
                s.default_value = val
            except Exception:
                pass


def _noise(nt, name, loc, scale, detail):
    """3D Perlin noise (NEVER 1D -- an unconnected 1D noise is constant)."""
    nz = _new(nt, 'ShaderNodeTexNoise', name, loc)
    if hasattr(nz, "noise_dimensions"):
        try:
            nz.noise_dimensions = '3D'   # use implicit generated coordinate
        except Exception:
            pass
    _sock_in(nz, "Scale", scale)
    _sock_in(nz, "Detail", detail)
    return nz


# ----------------------------------------------------- NG_edgewear node group ---
def make_edgewear_nodegroup():
    """Reusable ShaderNodeTree 'NG_edgewear'.
    Inputs : Wear Amount, Dirt Amount, Edge Sharpness
    Outputs: Wear (convex chip mask 0..1), Dirt (concave grime mask 0..1)
    Pointiness is unsupported in EEVEE-Next, so it is blended 50/50 with a
    procedural 3D-noise convex proxy + AO so the masks survive EEVEE-Next & Cycles.
    """
    ng = bpy.data.node_groups.get("NG_edgewear")
    if ng and ng.bl_idname == 'ShaderNodeTree':
        return ng
    if ng:
        bpy.data.node_groups.remove(ng)
    ng = bpy.data.node_groups.new("NG_edgewear", 'ShaderNodeTree')

    iface = ng.interface

    def _isock(name, in_out, default=None, mn=0.0, mx=1.0):
        # in_out / socket_type are KEYWORD-ONLY in 5.1 (signature uses '*').
        s = iface.new_socket(name=name, in_out=in_out,
                             socket_type='NodeSocketFloat')
        if default is not None:
            try:
                s.default_value = default
                s.min_value, s.max_value = mn, mx
            except Exception:
                pass
        return s

    _isock("Wear", 'OUTPUT')
    _isock("Dirt", 'OUTPUT')
    _isock("Wear Amount", 'INPUT', 0.5)
    _isock("Dirt Amount", 'INPUT', 0.4)
    _isock("Edge Sharpness", 'INPUT', 0.5)

    gin = _new(ng, 'NodeGroupInput', "in", (-900, 0))
    gout = _new(ng, 'NodeGroupOutput', "out", (700, 0))
    L = ng.links

    # convex edge signal: Geometry Pointiness (Cycles-true; constant in EEVEE-Next)
    geo = _new(ng, 'ShaderNodeNewGeometry', "geo", (-900, -260))
    ramp_p = _new(ng, 'ShaderNodeValToRGB', "convex_ramp", (-680, -260))
    L.new(geo.outputs["Pointiness"], ramp_p.inputs["Fac"])
    ramp_p.color_ramp.elements[0].position = 0.52
    ramp_p.color_ramp.elements[1].position = 0.62

    # procedural convex proxy (works in EEVEE-Next): high-freq 3D noise edges
    nz = _noise(ng, "edge_noise", (-900, 120), 60.0, 8.0)
    ramp_n = _new(ng, 'ShaderNodeValToRGB', "noise_ramp", (-680, 120))
    L.new(nz.outputs["Fac"], ramp_n.inputs["Fac"])
    ramp_n.color_ramp.elements[0].position = 0.62
    ramp_n.color_ramp.elements[1].position = 0.78

    cvx = _new(ng, 'ShaderNodeMix', "convex_mix", (-440, -60))
    cvx.data_type = 'RGBA'
    _sock_in(cvx, "Factor", 0.5)
    L.new(ramp_n.outputs["Color"], cvx.inputs[6])   # colour A (by index)
    L.new(ramp_p.outputs["Color"], cvx.inputs[7])   # colour B (by index)

    # Edge Sharpness biases the convex threshold via Power
    sharp = _new(ng, 'ShaderNodeMath', "sharp", (-220, -60))
    sharp.operation = 'POWER'
    L.new(cvx.outputs[2], sharp.inputs[0])          # Mix RGBA Result (colour)
    L.new(gin.outputs["Edge Sharpness"], sharp.inputs[1])

    wear = _new(ng, 'ShaderNodeMath', "wear_amt", (60, 40))
    wear.operation = 'MULTIPLY'
    L.new(sharp.outputs[0], wear.inputs[0])
    L.new(gin.outputs["Wear Amount"], wear.inputs[1])
    L.new(wear.outputs[0], gout.inputs["Wear"])

    # dirt: AO inverted (concave cavities) * Dirt Amount
    ao = _new(ng, 'ShaderNodeAmbientOcclusion', "ao", (-440, -360))
    ao.samples = 8
    inv = _new(ng, 'ShaderNodeInvert', "ao_inv", (-220, -360))
    L.new(ao.outputs["AO"], inv.inputs["Color"])
    dirt = _new(ng, 'ShaderNodeMath', "dirt_amt", (60, -320))
    dirt.operation = 'MULTIPLY'
    L.new(inv.outputs["Color"], dirt.inputs[0])
    L.new(gin.outputs["Dirt Amount"], dirt.inputs[1])
    L.new(dirt.outputs[0], gout.inputs["Dirt"])
    return ng


# ------------------------------------------------- shared powder-coat sub-tree -
def _build_powdercoat_core(nt, with_edgewear=True, base_color=_BLACK_RAL9005,
                           rough=0.45):
    """Principled + orange-peel micro-normal + optional NG_edgewear chip.
    Returns (principled, output, orangepeel_bump). Profile builders chain their
    own bump into the orange-peel bump's Normal input.
    """
    out = _new(nt, 'ShaderNodeOutputMaterial', "out", (900, 0))
    p = _new(nt, 'ShaderNodeBsdfPrincipled', "principled", (520, 0))
    _set_principled(p, base=base_color, metallic=0.0, rough=rough,
                    coat_w=0.2, coat_r=0.1)
    L = nt.links

    nz = _noise(nt, "op_noise", (-200, -360), 120.0, 4.0)
    bump = _new(nt, 'ShaderNodeBump', "op_bump", (60, -360))
    _sock_in(bump, "Strength", 0.15)
    _sock_in(bump, "Distance", 0.0003)
    L.new(nz.outputs["Fac"], bump.inputs["Height"])
    if p.inputs.get("Normal") is not None:
        L.new(bump.outputs["Normal"], p.inputs["Normal"])

    if with_edgewear:
        ng = make_edgewear_nodegroup()
        ew = _new(nt, 'ShaderNodeGroup', "edgewear", (60, 260))
        ew.node_tree = ng
        _sock_in(ew, "Wear Amount", 0.55)
        _sock_in(ew, "Dirt Amount", 0.35)
        _sock_in(ew, "Edge Sharpness", 1.5)
        alu = _new(nt, 'ShaderNodeBsdfPrincipled', "alu_chip", (520, 320))
        _set_principled(alu, base=_BARE_ALU, metallic=1.0, rough=0.3)
        mix = _new(nt, 'ShaderNodeMixShader', "wear_mix", (740, 120))
        L.new(ew.outputs["Wear"], mix.inputs[0])
        L.new(p.outputs[0], mix.inputs[1])
        L.new(alu.outputs[0], mix.inputs[2])
        darken = _new(nt, 'ShaderNodeMix', "dirt_dark", (300, 120))
        darken.data_type = 'RGBA'
        _sock_in(darken, "Factor", 0.0)
        # colour A/B MUST be by index (name "A"/"B" hits the hidden float sockets)
        try:
            darken.inputs[6].default_value = base_color
            darken.inputs[7].default_value = (0.005, 0.005, 0.005, 1.0)
        except Exception:
            pass
        L.new(ew.outputs["Dirt"], darken.inputs[0])   # Factor (float)
        if p.inputs.get("Base Color") is not None:
            L.new(darken.outputs[2], p.inputs["Base Color"])  # colour Result
        L.new(mix.outputs[0], out.inputs["Surface"])
        return p, out, bump
    L.new(p.outputs[0], out.inputs["Surface"])
    return p, out, bump


def _ensure_mat(name):
    m = bpy.data.materials.get(name)
    if m is None:
        m = bpy.data.materials.new(name)
    m.use_nodes = True
    m.node_tree.nodes.clear()
    return m


def _set_alpha_cutout(mat):
    """EEVEE-Next alpha cutout: render method DITHERED, no back transparency."""
    if hasattr(mat, "surface_render_method"):
        try:
            mat.surface_render_method = 'DITHERED'
        except Exception:
            pass
    if hasattr(mat, "blend_method"):
        try:
            mat.blend_method = 'CLIP'
        except Exception:
            pass
    if hasattr(mat, "use_transparency_overlap"):
        try:
            mat.use_transparency_overlap = False
        except Exception:
            pass
    if hasattr(mat, "show_transparent_back"):
        try:
            mat.show_transparent_back = False
        except Exception:
            pass
    if hasattr(mat, "use_backface_culling"):
        try:
            mat.use_backface_culling = True
        except Exception:
            pass


# ----------------------------------------------------- profile sub-builders ----
def _add_plank_ribs(nt, p, base_bump):
    """alu plank: longitudinal Wave bands -> steep ramp -> Bump ~2mm."""
    L = nt.links
    tex = _new(nt, 'ShaderNodeTexCoord', "tc_alu", (-700, -650))
    w = _new(nt, 'ShaderNodeTexWave', "plank", (-460, -650))
    w.wave_type = 'BANDS'
    w.bands_direction = 'X'
    w.wave_profile = 'SAW'
    _sock_in(w, "Scale", 32.0)          # ~30mm pitch at object scale
    _sock_in(w, "Distortion", 0.0)
    L.new(tex.outputs["Object"], w.inputs["Vector"])
    r = _new(nt, 'ShaderNodeValToRGB', "plank_ramp", (-220, -650))
    r.color_ramp.interpolation = 'CONSTANT'
    r.color_ramp.elements[0].position = 0.45
    r.color_ramp.elements[1].position = 0.55
    L.new(w.outputs["Fac"], r.inputs["Fac"])
    b = _new(nt, 'ShaderNodeBump', "plank_bump", (60, -650))
    _sock_in(b, "Strength", 0.9)
    _sock_in(b, "Distance", 0.002)
    L.new(r.outputs["Color"], b.inputs["Height"])
    if base_bump is not None and base_bump.inputs.get("Normal") is not None:
        L.new(b.outputs["Normal"], base_bump.inputs["Normal"])
    elif p.inputs.get("Normal") is not None:
        L.new(b.outputs["Normal"], p.inputs["Normal"])


def _add_durbar(nt, p, base_bump):
    """checker: two +/-diagonal thresholded Waves -> Max -> Bump ~2mm, alt rows."""
    L = nt.links
    tex = _new(nt, 'ShaderNodeTexCoord', "tc_chk", (-820, -650))
    w1 = _new(nt, 'ShaderNodeTexWave', "bar_a", (-560, -560))
    w1.wave_type = 'BANDS'
    w1.bands_direction = 'DIAGONAL'
    w1.wave_profile = 'SAW'
    _sock_in(w1, "Scale", 33.0)
    w2 = _new(nt, 'ShaderNodeTexWave', "bar_b", (-560, -760))
    w2.wave_type = 'BANDS'
    w2.bands_direction = 'DIAGONAL'
    w2.wave_profile = 'SAW'
    _sock_in(w2, "Scale", 33.0)
    _sock_in(w2, "Phase Offset", 3.14159)   # alt-row offset
    L.new(tex.outputs["Object"], w1.inputs["Vector"])
    L.new(tex.outputs["Object"], w2.inputs["Vector"])
    t1 = _new(nt, 'ShaderNodeValToRGB', "thr_a", (-320, -560))
    t2 = _new(nt, 'ShaderNodeValToRGB', "thr_b", (-320, -760))
    for t in (t1, t2):
        t.color_ramp.interpolation = 'CONSTANT'
        t.color_ramp.elements[0].position = 0.72
        t.color_ramp.elements[1].position = 0.80
    L.new(w1.outputs["Fac"], t1.inputs["Fac"])
    L.new(w2.outputs["Fac"], t2.inputs["Fac"])
    mx = _new(nt, 'ShaderNodeMath', "bar_max", (-100, -650))
    mx.operation = 'MAXIMUM'
    L.new(t1.outputs["Color"], mx.inputs[0])
    L.new(t2.outputs["Color"], mx.inputs[1])
    b = _new(nt, 'ShaderNodeBump', "durbar_bump", (140, -650))
    _sock_in(b, "Strength", 1.0)
    _sock_in(b, "Distance", 0.002)
    L.new(mx.outputs[0], b.inputs["Height"])
    if base_bump is not None and base_bump.inputs.get("Normal") is not None:
        L.new(b.outputs["Normal"], base_bump.inputs["Normal"])
    elif p.inputs.get("Normal") is not None:
        L.new(b.outputs["Normal"], p.inputs["Normal"])


def _add_perforation(nt, p, out):
    """grating: staggered round holes via Voronoi F1 distance -> Less-Than ->
    circular ALPHA cutout; grippy roughness 0.55."""
    L = nt.links
    tex = _new(nt, 'ShaderNodeTexCoord', "tc_grt", (-820, -650))
    v = _new(nt, 'ShaderNodeTexVoronoi', "cells", (-580, -650))
    v.feature = 'F1'
    if hasattr(v, "voronoi_dimensions"):
        try:
            v.voronoi_dimensions = '2D'
        except Exception:
            pass
    _sock_in(v, "Scale", 28.0)
    if v.inputs.get("Randomness") is not None:
        _sock_in(v, "Randomness", 0.0)   # regular staggered lattice
    L.new(tex.outputs["Object"], v.inputs["Vector"])
    lt = _new(nt, 'ShaderNodeMath', "hole_mask", (-320, -650))
    lt.operation = 'LESS_THAN'
    _sock_in(lt, 1, 0.30)
    L.new(v.outputs["Distance"], lt.inputs[0])
    alpha = _new(nt, 'ShaderNodeMath', "alpha", (-100, -650))
    alpha.operation = 'SUBTRACT'
    _sock_in(alpha, 0, 1.0)
    L.new(lt.outputs[0], alpha.inputs[1])
    if p.inputs.get("Alpha") is not None:
        L.new(alpha.outputs[0], p.inputs["Alpha"])
    if p.inputs.get("Roughness") is not None:
        try:
            p.inputs["Roughness"].default_value = 0.55
        except Exception:
            pass


# ---------------------------------------------------------- make_materials -----
def make_materials(P=None):
    P = P or PARAMS
    made = []
    make_edgewear_nodegroup()

    m = _ensure_mat("MAT_powdercoat_black")
    _build_powdercoat_core(m.node_tree, with_edgewear=True)
    made.append(m.name)

    m = _ensure_mat("MAT_tread_alu")
    p, o, bb = _build_powdercoat_core(m.node_tree, with_edgewear=True)
    _add_plank_ribs(m.node_tree, p, bb)
    made.append(m.name)

    m = _ensure_mat("MAT_tread_checker")
    p, o, bb = _build_powdercoat_core(m.node_tree, with_edgewear=True)
    _add_durbar(m.node_tree, p, bb)
    made.append(m.name)

    m = _ensure_mat("MAT_tread_grating")
    p, o, bb = _build_powdercoat_core(m.node_tree, with_edgewear=True)
    _add_perforation(m.node_tree, p, o)
    _set_alpha_cutout(m)
    made.append(m.name)

    # handrail grip: rope default (tan), WPC charcoal exposed as custom prop
    m = _ensure_mat("MAT_handrail_grip")
    nt = m.node_tree
    out = _new(nt, 'ShaderNodeOutputMaterial', "out", (700, 0))
    pr = _new(nt, 'ShaderNodeBsdfPrincipled', "rope", (380, 0))
    _set_principled(pr, base=_ROPE_TAN, metallic=0.0, rough=0.85)
    tw = _new(nt, 'ShaderNodeTexWave', "twist", (-220, -260))
    tw.wave_type = 'BANDS'
    tw.bands_direction = 'DIAGONAL'
    _sock_in(tw, "Scale", 90.0)
    _sock_in(tw, "Distortion", 2.0)
    nz = _noise(nt, "fibre", (-220, -460), 200.0, 2.0)
    add = _new(nt, 'ShaderNodeMath', "twist_add", (20, -360))
    add.operation = 'ADD'
    nt.links.new(tw.outputs["Fac"], add.inputs[0])
    nt.links.new(nz.outputs["Fac"], add.inputs[1])
    bp = _new(nt, 'ShaderNodeBump', "twist_bump", (180, -360))
    _sock_in(bp, "Strength", 0.4)
    _sock_in(bp, "Distance", 0.0015)
    nt.links.new(add.outputs[0], bp.inputs["Height"])
    if pr.inputs.get("Normal") is not None:
        nt.links.new(bp.outputs["Normal"], pr.inputs["Normal"])
    nt.links.new(pr.outputs[0], out.inputs["Surface"])
    m["grip_alt_wpc"] = list(_WPC_CHARCOAL)   # exposed alt colour
    made.append(m.name)

    # hardware oxide: dark A4 stainless, rubbed-bright bearing faces
    m = _ensure_mat("MAT_hardware_oxide")
    p, o, bb = _build_powdercoat_core(m.node_tree, with_edgewear=True,
                                      base_color=_OXIDE_SS, rough=0.55)
    _set_principled(p, metallic=1.0, rough=0.55)   # base is driven by dirt mix
    alu = m.node_tree.nodes.get("alu_chip")
    if alu is not None:   # chip target -> bright stainless, not bare aluminium
        _set_principled(alu, base=_BRIGHT_SS, metallic=1.0, rough=0.2)
    made.append(m.name)

    return {"materials": made,
            "nodegroups": [ng.name for ng in bpy.data.node_groups
                           if ng.name == "NG_edgewear"]}


# ------------------------------------------------ tread material switching -----
def _treads():
    return [bpy.data.objects.get(f"Tread_{i}")
            for i in range(1, PARAMS["n_cells"] + 1)]


def set_tread_material(name):
    """Re-skin all treads. Accepts enum (alu_plank|steel_checker|punched_grating)
    or a MAT_tread_* name. All 3 slots are kept in fixed order [alu,checker,grating];
    every face is pointed at the chosen slot. Also mirrors to arm['tread_material']."""
    if bpy.data.materials.get("MAT_tread_alu") is None:
        make_materials()
    idx = _TREAD_ENUM.get(name)
    if idx is None and name in _TREAD_MAT_NAMES:
        idx = _TREAD_MAT_NAMES.index(name)
    if idx is None:
        idx = 0
    for ob in _treads():
        if ob is None:
            continue
        me = ob.data
        while len(me.materials) < 3:
            me.materials.append(None)
        for s, mn in enumerate(_TREAD_MAT_NAMES):
            me.materials[s] = bpy.data.materials.get(mn)
        for poly in me.polygons:
            poly.material_index = idx
        ob.active_material_index = idx
    arm = bpy.data.objects.get("STAIR_RIG")
    if arm is not None:
        arm["tread_material"] = idx
    return {"tread_material": _TREAD_MAT_NAMES[idx], "index": idx}


def _assign_single(obj_name, mat_name):
    ob = bpy.data.objects.get(obj_name)
    if ob is None or not hasattr(ob.data, "materials"):
        return False
    mat = bpy.data.materials.get(mat_name)
    if mat is None:
        return False
    me = ob.data
    if len(me.materials) == 0:
        me.materials.append(mat)
    else:
        me.materials[0] = mat
    for poly in getattr(me, "polygons", []):
        poly.material_index = 0
    return True


def assign_materials(P=None):
    P = P or PARAMS
    if bpy.data.materials.get("MAT_powdercoat_black") is None:
        make_materials(P)
    report = {"powdercoat": [], "treads": None, "grip": [], "hardware": []}

    for nm in ("Stringer_struct", "Base_frame", "Clamps_struct",
               "Handrail_L", "Handrail_R"):
        if _assign_single(nm, "MAT_powdercoat_black"):
            report["powdercoat"].append(nm)

    report["treads"] = set_tread_material(P.get("tread_material", "alu_plank"))

    # grip-sleeve geometry (best-effort name probing across milestones)
    for nm in ("Handrail_grip_L", "Handrail_grip_R", "Grip_L", "Grip_R",
               "Handrail_grip"):
        if _assign_single(nm, "MAT_handrail_grip"):
            report["grip"].append(nm)

    # hardware: pawls + any pin/clip/coupler/fastener parts
    hw = [f"Pawl_{i}" for i in range(0, PARAMS["n_cells"] + 1)]
    hw += [o.name for o in bpy.data.objects
           if any(k in o.name.lower() for k in ("pin", "clip", "coupler",
                                                "clamp_hw", "fastener", "bolt"))]
    seen = set()
    for nm in hw:
        if nm in seen:
            continue
        seen.add(nm)
        if _assign_single(nm, "MAT_hardware_oxide"):
            report["hardware"].append(nm)
    return report


# ------------------------------------------------------------- setup_lighting --
def setup_lighting():
    sc = bpy.context.scene
    sc.render.engine = "BLENDER_EEVEE"

    # --- world: neutral grey, soft gradient (no HDRI dependency), exposed strength
    w = bpy.data.worlds.get("WLD_studio") or bpy.data.worlds.new("WLD_studio")
    sc.world = w
    w.use_nodes = True
    nt = w.node_tree
    nt.nodes.clear()
    wout = _new(nt, 'ShaderNodeOutputWorld', "wout", (520, 0))
    bg = _new(nt, 'ShaderNodeBackground', "bg", (300, 0))
    grad = _new(nt, 'ShaderNodeTexGradient', "grad", (-160, -120))
    ramp = _new(nt, 'ShaderNodeValToRGB', "sky_ramp", (60, -120))
    ramp.color_ramp.elements[0].color = (0.02, 0.02, 0.025, 1.0)
    ramp.color_ramp.elements[1].color = (0.08, 0.08, 0.09, 1.0)
    tco = _new(nt, 'ShaderNodeTexCoord', "wtc", (-380, -120))
    nt.links.new(tco.outputs["Generated"], grad.inputs["Vector"])
    nt.links.new(grad.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], bg.inputs["Color"])
    bg.inputs["Strength"].default_value = 1.0
    nt.links.new(bg.outputs["Background"], wout.inputs["Surface"])
    w["bg_strength"] = 1.0   # exposed strength readout

    rig = _get_coll("StudioLights")

    def _area(name, loc, rot, energy, size, kelvin, color):
        l = bpy.data.lights.get(name)
        if l is None:
            l = bpy.data.lights.new(name, 'AREA')
        l.type = 'AREA'
        l.shape = 'RECTANGLE'
        l.size = size
        l.size_y = size * 0.7
        l.energy = energy
        if hasattr(l, "use_temperature"):
            try:
                l.use_temperature = True
                l.temperature = kelvin
            except Exception:
                l.color = color
        else:
            l.color = color
        if hasattr(l, "shadow_soft_size"):
            l.shadow_soft_size = 0.5   # soft raytraced shadows
        ob = bpy.data.objects.get(name)
        if ob is None:
            ob = bpy.data.objects.new(name, l)
            rig.objects.link(ob)
        else:
            ob.data = l
            if ob.name not in rig.objects:
                for c in list(ob.users_collection):
                    c.objects.unlink(ob)
                rig.objects.link(ob)
        ob.location = loc
        ob.rotation_euler = rot
        return ob

    # 3-point rig: warm key front-cam-left, cool fill cam-right ~1/3, cool rim/back
    _area("Key_Light", (-4.5, -4.5, 4.5),
          (math.radians(55), 0, math.radians(-42)),
          900.0, 3.0, 5500.0, (1.0, 0.96, 0.90))
    _area("Fill_Light", (5.0, -3.5, 2.6),
          (math.radians(72), 0, math.radians(52)),
          300.0, 3.5, 6500.0, (0.86, 0.92, 1.0))
    _area("Rim_Light", (1.0, 5.0, 4.0),
          (math.radians(-62), 0, math.radians(8)),
          600.0, 2.5, 6000.0, (0.95, 0.97, 1.0))

    # --- large grey ground / backdrop plane ---
    gname = "Studio_Ground"
    g = bpy.data.objects.get(gname)
    if g is None:
        me = bpy.data.meshes.new(gname)
        verts = [(-30, -30, -0.02), (30, -30, -0.02),
                 (30, 30, -0.02), (-30, 30, -0.02)]
        me.from_pydata(verts, [], [(0, 1, 2, 3)])
        me.update()
        g = bpy.data.objects.new(gname, me)
        rig.objects.link(g)
    gm = bpy.data.materials.get("MAT_studio_ground")
    if gm is None:
        gm = bpy.data.materials.new("MAT_studio_ground")
    gm.use_nodes = True
    gm.node_tree.nodes.clear()
    go = _new(gm.node_tree, 'ShaderNodeOutputMaterial', "out", (300, 0))
    gp = _new(gm.node_tree, 'ShaderNodeBsdfPrincipled', "p", (0, 0))
    _set_principled(gp, base=(0.18, 0.18, 0.19, 1.0), metallic=0.0, rough=0.8)
    gm.node_tree.links.new(gp.outputs[0], go.inputs["Surface"])
    if len(g.data.materials) == 0:
        g.data.materials.append(gm)
    else:
        g.data.materials[0] = gm

    # --- EEVEE-Next render flags (all confirmed in 5.1 SceneEEVEE, still guarded)
    ee = sc.eevee
    if hasattr(ee, "use_raytracing"):
        ee.use_raytracing = True
    if hasattr(ee, "ray_tracing_method"):
        try:
            ee.ray_tracing_method = 'SCREEN'
        except Exception:
            pass
    if hasattr(ee, "use_shadows"):
        ee.use_shadows = True
    if hasattr(ee, "use_fast_gi"):
        ee.use_fast_gi = True
    if hasattr(ee, "shadow_ray_count"):
        try:
            ee.shadow_ray_count = 2          # range [1,4]
        except Exception:
            pass
    if hasattr(ee, "shadow_step_count"):
        try:
            ee.shadow_step_count = 6         # range [1,16]
        except Exception:
            pass
    if hasattr(ee, "taa_render_samples"):
        ee.taa_render_samples = 128
    try:
        sc.view_settings.view_transform = 'AgX'
    except Exception:
        pass
    return {"world": w.name,
            "lights": ["Key_Light", "Fill_Light", "Rim_Light"],
            "ground": gname,
            "raytracing": getattr(ee, "use_raytracing", None),
            "view_transform": sc.view_settings.view_transform}

# ######################## integrated module: m6_showcase.py ########################

# ===================================================================== M6 ===
# SHOWCASE: a 10-beat NLA story on STAIR_RIG + a camera rig, played LIVE in
# EEVEE Next (no mp4 export). ONE master Action keys ONLY the STAIR_RIG custom
# props + Fold_Handle.location; it is sliced into 10 sequential strips on a
# SINGLE NLA track (one strip per beat). A separate camera-rig Action drives the
# orbit + dolly zoom on Camera_Show.location.
#
# 5.1.2 NOTES (verified against bundled docs + a live throwaway-datablock probe):
#   * Actions are SLOTTED/LAYERED in 5.1 (no act.fcurves). F-Curves live in
#     act.layers[L].strips[S].channelbag(slot). slots.new(id_type='OBJECT',
#     name=...) and ad.action_slot=slot are the canonical bind (docs quickstart).
#   * SILENT-CHANNEL trap: assigning ad.action=act then keying THROUGH the object
#     auto-creates AND binds ad.action_slot. We additionally bind the slot
#     explicitly (instance-hasattr guarded) and bind strip.action_slot after push.
#   * channelbag(slot, *, ensure=False): we read with ensure omitted (the bag
#     already exists after keying); for the membership/slot guards we never reuse
#     a slot that does not belong to the current action (stale-slot trap fix).
#   * NlaTracks.new(*, prev=None); NlaStrips.new(name, start, action) action!=None.
#   * ***NLA STACKING FIX***: per the manual, a strip set to HOLD holds its first
#     keyframe backward ONLY IF it is the FIRST strip in its track, and holds its
#     last keyframe forward UP TO THE NEXT STRIP. If every beat sat on its own
#     track, every strip would be "first in track" -> every track holds its full
#     range over the whole timeline, and the TOP track (beat 10) would win
#     everywhere (REPLACE), collapsing the story to its last pose. So all 10 beats
#     go on ONE track, sequentially; HOLD then fills the gaps to the next strip
#     and only beat 1 holds backward. This reproduces the master timeline exactly.

SHOW_FPS = 30
SHOW_ACTION = "STAIR_Showcase"
CAM_ACTION = "Camera_Show_Action"
SHOW_START, SHOW_END = 1, 1620
SHOW_TRACK = "SHOW_Story"

# the 7 NON-driven custom props the showcase keys (fold_angle is DRIVEN -> never keyed;
# the fold itself is driven by keying Fold_Handle.location).
_SHOW_PROPS = ("split_amount", "handrail_attached_L", "handrail_attached_R",
               "unit2_slide", "half_extend", "stack_amount", "tread_material")

# Fold_Handle local-Y travel for each detent (mirrors set_fold: ly = (deg-33.69)/90)
_LY_FLAT   = (0.0   - 33.69) / 90.0
_LY_STAIR  = (33.69 - 33.69) / 90.0
_LY_LADDER = (75.0  - 33.69) / 90.0


# ---------------------------------------------------------------- helpers ----
def _ensure_show_props(arm):
    """Create the non-driven showcase custom props with sane defaults if absent.
    Their REST/start state: handrails attached (=1), everything else 0, tread=0."""
    defaults = dict(split_amount=0.0, handrail_attached_L=1.0, handrail_attached_R=1.0,
                    unit2_slide=0.0, half_extend=0.0, stack_amount=0.0, tread_material=0)
    for k, v in defaults.items():
        if k not in arm.keys():
            arm[k] = v
            try:
                if k == "tread_material":
                    arm.id_properties_ui(k).update(min=0, max=2, soft_min=0, soft_max=2)
                else:
                    arm.id_properties_ui(k).update(min=0.0, max=1.0, soft_min=0.0, soft_max=1.0)
            except Exception:
                pass
    return defaults


def _slot_in_action(slot, act):
    """True if `slot` belongs to `act` (identity over the slotted-action collection)."""
    if slot is None or not hasattr(act, "slots"):
        return False
    try:
        for s in act.slots:
            if s == slot:
                return True
    except Exception:
        return False
    return False


def _bind_slot(ad, act, id_type='OBJECT', slot_name="Showcase"):
    """Bind an action slot to anim-data so keyed channels are not silent (5.1 slotted).
    Idempotent + guarded for both slotted and legacy builds. Never reuses a slot that
    belongs to a DIFFERENT (e.g. just-removed) action -- that is the stale-slot trap."""
    if not hasattr(ad, "action_slot") or not hasattr(act, "slots"):
        return None                                   # legacy build: nothing to do
    try:
        # only reuse the currently-bound slot if it actually belongs to THIS action
        if _slot_in_action(ad.action_slot, act):
            return ad.action_slot
        if len(act.slots):
            ad.action_slot = act.slots[0]
        else:
            try:
                slot = act.slots.new(id_type=id_type, name=slot_name)
            except TypeError:
                slot = act.slots.new(id_type, slot_name)   # positional fallback
            ad.action_slot = slot
        return ad.action_slot
    except Exception:
        return None


def _act_fcurves(act, slot):
    """Yield every F-Curve in a (layered or legacy) action for the given slot."""
    if hasattr(act, "layers"):                        # 5.1 slotted/layered
        for layer in act.layers:
            for strip in layer.strips:
                cb = None
                if slot is not None and hasattr(strip, "channelbag"):
                    try:
                        cb = strip.channelbag(slot)
                    except Exception:
                        cb = None
                if cb is None and hasattr(strip, "channelbags"):
                    for c in strip.channelbags:
                        for fc in c.fcurves:
                            yield fc
                    continue
                if cb is not None:
                    for fc in cb.fcurves:
                        yield fc
    elif hasattr(act, "fcurves"):                     # legacy fallback
        for fc in act.fcurves:
            yield fc


def _key(obj, data_path, value, frame):
    """Set the property value then insert a keyframe through the OBJECT (auto-binds the
    slot on first key). Scalar / custom-id-prop path only (the showcase never keys a
    single vector ELEMENT through this -- vectors go through _key_vec)."""
    if data_path.startswith('['):                     # custom id-prop, e.g. ["split_amount"]
        obj[data_path[2:-2]] = value                  # strip the [" ... "]
    else:                                             # plain scalar attribute path
        try:
            obj.path_resolve(".".join(data_path.split(".")[:-1]) or "id_data")
        except Exception:
            pass
        # scalar attribute assignment via the owning struct
        parent_path = ".".join(data_path.split(".")[:-1])
        leaf = data_path.split(".")[-1]
        owner = obj.path_resolve(parent_path) if parent_path else obj
        try:
            setattr(owner, leaf, value)
        except Exception:
            pass
    obj.keyframe_insert(data_path=data_path, frame=frame)


def _key_vec(obj, data_path, vec, frame):
    """Key a vector property (e.g. a pose-bone location or object location)."""
    tgt = obj.path_resolve(data_path)
    for i in range(len(tgt)):
        tgt[i] = vec[i]
    obj.keyframe_insert(data_path=data_path, frame=frame)


def _set_interp_pass(act, slot):
    """Default everything to Bezier Ease-In-Out with auto-clamped handles.
    (Per-beat overrides for CONSTANT detents / sharp pin-snaps are applied after.)"""
    for fc in _act_fcurves(act, slot):
        for kp in fc.keyframe_points:
            kp.interpolation = 'BEZIER'
            kp.easing = 'EASE_IN_OUT'
            kp.handle_left_type = 'AUTO_CLAMPED'
            kp.handle_right_type = 'AUTO_CLAMPED'
        fc.update()


def _stepify(act, slot, data_path, lo, hi, index=None):
    """Make keyframes in [lo,hi] CONSTANT (stepped) -> clamp/detent ARRIVAL snap."""
    for fc in _act_fcurves(act, slot):
        if fc.data_path != data_path:
            continue
        if index is not None and fc.array_index != index:
            continue
        for kp in fc.keyframe_points:
            if lo - 0.5 <= kp.co[0] <= hi + 0.5:
                kp.interpolation = 'CONSTANT'
        fc.update()


def _snap_easeout(act, slot, data_path, lo, hi):
    """Sharp Ease-Out arrival -> handrail PIN SNAP (fast then settle)."""
    for fc in _act_fcurves(act, slot):
        if fc.data_path != data_path:
            continue
        for kp in fc.keyframe_points:
            if lo - 0.5 <= kp.co[0] <= hi + 0.5:
                kp.interpolation = 'BEZIER'
                kp.easing = 'EASE_OUT'
                kp.handle_left_type = 'AUTO_CLAMPED'
                kp.handle_right_type = 'VECTOR'
        fc.update()


def _window_override():
    """Build a temp_override dict with a window/screen/area suitable for screen.* ops."""
    win = bpy.context.window
    if not win:
        wm = bpy.context.window_manager
        win = wm.windows[0] if (wm and len(wm.windows)) else None
    if not win or not getattr(win, "screen", None):
        return {}
    ov = {"window": win, "screen": win.screen}
    for area in win.screen.areas:
        if area.type == 'VIEW_3D':
            ov["area"] = area
            ov["region"] = next((r for r in area.regions if r.type == 'WINDOW'), None)
            break
    return ov


# ----------------------------------------------------- the 10-beat story -----
def build_showcase(P=None):
    """Author the master STAIR_Showcase action (custom props + Fold_Handle.location),
    slice it into 10 sequential strips on ONE NLA track, and build the camera rig.
    Idempotent."""
    P = P or PARAMS
    arm = bpy.data.objects.get("STAIR_RIG")
    if arm is None:
        return {"error": "STAIR_RIG not found - run build_core() first"}

    _ensure_show_props(arm)

    ad = arm.animation_data or arm.animation_data_create()

    # --- idempotent rebuild: drop any prior showcase tracks + action (keep drivers) ---
    for trk in list(ad.nla_tracks):
        if trk.name.startswith("SHOW_"):
            ad.nla_tracks.remove(trk)
    old = bpy.data.actions.get(SHOW_ACTION)
    if old:
        try:
            bpy.data.actions.remove(old)
        except Exception:
            pass

    act = bpy.data.actions.new(SHOW_ACTION)
    act.use_fake_user = True
    ad.action = act
    slot = _bind_slot(ad, act, id_type='OBJECT', slot_name="Showcase")

    FH = 'pose.bones["Fold_Handle"].location'

    def kp(name, value, frame):                       # custom prop key
        _key(arm, '["%s"]' % name, value, frame)

    def kf(ly, frame):                                # Fold_Handle.location.y key (drives fold)
        _key_vec(arm, FH, (0.0, ly, 0.0), frame)

    # ---- START state baked at frame 1 (everything keyed so strips have full channels) ----
    kp("handrail_attached_L", 1.0, 1)
    kp("handrail_attached_R", 1.0, 1)
    kp("split_amount", 0.0, 1)
    kp("unit2_slide", 0.0, 1)
    kp("half_extend", 0.0, 1)
    kp("stack_amount", 0.0, 1)
    kp("tread_material", 0, 1)
    kf(_LY_STAIR, 1)

    # ---- Beat 1  IntroOrbit (1-180): hold start; camera does the work ----
    kp("handrail_attached_L", 1.0, 180)
    kp("handrail_attached_R", 1.0, 180)
    kf(_LY_STAIR, 180)

    # ---- Beat 2  Rail L off (181-330): handrail_attached_L 1 -> 0 ----
    kp("handrail_attached_L", 1.0, 181)
    kp("handrail_attached_L", 0.0, 330)
    kp("handrail_attached_R", 1.0, 330)

    # ---- Beat 3  Rail R off (331-480): handrail_attached_R 1 -> 0 ----
    kp("handrail_attached_R", 1.0, 331)
    kp("handrail_attached_R", 0.0, 480)
    kp("handrail_attached_L", 0.0, 480)

    # ---- Beat 4  Rails on (481-600): both -> 1 (pin SNAP) ----
    kp("handrail_attached_L", 0.0, 481)
    kp("handrail_attached_R", 0.0, 481)
    kp("handrail_attached_L", 1.0, 600)
    kp("handrail_attached_R", 1.0, 600)

    # ---- Beat 5  Fold flat (601-810): rails -> 0 by 660 (HARD GATE), then Fold_Handle to FLAT ----
    kp("handrail_attached_L", 1.0, 601)
    kp("handrail_attached_R", 1.0, 601)
    kp("handrail_attached_L", 0.0, 660)               # gate: rails must be down before folding
    kp("handrail_attached_R", 0.0, 660)
    kf(_LY_STAIR, 660)
    kf(_LY_FLAT, 810)
    kp("handrail_attached_L", 0.0, 810)
    kp("handrail_attached_R", 0.0, 810)

    # ---- Beat 6  Unfold range (811-1050): STAIR -> LADDER -> STAIR via Fold_Handle ----
    kf(_LY_FLAT, 811)
    kf(_LY_STAIR, 880)
    kf(_LY_LADDER, 970)
    kf(_LY_STAIR, 1050)

    # ---- Beat 7  Split (1051-1200): split_amount 0 -> 1 ----
    kp("split_amount", 0.0, 1051)
    kp("split_amount", 1.0, 1200)

    # ---- Beat 8  Modular connect (1201-1410): split 1 -> 0, then unit2_slide 0 -> 1 ----
    kp("split_amount", 1.0, 1201)
    kp("split_amount", 0.0, 1290)
    kp("unit2_slide", 0.0, 1290)
    kp("unit2_slide", 1.0, 1410)                      # camera zoom-in ~1320, zoom-out ~1410

    # ---- Beat 9  Ladder stack (1411-1560): split 0 -> 1, half_extend -> ladder, stack end-to-end ----
    kp("unit2_slide", 1.0, 1411)
    kp("split_amount", 0.0, 1411)
    kp("split_amount", 1.0, 1470)
    kp("half_extend", 0.0, 1411)
    kp("half_extend", 1.0, 1480)
    kf(_LY_STAIR, 1411)
    kf(_LY_LADDER, 1490)                              # fold to ladder pitch for the stack
    kp("stack_amount", 0.0, 1430)
    kp("stack_amount", 1.0, 1560)

    # ---- Beat 10  Reset (1561-1620): all props to START (handrails 1, fold STAIR, rest 0) ----
    kf(_LY_LADDER, 1561)
    kf(_LY_STAIR, 1620)
    kp("split_amount", 1.0, 1561)
    kp("split_amount", 0.0, 1620)
    kp("half_extend", 1.0, 1561)
    kp("half_extend", 0.0, 1620)
    kp("stack_amount", 1.0, 1561)
    kp("stack_amount", 0.0, 1620)
    kp("unit2_slide", 1.0, 1561)
    kp("unit2_slide", 0.0, 1620)
    kp("handrail_attached_L", 0.0, 1561)
    kp("handrail_attached_R", 0.0, 1561)
    kp("handrail_attached_L", 1.0, 1620)
    kp("handrail_attached_R", 1.0, 1620)
    kp("tread_material", 0, 1620)

    # re-resolve slot (auto-bound on first key if _bind_slot returned None on a fresh slot)
    if slot is None and hasattr(ad, "action_slot") and _slot_in_action(ad.action_slot, act):
        slot = ad.action_slot

    # ---- INTERPOLATION PASS ----
    _set_interp_pass(act, slot)                                   # base: Bezier Ease-In-Out
    # detent ARRIVALS -> CONSTANT in the last ~3 frames (clamp/snap settle)
    _stepify(act, slot, FH, 807, 810, index=1)                   # FLAT arrival
    _stepify(act, slot, FH, 967, 970, index=1)                   # LADDER apex (beat 6)
    _stepify(act, slot, FH, 1047, 1050, index=1)                 # back-to-STAIR
    _stepify(act, slot, FH, 1487, 1490, index=1)                 # LADDER for stack
    _stepify(act, slot, FH, 1617, 1620, index=1)                 # reset STAIR detent
    _stepify(act, slot, '["split_amount"]', 1197, 1200)          # split fully open detent
    _stepify(act, slot, '["unit2_slide"]', 1407, 1410)           # coupler engaged detent
    _stepify(act, slot, '["half_extend"]', 1477, 1480)           # half locked
    _stepify(act, slot, '["stack_amount"]', 1557, 1560)          # stack seated
    _stepify(act, slot, '["tread_material"]', 1, 1620)           # int prop: always stepped
    # handrail PIN SNAPS -> sharp Ease-Out on the re-attach arrivals
    _snap_easeout(act, slot, '["handrail_attached_L"]', 597, 600)
    _snap_easeout(act, slot, '["handrail_attached_R"]', 597, 600)
    _snap_easeout(act, slot, '["handrail_attached_L"]', 1617, 1620)
    _snap_easeout(act, slot, '["handrail_attached_R"]', 1617, 1620)

    # ---- PUSH DOWN: ONE NLA track, 10 SEQUENTIAL strips, each slicing the master action.
    #      (Single track so HOLD fills each gap up to the next strip instead of every
    #       track holding its whole range and the top one winning the entire timeline.) ----
    beats = [
        ("01_IntroOrbit",      1,    180),
        ("02_RailL_off",       181,  330),
        ("03_RailR_off",       331,  480),
        ("04_Rails_on",        481,  600),
        ("05_Fold_flat",       601,  810),
        ("06_Unfold_range",    811,  1050),
        ("07_Split",           1051, 1200),
        ("08_Modular_connect", 1201, 1410),
        ("09_Ladder_stack",    1411, 1560),
        ("10_Reset",           1561, 1620),
    ]
    trk = ad.nla_tracks.new()
    trk.name = SHOW_TRACK
    strips_made = []
    for (nm, a, b) in beats:
        # shrink-as-we-go: each new strip starts strictly after the previous strip's
        # (already-shrunk) end, so strips.new never produces an overlap.
        strip = trk.strips.new(nm, int(a), act)       # action must be non-None
        strip.frame_start = float(a)
        strip.frame_end = float(b)
        try:
            strip.action_frame_start = float(a)
            strip.action_frame_end = float(b)
        except Exception:
            pass
        strip.extrapolation = 'HOLD'                  # fills the gap up to the NEXT strip
        strip.blend_type = 'REPLACE'
        # bind strip slot so the strip is NOT silent (5.1 slotted-actions)
        if hasattr(strip, "action_slot") and slot is not None and strip.action_slot is None:
            try:
                strip.action_slot = slot
            except Exception:
                pass
        strip.mute = False
        strips_made.append(strip.name)

    # push-down complete: clear the active action so the NLA stack drives evaluation
    ad.action = None

    # ---- camera rig (its own action) ----
    cam_info = _build_camera_rig(P)

    sc = bpy.context.scene
    sc.render.fps = SHOW_FPS
    sc.frame_start = SHOW_START
    sc.frame_end = SHOW_END

    return {"action": act.name, "slot": (slot.identifier if slot else None),
            "track": trk.name, "strips": strips_made, "n_strips": len(strips_made),
            "fps": SHOW_FPS, "frame_range": [SHOW_START, SHOW_END],
            "camera": cam_info}


# ------------------------------------------------------------ camera rig -----
def _build_camera_rig(P=None):
    """Camera_Show (50mm) Track-To CamTarget; its own Action keys the orbit boom +
    the dolly zoom-in(CLOSE)/zoom-out(WIDE) as a single location track on ONE NLA
    strip. Idempotent."""
    P = P or PARAMS
    sc = bpy.context.scene

    # CamTarget (reuse the preview target if present)
    tgt = bpy.data.objects.get("CamTarget")
    if tgt is None:
        tgt = bpy.data.objects.new("CamTarget", None)
        sc.collection.objects.link(tgt)
        tgt.location = (0.9, 0.0, 0.55)

    # Conn_Empty at a plausible side-coupler spot (mechanism code repositions later)
    conn = bpy.data.objects.get("Conn_Empty")
    if conn is None:
        conn = bpy.data.objects.new("Conn_Empty", None)
        conn.empty_display_type = 'PLAIN_AXES'
        conn.empty_display_size = 0.1
        sc.collection.objects.link(conn)
    D = derived(P)
    conn.location = (0.0, -(D["W"] / 2.0 + 0.05), 0.30)   # near x=0, at the side coupler

    # Camera_Show 50mm
    cam = bpy.data.objects.get("Camera_Show")
    if cam is None:
        cd = bpy.data.cameras.new("Camera_Show")
        cam = bpy.data.objects.new("Camera_Show", cd)
        sc.collection.objects.link(cam)
    cam.data.lens = 50.0
    cam.data.clip_start = 0.05
    cam.data.clip_end = 1000.0

    # Track-To CamTarget (rebuild constraint cleanly)
    for cns in list(cam.constraints):
        cam.constraints.remove(cns)
    tc = cam.constraints.new('TRACK_TO')
    tc.target = tgt
    tc.track_axis = 'TRACK_NEGATIVE_Z'
    tc.up_axis = 'UP_Y'

    # camera animation_data + dedicated action (separate from the rig action)
    cad = cam.animation_data or cam.animation_data_create()
    for trk in list(cad.nla_tracks):
        if trk.name.startswith("SHOW_CAM"):
            cad.nla_tracks.remove(trk)
    old = bpy.data.actions.get(CAM_ACTION)
    if old:
        try:
            bpy.data.actions.remove(old)
        except Exception:
            pass
    cact = bpy.data.actions.new(CAM_ACTION)
    cact.use_fake_user = True
    cad.action = cact
    cslot = _bind_slot(cad, cact, id_type='OBJECT', slot_name="CamShow")

    cx, cy, cz = conn.location

    def ck(loc, frame):
        _key_vec(cam, "location", loc, frame)

    import math as _m
    R = 6.2                                            # orbit radius
    H = 3.2                                            # orbit height
    # ---- Beats 1-7: slow 3/4 orbit (CamTarget framed) ----
    ck((R * _m.cos(_m.radians(-120)), R * _m.sin(_m.radians(-120)), H), 1)
    ck((R * _m.cos(_m.radians(-60)),  R * _m.sin(_m.radians(-60)),  H), 180)
    ck((R * _m.cos(_m.radians(-30)),  R * _m.sin(_m.radians(-30)),  H), 480)
    ck((R * _m.cos(_m.radians(10)),   R * _m.sin(_m.radians(10)),   H), 810)
    ck((R * _m.cos(_m.radians(40)),   R * _m.sin(_m.radians(40)),   H * 0.9), 1050)
    ck((R * _m.cos(_m.radians(70)),   R * _m.sin(_m.radians(70)),   H * 0.85), 1200)
    # ---- Beat 8: dolly ZOOM-IN (CLOSE) on Conn_Empty ~1320, then ZOOM-OUT (WIDE) ~1410 ----
    ck((cx + 0.55, cy - 0.55, cz + 0.35), 1290)        # approach
    ck((cx + 0.22, cy - 0.22, cz + 0.14), 1320)        # CLOSE on coupler
    ck((R * _m.cos(_m.radians(90)), R * _m.sin(_m.radians(90)), H), 1410)   # WIDE pull-out
    # ---- Beat 9: CLOSE on splice, then pull back ----
    sx, sy, sz = 0.0, -(D["W"] / 2.0 + 0.05), 0.75     # splice region (ladder stack edge)
    ck((sx + 0.45, sy - 0.45, sz + 0.30), 1470)
    ck((sx + 0.20, sy - 0.20, sz + 0.12), 1505)        # CLOSE on splice
    ck((R * _m.cos(_m.radians(110)), R * _m.sin(_m.radians(110)), H), 1560) # pull back
    # ---- Beat 10: settle to a clean hero 3/4 ----
    ck((R * _m.cos(_m.radians(125)), R * _m.sin(_m.radians(125)), H), 1620)

    if cslot is None and hasattr(cad, "action_slot") and _slot_in_action(cad.action_slot, cact):
        cslot = cad.action_slot
    _set_interp_pass(cact, cslot)                       # smooth Bezier Ease-In-Out moves
    # snappy arrival on the two CLOSE pushes (sharp Ease-Out feel)
    _snap_easeout(cact, cslot, "location", 1317, 1320)
    _snap_easeout(cact, cslot, "location", 1502, 1505)

    # push camera action to a single NLA strip then clear active action
    trk = cad.nla_tracks.new()
    trk.name = "SHOW_CAM"
    cstrip = trk.strips.new("CamShow", int(SHOW_START), cact)
    cstrip.frame_start = float(SHOW_START)
    cstrip.frame_end = float(SHOW_END)
    try:
        cstrip.action_frame_start = float(SHOW_START)
        cstrip.action_frame_end = float(SHOW_END)
    except Exception:
        pass
    cstrip.extrapolation = 'HOLD'
    if hasattr(cstrip, "action_slot") and cslot is not None and cstrip.action_slot is None:
        try:
            cstrip.action_slot = cslot
        except Exception:
            pass
    cad.action = None

    # make Camera_Show the scene camera for the live playback
    sc.camera = cam

    return {"camera": cam.name, "target": tgt.name, "conn_empty": conn.name,
            "conn_loc": list(conn.location), "cam_action": cact.name,
            "cam_slot": (cslot.identifier if cslot else None)}


# ----------------------------------------------------------- operators -------
class STAIR_OT_showcase(bpy.types.Operator):
    bl_idname = "stair.showcase"
    bl_label = "Play Folding-Stair Showcase"
    bl_description = "Build (if needed) and play the 10-beat NLA showcase live in EEVEE Next"
    bl_options = {'REGISTER'}

    def execute(self, context):
        arm = bpy.data.objects.get("STAIR_RIG")
        if arm is None:
            self.report({'ERROR'}, "STAIR_RIG not found - run build_core() first")
            return {'CANCELLED'}
        # ensure the showcase exists (idempotent if already built)
        ad = arm.animation_data
        need = (ad is None) or (not any(t.name.startswith("SHOW_") for t in ad.nla_tracks))
        if need:
            build_showcase()
        # un-mute showcase strips (a prior reset may have muted them)
        ad = arm.animation_data
        if ad:
            for trk in ad.nla_tracks:
                if trk.name.startswith("SHOW_"):
                    for s in trk.strips:
                        s.mute = False
        camob = bpy.data.objects.get("Camera_Show")
        if camob:
            context.scene.camera = camob
            cad = camob.animation_data
            if cad:
                for trk in cad.nla_tracks:
                    for s in trk.strips:
                        s.mute = False
        sc = context.scene
        sc.render.fps = SHOW_FPS
        sc.frame_start = SHOW_START
        sc.frame_end = SHOW_END
        sc.frame_set(SHOW_START)
        # screen.animation_play needs a window/screen context
        ov = _window_override()
        try:
            if ov.get("window"):
                with context.temp_override(**ov):
                    bpy.ops.screen.animation_play()
            else:
                bpy.ops.screen.animation_play()
        except Exception as e:
            self.report({'WARNING'}, "Built showcase; could not auto-play (no window): %r" % e)
            return {'FINISHED'}
        self.report({'INFO'}, "Showcase playing: frames %d-%d @ %dfps" % (SHOW_START, SHOW_END, SHOW_FPS))
        return {'FINISHED'}


class STAIR_OT_reset(bpy.types.Operator):
    bl_idname = "stair.reset"
    bl_label = "Reset Folding-Stair Showcase"
    bl_description = "Stop playback, restore the START pose, and mute the showcase strips"
    bl_options = {'REGISTER'}

    def execute(self, context):
        # stop playback if running (needs window context)
        ov = _window_override()
        try:
            scr = context.screen
            if scr and getattr(scr, "is_animation_playing", False):
                if ov.get("window"):
                    with context.temp_override(**ov):
                        bpy.ops.screen.animation_cancel(restore_frame=False)
                else:
                    bpy.ops.screen.animation_cancel(restore_frame=False)
        except Exception:
            pass

        arm = bpy.data.objects.get("STAIR_RIG")
        if arm is None:
            self.report({'ERROR'}, "STAIR_RIG not found")
            return {'CANCELLED'}

        # mute showcase strips so the static restore is what we see
        if arm.animation_data:
            for trk in arm.animation_data.nla_tracks:
                if trk.name.startswith("SHOW_"):
                    for s in trk.strips:
                        s.mute = True
        camob = bpy.data.objects.get("Camera_Show")
        if camob and camob.animation_data:
            for trk in camob.animation_data.nla_tracks:
                for s in trk.strips:
                    s.mute = True

        # restore START state: handrails attached, fold STAIR, everything else 0
        try:
            set_fold(arm, "STAIR")
        except Exception:
            arm.pose.bones["Fold_Handle"].location = (0.0, _LY_STAIR, 0.0)
        arm["handrail_attached_L"] = 1.0
        arm["handrail_attached_R"] = 1.0
        arm["split_amount"] = 0.0
        arm["unit2_slide"] = 0.0
        arm["half_extend"] = 0.0
        arm["stack_amount"] = 0.0
        if "tread_material" in arm.keys():
            arm["tread_material"] = 0
        context.view_layer.update()
        self.report({'INFO'}, "Showcase reset to START pose")
        return {'FINISHED'}


_SHOWCASE_CLASSES = (STAIR_OT_showcase, STAIR_OT_reset)


def register_showcase():
    for cls in _SHOWCASE_CLASSES:
        try:
            bpy.utils.register_class(cls)
        except Exception:
            try:
                bpy.utils.unregister_class(cls)
                bpy.utils.register_class(cls)
            except Exception:
                pass


def unregister_showcase():
    for cls in reversed(_SHOWCASE_CLASSES):
        try:
            bpy.utils.unregister_class(cls)
        except Exception:
            pass


# ######################## integrated module: m7_app.py ########################
# ===================================================================== M7 ===
# In-Blender "Folding Stair" N-panel APP: part picker + hero controls.
# Uses ONLY existing module names (set_fold, derived, _view3d_override, PARAMS,
# _get_coll, ...) + bpy/math/Vector. M3-M8 helpers (set_tread_material,
# export_fab, build_core, set_explode, stair.showcase / stair.reset) are
# referenced defensively: if a later milestone has not been loaded the button
# is shown DISABLED (not drawn live -> would crash the panel) and the operator
# helpers report instead of raising, so M7 always registers + draws cleanly.

# ---- ordering + per-subsystem display icon -----------------------------------
SUBSYSTEM_ORDER = [
    "Stringer", "Treads", "Base", "Clamps",
    "Handrail_L", "Handrail_R", "Joints", "Unit_2",
]
SUBSYSTEM_ICON = {
    "Stringer": 'MOD_SIMPLEDEFORM',
    "Treads": 'MESH_GRID',
    "Base": 'ANCHOR_BOTTOM',
    "Clamps": 'MOD_SCREW',
    "Handrail_L": 'IPO_LINEAR',
    "Handrail_R": 'IPO_LINEAR',
    "Joints": 'EMPTY_AXIS',
    "Unit_2": 'DUPLICATE',
}


# ----------------------------------------------------------- small helpers ----
def _fs_arm():
    """The STAIR_RIG armature object, or None if the rig hasn't been built."""
    return bpy.data.objects.get("STAIR_RIG")


def _fs_call(name, *args, **kwargs):
    """Call a (possibly not-yet-defined) module-level function by name.
    Returns (ok, result_or_msg). Lets M7 reference M3-M8 helpers without a
    hard import-time dependency."""
    fn = globals().get(name)
    if not callable(fn):
        return False, "'%s' not available (load its milestone first)" % name
    try:
        return True, fn(*args, **kwargs)
    except Exception as exc:                       # surface to user, never crash UI
        return False, "%s: %s" % (name, exc)


def _fs_report(op, ok, msg):
    op.report({'INFO'} if ok else {'WARNING'}, str(msg))


def _fs_op_exists(idname):
    """True if operator idname (e.g. 'stair.showcase') is REGISTERED.
    bpy.ops.<grp>.<op> is lazy and never raises on attribute access, so we
    check the generated RNA class name (group.op -> GROUP_OT_op) on bpy.types,
    which only exists once the operator class is registered."""
    if not idname or "." not in idname:
        return False
    head, _, tail = idname.partition(".")
    cls_name = "%s_OT_%s" % (head.upper(), tail)
    return getattr(bpy.types, cls_name, None) is not None


def _fs_draw_op(layout, idname, text=None, icon='NONE'):
    """Draw an operator button ONLY if it is registered; otherwise draw a
    disabled placeholder. Drawing layout.operator() for an UNREGISTERED idname
    raises RuntimeError at draw time and aborts the whole panel (red box) -
    this guard is the fix for the M6-not-loaded case."""
    if _fs_op_exists(idname):
        return layout.operator(idname, text=(text if text is not None else ""),
                               icon=icon)
    sub = layout.row()
    sub.enabled = False
    sub.label(text="%s (load milestone)" % (text or idname), icon='ERROR')
    return None


def _fs_view3d_ctx():
    """A temp_override dict with a CONSISTENT VIEW_3D window/area/region, or {}
    in background mode. Reuses the existing module helper when it yields a real
    region (it can return one without a region)."""
    helper = globals().get("_view3d_override")
    if callable(helper):
        try:
            ov = helper()
            if ov.get("area") and ov.get("region"):
                return ov
        except Exception:
            pass
    win = bpy.context.window
    if not win or not getattr(win, "screen", None):
        return {}
    for area in win.screen.areas:
        if area.type == 'VIEW_3D':
            region = next((r for r in area.regions if r.type == 'WINDOW'), None)
            if region:
                return {"window": win, "area": area, "region": region}
    return {}


def _fs_frame_selected():
    """view3d.view_selected on the active VIEW_3D, guarded for background mode.
    Requires a real region for the override to be valid."""
    ov = _fs_view3d_ctx()
    if not ov.get("area") or not ov.get("region"):
        return False
    try:
        with bpy.context.temp_override(**ov):
            bpy.ops.view3d.view_selected(use_all_regions=False)
        return True
    except Exception:
        return False


def _fs_deselect_all():
    """Deselect every object WITHOUT bpy.ops.object.select_all (the gotcha)."""
    for ob in bpy.data.objects:
        try:
            ob.select_set(False)
        except Exception:
            pass


def _fs_resolve_member(token):
    """JNT_* 'members' is a CSV of part_ids (not object names). Resolve a token
    to an object: prefer an exact object-name match, then fall back to matching
    the 'part_id' custom prop."""
    token = (token or "").strip()
    if not token:
        return None
    ob = bpy.data.objects.get(token)
    if ob is not None:
        return ob
    for cand in bpy.data.objects:
        if cand.get("part_id") == token:
            return cand
    return None


# ============================================================= property update
# These run as PropertyGroup.update callbacks: self == Scene.fs (FS_Params),
# context is the live context. Keep them cheap + re-entrancy aware.
def _upd_fold_angle(self, context):
    arm = _fs_arm()
    if arm is not None:
        _fs_call("set_fold", arm, float(self.fold_angle))


def _upd_state_enum(self, context):
    arm = _fs_arm()
    if arm is None:
        return
    _fs_call("set_fold", arm, self.state_enum)
    # keep the readout slider in sync without re-triggering the fold
    snap = {"FLAT": 0.0, "STAIR": 33.69, "LADDER": 75.0}.get(self.state_enum)
    if snap is not None and abs(self.fold_angle - snap) > 1e-4:
        self["fold_angle"] = snap          # raw write -> no recursive update


def _upd_split(self, context):
    arm = _fs_arm()
    if arm is not None:
        try:
            arm["split_amount"] = float(self.split)
            context.view_layer.update()
        except Exception:
            pass


def _upd_tread_material(self, context):
    # contract: set_tread_material(arm, enum_string); arm["tread_material"] is int
    arm = _fs_arm()
    _fs_call("set_tread_material", arm, self.tread_material)


def _upd_active_index(self, context):
    """Selecting a row -> select+activate the object, frame it, spec follows."""
    parts = self.parts
    idx = self.active_index
    if idx < 0 or idx >= len(parts):
        return
    name = parts[idx].name
    ob = bpy.data.objects.get(name)
    if ob is None:
        return
    _fs_deselect_all()
    try:
        ob.select_set(True)
        context.view_layer.objects.active = ob
    except Exception:
        return
    _fs_frame_selected()


def _subsystem_items(self, context):
    """Dynamic enum: ALL + each subsystem present in scene.fs.parts.
    Must keep a python ref to returned strings (Blender enum-callback gotcha)."""
    items = [("ALL", "All", "Show every subsystem", 'OUTLINER', 0)]
    seen = []
    try:
        for p in context.scene.fs.parts:
            if p.subsystem and p.subsystem not in seen:
                seen.append(p.subsystem)
    except Exception:
        pass
    ordered = [s for s in SUBSYSTEM_ORDER if s in seen]
    ordered += [s for s in seen if s not in SUBSYSTEM_ORDER]
    for i, s in enumerate(ordered):
        items.append((s, s, "Show only %s" % s, SUBSYSTEM_ICON.get(s, 'DOT'), i + 1))
    _subsystem_items._cache = items       # hold a reference (anti-crash)
    return items


# ================================================================ data models
class FS_PartItem(bpy.types.PropertyGroup):
    name: bpy.props.StringProperty(name="Name")            # object name (key)
    part_id: bpy.props.StringProperty(name="Part ID")
    subsystem: bpy.props.StringProperty(name="Subsystem")


class FS_Params(bpy.types.PropertyGroup):
    fold_angle: bpy.props.FloatProperty(
        name="Fold Angle",
        description="0=FLAT 33.69=STAIR 75=LADDER (drives Fold_Handle)",
        default=33.69, min=0.0, max=90.0, subtype='NONE',
        update=_upd_fold_angle)
    state_enum: bpy.props.EnumProperty(
        name="State", description="Snap the fold to a detent",
        items=[("FLAT", "Flat", "Stowed flat", 'SNAP_FACE', 0),
               ("STAIR", "Stair", "33.69 deg stair", 'TRIA_UP_BAR', 1),
               ("LADDER", "Ladder", "75 deg ladder", 'TRIA_UP', 2)],
        default="STAIR", update=_upd_state_enum)
    explode: bpy.props.FloatProperty(
        name="Explode", description="Exploded-view spacing",
        default=0.0, min=0.0, max=1.0, subtype='FACTOR')
    split: bpy.props.FloatProperty(
        name="Split", description="Half-B lateral split (drives split_amount)",
        default=0.0, min=0.0, max=1.0, subtype='FACTOR', update=_upd_split)
    tread_material: bpy.props.EnumProperty(
        name="Tread Material", description="Deck surface",
        items=[("alu_plank", "Alu Plank", "Aluminium plank", 0),
               ("steel_checker", "Steel Checker", "Checker plate", 1),
               ("punched_grating", "Punched Grating", "Punched grating", 2)],
        default="alu_plank", update=_upd_tread_material)
    handrail_l: bpy.props.BoolProperty(name="Handrail L", default=True)
    handrail_r: bpy.props.BoolProperty(name="Handrail R", default=True)
    search: bpy.props.StringProperty(
        name="Search", description="Filter parts by id / name",
        options={'TEXTEDIT_UPDATE'})            # valid 5.1 flag (live filter)
    subsystem_flt: bpy.props.EnumProperty(
        name="Subsystem", description="Filter by subsystem", items=_subsystem_items)
    parts: bpy.props.CollectionProperty(type=FS_PartItem)
    active_index: bpy.props.IntProperty(
        name="Active Part", default=0, min=0, update=_upd_active_index)


# ============================================================ part list (model)
def refresh_part_list(context):
    """(Re)populate scene.fs.parts from every mesh object carrying 'part_id',
    ordered by SUBSYSTEM_ORDER then part_id. Idempotent."""
    fs = getattr(context.scene, "fs", None)
    if fs is None:
        return 0
    fs.parts.clear()
    rows = []
    for ob in bpy.data.objects:
        if ob.type != 'MESH':
            continue
        pid = ob.get("part_id")
        if not pid:
            continue
        sub = ob.get("subsystem", "") or ""
        rows.append((ob.name, str(pid), str(sub)))

    def _key(r):
        sub = r[2]
        try:
            si = SUBSYSTEM_ORDER.index(sub)
        except ValueError:
            si = len(SUBSYSTEM_ORDER)
        return (si, r[1], r[0])

    for oname, pid, sub in sorted(rows, key=_key):
        it = fs.parts.add()
        it.name = oname
        it.part_id = pid
        it.subsystem = sub
    n = len(fs.parts)
    if fs.active_index >= n:
        fs.active_index = max(0, n - 1)
    return n


# ==================================================================== UIList
class FS_UL_parts(bpy.types.UIList):
    def draw_item(self, context, layout, data, item, icon,
                  active_data, active_propname, index, flt_flag):
        ico = SUBSYSTEM_ICON.get(item.subsystem, 'DOT')
        if self.layout_type in {'DEFAULT', 'COMPACT'}:
            row = layout.row(align=True)
            row.label(text=item.part_id or item.name, icon=ico)
            ob = bpy.data.objects.get(item.name)
            sect = ob.get("section", "") if ob else ""
            sub = row.row()
            sub.alignment = 'RIGHT'
            sub.label(text=(str(sect)[:28] if sect else item.subsystem))
        elif self.layout_type == 'GRID':
            layout.alignment = 'CENTER'
            layout.label(text="", icon=ico)

    def filter_items(self, context, data, propname):
        items = getattr(data, propname)
        flt = [self.bitflag_filter_item] * len(items)
        order = []                                # [] -> no reorder (valid)
        fs = getattr(context.scene, "fs", None)
        srch = (fs.search.lower() if fs and fs.search else "")
        sub_flt = (fs.subsystem_flt if fs else "ALL")
        for i, it in enumerate(items):
            show = True
            if srch and (srch not in it.part_id.lower()
                         and srch not in it.name.lower()):
                show = False
            if show and sub_flt and sub_flt != "ALL" and it.subsystem != sub_flt:
                show = False
            if not show:
                flt[i] &= ~self.bitflag_filter_item
        return flt, order


# ================================================================== operators
class STAIR_OT_select_part(bpy.types.Operator):
    bl_idname = "stair.select_part"
    bl_label = "Select Part"
    bl_description = "Deselect all, then select + activate this part and sync the list"
    bl_options = {'REGISTER', 'UNDO'}
    part_id: bpy.props.StringProperty()

    def execute(self, context):
        target = None
        for ob in bpy.data.objects:
            if ob.get("part_id") == self.part_id:
                target = ob
                break
        if target is None:
            self.report({'WARNING'}, "No object with part_id '%s'" % self.part_id)
            return {'CANCELLED'}
        _fs_deselect_all()
        target.select_set(True)
        context.view_layer.objects.active = target
        fs = getattr(context.scene, "fs", None)
        if fs is not None:
            for i, it in enumerate(fs.parts):
                if it.name == target.name:
                    fs.active_index = i      # update cb frames + spec follows
                    break
        return {'FINISHED'}


class STAIR_OT_frame_part(bpy.types.Operator):
    bl_idname = "stair.frame_part"
    bl_label = "Frame"
    bl_description = "Frame the active part in the viewport"
    bl_options = {'REGISTER'}

    def execute(self, context):
        ob = context.active_object
        if ob is None:
            self.report({'WARNING'}, "No active object to frame")
            return {'CANCELLED'}
        if not ob.select_get():
            ob.select_set(True)
        ok = _fs_frame_selected()
        if not ok:
            self.report({'WARNING'}, "No VIEW_3D area to frame in")
            return {'CANCELLED'}
        return {'FINISHED'}


class STAIR_OT_isolate(bpy.types.Operator):
    bl_idname = "stair.isolate"
    bl_label = "Isolate"
    bl_description = "Hide everything except the selected parts (local-view style)"
    bl_options = {'REGISTER'}

    def execute(self, context):
        sel = {o.name for o in context.selected_objects}
        if not sel:
            self.report({'WARNING'}, "Select parts to isolate first")
            return {'CANCELLED'}
        for ob in bpy.data.objects:
            try:
                ob.hide_set(ob.name not in sel)
            except Exception:
                pass
        _fs_frame_selected()
        return {'FINISHED'}


class STAIR_OT_clear_isolate(bpy.types.Operator):
    bl_idname = "stair.clear_isolate"
    bl_label = "Clear"
    bl_description = "Unhide all parts and clear the search filter"
    bl_options = {'REGISTER'}

    def execute(self, context):
        for ob in bpy.data.objects:
            try:
                ob.hide_set(False)
            except Exception:
                pass
        fs = getattr(context.scene, "fs", None)
        if fs is not None:
            fs.search = ""
            try:
                fs.subsystem_flt = "ALL"
            except Exception:
                pass
        return {'FINISHED'}


class STAIR_OT_explode(bpy.types.Operator):
    bl_idname = "stair.explode"
    bl_label = "Explode"
    bl_description = "Set the exploded-view amount"
    bl_options = {'REGISTER'}
    amount: bpy.props.FloatProperty(default=0.0, min=0.0, max=1.0)

    def execute(self, context):
        fs = getattr(context.scene, "fs", None)
        if fs is not None:
            fs.explode = self.amount
        ok, msg = _fs_call("set_explode", self.amount)   # exists: set_explode(amount, P=None)
        if not ok:
            self.report({'INFO'}, "explode=%.2f (%s)" % (self.amount, msg))
        return {'FINISHED'}


class STAIR_OT_zoom_connection(bpy.types.Operator):
    bl_idname = "stair.zoom_connection"
    bl_label = "Zoom to Connection"
    bl_description = "Frame the active JNT_* empty together with its connected members"
    bl_options = {'REGISTER'}

    def execute(self, context):
        ob = context.active_object
        if ob is None or not ob.name.startswith("JNT_"):
            jnt = next((o for o in context.selected_objects
                        if o.name.startswith("JNT_")), None)
            ob = jnt or ob
        if ob is None or not ob.name.startswith("JNT_"):
            self.report({'WARNING'}, "Select a JNT_* connection marker first")
            return {'CANCELLED'}
        members = str(ob.get("members", "")).split(",")
        _fs_deselect_all()
        ob.select_set(True)
        context.view_layer.objects.active = ob
        for m in members:
            mo = _fs_resolve_member(m)            # members are part_ids, not names
            if mo is not None:
                try:
                    mo.select_set(True)
                except Exception:
                    pass
        _fs_frame_selected()
        return {'FINISHED'}


class STAIR_OT_toggle_handrail(bpy.types.Operator):
    bl_idname = "stair.toggle_handrail"
    bl_label = "Toggle Handrail"
    bl_description = "Attach / detach a handrail side"
    bl_options = {'REGISTER', 'UNDO'}
    side: bpy.props.EnumProperty(
        items=[("L", "Left", "Left handrail"), ("R", "Right", "Right handrail")],
        default="L")

    def execute(self, context):
        arm = _fs_arm()
        if arm is None:
            self.report({'WARNING'}, "Rig not built")
            return {'CANCELLED'}
        key = "handrail_attached_L" if self.side == "L" else "handrail_attached_R"
        cur = float(arm.get(key, 0.0))
        new = 0.0 if cur >= 0.5 else 1.0
        arm[key] = new
        fs = getattr(context.scene, "fs", None)
        if fs is not None:
            if self.side == "L":
                fs["handrail_l"] = bool(new)
            else:
                fs["handrail_r"] = bool(new)
        context.view_layer.update()
        return {'FINISHED'}


class STAIR_OT_split(bpy.types.Operator):
    bl_idname = "stair.split"
    bl_label = "Split"
    bl_description = "Set the half-split amount on the rig"
    bl_options = {'REGISTER', 'UNDO'}
    amount: bpy.props.FloatProperty(default=1.0, min=0.0, max=1.0)

    def execute(self, context):
        arm = _fs_arm()
        if arm is None:
            self.report({'WARNING'}, "Rig not built")
            return {'CANCELLED'}
        arm["split_amount"] = float(self.amount)
        fs = getattr(context.scene, "fs", None)
        if fs is not None:
            fs["split"] = float(self.amount)
        context.view_layer.update()
        return {'FINISHED'}


class STAIR_OT_add_unit(bpy.types.Operator):
    bl_idname = "stair.add_unit"
    bl_label = "Add Unit"
    bl_description = "Duplicate the stair into the Unit_2 collection (side or stacked)"
    bl_options = {'REGISTER', 'UNDO'}
    mode: bpy.props.EnumProperty(
        items=[("SIDE", "Side", "Place beside (along +Y)"),
               ("STACK", "Stack", "Place on top (along +Z)")],
        default="SIDE")

    def execute(self, context):
        P = globals().get("PARAMS", {})
        D = None
        dfn = globals().get("derived")
        if callable(dfn):
            try:
                D = dfn(P)
            except Exception:
                D = None
        W = (D or {}).get("W", float(P.get("width_full", 2350.0)) * 0.001)
        rise = (D or {}).get("rise", float(P.get("total_rise", 1000.0)) * 0.001)

        get_coll = globals().get("_get_coll")
        root = bpy.data.collections.get("FoldingStair")
        if callable(get_coll):
            unit2 = get_coll("Unit_2", root)
        else:
            unit2 = bpy.data.collections.get("Unit_2")
            if unit2 is None:
                unit2 = bpy.data.collections.new("Unit_2")
                (root or context.scene.collection).children.link(unit2)

        offset = Vector((0.0, W * 1.05, 0.0)) if self.mode == "SIDE" \
            else Vector((0.0, 0.0, rise))
        src = [o for o in bpy.data.objects
               if o.type == 'MESH' and o.get("part_id")
               and o.get("subsystem") != "Unit_2"]
        made = 0
        for ob in src:
            dname = ob.name + "_U2"
            if bpy.data.objects.get(dname):
                continue
            new = ob.copy()
            new.data = ob.data.copy()
            new.name = dname
            new.location = ob.location + offset
            for k in ob.keys():
                try:
                    new[k] = ob[k]
                except Exception:
                    pass
            new["subsystem"] = "Unit_2"
            if new.get("part_id"):
                new["part_id"] = "U2_" + str(ob.get("part_id"))
            try:
                unit2.objects.link(new)
            except Exception:                      # already linked / link race
                pass
            made += 1
        refresh_part_list(context)
        self.report({'INFO'}, "Unit_2: duplicated %d parts (%s)" % (made, self.mode))
        return {'FINISHED'}


class STAIR_OT_set_tread_material(bpy.types.Operator):
    bl_idname = "stair.set_tread_material"
    bl_label = "Set Tread Material"
    bl_description = "Swap the tread deck surface"
    bl_options = {'REGISTER', 'UNDO'}
    material: bpy.props.EnumProperty(
        items=[("alu_plank", "Alu Plank", ""),
               ("steel_checker", "Steel Checker", ""),
               ("punched_grating", "Punched Grating", "")],
        default="alu_plank")

    def execute(self, context):
        fs = getattr(context.scene, "fs", None)
        if fs is not None:
            fs.tread_material = self.material   # update cb calls set_tread_material
        else:
            ok, msg = _fs_call("set_tread_material", _fs_arm(), self.material)
            _fs_report(self, ok, msg)
        return {'FINISHED'}


class STAIR_OT_rebuild(bpy.types.Operator):
    bl_idname = "stair.rebuild"
    bl_label = "Rebuild"
    bl_description = "Purge the stair datablocks and rebuild from PARAMS"
    bl_options = {'REGISTER'}

    def execute(self, context):
        # purge prior build (objects in FoldingStair + Unit_2) without ops
        _fs_deselect_all()
        kill_colls = ["FoldingStair", "Stringer", "Treads", "Base", "Clamps",
                      "Handrail_L", "Handrail_R", "Joints", "Unit_2"]
        seen = set()
        for cn in kill_colls:
            c = bpy.data.collections.get(cn)
            if not c:
                continue
            for ob in list(c.objects):
                if ob.name in seen:
                    continue
                seen.add(ob.name)
                try:
                    bpy.data.objects.remove(ob, do_unlink=True)
                except Exception:
                    pass
        arm = bpy.data.objects.get("STAIR_RIG")
        if arm:
            try:
                bpy.data.objects.remove(arm, do_unlink=True)
            except Exception:
                pass
        # build_all is not in this module -> falls through to build_core (the real builder)
        ok, msg = _fs_call("build_all")
        if not ok:
            ok, msg = _fs_call("build_core")   # fall back to the core builder
        refresh_part_list(context)
        _fs_report(self, ok, "Rebuilt" if ok else msg)
        return {'FINISHED'} if ok else {'CANCELLED'}


class STAIR_OT_export_fab(bpy.types.Operator):
    bl_idname = "stair.export_fab"
    bl_label = "Export Fab CSV"
    bl_description = "Write joint_schedule.csv + bom.csv (M8)"
    bl_options = {'REGISTER'}
    directory: bpy.props.StringProperty(subtype='DIR_PATH')

    def invoke(self, context, event):
        context.window_manager.fileselect_add(self)
        return {'RUNNING_MODAL'}

    def execute(self, context):
        d = self.directory or bpy.path.abspath("//")
        ok, msg = _fs_call("export_fab", d)
        if not ok:
            ok, msg = _fs_call("export_fab")     # zero-arg variant
        _fs_report(self, ok, msg if not ok else "Fab CSVs written to %s" % d)
        return {'FINISHED'} if ok else {'CANCELLED'}


# ===================================================================== panels
class _FSPanel:
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = "Folding Stair"


class VIEW3D_PT_fs_pose(_FSPanel, bpy.types.Panel):
    bl_idname = "VIEW3D_PT_fs_pose"
    bl_label = "Pose"

    def draw(self, context):
        layout = self.layout
        fs = context.scene.fs
        arm = _fs_arm()
        if arm is None:
            layout.label(text="Rig not built - press Rebuild.", icon='ERROR')
        box = layout.box()
        box.label(text="Hero control: drag Fold_Handle", icon='BONE_DATA')
        box.prop(fs, "fold_angle", slider=True)
        if arm is not None:
            box.label(text="Readout: %.2f deg" % float(arm.get("fold_angle", 0.0)),
                      icon='DRIVER')
        row = layout.row(align=True)
        row.prop(fs, "state_enum", expand=True)
        col = layout.column(align=True)
        col.scale_y = 1.6
        # M6 ops: drawn only if registered (else disabled placeholder, no crash)
        _fs_draw_op(col, "stair.showcase", text="SHOWCASE", icon='PLAY')
        _fs_draw_op(col, "stair.reset", text="RESET", icon='LOOP_BACK')


class VIEW3D_PT_fs_browser(_FSPanel, bpy.types.Panel):
    bl_idname = "VIEW3D_PT_fs_browser"
    bl_label = "Parts"

    def draw(self, context):
        layout = self.layout
        fs = context.scene.fs
        row = layout.row(align=True)
        row.prop(fs, "search", text="", icon='VIEWZOOM')
        row.prop(fs, "subsystem_flt", text="")
        layout.template_list("FS_UL_parts", "", fs, "parts", fs, "active_index",
                             rows=8)
        row = layout.row(align=True)
        row.operator("stair.frame_part", text="Frame", icon='ZOOM_SELECTED')
        row.operator("stair.isolate", text="Isolate", icon='HIDE_OFF')
        row.operator("stair.clear_isolate", text="Clear", icon='X')


class VIEW3D_PT_fs_spec(_FSPanel, bpy.types.Panel):
    bl_idname = "VIEW3D_PT_fs_spec"
    bl_label = "Spec"

    def draw(self, context):
        layout = self.layout
        ob = context.active_object
        if ob is None or ob.get("part_id") is None:
            layout.label(text="Select a part to see its spec.", icon='INFO')
            return
        col = layout.column(align=True)

        def _line(lbl, key, ico='DOT'):
            val = ob.get(key)
            if val is None or val == "":
                return
            col.label(text="%s: %s" % (lbl, val), icon=ico)

        _line("Part", "part_id", 'OBJECT_DATA')
        _line("Subsystem", "subsystem", 'OUTLINER_COLLECTION')
        _line("Section", "section", 'MESH_CUBE')
        _line("Length", "length_mm", 'DRIVER_DISTANCE')
        _line("Material", "material", 'MATERIAL')
        _line("Finish", "finish", 'BRUSH_DATA')
        _line("Joints", "joints", 'LINKED')


class VIEW3D_PT_fs_modular(_FSPanel, bpy.types.Panel):
    bl_idname = "VIEW3D_PT_fs_modular"
    bl_label = "Modular"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout
        fs = context.scene.fs
        layout.prop(fs, "explode", slider=True)
        layout.prop(fs, "split", slider=True)
        layout.operator("stair.zoom_connection", icon='CON_PIVOT')
        row = layout.row(align=True)
        row.operator("stair.add_unit", text="Add Side", icon='DUPLICATE').mode = 'SIDE'
        row.operator("stair.add_unit", text="Add Stack", icon='DUPLICATE').mode = 'STACK'
        row = layout.row(align=True)
        op = row.operator("stair.toggle_handrail", text="Handrail L")
        op.side = 'L'
        op = row.operator("stair.toggle_handrail", text="Handrail R")
        op.side = 'R'
        layout.prop(fs, "tread_material", text="Tread")


class VIEW3D_PT_fs_build(_FSPanel, bpy.types.Panel):
    bl_idname = "VIEW3D_PT_fs_build"
    bl_label = "Build / Export"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout
        layout.operator("stair.rebuild", icon='FILE_REFRESH')
        layout.operator("stair.export_fab", icon='EXPORT')


# ================================================================== (un)register
_FS_CLASSES = (
    # data models first (FS_PartItem before FS_Params references it)
    FS_PartItem,
    FS_Params,
    FS_UL_parts,
    # operators
    STAIR_OT_select_part,
    STAIR_OT_frame_part,
    STAIR_OT_isolate,
    STAIR_OT_clear_isolate,
    STAIR_OT_explode,
    STAIR_OT_zoom_connection,
    STAIR_OT_toggle_handrail,
    STAIR_OT_split,
    STAIR_OT_add_unit,
    STAIR_OT_set_tread_material,
    STAIR_OT_rebuild,
    STAIR_OT_export_fab,
    # panels
    VIEW3D_PT_fs_pose,
    VIEW3D_PT_fs_browser,
    VIEW3D_PT_fs_spec,
    VIEW3D_PT_fs_modular,
    VIEW3D_PT_fs_build,
)


def register_app():
    for cls in _FS_CLASSES:
        try:
            bpy.utils.register_class(cls)
        except Exception as exc:               # already registered -> re-register clean
            try:
                bpy.utils.unregister_class(cls)
                bpy.utils.register_class(cls)
            except Exception:
                print("[FS] register failed for %s: %s" % (cls.__name__, exc))
    # PointerProperty must be (re)assigned AFTER FS_Params is registered
    bpy.types.Scene.fs = bpy.props.PointerProperty(type=FS_Params)
    # initial population (safe if no scene / background)
    try:
        refresh_part_list(bpy.context)
    except Exception:
        pass
    return {"classes": [c.__name__ for c in _FS_CLASSES]}


def unregister_app():
    if hasattr(bpy.types.Scene, "fs"):
        try:
            del bpy.types.Scene.fs
        except Exception:
            pass
    for cls in reversed(_FS_CLASSES):
        try:
            bpy.utils.unregister_class(cls)
        except Exception:
            pass
    return {"unregistered": True}

# ######################## integrated module: m8_fab.py ########################
# ===================================================================== M8 ===
# FABRICATION EXPORT: bom.csv + joint_schedule.csv, JNT_* empty markers, and an
# exploded view (driver on delta_location from arm['explode'] + a direct setter).
# Read-only w.r.t. the structural rig; only adds Empties + delta_location offsets.
# All masses are recomputed from the REVISED all-aluminium section table so the
# BOM stays in lock-step with ALU_KG_PER_M / ALU_PLATE_KG_PER_M2 above.

import csv as _csv
import os as _os

# 6 mm structural aluminium plate (lugs, splice plates): 0.006 m * 2700 kg/m^3
_ALU_PLATE6_KG_PER_M2 = 0.006 * 2700.0          # = 16.20 kg/m^2
# grip sleeve (rope / WPC) - non-metal, light; ~0.25 kg per 1 m run sleeve
_GRIP_KG_PER_M = 0.25


def _sec_mass(profile, length_mm, qty=1):
    """Linear-section mass (kg) for one piece from ALU_KG_PER_M * length."""
    return round(ALU_KG_PER_M[profile] * (length_mm * MM), 3)


def _plate_mass(w_mm, h_mm, kg_per_m2):
    return round((w_mm * MM) * (h_mm * MM) * kg_per_m2, 3)


def _build_part_registry(P=None, D=None):
    """Assemble the BOM rows from the parametric geometry + revised Al masses."""
    P = P or PARAMS
    D = D or derived(P)
    L_mm = D["L"] * 1000.0                      # 360.56
    span_mm = P["n_cells"] * L_mm              # 5L = 1802.78
    Wmm = P["width_full"]                      # 2350
    step_d, land_d = P["step_depth"], P["platform_depth"]
    n = P["n_cells"]
    # handrail top-rail sloped length over the 1800 run @ theta_stair
    toprail_mm = round(P["walking_run"] / math.cos(math.radians(D["theta_stair"])), 2)  # ~2163
    post_mm = P["handrail_h"]                  # 1000
    sock_mm = 150.0
    stiff_mm = 600.0
    # base frame cut length: 2350x1200 rect perimeter + 1 centre brace (~W)
    base_cut_mm = 2.0 * Wmm + 2.0 * 1200.0 + Wmm     # = 8650
    base_half_cut_mm = round(base_cut_mm / 2.0, 1)
    # step / landing L-angle frame perimeters
    step_perim = 2.0 * Wmm + 2.0 * step_d            # 5300
    land_perim = 2.0 * Wmm + 2.0 * land_d            # 5900

    rows = []

    def add(part_id, desc, section, length_mm, qty_full, qty_half,
            material, mass_each, notes):
        rows.append(dict(
            part_id=part_id, description=desc, section=section,
            length_mm=round(length_mm, 2) if length_mm is not None else "",
            qty_full=qty_full, qty_half=qty_half, material=material,
            mass_kg_each=round(mass_each, 3), notes=notes))

    SHS50, SHS40, T25, SOCK, LANG = ("50x50x3 SHS", "40x40x3 SHS",
                                     "25x25x3 tube", "31x31x3 socket",
                                     "50x50x3 L-angle")
    alloy, finish = P["struct_alloy"], P["finish"]
    deck_alloy = P["deck_alloy"]
    hw = P["fastener_grade"]

    # --- primary folding structure (per-side members split 1->1 to a half) ---
    add("STR_rail", "Stringer / main chord rail", SHS50, span_mm, 4, 2,
        alloy, _sec_mass(SHS50, span_mm), "2 per side (top+bottom chord), spans 5L")
    add("LEG_link", "Parallelogram leg link", SHS50, L_mm, 20, 10,
        alloy, _sec_mass(SHS50, L_mm), "L=360.56; 2/cell x 5 cells x 2 sides")
    add("TIE_rod", "Control tie-rod (1-DOF sync)", SHS40, span_mm, 2, 1,
        alloy, _sec_mass(SHS40, span_mm), "links all legs per side, =5L; O12 crank pins")

    # --- tread frames + decks (full-width; whole frame goes to each half) ---
    add("FRM_step", "Tread frame, step (300 deep)", LANG, step_perim, 4, 4,
        alloy, _sec_mass(LANG, step_perim), "2x2350 + 2x300 L-angle perimeter")
    add("FRM_land", "Tread frame, landing (600 deep)", LANG, land_perim, 1, 1,
        alloy, _sec_mass(LANG, land_perim), "2x2350 + 2x600 L-angle perimeter")

    # decks: built family selected by tread_material; HERO = aluminium plank
    tm = P.get("tread_material", "alu_plank")
    if tm == "steel_checker":
        deck_kg_m2, deck_desc, deck_mat = 23.55, "steel checker plate", "steel checker"
    elif tm == "punched_grating":
        deck_kg_m2, deck_desc, deck_mat = 14.13, "punched grating (~60% solid)", "steel grating"
    else:
        deck_kg_m2, deck_desc, deck_mat = ALU_PLATE_KG_PER_M2, "aluminium plank", deck_alloy
    add("DCK_step", "Step deck - %s" % deck_desc, "3 mm deck %dx%d" % (Wmm, step_d),
        None, 4, 4, deck_mat, _plate_mass(Wmm, step_d, deck_kg_m2),
        "%.2f m2 @ %.2f kg/m2 (selected by tread_material=%s)" % (Wmm*step_d*MM*MM, deck_kg_m2, tm))
    add("DCK_land", "Landing deck - %s" % deck_desc, "3 mm deck %dx%d" % (Wmm, land_d),
        None, 1, 1, deck_mat, _plate_mass(Wmm, land_d, deck_kg_m2),
        "%.2f m2 @ %.2f kg/m2" % (Wmm*land_d*MM*MM, deck_kg_m2))

    # --- pivot lugs / gussets (6 mm Al plate) ---
    add("LUG_pivot", "Tread pivot lug / gusset", "6 mm Al plate 120x80", 120.0, 40, 20,
        alloy, _plate_mass(120.0, 80.0, _ALU_PLATE6_KG_PER_M2),
        "2 per leg end; weld to frame, pin to leg (JNT_TREADLUG)")

    # --- locking hardware (A4 stainless, ~steel masses per spec) ---
    add("CLP_oc", "Over-center toggle clamp", "M10 toggle clamp body", None, 10, 5,
        hw, 0.80, "1 per cell per side; locks theta (JNT_TOGGLE)")
    add("PWL_detent", "Detent pawl + torsion spring", "machined 6 mm + O8 pin", None, 10, 5,
        hw, 0.25, "1 per cell per side; theta indexing (JNT_DETENT)")

    # --- base / ground frame ---
    add("BAS_frame", "Base / ground frame", SHS50, base_cut_mm, 1, 0,
        alloy, _sec_mass(SHS50, base_cut_mm), "2350x1200 + centre brace; full unit")
    add("BAS_frame_H", "Base / ground frame (half)", SHS50, base_half_cut_mm, 0, 1,
        alloy, _sec_mass(SHS50, base_half_cut_mm), "half-unit ground frame (split at centre)")

    # --- couplers / splice ---
    add("CPL_side", "Side coupler - O16 ring/clevis", "O16 ring/clevis", None, 4, 2,
        hw, 0.90, "width faces; side-by-side join (JNT_SIDECPL)")
    add("CPL_ctr", "Centre coupler - O16 ring/clevis", "O16 ring/clevis", None,
        P.get("centre_couplers", 4), int(math.ceil(P.get("centre_couplers", 4) / 2.0)),
        hw, 0.90, "longitudinal centre-split interface (JNT_CSPLIT); qty=centre_couplers")
    add("SPL_end", "End splice plate", "6 mm Al plate 250x120", 250.0, 4, 2,
        alloy, _plate_mass(250.0, 120.0, _ALU_PLATE6_KG_PER_M2),
        "4x M16 splice; end-to-end / stack join (JNT_ENDCPL)")

    # --- handrail family ---
    add("HRL_post", "Handrail post", T25, post_mm, 6, 3,
        alloy, _sec_mass(T25, post_mm), "~1000 high; 3 per side")
    add("HRL_toprail", "Handrail top rail", T25, toprail_mm, 2, 1,
        alloy, _sec_mass(T25, toprail_mm), "sloped over 1800 run @ %.2f deg" % D["theta_stair"])
    add("HRL_tie", "Handrail tie / mid brace", T25, span_mm, 2, 1,
        alloy, _sec_mass(T25, span_mm), "stiffens post line, =5L")
    add("HRL_grip", "Handrail grip sleeve (thermal break)",
        "grip sleeve (%s)" % P.get("handrail_grip", "rope"), toprail_mm, 2, 1,
        P.get("handrail_grip", "rope"),
        round(_GRIP_KG_PER_M * (toprail_mm * MM), 3),
        "NON-metal, non-black thermal break; over top rail")
    add("HRL_sock", "Handrail socket", SOCK, sock_mm, 6, 3,
        alloy, _sec_mass(SOCK, sock_mm), "1 per post; welded to frame (JNT_HRSOCKWELD)")

    # --- vertical stiffeners ---
    add("STF_vert", "Vertical stiffener / support", SHS50, stiff_mm, 10, 5,
        alloy, _sec_mass(SHS50, stiff_mm), "1 per cell per side")

    return rows


# module-level BOM mirror (built once at import from the default PARAMS)
PART_REGISTRY = _build_part_registry()


# ------------------------------------------------------------ JOINT SCHEDULE --
# Locations are formulas in i and L (mm), origin = front-bottom base pivot.
# c = cos(theta), s = sin(theta), W = full width (y_rail = +/- W/2 = +/-1175),
# L = 360.56 mm. e_t = 120 mm tie-rod crank offset; h_post = 1000 mm handrail.
JOINT_SCHEDULE = [
    dict(joint_id="JNT_LEGPIV_L",
         location_formula_xyz="( i*L*c , -W/2 , i*L*s ) , i=0..4",
         type="pin", members="LEG_link,STR_rail",
         fastener_size="O16 A4 stainless pin", dof="hinge", qty_full=5,
         tolerance="hole O16.5 (+0.5); nylon bush ID16.05/OD22",
         notes="left-rail parallelogram pivot; nylon/Delrin isolating bush + circlip; axis || Y"),
    dict(joint_id="JNT_LEGPIV_R",
         location_formula_xyz="( i*L*c , +W/2 , i*L*s ) , i=0..4",
         type="pin", members="LEG_link,STR_rail",
         fastener_size="O16 A4 stainless pin", dof="hinge", qty_full=5,
         tolerance="hole O16.5; nylon bush ID16.05/OD22",
         notes="right-rail pivot; coaxial with JNT_LEGPIV_L (shared Y axis)"),
    dict(joint_id="JNT_LEGPIV_T",
         location_formula_xyz="( i*L*c , +/-W/2 , i*L*s + L ) , i=0..4",
         type="pin", members="LEG_link,FRM_step/FRM_land",
         fastener_size="O16 A4 stainless pin", dof="hinge", qty_full=10,
         tolerance="hole O16.5; nylon bush ID16.05/OD22",
         notes="upper parallelogram pivot completing 4-bar; circlip retained; both rails"),
    dict(joint_id="JNT_TIEROD",
         location_formula_xyz="( i*L*c + 120*c , +/-W/2 , i*L*s + 120*s ) , e_t=120 , i=0..4",
         type="pin", members="TIE_rod,LEG_link",
         fastener_size="O12 A4 stainless pin + nylon bush", dof="hinge", qty_full=10,
         tolerance="hole O12.5; nylon bush ID12.05/OD18",
         notes="couples all legs -> 1 DOF; crank offset e_t=120 mm; both rails"),
    dict(joint_id="JNT_TREADLUG",
         location_formula_xyz="( i*L*c , +/-W/2 +/-175 , i*L*s + L ) , i=0..4",
         type="weld+pin", members="FRM_step/FRM_land,LUG_pivot,LEG_link",
         fastener_size="6 mm fillet weld + O12 pin", dof="fixed", qty_full=10,
         tolerance="weld leg a=6; hole O12.5",
         notes="lug welded to frame, pinned to leg; weld all-round lug perimeter"),
    dict(joint_id="JNT_TOGGLE",
         location_formula_xyz="( i*L*c + 60 , +/-W/2 , i*L*s + 80 ) , i=4 (landing)",
         type="clamp", members="CLP_oc,TIE_rod,STR_rail",
         fastener_size="M10 bolt x2 + O8 lever pin", dof="fixed (locked)", qty_full=2,
         tolerance="bolt hole O11; pin O8.5",
         notes="over-center toggle locks theta; 1 per rail at landing cell i=4"),
    dict(joint_id="JNT_DETENT",
         location_formula_xyz="( 0 , +/-W/2 , 0 ) at base-pivot hub",
         type="pin+spring", members="PWL_detent,BAS_frame",
         fastener_size="O8 pin + torsion spring", dof="ratchet", qty_full=2,
         tolerance="hole O8.5; notch +/-0.25 deg",
         notes="V-notches @ 0 / 33.69 / 75 deg (FLAT/STAIR/LADDER); one per rail at base"),
    dict(joint_id="JNT_BASEPIV",
         location_formula_xyz="( 0 , +/-W/2 , 0 )",
         type="pin", members="STR_rail,BAS_frame",
         fastener_size="O16 A4 stainless pin", dof="hinge", qty_full=2,
         tolerance="hole O16.5; nylon bush ID16.05/OD22",
         notes="ground pivot; carries reaction; circlip both ends"),
    dict(joint_id="JNT_CSPLIT",
         location_formula_xyz="( 0.45*i*L*c , 0 , i*L*s ) , i in {0,1,2,3}",
         type="pin (clevis)", members="CPL_ctr (half-A clevis),CPL_ctr (half-B clevis)",
         fastener_size="O16 R-clip pin", dof="fixed", qty_full=4,
         tolerance="jaw clr 1 mm/side; hole O16.5",
         notes="centre-split coupler x4 along seam y=0; mates 2x 1175 half-units"),
    dict(joint_id="JNT_SIDECPL",
         location_formula_xyz="( {0, 2*L*c, 4*L*c} , +/-W/2 , {0, 2*L*s, 4*L*s} )",
         type="pin (ring/clevis)", members="CPL_side,neighbour unit",
         fastener_size="O16 ring/clevis pin", dof="fixed", qty_full=4,
         tolerance="hole O16.5; ring OD 60",
         notes="width-tiling coupler; 2 stations per +/-Y face (4 total full unit)"),
    dict(joint_id="JNT_ENDCPL",
         location_formula_xyz="( {0, 4*L*c} , +/-W/2 , {0, 4*L*s} ) end faces",
         type="bolt (splice)", members="SPL_end,adjoining unit end",
         fastener_size="4x M16 A4 stainless", dof="fixed", qty_full=4,
         tolerance="hole O18; plate 250x120x10",
         notes="end-to-end / stacked tiling; 4 bore stations (2 ends x 2 rails); 2 splice plates"),
    dict(joint_id="JNT_HRSPIG",
         location_formula_xyz="( i*L*c , +/-W/2 , i*L*s + L + 1000 ) , i in {1,3,5 posts}",
         type="socket", members="HRL_post,HRL_sock",
         fastener_size="31x31 spigot + O10 R-clip", dof="fixed", qty_full=6,
         tolerance="spigot/socket clr ~1 mm; pin O10.5",
         notes="post 1000 mm above tread; R-clip cross-pin locks spigot; 3 per rail"),
    dict(joint_id="JNT_HRSOCKWELD",
         location_formula_xyz="( i*L*c , +/-W/2 , i*L*s + L ) , i in {1,3,5}",
         type="weld", members="HRL_sock,FRM_step/FRM_land",
         fastener_size="6 mm fillet weld", dof="fixed", qty_full=6,
         tolerance="weld a=6 all-round",
         notes="socket welded to frame top; receives handrail spigot"),
    dict(joint_id="JNT_FRAMECNR",
         location_formula_xyz="tread frame corners: ( i*L*c +/-d/2 , +/-W/2 , i*L*s + L ) , i=0..4",
         type="weld", members="FRM_step/FRM_land,FRM_step/FRM_land",
         fastener_size="6 mm fillet weld (mitre)", dof="fixed", qty_full=20,
         tolerance="gap <=1 mm; mitre 45 deg",
         notes="4 corners x 5 treads = 20 mitre welds; weld both flanges"),
]


def _bom_total_mass(rows=None):
    """Hero (built-deck) total = sum(mass_each * qty_full) over rows."""
    rows = rows if rows is not None else PART_REGISTRY
    tot = 0.0
    for r in rows:
        try:
            tot += float(r["mass_kg_each"]) * float(r["qty_full"])
        except (TypeError, ValueError):
            pass
    return round(tot, 2)


def _default_out_dir():
    """build folder = directory of this module (fallback to cwd if unsaved)."""
    try:
        base = _os.path.dirname(_os.path.abspath(__file__))
    except NameError:
        base = bpy.path.abspath("//") or _os.getcwd()
    if not base:
        base = _os.getcwd()
    return _os.path.join(base, "fab_export")


def export_fab(out_dir=None, P=None):
    """Write bom.csv + joint_schedule.csv (UTF-8) from PART_REGISTRY/JOINT_SCHEDULE.

    Reconciles mass after a tread_material swap by rebuilding the registry from
    the live PARAMS (so the deck rows + total reflect the selected deck family)."""
    P = P or PARAMS
    out_dir = out_dir or _default_out_dir()
    _os.makedirs(out_dir, exist_ok=True)

    # reconcile: rebuild rows from current PARAMS so a tread_material swap is captured
    rows = _build_part_registry(P)
    global PART_REGISTRY
    PART_REGISTRY = rows

    bom_path = _os.path.join(out_dir, "bom.csv")
    bom_cols = ["part_id", "description", "section", "length_mm",
                "qty_full", "qty_half", "material", "mass_kg_each",
                "mass_kg_total_full", "notes"]
    with open(bom_path, "w", newline="", encoding="utf-8") as fh:
        w = _csv.DictWriter(fh, fieldnames=bom_cols, extrasaction="ignore")
        w.writeheader()
        for r in rows:
            try:
                tot = round(float(r["mass_kg_each"]) * float(r["qty_full"]), 3)
            except (TypeError, ValueError):
                tot = ""
            out = dict(r)
            out["mass_kg_total_full"] = tot
            w.writerow(out)
        # summary footer rows
        w.writerow(dict(part_id="TOTAL_HERO", description="Sum mass_each*qty_full",
                        mass_kg_total_full=_bom_total_mass(rows),
                        notes="deck family = %s" % P.get("tread_material", "alu_plank")))

    jnt_path = _os.path.join(out_dir, "joint_schedule.csv")
    jnt_cols = ["joint_id", "location_formula_xyz", "type", "members",
                "fastener_size", "dof", "qty_full", "tolerance", "notes"]
    with open(jnt_path, "w", newline="", encoding="utf-8") as fh:
        w = _csv.DictWriter(fh, fieldnames=jnt_cols, extrasaction="ignore")
        w.writeheader()
        for r in JOINT_SCHEDULE:
            w.writerow(r)

    return {"out_dir": out_dir, "bom_csv": bom_path, "joint_csv": jnt_path,
            "n_bom_rows": len(rows), "n_joint_rows": len(JOINT_SCHEDULE),
            "total_mass_hero_kg": _bom_total_mass(rows),
            "tread_material": P.get("tread_material", "alu_plank"),
            "total_joint_instances": sum(int(j["qty_full"]) for j in JOINT_SCHEDULE)}


# --------------------------------------------------- JNT_* marker placement ---
def _jnt_instance_points(P, D):
    """Yield (joint_id, instance_index, (x,y,z)_m, pin, members) at current theta.

    Locations evaluate the schedule formulas at STAIR theta (theta_stair) using
    derived() geometry. Units: metres (L is in metres from derived())."""
    L = D["L"]
    th = math.radians(D["theta_stair"])
    c, s = math.cos(th), math.sin(th)
    W2 = D["W"] / 2.0
    n = P["n_cells"]
    h_post = P["handrail_h"] * MM
    e_t = P["ctrl_offset"] * MM
    posts_i = (1, 3, 5)

    def emit(jid, idx, p, pin, members):
        return (jid, idx, (round(p[0], 5), round(p[1], 5), round(p[2], 5)), pin, members)

    # leg pivots L / R (lower), i = 0..n-1 (5 cells)
    for i in range(n):
        yield emit("JNT_LEGPIV_L", i, (i*L*c, -W2, i*L*s), "O16", "LEG_link,STR_rail")
    for i in range(n):
        yield emit("JNT_LEGPIV_R", i, (i*L*c, +W2, i*L*s), "O16", "LEG_link,STR_rail")
    # leg-top pivots (both rails)
    idx = 0
    for i in range(n):
        for sgn in (-1.0, 1.0):
            yield emit("JNT_LEGPIV_T", idx, (i*L*c, sgn*W2, i*L*s + L), "O16",
                       "LEG_link,FRM"); idx += 1
    # tie-rod crank pins (both rails)
    idx = 0
    for i in range(n):
        for sgn in (-1.0, 1.0):
            yield emit("JNT_TIEROD", idx, (i*L*c + e_t*c, sgn*W2, i*L*s + e_t*s),
                       "O12", "TIE_rod,LEG_link"); idx += 1
    # tread lugs (both rails)
    idx = 0
    for i in range(n):
        for sgn in (-1.0, 1.0):
            yield emit("JNT_TREADLUG", idx, (i*L*c, sgn*(W2 - 0.175), i*L*s + L),
                       "O12", "FRM,LUG_pivot,LEG_link"); idx += 1
    # over-center toggles at landing cell (i = n-1), both rails
    idx = 0
    for sgn in (-1.0, 1.0):
        yield emit("JNT_TOGGLE", idx, ((n-1)*L*c + 0.060, sgn*W2, (n-1)*L*s + 0.080),
                   "M10", "CLP_oc,TIE_rod,STR_rail"); idx += 1
    # detents + base pivots at base hub, both rails
    idx = 0
    for sgn in (-1.0, 1.0):
        yield emit("JNT_DETENT", idx, (0.0, sgn*W2, 0.0), "O8",
                   "PWL_detent,BAS_frame"); idx += 1
    idx = 0
    for sgn in (-1.0, 1.0):
        yield emit("JNT_BASEPIV", idx, (0.0, sgn*W2, 0.0), "O16",
                   "STR_rail,BAS_frame"); idx += 1
    # centre-split couplers x4 along seam y=0
    for j, i in enumerate((0, 1, 2, 3)):
        yield emit("JNT_CSPLIT", j, (0.45*i*L*c, 0.0, i*L*s), "O16 R-clip",
                   "CPL_ctr,CPL_ctr")
    # side couplers: 2 stations per +/-Y face
    idx = 0
    for sgn in (-1.0, 1.0):
        for i in (0, n-1):
            yield emit("JNT_SIDECPL", idx, (i*L*c, sgn*W2, i*L*s), "O16",
                       "CPL_side,neighbour"); idx += 1
    # end couplers (splice) at both end faces, both rails
    idx = 0
    for i in (0, n-1):
        for sgn in (-1.0, 1.0):
            yield emit("JNT_ENDCPL", idx, (i*L*c, sgn*W2, i*L*s), "M16",
                       "SPL_end,adjoining"); idx += 1
    # handrail spigots (posts at i in {1,3,5}), both rails
    idx = 0
    for i in posts_i:
        for sgn in (-1.0, 1.0):
            yield emit("JNT_HRSPIG", idx, (i*L*c, sgn*(W2 - 0.06), i*L*s + L + h_post),
                       "O10 R-clip", "HRL_post,HRL_sock"); idx += 1
    # handrail socket welds, both rails
    idx = 0
    for i in posts_i:
        for sgn in (-1.0, 1.0):
            yield emit("JNT_HRSOCKWELD", idx, (i*L*c, sgn*(W2 - 0.06), i*L*s + L),
                       "weld", "HRL_sock,FRM"); idx += 1
    # frame corners: 4 per tread x n treads
    idx = 0
    for i in range(n):
        depth = (P["platform_depth"] if (i == n-1) else P["step_depth"]) * MM
        for dx in (-depth/2.0, depth/2.0):
            for sgn in (-1.0, 1.0):
                yield emit("JNT_FRAMECNR", idx,
                           (i*L*c + dx, sgn*(W2 - 0.025), i*L*s + L),
                           "weld", "FRM,FRM"); idx += 1


def place_jnt_markers(P=None):
    """Create one Empty per joint instance: JNT_<id>_<i> in a 'Joints' collection.

    Idempotent: existing JNT_* empties are removed first. Each empty carries
    custom props joint_id, type, members (CSV part_ids), pin. Positions are the
    schedule formulas evaluated at STAIR theta via derived()."""
    P = P or PARAMS
    D = derived(P)

    root = _get_coll("FoldingStair")
    coll = _get_coll("Joints", root)

    # if the rig exists, ensure it is in the STAIR pose so the readout matches
    arm = bpy.data.objects.get("STAIR_RIG")
    if arm is not None:
        try:
            set_fold(arm, "STAIR")
        except Exception:
            pass

    # idempotent clear: remove any prior JNT_ markers (in any collection)
    for ob in list(bpy.data.objects):
        if ob.name.startswith("JNT_") and ob.type == 'EMPTY':
            bpy.data.objects.remove(ob, do_unlink=True)

    # type lookup from the schedule for each joint_id
    type_of = {j["joint_id"]: j["type"] for j in JOINT_SCHEDULE}

    made = []
    counts = {}
    for jid, idx, (x, y, z), pin, members in _jnt_instance_points(P, D):
        name = "JNT_%s_%d" % (jid, idx)
        emp = bpy.data.objects.get(name)
        if emp is None:
            emp = bpy.data.objects.new(name, None)        # None data -> Empty
            coll.objects.link(emp)
        elif emp.name not in coll.objects:
            coll.objects.link(emp)
        emp.empty_display_type = 'PLAIN_AXES'
        emp.empty_display_size = 0.04
        emp.location = (x, y, z)
        emp["joint_id"] = jid
        emp["type"] = type_of.get(jid, "")
        emp["members"] = members
        emp["pin"] = pin
        made.append(name)
        counts[jid] = counts.get(jid, 0) + 1

    return {"collection": coll.name, "n_markers": len(made),
            "per_joint": counts, "theta_deg": round(D["theta_stair"], 3)}


# --------------------------------------------------------- exploded view -----
# Each part is pushed outward from its cell origin by arm['explode'] (0..1).
# We bake a per-object explode vector (metres) and either (a) drive
# delta_location[0..2] = explode * comp, or (b) set delta_location directly.

_EXPLODE_MAX = 0.45        # metres of separation at explode = 1.0

# subsystem -> (radial_xy_gain, vertical_gain) shaping of the blow-apart
_EXPLODE_GAIN = {
    "Stringer": (1.0, -0.6), "Treads": (1.2, 1.0), "Base": (0.6, -1.2),
    "Clamps": (1.5, 0.3), "Handrail_L": (1.3, 1.4), "Handrail_R": (1.3, 1.4),
}

# the structural mesh objects that participate in the exploded view (half-A names)
_EXPLODE_OBJECTS = (
    ["Stringer_struct", "Base_frame", "Clamps_struct",
     "Handrail_L", "Handrail_R", "Grip_L", "Grip_R"]
    + ["Tread_%d" % i for i in range(1, 6)]
    + ["Pawl_%d" % i for i in range(0, 6)]
)


def _bbox_center_local(ob):
    """Local-space bounding-box centre of an object (mathutils.Vector)."""
    bb = [Vector(corner) for corner in ob.bound_box]
    return sum(bb, Vector((0.0, 0.0, 0.0))) / 8.0


def _explode_vector(ob, P, D):
    """Per-object outward offset (metres) at explode = 1.0, from its cell origin."""
    sub = ob.get("subsystem", "")
    rg, vg = _EXPLODE_GAIN.get(sub, (1.0, 0.5))
    ctr = _bbox_center_local(ob)            # part centre in its own (rest) frame
    # radial direction in XY away from the run centreline (y=0); avoid /0
    ry = ctr.y
    if abs(ry) < 1e-4:
        ry = 1e-4 if sub.endswith("_R") else -1e-4
    yspread = (1.0 if ry >= 0 else -1.0) * abs(rg) * _EXPLODE_MAX
    # treads also fan along +X so the diagram reads as a stack
    xspread = 0.0
    if sub == "Treads":
        try:
            idx = int(ob.name.split("_")[1])
        except (IndexError, ValueError):
            idx = 0
        xspread = (idx - (P["n_cells"] + 1) / 2.0) * 0.10 * abs(rg)
    zspread = vg * _EXPLODE_MAX
    return Vector((xspread, yspread, zspread))


def make_exploded(P=None):
    """Install drivers so delta_location = arm['explode'] * baked_vector per part.

    The explode factor is the existing arm['explode'] custom prop (0..1).
    Idempotent: clears prior delta_location drivers before re-adding."""
    P = P or PARAMS
    D = derived(P)
    arm = bpy.data.objects.get("STAIR_RIG")

    # make sure the driver source prop exists (it is created in make_armature,
    # but guard for standalone use of this function)
    if arm is not None and "explode" not in arm.keys():
        arm["explode"] = 0.0
        try:
            arm.id_properties_ui("explode").update(min=0.0, max=1.0,
                                                   soft_min=0.0, soft_max=1.0)
        except Exception:
            pass

    done = []
    for name in _EXPLODE_OBJECTS:
        ob = bpy.data.objects.get(name)
        if ob is None:
            continue
        vec = _explode_vector(ob, P, D)
        ob["explode_vec"] = [round(v, 5) for v in vec]   # record for set_explode

        # clear existing delta_location drivers (idempotent); driver_remove
        # returns a bool (False when none), wrapped for safety regardless.
        ad = ob.animation_data
        if ad:
            for i in range(3):
                try:
                    ob.driver_remove("delta_location", i)
                except Exception:
                    pass

        if arm is None:
            # no rig: fall back to a static reassembled state
            ob.delta_location = (0.0, 0.0, 0.0)
            done.append(name)
            continue

        for i in range(3):
            fc = ob.driver_add("delta_location", i)
            drv = fc.driver
            drv.type = 'SCRIPTED'
            v = drv.variables.new()
            v.name = "ex"
            v.type = 'SINGLE_PROP'
            v.targets[0].id = arm
            v.targets[0].data_path = '["explode"]'
            # parenthesise the baked constant so a negative component reads
            # 'ex*(-0.270000)' rather than the bare 'ex*-0.270000'
            drv.expression = "ex*(%.6f)" % vec[i]
        done.append(name)

    return {"armature": (arm.name if arm else None),
            "n_parts": len(done), "parts": done,
            "explode_prop": "STAIR_RIG['explode'] (0..1)",
            "max_separation_m": _EXPLODE_MAX}


def set_explode(amount=0.0, P=None):
    """Direct setter: delta_location = amount * baked vector for every part.

    amount=0 fully reassembles. Also writes arm['explode'] so the driver path
    (make_exploded) and this direct path stay in agreement. Recomputes the
    baked vector if a part has none yet."""
    P = P or PARAMS
    D = derived(P)
    amount = float(amount)
    arm = bpy.data.objects.get("STAIR_RIG")
    if arm is not None and "explode" in arm.keys():
        arm["explode"] = amount

    moved = []
    for name in _EXPLODE_OBJECTS:
        ob = bpy.data.objects.get(name)
        if ob is None:
            continue
        ev = ob.get("explode_vec")
        if ev is None:
            ev = list(_explode_vector(ob, P, D))
            ob["explode_vec"] = [round(v, 5) for v in ev]
        # if a driver owns delta_location it will fight a direct write; only
        # set directly when there is no delta_location driver on this object
        has_drv = False
        ad = ob.animation_data
        if ad and ad.drivers:
            has_drv = any(d.data_path == "delta_location" for d in ad.drivers)
        if not has_drv:
            ob.delta_location = (ev[0]*amount, ev[1]*amount, ev[2]*amount)
        moved.append(name)

    bpy.context.view_layer.update()
    return {"amount": amount, "n_parts": len(moved), "reassembled": amount == 0.0}


def export_and_mark(out_dir=None, P=None):
    """Convenience M8 entry: write CSVs, place markers, install explode drivers."""
    P = P or PARAMS
    fab = export_fab(out_dir, P)
    mk = place_jnt_markers(P)
    ex = make_exploded(P)
    return {"export": fab, "markers": mk, "exploded": ex}

# ===================================================================== build_all ===
def skin_remaining(P=None):
    """Skin any mesh left without a material (the _B halves and _U2 copies)."""
    P = P or PARAMS
    tmap = {"alu_plank": "MAT_tread_alu", "steel_checker": "MAT_tread_checker", "punched_grating": "MAT_tread_grating"}
    mat_tread = bpy.data.materials.get(tmap.get(P["tread_material"], "MAT_tread_alu"))
    black = bpy.data.materials.get("MAT_powdercoat_black")
    grip = bpy.data.materials.get("MAT_handrail_grip")
    oxide = bpy.data.materials.get("MAT_hardware_oxide")

    def pick(n):
        if "Grip" in n:
            return grip
        if n.startswith("Pawl"):
            return oxide
        if n.startswith("Tread"):
            return mat_tread
        return black

    cnt = 0
    for o in bpy.data.objects:
        if o.type == 'MESH' and len(o.data.materials) == 0:
            m = pick(o.name)
            if m:
                o.data.materials.append(m)
                cnt += 1
    return cnt


def build_all(P=None, register=True):
    """One-call full rebuild: geometry + rig + clamps + handrails + split/modular,
    then materials, fabrication export, showcase NLA, and the N-panel app."""
    import traceback
    P = P or PARAMS
    errs = {}
    core = build_core(P)
    steps = [
        ("materials", lambda: (make_materials(P), assign_materials(P), skin_remaining(P), setup_lighting())),
        ("fab", lambda: export_and_mark(out_dir=PROJECT_DIR + "/docs/fab")),
        ("showcase", lambda: build_showcase(P)),
        ("app", (lambda: register_app()) if register else (lambda: None)),
    ]
    for label, fn in steps:
        try:
            fn()
        except Exception:
            errs[label] = traceback.format_exc()[-1200:]
    set_fold(bpy.data.objects["STAIR_RIG"], "STAIR")
    return {"core_objects": core["n_objects"], "n_parts": core["n_parts"], "errors": errs}


if __name__ == "__main__":
    print(build_all())
    print(acceptance())
