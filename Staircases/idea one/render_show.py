"""Headless build + STUDIO render of the showcase (blender -b -y -P render_show.py).
Studio 3-point lighting + gradient environment + reflective floor + bloom; a tracking camera
that keeps the subject centered and follows it (Track-To a per-phase target + distance framing).
Renders the 1033-frame PNG sequence to docs/renders/frames/.
"""
import bpy, math as m, mathutils
ROOT = r"C:/Users/USER/Desktop/Staircases/idea one/"
bpy.context.preferences.filepaths.use_scripts_auto_execute = True
import sys
_rng = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
RSTART = int(_rng[0]) if len(_rng) >= 1 else 1          # render this frame range (for chunked rendering)
REND = int(_rng[1]) if len(_rng) >= 2 else 1033
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)

# ---- build rig + materials + panel ----
ns = {}
for fn in ("blender_rig.py", "blender_materials.py", "blender_panel.py"):
    exec(compile(open(ROOT + fn, encoding="utf-8").read(), fn, "exec"), ns)
ns["build_rig"](); ns["animate"](); ns["apply_materials"](); ns["register"]()
if "staircase_panel.py" in bpy.data.texts:
    bpy.data.texts.remove(bpy.data.texts["staircase_panel.py"])
bpy.data.texts.new("staircase_panel.py").write(open(ROOT + "blender_panel.py", encoding="utf-8").read())
bpy.data.texts["staircase_panel.py"].use_module = True

sc = bpy.context.scene
sc.render.engine = 'BLENDER_EEVEE'
sc.render.resolution_x, sc.render.resolution_y = 1920, 1080      # HIGH QUALITY
for attr, val in (("taa_render_samples", 16), ("use_raytracing", True), ("use_shadows", True),
                  ("use_gtao", True)):
    try: setattr(sc.eevee, attr, val)
    except Exception: pass
# raytracing quality + DENOISE (quarter-res traced + denoised: clean reflections, much faster on the iGPU)
try:
    rto = sc.eevee.ray_tracing_options
    for a, v in (("resolution_scale", '4'), ("use_denoise", True),
                 ("denoise_spatial", True), ("denoise_temporal", True), ("denoise_bilateral", True)):
        try: setattr(rto, a, v)
        except Exception: pass
except Exception: pass
try: sc.eevee.shadow_ray_count = 2; sc.eevee.shadow_step_count = 6     # cleaner soft shadows
except Exception: pass
try: sc.view_settings.view_transform = 'AgX'
except Exception: pass
try: sc.view_settings.look = 'AgX - Medium High Contrast'
except Exception: pass

# ---- gradient studio environment (so the black metal has something to reflect) ----
w = bpy.data.worlds.new("Studio"); sc.world = w; w.use_nodes = True
nt = w.node_tree; nt.nodes.clear()
wout = nt.nodes.new("ShaderNodeOutputWorld"); bg = nt.nodes.new("ShaderNodeBackground")
tc = nt.nodes.new("ShaderNodeTexCoord"); sep = nt.nodes.new("ShaderNodeSeparateXYZ")
ramp = nt.nodes.new("ShaderNodeValToRGB")
ramp.color_ramp.elements[0].position = 0.0;  ramp.color_ramp.elements[0].color = (0.015, 0.016, 0.02, 1)
ramp.color_ramp.elements[1].position = 0.6;  ramp.color_ramp.elements[1].color = (0.30, 0.33, 0.38, 1)
nt.links.new(tc.outputs["Generated"], sep.inputs[0])
nt.links.new(sep.outputs["Z"], ramp.inputs[0])
nt.links.new(ramp.outputs["Color"], bg.inputs[0]); bg.inputs[1].default_value = 0.55
nt.links.new(bg.outputs[0], wout.inputs[0])

# ---- reflective studio floor ----
gm = bpy.data.materials.new("StudioFloor"); gm.use_nodes = True
gb = gm.node_tree.nodes["Principled BSDF"]
gb.inputs["Base Color"].default_value = (0.05, 0.052, 0.056, 1)   # dark reflective studio floor (RT reflections)
gb.inputs["Roughness"].default_value = 0.22
try: gb.inputs["Metallic"].default_value = 0.0
except Exception: pass
bpy.ops.mesh.primitive_plane_add(size=80, location=(1.4, 0.9, 0.0))
gp = bpy.context.active_object; gp.name = "GroundPlane"; gp.data.materials.append(gm)

# ---- 3-point studio lights (soft area lights, all aimed at the working centre) ----
aim = bpy.data.objects.new("LightAim", None); sc.collection.objects.link(aim); aim.location = (1.3, 0.85, 0.35)
def area(name, loc, size, energy, color):
    d = bpy.data.lights.new(name, 'AREA'); d.size = size; d.energy = energy; d.color = color
    o = bpy.data.objects.new(name, d); sc.collection.objects.link(o); o.location = loc
    c = o.constraints.new('TRACK_TO'); c.target = aim; c.track_axis = 'TRACK_NEGATIVE_Z'; c.up_axis = 'UP_Y'
    return o
