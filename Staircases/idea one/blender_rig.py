"""Functional rig for the full staircase. Imports the 37 per-group GLBs (build123d, meters),
parents each group to a control node, and drives the WHOLE mechanism from one controller:
  theta_A / theta_B (fold each half 0=FLAT / 33.69=STAIR / 75=LADDER),
  split (halves apart), handrail (slide the 2 handrails out), leg_retract.
Self-leveling is exact: carriers translate to P_M_i(theta) without rotating.
Exec from the Blender MCP.
"""
import bpy, math, mathutils, json, pathlib

ROOT = r"C:/Users/USER/Desktop/Staircases/idea one"
GDIR = pathlib.Path(ROOT) / "out" / "groups"
L = 0.360555            # m
TH0 = 33.69             # STAIR rest angle (deg)
PLANE_Y = {0: 0.030, 1: 1.142, 2: 1.208, 3: 2.320}   # m
HALF = {0: "A", 1: "A", 2: "B", 3: "B"}
PLAT_H = 0.62           # elevated-platform raise height (m)
RAMP_ANG = 20.0         # ramp tilt (deg) about the front edge
EXT_DX = 1.79           # half-B end-to-end slide (m) for the long catwalk
EXT_DY = -1.178         # half-B y-shift to overlay half-A's width
STASH_DY = 1.55         # half-B slide-aside (m) for the single-half showcase (smooth, no hiding)


def reset():
    if bpy.context.object and bpy.context.object.mode != 'OBJECT':
        try: bpy.ops.object.mode_set(mode='OBJECT')
        except Exception: pass
    for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
    for c in list(bpy.data.collections): bpy.data.collections.remove(c)
    for blk in (bpy.data.meshes, bpy.data.materials, bpy.data.armatures, bpy.data.actions):
        for d in list(blk):
            if d.users == 0: blk.remove(d)


def import_groups():
    groups = {}
    for f in sorted(GDIR.glob("*.glb")):
        before = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=str(f))
        new = [o for o in bpy.data.objects if o not in before]
        bpy.context.view_layer.update()
        meshes = [o for o in new if o.type == 'MESH']
        for o in meshes:                                # keep world, drop the glTF node hierarchy
            w = o.matrix_world.copy()
            o.parent = None
            o.matrix_world = w
            o.name = f"{f.stem}__{o.data.name}"          # real label lives on the mesh data
        for o in new:                                   # delete the junk '=>[0:1:1:N]' empty nodes
            if o.type != 'MESH':
                bpy.data.objects.remove(o, do_unlink=True)
        groups[f.stem] = meshes
    return groups


def empty(name, loc, parent=None):
    e = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(e)
    e.empty_display_size = 0.05
    e.location = loc
    if parent:
        e.parent = parent
        e.matrix_parent_inverse = parent.matrix_world.inverted()
    return e


def parent_keep(objs, node):
    bpy.context.view_layer.update()
    for o in objs:
        w = o.matrix_world.copy()          # capture true world transform
        o.parent = node
        o.matrix_parent_inverse.identity()
        o.matrix_world = w                  # re-derive local so world is exactly preserved


def drv(obj, path, index, expr, props, ctrl):
    fc = obj.driver_add(path, index)
    d = fc.driver; d.type = 'SCRIPTED'
    for vn, prop in props:
        v = d.variables.new(); v.name = vn; v.type = 'SINGLE_PROP'
        v.targets[0].id = ctrl
        v.targets[0].data_path = f'["{prop}"]'
    d.expression = expr


