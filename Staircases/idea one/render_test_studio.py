"""Quick studio-lighting/camera verification (blender -b -y -P render_test_studio.py)."""
import bpy, math as m, mathutils
ROOT = r"C:/Users/USER/Desktop/Staircases/idea one/"
bpy.context.preferences.filepaths.use_scripts_auto_execute = True
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)
ns = {}
for fn in ("blender_rig.py", "blender_materials.py"):
    exec(compile(open(ROOT + fn, encoding="utf-8").read(), fn, "exec"), ns)
ns["build_rig"](); ns["animate"](); ns["apply_materials"]()
sc = bpy.context.scene
sc.render.engine = 'BLENDER_EEVEE'; sc.render.resolution_x, sc.render.resolution_y = 1920, 1080
for attr, val in (("taa_render_samples", 32), ("use_raytracing", True), ("use_gtao", True)):
    try: setattr(sc.eevee, attr, val)
    except Exception: pass
try:
    rto = sc.eevee.ray_tracing_options
    for a, v in (("resolution_scale", '2'), ("use_denoise", True), ("denoise_spatial", True), ("denoise_temporal", True), ("denoise_bilateral", True)):
        try: setattr(rto, a, v)
        except Exception: pass
except Exception: pass
try: sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Medium High Contrast'
except Exception: pass
w = bpy.data.worlds.new("Studio"); sc.world = w; w.use_nodes = True
nt = w.node_tree; nt.nodes.clear()
wout = nt.nodes.new("ShaderNodeOutputWorld"); bg = nt.nodes.new("ShaderNodeBackground")
tc = nt.nodes.new("ShaderNodeTexCoord"); sep = nt.nodes.new("ShaderNodeSeparateXYZ"); ramp = nt.nodes.new("ShaderNodeValToRGB")
ramp.color_ramp.elements[0].position = 0.0; ramp.color_ramp.elements[0].color = (0.015, 0.016, 0.02, 1)
ramp.color_ramp.elements[1].position = 0.6; ramp.color_ramp.elements[1].color = (0.30, 0.33, 0.38, 1)
nt.links.new(tc.outputs["Generated"], sep.inputs[0]); nt.links.new(sep.outputs["Z"], ramp.inputs[0])
nt.links.new(ramp.outputs["Color"], bg.inputs[0]); bg.inputs[1].default_value = 0.55; nt.links.new(bg.outputs[0], wout.inputs[0])
gm = bpy.data.materials.new("StudioFloor"); gm.use_nodes = True
gb = gm.node_tree.nodes["Principled BSDF"]; gb.inputs["Base Color"].default_value = (0.05, 0.052, 0.056, 1); gb.inputs["Roughness"].default_value = 0.22
bpy.ops.mesh.primitive_plane_add(size=80, location=(1.4, 0.9, 0.0)); gp = bpy.context.active_object; gp.name = "GroundPlane"; gp.data.materials.append(gm)
aim = bpy.data.objects.new("LightAim", None); sc.collection.objects.link(aim); aim.location = (1.3, 0.85, 0.35)
def area(name, loc, size, energy, color):
    d = bpy.data.lights.new(name, 'AREA'); d.size = size; d.energy = energy; d.color = color
    o = bpy.data.objects.new(name, d); sc.collection.objects.link(o); o.location = loc
    c = o.constraints.new('TRACK_TO'); c.target = aim; c.track_axis = 'TRACK_NEGATIVE_Z'; c.up_axis = 'UP_Y'
area("Key", (-2.6, -3.4, 4.8), 5.0, 1100.0, (1.0, 0.96, 0.90))
area("Fill", (4.6, -2.2, 2.6), 6.0, 320.0, (0.90, 0.94, 1.0))
area("Rim", (1.2, 4.8, 5.2), 4.0, 900.0, (1.0, 0.98, 0.95))
sun = bpy.data.objects.new("Sun", bpy.data.lights.new("Sun", 'SUN')); sc.collection.objects.link(sun)
sun.data.energy = 1.2; sun.data.angle = m.radians(4); sun.rotation_euler = (m.radians(52), m.radians(8), m.radians(35))
try:
    sc.use_nodes = True; cnt = sc.node_tree
    rl = next((n for n in cnt.nodes if n.type == 'R_LAYERS'), None); cp = next((n for n in cnt.nodes if n.type == 'COMPOSITE'), None)
    gl = cnt.nodes.new("CompositorNodeGlare")
    try: gl.glare_type = 'BLOOM'
    except Exception: gl.glare_type = 'FOG_GLOW'
    gl.threshold = 1.0
    try: gl.mix = -0.82
    except Exception: pass
    cnt.links.new(rl.outputs["Image"], gl.inputs["Image"]); cnt.links.new(gl.outputs["Image"], cp.inputs["Image"])
    print("glare ok")
except Exception as e:
    print("glare skipped:", e)
cam = bpy.data.objects.new("Cam", bpy.data.cameras.new("Cam")); sc.collection.objects.link(cam); sc.camera = cam; cam.data.lens = 50
tgt = bpy.data.objects.new("CamTarget", None); sc.collection.objects.link(tgt)
tcon = cam.constraints.new('TRACK_TO'); tcon.target = tgt; tcon.track_axis = 'TRACK_NEGATIVE_Z'; tcon.up_axis = 'UP_Y'
DIR = mathutils.Vector((-0.82, -1.5, 0.46)).normalized(); fov = 2 * m.atan(0.5 * 36 / cam.data.lens)
def bbox():
    dg = bpy.context.evaluated_depsgraph_get(); dg.update()
    mn = mathutils.Vector((1e9,)*3); mx = mathutils.Vector((-1e9,)*3)
    for o in sc.objects:
        if o.type != 'MESH' or o.name == 'GroundPlane': continue
        oe = o.evaluated_get(dg); cs = [oe.matrix_world @ mathutils.Vector(c) for c in oe.bound_box]
        if max(max(c.x for c in cs)-min(c.x for c in cs), max(c.y for c in cs)-min(c.y for c in cs), max(c.z for c in cs)-min(c.z for c in cs)) < 0.04: continue
        for v in cs:
            for k in range(3): mn[k] = min(mn[k], v[k]); mx[k] = max(mx[k], v[k])
    return mn, mx
for fr in (334,):
    sc.frame_set(fr); mn, mx = bbox(); ctr = (mn+mx)/2; size = mx-mn; ctr.z += size.z*0.05
    dist = (size.length*0.5*1.22)/m.tan(fov*0.5)
    tgt.location = ctr; cam.location = ctr + DIR*dist
    sc.render.filepath = ROOT + f"docs/renders/studio_{fr}.png"; bpy.ops.render.render(write_still=True)
print("STUDIO_TEST_DONE")
