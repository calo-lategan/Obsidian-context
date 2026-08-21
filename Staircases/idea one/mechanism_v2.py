"""
mechanism_v2 - fabrication-first rebuild of the folding-stair MECHANISM (Steps 1-2).
True self-leveling 4-bar parallelogram. Developed/tested standalone, then merged
into build_staircase.py.

Kinematic (per side, X-Z plane, c=cos th, s=sin th):
  - MAIN STRINGER pivots at B_main=(0,y,0); rotates th.
  - CONTROL BAR pivots at B_ctrl=(0,y,d)  (VERTICALLY offset by d); rotates th.
  - Node pairs: P_M_i=(i*L*c, y, i*L*s);  P_C_i=(i*L*c, y, i*L*s + d) = P_M_i + (0,0,d).
    => every main/control node pair stays EXACTLY (0,0,d) apart at all th
    => the vertical leveling links never change angle => TREADS STAY LEVEL by the linkage.
  - Each tread CARRIER is driven (closed form) to P_M_i with no rotation; deck top = i*L*s.
    Since L*sin(33.69deg)=200mm exactly, STAIR deck tops = 200/400/600/800/1000.
This is the real marine accommodation-ladder linkage, not a copy-rotation cheat.
"""

import bpy, math
from mathutils import Vector

MM = 0.001

P2 = dict(
    riser=200.0, going=300.0, n_cells=5, step_depth=300.0, platform_depth=600.0,
    width_full=2350.0, half_unit=1175.0,
    theta_flat=0.0, theta_ladder=75.0,
    sec_rail=50.0, sec_ctrl=40.0, sec_link=40.0,
    ctrl_bar_offset_mm=140.0,        # d : vertical offset main->control pivot (TUNE at Gate B)
    deck_depth_mm=40.0,              # real grating structural depth
    rail_inset=60.0,
)


def der(P=None):
    P = P or P2
    R, G = P["riser"] * MM, P["going"] * MM
    L = math.hypot(G, R)
    return dict(R=R, G=G, L=L, W=P["width_full"] * MM,
                theta_stair=math.degrees(math.atan2(R, G)),
                d=P["ctrl_bar_offset_mm"] * MM)


# ---------------------------------------------------------------- helpers ----
def _box(sx, sy, sz, c):
    x, y, z = sx/2, sy/2, sz/2
    cx, cy, cz = c
    v = [(cx-x, cy-y, cz-z), (cx+x, cy-y, cz-z), (cx+x, cy+y, cz-z), (cx-x, cy+y, cz-z),
         (cx-x, cy-y, cz+z), (cx+x, cy-y, cz+z), (cx+x, cy+y, cz+z), (cx-x, cy+y, cz+z)]
    f = [(0,1,2,3), (4,5,6,7), (0,1,5,4), (1,2,6,5), (2,3,7,6), (3,0,4,7)]
    return v, f


def _make_part(name, boxes, coll, props=None):
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


def bind(obj, arm, bone):
    vg = obj.vertex_groups.new(name=bone)
    vg.add(range(len(obj.data.vertices)), 1.0, 'REPLACE')
    m = obj.modifiers.new("Arm", "ARMATURE")
    m.object = arm
    m.use_vertex_groups = True


def _view3d_override():
    win = bpy.context.window
    if not win:
        return {}
    for area in win.screen.areas:
        if area.type == 'VIEW_3D':
            region = next((r for r in area.regions if r.type == 'WINDOW'), None)
            return {"window": win, "area": area, "region": region}
    return {"window": win}


def _wipe_v2():
    if bpy.context.object and bpy.context.object.mode != 'OBJECT':
        try:
            bpy.ops.object.mode_set(mode='OBJECT')
        except Exception:
            pass
    for o in list(bpy.data.objects):
        if o.name == "RIG_V2" or o.name.startswith(("v2_",)):
            bpy.data.objects.remove(o, do_unlink=True)
    for m in list(bpy.data.meshes):
        if m.users == 0:
            bpy.data.meshes.remove(m)
    for a in list(bpy.data.armatures):
        if a.users == 0:
            bpy.data.armatures.remove(a)
    c = bpy.data.collections.get("Mechanism_V2")
    if c:
        for ob in list(c.objects):
            bpy.data.objects.remove(ob, do_unlink=True)