def build_rig():
    reset()
    groups = import_groups()
    sc = bpy.context.scene

    CTRL = bpy.data.objects.new("CTRL", None); sc.collection.objects.link(CTRL)
    for prop, dv, mn, mx in (("theta_A", TH0, 0.0, 90.0), ("theta_B", TH0, 0.0, 90.0),
                             ("split", 0.0, 0.0, 1.0), ("handrail", 0.0, 0.0, 1.0),
                             ("leg_retract", 0.0, 0.0, 1.0),
                             ("platform", 0.0, 0.0, 1.0), ("ramp", 0.0, 0.0, 1.0), ("extend", 0.0, 0.0, 1.0),
                             ("stash", 0.0, 0.0, 1.0)):
        CTRL[prop] = dv
        try: CTRL.id_properties_ui(prop).update(min=mn, max=mx)
        except Exception: pass

    # DeployRoot between CTRL and the split roots: raises the whole unit (platform) + tilts it about
    # the front edge (ramp). Zero at platform=ramp=0 so the staircase/fold/ladder show is unaffected.
    DR = empty("DeployRoot", (0, 0, 0), CTRL)
    drv(DR, "location", 2, f"{PLAT_H}*platform", [("platform", "platform")], CTRL)
    drv(DR, "rotation_euler", 1, f"-radians({RAMP_ANG})*ramp", [("ramp", "ramp")], CTRL)

    SR = {"A": empty("SplitRoot_A", (0, 0, 0), DR), "B": empty("SplitRoot_B", (0, 0, 0), DR)}
    drv(SR["A"], "location", 1, "-0.123*split", [("split", "split")], CTRL)
    drv(SR["B"], "location", 1, f"0.123*split + ({EXT_DY})*extend + {STASH_DY}*stash",
        [("split", "split"), ("extend", "extend"), ("stash", "stash")], CTRL)         # split gap / catwalk / single-half stash
    drv(SR["B"], "location", 0, f"{EXT_DX}*extend", [("extend", "extend")], CTRL)     # end-to-end catwalk slide

    nodes = {}
    SCALE_LATER = []     # scale drivers applied AFTER parenting (parent_keep bakes a parent-inverse that distorts pre-set scale)
    for p in range(4):
        y = PLANE_Y[p]; half = HALF[p]; thp = f"theta_{half}"
        root = SR[half]
        sp = empty(f"StrPivot_p{p}", (0, y, 0), root)
        cp = empty(f"CtlPivot_p{p}", (0, y, 0.140), root)
        # stringer + control bar must sit at the SAME angle theta as the carrier pivots,
        # so they fold WITH the steps. Blender +Y rotation decreases the XZ angle, hence (TH0 - t).
        drv(sp, "rotation_euler", 1, f"radians({TH0}-t)", [("t", thp)], CTRL)
        drv(cp, "rotation_euler", 1, f"radians({TH0}-t)", [("t", thp)], CTRL)
        nodes[f"p{p}_str"] = sp
        nodes[f"p{p}_ctl"] = cp
        for i in range(1, 6):
            cn = empty(f"Carrier_p{p}_{i}", (0.3 * i, y, 0.2 * i), root)
            drv(cn, "location", 0, f"{L}*{i}*cos(radians(t))", [("t", thp)], CTRL)
            drv(cn, "location", 2, f"{L}*{i}*sin(radians(t))", [("t", thp)], CTRL)
            # location.y stays at the plane offset y (set at creation; the split root adds the gap)
            nodes[f"p{p}_car{i}"] = cn
        base = empty(f"Base_p{p}", (0, y, 0), root); nodes[f"p{p}_base"] = base
        if f"p{p}_leg" in groups:
            lg = empty(f"Leg_p{p}", (0.3 * 5, y, 0.2 * 5), sp)        # node at leg TOP -> shrinks UP when retracted (smooth, no pop)
            if p in (1, 2):    # inner legs: appear LATE (~frame 300, after the stairs form) so nothing phases through
                SCALE_LATER.append((lg, "max(0.001, min(1.0,max(0.0,(stash-0.88)/0.12))*(1.0-leg_retract))", [("leg_retract", "leg_retract"), ("stash", "stash")]))
            else:
                SCALE_LATER.append((lg, "max(0.001, 1.0-leg_retract)", [("leg_retract", "leg_retract")]))
            nodes[f"p{p}_leg"] = lg
        if f"p{p}_legF" in groups:                                    # static front legs unused (dedicated platlegs drive the platform)
            lgf = empty(f"LegF_p{p}", (0.3 * 1, y, 0.1), sp)
            nodes[f"p{p}_legF"] = lgf
        if f"p{p}_hrrail" in groups:
            C0, S0 = math.cos(math.radians(TH0)), math.sin(math.radians(TH0))
            FOLD = "min(1.0, handrail/0.6)"            # posts fold into the rail over handrail 0->0.6
            GONE = "max(0.0,(handrail-0.6)/0.4)"       # then the folded rod shrinks away -> DISAPPEARS over 0.6->1
            hr = empty(f"Handrail_p{p}", (0.9, y, 0.6), root)   # staircase rail; folds then disappears (no stored rod)
            if p in (1, 2):    # inner rails: appear LATE (~frame 300) so the forming stairs don't phase through them
                SCALE_LATER.append((hr, f"max(0.001, min(1.0,max(0.0,(stash-0.88)/0.12))*(1.0-{GONE}))", [("stash", "stash"), ("handrail", "handrail")]))
            else:         # outer rails: the STAIRCASE rail only (hidden on the flat platform -> flat rails take over)
                SCALE_LATER.append((hr, f"max(0.001, (1.0-{GONE})*(1.0-platform))", [("handrail", "handrail"), ("platform", "platform")]))
            nodes[f"p{p}_hrrail"] = hr
            for k, s in enumerate((0.5 * L, 4.5 * L), 1):      # 2 posts per handrail; fold into the rail
                if f"p{p}_hrpost{k}" not in groups:
                    continue
                hinge = empty(f"HRhinge_p{p}_{k}", (s * C0, y, s * S0 + 1.045), hr)
                drv(hinge, "rotation_euler", 1, f"radians({90 - TH0})*{FOLD}", [("handrail", "handrail")], CTRL)
                nodes[f"p{p}_hrpost{k}"] = hinge
    # dedicated platform/ramp legs: hang from the 4 corners, grow with the raise/tilt (zero-scale = invisible at rest)
    # --- real platform/ramp/catwalk legs: 40x40 tube + foot, GROUNDED + VERTICAL, grow up to meet the raised deck ---
    def _leg_mesh():
        t, f, fh = 0.022, 0.05, 0.012        # tube half-width, foot half-width, foot thickness
        V = [(-t,-t,0),(t,-t,0),(t,t,0),(-t,t,0),(-t,-t,1),(t,-t,1),(t,t,1),(-t,t,1),
             (-f,-f,-fh),(f,-f,-fh),(f,f,-fh),(-f,f,-fh),(-f,-f,0),(f,-f,0),(f,f,0),(-f,f,0)]
        Fc = [(0,1,2,3),(7,6,5,4),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0),
              (8,9,10,11),(15,14,13,12),(8,12,13,9),(9,13,14,10),(10,14,15,11),(11,15,12,8)]
        m = bpy.data.meshes.new("realleg_mesh"); m.from_pydata(V, [], Fc); m.update(); return m
    LEGM = _leg_mesh()
    GLR = empty("PlatLegRoot", (0, 0, 0), CTRL)    # GROUNDED root (not under DeployRoot) -> legs stay vertical, feet on the floor
    def _real_leg(name, cx, cy, gate, props):
        o = bpy.data.objects.new(name, LEGM); bpy.context.scene.collection.objects.link(o)
        o.parent = GLR; o.location = (cx, cy, 0.0)
        drv(o, "scale", 2, gate, props, CTRL)      # grows z from 0 to the deck height; vertical
        return o
    cwxF, cwxB = L*1, L*5 + EXT_DX; cwxM = (cwxF + cwxB)/2.0       # catwalk front / middle / back x
    for i, (cx, cy) in enumerate([(L*1, 0.03), (L*5, 0.03), (L*1, 2.32), (L*5, 2.32)]):    # PLATFORM: 4 wide corners
        _real_leg(f"platlegP{i}", cx, cy, f"max(0.001,{PLAT_H}*platform*(1.0-extend))",
                  [("platform", "platform"), ("extend", "extend")])
    for i, (cx, cy) in enumerate([(cwxF,0.03),(cwxF,1.14),(cwxM,0.03),(cwxM,1.14),(cwxB,0.03),(cwxB,1.14)]):  # CATWALK: 6 even
        _real_leg(f"platlegC{i}", cx, cy, f"max(0.001,{PLAT_H}*platform*extend)",
                  [("platform", "platform"), ("extend", "extend")])
    for i, (cx, cy) in enumerate([(L*5, 0.03), (L*5, 2.32)]):     # RAMP: 2 back support legs
        _real_leg(f"platlegR{i}", cx, cy, "max(0.001,0.70*ramp)", [("ramp", "ramp")])

    # (platform has NO handrails - the flat platform railings were removed per request)
    nodes["couplers"] = empty("Couplers", (0.9, 1.175, 0.6), CTRL)

    bpy.context.view_layer.update()   # node matrices current before computing parent-inverse
    for g, objs in groups.items():
        node = nodes.get(g)
        if node:
            parent_keep(objs, node)
    # apply deferred SCALE drivers AFTER parenting (so parent_keep captured clean identity-scale nodes)
    for node, expr, props in SCALE_LATER:
        for ax in (0, 1, 2):
            drv(node, "scale", ax, expr, props, CTRL)
    bpy.context.view_layer.update()
    return CTRL, groups, nodes