area("Key",  (-2.6, -3.4, 4.8), 5.0, 1100.0, (1.0, 0.96, 0.90))   # warm key, front-left, high
area("Fill", (4.6, -2.2, 2.6), 6.0, 320.0, (0.90, 0.94, 1.0))     # cool fill, right
area("Rim",  (1.2, 4.8, 5.2), 4.0, 900.0, (1.0, 0.98, 0.95))      # back rim/hair light
sun = bpy.data.objects.new("Sun", bpy.data.lights.new("Sun", 'SUN')); sc.collection.objects.link(sun)
sun.data.energy = 1.2; sun.data.angle = m.radians(4); sun.rotation_euler = (m.radians(52), m.radians(8), m.radians(35))

# ---- bloom via compositor glare (optional; guarded - API varies across Blender versions) ----
try:
    sc.use_nodes = True
    cnt = sc.node_tree
    rl = next((n for n in cnt.nodes if n.type == 'R_LAYERS'), None) or cnt.nodes.new("CompositorNodeRLayers")
    cp = next((n for n in cnt.nodes if n.type == 'COMPOSITE'), None) or cnt.nodes.new("CompositorNodeComposite")
    gl = cnt.nodes.new("CompositorNodeGlare")
    try: gl.glare_type = 'BLOOM'
    except Exception: gl.glare_type = 'FOG_GLOW'
    try: gl.quality = 'HIGH'
    except Exception: pass
    gl.threshold = 1.0
    try: gl.mix = -0.82
    except Exception: pass
    cnt.links.new(rl.outputs["Image"], gl.inputs["Image"])
    cnt.links.new(gl.outputs["Image"], cp.inputs["Image"])
except Exception as e:
    print("glare skipped:", e)

# ---- tracking camera: Track-To a per-phase target (centre) + distance framing ----
cam = bpy.data.objects.new("Cam", bpy.data.cameras.new("Cam")); sc.collection.objects.link(cam); sc.camera = cam
cam.data.lens = 50
tgt = bpy.data.objects.new("CamTarget", None); sc.collection.objects.link(tgt)
tcon = cam.constraints.new('TRACK_TO'); tcon.target = tgt; tcon.track_axis = 'TRACK_NEGATIVE_Z'; tcon.up_axis = 'UP_Y'
DIR = mathutils.Vector((-0.82, -1.5, 0.46)).normalized()
fov = 2 * m.atan(0.5 * 36 / cam.data.lens)

def frame_bbox():
    dg = bpy.context.evaluated_depsgraph_get(); dg.update()
    mn = mathutils.Vector((1e9,)*3); mx = mathutils.Vector((-1e9,)*3); seen = False
    for o in sc.objects:
        if o.type != 'MESH' or o.name == 'GroundPlane':
            continue
        oe = o.evaluated_get(dg)
        cs = [oe.matrix_world @ mathutils.Vector(c) for c in oe.bound_box]
        sz = max(max(c.x for c in cs) - min(c.x for c in cs),
                 max(c.y for c in cs) - min(c.y for c in cs),
                 max(c.z for c in cs) - min(c.z for c in cs))
        if sz < 0.04:
            continue
        for v in cs:
            for k in range(3):
                mn[k] = min(mn[k], v[k]); mx[k] = max(mx[k], v[k])
        seen = True
    return (mn, mx) if seen else (mathutils.Vector((0, 0, 0)), mathutils.Vector((2, 2, 2)))

PHASES = [1, 118, 235, 334, 409, 599, 690, 785, 910, 1013]
for fr in PHASES:
    sc.frame_set(fr)
    mn, mx = frame_bbox(); ctr = (mn + mx) / 2; size = (mx - mn)
    ctr.z += size.z * 0.05                                  # aim a touch above the deck centre
    dist = (size.length * 0.5 * 1.22) / m.tan(fov * 0.5)
    tgt.location = ctr; tgt.keyframe_insert("location", frame=fr)
    cam.location = ctr + DIR * dist; cam.keyframe_insert("location", frame=fr)

sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGB'
sc.render.filepath = ROOT + "docs/renders/frames/f_"
sc.frame_start = 1; sc.frame_end = 1033; sc.frame_set(1)
if RSTART == 1:
    bpy.ops.wm.save_as_mainfile(filepath=ROOT + "staircase_full.blend")
sc.frame_start = RSTART; sc.frame_end = REND; sc.frame_set(RSTART)    # render only this chunk
bpy.ops.render.render(animation=True)
print("RENDER_DONE", RSTART, REND)
