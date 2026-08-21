"""N-panel 'Staircase' tab: quick-check buttons for the showcase + joint inspection.
Registers operators that jump the baked showcase to key states, tour each joint
(select + frame the viewport), explode/collapse, and run the verification checks.
Exec in Blender; also embeddable as a registered text block so it survives save.
"""
import bpy, math, mathutils

STATE_FRAMES = {"STAIR": 1, "FLAT": 118, "LADDER": 235, "HALF": 334,
                "RAMP": 599, "PLATFORM": 690, "CATWALK": 785}
# match on the group-prefixed object names ("{group}__{mesh}") + control empties
JOINTS = {
    "Base pivot (hinge)":   ["_base__", "Base_p", "_str__pin_OM", "_ctl__pin_OC"],
    "Self-level carrier":   ["p0_car3", "Carrier_p0_3"],
    "Handrail (folds to rod)": ["_hrrail__", "_hrpost", "Handrail_p", "HRhinge"],
    "Telescoping leg":      ["_leg__", "Leg_p"],
    "Split coupler (seam)": ["couplers__", "Couplers"],
}


def _ctrl():
    return bpy.data.objects.get("CTRL")


def _select(substrs):
    for o in bpy.data.objects:
        o.select_set(False)
    hit = [o for o in bpy.data.objects
           if o.type == 'MESH' and any(s in o.name for s in substrs)]
    for o in hit:
        o.select_set(True)
    if hit:
        bpy.context.view_layer.objects.active = hit[0]
    return hit


class STAIR_OT_state(bpy.types.Operator):
    bl_idname = "staircase.state"; bl_label = "State"
    state: bpy.props.StringProperty()
    def execute(self, ctx):
        ctx.scene.frame_set(STATE_FRAMES.get(self.state, 1))
        return {'FINISHED'}


class STAIR_OT_play(bpy.types.Operator):
    bl_idname = "staircase.play"; bl_label = "Play / Stop showcase"
    def execute(self, ctx):
        bpy.ops.screen.animation_play()
        return {'FINISHED'}


class STAIR_OT_joint(bpy.types.Operator):
    bl_idname = "staircase.joint"; bl_label = "Inspect joint"
    subs: bpy.props.StringProperty()
    def execute(self, ctx):
        hit = _select(self.subs.split("|"))
        for area in ctx.screen.areas:
            if area.type == 'VIEW_3D':
                for region in area.regions:
                    if region.type == 'WINDOW':
                        with ctx.temp_override(area=area, region=region):
                            bpy.ops.view3d.view_selected()
        self.report({'INFO'}, f"{len(hit)} parts")
        return {'FINISHED'}


class STAIR_OT_explode(bpy.types.Operator):
    bl_idname = "staircase.explode"; bl_label = "Explode / Collapse"
    def execute(self, ctx):
        c = _ctrl()
        on = c.get("_exploded", 0)
        for o in bpy.data.objects:
            if o.type != 'MESH':
                continue
            if on:
                o.location = o.get("_home", o.location)
            else:
                o["_home"] = list(o.location)
                ctr = o.matrix_world.translation
                o.location = (o.location[0] + ctr.x * 0.0, o.location[1],
                              o.location[2] + 0.25)
        c["_exploded"] = 0 if on else 1
        return {'FINISHED'}


class STAIR_OT_verify(bpy.types.Operator):
    bl_idname = "staircase.verify"; bl_label = "Verify (level + pitch)"
    def execute(self, ctx):
        dg = ctx.evaluated_depsgraph_get()
        tops = {}
        for i in (1, 3, 5):
            zs = []
            for o in bpy.data.objects:
                if o.type == 'MESH' and f"carrier_{i}" in o.name:
                    oe = o.evaluated_get(dg)
                    for cc in oe.bound_box:
                        zs.append((oe.matrix_world @ mathutils.Vector(cc)).z)
            if zs:
                tops[i] = max(zs)
        rise = (tops.get(3, 0) - tops.get(1, 0)) if 1 in tops and 3 in tops else 0
        self.report({'INFO'}, f"carrier tops {[round(tops[k],3) for k in sorted(tops)]} m | rise/2cells {rise:.3f} m")
        return {'FINISHED'}


class STAIR_PT_panel(bpy.types.Panel):
    bl_label = "Staircase Showcase"; bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'; bl_category = "Staircase"
    def draw(self, ctx):
        L = self.layout
        b = L.box(); b.label(text="States", icon='SNAP_VOLUME')
        r = b.row(align=True)
        r.operator("staircase.state", text="Staircase").state = "STAIR"
        r.operator("staircase.state", text="Flat / Floor").state = "FLAT"
        r = b.row(align=True)
        r.operator("staircase.state", text="Two Ladders").state = "LADDER"
        r.operator("staircase.state", text="Half stair").state = "HALF"
        r = b.row(align=True)
        r.operator("staircase.state", text="Ramp").state = "RAMP"
        r.operator("staircase.state", text="Platform").state = "PLATFORM"
        b.operator("staircase.state", text="Long Catwalk").state = "CATWALK"
        b.operator("staircase.play", text="Play / Stop Showcase", icon='PLAY')
        c = _ctrl()
        if c:
            b.prop(c, '["theta_A"]', text="Fold A")
            b.prop(c, '["theta_B"]', text="Fold B")
            b.prop(c, '["split"]', text="Split")
            b.prop(c, '["handrail"]', text="Handrail out")
            b.prop(c, '["platform"]', text="Platform raise")
            b.prop(c, '["ramp"]', text="Ramp tilt")
            b.prop(c, '["extend"]', text="Catwalk extend")
            b.prop(c, '["stash"]', text="Stash half B")
        j = L.box(); j.label(text="Inspect joints", icon='VIEWZOOM')
        for name, subs in JOINTS.items():
            j.operator("staircase.joint", text=name).subs = "|".join(subs)
        k = L.box(); k.label(text="Checks", icon='CHECKMARK')
        k.operator("staircase.explode", text="Explode / Collapse")
        k.operator("staircase.verify", text="Verify level + pitch")


CLASSES = [STAIR_OT_state, STAIR_OT_play, STAIR_OT_joint, STAIR_OT_explode, STAIR_OT_verify, STAIR_PT_panel]


def register():
    for cls in CLASSES:
        try: bpy.utils.register_class(cls)
        except Exception: pass


def unregister():
    for cls in reversed(CLASSES):
        try: bpy.utils.unregister_class(cls)
        except Exception: pass


if __name__ == "__main__":
    unregister(); register()