def pose(theta_a=TH0, theta_b=TH0, split=0.0, handrail=0.0, leg=0.0, platform=0.0, ramp=0.0, extend=0.0):
    c = bpy.data.objects["CTRL"]
    c["theta_A"] = theta_a; c["theta_B"] = theta_b; c["split"] = split
    c["handrail"] = handrail; c["leg_retract"] = leg
    c["platform"] = platform; c["ramp"] = ramp; c["extend"] = extend
    c.update_tag(); bpy.context.view_layer.update()


# ---- smooth looping showcase ----  (frame, theta_A, theta_B, split, handrail, leg, platform, ramp, extend, stash)
KEYS = [
    (1,    33.69, 33.69, 0, 0, 0, 0, 0, 0, 0),   # STAIRCASE
    (20,   33.69, 33.69, 0, 0, 0, 0, 0, 0, 0),
    (60,   33.69, 33.69, 0, 1, 1, 0, 0, 0, 0),   # handrails fold + disappear, legs retract
    (108,  0,     0,     0, 1, 1, 0, 0, 0, 0),   # FOLD FLAT
    (128,  0,     0,     0, 1, 1, 0, 0, 0, 0),
    (175,  0,     0,     1, 1, 1, 0, 0, 0, 0),   # SPLIT
    (222,  90,    90,    1, 1, 1, 0, 0, 0, 0),   # two vertical LADDERS
    (248,  90,    90,    1, 1, 1, 0, 0, 0, 0),
    (300,  33.69, 33.69, 0, 1, 1, 0, 0, 0, 1),   # stairs FORM + half B slides aside (rails still OFF, legs up)
    (320,  33.69, 33.69, 0, 0, 0, 0, 0, 0, 1),   # NOW deploy rails + legs -> ONE-HALF (no phase-through)
    (348,  33.69, 33.69, 0, 0, 0, 0, 0, 0, 1),   # hold one-half
    (398,  33.69, 33.69, 0, 0, 0, 0, 0, 0, 0),   # bring the other half back -> FULL STAIRCASE
    (420,  33.69, 33.69, 0, 0, 0, 0, 0, 0, 0),
    (466,  33.69, 33.69, 0, 1, 1, 0, 0, 0, 0),   # handrails off + legs retract
    (514,  0,     0,     0, 1, 1, 0, 0, 0, 0),   # FOLD FLAT
    (534,  0,     0,     0, 1, 1, 0, 0, 0, 0),
    (586,  0,     0,     0, 1, 1, 0, 1, 0, 0),   # tilt up -> RAMP
    (612,  0,     0,     0, 1, 1, 0, 1, 0, 0),
    (670,  0,     0,     0, 1, 1, 1, 0, 0, 0),   # level + lift -> full-width PLATFORM (4 legs, NO rails)
    (712,  0,     0,     0, 1, 1, 1, 0, 0, 0),   # hold platform
    (770,  0,     0,     0, 1, 1, 1, 0, 1, 0),   # slide one half out -> long CATWALK (no rails, 6 even legs)
    (800,  0,     0,     0, 1, 1, 1, 0, 1, 0),
    (855,  0,     0,     0, 1, 1, 1, 0, 0, 0),   # retract the catwalk
    (910,  0,     0,     0, 1, 1, 0, 0, 0, 0),   # lower to flat
    (968,  33.69, 33.69, 0, 1, 1, 0, 0, 0, 0),   # un-fold to stair
    (1013, 33.69, 33.69, 0, 0, 0, 0, 0, 0, 0),   # handrails on + legs down -> STAIRCASE (== frame 1, smooth loop)
    (1033, 33.69, 33.69, 0, 0, 0, 0, 0, 0, 0),
]