# ---------------------------------------------------------------- geometry ---
def build_geo_v2(P=None, D=None):
    """Per-half geometry: main stringers, control bars, carriers (deck+frame+vertical
    leveling links+main lug). Authored in the rig REST frame (theta=0, flat)."""
    P = P or P2
    D = D or der(P)
    L, n, W, d = D["L"], P["n_cells"], D["W"], D["d"]
    rc = P["sec_rail"] * MM
    cc = P["sec_ctrl"] * MM
    dd = P["deck_depth_mm"] * MM
    root = _get_coll("Mechanism_V2")
    made = []   # (object, bone)

    # stringer chord sits BELOW the deck plane; deck top at carrier origin (z=0)
    str_z = -0.09
    frame_z = -dd - 0.01      # L-angle frame just under the 40mm deck

    def half(side):
        suf = "" if side == "A" else "_B"
        if side == "A":
            rail_ys, y0, y1 = [-(W/2 - rc*1.2), -0.06], -W/2, 0.0
        else:
            rail_ys, y0, y1 = [0.06, (W/2 - rc*1.2)], 0.0, W/2
        yc, wj = (y0 + y1)/2.0, (y1 - y0)

        # MAIN STRINGER rails (rotate about origin) -> Stringer_main
        sb = [(n*L, rc, rc, (n*L/2, y, str_z)) for y in rail_ys]
        s = _make_part(f"v2_Stringer{suf}", sb, root, {"part_id": f"STR{suf}", "subsystem": "Stringer"})
        made.append((s, "Stringer_main"))

        # CONTROL BAR rails (rotate about z=d) -> Ctrl_bar ; nodes at z=d
        cb = [(n*L, cc, cc, (n*L/2, y, d)) for y in rail_ys]
        cobj = _make_part(f"v2_CtrlBar{suf}", cb, root, {"part_id": f"CTRL{suf}", "subsystem": "ControlBar"})
        made.append((cobj, "Ctrl_bar"))

        # CARRIERS authored at x=i*L: deck(40mm, separate obj) + frame + vertical leveling links + main lug
        for i in range(1, n + 1):
            depth = (P["platform_depth"] if i == n else P["step_depth"]) * MM
            x = i * L
            dk = _make_part(f"v2_Deck_{i}{suf}", [(depth, wj, dd, (x, yc, -dd/2))], root,
                            {"part_id": f"TRD_{i}{suf}", "subsystem": "Treads",
                             "depth_mm": round(depth*1000, 1)})              # 40mm deck, top at z=0
            made.append((dk, f"Carrier_{i}"))
            st = [(depth, rc, rc, (x, y0 + rc/2, frame_z)),
                  (depth, rc, rc, (x, y1 - rc/2, frame_z))]
            for y in rail_ys:
                st.append((cc, cc, d, (x, y, d/2)))                          # vertical leveling link 0->d
                st.append((0.05, rc, abs(str_z), (x, y, str_z/2)))          # main lug down to stringer
            sob = _make_part(f"v2_CarrStruct_{i}{suf}", st, root,
                             {"part_id": f"CARR_{i}{suf}", "subsystem": "Carrier"})
            made.append((sob, f"Carrier_{i}"))

    half("A")
    half("B")

    # base hub (placeholder): pivot lugs at B_main(z=0) and B_ctrl(z=d), both rail lines
    bh = []
    for y in [-(W/2 - rc*1.2), -0.06, 0.06, (W/2 - rc*1.2)]:
        bh.append((0.12, rc, 0.02, (0.0, y, 0.0)))      # main pivot lug
        bh.append((0.10, cc, 0.02, (0.0, y, d)))        # control pivot lug
    base = _make_part("v2_BaseHub", bh, root, {"part_id": "BASE", "subsystem": "Base"})
    made.append((base, "Base"))
    return made


