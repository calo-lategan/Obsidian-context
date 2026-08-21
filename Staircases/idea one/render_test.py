"""Quick headless verification of a few key frames (blender -b -y -P render_test.py)."""
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
sc.render.engine = 'BLENDER_EEVEE'; sc.render.resolution_x, sc.render.resolution_y = 1100, 720
try: sc.eevee.taa_render_samples = 12
except Exception: pass
try: sc.view_settings.view_transform = 'AgX'
except Exception: pass
sc.world = bpy.data.worlds.new("W"); sc.world.use_nodes = True
sc.world.node_tree.nodes["Background"].inputs[0].default_value = (0.05, 0.05, 0.06, 1)
gm = bpy.data.materials.new("Ground"); gm.use_nodes = True
gm.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.2, 0.2, 0.22, 1)
bpy.ops.mesh.primitive_plane_add(size=44, location=(1.6, 0.8, 0.0)); gp = bpy.context.active_object; gp.name = "GroundPlane"; gp.data.materials.append(gm)
sun = bpy.data.objects.new("Sun", bpy.data.lights.new("Sun", 'SUN')); sc.collection.objects.link(sun)
sun.data.energy = 4.0; sun.rotation_euler = (m.radians(54), m.radians(12), m.radians(40))
cam = bpy.data.objects.new("Cam", bpy.data.cameras.new("Cam")); sc.collection.objects.link(cam); sc.camera = cam; cam.data.lens = 42
fov = 2 * m.atan(0.5 * 36 / cam.data.lens)
def shoot(fr, path, dirv=(-0.95, -1.4, 0.5)):
    sc.frame_set(fr); dg = bpy.context.evaluated_depsgraph_get(); dg.update()
    mn = mathutils.Vector((1e9,)*3); mx = mathutils.Vector((-1e9,)*3)
    for o in sc.objects:
        if o.type != 'MESH' or o.name == 'GroundPlane': continue
        oe = o.evaluated_get(dg); cs = [oe.matrix_world @ mathutils.Vector(c) for c in oe.bound_box]
        if max(max(c.x for c in cs)-min(c.x for c in cs), max(c.y for c in cs)-min(c.y for c in cs), max(c.z for c in cs)-min(c.z for c in cs)) < 0.04: continue
        for v in cs:
            for k in range(3): mn[k] = min(mn[k], v[k]); mx[k] = max(mx[k], v[k])
    ctr = (mn+mx)/2; size = mx-mn; d = mathutils.Vector(dirv).normalized()
    cam.location = ctr + d*((size.length*0.5*1.16)/m.tan(fov*0.5))
    cam.rotation_euler = (cam.location-ctr).to_track_quat('Z', 'Y').to_euler()
    sc.render.filepath = path; bpy.ops.render.render(write_still=True)
out = ROOT + "docs/renders/"
shoot(280,  out + "t_transition.png")   # stairs still forming: NO rails (no phase-through)
shoot(334,  out + "t_half.png")         # one-half hold: 2 rails + 2 legs each
shoot(690,  out + "t_platform.png")     # platform: NO rails
shoot(785,  out + "t_catwalk.png")
print("TEST_DONE")