def animate():
    c = bpy.data.objects["CTRL"]
    sc = bpy.context.scene
    sc.frame_start = 1; sc.frame_end = 1033
    sc.render.fps = 30
    for f, ta, tb, sp, hr, lg, pf, rm, ex, st in KEYS:
        c["theta_A"], c["theta_B"], c["split"], c["handrail"], c["leg_retract"] = ta, tb, sp, hr, lg
        c["platform"], c["ramp"], c["extend"], c["stash"] = pf, rm, ex, st
        for prop in ("theta_A", "theta_B", "split", "handrail", "leg_retract", "platform", "ramp", "extend", "stash"):
            c.keyframe_insert(data_path=f'["{prop}"]', frame=f)
    # smooth ease on every channel (Blender 5.1 slotted-action API; keys are Bezier by default)
    def _all_fcurves(act):
        try:
            return list(act.fcurves)                      # legacy
        except Exception:
            fcs = []
            for lyr in getattr(act, "layers", []):
                for st in lyr.strips:
                    try: fcs += list(st.channelbag(act.slots[0]).fcurves)
                    except Exception: pass
            return fcs
    if c.animation_data and c.animation_data.action:
        for fc in _all_fcurves(c.animation_data.action):
            for kp in fc.keyframe_points:
                kp.interpolation = 'BEZIER'; kp.handle_left_type = kp.handle_right_type = 'AUTO_CLAMPED'
    # EVERY transition is driven by MOTION or SCALE (smooth, no hide-pops): handrails fold-to-rod,
    # halves slide via 'stash', mechanism legs shrink via scale=(1-leg_retract), platlegs scale with platform.
    # The only hard-hidden parts are the unused static front legs (the dedicated platlegs drive the platform).
    for o in bpy.data.objects:
        if o.type == 'MESH' and "_legF__" in o.name:
            o.hide_viewport = True; o.hide_render = True
    sc.frame_set(1)