# ---------------------------------------------------------------- armature ---
def build_rig_v2(P=None, D=None):
    P = P or P2
    D = D or der(P)
    L, n, d = D["L"], P["n_cells"], D["d"]
    adata = bpy.data.armatures.new("RIG_V2")
    arm = bpy.data.objects.new("RIG_V2", adata)
    _get_coll("Mechanism_V2").objects.link(arm)
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
        nb("Stringer_main", (0, 0, 0), (n*L, 0, 0), base)         # rotates about origin
        nb("Ctrl_bar", (0, 0, d), (n*L, 0, d), base)             # rotates about (0,0,d)
        for i in range(1, n + 1):
            nb(f"Carrier_{i}", (i*L, 0, 0), (i*L, 0.2, 0), base)  # +Y => identity orient; location==world
        nb("Fold_Handle", (-0.4, 0, 0.0), (-0.4, 0, 0.3), base)   # local-Y == world +Z
        bpy.ops.object.mode_set(mode='OBJECT')

    pb = arm.pose.bones
    for bn in ("Stringer_main", "Ctrl_bar", "Fold_Handle"):
        pb[bn].rotation_mode = 'XYZ'

    arm["fold_angle"] = float(D["theta_stair"])
    try:
        arm.id_properties_ui("fold_angle").update(min=0.0, max=90.0, soft_min=0.0, soft_max=90.0)
    except Exception:
        pass

    EXPR = "min(max(33.69 + ly*90.0, 0.0), 90.0)"

    def hvar(drv):
        v = drv.variables.new()
        v.name, v.type = "ly", 'TRANSFORMS'
        t = v.targets[0]
        t.id = arm
        t.bone_target = "Fold_Handle"
        t.transform_type = 'LOC_Y'
        t.transform_space = 'LOCAL_SPACE'

    def fa_var(drv, name="fa"):
        v = drv.variables.new()
        v.name, v.type = name, 'SINGLE_PROP'
        v.targets[0].id = arm
        v.targets[0].data_path = '["fold_angle"]'

    # fold_angle readout <- Fold_Handle
    fr = arm.driver_add('["fold_angle"]')
    fr.driver.type = 'SCRIPTED'
    hvar(fr.driver)
    fr.driver.expression = EXPR

    # Stringer_main + Ctrl_bar rotate by fold_angle (about their own heads -> the parallelogram)
    for bn in ("Stringer_main", "Ctrl_bar"):
        fc = arm.driver_add(f'pose.bones["{bn}"].rotation_euler', 0)
        fc.driver.type = 'SCRIPTED'
        fa_var(fc.driver)
        fc.driver.expression = "radians(fa)"

    # Carriers: closed-form translate-only to P_M_i (level by construction)
    for i in range(1, n + 1):
        fx = arm.driver_add(f'pose.bones["Carrier_{i}"].location', 0)
        fx.driver.type = 'SCRIPTED'
        fa_var(fx.driver)
        fx.driver.expression = f"{i*L}*(cos(radians(fa)) - 1.0)"   # world x = i*L*cos; rest head at i*L
        fz = arm.driver_add(f'pose.bones["Carrier_{i}"].location', 2)
        fz.driver.type = 'SCRIPTED'
        fa_var(fz.driver)
        fz.driver.expression = f"{i*L}*sin(radians(fa))"
    return arm


def set_fold_v2(arm, state_or_deg):
    deg = {"FLAT": 0.0, "STAIR": 33.69, "LADDER": 75.0}.get(state_or_deg)
    if deg is None:
        deg = float(state_or_deg)
    arm.pose.bones["Fold_Handle"].location = (0.0, (deg - 33.69) / 90.0, 0.0)
    arm.update_tag()
    bpy.context.view_layer.update()
    return {"deg": deg, "fold_angle": round(arm["fold_angle"], 3)}


def build_v2(P=None):
    P = P or P2
    D = der(P)
    _wipe_v2()
    made = build_geo_v2(P, D)
    arm = build_rig_v2(P, D)
    for ob, bone in made:
        bind(ob, arm, bone)
    set_fold_v2(arm, "STAIR")
    return arm


# ---------------------------------------------------------------- Gate A test
def gate_a(P=None):
    P = P or P2
    arm = build_v2(P)
    res = {}
    sweep = {s: set_fold_v2(arm, s)["fold_angle"] for s in ("FLAT", "STAIR", "LADDER")}
    res["sweep"] = sweep
    res["sweep_ok"] = abs(sweep["FLAT"]) < .1 and abs(sweep["STAIR"]-33.69) < .1 and abs(sweep["LADDER"]-75) < .1

    # deck-top heights + normals at STAIR
    set_fold_v2(arm, "STAIR")
    dg = bpy.context.evaluated_depsgraph_get(); dg.update()
    tops, worstn = [], 1.0
    for i in range(1, P["n_cells"] + 1):
        ob = bpy.data.objects[f"v2_Deck_{i}"].evaluated_get(dg)
        me = ob.to_mesh()
        mw = ob.matrix_world
        zmax = max((mw @ v.co).z for v in me.vertices)
        tops.append(round(zmax * 1000, 1))
        # top-face normal
        best_z, nz = -1e9, 0.0
        for poly in me.polygons:
            nrm = (mw.to_3x3() @ poly.normal).normalized()
            ctr = mw @ poly.center
            if nrm.z > 0.5 and ctr.z > best_z:
                best_z, nz = ctr.z, nrm.z
        worstn = min(worstn, nz)
        ob.to_mesh_clear()
    res["stair_tops_mm"] = tops
    res["tops_ok"] = all(abs(tops[i] - (i+1)*200) < 6 for i in range(P["n_cells"]))
    # normals across the range
    norm = {}
    for s in ("FLAT", "STAIR", "LADDER"):
        set_fold_v2(arm, s)
        dg = bpy.context.evaluated_depsgraph_get(); dg.update()
        w = 1.0
        for i in range(1, P["n_cells"] + 1):
            ob = bpy.data.objects[f"v2_Deck_{i}"].evaluated_get(dg)
            me = ob.to_mesh(); mw = ob.matrix_world
            bz, nz = -1e9, 0.0
            for poly in me.polygons:
                nr = (mw.to_3x3() @ poly.normal).normalized()
                ct = mw @ poly.center
                if nr.z > 0.5 and ct.z > bz:
                    bz, nz = ct.z, nr.z
            w = min(w, nz)
            ob.to_mesh_clear()
        norm[s] = round(w, 4)
    res["tread_normal_min"] = norm
    res["normals_ok"] = all(v > 0.999 for v in norm.values())
    set_fold_v2(arm, "STAIR")
    res["GATE_A"] = res["sweep_ok"] and res["tops_ok"] and res["normals_ok"]
    return res


# ---------------------------------------------------------------- Gate B -----
def _bvh(obj, dg):
    from mathutils.bvhtree import BVHTree
    obe = obj.evaluated_get(dg)
    me = obe.to_mesh()
    verts = [obe.matrix_world @ v.co for v in me.vertices]
    polys = [tuple(p.vertices) for p in me.polygons]
    tree = BVHTree.FromPolygons(verts, polys, all_triangles=False)
    obe.to_mesh_clear()
    return tree


def check_no_interpenetration(arm=None, samples=16):
    """Sweep theta in [0,75]; flag any moving member that passes through a tread deck.
    A member is allowed to touch ITS OWN tread (same index); everything else must clear."""
    arm = arm or bpy.data.objects["RIG_V2"]
    n = P2["n_cells"]
    decks = [o for s in ("", "_B") for i in range(1, n+1)
             if (o := bpy.data.objects.get(f"v2_Deck_{i}{s}"))]
    movers = []
    for nm in (["v2_Stringer", "v2_Stringer_B", "v2_CtrlBar", "v2_CtrlBar_B"]
               + [f"v2_CarrStruct_{i}{s}" for s in ("", "_B") for i in range(1, n+1)]):
        o = bpy.data.objects.get(nm)
        if o:
            movers.append(o)
    overlaps = []
    for k in range(samples):
        th = 75.0 * k / (samples - 1)
        set_fold_v2(arm, th)
        dg = bpy.context.evaluated_depsgraph_get(); dg.update()
        dtrees = [(d, _bvh(d, dg)) for d in decks]
        for mo in movers:
            mt = _bvh(mo, dg)
            mi = mo.name.replace("_B", "").split("_")[-1] if mo.name.startswith("v2_CarrStruct") else None
            for d, dt in dtrees:
                di = d.name.replace("_B", "").split("_")[2]
                if mi is not None and di == mi:        # member's own tread: allowed contact
                    continue
                if mt.overlap(dt):
                    overlaps.append((round(th, 1), mo.name, d.name))
    set_fold_v2(arm, "STAIR")
    return {"samples": samples, "overlap_count": len(overlaps),
            "no_overlap_ok": len(overlaps) == 0, "overlaps": overlaps[:25]}


def gate_b(P=None):
    build_v2(P)
    return check_no_interpenetration()
